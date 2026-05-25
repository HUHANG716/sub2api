package admin

import (
	"errors"
	"io"
	"strconv"
	"strings"

	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

type ImageStudioTemplateHandler struct {
	imageStudioService *service.ImageStudioService
}

func NewImageStudioTemplateHandler(imageStudioService *service.ImageStudioService) *ImageStudioTemplateHandler {
	return &ImageStudioTemplateHandler{imageStudioService: imageStudioService}
}

type imageStudioTemplateCreateRequest = service.ImageStudioTemplateCreateParams
type imageStudioTemplateUpdateRequest = service.ImageStudioTemplateUpdateParams
type imageStudioTemplateGitHubImportRequest = service.ImageStudioTemplateGitHubImportParams

func parseImageStudioTemplateID(c *gin.Context) (int64, bool) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		response.ErrorFrom(c, infraerrors.BadRequest("INVALID_TEMPLATE_ID", "invalid template id"))
		return 0, false
	}
	return id, true
}

func (h *ImageStudioTemplateHandler) List(c *gin.Context) {
	items, err := h.imageStudioService.Templates(c.Request.Context(), service.ImageStudioTemplateFilter{
		Mode:            strings.TrimSpace(c.Query("mode")),
		Model:           strings.TrimSpace(c.Query("model")),
		Query:           strings.TrimSpace(c.Query("q")),
		IncludeDisabled: c.Query("include_disabled") == "true",
	})
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, gin.H{"items": items})
}

func (h *ImageStudioTemplateHandler) Get(c *gin.Context) {
	id, ok := parseImageStudioTemplateID(c)
	if !ok {
		return
	}
	item, err := h.imageStudioService.GetTemplate(c.Request.Context(), id)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, item)
}

func (h *ImageStudioTemplateHandler) Create(c *gin.Context) {
	var req imageStudioTemplateCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorFrom(c, infraerrors.BadRequest("VALIDATION_ERROR", err.Error()))
		return
	}
	item, err := h.imageStudioService.CreateTemplate(c.Request.Context(), req)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Created(c, item)
}

func (h *ImageStudioTemplateHandler) Update(c *gin.Context) {
	id, ok := parseImageStudioTemplateID(c)
	if !ok {
		return
	}
	var req imageStudioTemplateUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorFrom(c, infraerrors.BadRequest("VALIDATION_ERROR", err.Error()))
		return
	}
	item, err := h.imageStudioService.UpdateTemplate(c.Request.Context(), id, req)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, item)
}

func (h *ImageStudioTemplateHandler) Delete(c *gin.Context) {
	id, ok := parseImageStudioTemplateID(c)
	if !ok {
		return
	}
	if err := h.imageStudioService.DeleteTemplate(c.Request.Context(), id); err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, nil)
}

func (h *ImageStudioTemplateHandler) SeedDefaults(c *gin.Context) {
	count, err := h.imageStudioService.SeedDefaultTemplates(c.Request.Context())
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, gin.H{"affected": count})
}

func (h *ImageStudioTemplateHandler) ImportGitHub(c *gin.Context) {
	var req imageStudioTemplateGitHubImportRequest
	if c.Request.Body != nil {
		if err := c.ShouldBindJSON(&req); err != nil {
			if !errors.Is(err, io.EOF) {
				response.ErrorFrom(c, infraerrors.BadRequest("VALIDATION_ERROR", err.Error()))
				return
			}
		}
	}
	result, err := h.imageStudioService.ImportGitHubTemplates(c.Request.Context(), req)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, result)
}
