package service

import "time"

const subscriptionDayDuration = 24 * time.Hour

type UserSubscription struct {
	ID      int64
	UserID  int64
	GroupID int64

	StartsAt  time.Time
	ExpiresAt time.Time
	Status    string

	DailyWindowStart   *time.Time
	WeeklyWindowStart  *time.Time
	MonthlyWindowStart *time.Time

	DailyUsageUSD   float64
	WeeklyUsageUSD  float64
	MonthlyUsageUSD float64

	AssignedBy *int64
	AssignedAt time.Time
	Notes      string

	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt *time.Time

	User           *User
	Group          *Group
	AssignedByUser *User
}

func (s *UserSubscription) IsActive() bool {
	return s.Status == SubscriptionStatusActive && time.Now().Before(s.ExpiresAt)
}

func (s *UserSubscription) IsExpired() bool {
	return s.IsExpiredAt(time.Now())
}

func (s *UserSubscription) IsExpiredAt(now time.Time) bool {
	return now.After(s.ExpiresAt)
}

func (s *UserSubscription) DaysRemaining() int {
	return s.daysRemainingAt(time.Now())
}

func (s *UserSubscription) daysRemainingAt(now time.Time) int {
	remaining := s.ExpiresAt.Sub(now)
	if remaining <= 0 {
		return 0
	}

	days := int(remaining / subscriptionDayDuration)
	if remaining%subscriptionDayDuration != 0 {
		days++
	}
	return days
}

func (s *UserSubscription) IsWindowActivated() bool {
	return s.DailyWindowStart != nil || s.WeeklyWindowStart != nil || s.MonthlyWindowStart != nil
}

func (s *UserSubscription) NeedsDailyReset() bool {
	return s.NeedsDailyResetAt(time.Now())
}

func (s *UserSubscription) NeedsDailyResetAt(now time.Time) bool {
	if s.HasOneTimeDailyQuota() {
		return false
	}
	return s.needsDailyResetAt(now, s.DailyWindowStart)
}

func (s *UserSubscription) needsDailyResetAt(now time.Time, windowStart *time.Time) bool {
	if windowStart == nil {
		return false
	}
	return !now.Before(windowStart.Add(24 * time.Hour))
}

func (s *UserSubscription) NeedsWeeklyReset() bool {
	return s.NeedsWeeklyResetAt(time.Now())
}

func (s *UserSubscription) NeedsWeeklyResetAt(now time.Time) bool {
	return s.needsWeeklyResetAt(now, s.WeeklyWindowStart)
}

func (s *UserSubscription) needsWeeklyResetAt(now time.Time, windowStart *time.Time) bool {
	if windowStart == nil {
		return false
	}
	return !now.Before(windowStart.Add(7 * 24 * time.Hour))
}

func (s *UserSubscription) NeedsMonthlyReset() bool {
	return s.NeedsMonthlyResetAt(time.Now())
}

func (s *UserSubscription) NeedsMonthlyResetAt(now time.Time) bool {
	return s.needsMonthlyResetAt(now, s.MonthlyWindowStart)
}

func (s *UserSubscription) needsMonthlyResetAt(now time.Time, windowStart *time.Time) bool {
	if windowStart == nil {
		return false
	}
	return !now.Before(windowStart.Add(30 * 24 * time.Hour))
}

func (s *UserSubscription) DailyResetTime() *time.Time {
	if s.DailyWindowStart == nil {
		return nil
	}
	if s.HasOneTimeDailyQuota() {
		t := s.ExpiresAt
		return &t
	}
	t := s.DailyWindowStart.Add(24 * time.Hour)
	return &t
}

func (s *UserSubscription) WeeklyResetTime() *time.Time {
	if s.WeeklyWindowStart == nil {
		return nil
	}
	t := s.WeeklyWindowStart.Add(7 * 24 * time.Hour)
	return &t
}

func (s *UserSubscription) MonthlyResetTime() *time.Time {
	if s.MonthlyWindowStart == nil {
		return nil
	}
	t := s.MonthlyWindowStart.Add(30 * 24 * time.Hour)
	return &t
}

func (s *UserSubscription) HasOneTimeDailyQuota() bool {
	if s.StartsAt.IsZero() || s.ExpiresAt.IsZero() || !s.ExpiresAt.After(s.StartsAt) {
		return false
	}
	return !s.ExpiresAt.After(s.StartsAt.Add(24 * time.Hour))
}

func (s *UserSubscription) DisplayDailyWindowStartAt(now time.Time) *time.Time {
	windowStart, _ := s.displayWindowStartAt(s.DailyWindowStart, 24*time.Hour, now)
	return windowStart
}

func (s *UserSubscription) DisplayWeeklyWindowStartAt(now time.Time) *time.Time {
	windowStart, _ := s.displayWindowStartAt(s.WeeklyWindowStart, 7*24*time.Hour, now)
	return windowStart
}

func (s *UserSubscription) DisplayMonthlyWindowStartAt(now time.Time) *time.Time {
	windowStart, _ := s.displayWindowStartAt(s.MonthlyWindowStart, 30*24*time.Hour, now)
	return windowStart
}

func (s *UserSubscription) displayWindowStartAt(windowStart *time.Time, windowSize time.Duration, now time.Time) (*time.Time, bool) {
	if windowStart == nil || windowSize <= 0 {
		return nil, false
	}

	start := *windowStart
	if windowSize == 24*time.Hour && s.HasOneTimeDailyQuota() {
		if !s.StartsAt.IsZero() {
			start = s.StartsAt
		}
		return &start, false
	}

	if isLegacyMidnightWindow(s.StartsAt, start) {
		start = s.StartsAt
	}
	if now.Before(start.Add(windowSize)) {
		return &start, false
	}

	rolled := rollingWindowStart(start, windowSize, now)
	return &rolled, true
}

func isLegacyMidnightWindow(startsAt, windowStart time.Time) bool {
	if startsAt.IsZero() || windowStart.IsZero() {
		return false
	}
	return windowStart.Equal(startOfDay(startsAt)) && !startsAt.Equal(startOfDay(startsAt))
}

func rollingWindowStart(windowStart time.Time, windowSize time.Duration, now time.Time) time.Time {
	if windowSize <= 0 || windowStart.IsZero() || now.Before(windowStart.Add(windowSize)) {
		return windowStart
	}
	elapsedWindows := int64(now.Sub(windowStart) / windowSize)
	if elapsedWindows < 1 {
		elapsedWindows = 1
	}
	return windowStart.Add(time.Duration(elapsedWindows) * windowSize)
}

func (s *UserSubscription) CheckDailyLimit(group *Group, additionalCost float64) bool {
	if !group.HasDailyLimit() {
		return true
	}
	return s.DailyUsageUSD+additionalCost <= *group.DailyLimitUSD
}

func (s *UserSubscription) CheckWeeklyLimit(group *Group, additionalCost float64) bool {
	if !group.HasWeeklyLimit() {
		return true
	}
	return s.WeeklyUsageUSD+additionalCost <= *group.WeeklyLimitUSD
}

func (s *UserSubscription) CheckMonthlyLimit(group *Group, additionalCost float64) bool {
	if !group.HasMonthlyLimit() {
		return true
	}
	return s.MonthlyUsageUSD+additionalCost <= *group.MonthlyLimitUSD
}

func (s *UserSubscription) CheckAllLimits(group *Group, additionalCost float64) (daily, weekly, monthly bool) {
	daily = s.CheckDailyLimit(group, additionalCost)
	weekly = s.CheckWeeklyLimit(group, additionalCost)
	monthly = s.CheckMonthlyLimit(group, additionalCost)
	return
}
