package handler

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/pkg/ctxkey"
	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
	"github.com/Wei-Shaw/sub2api/internal/pkg/ip"
	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	middleware2 "github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

const imageStudioMaxUploadBytes = 20 << 20

type ImageStudioHandler struct {
	imageStudioService   *service.ImageStudioService
	gatewayService       *service.OpenAIGatewayService
	openAIGatewayHandler *OpenAIGatewayHandler
	apiKeyService        *service.APIKeyService
	billingCacheService  *service.BillingCacheService
}

func NewImageStudioHandler(imageStudioService *service.ImageStudioService, gatewayService *service.OpenAIGatewayService, openAIGatewayHandler *OpenAIGatewayHandler, apiKeyService *service.APIKeyService, billingCacheService *service.BillingCacheService) *ImageStudioHandler {
	return &ImageStudioHandler{
		imageStudioService:   imageStudioService,
		gatewayService:       gatewayService,
		openAIGatewayHandler: openAIGatewayHandler,
		apiKeyService:        apiKeyService,
		billingCacheService:  billingCacheService,
	}
}

type imageStudioEstimateRequest struct {
	GroupID int64  `json:"group_id" binding:"required"`
	Mode    string `json:"mode"`
	Size    string `json:"size" binding:"required"`
	N       int    `json:"n" binding:"required"`
}

type imageStudioEstimateResponse struct {
	EstimatedCost float64 `json:"estimated_cost"`
	BillingSize   string  `json:"billing_size"`
}

type imageStudioImage struct {
	B64JSON       string `json:"b64_json,omitempty"`
	URL           string `json:"url,omitempty"`
	RevisedPrompt string `json:"revised_prompt,omitempty"`
}

type imageStudioGenerateResponse struct {
	RequestID     string             `json:"request_id"`
	Model         string             `json:"model"`
	Images        []imageStudioImage `json:"images"`
	EstimatedCost float64            `json:"estimated_cost"`
	ActualCost    float64            `json:"actual_cost"`
	NewBalance    float64            `json:"new_balance"`
	ImageCount    int                `json:"image_count"`
	BillingSize   string             `json:"billing_size"`
	UsageLogID    *int64             `json:"usage_log_id,omitempty"`
}

func (h *ImageStudioHandler) Options(c *gin.Context) {
	subject, ok := middleware2.GetAuthSubjectFromContext(c)
	if !ok {
		response.Unauthorized(c, "User not authenticated")
		return
	}
	out, err := h.imageStudioService.Options(c.Request.Context(), subject.UserID)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, out)
}

func (h *ImageStudioHandler) Templates(c *gin.Context) {
	out, err := h.imageStudioService.Templates(c.Request.Context(), service.ImageStudioTemplateFilter{
		Mode:  c.Query("mode"),
		Model: c.Query("model"),
		Query: c.Query("q"),
	})
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, out)
}

func (h *ImageStudioHandler) ServeTemplatePreview(c *gin.Context) {
	filename := c.Param("filename")
	body, contentType, err := h.imageStudioService.OpenTemplatePreview(c.Request.Context(), c.Param("source"), filename)
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	defer body.Close()
	if dot := strings.IndexByte(filename, '.'); dot > 0 {
		c.Header("ETag", `"`+filename[:dot]+`"`)
	}
	c.Header("Cache-Control", "public, max-age=31536000, immutable")
	c.DataFromReader(http.StatusOK, -1, contentType, body, nil)
}

func (h *ImageStudioHandler) Estimate(c *gin.Context) {
	subject, ok := middleware2.GetAuthSubjectFromContext(c)
	if !ok {
		response.Unauthorized(c, "User not authenticated")
		return
	}
	var req imageStudioEstimateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}
	cost, tier, err := h.imageStudioService.Estimate(c.Request.Context(), subject.UserID, req.GroupID, req.Size, req.N)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, imageStudioEstimateResponse{EstimatedCost: cost, BillingSize: tier})
}

