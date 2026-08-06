package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

type dailyResetTrackingUserSubRepo struct {
	userSubRepoNoop

	resetDailyCalled   bool
	resetWeeklyCalled  bool
	resetMonthlyCalled bool

	dailyWindowStart   time.Time
	weeklyWindowStart  time.Time
	monthlyWindowStart time.Time
}

func (r *dailyResetTrackingUserSubRepo) ResetDailyUsage(_ context.Context, _ int64, _ *time.Time, windowStart time.Time) error {
	r.resetDailyCalled = true
	r.dailyWindowStart = windowStart
	return nil
}

func (r *dailyResetTrackingUserSubRepo) ResetWeeklyUsage(_ context.Context, _ int64, _ *time.Time, windowStart time.Time) error {
	r.resetWeeklyCalled = true
	r.weeklyWindowStart = windowStart
	return nil
}

func (r *dailyResetTrackingUserSubRepo) ResetMonthlyUsage(_ context.Context, _ int64, _ *time.Time, windowStart time.Time) error {
	r.resetMonthlyCalled = true
	r.monthlyWindowStart = windowStart
	return nil
}

func TestAssignOrExtendSubscription_ExpiredDailyCardAnchorsWindowsAtPurchaseTime(t *testing.T) {
	groupRepo := &subscriptionGroupRepoStub{
		group: &Group{ID: 1, SubscriptionType: SubscriptionTypeSubscription},
	}
	subRepo := newSubscriptionUserSubRepoStub()
	oldStart := time.Now().AddDate(0, 0, -3)
	oldWindowStart := time.Date(oldStart.Year(), oldStart.Month(), oldStart.Day(), 0, 0, 0, 0, oldStart.Location())
	subRepo.seed(&UserSubscription{
		ID:                 100,
		UserID:             200,
		GroupID:            1,
		StartsAt:           oldStart,
		ExpiresAt:          oldStart.AddDate(0, 0, 1),
		Status:             SubscriptionStatusExpired,
		DailyWindowStart:   &oldWindowStart,
		WeeklyWindowStart:  &oldWindowStart,
		MonthlyWindowStart: &oldWindowStart,
		DailyUsageUSD:      10,
		WeeklyUsageUSD:     20,
		MonthlyUsageUSD:    30,
		Notes:              "old",
	})
	svc := NewSubscriptionService(groupRepo, subRepo, nil, nil, nil)

	renewed, reused, err := svc.AssignOrExtendSubscription(context.Background(), &AssignSubscriptionInput{
		UserID:       200,
		GroupID:      1,
		ValidityDays: 1,
		Notes:        "new",
	})

	require.NoError(t, err)
	require.True(t, reused)
	require.Equal(t, SubscriptionStatusActive, renewed.Status)
	require.True(t, renewed.StartsAt.After(oldStart), "重新购买过期订阅时应重置当前周期 StartsAt")
	require.False(t, renewed.ExpiresAt.After(renewed.StartsAt.AddDate(0, 0, 1)))
	require.NotNil(t, renewed.DailyWindowStart)
	require.Equal(t, renewed.StartsAt, *renewed.DailyWindowStart)
	require.NotNil(t, renewed.WeeklyWindowStart)
	require.Equal(t, renewed.StartsAt, *renewed.WeeklyWindowStart)
	require.NotNil(t, renewed.MonthlyWindowStart)
	require.Equal(t, renewed.StartsAt, *renewed.MonthlyWindowStart)
	require.Equal(t, 0.0, renewed.DailyUsageUSD)
	require.Equal(t, 0.0, renewed.WeeklyUsageUSD)
	require.Equal(t, 0.0, renewed.MonthlyUsageUSD)
	require.Equal(t, "old\nnew", renewed.Notes)
}

