package service

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// --- Task 5: 验证 calculateProgress 纯函数行为正确 ---

func newTestSubscriptionService() *SubscriptionService {
	return &SubscriptionService{}
}

func ptrFloat64(v float64) *float64  { return &v }
func ptrTime(t time.Time) *time.Time { return &t }

func TestCalculateProgress_BasicFields(t *testing.T) {
	svc := newTestSubscriptionService()
	now := time.Now()

	sub := &UserSubscription{
		ID:        100,
		ExpiresAt: now.Add(30 * 24 * time.Hour),
	}
	group := &Group{
		Name: "Premium",
	}

	progress := svc.calculateProgress(sub, group)

	assert.Equal(t, int64(100), progress.ID)
	assert.Equal(t, "Premium", progress.GroupName)
	assert.Equal(t, sub.ExpiresAt, progress.ExpiresAt)
	assert.Equal(t, 30, progress.ExpiresInDays)
	assert.Nil(t, progress.Daily, "无日限额时 Daily 应为 nil")
	assert.Nil(t, progress.Weekly, "无周限额时 Weekly 应为 nil")
	assert.Nil(t, progress.Monthly, "无月限额时 Monthly 应为 nil")
}

func TestCalculateProgress_DailyUsage(t *testing.T) {
	svc := newTestSubscriptionService()
	now := time.Now()
	dailyStart := now.Add(-12 * time.Hour)

	sub := &UserSubscription{
		ID:               1,
		ExpiresAt:        now.Add(10 * 24 * time.Hour),
		DailyUsageUSD:    3.0,
		DailyWindowStart: ptrTime(dailyStart),
	}
	group := &Group{
		Name:          "Pro",
		DailyLimitUSD: ptrFloat64(10.0),
	}

	progress := svc.calculateProgress(sub, group)

	require.NotNil(t, progress.Daily, "有日限额和窗口时 Daily 不应为 nil")
	assert.Equal(t, 10.0, progress.Daily.LimitUSD)
	assert.Equal(t, 3.0, progress.Daily.UsedUSD)
	assert.Equal(t, 7.0, progress.Daily.RemainingUSD)
	assert.Equal(t, 30.0, progress.Daily.Percentage)
	assert.Equal(t, dailyStart, progress.Daily.WindowStart)
}

func TestCalculateProgress_DailyCardUsesPurchaseAnchoredDailyResetTime(t *testing.T) {
	svc := newTestSubscriptionService()
	startsAt := time.Now().Add(-12 * time.Hour)
	dailyStart := startsAt
	expiresAt := startsAt.Add(24 * time.Hour)

	sub := &UserSubscription{
		ID:               1,
		StartsAt:         startsAt,
		ExpiresAt:        expiresAt,
		DailyUsageUSD:    3.0,
		DailyWindowStart: ptrTime(dailyStart),
	}
	group := &Group{
		Name:          "Daily",
		DailyLimitUSD: ptrFloat64(10.0),
	}

	progress := svc.calculateProgress(sub, group)

	require.NotNil(t, progress.Daily, "日卡有日限额和窗口时 Daily 不应为 nil")
	assert.Equal(t, dailyStart.Add(24*time.Hour), progress.Daily.ResetsAt, "日卡应按购买时间后的 24 小时刷新")
	assert.Equal(t, expiresAt, progress.Daily.ResetsAt, "1 日有效期下，日额度刷新时间自然等于订阅过期时间")
}

func TestCalculateProgress_WeeklyUsage(t *testing.T) {
	svc := newTestSubscriptionService()
	now := time.Now()
	weeklyStart := now.Add(-3 * 24 * time.Hour)

	sub := &UserSubscription{
		ID:                1,
		ExpiresAt:         now.Add(10 * 24 * time.Hour),
		WeeklyUsageUSD:    25.0,
		WeeklyWindowStart: ptrTime(weeklyStart),
	}
	group := &Group{
		Name:           "Pro",
		WeeklyLimitUSD: ptrFloat64(50.0),
	}

	progress := svc.calculateProgress(sub, group)

	require.NotNil(t, progress.Weekly, "有周限额和窗口时 Weekly 不应为 nil")
	assert.Equal(t, 50.0, progress.Weekly.LimitUSD)
	assert.Equal(t, 25.0, progress.Weekly.UsedUSD)
	assert.Equal(t, 25.0, progress.Weekly.RemainingUSD)
	assert.Equal(t, 50.0, progress.Weekly.Percentage)
}

