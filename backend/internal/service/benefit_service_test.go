//go:build unit

package service

import (
	"context"
	"fmt"
	"sort"
	"sync"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/pkg/pagination"
	"github.com/stretchr/testify/require"
)

func TestBenefitServiceListUserCampaignsStates(t *testing.T) {
	now := time.Date(2026, 6, 22, 12, 0, 0, 0, time.UTC)
	user := &User{ID: 7, Balance: 3, TotalRecharged: 120}
	repo := newMemoryBenefitRepo()
	repo.campaigns[1] = BenefitCampaign{ID: 1, Name: "future", Enabled: true, Visible: true, StartsAt: now.Add(time.Hour), EndsAt: now.Add(2 * time.Hour), ThresholdAmount: 100, GrantAmount: 10, RechargeScope: BenefitRechargeScopeLifetime, Copy: DefaultBenefitCampaignCopy()}
	repo.campaigns[2] = BenefitCampaign{ID: 2, Name: "ended", Enabled: true, Visible: true, StartsAt: now.Add(-2 * time.Hour), EndsAt: now.Add(-time.Hour), ThresholdAmount: 100, GrantAmount: 10, RechargeScope: BenefitRechargeScopeLifetime, Copy: DefaultBenefitCampaignCopy()}
	repo.campaigns[3] = BenefitCampaign{ID: 3, Name: "claimable", Enabled: true, Visible: true, StartsAt: now.Add(-time.Hour), EndsAt: now.Add(time.Hour), ThresholdAmount: 100, GrantAmount: 10, RechargeScope: BenefitRechargeScopeLifetime, Copy: DefaultBenefitCampaignCopy()}
	repo.campaigns[4] = BenefitCampaign{ID: 4, Name: "not eligible", Enabled: true, Visible: true, StartsAt: now.Add(-time.Hour), EndsAt: now.Add(time.Hour), ThresholdAmount: 200, GrantAmount: 10, RechargeScope: BenefitRechargeScopeLifetime, Copy: DefaultBenefitCampaignCopy()}
	repo.claims[key(5, user.ID)] = BenefitClaim{ID: 9, CampaignID: 5, UserID: user.ID, Status: BenefitClaimStatusClaimed, GrantedAmount: 10, ClaimedAt: now}
	repo.campaigns[5] = BenefitCampaign{ID: 5, Name: "claimed", Enabled: true, Visible: true, StartsAt: now.Add(-time.Hour), EndsAt: now.Add(time.Hour), ThresholdAmount: 100, GrantAmount: 10, RechargeScope: BenefitRechargeScopeLifetime, Copy: DefaultBenefitCampaignCopy()}

	svc := NewBenefitService(repo, &memoryBenefitUserRepo{user: user}, nil, nil)
	svc.now = func() time.Time { return now }

	views, err := svc.ListUserCampaigns(context.Background(), user.ID)
	require.NoError(t, err)
	require.Equal(t, []string{BenefitStateNotStarted, BenefitStateEnded, BenefitStateClaimable, BenefitStateNotEligible, BenefitStateClaimed}, collectBenefitStates(views))
}

func TestBenefitServiceClaimCreditsBalanceOnceWithoutChangingTotalRecharged(t *testing.T) {
	now := time.Date(2026, 6, 22, 12, 0, 0, 0, time.UTC)
	user := &User{ID: 7, Balance: 3, TotalRecharged: 120}
	repo := newMemoryBenefitRepo()
	repo.user = user
	repo.campaigns[1] = BenefitCampaign{ID: 1, Name: "claimable", Enabled: true, Visible: true, StartsAt: now.Add(-time.Hour), EndsAt: now.Add(time.Hour), ThresholdAmount: 100, GrantAmount: 10, RechargeScope: BenefitRechargeScopeLifetime, Copy: DefaultBenefitCampaignCopy()}
	userRepo := &memoryBenefitUserRepo{user: user}
	auth := &memoryBenefitAuthInvalidator{}
	cache := &memoryBenefitBillingCache{}
	svc := NewBenefitService(repo, userRepo, cache, auth)
	svc.now = func() time.Time { return now }

	result, err := svc.Claim(context.Background(), 1, user.ID)
	require.NoError(t, err)
	require.Equal(t, 13.0, result.Balance)
	require.Equal(t, 13.0, user.Balance)
	require.Equal(t, 1, repo.creditOnlyCalls)
	require.Equal(t, 0, userRepo.updateCalls)
	require.Equal(t, 120.0, user.TotalRecharged)
	require.Equal(t, 1, auth.calls)
	require.Eventually(t, func() bool { return cache.calls == 1 }, time.Second, 10*time.Millisecond)

	_, err = svc.Claim(context.Background(), 1, user.ID)
	require.ErrorIs(t, err, ErrBenefitAlreadyClaimed)
	require.Equal(t, 13.0, user.Balance)
	require.Equal(t, 1, repo.creditOnlyCalls)
	require.Equal(t, 0, userRepo.updateCalls)
}