func (h *ImageStudioHandler) Generate(c *gin.Context) {
	subject, ok := middleware2.GetAuthSubjectFromContext(c)
	if !ok {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	build, err := h.buildForwardRequest(c)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	estimatedCost, tier, err := h.imageStudioService.Estimate(c.Request.Context(), subject.UserID, build.groupID, build.size, build.n)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	if _, err := h.imageStudioService.CheckBalance(c.Request.Context(), subject.UserID, estimatedCost); err != nil {
		response.ErrorFrom(c, err)
		return
	}

	apiKey, err := h.imageStudioService.EnsureAPIKey(c.Request.Context(), subject.UserID, build.groupID)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	recorder, result, account, parsed, channelMapping, err := h.forwardCaptured(c, subject, apiKey, build)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	if recorder.Code >= 400 {
		c.Data(recorder.Code, recorder.Header().Get("Content-Type"), recorder.Body.Bytes())
		return
	}

	images := parseImageStudioImages(recorder.Body.Bytes())
	if result.ImageCount <= 0 {
		result.ImageCount = len(images)
	}
	if result.ImageCount <= 0 {
		result.ImageCount = build.n
	}
	service.ApplyOpenAIImageBillingResolution(result)

	actualCostPreview, _, err := h.imageStudioService.Estimate(c.Request.Context(), subject.UserID, build.groupID, result.ImageSize, result.ImageCount)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	user, err := h.imageStudioService.CheckBalance(c.Request.Context(), subject.UserID, actualCostPreview)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	upstreamModel := result.UpstreamModel
	recordResult, err := h.gatewayService.RecordUsageDetailed(c.Request.Context(), &service.OpenAIRecordUsageInput{
		Result:             result,
		APIKey:             apiKey,
		User:               user,
		Account:            account,
		Subscription:       nil,
		InboundEndpoint:    GetInboundEndpoint(c),
		UpstreamEndpoint:   GetUpstreamEndpoint(c, account.Platform),
		UserAgent:          c.GetHeader("User-Agent"),
		IPAddress:          ip.GetClientIP(c),
		RequestPayloadHash: h.semanticPayloadHashFromBuild(build),
		APIKeyService:      h.apiKeyService,
		ChannelUsageFields: channelMapping.ToUsageFields(parsed.Model, upstreamModel),
	})
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	actualCost := actualCostPreview
	if recordResult != nil && recordResult.Cost != nil {
		actualCost = recordResult.Cost.ActualCost
	}
	newBalance := user.Balance - actualCost
	if recordResult != nil && recordResult.NewBalance != nil {
		newBalance = *recordResult.NewBalance
	}
	var usageLogID *int64
	if recordResult != nil && recordResult.UsageLogID > 0 {
		usageLogID = &recordResult.UsageLogID
	}
	billingSize := tier
	if result.ImageSize != "" {
		billingSize = result.ImageSize
	}

	response.Success(c, imageStudioGenerateResponse{
		RequestID:     result.RequestID,
		Model:         parsed.Model,
		Images:        images,
		EstimatedCost: estimatedCost,
		ActualCost:    actualCost,
		NewBalance:    newBalance,
		ImageCount:    result.ImageCount,
		BillingSize:   billingSize,
		UsageLogID:    usageLogID,
	})
}

type imageStudioForwardBuild struct {
	groupID     int64
	mode        string
	size        string
	n           int
	body        []byte
	contentType string
	path        string
}

func (h *ImageStudioHandler) buildForwardRequest(c *gin.Context) (*imageStudioForwardBuild, error) {
	if err := c.Request.ParseMultipartForm(64 << 20); err != nil {
		return nil, infraerrors.BadRequest("INVALID_MULTIPART", "invalid multipart request").WithCause(err)
	}
	groupID, _ := strconv.ParseInt(strings.TrimSpace(c.PostForm("group_id")), 10, 64)
	mode := strings.TrimSpace(c.DefaultPostForm("mode", "generation"))
	if mode == "" {
		mode = "generation"
	}
	if mode != "generation" && mode != "edit" {
		return nil, infraerrors.BadRequest("INVALID_IMAGE_MODE", "mode must be generation or edit")
	}
	prompt := strings.TrimSpace(c.PostForm("prompt"))
	if prompt == "" {
		return nil, infraerrors.BadRequest("PROMPT_REQUIRED", "prompt is required")
	}
	n, _ := strconv.Atoi(strings.TrimSpace(c.DefaultPostForm("n", "1")))
	if n <= 0 {
		n = 1
	}
	requestedSize := strings.TrimSpace(c.DefaultPostForm("size", service.ImageBillingSize2K))
	upstreamSize, billingSize, ok := service.OpenAIImageSizeForBillingTier(requestedSize)
	if !ok {
		return nil, infraerrors.BadRequest("INVALID_IMAGE_SIZE", "size must be 1K, 2K, or 4K")
	}
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	fields := map[string]string{
		"model":           service.ImageStudioDefaultModel,
		"prompt":          prompt,
		"size":            upstreamSize,
		"n":               strconv.Itoa(n),
		"response_format": "b64_json",
	}
	for _, name := range []string{"quality", "background", "output_format", "output_compression", "moderation", "input_fidelity", "style"} {
		if value := strings.TrimSpace(c.PostForm(name)); value != "" {
			fields[name] = value
		}
	}
	for key, value := range fields {
		if err := writer.WriteField(key, value); err != nil {
			return nil, err
		}
	}
	if err := copyUploadedImages(writer, c, "images", "image"); err != nil {
		return nil, err
	}
	if err := copyUploadedImages(writer, c, "image", "image"); err != nil {
		return nil, err
	}
	if err := copySingleUpload(writer, c, "mask", "mask", false); err != nil {
		return nil, err
	}
	if mode == "edit" && !multipartHasFiles(c, "images") && !multipartHasFiles(c, "image") {
		return nil, infraerrors.BadRequest("IMAGE_REQUIRED", "image file is required")
	}
	if err := writer.Close(); err != nil {
		return nil, err
	}
	path := "/v1/images/generations"
	if mode == "edit" {
		path = "/v1/images/edits"
	}
	return &imageStudioForwardBuild{
		groupID:     groupID,
		mode:        mode,
		size:        billingSize,
		n:           n,
		body:        body.Bytes(),
		contentType: writer.FormDataContentType(),
		path:        path,
	}, nil
}

func (h *ImageStudioHandler) forwardCaptured(c *gin.Context, subject middleware2.AuthSubject, apiKey *service.APIKey, build *imageStudioForwardBuild) (*httptest.ResponseRecorder, *service.OpenAIForwardResult, *service.Account, *service.OpenAIImagesRequest, service.ChannelMappingResult, error) {
	req := httptest.NewRequest(http.MethodPost, build.path, bytes.NewReader(build.body))
	req = req.WithContext(context.WithValue(c.Request.Context(), ctxkey.ClientRequestID, h.semanticPayloadHashFromBuild(build)))
	req.Header = c.Request.Header.Clone()
	req.Header.Set("Content-Type", build.contentType)
	recorder := httptest.NewRecorder()
	captureCtx, _ := gin.CreateTestContext(recorder)
	captureCtx.Request = req
	for _, param := range c.Params {
		captureCtx.Params = append(captureCtx.Params, param)
	}

	parsed, err := h.gatewayService.ParseOpenAIImagesRequest(captureCtx, build.body)
	if err != nil {
		return nil, nil, nil, nil, service.ChannelMappingResult{}, infraerrors.BadRequest("INVALID_IMAGE_REQUEST", err.Error())
	}
	if !service.GroupAllowsImageGeneration(apiKey.Group) {
		return nil, nil, nil, nil, service.ChannelMappingResult{}, service.ErrImageStudioGroupUnavailable
	}

	reqLog := requestLogger(c, "handler.image_studio.generate", zap.Int64("user_id", subject.UserID), zap.Int64("api_key_id", apiKey.ID), zap.Int64("group_id", build.groupID), zap.String("model", parsed.Model))
	if decision := h.openAIGatewayHandler.checkContentModeration(c, reqLog, apiKey, subject, service.ContentModerationProtocolOpenAIImages, parsed.Model, parsed.ModerationBody()); decision != nil && decision.Blocked {
		return nil, nil, nil, nil, service.ChannelMappingResult{}, infraerrors.New(contentModerationStatus(decision), contentModerationErrorCode(decision), decision.Message)
	}
	imageRelease, acquired := h.openAIGatewayHandler.acquireImageGenerationSlot(c, false)
	if !acquired {
		return nil, nil, nil, nil, service.ChannelMappingResult{}, infraerrors.TooManyRequests("IMAGE_CONCURRENCY_LIMIT", "Image generation concurrency limit exceeded, please retry later")
	}
	if imageRelease != nil {
		defer imageRelease()
	}

	if err := h.billingCacheService.CheckBillingEligibility(c.Request.Context(), apiKey.User, apiKey, apiKey.Group, nil); err != nil {
		status, code, message, _ := billingErrorDetails(err)
		return nil, nil, nil, nil, service.ChannelMappingResult{}, infraerrors.New(status, code, message)
	}

	channelMapping, _ := h.gatewayService.ResolveChannelMappingAndRestrict(c.Request.Context(), apiKey.GroupID, parsed.Model)
	sessionHash := h.gatewayService.GenerateExplicitSessionHash(captureCtx, build.body)
	selection, _, err := h.gatewayService.SelectAccountWithSchedulerForImages(c.Request.Context(), apiKey.GroupID, sessionHash, parsed.Model, nil, parsed.RequiredCapability)
	if err != nil || selection == nil || selection.Account == nil {
		return nil, nil, nil, nil, channelMapping, infraerrors.ServiceUnavailable("NO_AVAILABLE_IMAGE_ACCOUNT", "No available compatible accounts")
	}
	account := selection.Account
	if selection.ReleaseFunc != nil {
		defer selection.ReleaseFunc()
	}
	start := time.Now()
	result, err := h.gatewayService.ForwardImages(c.Request.Context(), captureCtx, account, build.body, parsed, channelMapping.MappedModel)
	if err != nil {
		var upstreamErr *service.OpenAIImagesUpstreamError
		if errors.As(err, &upstreamErr) {
			status := upstreamErr.StatusCode
			if status <= 0 {
				status = http.StatusBadGateway
			}
			return recorder, nil, nil, nil, channelMapping, infraerrors.New(status, upstreamErr.ErrorType, upstreamErr.Message)
		}
		h.gatewayService.ReportOpenAIAccountScheduleResult(account.ID, false, nil)
		return nil, nil, nil, nil, channelMapping, infraerrors.ServiceUnavailable("IMAGE_UPSTREAM_ERROR", err.Error())
	}
	if result == nil {
		return nil, nil, nil, nil, channelMapping, infraerrors.ServiceUnavailable("IMAGE_UPSTREAM_EMPTY", "empty upstream image response")
	}
	if result.Duration <= 0 {
		result.Duration = time.Since(start)
	}
	h.gatewayService.ReportOpenAIAccountScheduleResult(account.ID, true, result.FirstTokenMs)
	return recorder, result, account, parsed, channelMapping, nil
}

func (h *ImageStudioHandler) semanticPayloadHashFromBuild(build *imageStudioForwardBuild) string {
	if build == nil {
		return ""
	}
	bodySum := sha256.Sum256(build.body)
	sum := sha256.Sum256([]byte(fmt.Sprintf("%d|%s|%s|%d|%s", build.groupID, build.mode, build.size, build.n, hex.EncodeToString(bodySum[:]))))
	return hex.EncodeToString(sum[:])
}

func copyUploadedImages(writer *multipart.Writer, c *gin.Context, formName, targetName string) error {
	if c.Request.MultipartForm == nil || c.Request.MultipartForm.File == nil {
		return nil
	}
	files := c.Request.MultipartForm.File[formName]
	for _, fh := range files {
		if fh == nil {
			continue
		}
		if err := copyMultipartFile(writer, fh, targetName); err != nil {
			return err
		}
	}
	return nil
}

func copySingleUpload(writer *multipart.Writer, c *gin.Context, formName, targetName string, required bool) error {
	if c.Request.MultipartForm == nil || c.Request.MultipartForm.File == nil {
		if required {
			return infraerrors.BadRequest("FILE_REQUIRED", formName+" file is required")
		}
		return nil
	}
	files := c.Request.MultipartForm.File[formName]
	if len(files) == 0 {
		if required {
			return infraerrors.BadRequest("FILE_REQUIRED", formName+" file is required")
		}
		return nil
	}
	return copyMultipartFile(writer, files[0], targetName)
}

func copyMultipartFile(writer *multipart.Writer, fh *multipart.FileHeader, targetName string) error {
	if fh == nil {
		return nil
	}
	if fh.Size > imageStudioMaxUploadBytes {
		return infraerrors.BadRequest("FILE_TOO_LARGE", fmt.Sprintf("%s must be 20MB or smaller", fh.Filename))
	}
	src, err := fh.Open()
	if err != nil {
		return err
	}
	defer src.Close()
	dst, err := writer.CreateFormFile(targetName, fh.Filename)
	if err != nil {
		return err
	}
	_, err = io.Copy(dst, io.LimitReader(src, imageStudioMaxUploadBytes+1))
	return err
}

func multipartHasFiles(c *gin.Context, name string) bool {
	return c.Request.MultipartForm != nil && len(c.Request.MultipartForm.File[name]) > 0
}

func parseImageStudioImages(body []byte) []imageStudioImage {
	var payload struct {
		Data []imageStudioImage `json:"data"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil
	}
	return payload.Data
}
