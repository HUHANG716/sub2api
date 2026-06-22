package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/internal/pkg/pagination"
)

type BenefitService struct {
	repo                 BenefitRepository
	userRepo             benefitUserReader
	billingCacheService  benefitBalanceCacheInvalidator
	authCacheInvalidator APIKeyAuthCacheInvalidator
	entClient            *dbent.Client
	now                  func() time.Time
}

type benefitUserReader interface {
	GetByID(ctx context.Context, id int64) (*User, error)
}

type benefitBalanceCacheInvalidator interface {
	InvalidateUserBalance(ctx context.Context, userID int64) error
}

func NewBenefitService(repo BenefitRepository, userRepo benefitUserReader, billingCacheService benefitBalanceCacheInvalidator, authCacheInvalidator APIKeyAuthCacheInvalidator) *BenefitService {
	return &BenefitService{repo: repo, userRepo: userRepo, billingCacheService: billingCacheService, authCacheInvalidator: authCacheInvalidator, now: time.Now}
}

func ProvideBenefitService(repo BenefitRepository, userRepo UserRepository, billingCacheService *BillingCacheService, authCacheInvalidator APIKeyAuthCacheInvalidator, entClient *dbent.Client) *BenefitService {
	svc := NewBenefitService(repo, userRepo, billingCacheService, authCacheInvalidator)
	svc.entClient = entClient
	return svc
}

func (s *BenefitService) CreateCampaign(ctx context.Context, input CreateBenefitCampaignInput) (*BenefitCampaign, error) {
	campaign := &BenefitCampaign{
		Name:            strings.TrimSpace(input.Name),
		Enabled:         input.Enabled,
		Visible:         input.Visible,
		StartsAt:        input.StartsAt,
		EndsAt:          input.EndsAt,
		ThresholdAmount: input.ThresholdAmount,
		GrantAmount:     input.GrantAmount,
		RechargeScope:   benefitRechargeScopeOrDefault(input.RechargeScope),
		Copy:            input.Copy,
		SortOrder:       input.SortOrder,
	}
	if err := validateBenefitCampaign(campaign); err != nil {
		return nil, err
	}
	if err := s.repo.CreateCampaign(ctx, campaign); err != nil {
		return nil, err
	}
	return campaign, nil
}

func (s *BenefitService) UpdateCampaign(ctx context.Context, id int64, input UpdateBenefitCampaignInput) (*BenefitCampaign, error) {
	campaign, err := s.repo.GetCampaignByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if input.Name != nil {
		campaign.Name = strings.TrimSpace(*input.Name)
	}
	if input.Enabled != nil {
		campaign.Enabled = *input.Enabled
	}
	if input.Visible != nil {
		campaign.Visible = *input.Visible
	}
	if input.StartsAt != nil {
		campaign.StartsAt = *input.StartsAt
	}
	if input.EndsAt != nil {
		campaign.EndsAt = *input.EndsAt
	}
	if input.ThresholdAmount != nil {
		campaign.ThresholdAmount = *input.ThresholdAmount
	}
	if input.GrantAmount != nil {
		campaign.GrantAmount = *input.GrantAmount
	}
	if input.RechargeScope != nil {
		campaign.RechargeScope = benefitRechargeScopeOrDefault(*input.RechargeScope)
	}
	if input.Copy != nil {
		campaign.Copy = *input.Copy
	}
	if input.SortOrder != nil {
		campaign.SortOrder = *input.SortOrder
	}
	if err := validateBenefitCampaign(campaign); err != nil {
		return nil, err
	}
	if err := s.repo.UpdateCampaign(ctx, campaign); err != nil {
		return nil, err
	}
	return campaign, nil
}

func (s *BenefitService) DeleteCampaign(ctx context.Context, id int64) error {
	return s.repo.DeleteCampaign(ctx, id)
}

func (s *BenefitService) GetCampaign(ctx context.Context, id int64) (*BenefitCampaign, error) {
	return s.repo.GetCampaignByID(ctx, id)
}

func (s *BenefitService) ListCampaigns(ctx context.Context, params pagination.PaginationParams, filters BenefitCampaignFilters) ([]BenefitCampaign, *pagination.PaginationResult, error) {
	return s.repo.ListCampaigns(ctx, params, filters)
}

