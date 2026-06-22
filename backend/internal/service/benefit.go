package service

import (
	"time"

	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
)

const (
	BenefitRechargeScopeLifetime       = "lifetime"
	BenefitRechargeScopeCampaignWindow = "campaign_window"

	BenefitClaimStatusClaimed = "claimed"

	BenefitStateNotStarted  = "not_started"
	BenefitStateEnded       = "ended"
	BenefitStateClaimed     = "claimed"
	BenefitStateNotEligible = "not_eligible"
	BenefitStateClaimable   = "claimable"
)

var (
	ErrBenefitCampaignNotFound  = infraerrors.NotFound("BENEFIT_CAMPAIGN_NOT_FOUND", "benefit campaign not found")
	ErrBenefitCampaignInvalid   = infraerrors.BadRequest("BENEFIT_CAMPAIGN_INVALID", "invalid benefit campaign")
	ErrBenefitNotStarted        = infraerrors.BadRequest("BENEFIT_NOT_STARTED", "benefit campaign has not started")
	ErrBenefitEnded             = infraerrors.BadRequest("BENEFIT_ENDED", "benefit campaign has ended")
	ErrBenefitAlreadyClaimed    = infraerrors.Conflict("BENEFIT_ALREADY_CLAIMED", "benefit already claimed")
	ErrBenefitNotEligible       = infraerrors.BadRequest("BENEFIT_NOT_ELIGIBLE", "benefit eligibility requirement is not met")
	ErrBenefitCampaignInvisible = infraerrors.Forbidden("BENEFIT_CAMPAIGN_HIDDEN", "benefit campaign is hidden")
)

type BenefitCampaignCopy struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Button      string `json:"button"`
	Success     string `json:"success"`
	NotEligible string `json:"not_eligible"`
	NotStarted  string `json:"not_started"`
	Ended       string `json:"ended"`
	Claimed     string `json:"claimed"`
	Failed      string `json:"failed"`
}

func DefaultBenefitCampaignCopy() BenefitCampaignCopy {
	return BenefitCampaignCopy{
		Title:       "Recharge benefit",
		Description: "Claim a bonus after meeting the recharge requirement.",
		Button:      "Claim",
		Success:     "Benefit claimed.",
		NotEligible: "Recharge more to unlock this benefit.",
		NotStarted:  "This benefit is not available yet.",
		Ended:       "This benefit has ended.",
		Claimed:     "You have already claimed this benefit.",
		Failed:      "Could not claim this benefit. Please try again.",
	}
}

type BenefitCampaign struct {
	ID              int64
	Name            string
	Enabled         bool
	Visible         bool
	StartsAt        time.Time
	EndsAt          time.Time
	ThresholdAmount float64
	GrantAmount     float64
	RechargeScope   string
	Copy            BenefitCampaignCopy
	SortOrder       int
	ClaimCount      int
	CreatedAt       time.Time
	UpdatedAt       time.Time
	DeletedAt       *time.Time
}

type BenefitClaim struct {
	ID                     int64
	CampaignID             int64
	UserID                 int64
	Status                 string
	EligibleRechargeAmount float64
	GrantedAmount          float64
	BalanceBefore          float64
	BalanceAfter           float64
	ClaimedAt              time.Time
	SourceRedeemCode       *string
	Metadata               map[string]any
	CreatedAt              time.Time
	UpdatedAt              time.Time
	User                   *User
	Campaign               *BenefitCampaign
}

type BenefitCampaignFilters struct {
	Enabled *bool
	Visible *bool
	Search  string
}

type CreateBenefitCampaignInput struct {
	Name            string
	Enabled         bool
	Visible         bool
	StartsAt        time.Time
	EndsAt          time.Time
	ThresholdAmount float64
	GrantAmount     float64
	RechargeScope   string
	Copy            BenefitCampaignCopy
	SortOrder       int
}

type UpdateBenefitCampaignInput struct {
	Name            *string
	Enabled         *bool
	Visible         *bool
	StartsAt        *time.Time
	EndsAt          *time.Time
	ThresholdAmount *float64
	GrantAmount     *float64
	RechargeScope   *string
	Copy            *BenefitCampaignCopy
	SortOrder       *int
}

type BenefitCampaignView struct {
	Campaign               BenefitCampaign
	State                  string
	EligibleRechargeAmount float64
	Claim                  *BenefitClaim
}

type BenefitClaimResult struct {
	Campaign BenefitCampaign
	Claim    BenefitClaim
	Balance  float64
}
