package service

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"entgo.io/ent/dialect"
	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/ent/group"
	"github.com/Wei-Shaw/sub2api/ent/subscriptionplan"
	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
	"github.com/lib/pq"
)

// validatePlanRequired checks that all required fields for a plan are provided.
func validatePlanRequired(name string, groupID int64, price float64, validityDays int, validityUnit string, originalPrice, periodLimit *float64) error {
	if strings.TrimSpace(name) == "" {
		return infraerrors.BadRequest("PLAN_NAME_REQUIRED", "plan name is required")
	}
	if groupID <= 0 {
		return infraerrors.BadRequest("PLAN_GROUP_REQUIRED", "group is required")
	}
	if price <= 0 {
		return infraerrors.BadRequest("PLAN_PRICE_INVALID", "price must be > 0")
	}
	if validityDays <= 0 {
		return infraerrors.BadRequest("PLAN_VALIDITY_REQUIRED", "validity days must be > 0")
	}
	if strings.TrimSpace(validityUnit) == "" {
		return infraerrors.BadRequest("PLAN_VALIDITY_UNIT_REQUIRED", "validity unit is required")
	}
	if originalPrice != nil && *originalPrice < 0 {
		return infraerrors.BadRequest("PLAN_ORIGINAL_PRICE_INVALID", "original price must be >= 0")
	}
	if periodLimit != nil && *periodLimit < 0 {
		return infraerrors.BadRequest("PLAN_PERIOD_LIMIT_INVALID", "period limit must be >= 0")
	}
	return nil
}

// validatePlanPatch validates only the non-nil fields in a patch update.
func validatePlanPatch(req UpdatePlanRequest) error {
	if req.Name != nil && strings.TrimSpace(*req.Name) == "" {
		return infraerrors.BadRequest("PLAN_NAME_REQUIRED", "plan name is required")
	}
	if req.GroupID != nil && *req.GroupID <= 0 {
		return infraerrors.BadRequest("PLAN_GROUP_REQUIRED", "group is required")
	}
	if req.Price != nil && *req.Price <= 0 {
		return infraerrors.BadRequest("PLAN_PRICE_INVALID", "price must be > 0")
	}
	if req.ValidityDays != nil && *req.ValidityDays <= 0 {
		return infraerrors.BadRequest("PLAN_VALIDITY_REQUIRED", "validity days must be > 0")
	}
	if req.ValidityUnit != nil && strings.TrimSpace(*req.ValidityUnit) == "" {
		return infraerrors.BadRequest("PLAN_VALIDITY_UNIT_REQUIRED", "validity unit is required")
	}
	if req.OriginalPrice != nil && *req.OriginalPrice < 0 {
		return infraerrors.BadRequest("PLAN_ORIGINAL_PRICE_INVALID", "original price must be >= 0")
	}
	if req.PeriodLimitUSD != nil && *req.PeriodLimitUSD < 0 {
		return infraerrors.BadRequest("PLAN_PERIOD_LIMIT_INVALID", "period limit must be >= 0")
	}
	return nil
}

// --- Plan CRUD ---

// PlanGroupInfo holds the group details needed for subscription plan display.
type PlanGroupInfo struct {
	Platform        string   `json:"platform"`
	Name            string   `json:"name"`
	RateMultiplier  float64  `json:"rate_multiplier"`
	DailyLimitUSD   *float64 `json:"daily_limit_usd"`
	WeeklyLimitUSD  *float64 `json:"weekly_limit_usd"`
	MonthlyLimitUSD *float64 `json:"monthly_limit_usd"`
	ModelScopes     []string `json:"supported_model_scopes"`
}

