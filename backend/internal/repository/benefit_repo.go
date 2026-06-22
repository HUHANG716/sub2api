package repository

import (
	"context"
	"strings"
	"time"

	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/ent/benefitcampaign"
	"github.com/Wei-Shaw/sub2api/ent/benefitclaim"
	"github.com/Wei-Shaw/sub2api/ent/paymentorder"
	dbuser "github.com/Wei-Shaw/sub2api/ent/user"
	"github.com/Wei-Shaw/sub2api/internal/payment"
	"github.com/Wei-Shaw/sub2api/internal/pkg/pagination"
	"github.com/Wei-Shaw/sub2api/internal/service"
)

type benefitRepository struct {
	client *dbent.Client
}

func NewBenefitRepository(client *dbent.Client) service.BenefitRepository {
	return &benefitRepository{client: client}
}

func (r *benefitRepository) CreateCampaign(ctx context.Context, campaign *service.BenefitCampaign) error {
	client := clientFromContext(ctx, r.client)
	builder := client.BenefitCampaign.Create().
		SetName(campaign.Name).
		SetEnabled(campaign.Enabled).
		SetVisible(campaign.Visible).
		SetStartsAt(campaign.StartsAt).
		SetEndsAt(campaign.EndsAt).
		SetThresholdAmount(campaign.ThresholdAmount).
		SetGrantAmount(campaign.GrantAmount).
		SetRechargeScope(campaign.RechargeScope).
		SetCopy(benefitCopyToMap(campaign.Copy)).
		SetSortOrder(campaign.SortOrder)
	created, err := builder.Save(ctx)
	if err != nil {
		return err
	}
	*campaign = *benefitCampaignEntityToService(created)
	return nil
}

func (r *benefitRepository) GetCampaignByID(ctx context.Context, id int64) (*service.BenefitCampaign, error) {
	m, err := clientFromContext(ctx, r.client).BenefitCampaign.Query().
		Where(benefitcampaign.IDEQ(id)).
		Only(ctx)
	if err != nil {
		return nil, translatePersistenceError(err, service.ErrBenefitCampaignNotFound, nil)
	}
	return benefitCampaignEntityToService(m), nil
}

func (r *benefitRepository) UpdateCampaign(ctx context.Context, campaign *service.BenefitCampaign) error {
	client := clientFromContext(ctx, r.client)
	builder := client.BenefitCampaign.UpdateOneID(campaign.ID).
		SetName(campaign.Name).
		SetEnabled(campaign.Enabled).
		SetVisible(campaign.Visible).
		SetStartsAt(campaign.StartsAt).
		SetEndsAt(campaign.EndsAt).
		SetThresholdAmount(campaign.ThresholdAmount).
		SetGrantAmount(campaign.GrantAmount).
		SetRechargeScope(campaign.RechargeScope).
		SetCopy(benefitCopyToMap(campaign.Copy)).
		SetSortOrder(campaign.SortOrder)
	updated, err := builder.Save(ctx)
	if err != nil {
		return translatePersistenceError(err, service.ErrBenefitCampaignNotFound, nil)
	}
	*campaign = *benefitCampaignEntityToService(updated)
	return nil
}

func (r *benefitRepository) DeleteCampaign(ctx context.Context, id int64) error {
	err := clientFromContext(ctx, r.client).BenefitCampaign.DeleteOneID(id).Exec(ctx)
	return translatePersistenceError(err, service.ErrBenefitCampaignNotFound, nil)
}

func (r *benefitRepository) ListCampaigns(ctx context.Context, params pagination.PaginationParams, filters service.BenefitCampaignFilters) ([]service.BenefitCampaign, *pagination.PaginationResult, error) {
	q := clientFromContext(ctx, r.client).BenefitCampaign.Query()
	if filters.Enabled != nil {
		q = q.Where(benefitcampaign.EnabledEQ(*filters.Enabled))
	}
	if filters.Visible != nil {
		q = q.Where(benefitcampaign.VisibleEQ(*filters.Visible))
	}
	if search := strings.TrimSpace(filters.Search); search != "" {
		q = q.Where(benefitcampaign.NameContainsFold(search))
	}

	total, err := q.Clone().Count(ctx)
	if err != nil {
		return nil, nil, err
	}

	campaigns, err := q.
		Offset(params.Offset()).
		Limit(params.Limit()).
		Order(benefitCampaignListOrder(params)...).
		All(ctx)
	if err != nil {
		return nil, nil, err
	}

	out := benefitCampaignEntitiesToService(campaigns)
	if len(out) > 0 {
		ids := make([]int64, 0, len(out))
		for _, campaign := range out {
			ids = append(ids, campaign.ID)
		}
		counts, err := r.CountClaimsByCampaignIDs(ctx, ids)
		if err != nil {
			return nil, nil, err
		}
		for i := range out {
			out[i].ClaimCount = counts[out[i].ID]
		}
	}

	return out, paginationResultFromTotal(int64(total), params), nil
}