func TestCalculateProgress_WeeklyResetCappedBySubscriptionExpiry(t *testing.T) {
	svc := newTestSubscriptionService()
	now := time.Now()
	weeklyStart := now.Add(-2 * 24 * time.Hour)
	expiresAt := now.Add(2 * time.Minute)

	sub := &UserSubscription{
		ID:                1,
		ExpiresAt:         expiresAt,
		WeeklyUsageUSD:    50.0,
		WeeklyWindowStart: ptrTime(weeklyStart),
	}
	group := &Group{
		Name:           "Weekly",
		WeeklyLimitUSD: ptrFloat64(50.0),
	}

	progress := svc.calculateProgress(sub, group)

	require.NotNil(t, progress.Weekly)
	assert.Equal(t, expiresAt, progress.Weekly.ResetsAt, "订阅先过期时，周额度结束时间应为订阅过期时间")
	assert.LessOrEqual(t, progress.Weekly.ResetsInSeconds, int64(120))
	assert.GreaterOrEqual(t, progress.Weekly.ResetsInSeconds, int64(0))
}

func TestCalculateProgress_LegacyMidnightDailyWindowDisplaysPurchaseAnchoredReset(t *testing.T) {
	now := time.Now().Truncate(time.Second)
	anchor := now.Add(-18 * time.Hour)
	legacyWindowStart := time.Date(anchor.Year(), anchor.Month(), anchor.Day(), 0, 0, 0, 0, anchor.Location())
	expiresAt := anchor.AddDate(0, 0, 7)

	sub := &UserSubscription{
		ID:               1,
		StartsAt:         anchor,
		ExpiresAt:        expiresAt,
		DailyUsageUSD:    42.0,
		DailyWindowStart: ptrTime(legacyWindowStart),
	}
	group := &Group{
		Name:          "Weekly",
		DailyLimitUSD: ptrFloat64(100.0),
	}
	svc := newTestSubscriptionService()

	progress := svc.calculateProgress(sub, group)

	require.NotNil(t, progress.Daily)
	assert.Equal(t, anchor, progress.Daily.WindowStart)
	assert.Equal(t, anchor.Add(24*time.Hour), progress.Daily.ResetsAt)
	assert.NotEqual(t, legacyWindowStart.Add(24*time.Hour), progress.Daily.ResetsAt)
}

func TestCalculateProgress_LegacyMidnightDailyWindowRollsForwardWhenMaintenanceIsPending(t *testing.T) {
	now := time.Now().Truncate(time.Second)
	anchor := now.Add(-3 * 24 * time.Hour)
	anchor = time.Date(anchor.Year(), anchor.Month(), anchor.Day(), 14, 22, 32, 0, anchor.Location())
	legacyWindowStart := time.Date(anchor.Year(), anchor.Month(), anchor.Day(), 0, 0, 0, 0, anchor.Location())
	expiresAt := anchor.AddDate(0, 0, 7)
	expectedWindowStart := rollingWindowStart(anchor, 24*time.Hour, now)

	sub := &UserSubscription{
		ID:               1,
		StartsAt:         anchor,
		ExpiresAt:        expiresAt,
		DailyUsageUSD:    99.0,
		DailyWindowStart: ptrTime(legacyWindowStart),
	}
	group := &Group{
		Name:          "Weekly",
		DailyLimitUSD: ptrFloat64(100.0),
	}
	svc := newTestSubscriptionService()

	progress := svc.calculateProgress(sub, group)

	require.NotNil(t, progress.Daily)
	assert.Equal(t, expectedWindowStart, progress.Daily.WindowStart)
	assert.Equal(t, expectedWindowStart.Add(24*time.Hour), progress.Daily.ResetsAt)
	assert.Equal(t, 0.0, progress.Daily.UsedUSD)
	assert.NotEqual(t, legacyWindowStart.Add(24*time.Hour), progress.Daily.ResetsAt)
}

func TestCalculateProgress_LegacyMidnightWeeklyWindowDisplaysPurchaseAnchoredReset(t *testing.T) {
	now := time.Now().Truncate(time.Second)
	anchor := now.Add(-6*24*time.Hour - 10*time.Hour)
	anchor = time.Date(anchor.Year(), anchor.Month(), anchor.Day(), 14, 22, 32, 0, anchor.Location())
	legacyWindowStart := time.Date(anchor.Year(), anchor.Month(), anchor.Day(), 0, 0, 0, 0, anchor.Location())
	expiresAt := anchor.AddDate(0, 0, 7)

	sub := &UserSubscription{
		ID:                1,
		StartsAt:          anchor,
		ExpiresAt:         expiresAt,
		WeeklyUsageUSD:    297.16,
		WeeklyWindowStart: ptrTime(legacyWindowStart),
	}
	group := &Group{
		Name:           "Weekly",
		WeeklyLimitUSD: ptrFloat64(500.0),
	}
	svc := newTestSubscriptionService()

	progress := svc.calculateProgress(sub, group)

	require.NotNil(t, progress.Weekly)
	assert.Equal(t, anchor, progress.Weekly.WindowStart)
	assert.Equal(t, expiresAt, progress.Weekly.ResetsAt)
	assert.NotEqual(t, legacyWindowStart.Add(7*24*time.Hour), progress.Weekly.ResetsAt)
}