func TestExtendSubscription_ExpiredSubscriptionAnchorsWindowsAtReactivationTime(t *testing.T) {
	oldStart := time.Now().AddDate(0, 0, -10)
	oldWindowStart := oldStart
	subRepo := newSubscriptionUserSubRepoStub()
	subRepo.seed(&UserSubscription{
		ID:                 101,
		UserID:             201,
		GroupID:            1,
		StartsAt:           oldStart,
		ExpiresAt:          oldStart.AddDate(0, 0, 7),
		Status:             SubscriptionStatusExpired,
		DailyWindowStart:   &oldWindowStart,
		WeeklyWindowStart:  &oldWindowStart,
		MonthlyWindowStart: &oldWindowStart,
		DailyUsageUSD:      10,
		WeeklyUsageUSD:     20,
		MonthlyUsageUSD:    30,
		Notes:              "old",
	})
	svc := NewSubscriptionService(groupRepoNoop{}, subRepo, nil, nil, nil)

	renewed, err := svc.ExtendSubscription(context.Background(), 101, 7)

	require.NoError(t, err)
	require.Equal(t, SubscriptionStatusActive, renewed.Status)
	require.True(t, renewed.StartsAt.After(oldStart), "重新激活过期订阅时应重置 StartsAt")
	require.False(t, renewed.ExpiresAt.After(renewed.StartsAt.AddDate(0, 0, 7)))
	require.NotNil(t, renewed.DailyWindowStart)
	require.Equal(t, renewed.StartsAt, *renewed.DailyWindowStart)
	require.NotNil(t, renewed.WeeklyWindowStart)
	require.Equal(t, renewed.StartsAt, *renewed.WeeklyWindowStart)
	require.NotNil(t, renewed.MonthlyWindowStart)
	require.Equal(t, renewed.StartsAt, *renewed.MonthlyWindowStart)
	require.Equal(t, 0.0, renewed.DailyUsageUSD)
	require.Equal(t, 0.0, renewed.WeeklyUsageUSD)
	require.Equal(t, 0.0, renewed.MonthlyUsageUSD)
	require.Equal(t, "old", renewed.Notes)
}

func TestAssignOrExtendSubscription_ExpiredSubscriptionAppendsMatchingNotes(t *testing.T) {
	groupRepo := &subscriptionGroupRepoStub{
		group: &Group{ID: 1, SubscriptionType: SubscriptionTypeSubscription},
	}
	subRepo := newSubscriptionUserSubRepoStub()
	oldStart := time.Now().AddDate(0, 0, -3)
	subRepo.seed(&UserSubscription{
		ID:        101,
		UserID:    201,
		GroupID:   1,
		StartsAt:  oldStart,
		ExpiresAt: oldStart.AddDate(0, 0, 1),
		Status:    SubscriptionStatusExpired,
		Notes:     "same",
	})
	svc := NewSubscriptionService(groupRepo, subRepo, nil, nil, nil)

	renewed, reused, err := svc.AssignOrExtendSubscription(context.Background(), &AssignSubscriptionInput{
		UserID:       201,
		GroupID:      1,
		ValidityDays: 1,
		Notes:        "same",
	})

	require.NoError(t, err)
	require.True(t, reused)
	require.Equal(t, "same\nsame", renewed.Notes)
}

func TestUserSubscriptionNeedsDailyReset_DailyCardKeepsOneTimeQuota(t *testing.T) {
	start := time.Date(2026, 5, 18, 12, 0, 0, 0, time.UTC)
	dailyWindowStart := start
	sub := &UserSubscription{
		StartsAt:         start,
		ExpiresAt:        start.Add(24 * time.Hour),
		DailyWindowStart: &dailyWindowStart,
		DailyUsageUSD:    10,
	}

	require.False(t, sub.NeedsDailyResetAt(start.Add(23*time.Hour)), "日卡不应在自然日 0 点刷新")
	require.True(t, sub.NeedsDailyResetAt(start.Add(24*time.Hour)), "日卡也应按购买时间后的 24 小时窗口判断刷新")
}

