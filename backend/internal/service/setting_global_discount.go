package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"sort"
	"strings"
	"time"

	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
	"github.com/Wei-Shaw/sub2api/internal/pkg/timezone"
)

type cachedGlobalDiscountRuntime struct {
	settings  GlobalDiscountSettings
	expiresAt int64
}

const globalDiscountCacheTTL = 30 * time.Second
const globalDiscountErrorTTL = 5 * time.Second
const globalDiscountDBTimeout = 5 * time.Second

func normalizeGlobalDiscountSettings(in GlobalDiscountSettings) (GlobalDiscountSettings, error) {
	out := DefaultGlobalDiscountSettings()
	if len(in.Rules) == 0 &&
		!in.Enabled &&
		in.DiscountRate == 0 &&
		strings.TrimSpace(in.ScheduleType) == "" &&
		strings.TrimSpace(in.StartsAt) == "" &&
		strings.TrimSpace(in.EndsAt) == "" &&
		strings.TrimSpace(in.RecurringStartAt) == "" &&
		strings.TrimSpace(in.RecurringEndAt) == "" &&
		strings.TrimSpace(in.Label) == "" {
		return out, nil
	}
	out.Enabled = in.Enabled
	out.Rules = normalizeGlobalDiscountInputRules(in)
	if len(out.Rules) > 0 {
		rules := make([]GlobalDiscountRule, 0, len(out.Rules))
		for i, rule := range out.Rules {
			normalized, err := normalizeGlobalDiscountRule(rule, i)
			if err != nil {
				return out, err
			}
			rules = append(rules, normalized)
		}
		out.Rules = rules
		out = copyFirstGlobalDiscountRuleToLegacyFields(out)
		return out, nil
	}
	rule, err := normalizeGlobalDiscountRule(GlobalDiscountRule{
		Enabled:          in.Enabled,
		DiscountRate:     in.DiscountRate,
		ScheduleType:     in.ScheduleType,
		StartsAt:         in.StartsAt,
		EndsAt:           in.EndsAt,
		RecurringStartAt: in.RecurringStartAt,
		RecurringEndAt:   in.RecurringEndAt,
		Weekdays:         in.Weekdays,
		MonthDays:        in.MonthDays,
		Label:            in.Label,
	}, 0)
	if err != nil {
		return out, err
	}
	out.Rules = []GlobalDiscountRule{rule}
	out = copyFirstGlobalDiscountRuleToLegacyFields(out)
	return out, nil
}

func normalizeGlobalDiscountInputRules(in GlobalDiscountSettings) []GlobalDiscountRule {
	if len(in.Rules) > 0 {
		return in.Rules
	}
	if !in.Enabled &&
		in.DiscountRate == 0 &&
		strings.TrimSpace(in.ScheduleType) == "" &&
		strings.TrimSpace(in.StartsAt) == "" &&
		strings.TrimSpace(in.EndsAt) == "" &&
		strings.TrimSpace(in.RecurringStartAt) == "" &&
		strings.TrimSpace(in.RecurringEndAt) == "" &&
		strings.TrimSpace(in.Label) == "" {
		return nil
	}
	return []GlobalDiscountRule{{
		Enabled:          in.Enabled,
		DiscountRate:     in.DiscountRate,
		ScheduleType:     in.ScheduleType,
		StartsAt:         in.StartsAt,
		EndsAt:           in.EndsAt,
		RecurringStartAt: in.RecurringStartAt,
		RecurringEndAt:   in.RecurringEndAt,
		Weekdays:         in.Weekdays,
		MonthDays:        in.MonthDays,
		Label:            in.Label,
	}}
}