func (s *PaymentConfigService) GetPlanPeriodLimitMap(ctx context.Context, plans []*dbent.SubscriptionPlan) map[int64]*float64 {
	ids := make([]int64, 0, len(plans))
	for _, p := range plans {
		if p != nil {
			ids = append(ids, p.ID)
		}
	}
	if len(ids) == 0 {
		return nil
	}
	query := `SELECT id, period_limit_usd FROM subscription_plans WHERE id = ANY($1)`
	args := []any{pq.Int64Array(ids)}
	if s.entClient.Driver().Dialect() == dialect.SQLite {
		placeholders := make([]string, 0, len(ids))
		args = make([]any, 0, len(ids))
		for _, id := range ids {
			placeholders = append(placeholders, "?")
			args = append(args, id)
		}
		query = `SELECT id, period_limit_usd FROM subscription_plans WHERE id IN (` + strings.Join(placeholders, ",") + `)`
	}
	rows, err := s.entClient.QueryContext(ctx, query, args...)
	if err != nil {
		return nil
	}
	defer func() { _ = rows.Close() }()
	result := make(map[int64]*float64, len(ids))
	for rows.Next() {
		var id int64
		var limit sql.NullFloat64
		if err := rows.Scan(&id, &limit); err != nil {
			return result
		}
		if limit.Valid {
			v := limit.Float64
			result[id] = &v
		}
	}
	if err := rows.Err(); err != nil {
		return result
	}
	return result
}

// GetGroupPlatformMap returns a map of group_id → platform for the given plans.
func (s *PaymentConfigService) GetGroupPlatformMap(ctx context.Context, plans []*dbent.SubscriptionPlan) map[int64]string {
	info := s.GetGroupInfoMap(ctx, plans)
	m := make(map[int64]string, len(info))
	for id, gi := range info {
		m[id] = gi.Platform
	}
	return m
}

// GetGroupInfoMap returns a map of group_id → PlanGroupInfo for the given plans.
func (s *PaymentConfigService) GetGroupInfoMap(ctx context.Context, plans []*dbent.SubscriptionPlan) map[int64]PlanGroupInfo {
	ids := make([]int64, 0, len(plans))
	seen := make(map[int64]bool)
	for _, p := range plans {
		if !seen[p.GroupID] {
			seen[p.GroupID] = true
			ids = append(ids, p.GroupID)
		}
	}
	if len(ids) == 0 {
		return nil
	}
	groups, err := s.entClient.Group.Query().Where(group.IDIn(ids...)).All(ctx)
	if err != nil {
		return nil
	}
	m := make(map[int64]PlanGroupInfo, len(groups))
	for _, g := range groups {
		m[int64(g.ID)] = PlanGroupInfo{
			Platform:        g.Platform,
			Name:            g.Name,
			RateMultiplier:  g.RateMultiplier,
			DailyLimitUSD:   g.DailyLimitUsd,
			WeeklyLimitUSD:  g.WeeklyLimitUsd,
			MonthlyLimitUSD: g.MonthlyLimitUsd,
			ModelScopes:     g.SupportedModelScopes,
		}
	}
	return m
}

func (s *PaymentConfigService) ListPlans(ctx context.Context) ([]*dbent.SubscriptionPlan, error) {
	plans, err := s.entClient.SubscriptionPlan.Query().Order(subscriptionplan.BySortOrder()).All(ctx)
	if err != nil {
		return nil, err
	}
	return plans, nil
}

func (s *PaymentConfigService) ListPlansForSale(ctx context.Context) ([]*dbent.SubscriptionPlan, error) {
	return s.entClient.SubscriptionPlan.Query().Where(subscriptionplan.ForSaleEQ(true)).Order(subscriptionplan.BySortOrder()).All(ctx)
}