func (s *BenefitService) ListClaims(ctx context.Context, campaignID int64, params pagination.PaginationParams) ([]BenefitClaim, *pagination.PaginationResult, error) {
	if _, err := s.repo.GetCampaignByID(ctx, campaignID); err != nil {
		return nil, nil, err
	}
	return s.repo.ListClaimsByCampaign(ctx, campaignID, params)
}

func (s *BenefitService) ListUserCampaigns(ctx context.Context, userID int64) ([]BenefitCampaignView, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	campaigns, err := s.repo.ListVisibleCampaigns(ctx)
	if err != nil {
		return nil, err
	}
	views := make([]BenefitCampaignView, 0, len(campaigns))
	for _, campaign := range campaigns {
		eligible, err := s.eligibleRechargeAmount(ctx, &campaign, user)
		if err != nil {
			return nil, err
		}
		claim, err := s.repo.GetClaimByCampaignAndUser(ctx, campaign.ID, userID)
		if err != nil {
			return nil, err
		}
		views = append(views, BenefitCampaignView{
			Campaign:               campaign,
			State:                  s.campaignState(&campaign, eligible, claim),
			EligibleRechargeAmount: eligible,
			Claim:                  claim,
		})
	}
	return views, nil
}

func (s *BenefitService) Claim(ctx context.Context, campaignID, userID int64) (*BenefitClaimResult, error) {
	campaign, err := s.repo.GetCampaignByID(ctx, campaignID)
	if err != nil {
		return nil, err
	}
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if err := s.ensureClaimableCampaign(campaign); err != nil {
		return nil, err
	}
	eligible, err := s.eligibleRechargeAmount(ctx, campaign, user)
	if err != nil {
		return nil, err
	}
	if eligible < campaign.ThresholdAmount {
		return nil, ErrBenefitNotEligible
	}
	if existing, err := s.repo.GetClaimByCampaignAndUser(ctx, campaign.ID, userID); err != nil {
		return nil, err
	} else if existing != nil {
		return nil, ErrBenefitAlreadyClaimed
	}

	result, err := s.runClaimTransaction(ctx, func(txCtx context.Context) (*BenefitClaimResult, error) {
		latest, err := s.userRepo.GetByID(txCtx, userID)
		if err != nil {
			return nil, err
		}
		balanceBefore := latest.Balance
		claimedAt := s.now()
		claim := &BenefitClaim{
			CampaignID:             campaign.ID,
			UserID:                 userID,
			Status:                 BenefitClaimStatusClaimed,
			EligibleRechargeAmount: eligible,
			GrantedAmount:          campaign.GrantAmount,
			BalanceBefore:          balanceBefore,
			BalanceAfter:           balanceBefore + campaign.GrantAmount,
			ClaimedAt:              claimedAt,
			Metadata:               map[string]any{"recharge_scope": campaign.RechargeScope},
		}
		if err := s.repo.CreateClaim(txCtx, claim); err != nil {
			if isBenefitDuplicateClaimError(err) {
				return nil, ErrBenefitAlreadyClaimed
			}
			return nil, err
		}
		realBalanceAfter, err := s.repo.CreditUserBalanceOnly(txCtx, userID, campaign.GrantAmount)
		if err != nil {
			return nil, fmt.Errorf("credit benefit balance: %w", err)
		}
		claim.BalanceAfter = realBalanceAfter
		claim.BalanceBefore = realBalanceAfter - campaign.GrantAmount
		if err := s.repo.UpdateClaimBalanceSnapshot(txCtx, claim.ID, claim.BalanceBefore, claim.BalanceAfter); err != nil {
			return nil, fmt.Errorf("update benefit claim balance snapshot: %w", err)
		}
		return &BenefitClaimResult{Campaign: *campaign, Claim: *claim, Balance: claim.BalanceAfter}, nil
	})
	if err != nil {
		return nil, err
	}
	s.invalidateBalanceCaches(ctx, userID)
	return result, nil
}