func normalizeGlobalDiscountRule(in GlobalDiscountRule, index int) (GlobalDiscountRule, error) {
	out := GlobalDiscountRule{
		ID:               strings.TrimSpace(in.ID),
		Enabled:          in.Enabled,
		DiscountRate:     1,
		ScheduleType:     normalizeGlobalDiscountScheduleType(in.ScheduleType),
		StartsAt:         strings.TrimSpace(in.StartsAt),
		EndsAt:           strings.TrimSpace(in.EndsAt),
		RecurringStartAt: strings.TrimSpace(in.RecurringStartAt),
		RecurringEndAt:   strings.TrimSpace(in.RecurringEndAt),
		Weekdays:         normalizeGlobalDiscountInts(in.Weekdays, 1, 7),
		MonthDays:        normalizeGlobalDiscountInts(in.MonthDays, 1, 31),
		Label:            strings.TrimSpace(in.Label),
	}
	if out.ID == "" {
		out.ID = fmt.Sprintf("rule-%d", index+1)
	}
	if in.DiscountRate > 0 {
		out.DiscountRate = in.DiscountRate
	}
	if math.IsNaN(out.DiscountRate) || math.IsInf(out.DiscountRate, 0) || out.DiscountRate <= 0 || out.DiscountRate > 1 {
		return out, infraerrors.BadRequest("INVALID_GLOBAL_DISCOUNT", "discount rate must be greater than 0 and less than or equal to 1")
	}
	if out.Enabled {
		if err := validateGlobalDiscountRuleSchedule(&out); err != nil {
			return out, err
		}
	}
	return out, nil
}

func copyFirstGlobalDiscountRuleToLegacyFields(settings GlobalDiscountSettings) GlobalDiscountSettings {
	if len(settings.Rules) == 0 {
		return settings
	}
	rule := settings.Rules[0]
	settings.DiscountRate = rule.DiscountRate
	settings.ScheduleType = rule.ScheduleType
	settings.StartsAt = rule.StartsAt
	settings.EndsAt = rule.EndsAt
	settings.RecurringStartAt = rule.RecurringStartAt
	settings.RecurringEndAt = rule.RecurringEndAt
	settings.Weekdays = append([]int(nil), rule.Weekdays...)
	settings.MonthDays = append([]int(nil), rule.MonthDays...)
	settings.Label = rule.Label
	return settings
}

func normalizeGlobalDiscountScheduleType(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "daily", "weekly", "monthly":
		return strings.ToLower(strings.TrimSpace(raw))
	default:
		return "once"
	}
}

func normalizeGlobalDiscountInts(values []int, min, max int) []int {
	if len(values) == 0 {
		return nil
	}
	seen := make(map[int]struct{}, len(values))
	out := make([]int, 0, len(values))
	for _, value := range values {
		if value < min || value > max {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	sort.Ints(out)
	return out
}

func validateGlobalDiscountRuleSchedule(out *GlobalDiscountRule) error {
	if out == nil {
		return infraerrors.BadRequest("INVALID_GLOBAL_DISCOUNT", "discount settings are required")
	}
	switch out.ScheduleType {
	case "once":
		if out.StartsAt == "" || out.EndsAt == "" {
			return infraerrors.BadRequest("INVALID_GLOBAL_DISCOUNT", "discount start and end time are required when enabled")
		}
		start, err := parseGlobalDiscountTime(out.StartsAt)
		if err != nil {
			return infraerrors.BadRequest("INVALID_GLOBAL_DISCOUNT", "discount start time must be RFC3339")
		}
		end, err := parseGlobalDiscountTime(out.EndsAt)
		if err != nil {
			return infraerrors.BadRequest("INVALID_GLOBAL_DISCOUNT", "discount end time must be RFC3339")
		}
		if !end.After(start) {
			return infraerrors.BadRequest("INVALID_GLOBAL_DISCOUNT", "discount end time must be after start time")
		}
		out.StartsAt = start.UTC().Format(time.RFC3339)
		out.EndsAt = end.UTC().Format(time.RFC3339)
	default:
		start, err := normalizeGlobalDiscountClock(out.RecurringStartAt)
		if err != nil {
			return infraerrors.BadRequest("INVALID_GLOBAL_DISCOUNT", "recurring discount start time must be HH:mm")
		}
		end, err := normalizeGlobalDiscountClock(out.RecurringEndAt)
		if err != nil {
			return infraerrors.BadRequest("INVALID_GLOBAL_DISCOUNT", "recurring discount end time must be HH:mm")
		}
		if start == end {
			return infraerrors.BadRequest("INVALID_GLOBAL_DISCOUNT", "recurring discount start and end time must be different")
		}
		out.RecurringStartAt = start
		out.RecurringEndAt = end
		if out.ScheduleType == "weekly" && len(out.Weekdays) == 0 {
			return infraerrors.BadRequest("INVALID_GLOBAL_DISCOUNT", "at least one weekday is required for weekly discount")
		}
		if out.ScheduleType == "monthly" && len(out.MonthDays) == 0 {
			return infraerrors.BadRequest("INVALID_GLOBAL_DISCOUNT", "at least one month day is required for monthly discount")
		}
	}
	return nil
}

func normalizeGlobalDiscountClock(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", errors.New("empty clock")
	}
	t, err := time.Parse("15:04", raw)
	if err != nil {
		return "", err
	}
	return t.Format("15:04"), nil
}

func parseGlobalDiscountSettings(raw string) GlobalDiscountSettings {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return DefaultGlobalDiscountSettings()
	}
	var settings GlobalDiscountSettings
	if err := json.Unmarshal([]byte(raw), &settings); err != nil {
		return DefaultGlobalDiscountSettings()
	}
	normalized, err := normalizeGlobalDiscountSettings(settings)
	if err != nil {
		return DefaultGlobalDiscountSettings()
	}
	return normalized
}