func TestUserSubscriptionNeedsDailyReset_MultiDaySubscriptionStillRefreshes(t *testing.T) {
	start := time.Date(2026, 5, 18, 12, 0, 0, 0, time.UTC)
	dailyWindowStart := time.Date(2026, 5, 18, 0, 0, 0, 0, time.UTC)
	sub := &UserSubscription{
		StartsAt:         start,
		ExpiresAt:        start.AddDate(0, 0, 2),
		DailyWindowStart: &dailyWindowStart,
	}

	require.False(t, sub.HasOneTimeDailyQuota())
	require.False(t, sub.NeedsDailyResetAt(start.Add(24*time.Hour-time.Minute)), "购买时刻前不应因旧午夜窗口提前刷新")
	require.True(t, sub.NeedsDailyResetAt(start.Add(24*time.Hour)), "多日订阅应从购买时刻开始按 24 小时窗口刷新")
}

func TestUserSubscriptionNeedsWeeklyReset_LegacyMidnightWindowWaitsForPurchaseTime(t *testing.T) {
	start := time.Date(2026, 5, 18, 10, 29, 0, 0, time.UTC)
	legacyWindowStart := startOfDay(start)
	sub := &UserSubscription{
		StartsAt:         start,
		ExpiresAt:        start.AddDate(0, 0, 28),
		WeeklyWindowStart: &legacyWindowStart,
	}

	require.False(t, sub.NeedsWeeklyResetAt(start.Add(7*24*time.Hour-time.Minute)), "旧午夜周窗口不应在购买时刻前提前刷新")
	require.True(t, sub.NeedsWeeklyResetAt(start.Add(7*24*time.Hour)), "周窗口应在购买时刻满 7 天后刷新")
}

func TestUserSubscriptionNeedsWeeklyReset_CurrentMidnightWindowWaitsForNextPurchaseBoundary(t *testing.T) {
	start := time.Date(2026, 5, 18, 10, 29, 0, 0, time.UTC)
	currentWindowStart := startOfDay(start.Add(7 * 24 * time.Hour))
	sub := &UserSubscription{
		StartsAt:         start,
		ExpiresAt:        start.AddDate(0, 0, 28),
		WeeklyWindowStart: &currentWindowStart,
	}

	require.False(t, sub.NeedsWeeklyResetAt(start.Add(7*24*time.Hour+time.Hour)), "当前周期被错误写成午夜时，不应在下一个购买边界前提前重置")
	require.True(t, sub.NeedsWeeklyResetAt(start.Add(14*24*time.Hour)), "上一个周期的午夜窗口应在下一次真实购买边界重锚")
}

func TestUserSubscriptionNeedsWeeklyReset_UpcomingMidnightWindowWaitsForPurchaseBoundary(t *testing.T) {
	start := time.Date(2026, 5, 18, 10, 29, 0, 0, time.UTC)
	upcomingWindowStart := startOfDay(start.Add(14 * 24 * time.Hour))
	sub := &UserSubscription{
		StartsAt:         start,
		ExpiresAt:        start.AddDate(0, 0, 28),
		WeeklyWindowStart: &upcomingWindowStart,
	}

	now := start.Add(14*24*time.Hour - time.Minute)
	windowStart := effectiveWindowStart(start, &upcomingWindowStart, 7*24*time.Hour, now)

	require.False(t, sub.NeedsWeeklyResetAt(now), "被提前写入下一个午夜窗口时，购买时刻前不应再次重置")
	require.NotNil(t, windowStart)
	require.Equal(t, start.Add(7*24*time.Hour), *windowStart, "展示应保留当前购买周期的窗口")
}

func TestUserSubscriptionKeepsManualMidnightWindowOnUnrelatedDate(t *testing.T) {
	start := time.Date(2026, 5, 18, 10, 29, 0, 0, time.UTC)
	manualWindowStart := time.Date(2026, 5, 21, 0, 0, 0, 0, time.UTC)
	windowStart := effectiveWindowStart(start, &manualWindowStart, 7*24*time.Hour, time.Date(2026, 5, 22, 12, 0, 0, 0, time.UTC))

	require.NotNil(t, windowStart)
	require.Equal(t, manualWindowStart, *windowStart, "与购买周期无关的午夜手动重置不应被重锚")
}