func (s *BenefitService) runClaimTransaction(ctx context.Context, fn func(context.Context) (*BenefitClaimResult, error)) (*BenefitClaimResult, error) {
	if s.entClient == nil {
		return fn(ctx)
	}
	tx, err := s.entClient.Tx(ctx)
	if err != nil {
		return nil, fmt.Errorf("start benefit claim transaction: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	result, err := fn(dbent.NewTxContext(ctx, tx))
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit benefit claim transaction: %w", err)
	}
	return result, nil
}

func (s *BenefitService) eligibleRechargeAmount(ctx context.Context, campaign *BenefitCampaign, user *User) (float64, error) {
	if campaign.RechargeScope == BenefitRechargeScopeCampaignWindow {
		return s.repo.SumCompletedRechargeInWindow(ctx, user.ID, campaign.StartsAt, campaign.EndsAt)
	}
	return user.TotalRecharged, nil
}

func (s *BenefitService) campaignState(campaign *BenefitCampaign, eligible float64, claim *BenefitClaim) string {
	now := s.now()
	if claim != nil {
		return BenefitStateClaimed
	}
	if now.Before(campaign.StartsAt) {
		return BenefitStateNotStarted
	}
	if now.After(campaign.EndsAt) {
		return BenefitStateEnded
	}
	if eligible < campaign.ThresholdAmount {
		return BenefitStateNotEligible
	}
	return BenefitStateClaimable
}

func (s *BenefitService) ensureClaimableCampaign(campaign *BenefitCampaign) error {
	now := s.now()
	if !campaign.Visible {
		return ErrBenefitCampaignInvisible
	}
	if !campaign.Enabled {
		return ErrBenefitEnded
	}
	if now.Before(campaign.StartsAt) {
		return ErrBenefitNotStarted
	}
	if now.After(campaign.EndsAt) {
		return ErrBenefitEnded
	}
	return nil
}

func (s *BenefitService) invalidateBalanceCaches(ctx context.Context, userID int64) {
	if s.authCacheInvalidator != nil {
		s.authCacheInvalidator.InvalidateAuthCacheByUserID(ctx, userID)
	}
	if s.billingCacheService != nil {
		go func() {
			defer func() {
				if r := recover(); r != nil {
					slog.Error("panic in benefit balance cache invalidation", "user_id", userID, "recover", r)
				}
			}()
			cacheCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			if err := s.billingCacheService.InvalidateUserBalance(cacheCtx, userID); err != nil {
				slog.Error("invalidate benefit balance cache failed", "user_id", userID, "error", err)
			}
		}()
	}
}

func validateBenefitCampaign(c *BenefitCampaign) error {
	if strings.TrimSpace(c.Name) == "" || len(c.Name) > 120 {
		return ErrBenefitCampaignInvalid
	}
	if !c.EndsAt.After(c.StartsAt) {
		return ErrBenefitCampaignInvalid
	}
	if c.ThresholdAmount <= 0 || c.GrantAmount <= 0 {
		return ErrBenefitCampaignInvalid
	}
	if c.RechargeScope != BenefitRechargeScopeLifetime && c.RechargeScope != BenefitRechargeScopeCampaignWindow {
		return ErrBenefitCampaignInvalid
	}
	c.Copy = normalizeBenefitCopy(c.Copy)
	return nil
}

func normalizeBenefitCopy(copy BenefitCampaignCopy) BenefitCampaignCopy {
	defaults := DefaultBenefitCampaignCopy()
	if strings.TrimSpace(copy.Title) == "" {
		copy.Title = defaults.Title
	}
	if strings.TrimSpace(copy.Description) == "" {
		copy.Description = defaults.Description
	}
	if strings.TrimSpace(copy.Button) == "" {
		copy.Button = defaults.Button
	}
	if strings.TrimSpace(copy.Success) == "" {
		copy.Success = defaults.Success
	}
	if strings.TrimSpace(copy.NotEligible) == "" {
		copy.NotEligible = defaults.NotEligible
	}
	if strings.TrimSpace(copy.NotStarted) == "" {
		copy.NotStarted = defaults.NotStarted
	}
	if strings.TrimSpace(copy.Ended) == "" {
		copy.Ended = defaults.Ended
	}
	if strings.TrimSpace(copy.Claimed) == "" {
		copy.Claimed = defaults.Claimed
	}
	if strings.TrimSpace(copy.Failed) == "" {
		copy.Failed = defaults.Failed
	}
	return copy
}

func benefitRechargeScopeOrDefault(scope string) string {
	scope = strings.TrimSpace(scope)
	if scope == "" {
		return BenefitRechargeScopeLifetime
	}
	return scope
}

func isBenefitDuplicateClaimError(err error) bool {
	return errors.Is(err, ErrBenefitAlreadyClaimed) || strings.Contains(strings.ToLower(err.Error()), "benefit_claims_campaign_user_unique") || strings.Contains(strings.ToLower(err.Error()), "unique constraint")
}
