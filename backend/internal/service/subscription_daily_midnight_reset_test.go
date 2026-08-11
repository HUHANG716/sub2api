package service

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

// dailyRollingResetRepo 记录 ResetDailyUsage 收到的新窗口起点。
type dailyRollingResetRepo struct {
	userSubRepoNoop

	resetCalled    bool
	newWindowStart time.Time
}

func (r *dailyRollingResetRepo) ResetDailyUsage(_ context.Context, _ int64, _ *time.Time, newWindowStart time.Time) error {
	r.resetCalled = true
	r.newWindowStart = newWindowStart
	return nil
}

func newRollingDailyTestSub(startsAt, dailyWindowStart time.Time) *UserSubscription {
	windowStart := dailyWindowStart
	return &UserSubscription{
		ID:               1,
		UserID:           10,
		GroupID:          20,
		StartsAt:         startsAt,
		ExpiresAt:        startsAt.AddDate(0, 0, 30),
		DailyUsageUSD:    43.34,
		DailyWindowStart: &windowStart,
	}
}

func TestCheckAndResetWindows_DailyWaitsForRollingBoundary(t *testing.T) {
	startsAt := time.Date(2026, 8, 3, 16, 49, 0, 0, time.UTC)
	manualResetAt := time.Date(2026, 8, 6, 16, 49, 0, 0, time.UTC)

	beforeBoundaryRepo := &dailyRollingResetRepo{}
	beforeBoundarySvc := NewSubscriptionService(groupRepoNoop{}, beforeBoundaryRepo, nil, nil, nil)
	beforeBoundarySub := newRollingDailyTestSub(startsAt, manualResetAt)
	require.NoError(t, beforeBoundarySvc.checkAndResetWindowsAt(
		context.Background(),
		beforeBoundarySub,
		manualResetAt.Add(7*time.Hour+16*time.Minute),
	))
	require.False(t, beforeBoundaryRepo.resetCalled, "未满 24 小时不应因跨过午夜而重置")
	require.Equal(t, 43.34, beforeBoundarySub.DailyUsageUSD)

	atBoundaryRepo := &dailyRollingResetRepo{}
	atBoundarySvc := NewSubscriptionService(groupRepoNoop{}, atBoundaryRepo, nil, nil, nil)
	atBoundarySub := newRollingDailyTestSub(startsAt, manualResetAt)
	require.NoError(t, atBoundarySvc.checkAndResetWindowsAt(
		context.Background(),
		atBoundarySub,
		manualResetAt.Add(24*time.Hour),
	))
	require.True(t, atBoundaryRepo.resetCalled)
	require.Equal(t, manualResetAt.Add(24*time.Hour), atBoundaryRepo.newWindowStart)
	require.Zero(t, atBoundarySub.DailyUsageUSD)
}

func TestDailyResetTime_UsesRollingWindowStart(t *testing.T) {
	startsAt := time.Date(2026, 8, 3, 12, 0, 0, 0, time.UTC)
	windowStart := time.Date(2026, 8, 6, 16, 49, 0, 0, time.UTC)
	sub := newRollingDailyTestSub(startsAt, windowStart)

	resetAt := sub.DailyResetTime()
	require.NotNil(t, resetAt)
	require.Equal(t, windowStart.Add(24*time.Hour), *resetAt)
}

func TestNormalizeExpiredWindows_DailyUsageClearsAtRollingBoundary(t *testing.T) {
	startsAt := time.Date(2026, 8, 3, 12, 0, 0, 0, time.UTC)
	windowStart := time.Date(2026, 8, 6, 16, 49, 0, 0, time.UTC)

	before := []UserSubscription{*newRollingDailyTestSub(startsAt, windowStart)}
	normalizeExpiredWindowsAt(before, windowStart.Add(23*time.Hour+59*time.Minute))
	require.Equal(t, 43.34, before[0].DailyUsageUSD)

	after := []UserSubscription{*newRollingDailyTestSub(startsAt, windowStart)}
	normalizeExpiredWindowsAt(after, windowStart.Add(24*time.Hour))
	require.Zero(t, after[0].DailyUsageUSD)
	require.Equal(t, windowStart.Add(24*time.Hour), *after[0].DailyWindowStart)
}

func TestCheckAndResetWindows_OneTimeDailyCardKeepsSingleQuota(t *testing.T) {
	startsAt := time.Date(2026, 8, 6, 17, 0, 0, 0, time.UTC)
	anchor := startsAt
	repo := &dailyRollingResetRepo{}
	svc := NewSubscriptionService(groupRepoNoop{}, repo, nil, nil, nil)
	sub := &UserSubscription{
		ID:               1,
		UserID:           10,
		GroupID:          20,
		StartsAt:         startsAt,
		ExpiresAt:        startsAt.AddDate(0, 0, 1),
		DailyUsageUSD:    10,
		DailyWindowStart: &anchor,
	}

	require.NoError(t, svc.checkAndResetWindowsAt(context.Background(), sub, startsAt.Add(25*time.Hour)))
	require.False(t, repo.resetCalled, "日卡为一次性配额，不应自动发放第二个日窗口")
	require.Equal(t, 10.0, sub.DailyUsageUSD)
}