func TestUserSubscriptionDailyResetTime_UsesWindowStartPlus24Hours(t *testing.T) {
	start := time.Date(2026, 5, 18, 12, 0, 0, 0, time.UTC)
	dailyWindowStart := start
	expiresAt := start.Add(24 * time.Hour)
	sub := &UserSubscription{
		StartsAt:         start,
		ExpiresAt:        expiresAt,
		DailyWindowStart: &dailyWindowStart,
	}

	resetAt := sub.DailyResetTime()
	require.NotNil(t, resetAt)
	require.Equal(t, dailyWindowStart.Add(24*time.Hour), *resetAt, "日额度重置时间应始终等于窗口起点后 24 小时")
}

func TestValidateAndCheckLimits_DailyCardExpiredBeforeSecondDailyWindow(t *testing.T) {
	now := time.Now()
	startsAt := now.Add(-25 * time.Hour)
	dailyWindowStart := startsAt
	dailyLimit := 10.0
	svc := NewSubscriptionService(groupRepoNoop{}, userSubRepoNoop{}, nil, nil, nil)
	sub := &UserSubscription{
		Status:           SubscriptionStatusActive,
		ID:               1,
		UserID:           10,
		GroupID:          20,
		StartsAt:         startsAt,
		ExpiresAt:        startsAt.Add(24 * time.Hour),
		DailyUsageUSD:    10,
		DailyWindowStart: &dailyWindowStart,
	}
	group := &Group{
		SubscriptionType: SubscriptionTypeSubscription,
		DailyLimitUSD:    &dailyLimit,
	}

	needsMaintenance, err := svc.ValidateAndCheckLimits(sub, group)

	require.False(t, needsMaintenance)
	require.True(t, errors.Is(err, ErrSubscriptionExpired), "日卡到第二个 daily 窗口前应先因为订阅过期被拦截")
	require.Equal(t, 10.0, sub.DailyUsageUSD)
}

func TestCheckAndResetWindows_MultiDaySubscriptionStillResetsDailyUsage(t *testing.T) {
	now := time.Date(2026, 7, 29, 12, 0, 0, 0, time.UTC)
	startsAt := now.Add(-48 * time.Hour)
	dailyWindowStart := now.Add(-25 * time.Hour)
	repo := &dailyResetTrackingUserSubRepo{}
	svc := NewSubscriptionService(groupRepoNoop{}, repo, nil, nil, nil)
	svc.now = func() time.Time { return now }
	sub := &UserSubscription{
		ID:               1,
		UserID:           10,
		GroupID:          20,
		StartsAt:         startsAt,
		ExpiresAt:        startsAt.AddDate(0, 0, 4),
		DailyUsageUSD:    10,
		DailyWindowStart: &dailyWindowStart,
	}

	err := svc.CheckAndResetWindows(context.Background(), sub)

	require.NoError(t, err)
	require.True(t, repo.resetDailyCalled, "多日订阅仍应重置过期 daily window")
	require.Equal(t, 0.0, sub.DailyUsageUSD)
}