func parseGlobalDiscountTime(raw string) (time.Time, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return time.Time{}, errors.New("empty time")
	}
	if t, err := time.Parse(time.RFC3339, raw); err == nil {
		return t, nil
	}
	if t, err := time.Parse("2006-01-02T15:04", raw); err == nil {
		return t, nil
	}
	return time.Time{}, fmt.Errorf("invalid time %q", raw)
}

func globalDiscountRuntime(settings GlobalDiscountSettings, now time.Time) GlobalDiscountRuntime {
	settings, _ = normalizeGlobalDiscountSettings(settings)
	if !settings.Enabled {
		return GlobalDiscountRuntime{
			Enabled:      false,
			DiscountRate: 1,
			ScheduleType: "once",
		}
	}
	var best *GlobalDiscountRuntime
	bestDuration := time.Duration(0)
	var next *GlobalDiscountRuntime
	for _, rule := range settings.Rules {
		runtime := globalDiscountRuleRuntime(rule, now)
		runtime.Enabled = settings.Enabled && rule.Enabled
		runtime.Active = globalDiscountActive(runtime, now)
		if runtime.Active {
			duration := globalDiscountRuleDuration(runtime)
			if best == nil ||
				runtime.DiscountRate < best.DiscountRate ||
				(runtime.DiscountRate == best.DiscountRate && duration < bestDuration) {
				candidate := runtime
				best = &candidate
				bestDuration = duration
			}
			continue
		}
		if runtime.Enabled && runtime.DiscountRate > 0 && runtime.DiscountRate < 1 {
			if start, end, ok := globalDiscountNextWindow(runtime, now); ok {
				startUTC := start.UTC()
				endUTC := end.UTC()
				runtime.StartsAt = &startUTC
				runtime.EndsAt = &endUTC
				candidate := runtime
				if next == nil || (candidate.StartsAt != nil && next.StartsAt != nil && candidate.StartsAt.Before(*next.StartsAt)) {
					next = &candidate
				}
			}
		}
	}
	if best != nil {
		return *best
	}
	if next != nil {
		return *next
	}
	runtime := GlobalDiscountRuntime{
		Enabled:      settings.Enabled,
		DiscountRate: 1,
		ScheduleType: "once",
	}
	if len(settings.Rules) > 0 {
		runtime = globalDiscountRuleRuntime(settings.Rules[0], now)
		runtime.Enabled = settings.Enabled && settings.Rules[0].Enabled
		runtime.Active = false
	}
	return runtime
}

