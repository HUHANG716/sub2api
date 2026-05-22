package service

import (
	"time"
)

// SubscriptionCacheData represents cached subscription data
type SubscriptionCacheData struct {
	Status          string
	ExpiresAt       time.Time
	DailyUsage      float64
	WeeklyUsage     float64
	MonthlyUsage    float64
	PeriodID        int64
	PeriodStartsAt  time.Time
	PeriodExpiresAt time.Time
	PeriodUsage     float64
	PeriodLimit     *float64
	Version         int64
}