func TestCheckAndResetWindows_CurrentMidnightWeeklyWindowWaitsForNextPurchaseBoundary(t *testing.T) {
	startsAt := time.Date(2026, 5, 18, 10, 29, 0, 0, time.UTC)
	now := startsAt.Add(7*24*time.Hour + time.Hour)
	currentMidnightWindowStart := startOfDay(startsAt.Add(7 * 24 * time.Hour))
	repo := &dailyResetTrackingUserSubRepo{}
	svc := NewSubscriptionService(groupRepoNoop{}, repo, nil, nil, nil)
	sub := &UserSubscription{
		ID:                1,
		UserID:            10,
		GroupID:           20,
		StartsAt:          startsAt,
		ExpiresAt:         startsAt.AddDate(0, 0, 28),
		WeeklyUsageUSD:    200,
		WeeklyWindowStart: &currentMidnightWindowStart,
	}

	err := svc.checkAndResetWindowsAt(context.Background(), sub, now)

	require.NoError(t, err)
	require.False(t, repo.resetWeeklyCalled, "错误写成当前周午夜的窗口不应提前清零")
	require.Equal(t, 200.0, sub.WeeklyUsageUSD)
	require.Equal(t, currentMidnightWindowStart, *sub.WeeklyWindowStart)
}

func TestCheckAndResetWindows_AdvancesFromPurchaseAnchoredWindow(t *testing.T) {
	now := time.Now()
	startsAt := now.AddDate(0, 0, -40)
	dailyWindowStart := now.Add(-25 * time.Hour)
	weeklyWindowStart := now.Add(-8 * 24 * time.Hour)
	monthlyWindowStart := now.Add(-31 * 24 * time.Hour)
	repo := &dailyResetTrackingUserSubRepo{}
	svc := NewSubscriptionService(groupRepoNoop{}, repo, nil, nil, nil)
	sub := &UserSubscription{
		ID:                 1,
		UserID:             10,
		GroupID:            20,
		StartsAt:           startsAt,
		ExpiresAt:          startsAt.AddDate(0, 0, 60),
		DailyUsageUSD:      10,
		WeeklyUsageUSD:     20,
		MonthlyUsageUSD:    30,
		DailyWindowStart:   &dailyWindowStart,
		WeeklyWindowStart:  &weeklyWindowStart,
		MonthlyWindowStart: &monthlyWindowStart,
	}

	err := svc.CheckAndResetWindows(context.Background(), sub)

	require.NoError(t, err)
	require.True(t, repo.resetDailyCalled)
	require.True(t, repo.resetWeeklyCalled)
	require.True(t, repo.resetMonthlyCalled)
	require.Equal(t, dailyWindowStart.Add(24*time.Hour), *sub.DailyWindowStart)
	require.Equal(t, dailyWindowStart.Add(24*time.Hour), repo.dailyWindowStart)
	require.Equal(t, weeklyWindowStart.Add(7*24*time.Hour), *sub.WeeklyWindowStart)
	require.Equal(t, weeklyWindowStart.Add(7*24*time.Hour), repo.weeklyWindowStart)
	require.Equal(t, monthlyWindowStart.Add(30*24*time.Hour), *sub.MonthlyWindowStart)
	require.Equal(t, monthlyWindowStart.Add(30*24*time.Hour), repo.monthlyWindowStart)
}

func TestCheckAndResetWindows_LegacyMidnightWeeklyWindowWaitsForPurchaseTime(t *testing.T) {
	now := time.Date(2026, 5, 25, 10, 0, 0, 0, time.UTC)
	startsAt := time.Date(2026, 5, 18, 15, 30, 0, 0, time.UTC)
	legacyWeeklyWindowStart := time.Date(2026, 5, 18, 0, 0, 0, 0, time.UTC)
	repo := &dailyResetTrackingUserSubRepo{}
	svc := NewSubscriptionService(groupRepoNoop{}, repo, nil, nil, nil)
	sub := &UserSubscription{
		ID:                1,
		UserID:            10,
		GroupID:           20,
		StartsAt:          startsAt,
		ExpiresAt:         startsAt.AddDate(0, 0, 14),
		WeeklyUsageUSD:    20,
		WeeklyWindowStart: &legacyWeeklyWindowStart,
	}

	err := svc.checkAndResetWindowsAt(context.Background(), sub, now)

	require.NoError(t, err)
	require.False(t, repo.resetWeeklyCalled, "老周卡零点窗口应等到购买时间点后再刷新")
	require.Equal(t, 20.0, sub.WeeklyUsageUSD)
	require.Equal(t, legacyWeeklyWindowStart, *sub.WeeklyWindowStart)
}