func globalDiscountRuntimeVisible(runtime GlobalDiscountRuntime, now time.Time) bool {
	if !runtime.Enabled || runtime.DiscountRate <= 0 || runtime.DiscountRate >= 1 {
		return false
	}
	if runtime.Active {
		return true
	}
	if runtime.StartsAt == nil || runtime.EndsAt == nil {
		return false
	}
	return runtime.StartsAt.Before(*runtime.EndsAt) && now.Before(*runtime.StartsAt)
}

func globalDiscountNextWindow(runtime GlobalDiscountRuntime, now time.Time) (time.Time, time.Time, bool) {
	if !runtime.Enabled || runtime.DiscountRate <= 0 || runtime.DiscountRate >= 1 {
		return time.Time{}, time.Time{}, false
	}
	if runtime.ScheduleType == "" || runtime.ScheduleType == "once" {
		if runtime.StartsAt == nil || runtime.EndsAt == nil {
			return time.Time{}, time.Time{}, false
		}
		if now.Before(*runtime.StartsAt) && runtime.EndsAt.After(*runtime.StartsAt) {
			return *runtime.StartsAt, *runtime.EndsAt, true
		}
		return time.Time{}, time.Time{}, false
	}
	return globalDiscountRecurringNextWindow(runtime, now)
}

func globalDiscountRecurringNextWindow(runtime GlobalDiscountRuntime, now time.Time) (time.Time, time.Time, bool) {
	startMin, ok := parseGlobalDiscountClockMinutes(runtime.RecurringStartAt)
	if !ok {
		return time.Time{}, time.Time{}, false
	}
	endMin, ok := parseGlobalDiscountClockMinutes(runtime.RecurringEndAt)
	if !ok || startMin == endMin {
		return time.Time{}, time.Time{}, false
	}

	local := now.In(timezone.Location())
	startOfDay := timezone.StartOfDay(local)
	for dayOffset := 0; dayOffset <= 370; dayOffset++ {
		day := startOfDay.AddDate(0, 0, dayOffset)
		if !globalDiscountScheduleIncludesDay(runtime, day) {
			continue
		}
		start := timezone.StartOfDay(day).Add(time.Duration(startMin) * time.Minute)
		end := timezone.StartOfDay(day).Add(time.Duration(endMin) * time.Minute)
		if startMin > endMin {
			end = end.AddDate(0, 0, 1)
		}
		if start.After(local) {
			return start, end, true
		}
	}
	return time.Time{}, time.Time{}, false
}

func globalDiscountScheduleIncludesDay(runtime GlobalDiscountRuntime, day time.Time) bool {
	switch runtime.ScheduleType {
	case "daily":
		return true
	case "weekly":
		return containsInt(runtime.Weekdays, globalDiscountWeekday(day))
	case "monthly":
		return containsInt(runtime.MonthDays, day.In(timezone.Location()).Day())
	default:
		return false
	}
}

func globalDiscountRuleDuration(runtime GlobalDiscountRuntime) time.Duration {
	if runtime.ScheduleType == "" || runtime.ScheduleType == "once" {
		if runtime.StartsAt != nil && runtime.EndsAt != nil && runtime.EndsAt.After(*runtime.StartsAt) {
			return runtime.EndsAt.Sub(*runtime.StartsAt)
		}
		return 365 * 24 * time.Hour
	}
	startMin, ok := parseGlobalDiscountClockMinutes(runtime.RecurringStartAt)
	if !ok {
		return 365 * 24 * time.Hour
	}
	endMin, ok := parseGlobalDiscountClockMinutes(runtime.RecurringEndAt)
	if !ok {
		return 365 * 24 * time.Hour
	}
	delta := endMin - startMin
	if delta <= 0 {
		delta += 24 * 60
	}
	return time.Duration(delta) * time.Minute
}

