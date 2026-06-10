package service

import (
	"math"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/pkg/timezone"
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

func TestApplyGlobalDiscountToCostUsesActualCost(t *testing.T) {
	cost := &CostBreakdown{
		TotalCost:  0.12,
		ActualCost: 0.12,
	}

	ApplyGlobalDiscountToCost(cost, GlobalDiscountRuntime{
		Enabled:      true,
		Active:       true,
		DiscountRate: 0.5,
	})

	if math.Abs(cost.ActualCost-0.06) > 1e-12 {
		t.Fatalf("ActualCost = %v, want 0.06", cost.ActualCost)
	}
	if math.Abs(cost.TotalCost-0.12) > 1e-12 {
		t.Fatalf("TotalCost = %v, want 0.12", cost.TotalCost)
	}
	if math.Abs(cost.DiscountAmount-0.06) > 1e-12 {
		t.Fatalf("DiscountAmount = %v, want 0.06", cost.DiscountAmount)
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

func TestGlobalDiscountRuntimeExposesFutureOnceWindow(t *testing.T) {
	now := time.Date(2026, 6, 10, 10, 0, 0, 0, time.UTC)
	start := now.Add(30 * time.Minute)
	end := now.Add(90 * time.Minute)

	runtime := globalDiscountRuntime(GlobalDiscountSettings{
		Enabled: true,
		Rules: []GlobalDiscountRule{{
			Enabled:      true,
			DiscountRate: 0.8,
			ScheduleType: "once",
			StartsAt:     start.Format(time.RFC3339),
			EndsAt:       end.Format(time.RFC3339),
		}},
	}, now)

	if runtime.Active {
		t.Fatalf("Active = true, want false before the window")
	}
	if runtime.StartsAt == nil || !runtime.StartsAt.Equal(start) {
		t.Fatalf("StartsAt = %v, want %v", runtime.StartsAt, start)
	}
	if runtime.EndsAt == nil || !runtime.EndsAt.Equal(end) {
		t.Fatalf("EndsAt = %v, want %v", runtime.EndsAt, end)
	}
}

func TestGlobalDiscountRuntimeExposesFutureDailyWindow(t *testing.T) {
	loc := timezone.Location()
	now := time.Date(2026, 6, 10, 10, 0, 0, 0, loc)

	runtime := globalDiscountRuntime(GlobalDiscountSettings{
		Enabled: true,
		Rules: []GlobalDiscountRule{{
			Enabled:          true,
			DiscountRate:     0.8,
			ScheduleType:     "daily",
			RecurringStartAt: "11:00",
			RecurringEndAt:   "12:00",
		}},
	}, now)

	wantStart := time.Date(2026, 6, 10, 11, 0, 0, 0, loc).UTC()
	wantEnd := time.Date(2026, 6, 10, 12, 0, 0, 0, loc).UTC()
	if runtime.Active {
		t.Fatalf("Active = true, want false before the daily window")
	}
	if runtime.StartsAt == nil || !runtime.StartsAt.Equal(wantStart) {
		t.Fatalf("StartsAt = %v, want %v", runtime.StartsAt, wantStart)
	}
	if runtime.EndsAt == nil || !runtime.EndsAt.Equal(wantEnd) {
		t.Fatalf("EndsAt = %v, want %v", runtime.EndsAt, wantEnd)
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

func TestGlobalDiscountRuntimeDailyScheduleExposesCurrentWindowEnd(t *testing.T) {
	loc, err := time.LoadLocation("Asia/Shanghai")
	if err != nil {
		t.Fatalf("load location: %v", err)
	}
	if err := timezone.Init("Asia/Shanghai"); err != nil {
		t.Fatalf("init timezone: %v", err)
	}
	t.Cleanup(func() { _ = timezone.Init("UTC") })

	runtime := globalDiscountRuntime(GlobalDiscountSettings{
		Enabled:          true,
		DiscountRate:     0.8,
		ScheduleType:     "daily",
		RecurringStartAt: "09:00",
		RecurringEndAt:   "18:00",
	}, time.Date(2026, 6, 2, 10, 30, 0, 0, loc))

	if !runtime.Active {
		t.Fatalf("Active = false, want true")
	}
	if runtime.EndsAt == nil {
		t.Fatalf("EndsAt = nil, want current recurring window end")
	}
	want := time.Date(2026, 6, 2, 18, 0, 0, 0, loc).UTC()
	if !runtime.EndsAt.Equal(want) {
		t.Fatalf("EndsAt = %v, want %v", runtime.EndsAt, want)
	}
}

func TestGlobalDiscountRuntimeWeeklyOvernightExposesCurrentWindowEnd(t *testing.T) {
	loc, err := time.LoadLocation("Asia/Shanghai")
	if err != nil {
		t.Fatalf("load location: %v", err)
	}
	if err := timezone.Init("Asia/Shanghai"); err != nil {
		t.Fatalf("init timezone: %v", err)
	}
	t.Cleanup(func() { _ = timezone.Init("UTC") })

	settings := GlobalDiscountSettings{
		Enabled: true,
		Rules: []GlobalDiscountRule{
			{
				ID:               "weekday-nights",
				Enabled:          true,
				DiscountRate:     0.9,
				ScheduleType:     "weekly",
				RecurringStartAt: "22:00",
				RecurringEndAt:   "08:00",
				Weekdays:         []int{1, 2, 3, 4, 5},
			},
		},
	}

	runtime := globalDiscountRuntime(settings, time.Date(2026, 6, 2, 7, 59, 0, 0, loc))
	if !runtime.Active {
		t.Fatalf("Active = false, want true")
	}
	if runtime.EndsAt == nil {
		t.Fatalf("EndsAt = nil, want current recurring window end")
	}
	want := time.Date(2026, 6, 2, 8, 0, 0, 0, loc).UTC()
	if !runtime.EndsAt.Equal(want) {
		t.Fatalf("EndsAt = %v, want %v", runtime.EndsAt, want)
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

func TestGlobalDiscountRulesAllowOverlapAndRuntimeUsesLowestRate(t *testing.T) {
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
	if err != nil {
		t.Fatalf("normalizeGlobalDiscountSettings returned error: %v", err)
	}

	runtime := globalDiscountRuntime(GlobalDiscountSettings{
		Enabled: true,
		Rules: []GlobalDiscountRule{
			{
				ID:               "weekends",
				Enabled:          true,
				DiscountRate:     0.8,
				ScheduleType:     "daily",
				RecurringStartAt: "22:00",
				RecurringEndAt:   "03:00",
			},
			{
				ID:               "weekday-nights",
				Enabled:          true,
				DiscountRate:     0.9,
				ScheduleType:     "weekly",
				RecurringStartAt: "23:00",
				RecurringEndAt:   "23:30",
				Weekdays:         []int{4},
			},
		},
	}, time.Date(2026, 5, 28, 23, 0, 0, 0, time.Local))
	if !runtime.Active || runtime.RuleID != "weekends" || runtime.DiscountRate != 0.8 {
		t.Fatalf("runtime = %+v, want lowest-rate rule active", runtime)
	}
}

func TestGlobalDiscountRuntimeWeeklyOvernightUsesSelectedDayAsStartDay(t *testing.T) {
	loc, err := time.LoadLocation("Asia/Shanghai")
	if err != nil {
		t.Fatalf("load location: %v", err)
	}
	if err := timezone.Init("Asia/Shanghai"); err != nil {
		t.Fatalf("init timezone: %v", err)
	}
	t.Cleanup(func() { _ = timezone.Init("UTC") })
	settings := GlobalDiscountSettings{
		Enabled: true,
		Rules: []GlobalDiscountRule{
			{
				ID:               "weekday-nights",
				Enabled:          true,
				DiscountRate:     0.9,
				ScheduleType:     "weekly",
				RecurringStartAt: "22:00",
				RecurringEndAt:   "08:00",
				Weekdays:         []int{1, 2, 3, 4, 5},
			},
		},
	}

	mondayMorning := globalDiscountRuntime(settings, time.Date(2026, 6, 1, 0, 30, 0, 0, loc))
	if mondayMorning.Active {
		t.Fatalf("Monday 00:30 Active = true, want false because Sunday was not selected")
	}

	mondayNight := globalDiscountRuntime(settings, time.Date(2026, 6, 1, 22, 30, 0, 0, loc))
	if !mondayNight.Active {
		t.Fatalf("Monday 22:30 Active = false, want true")
	}

	tuesdayMorning := globalDiscountRuntime(settings, time.Date(2026, 6, 2, 7, 59, 0, 0, loc))
	if !tuesdayMorning.Active {
		t.Fatalf("Tuesday 07:59 Active = false, want true because Monday was selected")
	}

	tuesdayAfterEnd := globalDiscountRuntime(settings, time.Date(2026, 6, 2, 8, 1, 0, 0, loc))
	if tuesdayAfterEnd.Active {
		t.Fatalf("Tuesday 08:01 Active = true, want false")
	}
}

func discountTestTimePtr(t time.Time) *time.Time {
	return &t
}