func TestValidateAndCheckLimits_LegacyMidnightWeeklyWindowWaitsForPurchaseTime(t *testing.T) {
	now := time.Date(2026, 5, 25, 10, 0, 0, 0, time.UTC)
	startsAt := time.Date(2026, 5, 18, 15, 30, 0, 0, time.UTC)
	legacyWeeklyWindowStart := time.Date(2026, 5, 18, 0, 0, 0, 0, time.UTC)
	weeklyLimit := 100.0
	sub := &UserSubscription{
		Status:            SubscriptionStatusActive,
		StartsAt:          startsAt,
		ExpiresAt:         startsAt.AddDate(0, 0, 14),
		WeeklyUsageUSD:    80,
		WeeklyWindowStart: &legacyWeeklyWindowStart,
	}
	group := &Group{
		SubscriptionType: SubscriptionTypeSubscription,
		WeeklyLimitUSD:   &weeklyLimit,
	}
	svc := NewSubscriptionService(groupRepoNoop{}, userSubRepoNoop{}, nil, nil, nil)

	needsMaintenance, err := svc.validateAndCheckLimitsAt(sub, group, now)

	require.NoError(t, err)
	require.False(t, needsMaintenance)
	require.Equal(t, 80.0, sub.WeeklyUsageUSD)
}

func TestNormalizeExpiredWindows_LegacyMidnightWeeklyWindowWaitsForPurchaseTime(t *testing.T) {
	now := time.Date(2026, 5, 25, 10, 0, 0, 0, time.UTC)
	startsAt := time.Date(2026, 5, 18, 15, 30, 0, 0, time.UTC)
	legacyWeeklyWindowStart := time.Date(2026, 5, 18, 0, 0, 0, 0, time.UTC)
	sub := UserSubscription{
		StartsAt:          startsAt,
		ExpiresAt:         startsAt.AddDate(0, 0, 14),
		WeeklyUsageUSD:    80,
		WeeklyWindowStart: &legacyWeeklyWindowStart,
	}
	subs := []UserSubscription{sub}

	normalizeExpiredWindowsAt(subs, now)

	require.Equal(t, 80.0, subs[0].WeeklyUsageUSD)
	require.NotNil(t, subs[0].WeeklyWindowStart)
	require.Equal(t, startsAt, *subs[0].WeeklyWindowStart)
}

func TestNormalizeExpiredWindows_DoesNotClearMissingWindowUsage(t *testing.T) {
	now := time.Date(2026, 5, 20, 10, 0, 0, 0, time.UTC)
	startsAt := time.Date(2026, 5, 18, 15, 30, 0, 0, time.UTC)
	subs := []UserSubscription{
		{
			StartsAt:        startsAt,
			ExpiresAt:       startsAt.AddDate(0, 0, 7),
			WeeklyUsageUSD:  369.99,
			MonthlyUsageUSD: 369.99,
		},
	}

	normalizeExpiredWindowsAt(subs, now)

	require.NotNil(t, subs[0].WeeklyWindowStart)
	require.Equal(t, startsAt, *subs[0].WeeklyWindowStart)
	require.Equal(t, 369.99, subs[0].WeeklyUsageUSD)
	require.NotNil(t, subs[0].MonthlyWindowStart)
	require.Equal(t, startsAt, *subs[0].MonthlyWindowStart)
	require.Equal(t, 369.99, subs[0].MonthlyUsageUSD)
}

