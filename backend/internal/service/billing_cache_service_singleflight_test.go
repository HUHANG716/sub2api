//go:build unit

package service

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/stretchr/testify/require"
)

type billingCacheMissStub struct {
	setBalanceCalls      atomic.Int64
	subscriptionData     *SubscriptionCacheData
	setSubscriptionCalls atomic.Int64
}

func (s *billingCacheMissStub) GetUserBalance(ctx context.Context, userID int64) (float64, error) {
	return 0, errors.New("cache miss")
}

func (s *billingCacheMissStub) SetUserBalance(ctx context.Context, userID int64, balance float64) error {
	s.setBalanceCalls.Add(1)
	return nil
}

func (s *billingCacheMissStub) DeductUserBalance(ctx context.Context, userID int64, amount float64) error {
	return nil
}

func (s *billingCacheMissStub) InvalidateUserBalance(ctx context.Context, userID int64) error {
	return nil
}

func (s *billingCacheMissStub) GetSubscriptionCache(ctx context.Context, userID, groupID int64) (*SubscriptionCacheData, error) {
	if s.subscriptionData != nil {
		cp := *s.subscriptionData
		return &cp, nil
	}
	return nil, errors.New("cache miss")
}

func (s *billingCacheMissStub) SetSubscriptionCache(ctx context.Context, userID, groupID int64, data *SubscriptionCacheData) error {
	s.setSubscriptionCalls.Add(1)
	return nil
}

func (s *billingCacheMissStub) UpdateSubscriptionUsage(ctx context.Context, userID, groupID int64, cost float64) error {
	return nil
}

func (s *billingCacheMissStub) InvalidateSubscriptionCache(ctx context.Context, userID, groupID int64) error {
	return nil
}

func (s *billingCacheMissStub) GetAPIKeyRateLimit(ctx context.Context, keyID int64) (*APIKeyRateLimitCacheData, error) {
	return nil, errors.New("cache miss")
}

func (s *billingCacheMissStub) SetAPIKeyRateLimit(ctx context.Context, keyID int64, data *APIKeyRateLimitCacheData) error {
	return nil
}

func (s *billingCacheMissStub) UpdateAPIKeyRateLimitUsage(ctx context.Context, keyID int64, cost float64) error {
	return nil
}

func (s *billingCacheMissStub) InvalidateAPIKeyRateLimit(ctx context.Context, keyID int64) error {
	return nil
}

type balanceLoadUserRepoStub struct {
	mockUserRepo
	calls   atomic.Int64
	delay   time.Duration
	balance float64
}

func (s *balanceLoadUserRepoStub) GetByID(ctx context.Context, id int64) (*User, error) {
	s.calls.Add(1)
	if s.delay > 0 {
		select {
		case <-time.After(s.delay):
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}
	return &User{ID: id, Balance: s.balance}, nil
}

func (s *balanceLoadUserRepoStub) ListUserAuthIdentities(context.Context, int64) ([]UserAuthIdentityRecord, error) {
	return nil, nil
}

func (s *balanceLoadUserRepoStub) UnbindUserAuthProvider(context.Context, int64, string) error {
	return nil
}

func TestBillingCacheServiceGetUserBalance_Singleflight(t *testing.T) {
	cache := &billingCacheMissStub{}
	userRepo := &balanceLoadUserRepoStub{
		delay:   80 * time.Millisecond,
		balance: 12.34,
	}
	svc := NewBillingCacheService(cache, userRepo, nil, nil, nil, nil, &config.Config{})
	t.Cleanup(svc.Stop)

	const goroutines = 16
	start := make(chan struct{})
	var wg sync.WaitGroup
	errCh := make(chan error, goroutines)
	balCh := make(chan float64, goroutines)

	for i := 0; i < goroutines; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			bal, err := svc.GetUserBalance(context.Background(), 99)
			errCh <- err
			balCh <- bal
		}()
	}

	close(start)
	wg.Wait()
	close(errCh)
	close(balCh)

	for err := range errCh {
		require.NoError(t, err)
	}
	for bal := range balCh {
		require.Equal(t, 12.34, bal)
	}

	require.Equal(t, int64(1), userRepo.calls.Load(), "并发穿透应被 singleflight 合并")
	require.Eventually(t, func() bool {
		return cache.setBalanceCalls.Load() >= 1
	}, time.Second, 10*time.Millisecond)
}

