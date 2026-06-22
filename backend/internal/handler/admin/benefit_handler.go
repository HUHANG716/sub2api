package admin

import (
	"strconv"
	"strings"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/handler/dto"
	"github.com/Wei-Shaw/sub2api/internal/pkg/pagination"
	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

type BenefitHandler struct {
	benefitService *service.BenefitService
}

func NewBenefitHandler(benefitService *service.BenefitService) *BenefitHandler {
	return &BenefitHandler{benefitService: benefitService}
}

type BenefitCampaignRequest struct {
	Name            string                      `json:"name"`
	Enabled         bool                        `json:"enabled"`
	Visible         bool                        `json:"visible"`
	StartsAt        int64                       `json:"starts_at"`
	EndsAt          int64                       `json:"ends_at"`
	ThresholdAmount float64                     `json:"threshold_amount"`
	GrantAmount     float64                     `json:"grant_amount"`
	RechargeScope   string                      `json:"recharge_scope"`
	Copy            service.BenefitCampaignCopy `json:"copy"`
	SortOrder       int                         `json:"sort_order"`
}

type BenefitCampaignUpdateRequest struct {
	Name            *string                      `json:"name"`
	Enabled         *bool                        `json:"enabled"`
	Visible         *bool                        `json:"visible"`
	StartsAt        *int64                       `json:"starts_at"`
	EndsAt          *int64                       `json:"ends_at"`
	ThresholdAmount *float64                     `json:"threshold_amount"`
	GrantAmount     *float64                     `json:"grant_amount"`
	RechargeScope   *string                      `json:"recharge_scope"`
	Copy            *service.BenefitCampaignCopy `json:"copy"`
	SortOrder       *int                         `json:"sort_order"`
}

func (h *BenefitHandler) List(c *gin.Context) {
	page, pageSize := response.ParsePagination(c)
	params := pagination.PaginationParams{
		Page:      page,
		PageSize:  pageSize,
		SortBy:    c.DefaultQuery("sort_by", "created_at"),
		SortOrder: c.DefaultQuery("sort_order", "desc"),
	}
	filters := service.BenefitCampaignFilters{
		Search: strings.TrimSpace(c.Query("search")),
	}
	if enabled, ok := parseOptionalBool(c.Query("enabled")); ok {
		filters.Enabled = &enabled
	}
	if visible, ok := parseOptionalBool(c.Query("visible")); ok {
		filters.Visible = &visible
	}

	campaigns, paginationResult, err := h.benefitService.ListCampaigns(c.Request.Context(), params, filters)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Paginated(c, dto.BenefitCampaignsFromService(campaigns), paginationResult.Total, page, pageSize)
}

func (h *BenefitHandler) GetByID(c *gin.Context) {
	campaignID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid benefit campaign ID")
		return
	}
	campaign, err := h.benefitService.GetCampaign(c.Request.Context(), campaignID)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, dto.BenefitCampaignFromService(campaign))
}

func (h *BenefitHandler) Create(c *gin.Context) {
	var req BenefitCampaignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}
	campaign, err := h.benefitService.CreateCampaign(c.Request.Context(), service.CreateBenefitCampaignInput{
		Name:            req.Name,
		Enabled:         req.Enabled,
		Visible:         req.Visible,
		StartsAt:        time.Unix(req.StartsAt, 0),
		EndsAt:          time.Unix(req.EndsAt, 0),
		ThresholdAmount: req.ThresholdAmount,
		GrantAmount:     req.GrantAmount,
		RechargeScope:   req.RechargeScope,
		Copy:            req.Copy,
		SortOrder:       req.SortOrder,
	})
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, dto.BenefitCampaignFromService(campaign))
}

func (h *BenefitHandler) Update(c *gin.Context) {
	campaignID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid benefit campaign ID")
		return
	}
	var req BenefitCampaignUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}
	var startsAt *time.Time
	if req.StartsAt != nil {
		t := time.Unix(*req.StartsAt, 0)
		startsAt = &t
	}
	var endsAt *time.Time
	if req.EndsAt != nil {
		t := time.Unix(*req.EndsAt, 0)
		endsAt = &t
	}
	campaign, err := h.benefitService.UpdateCampaign(c.Request.Context(), campaignID, service.UpdateBenefitCampaignInput{
		Name:            req.Name,
		Enabled:         req.Enabled,
		Visible:         req.Visible,
		StartsAt:        startsAt,
		EndsAt:          endsAt,
		ThresholdAmount: req.ThresholdAmount,
		GrantAmount:     req.GrantAmount,
		RechargeScope:   req.RechargeScope,
		Copy:            req.Copy,
		SortOrder:       req.SortOrder,
	})
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, dto.BenefitCampaignFromService(campaign))
}

func (h *BenefitHandler) Delete(c *gin.Context) {
	campaignID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid benefit campaign ID")
		return
	}
	if err := h.benefitService.DeleteCampaign(c.Request.Context(), campaignID); err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, gin.H{"message": "Benefit campaign deleted successfully"})
}

func (h *BenefitHandler) ListClaims(c *gin.Context) {
	campaignID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid benefit campaign ID")
		return
	}
	page, pageSize := response.ParsePagination(c)
	params := pagination.PaginationParams{Page: page, PageSize: pageSize}
	claims, paginationResult, err := h.benefitService.ListClaims(c.Request.Context(), campaignID, params)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Paginated(c, dto.BenefitClaimsFromService(claims), paginationResult.Total, page, pageSize)
}

func parseOptionalBool(raw string) (bool, bool) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "true", "1":
		return true, true
	case "false", "0":
		return false, true
	default:
		return false, false
	}
}