func TestBenefitServiceCampaignWindowEligibility(t *testing.T) {
	now := time.Date(2026, 6, 22, 12, 0, 0, 0, time.UTC)
	user := &User{ID: 7, Balance: 0, TotalRecharged: 999}
	repo := newMemoryBenefitRepo()
	repo.windowRecharge[7] = 60
	repo.campaigns[1] = BenefitCampaign{ID: 1, Name: "window", Enabled: true, Visible: true, StartsAt: now.Add(-time.Hour), EndsAt: now.Add(time.Hour), ThresholdAmount: 100, GrantAmount: 10, RechargeScope: BenefitRechargeScopeCampaignWindow, Copy: DefaultBenefitCampaignCopy()}
	svc := NewBenefitService(repo, &memoryBenefitUserRepo{user: user}, nil, nil)
	svc.now = func() time.Time { return now }

	views, err := svc.ListUserCampaigns(context.Background(), user.ID)
	require.NoError(t, err)
	require.Len(t, views, 1)
	require.Equal(t, BenefitStateNotEligible, views[0].State)
	require.Equal(t, 60.0, views[0].EligibleRechargeAmount)
}

func TestBenefitServiceClaimUsesCreditedBalanceSnapshot(t *testing.T) {
	now := time.Date(2026, 6, 22, 12, 0, 0, 0, time.UTC)
	user := &User{ID: 7, Balance: 3, TotalRecharged: 120}
	repo := newMemoryBenefitRepo()
	repo.user = user
	repo.creditBalanceAfter = 30
	repo.campaigns[1] = BenefitCampaign{ID: 1, Name: "claimable", Enabled: true, Visible: true, StartsAt: now.Add(-time.Hour), EndsAt: now.Add(time.Hour), ThresholdAmount: 100, GrantAmount: 10, RechargeScope: BenefitRechargeScopeLifetime, Copy: DefaultBenefitCampaignCopy()}
	svc := NewBenefitService(repo, &memoryBenefitUserRepo{user: user}, nil, nil)
	svc.now = func() time.Time { return now }

	result, err := svc.Claim(context.Background(), 1, user.ID)
	require.NoError(t, err)
	require.Equal(t, 30.0, result.Balance)
	require.Equal(t, 20.0, result.Claim.BalanceBefore)
	require.Equal(t, 30.0, result.Claim.BalanceAfter)
	require.Equal(t, 1, repo.snapshotUpdates)

	stored := repo.claims[key(1, user.ID)]
	require.Equal(t, 20.0, stored.BalanceBefore)
	require.Equal(t, 30.0, stored.BalanceAfter)
}

type memoryBenefitRepo struct {
	mu                 sync.Mutex
	campaigns          map[int64]BenefitCampaign
	claims             map[string]BenefitClaim
	windowRecharge     map[int64]float64
	nextClaimID        int64
	creditOnlyCalls    int
	creditBalanceAfter float64
	snapshotUpdates    int
	user               *User
}

func newMemoryBenefitRepo() *memoryBenefitRepo {
	return &memoryBenefitRepo{campaigns: map[int64]BenefitCampaign{}, claims: map[string]BenefitClaim{}, windowRecharge: map[int64]float64{}, nextClaimID: 1}
}

func key(campaignID, userID int64) string { return fmt.Sprintf("%d:%d", campaignID, userID) }

func (r *memoryBenefitRepo) ListVisibleCampaigns(context.Context) ([]BenefitCampaign, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]BenefitCampaign, 0, len(r.campaigns))
	for _, campaign := range r.campaigns {
		if campaign.Enabled && campaign.Visible {
			out = append(out, campaign)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].ID < out[j].ID
	})
	return out, nil
}