func (r *benefitRepository) ListVisibleCampaigns(ctx context.Context) ([]service.BenefitCampaign, error) {
	campaigns, err := clientFromContext(ctx, r.client).BenefitCampaign.Query().
		Where(
			benefitcampaign.VisibleEQ(true),
			benefitcampaign.EnabledEQ(true),
		).
		Order(dbent.Asc(benefitcampaign.FieldSortOrder), dbent.Desc(benefitcampaign.FieldID)).
		All(ctx)
	if err != nil {
		return nil, err
	}
	return benefitCampaignEntitiesToService(campaigns), nil
}

func (r *benefitRepository) CountClaimsByCampaignIDs(ctx context.Context, campaignIDs []int64) (map[int64]int, error) {
	if len(campaignIDs) == 0 {
		return map[int64]int{}, nil
	}
	var rows []struct {
		CampaignID int64 `json:"campaign_id"`
		Count      int   `json:"count"`
	}
	err := clientFromContext(ctx, r.client).BenefitClaim.Query().
		Where(benefitclaim.CampaignIDIn(campaignIDs...)).
		GroupBy(benefitclaim.FieldCampaignID).
		Aggregate(dbent.As(dbent.Count(), "count")).
		Scan(ctx, &rows)
	if err != nil {
		return nil, err
	}
	out := make(map[int64]int, len(rows))
	for _, row := range rows {
		out[row.CampaignID] = row.Count
	}
	return out, nil
}

func (r *benefitRepository) CreateClaim(ctx context.Context, claim *service.BenefitClaim) error {
	client := clientFromContext(ctx, r.client)
	builder := client.BenefitClaim.Create().
		SetCampaignID(claim.CampaignID).
		SetUserID(claim.UserID).
		SetStatus(claim.Status).
		SetEligibleRechargeAmount(claim.EligibleRechargeAmount).
		SetGrantedAmount(claim.GrantedAmount).
		SetBalanceBefore(claim.BalanceBefore).
		SetBalanceAfter(claim.BalanceAfter).
		SetClaimedAt(claim.ClaimedAt).
		SetMetadata(claim.Metadata)
	if claim.SourceRedeemCode != nil {
		builder.SetSourceRedeemCode(*claim.SourceRedeemCode)
	}
	created, err := builder.Save(ctx)
	if err != nil {
		return translatePersistenceError(err, nil, service.ErrBenefitAlreadyClaimed)
	}
	*claim = *benefitClaimEntityToService(created)
	return nil
}

func (r *benefitRepository) GetClaimByCampaignAndUser(ctx context.Context, campaignID, userID int64) (*service.BenefitClaim, error) {
	m, err := clientFromContext(ctx, r.client).BenefitClaim.Query().
		Where(
			benefitclaim.CampaignIDEQ(campaignID),
			benefitclaim.UserIDEQ(userID),
		).
		Only(ctx)
	if err != nil {
		if dbent.IsNotFound(err) {
			return nil, nil
		}
		return nil, err
	}
	return benefitClaimEntityToService(m), nil
}

func (r *benefitRepository) UpdateClaimBalanceSnapshot(ctx context.Context, claimID int64, balanceBefore, balanceAfter float64) error {
	_, err := clientFromContext(ctx, r.client).BenefitClaim.UpdateOneID(claimID).
		SetBalanceBefore(balanceBefore).
		SetBalanceAfter(balanceAfter).
		Save(ctx)
	if err != nil {
		return translatePersistenceError(err, service.ErrBenefitCampaignNotFound, nil)
	}
	return nil
}