func globalDiscountRuleRuntime(rule GlobalDiscountRule, now time.Time) GlobalDiscountRuntime {
	runtime := GlobalDiscountRuntime{
		Enabled:          rule.Enabled,
		RuleID:           rule.ID,
		DiscountRate:     rule.DiscountRate,
		ScheduleType:     rule.ScheduleType,
		RecurringStartAt: rule.RecurringStartAt,
		RecurringEndAt:   rule.RecurringEndAt,
		Weekdays:         append([]int(nil), rule.Weekdays...),
		MonthDays:        append([]int(nil), rule.MonthDays...),
		Label:            rule.Label,
	}
	if rule.StartsAt != "" {
		if t, err := parseGlobalDiscountTime(rule.StartsAt); err == nil {
			tt := t.UTC()
			runtime.StartsAt = &tt
		}
	}
	if rule.EndsAt != "" {
		if t, err := parseGlobalDiscountTime(rule.EndsAt); err == nil {
			tt := t.UTC()
			runtime.EndsAt = &tt
		}
	}
	runtime.Active = globalDiscountActive(runtime, now)
	if runtime.Active && runtime.ScheduleType != "" && runtime.ScheduleType != "once" {
		if start, end, ok := globalDiscountRecurringWindow(runtime, now); ok {
			startUTC := start.UTC()
			endUTC := end.UTC()
			runtime.StartsAt = &startUTC
			runtime.EndsAt = &endUTC
		}
	}
	return runtime
}

func globalDiscountActive(runtime GlobalDiscountRuntime, now time.Time) bool {
	if !runtime.Enabled || runtime.DiscountRate <= 0 || runtime.DiscountRate >= 1 {
		return false
	}
	if runtime.ScheduleType == "" || runtime.ScheduleType == "once" {
		return runtime.StartsAt != nil &&
			runtime.EndsAt != nil &&
			!now.Before(*runtime.StartsAt) &&
			now.Before(*runtime.EndsAt)
	}
	return globalDiscountRecurringActive(runtime, now)
}

func globalDiscountRecurringActive(runtime GlobalDiscountRuntime, now time.Time) bool {
	_, _, active := globalDiscountRecurringWindow(runtime, now)
	return active
}

func globalDiscountRecurringWindow(runtime GlobalDiscountRuntime, now time.Time) (time.Time, time.Time, bool) {
	startMin, ok := parseGlobalDiscountClockMinutes(runtime.RecurringStartAt)
	if !ok {
		return time.Time{}, time.Time{}, false
	}
	endMin, ok := parseGlobalDiscountClockMinutes(runtime.RecurringEndAt)
	if !ok || startMin == endMin {
		return time.Time{}, time.Time{}, false
	}
	local := now.In(timezone.Location())
	localMin := local.Hour()*60 + local.Minute()
	windowForStartDay := func(day time.Time) (time.Time, time.Time) {
		windowStart := timezone.StartOfDay(day).Add(time.Duration(startMin) * time.Minute)
		windowEnd := timezone.StartOfDay(day).Add(time.Duration(endMin) * time.Minute)
		if startMin > endMin {
			windowEnd = windowEnd.AddDate(0, 0, 1)
		}
		return windowStart, windowEnd
	}

	switch runtime.ScheduleType {
	case "daily":
		if startMin < endMin {
			if !clockWindowContains(startMin, endMin, localMin) {
				return time.Time{}, time.Time{}, false
			}
			start, end := windowForStartDay(local)
			return start, end, true
		}
		if localMin >= startMin {
			start, end := windowForStartDay(local)
			return start, end, true
		}
		if localMin < endMin {
			start, end := windowForStartDay(local.AddDate(0, 0, -1))
			return start, end, true
		}
		return time.Time{}, time.Time{}, false
	case "weekly":
		today := globalDiscountWeekday(local)
		yesterday := globalDiscountWeekday(local.AddDate(0, 0, -1))
		if startMin > endMin {
			if containsInt(runtime.Weekdays, today) && localMin >= startMin {
				start, end := windowForStartDay(local)
				return start, end, true
			}
			if containsInt(runtime.Weekdays, yesterday) && localMin < endMin {
				start, end := windowForStartDay(local.AddDate(0, 0, -1))
				return start, end, true
			}
			return time.Time{}, time.Time{}, false
		}
		if containsInt(runtime.Weekdays, today) && clockWindowContains(startMin, endMin, localMin) {
			start, end := windowForStartDay(local)
			return start, end, true
		}
		return time.Time{}, time.Time{}, false
	case "monthly":
		today := local.Day()
		yesterday := local.AddDate(0, 0, -1).Day()
		if startMin > endMin {
			if containsInt(runtime.MonthDays, today) && localMin >= startMin {
				start, end := windowForStartDay(local)
				return start, end, true
			}
			if containsInt(runtime.MonthDays, yesterday) && localMin < endMin {
				start, end := windowForStartDay(local.AddDate(0, 0, -1))
				return start, end, true
			}
			return time.Time{}, time.Time{}, false
		}
		if containsInt(runtime.MonthDays, today) && clockWindowContains(startMin, endMin, localMin) {
			start, end := windowForStartDay(local)
			return start, end, true
		}
		return time.Time{}, time.Time{}, false
	default:
		return time.Time{}, time.Time{}, false
	}
}