func TestNormalizeExpiredWindows_DisplaysCurrentWindowWhenMaintenanceIsPending(t *testing.T) {
	startsAt := time.Date(2026, 5, 18, 15, 30, 0, 0, time.UTC)
	oldWeeklyWindowStart := startsAt
	now := time.Date(2026, 5, 26, 10, 0, 0, 0, time.UTC)
	subs := []UserSubscription{
		{
			StartsAt:          startsAt,
			ExpiresAt:         startsAt.AddDate(0, 0, 14),
			WeeklyUsageUSD:    80,
			WeeklyWindowStart: &oldWeeklyWindowStart,
		},
	}

	normalizeExpiredWindowsAt(subs, now)

	require.Equal(t, 0.0, subs[0].WeeklyUsageUSD)
	require.NotNil(t, subs[0].WeeklyWindowStart)
	require.Equal(t, time.Date(2026, 5, 25, 15, 30, 0, 0, time.UTC), *subs[0].WeeklyWindowStart)
}

func TestCheckAndResetWindows_LegacyMidnightWeeklyWindowResetsAtPurchaseTime(t *testing.T) {
	now := time.Date(2026, 5, 25, 16, 0, 0, 0, time.UTC)
	startsAt := time.Date(2026, 5, 18, 15, 30, 0, 0, time.UTC)
	legacyWeeklyWindowStart := time.Date(2026, 5, 18, 0, 0, 0, 0, time.UTC)
	repo := &dailyResetTrackingUserSubRepo{}
	svc := NewSubscriptionService(groupRepoNoop{}, repo, nil, nil, nil)
	sub := &UserSubscription{
		ID:                1,
		UserID:            10,
		GroupID:           20,
		StartsAt:          startsAt,
		ExpiresAt:         startsAt.AddDate(0, 0, 14),
		WeeklyUsageUSD:    20,
		WeeklyWindowStart: &legacyWeeklyWindowStart,
	}

	err := svc.checkAndResetWindowsAt(context.Background(), sub, now)

	expectedWindowStart := time.Date(2026, 5, 25, 15, 30, 0, 0, time.UTC)
	require.NoError(t, err)
	require.True(t, repo.resetWeeklyCalled)
	require.Equal(t, expectedWindowStart, *sub.WeeklyWindowStart)
	require.Equal(t, expectedWindowStart, repo.weeklyWindowStart)
	require.Equal(t, 0.0, sub.WeeklyUsageUSD)
}

func TestRollingWindowStartKeepsPurchaseTimeOfDay(t *testing.T) {
	purchaseAnchoredStart := time.Date(2026, 5, 18, 15, 30, 0, 0, time.UTC)
	now := time.Date(2026, 5, 19, 16, 0, 0, 0, time.UTC)

	got := rollingWindowStart(purchaseAnchoredStart, 24*time.Hour, now)

	require.Equal(t, time.Date(2026, 5, 19, 15, 30, 0, 0, time.UTC), got)
	require.NotEqual(t, time.Date(2026, 5, 19, 0, 0, 0, 0, time.UTC), got)
}

func TestValidateAndCheckLimits_DailyCardExpiresBeforeSecondDailyQuota(t *testing.T) {
	start := time.Now().Add(-23 * time.Hour)
	dailyWindowStart := start
	dailyLimit := 10.0
	sub := &UserSubscription{
		Status:           SubscriptionStatusActive,
		StartsAt:         start,
		ExpiresAt:        start.Add(24 * time.Hour),
		DailyWindowStart: &dailyWindowStart,
		DailyUsageUSD:    dailyLimit + 0.01,
	}
	group := &Group{
		SubscriptionType: SubscriptionTypeSubscription,
		DailyLimitUSD:    &dailyLimit,
	}
	svc := NewSubscriptionService(groupRepoNoop{}, userSubRepoNoop{}, nil, nil, nil)

	needsMaintenance, err := svc.ValidateAndCheckLimits(sub, group)

	require.False(t, needsMaintenance, "日卡未到购买时间后的 24 小时前不应触发 daily reset 维护")
	require.True(t, errors.Is(err, ErrDailyLimitExceeded))
	require.Equal(t, dailyLimit+0.01, sub.DailyUsageUSD, "热路径不应清零日卡已用额度")
}
