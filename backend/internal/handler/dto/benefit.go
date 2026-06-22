package dto

import (
	"time"

	"github.com/Wei-Shaw/sub2api/internal/service"
)

type BenefitCampaignCopy = service.BenefitCampaignCopy

type BenefitCampaign struct {
	ID              int64               `json:"id"`
	Name            string              `json:"name"`
	Enabled         bool                `json:"enabled"`
	Visible         bool                `json:"visible"`
	StartsAt        time.Time           `json:"starts_at"`
	EndsAt          time.Time           `json:"ends_at"`
	ThresholdAmount float64             `json:"threshold_amount"`
	GrantAmount     float64             `json:"grant_amount"`
	RechargeScope   string              `json:"recharge_scope"`
	Copy            BenefitCampaignCopy `json:"copy"`
	SortOrder       int                 `json:"sort_order"`
	ClaimCount      int                 `json:"claim_count"`
	CreatedAt       time.Time           `json:"created_at"`
	UpdatedAt       time.Time           `json:"updated_at"`
}

type BenefitClaim struct {
	ID                     int64     `json:"id"`
	CampaignID             int64     `json:"campaign_id"`
	UserID                 int64     `json:"user_id"`
	Status                 string    `json:"status"`
	EligibleRechargeAmount float64   `json:"eligible_recharge_amount"`
	GrantedAmount          float64   `json:"granted_amount"`
	BalanceBefore          float64   `json:"balance_before"`
	BalanceAfter           float64   `json:"balance_after"`
	ClaimedAt              time.Time `json:"claimed_at"`
	SourceRedeemCode       *string   `json:"source_redeem_code,omitempty"`
	CreatedAt              time.Time `json:"created_at"`
	UpdatedAt              time.Time `json:"updated_at"`
	User                   *User     `json:"user,omitempty"`
}

type BenefitCampaignView struct {
	Campaign               BenefitCampaign `json:"campaign"`
	State                  string          `json:"state"`
	EligibleRechargeAmount float64         `json:"eligible_recharge_amount"`
	Claim                  *BenefitClaim   `json:"claim,omitempty"`
}

func BenefitCampaignFromService(in *service.BenefitCampaign) *BenefitCampaign {
	if in == nil {
		return nil
	}
	return &BenefitCampaign{
		ID:              in.ID,
		Name:            in.Name,
		Enabled:         in.Enabled,
		Visible:         in.Visible,
		StartsAt:        in.StartsAt,
		EndsAt:          in.EndsAt,
		ThresholdAmount: in.ThresholdAmount,
		GrantAmount:     in.GrantAmount,
		RechargeScope:   in.RechargeScope,
		Copy:            in.Copy,
		SortOrder:       in.SortOrder,
		ClaimCount:      in.ClaimCount,
		CreatedAt:       in.CreatedAt,
		UpdatedAt:       in.UpdatedAt,
	}
}

func BenefitCampaignsFromService(items []service.BenefitCampaign) []BenefitCampaign {
	out := make([]BenefitCampaign, 0, len(items))
	for i := range items {
		out = append(out, *BenefitCampaignFromService(&items[i]))
	}
	return out
}

func BenefitClaimFromService(in *service.BenefitClaim) *BenefitClaim {
	if in == nil {
		return nil
	}
	out := &BenefitClaim{
		ID:                     in.ID,
		CampaignID:             in.CampaignID,
		UserID:                 in.UserID,
		Status:                 in.Status,
		EligibleRechargeAmount: in.EligibleRechargeAmount,
		GrantedAmount:          in.GrantedAmount,
		BalanceBefore:          in.BalanceBefore,
		BalanceAfter:           in.BalanceAfter,
		ClaimedAt:              in.ClaimedAt,
		SourceRedeemCode:       in.SourceRedeemCode,
		CreatedAt:              in.CreatedAt,
		UpdatedAt:              in.UpdatedAt,
	}
	if in.User != nil {
		out.User = UserFromService(in.User)
	}
	return out
}

func BenefitClaimsFromService(items []service.BenefitClaim) []BenefitClaim {
	out := make([]BenefitClaim, 0, len(items))
	for i := range items {
		out = append(out, *BenefitClaimFromService(&items[i]))
	}
	return out
}

func BenefitCampaignViewFromService(in *service.BenefitCampaignView) *BenefitCampaignView {
	if in == nil {
		return nil
	}
	return &BenefitCampaignView{
		Campaign:               *BenefitCampaignFromService(&in.Campaign),
		State:                  in.State,
		EligibleRechargeAmount: in.EligibleRechargeAmount,
		Claim:                  BenefitClaimFromService(in.Claim),
	}
}

func BenefitCampaignViewsFromService(items []service.BenefitCampaignView) []BenefitCampaignView {
	out := make([]BenefitCampaignView, 0, len(items))
	for i := range items {
		out = append(out, *BenefitCampaignViewFromService(&items[i]))
	}
	return out
}