func parseGlobalDiscountClockMinutes(raw string) (int, bool) {
	t, err := time.Parse("15:04", strings.TrimSpace(raw))
	if err != nil {
		return 0, false
	}
	return t.Hour()*60 + t.Minute(), true
}

func clockWindowContains(startMin, endMin, currentMin int) bool {
	if startMin < endMin {
		return currentMin >= startMin && currentMin < endMin
	}
	return currentMin >= startMin || currentMin < endMin
}

func globalDiscountWeekday(t time.Time) int {
	weekday := int(t.Weekday())
	if weekday == 0 {
		return 7
	}
	return weekday
}

func containsInt(values []int, target int) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func (s *SettingService) GetGlobalDiscountRuntime(ctx context.Context) GlobalDiscountRuntime {
	fallback := globalDiscountRuntime(DefaultGlobalDiscountSettings(), time.Now())
	if s == nil || s.settingRepo == nil {
		return fallback
	}
	if cached, ok := s.globalDiscountCache.Load().(*cachedGlobalDiscountRuntime); ok && cached != nil {
		if time.Now().UnixNano() < cached.expiresAt {
			return globalDiscountRuntime(cached.settings, time.Now())
		}
	}

	result, _, _ := s.globalDiscountSF.Do("global_discount_settings", func() (any, error) {
		if cached, ok := s.globalDiscountCache.Load().(*cachedGlobalDiscountRuntime); ok && cached != nil {
			if time.Now().UnixNano() < cached.expiresAt {
				return cached.settings, nil
			}
		}
		if ctx == nil {
			ctx = context.Background()
		}
		dbCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), globalDiscountDBTimeout)
		defer cancel()
		raw, err := s.settingRepo.GetValue(dbCtx, SettingKeyGlobalDiscountSettings)
		if err != nil && !errors.Is(err, ErrSettingNotFound) {
			slog.Warn("failed to get global discount setting", "error", err)
			s.globalDiscountCache.Store(&cachedGlobalDiscountRuntime{
				settings:  DefaultGlobalDiscountSettings(),
				expiresAt: time.Now().Add(globalDiscountErrorTTL).UnixNano(),
			})
			return DefaultGlobalDiscountSettings(), nil
		}
		settings := parseGlobalDiscountSettings(raw)
		s.globalDiscountCache.Store(&cachedGlobalDiscountRuntime{
			settings:  settings,
			expiresAt: time.Now().Add(globalDiscountCacheTTL).UnixNano(),
		})
		return settings, nil
	})
	if settings, ok := result.(GlobalDiscountSettings); ok {
		return globalDiscountRuntime(settings, time.Now())
	}
	return fallback
}

func ApplyGlobalDiscountToCost(cost *CostBreakdown, discount GlobalDiscountRuntime) {
	if cost == nil || !discount.Active || discount.DiscountRate <= 0 || discount.DiscountRate >= 1 {
		if cost != nil && cost.DiscountRate == 0 {
			cost.DiscountRate = 1
		}
		return
	}
	originalActualCost := cost.ActualCost
	if originalActualCost <= 0 {
		cost.DiscountRate = discount.DiscountRate
		return
	}
	cost.DiscountRate = discount.DiscountRate
	cost.ActualCost = originalActualCost * discount.DiscountRate
	cost.DiscountAmount = originalActualCost - cost.ActualCost
}