func (r *benefitRepository) ListClaimsByCampaign(ctx context.Context, campaignID int64, params pagination.PaginationParams) ([]service.BenefitClaim, *pagination.PaginationResult, error) {
	q := clientFromContext(ctx, r.client).BenefitClaim.Query().
		Where(benefitclaim.CampaignIDEQ(campaignID))

	total, err := q.Clone().Count(ctx)
	if err != nil {
		return nil, nil, err
	}

	claims, err := q.
		WithUser().
		Offset(params.Offset()).
		Limit(params.Limit()).
		Order(dbent.Desc(benefitclaim.FieldClaimedAt), dbent.Desc(benefitclaim.FieldID)).
		All(ctx)
	if err != nil {
		return nil, nil, err
	}

	return benefitClaimEntitiesToService(claims), paginationResultFromTotal(int64(total), params), nil
}

func (r *benefitRepository) SumCompletedRechargeInWindow(ctx context.Context, userID int64, startsAt, endsAt time.Time) (float64, error) {
	var result []struct {
		Sum float64 `json:"sum"`
	}
	err := clientFromContext(ctx, r.client).PaymentOrder.Query().
		Where(
			paymentorder.UserIDEQ(userID),
			paymentorder.OrderTypeEQ(payment.OrderTypeBalance),
			paymentorder.StatusEQ(payment.OrderStatusCompleted),
			paymentorder.CompletedAtGTE(startsAt),
			paymentorder.CompletedAtLTE(endsAt),
		).
		Aggregate(dbent.As(dbent.Sum(paymentorder.FieldAmount), "sum")).
		Scan(ctx, &result)
	if err != nil {
		return 0, err
	}
	if len(result) == 0 {
		return 0, nil
	}
	return result[0].Sum, nil
}

func (r *benefitRepository) CreditUserBalanceOnly(ctx context.Context, userID int64, amount float64) (float64, error) {
	client := clientFromContext(ctx, r.client)
	updated, err := client.User.UpdateOneID(userID).
		AddBalance(amount).
		Where(dbuser.IDEQ(userID)).
		Save(ctx)
	if err != nil {
		return 0, translatePersistenceError(err, service.ErrUserNotFound, nil)
	}
	return updated.Balance, nil
}

func benefitCampaignListOrder(params pagination.PaginationParams) []benefitcampaign.OrderOption {
	sortBy := strings.ToLower(strings.TrimSpace(params.SortBy))
	sortOrder := params.NormalizedSortOrder(pagination.SortOrderDesc)

	var field string
	switch sortBy {
	case "sort_order":
		field = benefitcampaign.FieldSortOrder
	case "created_at":
		field = benefitcampaign.FieldCreatedAt
	case "starts_at":
		field = benefitcampaign.FieldStartsAt
	case "ends_at":
		field = benefitcampaign.FieldEndsAt
	case "threshold_amount":
		field = benefitcampaign.FieldThresholdAmount
	case "grant_amount":
		field = benefitcampaign.FieldGrantAmount
	default:
		field = benefitcampaign.FieldID
	}

	if sortOrder == pagination.SortOrderAsc {
		return []benefitcampaign.OrderOption{dbent.Asc(field), dbent.Asc(benefitcampaign.FieldID)}
	}
	return []benefitcampaign.OrderOption{dbent.Desc(field), dbent.Desc(benefitcampaign.FieldID)}
}

func benefitCampaignEntityToService(m *dbent.BenefitCampaign) *service.BenefitCampaign {
	if m == nil {
		return nil
	}
	return &service.BenefitCampaign{
		ID:              m.ID,
		Name:            m.Name,
		Enabled:         m.Enabled,
		Visible:         m.Visible,
		StartsAt:        m.StartsAt,
		EndsAt:          m.EndsAt,
		ThresholdAmount: m.ThresholdAmount,
		GrantAmount:     m.GrantAmount,
		RechargeScope:   m.RechargeScope,
		Copy:            benefitCopyFromMap(m.Copy),
		SortOrder:       m.SortOrder,
		CreatedAt:       m.CreatedAt,
		UpdatedAt:       m.UpdatedAt,
		DeletedAt:       m.DeletedAt,
	}
}

