package service

import (
	"math"
	"testing"
	"time"
)

func TestApplyGlobalDiscountToCost(t *testing.T) {
	now := time.Now().UTC()
	cost := &CostBreakdown{ActualCost: 10}

	ApplyGlobalDiscountToCost(cost, GlobalDiscountRuntime{
		Enabled:      true,
		Active:       true,
		DiscountRate: 0.8,
		StartsAt:     discountTestTimePtr(now.Add(-time.Hour)),
		EndsAt:       discountTestTimePtr(now.Add(time.Hour)),
	})

	if cost.ActualCost != 8 {
		t.Fatalf("ActualCost = %v, want 8", cost.ActualCost)
	}
	if math.Abs(cost.DiscountAmount-2) > 1e-9 {
		t.Fatalf("DiscountAmount = %v, want 2", cost.DiscountAmount)
	}
	if cost.DiscountRate != 0.8 {
		t.Fatalf("DiscountRate = %v, want 0.8", cost.DiscountRate)
	}
}

func TestApplyGlobalDiscountToCostDefaultsInactiveRate(t *testing.T) {
	cost := &CostBreakdown{ActualCost: 10}

	ApplyGlobalDiscountToCost(cost, GlobalDiscountRuntime{
		Enabled:      true,
		Active:       false,
		DiscountRate: 0.8,
	})

	if cost.ActualCost != 10 {
		t.Fatalf("ActualCost = %v, want 10", cost.ActualCost)
	}
	if cost.DiscountAmount != 0 {
		t.Fatalf("DiscountAmount = %v, want 0", cost.DiscountAmount)
	}
	if cost.DiscountRate != 1 {
		t.Fatalf("DiscountRate = %v, want 1", cost.DiscountRate)
	}
}

func TestGlobalDiscountRuntimeDailySchedule(t *testing.T) {
	runtime := globalDiscountRuntime(GlobalDiscountSettings{
		Enabled:          true,
		DiscountRate:     0.8,
		ScheduleType:     "daily",
		RecurringStartAt: "09:00",
		RecurringEndAt:   "18:00",
	}, time.Date(2026, 5, 28, 10, 0, 0, 0, time.Local))

	if !runtime.Active {
		t.Fatalf("Active = false, want true")
	}
	if runtime.ScheduleType != "daily" {
		t.Fatalf("ScheduleType = %q, want daily", runtime.ScheduleType)
	}
}

func TestGlobalDiscountRuntimeRecurringOvernight(t *testing.T) {
	runtime := globalDiscountRuntime(GlobalDiscountSettings{
		Enabled:          true,
		DiscountRate:     0.8,
		ScheduleType:     "daily",
		RecurringStartAt: "22:00",
		RecurringEndAt:   "02:00",
	}, time.Date(2026, 5, 29, 1, 0, 0, 0, time.Local))

	if !runtime.Active {
		t.Fatalf("Active = false, want true")
	}
}

func TestGlobalDiscountRuntimeWeeklySchedule(t *testing.T) {
	thursday := time.Date(2026, 5, 28, 10, 0, 0, 0, time.Local)
	runtime := globalDiscountRuntime(GlobalDiscountSettings{
		Enabled:          true,
		DiscountRate:     0.8,
		ScheduleType:     "weekly",
		RecurringStartAt: "09:00",
		RecurringEndAt:   "18:00",
		Weekdays:         []int{4},
	}, thursday)
	if !runtime.Active {
		t.Fatalf("Active = false, want true")
	}

	fridayRuntime := globalDiscountRuntime(GlobalDiscountSettings{
		Enabled:          true,
		DiscountRate:     0.8,
		ScheduleType:     "weekly",
		RecurringStartAt: "09:00",
		RecurringEndAt:   "18:00",
		Weekdays:         []int{4},
	}, thursday.AddDate(0, 0, 1))
	if fridayRuntime.Active {
		t.Fatalf("Friday Active = true, want false")
	}
}

func TestGlobalDiscountRulesAllowWeekendsAndWeekdayNights(t *testing.T) {
	_, err := normalizeGlobalDiscountSettings(GlobalDiscountSettings{
		Enabled: true,
		Rules: []GlobalDiscountRule{
			{
				ID:               "weekends",
				Enabled:          true,
				DiscountRate:     0.8,
				ScheduleType:     "weekly",
				RecurringStartAt: "00:00",
				RecurringEndAt:   "23:59",
				Weekdays:         []int{6, 7},
				Label:            "周末折扣",
			},
			{
				ID:               "weekday-nights",
				Enabled:          true,
				DiscountRate:     0.9,
				ScheduleType:     "weekly",
				RecurringStartAt: "22:00",
				RecurringEndAt:   "03:00",
				Weekdays:         []int{1, 2, 3, 4, 5},
				Label:            "工作日夜间",
			},
		},
	})
	if err != nil {
		t.Fatalf("normalizeGlobalDiscountSettings returned error: %v", err)
	}
}

func TestGlobalDiscountRulesRejectOverlap(t *testing.T) {
	_, err := normalizeGlobalDiscountSettings(GlobalDiscountSettings{
		Enabled: true,
		Rules: []GlobalDiscountRule{
			{
				ID:               "night-a",
				Enabled:          true,
				DiscountRate:     0.8,
				ScheduleType:     "daily",
				RecurringStartAt: "22:00",
				RecurringEndAt:   "03:00",
			},
			{
				ID:               "night-b",
				Enabled:          true,
				DiscountRate:     0.9,
				ScheduleType:     "weekly",
				RecurringStartAt: "23:00",
				RecurringEndAt:   "23:30",
				Weekdays:         []int{1},
			},
		},
	})
	if err == nil {
		t.Fatalf("normalizeGlobalDiscountSettings error = nil, want overlap error")
	}
}

func TestGlobalDiscountRuntimeUsesMatchingRule(t *testing.T) {
	runtime := globalDiscountRuntime(GlobalDiscountSettings{
		Enabled: true,
		Rules: []GlobalDiscountRule{
			{
				ID:               "weekends",
				Enabled:          true,
				DiscountRate:     0.8,
				ScheduleType:     "weekly",
				RecurringStartAt: "00:00",
				RecurringEndAt:   "23:59",
				Weekdays:         []int{6, 7},
			},
			{
				ID:               "weekday-nights",
				Enabled:          true,
				DiscountRate:     0.9,
				ScheduleType:     "weekly",
				RecurringStartAt: "22:00",
				RecurringEndAt:   "03:00",
				Weekdays:         []int{1, 2, 3, 4, 5},
			},
		},
	}, time.Date(2026, 5, 28, 23, 0, 0, 0, time.Local))
	if !runtime.Active || runtime.RuleID != "weekday-nights" || runtime.DiscountRate != 0.9 {
		t.Fatalf("runtime = %+v, want weekday-nights active", runtime)
	}
}

func discountTestTimePtr(t time.Time) *time.Time {
	return &t
}
