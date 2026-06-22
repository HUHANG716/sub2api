package handler

import (
	"context"
	"strconv"

	"github.com/Wei-Shaw/sub2api/internal/handler/dto"
	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

type benefitUserService interface {
	ListUserCampaigns(ctx context.Context, userID int64) ([]service.BenefitCampaignView, error)
	Claim(ctx context.Context, campaignID, userID int64) (*service.BenefitClaimResult, error)
}

type BenefitHandler struct {
	benefitService benefitUserService
}

func NewBenefitHandler(benefitService benefitUserService) *BenefitHandler {
	return &BenefitHandler{benefitService: benefitService}
}

func (h *BenefitHandler) List(c *gin.Context) {
	subject, ok := middleware.GetAuthSubjectFromContext(c)
	if !ok {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	views, err := h.benefitService.ListUserCampaigns(c.Request.Context(), subject.UserID)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	response.Success(c, dto.BenefitCampaignViewsFromService(views))
}

func (h *BenefitHandler) Claim(c *gin.Context) {
	subject, ok := middleware.GetAuthSubjectFromContext(c)
	if !ok {
		response.Unauthorized(c, "User not authenticated")
		return
	}

	campaignID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid benefit campaign ID")
		return
	}

	result, err := h.benefitService.Claim(c.Request.Context(), campaignID, subject.UserID)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	response.Success(c, gin.H{
		"campaign": dto.BenefitCampaignFromService(&result.Campaign),
		"claim":    dto.BenefitClaimFromService(&result.Claim),
		"balance":  result.Balance,
	})
}