func benefitCampaignEntitiesToService(items []*dbent.BenefitCampaign) []service.BenefitCampaign {
	out := make([]service.BenefitCampaign, 0, len(items))
	for _, item := range items {
		if mapped := benefitCampaignEntityToService(item); mapped != nil {
			out = append(out, *mapped)
		}
	}
	return out
}

func benefitClaimEntityToService(m *dbent.BenefitClaim) *service.BenefitClaim {
	if m == nil {
		return nil
	}
	out := &service.BenefitClaim{
		ID:                     m.ID,
		CampaignID:             m.CampaignID,
		UserID:                 m.UserID,
		Status:                 m.Status,
		EligibleRechargeAmount: m.EligibleRechargeAmount,
		GrantedAmount:          m.GrantedAmount,
		BalanceBefore:          m.BalanceBefore,
		BalanceAfter:           m.BalanceAfter,
		ClaimedAt:              m.ClaimedAt,
		SourceRedeemCode:       m.SourceRedeemCode,
		Metadata:               m.Metadata,
		CreatedAt:              m.CreatedAt,
		UpdatedAt:              m.UpdatedAt,
	}
	if m.Edges.User != nil {
		out.User = userEntityToService(m.Edges.User)
	}
	if m.Edges.Campaign != nil {
		out.Campaign = benefitCampaignEntityToService(m.Edges.Campaign)
	}
	return out
}

func benefitClaimEntitiesToService(items []*dbent.BenefitClaim) []service.BenefitClaim {
	out := make([]service.BenefitClaim, 0, len(items))
	for _, item := range items {
		if mapped := benefitClaimEntityToService(item); mapped != nil {
			out = append(out, *mapped)
		}
	}
	return out
}

func benefitCopyToMap(copy service.BenefitCampaignCopy) map[string]string {
	copy = mergeBenefitCopy(copy)
	return map[string]string{
		"title":        copy.Title,
		"description":  copy.Description,
		"button":       copy.Button,
		"success":      copy.Success,
		"not_eligible": copy.NotEligible,
		"not_started":  copy.NotStarted,
		"ended":        copy.Ended,
		"claimed":      copy.Claimed,
		"failed":       copy.Failed,
	}
}

func benefitCopyFromMap(copyMap map[string]string) service.BenefitCampaignCopy {
	defaults := service.DefaultBenefitCampaignCopy()
	copy := service.BenefitCampaignCopy{
		Title:       copyMap["title"],
		Description: copyMap["description"],
		Button:      copyMap["button"],
		Success:     copyMap["success"],
		NotEligible: copyMap["not_eligible"],
		NotStarted:  copyMap["not_started"],
		Ended:       copyMap["ended"],
		Claimed:     copyMap["claimed"],
		Failed:      copyMap["failed"],
	}
	if strings.TrimSpace(copy.Title) == "" {
		copy.Title = defaults.Title
	}
	if strings.TrimSpace(copy.Description) == "" {
		copy.Description = defaults.Description
	}
	if strings.TrimSpace(copy.Button) == "" {
		copy.Button = defaults.Button
	}
	if strings.TrimSpace(copy.Success) == "" {
		copy.Success = defaults.Success
	}
	if strings.TrimSpace(copy.NotEligible) == "" {
		copy.NotEligible = defaults.NotEligible
	}
	if strings.TrimSpace(copy.NotStarted) == "" {
		copy.NotStarted = defaults.NotStarted
	}
	if strings.TrimSpace(copy.Ended) == "" {
		copy.Ended = defaults.Ended
	}
	if strings.TrimSpace(copy.Claimed) == "" {
		copy.Claimed = defaults.Claimed
	}
	if strings.TrimSpace(copy.Failed) == "" {
		copy.Failed = defaults.Failed
	}
	return copy
}

func mergeBenefitCopy(copy service.BenefitCampaignCopy) service.BenefitCampaignCopy {
	return benefitCopyFromMap(map[string]string{
		"title":        copy.Title,
		"description":  copy.Description,
		"button":       copy.Button,
		"success":      copy.Success,
		"not_eligible": copy.NotEligible,
		"not_started":  copy.NotStarted,
		"ended":        copy.Ended,
		"claimed":      copy.Claimed,
		"failed":       copy.Failed,
	})
}