func TestCalculateProgress_ExpiredWeeklyWindowDisplaysFreshWindowBeforeMaintenance(t *testing.T) {
	now := time.Now().Truncate(time.Second)
	weeklyStart := now.Add(-8 * 24 * time.Hour)
	expiresAt := now.Add(10 * 24 * time.Hour)
	expectedWindowStart := rollingWindowStart(weeklyStart, 7*24*time.Hour, now)

	sub := &UserSubscription{
		ID:                1,
		StartsAt:          weeklyStart,
		ExpiresAt:         expiresAt,
		WeeklyUsageUSD:    50.0,
		WeeklyWindowStart: ptrTime(weeklyStart),
	}
	group := &Group{
		Name:           "Weekly",
		WeeklyLimitUSD: ptrFloat64(50.0),
	}
	svc := newTestSubscriptionService()

	progress := svc.calculateProgress(sub, group)

	require.NotNil(t, progress.Weekly)
	assert.Equal(t, expectedWindowStart, progress.Weekly.WindowStart)
	assert.Equal(t, expectedWindowStart.Add(7*24*time.Hour), progress.Weekly.ResetsAt)
	assert.Equal(t, 0.0, progress.Weekly.UsedUSD)
	assert.Equal(t, 50.0, sub.WeeklyUsageUSD, "展示修正不应修改原始订阅对象的用量")
}

func TestCalculateProgress_MonthlyUsage(t *testing.T) {
	svc := newTestSubscriptionService()
	now := time.Now()
	monthlyStart := now.Add(-15 * 24 * time.Hour)

	sub := &UserSubscription{
		ID:                 1,
		ExpiresAt:          now.Add(10 * 24 * time.Hour),
		MonthlyUsageUSD:    80.0,
		MonthlyWindowStart: ptrTime(monthlyStart),
	}
	group := &Group{
		Name:            "Enterprise",
		MonthlyLimitUSD: ptrFloat64(100.0),
	}

	progress := svc.calculateProgress(sub, group)

	require.NotNil(t, progress.Monthly, "有月限额和窗口时 Monthly 不应为 nil")
	assert.Equal(t, 100.0, progress.Monthly.LimitUSD)
	assert.Equal(t, 80.0, progress.Monthly.UsedUSD)
	assert.Equal(t, 20.0, progress.Monthly.RemainingUSD)
	assert.Equal(t, 80.0, progress.Monthly.Percentage)
}

func TestCalculateProgress_MonthlyResetCappedBySubscriptionExpiry(t *testing.T) {
	svc := newTestSubscriptionService()
	now := time.Now()
	monthlyStart := now.Add(-10 * 24 * time.Hour)
	expiresAt := now.Add(2 * time.Minute)

	sub := &UserSubscription{
		ID:                 1,
		ExpiresAt:          expiresAt,
		MonthlyUsageUSD:    100.0,
		MonthlyWindowStart: ptrTime(monthlyStart),
	}
	group := &Group{
		Name:            "Monthly",
		MonthlyLimitUSD: ptrFloat64(100.0),
	}

	progress := svc.calculateProgress(sub, group)

	require.NotNil(t, progress.Monthly)
	assert.Equal(t, expiresAt, progress.Monthly.ResetsAt, "订阅先过期时，月额度结束时间应为订阅过期时间")
	assert.LessOrEqual(t, progress.Monthly.ResetsInSeconds, int64(120))
	assert.GreaterOrEqual(t, progress.Monthly.ResetsInSeconds, int64(0))
}

func TestCalculateProgress_BackfillsMissingWindowWhenUsageExists(t *testing.T) {
	svc := newTestSubscriptionService()
	now := time.Now()
	startsAt := now.Add(-2 * 24 * time.Hour)

	sub := &UserSubscription{
		ID:             1,
		StartsAt:       startsAt,
		ExpiresAt:      startsAt.AddDate(0, 0, 7),
		WeeklyUsageUSD: 25,
	}
	group := &Group{
		Name:           "Weekly",
		WeeklyLimitUSD: ptrFloat64(50.0),
	}

	progress := svc.calculateProgress(sub, group)

	require.NotNil(t, progress.Weekly)
	assert.Equal(t, startsAt, progress.Weekly.WindowStart)
	assert.Equal(t, startsAt, *sub.WeeklyWindowStart)
	assert.Equal(t, 50.0, progress.Weekly.Percentage)
}