func (s *PaymentConfigService) CreatePlan(ctx context.Context, req CreatePlanRequest) (*dbent.SubscriptionPlan, error) {
	if err := validatePlanRequired(req.Name, req.GroupID, req.Price, req.ValidityDays, req.ValidityUnit, req.OriginalPrice, req.PeriodLimitUSD); err != nil {
		return nil, err
	}
	tx, err := s.entClient.Tx(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin plan transaction: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	b := tx.SubscriptionPlan.Create().
		SetGroupID(req.GroupID).SetName(req.Name).SetDescription(req.Description).
		SetPrice(req.Price).SetValidityDays(req.ValidityDays).SetValidityUnit(req.ValidityUnit).
		SetFeatures(req.Features).SetProductName(req.ProductName).
		SetForSale(req.ForSale).SetSortOrder(req.SortOrder)
	if req.OriginalPrice != nil {
		b.SetOriginalPrice(*req.OriginalPrice)
	}
	plan, err := b.Save(ctx)
	if err != nil {
		return nil, err
	}
	if req.PeriodLimitUSD != nil {
		if err := s.setPlanPeriodLimitWithClient(ctx, tx.Client(), plan.ID, req.PeriodLimitUSD); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit plan transaction: %w", err)
	}
	return s.GetPlan(ctx, plan.ID)
}

// UpdatePlan updates a subscription plan by ID (patch semantics).
// NOTE: This function exceeds 30 lines due to per-field nil-check patch update boilerplate
// plus a validation guard for non-nil fields.
func (s *PaymentConfigService) UpdatePlan(ctx context.Context, id int64, req UpdatePlanRequest) (*dbent.SubscriptionPlan, error) {
	if err := validatePlanPatch(req); err != nil {
		return nil, err
	}
	tx, err := s.entClient.Tx(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin plan transaction: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	u := tx.SubscriptionPlan.UpdateOneID(id)
	if req.GroupID != nil {
		u.SetGroupID(*req.GroupID)
	}
	if req.Name != nil {
		u.SetName(*req.Name)
	}
	if req.Description != nil {
		u.SetDescription(*req.Description)
	}
	if req.Price != nil {
		u.SetPrice(*req.Price)
	}
	if req.OriginalPrice != nil {
		u.SetOriginalPrice(*req.OriginalPrice)
	}
	if req.ValidityDays != nil {
		u.SetValidityDays(*req.ValidityDays)
	}
	if req.ValidityUnit != nil {
		u.SetValidityUnit(*req.ValidityUnit)
	}
	if req.Features != nil {
		u.SetFeatures(*req.Features)
	}
	if req.ProductName != nil {
		u.SetProductName(*req.ProductName)
	}
	if req.ForSale != nil {
		u.SetForSale(*req.ForSale)
	}
	if req.SortOrder != nil {
		u.SetSortOrder(*req.SortOrder)
	}
	plan, err := u.Save(ctx)
	if err != nil {
		return nil, err
	}
	if req.PeriodLimitUSD != nil {
		if err := s.setPlanPeriodLimitWithClient(ctx, tx.Client(), id, req.PeriodLimitUSD); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit plan transaction: %w", err)
	}
	return s.GetPlan(ctx, plan.ID)
}

func (s *PaymentConfigService) DeletePlan(ctx context.Context, id int64) error {
	count, err := s.countPendingOrdersByPlan(ctx, id)
	if err != nil {
		return fmt.Errorf("check pending orders: %w", err)
	}
	if count > 0 {
		return infraerrors.Conflict("PENDING_ORDERS",
			fmt.Sprintf("this plan has %d in-progress orders and cannot be deleted — wait for orders to complete first", count))
	}
	return s.entClient.SubscriptionPlan.DeleteOneID(id).Exec(ctx)
}

// GetPlan returns a subscription plan by ID.
func (s *PaymentConfigService) GetPlan(ctx context.Context, id int64) (*dbent.SubscriptionPlan, error) {
	plan, err := s.entClient.SubscriptionPlan.Get(ctx, id)
	if err != nil {
		return nil, infraerrors.NotFound("PLAN_NOT_FOUND", "subscription plan not found")
	}
	return plan, nil
}

func (s *PaymentConfigService) setPlanPeriodLimitWithClient(ctx context.Context, client interface {
	ExecContext(context.Context, string, ...any) (sql.Result, error)
}, planID int64, limit *float64) error {
	if limit == nil || *limit <= 0 {
		_, err := client.ExecContext(ctx, `UPDATE subscription_plans SET period_limit_usd = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, planID)
		if isMissingColumnError(err, "period_limit_usd") {
			return nil
		}
		return err
	}
	_, err := client.ExecContext(ctx, `UPDATE subscription_plans SET period_limit_usd = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, *limit, planID)
	return err
}