func (r *memoryBenefitRepo) GetCampaignByID(_ context.Context, id int64) (*BenefitCampaign, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	campaign, ok := r.campaigns[id]
	if !ok {
		return nil, ErrBenefitCampaignNotFound
	}
	return &campaign, nil
}

func (r *memoryBenefitRepo) CreateClaim(_ context.Context, claim *BenefitClaim) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	k := key(claim.CampaignID, claim.UserID)
	if _, exists := r.claims[k]; exists {
		return ErrBenefitAlreadyClaimed
	}
	claim.ID = r.nextClaimID
	r.nextClaimID++
	r.claims[k] = *claim
	return nil
}

func (r *memoryBenefitRepo) GetClaimByCampaignAndUser(_ context.Context, campaignID, userID int64) (*BenefitClaim, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	claim, ok := r.claims[key(campaignID, userID)]
	if !ok {
		return nil, nil
	}
	return &claim, nil
}

func (r *memoryBenefitRepo) SumCompletedRechargeInWindow(_ context.Context, userID int64, _, _ time.Time) (float64, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.windowRecharge[userID], nil
}

func (r *memoryBenefitRepo) CreditUserBalanceOnly(_ context.Context, _ int64, amount float64) (float64, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.creditOnlyCalls++
	if r.creditBalanceAfter != 0 {
		if r.user != nil {
			r.user.Balance = r.creditBalanceAfter
		}
		return r.creditBalanceAfter, nil
	}
	if r.user != nil {
		r.user.Balance += amount
		return r.user.Balance, nil
	}
	return amount, nil
}

func (r *memoryBenefitRepo) UpdateClaimBalanceSnapshot(_ context.Context, claimID int64, balanceBefore, balanceAfter float64) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.snapshotUpdates++
	for k, claim := range r.claims {
		if claim.ID == claimID {
			claim.BalanceBefore = balanceBefore
			claim.BalanceAfter = balanceAfter
			r.claims[k] = claim
			return nil
		}
	}
	return ErrBenefitAlreadyClaimed
}

func (r *memoryBenefitRepo) CreateCampaign(context.Context, *BenefitCampaign) error {
	panic("not used")
}
func (r *memoryBenefitRepo) UpdateCampaign(context.Context, *BenefitCampaign) error {
	panic("not used")
}
func (r *memoryBenefitRepo) DeleteCampaign(context.Context, int64) error { panic("not used") }
func (r *memoryBenefitRepo) ListCampaigns(context.Context, pagination.PaginationParams, BenefitCampaignFilters) ([]BenefitCampaign, *pagination.PaginationResult, error) {
	panic("not used")
}
func (r *memoryBenefitRepo) CountClaimsByCampaignIDs(context.Context, []int64) (map[int64]int, error) {
	panic("not used")
}
func (r *memoryBenefitRepo) ListClaimsByCampaign(context.Context, int64, pagination.PaginationParams) ([]BenefitClaim, *pagination.PaginationResult, error) {
	panic("not used")
}

type memoryBenefitUserRepo struct {
	user        *User
	updateCalls int
}

func (r *memoryBenefitUserRepo) GetByID(context.Context, int64) (*User, error) {
	copied := *r.user
	return &copied, nil
}

func (r *memoryBenefitUserRepo) UpdateBalance(context.Context, int64, float64) error {
	r.updateCalls++
	return nil
}

type memoryBenefitAuthInvalidator struct{ calls int }

func (m *memoryBenefitAuthInvalidator) InvalidateAuthCacheByKey(context.Context, string) {}
func (m *memoryBenefitAuthInvalidator) InvalidateAuthCacheByUserID(context.Context, int64) {
	m.calls++
}
func (m *memoryBenefitAuthInvalidator) InvalidateAuthCacheByGroupID(context.Context, int64) {}

type memoryBenefitBillingCache struct{ calls int }

func (m *memoryBenefitBillingCache) InvalidateUserBalance(context.Context, int64) error {
	m.calls++
	return nil
}

func collectBenefitStates(views []BenefitCampaignView) []string {
	out := make([]string, 0, len(views))
	for _, view := range views {
		out = append(out, view.State)
	}
	return out
}