func TestCalculateProgress_OverLimit_ClampedTo100Percent(t *testing.T) {
	svc := newTestSubscriptionService()
	now := time.Now()

	sub := &UserSubscription{
		ID:               1,
		ExpiresAt:        now.Add(10 * 24 * time.Hour),
		DailyUsageUSD:    15.0, // 超过限额
		DailyWindowStart: ptrTime(now.Add(-1 * time.Hour)),
	}
	group := &Group{
		Name:          "Pro",
		DailyLimitUSD: ptrFloat64(10.0),
	}

	progress := svc.calculateProgress(sub, group)

	require.NotNil(t, progress.Daily)
	assert.Equal(t, 100.0, progress.Daily.Percentage, "超额使用应被截断为 100%")
	assert.Equal(t, 0.0, progress.Daily.RemainingUSD, "超额使用时剩余应为 0")
}

func TestCalculateProgress_NoWindowStart_NoProgress(t *testing.T) {
	svc := newTestSubscriptionService()
	now := time.Now()

	// 有限额但无窗口起始时间（订阅未激活）
	sub := &UserSubscription{
		ID:             1,
		ExpiresAt:      now.Add(10 * 24 * time.Hour),
		DailyUsageUSD:  0,
		WeeklyUsageUSD: 0,
	}
	group := &Group{
		Name:           "Pro",
		DailyLimitUSD:  ptrFloat64(10.0),
		WeeklyLimitUSD: ptrFloat64(50.0),
	}

	progress := svc.calculateProgress(sub, group)

	assert.Nil(t, progress.Daily, "无 DailyWindowStart 时 Daily 应为 nil")
	assert.Nil(t, progress.Weekly, "无 WeeklyWindowStart 时 Weekly 应为 nil")
}

func TestCalculateProgress_AllLimits(t *testing.T) {
	svc := newTestSubscriptionService()
	now := time.Now()

	sub := &UserSubscription{
		ID:                 1,
		ExpiresAt:          now.Add(10 * 24 * time.Hour),
		DailyUsageUSD:      5.0,
		WeeklyUsageUSD:     20.0,
		MonthlyUsageUSD:    60.0,
		DailyWindowStart:   ptrTime(now.Add(-6 * time.Hour)),
		WeeklyWindowStart:  ptrTime(now.Add(-3 * 24 * time.Hour)),
		MonthlyWindowStart: ptrTime(now.Add(-15 * 24 * time.Hour)),
	}
	group := &Group{
		Name:            "Full",
		DailyLimitUSD:   ptrFloat64(10.0),
		WeeklyLimitUSD:  ptrFloat64(50.0),
		MonthlyLimitUSD: ptrFloat64(100.0),
	}

	progress := svc.calculateProgress(sub, group)

	require.NotNil(t, progress.Daily)
	require.NotNil(t, progress.Weekly)
	require.NotNil(t, progress.Monthly)

	assert.Equal(t, 50.0, progress.Daily.Percentage)
	assert.Equal(t, 40.0, progress.Weekly.Percentage)
	assert.Equal(t, 60.0, progress.Monthly.Percentage)
}

func TestCalculateProgress_ExpiredSubscription(t *testing.T) {
	svc := newTestSubscriptionService()

	sub := &UserSubscription{
		ID:        1,
		ExpiresAt: time.Now().Add(-24 * time.Hour), // 已过期
	}
	group := &Group{Name: "Expired"}

	progress := svc.calculateProgress(sub, group)

	assert.Equal(t, 0, progress.ExpiresInDays, "过期订阅的剩余天数应为 0")
}

func TestCalculateProgress_ResetsInSeconds_NotNegative(t *testing.T) {
	svc := newTestSubscriptionService()
	// 使用过去的窗口起始时间，使得重置时间已过
	pastStart := time.Now().Add(-48 * time.Hour)

	sub := &UserSubscription{
		ID:               1,
		ExpiresAt:        time.Now().Add(10 * 24 * time.Hour),
		DailyUsageUSD:    1.0,
		DailyWindowStart: ptrTime(pastStart),
	}
	group := &Group{
		Name:          "Test",
		DailyLimitUSD: ptrFloat64(10.0),
	}

	progress := svc.calculateProgress(sub, group)

	require.NotNil(t, progress.Daily)
	assert.GreaterOrEqual(t, progress.Daily.ResetsInSeconds, int64(0),
		"ResetsInSeconds 不应为负数")
}