type subscriptionLoadRepoStub struct {
	userSubRepoNoop
	calls atomic.Int64
	sub   *UserSubscription
}

func (s *subscriptionLoadRepoStub) GetActiveByUserIDAndGroupID(context.Context, int64, int64) (*UserSubscription, error) {
	s.calls.Add(1)
	if s.sub == nil {
		return nil, ErrSubscriptionNotFound
	}
	cp := *s.sub
	return &cp, nil
}

func TestBillingCacheServiceGetSubscriptionStatus_ExpiredPeriodCacheReloadsFromDB(t *testing.T) {
	oldLimit := 10.0
	newLimit := 20.0
	now := time.Now()
	cache := &billingCacheMissStub{
		subscriptionData: &SubscriptionCacheData{
			Status:          SubscriptionStatusActive,
			ExpiresAt:       now.Add(24 * time.Hour),
			PeriodID:        1,
			PeriodStartsAt:  now.Add(-2 * time.Hour),
			PeriodExpiresAt: now.Add(-time.Hour),
			PeriodUsage:     10,
			PeriodLimit:     &oldLimit,
		},
	}
	subRepo := &subscriptionLoadRepoStub{
		sub: &UserSubscription{
			ID:        9,
			UserID:    1001,
			GroupID:   1,
			Status:    SubscriptionStatusActive,
			ExpiresAt: now.Add(24 * time.Hour),
			CurrentPeriod: &UserSubscriptionPeriod{
				ID:        2,
				StartsAt:  now.Add(-time.Minute),
				ExpiresAt: now.Add(time.Hour),
				LimitUSD:  &newLimit,
				UsageUSD:  0,
			},
		},
	}
	svc := NewBillingCacheService(cache, nil, subRepo, nil, nil, nil, &config.Config{})
	t.Cleanup(svc.Stop)

	data, err := svc.GetSubscriptionStatus(context.Background(), 1001, 1)

	require.NoError(t, err)
	require.Equal(t, int64(2), data.PeriodID)
	require.Equal(t, 0.0, data.PeriodUsage)
	require.Equal(t, newLimit, *data.PeriodLimit)
	require.Equal(t, int64(1), subRepo.calls.Load())
	require.Eventually(t, func() bool {
		return cache.setSubscriptionCalls.Load() >= 1
	}, time.Second, 10*time.Millisecond)
}

func TestBillingCacheServiceGetSubscriptionStatus_LegacyCacheWithoutPeriodReloadsFromDB(t *testing.T) {
	limit := 20.0
	now := time.Now()
	cache := &billingCacheMissStub{
		subscriptionData: &SubscriptionCacheData{
			Status:       SubscriptionStatusActive,
			ExpiresAt:    now.Add(24 * time.Hour),
			DailyUsage:   1,
			WeeklyUsage:  2,
			MonthlyUsage: 3,
		},
	}
	subRepo := &subscriptionLoadRepoStub{
		sub: &UserSubscription{
			ID:              9,
			UserID:          1001,
			GroupID:         1,
			Status:          SubscriptionStatusActive,
			ExpiresAt:       now.Add(24 * time.Hour),
			DailyUsageUSD:   4,
			WeeklyUsageUSD:  5,
			MonthlyUsageUSD: 6,
			CurrentPeriod: &UserSubscriptionPeriod{
				ID:        2,
				StartsAt:  now.Add(-time.Minute),
				ExpiresAt: now.Add(time.Hour),
				LimitUSD:  &limit,
				UsageUSD:  7,
			},
		},
	}
	svc := NewBillingCacheService(cache, nil, subRepo, nil, nil, nil, &config.Config{})
	t.Cleanup(svc.Stop)

	data, err := svc.GetSubscriptionStatus(context.Background(), 1001, 1)

	require.NoError(t, err)
	require.Equal(t, int64(2), data.PeriodID)
	require.Equal(t, 7.0, data.PeriodUsage)
	require.Equal(t, limit, *data.PeriodLimit)
	require.Equal(t, 4.0, data.DailyUsage)
	require.Equal(t, int64(1), subRepo.calls.Load())
	require.Eventually(t, func() bool {
		return cache.setSubscriptionCalls.Load() >= 1
	}, time.Second, 10*time.Millisecond)
}
