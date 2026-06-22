package service

import (
	"context"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/pkg/pagination"
)

type BenefitRepository interface {
	CreateCampaign(ctx context.Context, campaign *BenefitCampaign) error
	GetCampaignByID(ctx context.Context, id int64) (*BenefitCampaign, error)
	UpdateCampaign(ctx context.Context, campaign *BenefitCampaign) error
	DeleteCampaign(ctx context.Context, id int64) error
	ListCampaigns(ctx context.Context, params pagination.PaginationParams, filters BenefitCampaignFilters) ([]BenefitCampaign, *pagination.PaginationResult, error)
	ListVisibleCampaigns(ctx context.Context) ([]BenefitCampaign, error)
	CountClaimsByCampaignIDs(ctx context.Context, campaignIDs []int64) (map[int64]int, error)
	CreateClaim(ctx context.Context, claim *BenefitClaim) error
	GetClaimByCampaignAndUser(ctx context.Context, campaignID, userID int64) (*BenefitClaim, error)
	UpdateClaimBalanceSnapshot(ctx context.Context, claimID int64, balanceBefore, balanceAfter float64) error
	ListClaimsByCampaign(ctx context.Context, campaignID int64, params pagination.PaginationParams) ([]BenefitClaim, *pagination.PaginationResult, error)
	SumCompletedRechargeInWindow(ctx context.Context, userID int64, startsAt, endsAt time.Time) (float64, error)
	CreditUserBalanceOnly(ctx context.Context, userID int64, amount float64) (float64, error)
}
