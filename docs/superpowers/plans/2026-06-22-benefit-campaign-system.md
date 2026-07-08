# Benefit Campaign System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a welfare/benefit campaign system where admins configure fixed-window, single-tier recharge benefits and users can claim each eligible campaign once.

**Architecture:** Add first-class benefit campaign and claim tables, with a dedicated service handling validation, eligibility evaluation, and atomic balance credit. Expose admin CRUD/claims APIs and user list/claim APIs, then add a compact admin management page plus a user benefit page wired into the existing sidebar/router patterns.

**Tech Stack:** Go, Ent, PostgreSQL migrations, Gin handlers, Wire, Vue 3, TypeScript, Vite, Vitest, Tailwind-style utility classes.

---

## File Structure

Backend data model:

- Create `backend/ent/schema/benefit_campaign.go`: Ent schema for campaign configuration, soft delete, JSON copy, and indexes.
- Create `backend/ent/schema/benefit_claim.go`: Ent schema for per-user claim records and the `campaign_id + user_id` unique guard.
- Create `backend/migrations/154_benefit_campaigns.sql`: idempotent SQL migration matching the Ent schemas.
- Modify generated Ent files by running `go generate ./ent`.

Backend service/repository:

- Create `backend/internal/service/benefit.go`: domain structs, constants, copy defaults, request/response types, and error values.
- Create `backend/internal/service/benefit_repository.go`: repository interface consumed by `BenefitService`.
- Create `backend/internal/service/benefit_service.go`: validation, admin CRUD, user campaign state evaluation, and atomic claim fulfillment.
- Create `backend/internal/service/benefit_service_test.go`: unit tests for validation, state evaluation, lifetime/window eligibility, duplicate claims, and balance-only grants.
- Create `backend/internal/repository/benefit_repo.go`: Ent-backed repository implementation, benefit entity mapping, and balance-only user credit for benefit grants.
- Modify `backend/internal/repository/wire.go`: add `NewBenefitRepository`.
- Modify `backend/internal/service/wire.go`: add `ProvideBenefitService`, which injects `*ent.Client` for claim transactions.

Backend handlers/routes/wiring:

- Create `backend/internal/handler/benefit_handler.go`: user-facing list/claim handler.
- Create `backend/internal/handler/admin/benefit_handler.go`: admin campaign and claim handlers.
- Create `backend/internal/handler/dto/benefit.go`: DTO mapping for campaign and claim responses.
- Modify `backend/internal/handler/handler.go`: add `Benefit` fields to top-level and admin handler structs.
- Modify `backend/internal/handler/wire.go`: add handler providers and constructor parameters.
- Modify `backend/internal/server/routes/user.go`: register `/benefits/campaigns` and `/benefits/campaigns/:id/claim`.
- Modify `backend/internal/server/routes/admin.go`: register `/admin/benefits/campaigns` and claim routes.
- Modify generated Wire output by running `go generate ./cmd/server`.

Frontend API/types:

- Create `frontend/src/api/benefits.ts`: user benefit API.
- Create `frontend/src/api/admin/benefits.ts`: admin benefit API.
- Modify `frontend/src/api/admin/index.ts`: export `benefits`.
- Modify `frontend/src/types/index.ts`: add Benefit campaign/claim/copy/state types.

Frontend views/navigation:

- Create `frontend/src/views/user/BenefitsView.vue`: user campaign list and claim UI.
- Create `frontend/src/views/admin/BenefitCampaignsView.vue`: admin list, create/edit dialog, and claims dialog.
- Modify `frontend/src/router/index.ts`: add `/benefits` and `/admin/benefits` routes.
- Modify `frontend/src/components/layout/AppSidebar.vue`: add benefit nav entries.
- Modify `frontend/src/i18n/locales/zh.ts` and `frontend/src/i18n/locales/en.ts`: add nav and page messages.

---

### Task 1: Backend Schema And Migration

**Files:**
- Create: `backend/ent/schema/benefit_campaign.go`
- Create: `backend/ent/schema/benefit_claim.go`
- Create: `backend/migrations/154_benefit_campaigns.sql`
- Modify generated: `backend/ent/*`

- [ ] **Step 1: Add failing migration/schema smoke test**

Create `backend/migrations/benefit_campaigns_schema_test.go`:

```go
package migrations

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestBenefitCampaignMigrationDefinesCampaignsAndClaims(t *testing.T) {
	content, err := FS.ReadFile("154_benefit_campaigns.sql")
	require.NoError(t, err)
	sql := string(content)

	require.Contains(t, sql, "CREATE TABLE IF NOT EXISTS benefit_campaigns")
	require.Contains(t, sql, "CREATE TABLE IF NOT EXISTS benefit_claims")
	require.Contains(t, sql, "recharge_scope")
	require.Contains(t, sql, "UNIQUE (campaign_id, user_id)")
	require.Contains(t, sql, "CREATE INDEX IF NOT EXISTS idx_benefit_campaigns_visible_sort")
	require.Contains(t, sql, "CREATE INDEX IF NOT EXISTS idx_benefit_claims_claimed_at")
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd backend
go test ./migrations -run TestBenefitCampaignMigrationDefinesCampaignsAndClaims -count=1
```

Expected: FAIL because `154_benefit_campaigns.sql` does not exist.

- [ ] **Step 3: Create Ent campaign schema**

Create `backend/ent/schema/benefit_campaign.go`:

```go
package schema

import (
	"github.com/Wei-Shaw/sub2api/ent/schema/mixins"

	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type BenefitCampaign struct {
	ent.Schema
}

func (BenefitCampaign) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "benefit_campaigns"},
	}
}

func (BenefitCampaign) Mixin() []ent.Mixin {
	return []ent.Mixin{
		mixins.TimeMixin{},
		mixins.SoftDeleteMixin{},
	}
}

func (BenefitCampaign) Fields() []ent.Field {
	return []ent.Field{
		field.String("name").
			MaxLen(120).
			NotEmpty(),
		field.Bool("enabled").
			Default(true),
		field.Bool("visible").
			Default(true),
		field.Time("starts_at").
			SchemaType(map[string]string{dialect.Postgres: "timestamptz"}),
		field.Time("ends_at").
			SchemaType(map[string]string{dialect.Postgres: "timestamptz"}),
		field.Float("threshold_amount").
			SchemaType(map[string]string{dialect.Postgres: "decimal(20,8)"}),
		field.Float("grant_amount").
			SchemaType(map[string]string{dialect.Postgres: "decimal(20,8)"}),
		field.String("recharge_scope").
			MaxLen(32).
			Default("lifetime"),
		field.JSON("copy", map[string]string{}).
			Optional().
			SchemaType(map[string]string{dialect.Postgres: "jsonb"}),
		field.Int("sort_order").
			Default(0),
	}
}

func (BenefitCampaign) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("claims", BenefitClaim.Type),
	}
}

func (BenefitCampaign) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("enabled"),
		index.Fields("visible"),
		index.Fields("starts_at", "ends_at"),
		index.Fields("visible", "sort_order"),
		index.Fields("deleted_at"),
	}
}
```

- [ ] **Step 4: Create Ent claim schema**

Create `backend/ent/schema/benefit_claim.go`:

```go
package schema

import (
	"github.com/Wei-Shaw/sub2api/ent/schema/mixins"

	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type BenefitClaim struct {
	ent.Schema
}

func (BenefitClaim) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "benefit_claims"},
	}
}

func (BenefitClaim) Mixin() []ent.Mixin {
	return []ent.Mixin{
		mixins.TimeMixin{},
	}
}

func (BenefitClaim) Fields() []ent.Field {
	return []ent.Field{
		field.Int64("campaign_id"),
		field.Int64("user_id"),
		field.String("status").
			MaxLen(20).
			Default("claimed"),
		field.Float("eligible_recharge_amount").
			SchemaType(map[string]string{dialect.Postgres: "decimal(20,8)"}),
		field.Float("granted_amount").
			SchemaType(map[string]string{dialect.Postgres: "decimal(20,8)"}),
		field.Float("balance_before").
			SchemaType(map[string]string{dialect.Postgres: "decimal(20,8)"}),
		field.Float("balance_after").
			SchemaType(map[string]string{dialect.Postgres: "decimal(20,8)"}),
		field.Time("claimed_at").
			SchemaType(map[string]string{dialect.Postgres: "timestamptz"}),
		field.String("source_redeem_code").
			Optional().
			Nillable().
			MaxLen(64),
		field.JSON("metadata", map[string]any{}).
			Optional().
			SchemaType(map[string]string{dialect.Postgres: "jsonb"}),
	}
}

func (BenefitClaim) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("campaign", BenefitCampaign.Type).
			Ref("claims").
			Field("campaign_id").
			Required().
			Unique(),
		edge.From("user", User.Type).
			Ref("benefit_claims").
			Field("user_id").
			Required().
			Unique(),
	}
}

func (BenefitClaim) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("campaign_id"),
		index.Fields("user_id"),
		index.Fields("campaign_id", "user_id").Unique(),
		index.Fields("claimed_at"),
	}
}
```

- [ ] **Step 5: Add user edge**

Modify `backend/ent/schema/user.go` in `Edges()` and add:

```go
edge.To("benefit_claims", BenefitClaim.Type),
```

- [ ] **Step 6: Add SQL migration**

Create `backend/migrations/154_benefit_campaigns.sql`:

```sql
CREATE TABLE IF NOT EXISTS benefit_campaigns (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    visible BOOLEAN NOT NULL DEFAULT TRUE,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    threshold_amount DECIMAL(20,8) NOT NULL,
    grant_amount DECIMAL(20,8) NOT NULL,
    recharge_scope VARCHAR(32) NOT NULL DEFAULT 'lifetime',
    copy JSONB NOT NULL DEFAULT '{}'::jsonb,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT chk_benefit_campaigns_window CHECK (ends_at > starts_at),
    CONSTRAINT chk_benefit_campaigns_amounts CHECK (threshold_amount > 0 AND grant_amount > 0),
    CONSTRAINT chk_benefit_campaigns_recharge_scope CHECK (recharge_scope IN ('lifetime', 'campaign_window'))
);

CREATE TABLE IF NOT EXISTS benefit_claims (
    id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES benefit_campaigns(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'claimed',
    eligible_recharge_amount DECIMAL(20,8) NOT NULL,
    granted_amount DECIMAL(20,8) NOT NULL,
    balance_before DECIMAL(20,8) NOT NULL,
    balance_after DECIMAL(20,8) NOT NULL,
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_redeem_code VARCHAR(64) NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_benefit_claims_status CHECK (status IN ('claimed')),
    CONSTRAINT benefit_claims_campaign_user_unique UNIQUE (campaign_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_benefit_campaigns_enabled ON benefit_campaigns(enabled);
CREATE INDEX IF NOT EXISTS idx_benefit_campaigns_visible ON benefit_campaigns(visible);
CREATE INDEX IF NOT EXISTS idx_benefit_campaigns_window ON benefit_campaigns(starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_benefit_campaigns_visible_sort ON benefit_campaigns(visible, sort_order);
CREATE INDEX IF NOT EXISTS idx_benefit_campaigns_deleted_at ON benefit_campaigns(deleted_at);
CREATE INDEX IF NOT EXISTS idx_benefit_claims_campaign_id ON benefit_claims(campaign_id);
CREATE INDEX IF NOT EXISTS idx_benefit_claims_user_id ON benefit_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_benefit_claims_claimed_at ON benefit_claims(claimed_at);
```

- [ ] **Step 7: Generate Ent**

Run:

```powershell
cd backend
go generate ./ent
```

Expected: PASS and new generated packages such as `backend/ent/benefitcampaign` and `backend/ent/benefitclaim`.

- [ ] **Step 8: Run schema/migration tests**

Run:

```powershell
cd backend
go test ./migrations -run TestBenefitCampaignMigrationDefinesCampaignsAndClaims -count=1
go test -tags=unit ./internal/repository -run TestSoftDelete -count=1
```

Expected: PASS.

- [ ] **Step 9: Commit**

```powershell
git add backend/ent backend/migrations/154_benefit_campaigns.sql backend/migrations/benefit_campaigns_schema_test.go
git commit -m "feat: add benefit campaign schema"
```

---

### Task 2: Backend Domain Types And Repository

**Files:**
- Create: `backend/internal/service/benefit.go`
- Create: `backend/internal/service/benefit_repository.go`
- Create: `backend/internal/repository/benefit_repo.go`
- Modify: `backend/internal/repository/wire.go`
- Test: `backend/internal/repository/benefit_repo_test.go`

- [ ] **Step 1: Write repository integration test**

Create `backend/internal/repository/benefit_repo_test.go`:

```go
//go:build unit

package repository

import (
	"context"
	"database/sql"
	"testing"
	"time"

	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/ent/enttest"
	"github.com/Wei-Shaw/sub2api/internal/pkg/pagination"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/stretchr/testify/require"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	_ "modernc.org/sqlite"
)

func TestBenefitRepositoryCreateListAndClaim(t *testing.T) {
	ctx := context.Background()
	client := newBenefitRepoTestClient(t)
	repo := NewBenefitRepository(client)
	now := time.Now().UTC()

	campaign := &service.BenefitCampaign{
		Name:            "Recharge 100 get 10",
		Enabled:         true,
		Visible:         true,
		StartsAt:        now.Add(-time.Hour),
		EndsAt:          now.Add(time.Hour),
		ThresholdAmount: 100,
		GrantAmount:     10,
		RechargeScope:   service.BenefitRechargeScopeLifetime,
		Copy:            service.DefaultBenefitCampaignCopy(),
		SortOrder:       3,
	}
	require.NoError(t, repo.CreateCampaign(ctx, campaign))
	require.NotZero(t, campaign.ID)

	list, page, err := repo.ListCampaigns(ctx, pagination.PaginationParams{Page: 1, PageSize: 20}, service.BenefitCampaignFilters{})
	require.NoError(t, err)
	require.Equal(t, int64(1), page.Total)
	require.Len(t, list, 1)
	require.Equal(t, "Recharge 100 get 10", list[0].Name)

	user, err := client.User.Create().
		SetEmail("benefit-repo@example.com").
		SetPasswordHash("hash").
		SetUsername("benefit-repo").
		SetBalance(12).
		SetTotalRecharged(120).
		Save(ctx)
	require.NoError(t, err)

	existing, err := repo.GetClaimByCampaignAndUser(ctx, campaign.ID, user.ID)
	require.NoError(t, err)
	require.Nil(t, existing)

	claim := &service.BenefitClaim{
		CampaignID:              campaign.ID,
		UserID:                  user.ID,
		Status:                  service.BenefitClaimStatusClaimed,
		EligibleRechargeAmount:  120,
		GrantedAmount:          10,
		BalanceBefore:          12,
		BalanceAfter:           22,
		ClaimedAt:              now,
		Metadata:               map[string]any{"scope": "lifetime"},
	}
	require.NoError(t, repo.CreateClaim(ctx, claim))
	require.NotZero(t, claim.ID)

	got, err := repo.GetClaimByCampaignAndUser(ctx, campaign.ID, user.ID)
	require.NoError(t, err)
	require.NotNil(t, got)
	require.Equal(t, 10.0, got.GrantedAmount)
}

func TestBenefitRepositoryCreditUserBalanceOnlyDoesNotIncreaseTotalRecharged(t *testing.T) {
	ctx := context.Background()
	client := newBenefitRepoTestClient(t)
	repo := NewBenefitRepository(client)

	user, err := client.User.Create().
		SetEmail("benefit-credit@example.com").
		SetPasswordHash("hash").
		SetUsername("benefit-credit").
		SetBalance(5).
		SetTotalRecharged(100).
		Save(ctx)
	require.NoError(t, err)

	require.NoError(t, repo.CreditUserBalanceOnly(ctx, user.ID, 10))

	reloaded, err := client.User.Get(ctx, user.ID)
	require.NoError(t, err)
	require.Equal(t, 15.0, reloaded.Balance)
	require.Equal(t, 100.0, reloaded.TotalRecharged)
}

func newBenefitRepoTestClient(t *testing.T) *dbent.Client {
	t.Helper()
	db, err := sql.Open("sqlite", "file:benefit_repo?mode=memory&cache=shared&_fk=1")
	require.NoError(t, err)
	t.Cleanup(func() { _ = db.Close() })
	_, err = db.Exec("PRAGMA foreign_keys = ON")
	require.NoError(t, err)
	drv := entsql.OpenDB(dialect.SQLite, db)
	client := enttest.NewClient(t, enttest.WithOptions(dbent.Driver(drv)))
	t.Cleanup(func() { _ = client.Close() })
	return client
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd backend
go test -tags=unit ./internal/repository -run 'TestBenefitRepositoryCreateListAndClaim|TestBenefitRepositoryCreditUserBalanceOnlyDoesNotIncreaseTotalRecharged' -count=1
```

Expected: FAIL because benefit service types, benefit repository, and `CreditUserBalanceOnly` do not exist.

- [ ] **Step 3: Add domain types**

Create `backend/internal/service/benefit.go`:

```go
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
	ID                int64
	Name              string
	Enabled           bool
	Visible           bool
	StartsAt          time.Time
	EndsAt            time.Time
	ThresholdAmount   float64
	GrantAmount       float64
	RechargeScope     string
	Copy              BenefitCampaignCopy
	SortOrder         int
	ClaimCount        int
	CreatedAt         time.Time
	UpdatedAt         time.Time
	DeletedAt         *time.Time
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
	Name              string
	Enabled           bool
	Visible           bool
	StartsAt          time.Time
	EndsAt            time.Time
	ThresholdAmount   float64
	GrantAmount       float64
	RechargeScope     string
	Copy              BenefitCampaignCopy
	SortOrder         int
}

type UpdateBenefitCampaignInput struct {
	Name              *string
	Enabled           *bool
	Visible           *bool
	StartsAt          *time.Time
	EndsAt            *time.Time
	ThresholdAmount   *float64
	GrantAmount       *float64
	RechargeScope     *string
	Copy              *BenefitCampaignCopy
	SortOrder         *int
}

type BenefitCampaignView struct {
	Campaign              BenefitCampaign
	State                 string
	EligibleRechargeAmount float64
	Claim                 *BenefitClaim
}

type BenefitClaimResult struct {
	Campaign BenefitCampaign
	Claim    BenefitClaim
	Balance  float64
}
```

- [ ] **Step 4: Add repository interface**

Create `backend/internal/service/benefit_repository.go`:

```go
package service

import (
	"context"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/pkg/pagination"
)

type BenefitRepository interface {
	CreateCampaign(ctx context.Context, campaign *BenefitCampaign) error
	GetCampaignByID(ctx context.Context, id int64) (*BenefitCampaign, error)
	UpdateCampaign(ctx context.Context, campaign *BenefitCampaign) error
	DeleteCampaign(ctx context.Context, id int64) error
	ListCampaigns(ctx context.Context, params pagination.PaginationParams, filters BenefitCampaignFilters) ([]BenefitCampaign, *pagination.PaginationResult, error)
	ListVisibleCampaigns(ctx context.Context) ([]BenefitCampaign, error)
	CountClaimsByCampaignIDs(ctx context.Context, campaignIDs []int64) (map[int64]int, error)
	CreateClaim(ctx context.Context, claim *BenefitClaim) error
	GetClaimByCampaignAndUser(ctx context.Context, campaignID, userID int64) (*BenefitClaim, error)
	ListClaimsByCampaign(ctx context.Context, campaignID int64, params pagination.PaginationParams) ([]BenefitClaim, *pagination.PaginationResult, error)
	SumCompletedRechargeInWindow(ctx context.Context, userID int64, startsAt, endsAt time.Time) (float64, error)
	CreditUserBalanceOnly(ctx context.Context, userID int64, amount float64) error
}
```

- [ ] **Step 5: Add balance-only credit method**

Add this method to `backend/internal/repository/benefit_repo.go`:

```go
func (r *benefitRepository) CreditUserBalanceOnly(ctx context.Context, userID int64, amount float64) error {
	client := clientFromContext(ctx, r.client)
	n, err := client.User.Update().
		Where(dbuser.IDEQ(userID)).
		AddBalance(amount).
		Save(ctx)
	if err != nil {
		return translatePersistenceError(err, service.ErrUserNotFound, nil)
	}
	if n == 0 {
		return service.ErrUserNotFound
	}
	return nil
}
```

Import `github.com/Wei-Shaw/sub2api/ent/user` as `dbuser` in `benefit_repo.go`. Do not call `UserRepository.UpdateBalance` for benefit grants. `UpdateBalance` intentionally increments `total_recharged` for positive amounts, and benefit grants must not change recharge eligibility totals.

- [ ] **Step 6: Implement repository**

Create `backend/internal/repository/benefit_repo.go` with this package header, imports, repository struct, and constructor:

```go
package repository

import (
	"context"
	"strings"
	"time"

	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/ent/benefitcampaign"
	"github.com/Wei-Shaw/sub2api/ent/benefitclaim"
	"github.com/Wei-Shaw/sub2api/ent/paymentorder"
	"github.com/Wei-Shaw/sub2api/internal/payment"
	"github.com/Wei-Shaw/sub2api/internal/pkg/pagination"
	"github.com/Wei-Shaw/sub2api/internal/service"

	entsql "entgo.io/ent/dialect/sql"
)

type benefitRepository struct {
	client *dbent.Client
}

func NewBenefitRepository(client *dbent.Client) service.BenefitRepository {
	return &benefitRepository{client: client}
}
```

Implement `CreateCampaign` with `clientFromContext(ctx, r.client).BenefitCampaign.Create()`.

Implement `GetCampaignByID`; translate Ent not-found to `service.ErrBenefitCampaignNotFound`.

Implement `UpdateCampaign`; set all persisted fields from the supplied campaign.

Implement `DeleteCampaign` with `BenefitCampaign.DeleteOneID(id).Exec(ctx)` so the soft-delete mixin marks `deleted_at`.

Implement `ListCampaigns`; support `Enabled`, `Visible`, `Search`, sort by `sort_order`, `created_at`, `starts_at`, `ends_at`, `threshold_amount`, `grant_amount`, and default `id desc`.

Implement `ListVisibleCampaigns`; query `VisibleEQ(true)`, `EnabledEQ(true)`, ordered by `sort_order asc`, `id desc`.

Implement `CountClaimsByCampaignIDs`; query `BenefitClaim` grouped by `campaign_id` using Ent query `GroupBy(...).Aggregate(ent.Count())`.

Implement `CreateClaim`; set every claim field and optional `SourceRedeemCode`.

Implement `GetClaimByCampaignAndUser`; return `(nil, nil)` on Ent not-found.

Implement `ListClaimsByCampaign`; query with `.WithUser()` and `claimed_at desc`.

Implement `SumCompletedRechargeInWindow`; query `PaymentOrder` where:

```go
paymentorder.UserIDEQ(userID),
paymentorder.OrderTypeEQ(payment.OrderTypeBalance),
paymentorder.StatusEQ(payment.OrderStatusCompleted),
paymentorder.CompletedAtGTE(startsAt),
paymentorder.CompletedAtLTE(endsAt),
```

Then sum `Amount`.

Implement `benefitCampaignEntityToService`, `benefitClaimEntityToService`, and list conversion helpers. Merge empty copy with `service.DefaultBenefitCampaignCopy()`.

- [ ] **Step 7: Register repository provider**

Modify `backend/internal/repository/wire.go` ProviderSet and add:

```go
NewBenefitRepository,
```

near `NewPromoCodeRepository`.

- [ ] **Step 8: Run repository test**

Run:

```powershell
cd backend
go test -tags=unit ./internal/repository -run 'TestBenefitRepositoryCreateListAndClaim|TestBenefitRepositoryCreditUserBalanceOnlyDoesNotIncreaseTotalRecharged' -count=1
```

Expected: PASS.

- [ ] **Step 9: Commit**

```powershell
git add backend/internal/service/benefit.go backend/internal/service/benefit_repository.go backend/internal/repository/benefit_repo.go backend/internal/repository/benefit_repo_test.go backend/internal/repository/wire.go
git commit -m "feat: add benefit campaign repository"
```

---

### Task 3: Backend Benefit Service

**Files:**
- Create: `backend/internal/service/benefit_service.go`
- Create: `backend/internal/service/benefit_service_test.go`
- Modify: `backend/internal/service/wire.go`

- [ ] **Step 1: Write service tests**

Create `backend/internal/service/benefit_service_test.go` with in-memory fakes:

```go
//go:build unit

package service

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/pkg/pagination"
	"github.com/stretchr/testify/require"
)

func TestBenefitServiceListUserCampaignsStates(t *testing.T) {
	now := time.Date(2026, 6, 22, 12, 0, 0, 0, time.UTC)
	user := &User{ID: 7, Balance: 3, TotalRecharged: 120}
	repo := newMemoryBenefitRepo()
	repo.campaigns[1] = BenefitCampaign{ID: 1, Name: "future", Enabled: true, Visible: true, StartsAt: now.Add(time.Hour), EndsAt: now.Add(2 * time.Hour), ThresholdAmount: 100, GrantAmount: 10, RechargeScope: BenefitRechargeScopeLifetime, Copy: DefaultBenefitCampaignCopy()}
	repo.campaigns[2] = BenefitCampaign{ID: 2, Name: "ended", Enabled: true, Visible: true, StartsAt: now.Add(-2 * time.Hour), EndsAt: now.Add(-time.Hour), ThresholdAmount: 100, GrantAmount: 10, RechargeScope: BenefitRechargeScopeLifetime, Copy: DefaultBenefitCampaignCopy()}
	repo.campaigns[3] = BenefitCampaign{ID: 3, Name: "claimable", Enabled: true, Visible: true, StartsAt: now.Add(-time.Hour), EndsAt: now.Add(time.Hour), ThresholdAmount: 100, GrantAmount: 10, RechargeScope: BenefitRechargeScopeLifetime, Copy: DefaultBenefitCampaignCopy()}
	repo.campaigns[4] = BenefitCampaign{ID: 4, Name: "not eligible", Enabled: true, Visible: true, StartsAt: now.Add(-time.Hour), EndsAt: now.Add(time.Hour), ThresholdAmount: 200, GrantAmount: 10, RechargeScope: BenefitRechargeScopeLifetime, Copy: DefaultBenefitCampaignCopy()}
	repo.claims[key(5, user.ID)] = BenefitClaim{ID: 9, CampaignID: 5, UserID: user.ID, Status: BenefitClaimStatusClaimed, GrantedAmount: 10, ClaimedAt: now}
	repo.campaigns[5] = BenefitCampaign{ID: 5, Name: "claimed", Enabled: true, Visible: true, StartsAt: now.Add(-time.Hour), EndsAt: now.Add(time.Hour), ThresholdAmount: 100, GrantAmount: 10, RechargeScope: BenefitRechargeScopeLifetime, Copy: DefaultBenefitCampaignCopy()}

	svc := NewBenefitService(repo, &memoryBenefitUserRepo{user: user}, nil, nil)
	svc.now = func() time.Time { return now }

	views, err := svc.ListUserCampaigns(context.Background(), user.ID)
	require.NoError(t, err)
	require.Equal(t, []string{BenefitStateNotStarted, BenefitStateEnded, BenefitStateClaimable, BenefitStateNotEligible, BenefitStateClaimed}, collectBenefitStates(views))
}

func TestBenefitServiceClaimCreditsBalanceOnce(t *testing.T) {
	now := time.Date(2026, 6, 22, 12, 0, 0, 0, time.UTC)
	user := &User{ID: 7, Balance: 3, TotalRecharged: 120}
	repo := newMemoryBenefitRepo()
	repo.user = user
	repo.campaigns[1] = BenefitCampaign{ID: 1, Name: "claimable", Enabled: true, Visible: true, StartsAt: now.Add(-time.Hour), EndsAt: now.Add(time.Hour), ThresholdAmount: 100, GrantAmount: 10, RechargeScope: BenefitRechargeScopeLifetime, Copy: DefaultBenefitCampaignCopy()}
	userRepo := &memoryBenefitUserRepo{user: user}
	auth := &memoryBenefitAuthInvalidator{}
	cache := &memoryBenefitBillingCache{}
	svc := NewBenefitService(repo, userRepo, cache, auth)
	svc.now = func() time.Time { return now }

	result, err := svc.Claim(context.Background(), 1, user.ID)
	require.NoError(t, err)
	require.Equal(t, 13.0, result.Balance)
	require.Equal(t, 13.0, user.Balance)
	require.Equal(t, 1, repo.creditOnlyCalls)
	require.Equal(t, 0, userRepo.updateCalls)
	require.Equal(t, 120.0, user.TotalRecharged)
	require.Equal(t, 1, auth.calls)
	require.Equal(t, 1, cache.calls)

	_, err = svc.Claim(context.Background(), 1, user.ID)
	require.ErrorIs(t, err, ErrBenefitAlreadyClaimed)
	require.Equal(t, 13.0, user.Balance)
	require.Equal(t, 1, repo.creditOnlyCalls)
	require.Equal(t, 0, userRepo.updateCalls)
}

func TestBenefitServiceCampaignWindowEligibility(t *testing.T) {
	now := time.Date(2026, 6, 22, 12, 0, 0, 0, time.UTC)
	user := &User{ID: 7, Balance: 0, TotalRecharged: 999}
	repo := newMemoryBenefitRepo()
	repo.windowRecharge[7] = 60
	repo.campaigns[1] = BenefitCampaign{ID: 1, Name: "window", Enabled: true, Visible: true, StartsAt: now.Add(-time.Hour), EndsAt: now.Add(time.Hour), ThresholdAmount: 100, GrantAmount: 10, RechargeScope: BenefitRechargeScopeCampaignWindow, Copy: DefaultBenefitCampaignCopy()}
	svc := NewBenefitService(repo, &memoryBenefitUserRepo{user: user}, nil, nil)
	svc.now = func() time.Time { return now }

	views, err := svc.ListUserCampaigns(context.Background(), user.ID)
	require.NoError(t, err)
	require.Len(t, views, 1)
	require.Equal(t, BenefitStateNotEligible, views[0].State)
	require.Equal(t, 60.0, views[0].EligibleRechargeAmount)
}
```

Add fakes in the same file:

```go
type memoryBenefitRepo struct {
	mu             sync.Mutex
	campaigns      map[int64]BenefitCampaign
	claims         map[string]BenefitClaim
	windowRecharge map[int64]float64
	nextClaimID    int64
	creditOnlyCalls int
	user           *User
}

func newMemoryBenefitRepo() *memoryBenefitRepo {
	return &memoryBenefitRepo{campaigns: map[int64]BenefitCampaign{}, claims: map[string]BenefitClaim{}, windowRecharge: map[int64]float64{}, nextClaimID: 1}
}

func key(campaignID, userID int64) string { return fmt.Sprintf("%d:%d", campaignID, userID) }

func (r *memoryBenefitRepo) ListVisibleCampaigns(context.Context) ([]BenefitCampaign, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]BenefitCampaign, 0, len(r.campaigns))
	for _, campaign := range r.campaigns {
		if campaign.Enabled && campaign.Visible {
			out = append(out, campaign)
		}
	}
	return out, nil
}

func (r *memoryBenefitRepo) GetCampaignByID(_ context.Context, id int64) (*BenefitCampaign, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	campaign, ok := r.campaigns[id]
	if !ok {
		return nil, ErrBenefitCampaignNotFound
	}
	return &campaign, nil
}

func (r *memoryBenefitRepo) CreateClaim(_ context.Context, claim *BenefitClaim) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	k := key(claim.CampaignID, claim.UserID)
	if _, exists := r.claims[k]; exists {
		return ErrBenefitAlreadyClaimed
	}
	claim.ID = r.nextClaimID
	r.nextClaimID++
	r.claims[k] = *claim
	return nil
}

func (r *memoryBenefitRepo) GetClaimByCampaignAndUser(_ context.Context, campaignID, userID int64) (*BenefitClaim, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	claim, ok := r.claims[key(campaignID, userID)]
	if !ok {
		return nil, nil
	}
	return &claim, nil
}

func (r *memoryBenefitRepo) SumCompletedRechargeInWindow(_ context.Context, userID int64, _, _ time.Time) (float64, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.windowRecharge[userID], nil
}

func (r *memoryBenefitRepo) CreditUserBalanceOnly(_ context.Context, _ int64, amount float64) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.creditOnlyCalls++
	if r.user != nil {
		r.user.Balance += amount
	}
	return nil
}
```

Add these no-op methods so the fake satisfies `BenefitRepository`:

```go
func (r *memoryBenefitRepo) CreateCampaign(context.Context, *BenefitCampaign) error { panic("not used") }
func (r *memoryBenefitRepo) UpdateCampaign(context.Context, *BenefitCampaign) error { panic("not used") }
func (r *memoryBenefitRepo) DeleteCampaign(context.Context, int64) error { panic("not used") }
func (r *memoryBenefitRepo) ListCampaigns(context.Context, pagination.PaginationParams, BenefitCampaignFilters) ([]BenefitCampaign, *pagination.PaginationResult, error) {
	panic("not used")
}
func (r *memoryBenefitRepo) CountClaimsByCampaignIDs(context.Context, []int64) (map[int64]int, error) { panic("not used") }
func (r *memoryBenefitRepo) ListClaimsByCampaign(context.Context, int64, pagination.PaginationParams) ([]BenefitClaim, *pagination.PaginationResult, error) {
	panic("not used")
}
```

Add `memoryBenefitUserRepo` with these fields and methods:

```go
type memoryBenefitUserRepo struct {
	user            *User
	updateCalls     int
}

func (r *memoryBenefitUserRepo) GetByID(context.Context, int64) (*User, error) {
	copied := *r.user
	return &copied, nil
}

func (r *memoryBenefitUserRepo) UpdateBalance(context.Context, int64, float64) error {
	r.updateCalls++
	return nil
}
```

Add panic stubs for every other `benefitUserReader` method if that narrow interface grows; do not make `memoryBenefitUserRepo` satisfy the full `UserRepository` interface.

Add:

```go
type memoryBenefitAuthInvalidator struct{ calls int }
func (m *memoryBenefitAuthInvalidator) InvalidateAuthCacheByKey(context.Context, string) {}
func (m *memoryBenefitAuthInvalidator) InvalidateAuthCacheByUserID(context.Context, int64) { m.calls++ }
func (m *memoryBenefitAuthInvalidator) InvalidateAuthCacheByGroupID(context.Context, int64) {}

type memoryBenefitBillingCache struct{ calls int }
func (m *memoryBenefitBillingCache) InvalidateUserBalance(context.Context, int64) error { m.calls++; return nil }
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
cd backend
go test -tags=unit ./internal/service -run TestBenefitService -count=1
```

Expected: FAIL because `NewBenefitService` does not exist.

- [ ] **Step 3: Implement service**

Create `backend/internal/service/benefit_service.go`:

```go
package service

import (
	"context"
	"fmt"
	"log/slog"
	"errors"
	"strings"
	"time"

	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/internal/pkg/pagination"
)

type BenefitService struct {
	repo                 BenefitRepository
	userRepo             benefitUserReader
	billingCacheService  benefitBalanceCacheInvalidator
	authCacheInvalidator APIKeyAuthCacheInvalidator
	entClient            *dbent.Client
	now                  func() time.Time
}

type benefitUserReader interface {
	GetByID(ctx context.Context, id int64) (*User, error)
}

type benefitBalanceCacheInvalidator interface {
	InvalidateUserBalance(ctx context.Context, userID int64) error
}

func NewBenefitService(repo BenefitRepository, userRepo benefitUserReader, billingCacheService benefitBalanceCacheInvalidator, authCacheInvalidator APIKeyAuthCacheInvalidator) *BenefitService {
	return &BenefitService{repo: repo, userRepo: userRepo, billingCacheService: billingCacheService, authCacheInvalidator: authCacheInvalidator, now: time.Now}
}

func ProvideBenefitService(repo BenefitRepository, userRepo UserRepository, billingCacheService *BillingCacheService, authCacheInvalidator APIKeyAuthCacheInvalidator, entClient *dbent.Client) *BenefitService {
	svc := NewBenefitService(repo, userRepo, billingCacheService, authCacheInvalidator)
	svc.entClient = entClient
	return svc
}
```

Implement methods:

- `CreateCampaign(ctx, input) (*BenefitCampaign, error)`
- `UpdateCampaign(ctx, id, input) (*BenefitCampaign, error)`
- `DeleteCampaign(ctx, id) error`
- `GetCampaign(ctx, id) (*BenefitCampaign, error)`
- `ListCampaigns(ctx, params, filters) ([]BenefitCampaign, *pagination.PaginationResult, error)`
- `ListClaims(ctx, campaignID, params) ([]BenefitClaim, *pagination.PaginationResult, error)`
- `ListUserCampaigns(ctx, userID) ([]BenefitCampaignView, error)`
- `Claim(ctx, campaignID, userID) (*BenefitClaimResult, error)`

Validation rules:

```go
func validateBenefitCampaign(c *BenefitCampaign) error {
	if strings.TrimSpace(c.Name) == "" || len(c.Name) > 120 { return ErrBenefitCampaignInvalid }
	if !c.EndsAt.After(c.StartsAt) { return ErrBenefitCampaignInvalid }
	if c.ThresholdAmount <= 0 || c.GrantAmount <= 0 { return ErrBenefitCampaignInvalid }
	if c.RechargeScope != BenefitRechargeScopeLifetime && c.RechargeScope != BenefitRechargeScopeCampaignWindow { return ErrBenefitCampaignInvalid }
	c.Copy = normalizeBenefitCopy(c.Copy)
	return nil
}
```

State evaluation order:

1. claimed
2. not_started
3. ended
4. not_eligible
5. claimable

`eligibleRechargeAmount`:

- lifetime: `user.TotalRecharged`
- campaign window: `repo.SumCompletedRechargeInWindow(ctx, userID, campaign.StartsAt, campaign.EndsAt)`

Claim implementation:

```go
func (s *BenefitService) Claim(ctx context.Context, campaignID, userID int64) (*BenefitClaimResult, error) {
	campaign, err := s.repo.GetCampaignByID(ctx, campaignID)
	if err != nil { return nil, err }
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil { return nil, err }
	if err := s.ensureClaimableCampaign(ctx, campaign, user); err != nil { return nil, err }
	eligible, err := s.eligibleRechargeAmount(ctx, campaign, user)
	if err != nil { return nil, err }
	if eligible < campaign.ThresholdAmount { return nil, ErrBenefitNotEligible }
	if existing, err := s.repo.GetClaimByCampaignAndUser(ctx, campaign.ID, userID); err != nil {
		return nil, err
	} else if existing != nil {
		return nil, ErrBenefitAlreadyClaimed
	}
	return s.runClaimTransaction(ctx, func(txCtx context.Context) (*BenefitClaimResult, error) {
		latest, err := s.userRepo.GetByID(txCtx, userID)
		if err != nil { return nil, err }
		balanceBefore := latest.Balance
		claim := &BenefitClaim{
			CampaignID: campaign.ID, UserID: userID,
			Status: BenefitClaimStatusClaimed,
			EligibleRechargeAmount: eligible,
			GrantedAmount: campaign.GrantAmount,
			BalanceBefore: balanceBefore,
			BalanceAfter: balanceBefore + campaign.GrantAmount,
			ClaimedAt: s.now(),
			Metadata: map[string]any{"recharge_scope": campaign.RechargeScope},
		}
		if err := s.repo.CreateClaim(txCtx, claim); err != nil {
			if isBenefitDuplicateClaimError(err) { return nil, ErrBenefitAlreadyClaimed }
			return nil, err
		}
		if err := s.repo.CreditUserBalanceOnly(txCtx, userID, campaign.GrantAmount); err != nil {
			return nil, fmt.Errorf("credit benefit balance: %w", err)
		}
		result := &BenefitClaimResult{Campaign: *campaign, Claim: *claim, Balance: claim.BalanceAfter}
		return result, nil
	})
}
```

`runClaimTransaction`:

- If `s.entClient` is nil, call the function with the original context for unit tests.
- If `s.entClient` is set, start `tx, err := s.entClient.Tx(ctx)`, defer rollback, pass `dbent.NewTxContext(ctx, tx)` to the function, then commit.
- Return commit errors as `fmt.Errorf("commit benefit claim transaction: %w", err)`.
- Map Ent/Postgres/SQLite unique-constraint errors from `repo.CreateClaim` to `ErrBenefitAlreadyClaimed` in `isBenefitDuplicateClaimError`.

Do not call `userRepo.UpdateBalance` in claim fulfillment. Use `repo.CreditUserBalanceOnly` so benefit grants do not increase `users.total_recharged`.

After commit:

- invalidate auth cache if present
- call `billingCacheService.InvalidateUserBalance` with a bounded goroutine and panic recovery, mirroring `UserService.UpdateBalance`

- [ ] **Step 4: Add Wire provider**

Modify `backend/internal/service/wire.go` ProviderSet and add:

```go
ProvideBenefitService,
```

near `NewPromoService`.

- [ ] **Step 5: Run service tests**

Run:

```powershell
cd backend
go test -tags=unit ./internal/service -run TestBenefitService -count=1
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add backend/internal/service/benefit.go backend/internal/service/benefit_repository.go backend/internal/service/benefit_service.go backend/internal/service/benefit_service_test.go backend/internal/service/wire.go
git commit -m "feat: add benefit campaign service"
```

---

### Task 4: Backend Handlers And Routes

**Files:**
- Create: `backend/internal/handler/dto/benefit.go`
- Create: `backend/internal/handler/benefit_handler.go`
- Create: `backend/internal/handler/admin/benefit_handler.go`
- Modify: `backend/internal/handler/handler.go`
- Modify: `backend/internal/handler/wire.go`
- Modify: `backend/internal/server/routes/user.go`
- Modify: `backend/internal/server/routes/admin.go`
- Test: `backend/internal/handler/benefit_handler_test.go`
- Test: `backend/internal/handler/admin/benefit_handler_test.go`

- [ ] **Step 1: Write user handler test**

Create `backend/internal/handler/benefit_handler_test.go`:

```go
//go:build unit

package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestBenefitHandlerListAndClaim(t *testing.T) {
	gin.SetMode(gin.TestMode)
	now := time.Date(2026, 6, 22, 12, 0, 0, 0, time.UTC)
	svc := &stubBenefitService{
		views: []service.BenefitCampaignView{{
			Campaign: service.BenefitCampaign{ID: 1, Name: "Recharge 100", StartsAt: now.Add(-time.Hour), EndsAt: now.Add(time.Hour), ThresholdAmount: 100, GrantAmount: 10, RechargeScope: service.BenefitRechargeScopeLifetime, Copy: service.DefaultBenefitCampaignCopy()},
			State: service.BenefitStateClaimable,
			EligibleRechargeAmount: 120,
		}},
		claim: &service.BenefitClaimResult{
			Balance: 13,
			Campaign: service.BenefitCampaign{ID: 1, Name: "Recharge 100", GrantAmount: 10, Copy: service.DefaultBenefitCampaignCopy()},
			Claim: service.BenefitClaim{ID: 9, CampaignID: 1, UserID: 7, GrantedAmount: 10, ClaimedAt: now},
		},
	}
	h := NewBenefitHandler(svc)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("user_id", int64(7))
		c.Next()
	})
	r.GET("/benefits/campaigns", h.List)
	r.POST("/benefits/campaigns/:id/claim", h.Claim)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/benefits/campaigns", nil)
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	require.Contains(t, w.Body.String(), `"state":"claimable"`)

	w = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/benefits/campaigns/1/claim", nil)
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	require.Contains(t, w.Body.String(), `"balance":13`)
}
```

Add the `stubBenefitService` methods required by the handler.

- [ ] **Step 2: Run handler test to verify failure**

Run:

```powershell
cd backend
go test -tags=unit ./internal/handler -run TestBenefitHandlerListAndClaim -count=1
```

Expected: FAIL because handler does not exist.

- [ ] **Step 3: Add DTO mapping**

Create `backend/internal/handler/dto/benefit.go`:

```go
package dto

import (
	"time"

	"github.com/Wei-Shaw/sub2api/internal/service"
)

type BenefitCampaignCopy = service.BenefitCampaignCopy

type BenefitCampaign struct {
	ID                int64               `json:"id"`
	Name              string              `json:"name"`
	Enabled           bool                `json:"enabled"`
	Visible           bool                `json:"visible"`
	StartsAt          time.Time           `json:"starts_at"`
	EndsAt            time.Time           `json:"ends_at"`
	ThresholdAmount   float64             `json:"threshold_amount"`
	GrantAmount       float64             `json:"grant_amount"`
	RechargeScope     string              `json:"recharge_scope"`
	Copy              BenefitCampaignCopy `json:"copy"`
	SortOrder         int                 `json:"sort_order"`
	ClaimCount        int                 `json:"claim_count"`
	CreatedAt         time.Time           `json:"created_at"`
	UpdatedAt         time.Time           `json:"updated_at"`
}

type BenefitClaim struct {
	ID                     int64      `json:"id"`
	CampaignID             int64      `json:"campaign_id"`
	UserID                 int64      `json:"user_id"`
	Status                 string     `json:"status"`
	EligibleRechargeAmount float64    `json:"eligible_recharge_amount"`
	GrantedAmount          float64    `json:"granted_amount"`
	BalanceBefore          float64    `json:"balance_before"`
	BalanceAfter           float64    `json:"balance_after"`
	ClaimedAt              time.Time  `json:"claimed_at"`
	SourceRedeemCode       *string    `json:"source_redeem_code,omitempty"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
	User                   *User      `json:"user,omitempty"`
}

type BenefitCampaignView struct {
	Campaign              BenefitCampaign `json:"campaign"`
	State                 string          `json:"state"`
	EligibleRechargeAmount float64        `json:"eligible_recharge_amount"`
	Claim                 *BenefitClaim   `json:"claim,omitempty"`
}

func BenefitCampaignFromService(in *service.BenefitCampaign) *BenefitCampaign {
	if in == nil { return nil }
	return &BenefitCampaign{ID: in.ID, Name: in.Name, Enabled: in.Enabled, Visible: in.Visible, StartsAt: in.StartsAt, EndsAt: in.EndsAt, ThresholdAmount: in.ThresholdAmount, GrantAmount: in.GrantAmount, RechargeScope: in.RechargeScope, Copy: in.Copy, SortOrder: in.SortOrder, ClaimCount: in.ClaimCount, CreatedAt: in.CreatedAt, UpdatedAt: in.UpdatedAt}
}

func BenefitClaimFromService(in *service.BenefitClaim) *BenefitClaim {
	if in == nil { return nil }
	out := &BenefitClaim{ID: in.ID, CampaignID: in.CampaignID, UserID: in.UserID, Status: in.Status, EligibleRechargeAmount: in.EligibleRechargeAmount, GrantedAmount: in.GrantedAmount, BalanceBefore: in.BalanceBefore, BalanceAfter: in.BalanceAfter, ClaimedAt: in.ClaimedAt, SourceRedeemCode: in.SourceRedeemCode, CreatedAt: in.CreatedAt, UpdatedAt: in.UpdatedAt}
	if in.User != nil { out.User = UserFromService(in.User) }
	return out
}
```

- [ ] **Step 4: Add user handler**

Create `backend/internal/handler/benefit_handler.go`:

```go
package handler

import (
	"strconv"

	"github.com/Wei-Shaw/sub2api/internal/handler/dto"
	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

type benefitUserService interface {
	ListUserCampaigns(ctx context.Context, userID int64) ([]service.BenefitCampaignView, error)
	Claim(ctx context.Context, campaignID, userID int64) (*service.BenefitClaimResult, error)
}

type BenefitHandler struct {
	benefitService benefitUserService
}

func NewBenefitHandler(benefitService *service.BenefitService) *BenefitHandler {
	return &BenefitHandler{benefitService: benefitService}
}
```

Import `context`.

Implement:

- `List(c *gin.Context)`: read auth subject with `middleware.GetAuthSubjectFromContext(c)`, call service, map to DTOs.
- `Claim(c *gin.Context)`: parse `id`, read subject, call `Claim`, return `{"campaign": ..., "claim": ..., "balance": ...}`.

- [ ] **Step 5: Add admin handler**

Create `backend/internal/handler/admin/benefit_handler.go` with request structs:

```go
type BenefitCampaignRequest struct {
	Name              string                   `json:"name"`
	Enabled           bool                     `json:"enabled"`
	Visible           bool                     `json:"visible"`
	StartsAt          int64                    `json:"starts_at"`
	EndsAt            int64                    `json:"ends_at"`
	ThresholdAmount   float64                  `json:"threshold_amount"`
	GrantAmount       float64                  `json:"grant_amount"`
	RechargeScope     string                   `json:"recharge_scope"`
	Copy              service.BenefitCampaignCopy `json:"copy"`
	SortOrder         int                      `json:"sort_order"`
}
```

Implement `List`, `GetByID`, `Create`, `Update`, `Delete`, and `ListClaims`, using `response.ParsePagination`, `pagination.PaginationParams`, and DTO mapping.

- [ ] **Step 6: Wire handler structs**

Modify `backend/internal/handler/handler.go`:

```go
Benefit *admin.BenefitHandler
```

inside `AdminHandlers`, and:

```go
Benefit *BenefitHandler
```

inside `Handlers`.

Modify `backend/internal/handler/wire.go`:

- Add `benefitHandler *admin.BenefitHandler` parameter to `ProvideAdminHandlers`.
- Set `Benefit: benefitHandler`.
- Add `benefitHandler *BenefitHandler` parameter to `ProvideHandlers`.
- Set `Benefit: benefitHandler`.
- Add providers `NewBenefitHandler` and `admin.NewBenefitHandler` to `ProviderSet`.

- [ ] **Step 7: Register routes**

Modify `backend/internal/server/routes/user.go` inside authenticated group:

```go
benefits := authenticated.Group("/benefits")
{
	benefits.GET("/campaigns", h.Benefit.List)
	benefits.POST("/campaigns/:id/claim", h.Benefit.Claim)
}
```

Modify `backend/internal/server/routes/admin.go`:

```go
registerBenefitRoutes(admin, h)
```

Add:

```go
func registerBenefitRoutes(admin *gin.RouterGroup, h *handler.Handlers) {
	benefits := admin.Group("/benefits")
	{
		campaigns := benefits.Group("/campaigns")
		{
			campaigns.GET("", h.Admin.Benefit.List)
			campaigns.POST("", h.Admin.Benefit.Create)
			campaigns.GET("/:id", h.Admin.Benefit.GetByID)
			campaigns.PUT("/:id", h.Admin.Benefit.Update)
			campaigns.DELETE("/:id", h.Admin.Benefit.Delete)
			campaigns.GET("/:id/claims", h.Admin.Benefit.ListClaims)
		}
	}
}
```

- [ ] **Step 8: Generate Wire**

Run:

```powershell
cd backend
go generate ./cmd/server
```

Expected: PASS.

- [ ] **Step 9: Run handler tests and compile**

Run:

```powershell
cd backend
go test -tags=unit ./internal/handler -run TestBenefitHandlerListAndClaim -count=1
go test ./cmd/server -run TestWireGenCompiles -count=1
```

Expected: PASS.

- [ ] **Step 10: Commit**

```powershell
git add backend/internal/handler backend/internal/server/routes backend/cmd/server/wire_gen.go
git commit -m "feat: expose benefit campaign APIs"
```

---

### Task 5: Backend End-To-End Service Verification

**Files:**
- Test: `backend/internal/service/benefit_service_ent_test.go`

- [ ] **Step 1: Write Ent-backed service test**

Create `backend/internal/service/benefit_service_ent_test.go`:

```go
//go:build unit

package service

import (
	"context"
	"database/sql"
	"errors"
	"sync"
	"testing"
	"time"

	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/ent/enttest"
	"github.com/Wei-Shaw/sub2api/internal/payment"
	"github.com/Wei-Shaw/sub2api/internal/repository"
	"github.com/stretchr/testify/require"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	_ "modernc.org/sqlite"
)

func TestBenefitServiceEntConcurrentClaimCreditsOnce(t *testing.T) {
	ctx := context.Background()
	client := newBenefitServiceEntClient(t)
	userRepo := repository.NewUserRepository(client, nil)
	benefitRepo := repository.NewBenefitRepository(client)
	svc := ProvideBenefitService(benefitRepo, userRepo, nil, nil, client)
	now := time.Date(2026, 6, 22, 12, 0, 0, 0, time.UTC)
	svc.now = func() time.Time { return now }

	user, err := client.User.Create().
		SetEmail("benefit-ent@example.com").
		SetPasswordHash("hash").
		SetUsername("benefit-ent").
		SetBalance(1).
		SetTotalRecharged(120).
		Save(ctx)
	require.NoError(t, err)

	campaign, err := svc.CreateCampaign(ctx, CreateBenefitCampaignInput{
		Name: "Recharge 100 get 10", Enabled: true, Visible: true,
		StartsAt: now.Add(-time.Hour), EndsAt: now.Add(time.Hour),
		ThresholdAmount: 100, GrantAmount: 10,
		RechargeScope: BenefitRechargeScopeLifetime,
		Copy: DefaultBenefitCampaignCopy(),
	})
	require.NoError(t, err)

	var wg sync.WaitGroup
	errs := make(chan error, 2)
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, claimErr := svc.Claim(ctx, campaign.ID, user.ID)
			errs <- claimErr
		}()
	}
	wg.Wait()
	close(errs)

	var successes int
	var conflicts int
	for err := range errs {
		if err == nil { successes++ }
		if err != nil && errors.Is(err, ErrBenefitAlreadyClaimed) { conflicts++ }
	}
	require.Equal(t, 1, successes)
	require.Equal(t, 1, conflicts)

	reloaded, err := client.User.Get(ctx, user.ID)
	require.NoError(t, err)
	require.Equal(t, 11.0, reloaded.Balance)
	require.Equal(t, 120.0, reloaded.TotalRecharged)
	count, err := client.BenefitClaim.Query().Count(ctx)
	require.NoError(t, err)
	require.Equal(t, 1, count)
}

func TestBenefitServiceCampaignWindowUsesCompletedBalanceOrders(t *testing.T) {
	ctx := context.Background()
	client := newBenefitServiceEntClient(t)
	userRepo := repository.NewUserRepository(client, nil)
	benefitRepo := repository.NewBenefitRepository(client)
	svc := ProvideBenefitService(benefitRepo, userRepo, nil, nil, client)
	now := time.Date(2026, 6, 22, 12, 0, 0, 0, time.UTC)
	svc.now = func() time.Time { return now }

	user, err := client.User.Create().SetEmail("benefit-window@example.com").SetPasswordHash("hash").SetUsername("benefit-window").SetBalance(0).SetTotalRecharged(999).Save(ctx)
	require.NoError(t, err)
	_, err = client.PaymentOrder.Create().
		SetUserID(user.ID).SetUserEmail(user.Email).SetUserName(user.Username).
		SetAmount(40).SetPayAmount(40).SetFeeRate(0).SetRechargeCode("BENEFIT-WINDOW-1").SetOutTradeNo("sub2_benefit_window_1").
		SetPaymentType(payment.TypeAlipay).SetPaymentTradeNo("trade-1").SetOrderType(payment.OrderTypeBalance).SetStatus(payment.OrderStatusCompleted).
		SetExpiresAt(now.Add(time.Hour)).SetPaidAt(now.Add(-30*time.Minute)).SetCompletedAt(now.Add(-20*time.Minute)).
		SetClientIP("127.0.0.1").SetSrcHost("example.com").Save(ctx)
	require.NoError(t, err)

	campaign, err := svc.CreateCampaign(ctx, CreateBenefitCampaignInput{Name: "Window", Enabled: true, Visible: true, StartsAt: now.Add(-time.Hour), EndsAt: now.Add(time.Hour), ThresholdAmount: 100, GrantAmount: 10, RechargeScope: BenefitRechargeScopeCampaignWindow, Copy: DefaultBenefitCampaignCopy()})
	require.NoError(t, err)

	views, err := svc.ListUserCampaigns(ctx, user.ID)
	require.NoError(t, err)
	require.Len(t, views, 1)
	require.Equal(t, campaign.ID, views[0].Campaign.ID)
	require.Equal(t, BenefitStateNotEligible, views[0].State)
	require.Equal(t, 40.0, views[0].EligibleRechargeAmount)
}
```

Add this helper below the tests:

```go
func newBenefitServiceEntClient(t *testing.T) *dbent.Client {
	t.Helper()
	db, err := sql.Open("sqlite", "file:benefit_service?mode=memory&cache=shared&_fk=1")
	require.NoError(t, err)
	t.Cleanup(func() { _ = db.Close() })
	_, err = db.Exec("PRAGMA foreign_keys = ON")
	require.NoError(t, err)
	drv := entsql.OpenDB(dialect.SQLite, db)
	client := enttest.NewClient(t, enttest.WithOptions(dbent.Driver(drv)))
	t.Cleanup(func() { _ = client.Close() })
	return client
}
```

- [ ] **Step 2: Run test to verify failures**

Run:

```powershell
cd backend
go test -tags=unit ./internal/service -run TestBenefitServiceEnt -count=1
```

Expected: FAIL if transaction/duplicate handling is incomplete.

- [ ] **Step 3: Ensure transaction and duplicate handling are wired**

Verify the Task 3 implementation has these exact properties:

- `ProvideBenefitService` stores the injected `*dbent.Client` on `BenefitService.entClient`.
- `backend/internal/service/wire.go` registers `ProvideBenefitService`, not `NewBenefitService`.
- `Claim` calls `runClaimTransaction`, which starts `s.entClient.Tx(ctx)` when `entClient` is present.
- `runClaimTransaction` passes `dbent.NewTxContext(ctx, tx)` into `repo.CreateClaim` and `repo.CreditUserBalanceOnly`.
- `repo.CreateClaim` maps unique constraint failures on `benefit_claims_campaign_user_unique` to `ErrBenefitAlreadyClaimed`, or service-level `isBenefitDuplicateClaimError` maps the raw constraint error before returning.
- `Claim` uses `CreditUserBalanceOnly`, not `UpdateBalance`, so `users.total_recharged` remains unchanged after benefit claims.

- [ ] **Step 4: Run focused backend tests**

Run:

```powershell
cd backend
go test -tags=unit ./internal/service -run TestBenefitService -count=1
go test -tags=unit ./internal/repository -run TestBenefitRepositoryCreateListAndClaim -count=1
go test ./internal/server -run TestAPIContract -count=1
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/internal/service backend/internal/repository
git commit -m "test: cover benefit campaign fulfillment"
```

---

### Task 6: Frontend API And Types

**Files:**
- Create: `frontend/src/api/benefits.ts`
- Create: `frontend/src/api/admin/benefits.ts`
- Modify: `frontend/src/api/admin/index.ts`
- Modify: `frontend/src/types/index.ts`
- Test: `frontend/src/api/__tests__/benefits.spec.ts`

- [ ] **Step 1: Write API tests**

Create `frontend/src/api/__tests__/benefits.spec.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { apiClient } from '@/api/client'
import benefitsAPI from '@/api/benefits'
import adminBenefitsAPI from '@/api/admin/benefits'

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('benefits API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists user campaigns', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ state: 'claimable' }] })
    const result = await benefitsAPI.listCampaigns()
    expect(apiClient.get).toHaveBeenCalledWith('/benefits/campaigns')
    expect(result).toEqual([{ state: 'claimable' }])
  })

  it('claims a user campaign', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { balance: 12 } })
    const result = await benefitsAPI.claimCampaign(7)
    expect(apiClient.post).toHaveBeenCalledWith('/benefits/campaigns/7/claim')
    expect(result.balance).toBe(12)
  })

  it('creates admin campaigns', async () => {
    const request = { name: 'Recharge 100', enabled: true, visible: true, starts_at: 1, ends_at: 2, threshold_amount: 100, grant_amount: 10, recharge_scope: 'lifetime', copy: {} }
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1 } })
    await adminBenefitsAPI.create(request as any)
    expect(apiClient.post).toHaveBeenCalledWith('/admin/benefits/campaigns', request)
  })
})
```

- [ ] **Step 2: Run API tests to verify failure**

Run:

```powershell
cd frontend
pnpm exec vitest run src/api/__tests__/benefits.spec.ts
```

Expected: FAIL because modules do not exist.

- [ ] **Step 3: Add frontend types**

Append to `frontend/src/types/index.ts` near Promo Code types:

```ts
export type BenefitRechargeScope = 'lifetime' | 'campaign_window'
export type BenefitClaimState = 'not_started' | 'ended' | 'claimed' | 'not_eligible' | 'claimable'

export interface BenefitCampaignCopy {
  title: string
  description: string
  button: string
  success: string
  not_eligible: string
  not_started: string
  ended: string
  claimed: string
  failed: string
}

export interface BenefitCampaign {
  id: number
  name: string
  enabled: boolean
  visible: boolean
  starts_at: string
  ends_at: string
  threshold_amount: number
  grant_amount: number
  recharge_scope: BenefitRechargeScope
  copy: BenefitCampaignCopy
  sort_order: number
  claim_count: number
  created_at: string
  updated_at: string
}

export interface BenefitClaim {
  id: number
  campaign_id: number
  user_id: number
  status: 'claimed'
  eligible_recharge_amount: number
  granted_amount: number
  balance_before: number
  balance_after: number
  claimed_at: string
  source_redeem_code?: string | null
  created_at: string
  updated_at: string
  user?: User
}

export interface BenefitCampaignView {
  campaign: BenefitCampaign
  state: BenefitClaimState
  eligible_recharge_amount: number
  claim?: BenefitClaim
}

export interface BenefitClaimResult {
  campaign: BenefitCampaign
  claim: BenefitClaim
  balance: number
}

export interface BenefitCampaignRequest {
  name: string
  enabled: boolean
  visible: boolean
  starts_at: number
  ends_at: number
  threshold_amount: number
  grant_amount: number
  recharge_scope: BenefitRechargeScope
  copy: BenefitCampaignCopy
  sort_order?: number
}
```

- [ ] **Step 4: Add user API**

Create `frontend/src/api/benefits.ts`:

```ts
import { apiClient } from './client'
import type { BenefitCampaignView, BenefitClaimResult } from '@/types'

export async function listCampaigns(): Promise<BenefitCampaignView[]> {
  const { data } = await apiClient.get<BenefitCampaignView[]>('/benefits/campaigns')
  return data
}

export async function claimCampaign(id: number): Promise<BenefitClaimResult> {
  const { data } = await apiClient.post<BenefitClaimResult>(`/benefits/campaigns/${id}/claim`)
  return data
}

export default {
  listCampaigns,
  claimCampaign,
}
```

- [ ] **Step 5: Add admin API**

Create `frontend/src/api/admin/benefits.ts`:

```ts
import { apiClient } from '../client'
import type { BasePaginationResponse, BenefitCampaign, BenefitCampaignRequest, BenefitClaim } from '@/types'

export async function list(params?: {
  page?: number
  page_size?: number
  enabled?: boolean
  visible?: boolean
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}): Promise<BasePaginationResponse<BenefitCampaign>> {
  const { data } = await apiClient.get<BasePaginationResponse<BenefitCampaign>>('/admin/benefits/campaigns', { params })
  return data
}

export async function getById(id: number): Promise<BenefitCampaign> {
  const { data } = await apiClient.get<BenefitCampaign>(`/admin/benefits/campaigns/${id}`)
  return data
}

export async function create(request: BenefitCampaignRequest): Promise<BenefitCampaign> {
  const { data } = await apiClient.post<BenefitCampaign>('/admin/benefits/campaigns', request)
  return data
}

export async function update(id: number, request: Partial<BenefitCampaignRequest>): Promise<BenefitCampaign> {
  const { data } = await apiClient.put<BenefitCampaign>(`/admin/benefits/campaigns/${id}`, request)
  return data
}

export async function deleteCampaign(id: number): Promise<{ message: string }> {
  const { data } = await apiClient.delete<{ message: string }>(`/admin/benefits/campaigns/${id}`)
  return data
}

export async function listClaims(id: number, page = 1, pageSize = 20): Promise<BasePaginationResponse<BenefitClaim>> {
  const { data } = await apiClient.get<BasePaginationResponse<BenefitClaim>>(`/admin/benefits/campaigns/${id}/claims`, {
    params: { page, page_size: pageSize },
  })
  return data
}

export default {
  list,
  getById,
  create,
  update,
  delete: deleteCampaign,
  listClaims,
}
```

- [ ] **Step 6: Export admin API**

Modify `frontend/src/api/admin/index.ts`:

```ts
import benefitsAPI from './benefits'
```

Add to `adminAPI`:

```ts
benefits: benefitsAPI,
```

Add to named exports:

```ts
benefitsAPI,
```

- [ ] **Step 7: Run API tests**

Run:

```powershell
cd frontend
pnpm exec vitest run src/api/__tests__/benefits.spec.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add frontend/src/api/benefits.ts frontend/src/api/admin/benefits.ts frontend/src/api/admin/index.ts frontend/src/types/index.ts frontend/src/api/__tests__/benefits.spec.ts
git commit -m "feat: add benefit campaign frontend APIs"
```

---

### Task 7: User Benefit Page

**Files:**
- Create: `frontend/src/views/user/BenefitsView.vue`
- Test: `frontend/src/views/user/__tests__/BenefitsView.spec.ts`

- [ ] **Step 1: Write view test**

Create `frontend/src/views/user/__tests__/BenefitsView.spec.ts`:

```ts
import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import BenefitsView from '../BenefitsView.vue'
import benefitsAPI from '@/api/benefits'

vi.mock('@/api/benefits', () => ({
  default: {
    listCampaigns: vi.fn(),
    claimCampaign: vi.fn(),
  },
}))

vi.mock('@/stores', () => ({
  useAppStore: () => ({ showSuccess: vi.fn(), showError: vi.fn() }),
  useAuthStore: () => ({ checkAuth: vi.fn(), user: { balance: 0 } }),
}))

describe('BenefitsView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders claimable campaign and claims it', async () => {
    vi.mocked(benefitsAPI.listCampaigns).mockResolvedValueOnce([
      {
        state: 'claimable',
        eligible_recharge_amount: 120,
        campaign: {
          id: 1,
          name: 'Recharge 100',
          enabled: true,
          visible: true,
          starts_at: '2026-06-22T00:00:00Z',
          ends_at: '2026-06-23T00:00:00Z',
          threshold_amount: 100,
          grant_amount: 10,
          recharge_scope: 'lifetime',
          copy: {
            title: 'Recharge reward',
            description: 'Claim after recharge',
            button: 'Claim now',
            success: 'Claimed',
            not_eligible: 'Recharge more',
            not_started: 'Not started',
            ended: 'Ended',
            claimed: 'Already claimed',
            failed: 'Failed',
          },
          sort_order: 0,
          claim_count: 0,
          created_at: '',
          updated_at: '',
        },
      },
    ])
    vi.mocked(benefitsAPI.claimCampaign).mockResolvedValueOnce({ balance: 10 } as any)

    const wrapper = mount(BenefitsView, {
      global: {
        stubs: {
          AppLayout: { template: '<div><slot /></div>' },
          Icon: true,
        },
        mocks: { $t: (key: string) => key },
      },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Recharge reward')
    await wrapper.find('button').trigger('click')
    expect(benefitsAPI.claimCampaign).toHaveBeenCalledWith(1)
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run:

```powershell
cd frontend
pnpm exec vitest run src/views/user/__tests__/BenefitsView.spec.ts
```

Expected: FAIL because view does not exist.

- [ ] **Step 3: Create user view**

Create `frontend/src/views/user/BenefitsView.vue`:

```vue
<template>
  <AppLayout>
    <div class="mx-auto max-w-5xl space-y-4 px-4 py-6">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-semibold text-gray-900 dark:text-white">{{ t('benefits.title') }}</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-dark-400">{{ t('benefits.description') }}</p>
        </div>
        <button class="btn btn-secondary" :disabled="loading" @click="loadCampaigns">
          <Icon name="refresh" size="md" :class="loading ? 'animate-spin' : ''" />
        </button>
      </div>

      <div v-if="loading" class="py-10 text-center text-gray-500">{{ t('common.loading') }}</div>
      <div v-else-if="campaigns.length === 0" class="rounded-lg border border-gray-200 p-8 text-center text-gray-500 dark:border-dark-600">
        {{ t('benefits.empty') }}
      </div>
      <div v-else class="grid gap-3">
        <section v-for="item in campaigns" :key="item.campaign.id" class="rounded-lg border border-gray-200 bg-white p-4 dark:border-dark-600 dark:bg-dark-800">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0">
              <h2 class="text-base font-semibold text-gray-900 dark:text-white">{{ item.campaign.copy.title }}</h2>
              <p class="mt-1 text-sm text-gray-500 dark:text-dark-400">{{ item.campaign.copy.description }}</p>
              <div class="mt-3 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-dark-400">
                <span class="badge badge-info">{{ t('benefits.threshold', { amount: formatAmount(item.campaign.threshold_amount) }) }}</span>
                <span class="badge badge-success">+${{ formatAmount(item.campaign.grant_amount) }}</span>
                <span class="badge">{{ scopeLabel(item.campaign.recharge_scope) }}</span>
                <span class="badge">{{ t('benefits.claimWindow', { start: formatDateTime(item.campaign.starts_at), end: formatDateTime(item.campaign.ends_at) }) }}</span>
              </div>
              <p class="mt-3 text-sm text-gray-600 dark:text-gray-300">
                {{ stateCopy(item) }}
              </p>
              <p class="mt-1 text-xs text-gray-500 dark:text-dark-400">
                {{ t('benefits.progress', { current: formatAmount(item.eligible_recharge_amount), target: formatAmount(item.campaign.threshold_amount) }) }}
              </p>
            </div>
            <button class="btn btn-primary shrink-0" :disabled="item.state !== 'claimable' || claimingId === item.campaign.id" @click="claim(item.campaign.id)">
              {{ claimingId === item.campaign.id ? t('common.loading') : item.campaign.copy.button }}
            </button>
          </div>
        </section>
      </div>
    </div>
  </AppLayout>
</template>
```

Add script:

```ts
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import benefitsAPI from '@/api/benefits'
import { useAppStore, useAuthStore } from '@/stores'
import { formatDateTime } from '@/utils/format'
import type { BenefitCampaignView, BenefitRechargeScope } from '@/types'
import AppLayout from '@/components/layout/AppLayout.vue'
import Icon from '@/components/icons/Icon.vue'

const { t } = useI18n()
const appStore = useAppStore()
const authStore = useAuthStore()
const campaigns = ref<BenefitCampaignView[]>([])
const loading = ref(false)
const claimingId = ref<number | null>(null)

function formatAmount(value: number): string {
  return Number(value || 0).toFixed(2)
}

function scopeLabel(scope: BenefitRechargeScope): string {
  return scope === 'campaign_window' ? t('benefits.scopeCampaignWindow') : t('benefits.scopeLifetime')
}

function stateCopy(item: BenefitCampaignView): string {
  const copy = item.campaign.copy
  switch (item.state) {
    case 'not_started': return copy.not_started
    case 'ended': return copy.ended
    case 'claimed': return copy.claimed
    case 'not_eligible': return copy.not_eligible
    case 'claimable': return copy.button
    default: return copy.failed
  }
}

async function loadCampaigns() {
  loading.value = true
  try {
    campaigns.value = await benefitsAPI.listCampaigns()
  } catch (error: any) {
    appStore.showError(error?.message || t('benefits.loadFailed'))
  } finally {
    loading.value = false
  }
}

async function claim(id: number) {
  claimingId.value = id
  try {
    const result = await benefitsAPI.claimCampaign(id)
    appStore.showSuccess(result.campaign.copy.success)
    await authStore.checkAuth()
    await loadCampaigns()
  } catch (error: any) {
    appStore.showError(error?.message || t('benefits.claimFailed'))
  } finally {
    claimingId.value = null
  }
}

onMounted(loadCampaigns)
</script>
```

- [ ] **Step 4: Run view test**

Run:

```powershell
cd frontend
pnpm exec vitest run src/views/user/__tests__/BenefitsView.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/views/user/BenefitsView.vue frontend/src/views/user/__tests__/BenefitsView.spec.ts
git commit -m "feat: add user benefit campaign page"
```

---

### Task 8: Admin Benefit Campaign Page

**Files:**
- Create: `frontend/src/views/admin/BenefitCampaignsView.vue`
- Test: `frontend/src/views/admin/__tests__/BenefitCampaignsView.spec.ts`

- [ ] **Step 1: Write admin page test**

Create `frontend/src/views/admin/__tests__/BenefitCampaignsView.spec.ts`:

```ts
import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import BenefitCampaignsView from '../BenefitCampaignsView.vue'
import { adminAPI } from '@/api/admin'

vi.mock('@/api/admin', () => ({
  adminAPI: {
    benefits: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      listClaims: vi.fn(),
    },
  },
}))

vi.mock('@/stores/app', () => ({
  useAppStore: () => ({ showSuccess: vi.fn(), showError: vi.fn() }),
}))

describe('BenefitCampaignsView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders campaign list', async () => {
    vi.mocked(adminAPI.benefits.list).mockResolvedValueOnce({
      items: [{
        id: 1,
        name: 'Recharge 100',
        enabled: true,
        visible: true,
        starts_at: '2026-06-22T00:00:00Z',
        ends_at: '2026-06-23T00:00:00Z',
        threshold_amount: 100,
        grant_amount: 10,
        recharge_scope: 'lifetime',
        copy: { title: 'Reward', description: '', button: 'Claim', success: '', not_eligible: '', not_started: '', ended: '', claimed: '', failed: '' },
        sort_order: 0,
        claim_count: 2,
        created_at: '',
        updated_at: '',
      }],
      total: 1,
      page: 1,
      page_size: 20,
      pages: 1,
    })

    const wrapper = mount(BenefitCampaignsView, {
      global: {
        stubs: {
          AppLayout: { template: '<div><slot /></div>' },
          TablePageLayout: { template: '<div><slot name="filters" /><slot name="table" /><slot name="pagination" /></div>' },
          DataTable: { props: ['data'], template: '<div><div v-for="row in data" :key="row.id">{{ row.name }}</div></div>' },
          Pagination: true,
          BaseDialog: true,
          ConfirmDialog: true,
          Select: true,
          Icon: true,
        },
        mocks: { $t: (key: string) => key },
      },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Recharge 100')
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run:

```powershell
cd frontend
pnpm exec vitest run src/views/admin/__tests__/BenefitCampaignsView.spec.ts
```

Expected: FAIL because view does not exist.

- [ ] **Step 3: Create admin view**

Create `frontend/src/views/admin/BenefitCampaignsView.vue` with this component structure:

```vue
<template>
  <AppLayout>
    <TablePageLayout>
      <template #actions>
        <button class="btn btn-primary" @click="openCreateDialog">
          <Icon name="plus" size="sm" />
          {{ t('admin.benefits.create') }}
        </button>
      </template>
      <template #filters>
        <input v-model="filters.search" class="input" :placeholder="t('common.search')" @keyup.enter="loadCampaigns" />
        <Select v-model="filters.enabled" :options="enabledOptions" @change="loadCampaigns" />
        <Select v-model="filters.visible" :options="visibleOptions" @change="loadCampaigns" />
      </template>
      <template #table>
        <DataTable :data="campaigns" :columns="columns" :loading="loading" :actions-count="4">
          <template #cell-enabled="{ row }">
            <span class="badge" :class="row.enabled ? 'badge-success' : 'badge-secondary'">{{ row.enabled ? t('common.enabled') : t('common.disabled') }}</span>
          </template>
          <template #cell-visible="{ row }">
            <span class="badge" :class="row.visible ? 'badge-info' : 'badge-secondary'">{{ row.visible ? t('admin.benefits.visible') : t('admin.benefits.hidden') }}</span>
          </template>
          <template #cell-claim_window="{ row }">{{ formatDateTime(row.starts_at) }} - {{ formatDateTime(row.ends_at) }}</template>
          <template #cell-amounts="{ row }">{{ formatAmount(row.threshold_amount) }} / +{{ formatAmount(row.grant_amount) }}</template>
          <template #cell-actions="{ row }">
            <div class="flex items-center gap-2">
              <button class="btn btn-ghost btn-sm" @click="openEditDialog(row)"><Icon name="edit" size="sm" /></button>
              <button class="btn btn-ghost btn-sm" @click="openClaimsDialog(row)"><Icon name="list" size="sm" /></button>
              <button class="btn btn-ghost btn-sm text-red-600" @click="openDeleteDialog(row)"><Icon name="trash" size="sm" /></button>
            </div>
          </template>
        </DataTable>
      </template>
      <template #pagination>
        <Pagination :page="pagination.page" :page-size="pagination.page_size" :total="pagination.total" @change="handlePageChange" />
      </template>
    </TablePageLayout>
  </AppLayout>

  <BaseDialog :show="showCreateDialog || showEditDialog" :title="dialogTitle" width="wide" @close="closeFormDialog">
    <form class="grid gap-4" @submit.prevent="submitForm">
      <input v-model="form.name" class="input" required maxlength="120" :placeholder="t('admin.benefits.name')" />
      <div class="grid gap-3 sm:grid-cols-2">
        <input v-model="form.starts_at_str" class="input" type="datetime-local" required />
        <input v-model="form.ends_at_str" class="input" type="datetime-local" required />
        <input v-model.number="form.threshold_amount" class="input" type="number" min="0.00000001" step="0.01" required />
        <input v-model.number="form.grant_amount" class="input" type="number" min="0.00000001" step="0.01" required />
        <Select v-model="form.recharge_scope" :options="scopeOptions" />
        <input v-model.number="form.sort_order" class="input" type="number" step="1" />
      </div>
      <label class="flex items-center gap-2"><input v-model="form.enabled" type="checkbox" />{{ t('admin.benefits.enabled') }}</label>
      <label class="flex items-center gap-2"><input v-model="form.visible" type="checkbox" />{{ t('admin.benefits.visible') }}</label>
      <div class="grid gap-3 sm:grid-cols-2">
        <input v-model="form.copy.title" class="input" required />
        <input v-model="form.copy.button" class="input" required />
        <textarea v-model="form.copy.description" class="input sm:col-span-2" rows="3" required />
        <input v-model="form.copy.success" class="input" required />
        <input v-model="form.copy.not_eligible" class="input" required />
        <input v-model="form.copy.not_started" class="input" required />
        <input v-model="form.copy.ended" class="input" required />
        <input v-model="form.copy.claimed" class="input" required />
        <input v-model="form.copy.failed" class="input" required />
      </div>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn btn-secondary" @click="closeFormDialog">{{ t('common.cancel') }}</button>
        <button type="submit" class="btn btn-primary" :disabled="saving">{{ t('common.save') }}</button>
      </div>
    </form>
  </BaseDialog>

  <BaseDialog :show="showClaimsDialog" :title="t('admin.benefits.claims')" width="wide" @close="showClaimsDialog = false">
    <DataTable :data="claims" :columns="claimColumns" :loading="claimsLoading" />
    <Pagination :page="claimsPagination.page" :page-size="claimsPagination.page_size" :total="claimsPagination.total" @change="handleClaimsPageChange" />
  </BaseDialog>

  <ConfirmDialog :show="showDeleteDialog" :title="t('common.delete')" :message="deleteMessage" :danger="true" @confirm="confirmDelete" @cancel="showDeleteDialog = false" />
</template>
```

Add `<script setup lang="ts">` using `AppLayout`, `TablePageLayout`, `DataTable`, `Pagination`, `BaseDialog`, `ConfirmDialog`, `Select`, `Icon`, `adminAPI`, `useAppStore`, `formatDateTime`, and the benefit types.

Define state:

```ts
const campaigns = ref<BenefitCampaign[]>([])
const claims = ref<BenefitClaim[]>([])
const loading = ref(false)
const saving = ref(false)
const claimsLoading = ref(false)
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)
const showClaimsDialog = ref(false)
const selectedCampaign = ref<BenefitCampaign | null>(null)
const filters = reactive({ search: '', enabled: '', visible: '' })
const pagination = reactive({ page: 1, page_size: getPersistedPageSize(), total: 0 })
const claimsPagination = reactive({ page: 1, page_size: 20, total: 0 })
```

Define default copy:

```ts
const defaultCopy = (): BenefitCampaignCopy => ({
  title: 'Recharge benefit',
  description: 'Claim a bonus after meeting the recharge requirement.',
  button: 'Claim',
  success: 'Benefit claimed.',
  not_eligible: 'Recharge more to unlock this benefit.',
  not_started: 'This benefit is not available yet.',
  ended: 'This benefit has ended.',
  claimed: 'You have already claimed this benefit.',
  failed: 'Could not claim this benefit. Please try again.',
})
```

Define form state:

```ts
const form = reactive({
  name: '',
  enabled: true,
  visible: true,
  starts_at_str: '',
  ends_at_str: '',
  threshold_amount: 100,
  grant_amount: 10,
  recharge_scope: 'lifetime' as BenefitRechargeScope,
  sort_order: 0,
  copy: defaultCopy(),
})
```

Define columns:

```ts
const columns = computed(() => [
  { key: 'name', label: t('admin.benefits.name'), sortable: true },
  { key: 'enabled', label: t('admin.benefits.enabled'), sortable: true },
  { key: 'visible', label: t('admin.benefits.visible'), sortable: true },
  { key: 'claim_window', label: t('admin.benefits.claimWindow'), sortable: false },
  { key: 'amounts', label: t('admin.benefits.amounts'), sortable: false },
  { key: 'recharge_scope', label: t('admin.benefits.rechargeScope'), sortable: true },
  { key: 'claim_count', label: t('admin.benefits.claimCount'), sortable: false },
  { key: 'sort_order', label: t('admin.benefits.sortOrder'), sortable: true },
  { key: 'actions', label: t('common.actions'), sortable: false },
])

const claimColumns = computed(() => [
  { key: 'user_id', label: 'User ID', sortable: false },
  { key: 'eligible_recharge_amount', label: t('admin.benefits.eligibleRecharge'), sortable: false },
  { key: 'granted_amount', label: t('admin.benefits.grantedAmount'), sortable: false },
  { key: 'balance_after', label: t('admin.benefits.balanceAfter'), sortable: false },
  { key: 'claimed_at', label: t('admin.benefits.claimedAt'), sortable: false },
])
```

Implement functions:

```ts
function toTimestampSeconds(value: string): number {
  return Math.floor(new Date(value).getTime() / 1000)
}

function formatAmount(value: number): string {
  return Number(value || 0).toFixed(2)
}

function buildRequest(): CreateBenefitCampaignRequest {
  return {
    name: form.name.trim(),
    enabled: form.enabled,
    visible: form.visible,
    starts_at: toTimestampSeconds(form.starts_at_str),
    ends_at: toTimestampSeconds(form.ends_at_str),
    threshold_amount: Number(form.threshold_amount),
    grant_amount: Number(form.grant_amount),
    recharge_scope: form.recharge_scope,
    sort_order: Number(form.sort_order || 0),
    copy: { ...form.copy },
  }
}
```

`loadCampaigns` calls `adminAPI.benefits.list({ page, page_size, search, enabled, visible })`, fills `campaigns`, `pagination.total`, and shows `appStore.showError` on failure.

`openCreateDialog` resets `form` to defaults and sets `showCreateDialog = true`.

`openEditDialog(row)` copies every campaign field into `form`, converts `starts_at` and `ends_at` into `datetime-local` strings, sets `selectedCampaign`, and sets `showEditDialog = true`.

`submitForm` validates `ends_at > starts_at`; then calls `adminAPI.benefits.create(buildRequest())` for create or `adminAPI.benefits.update(selectedCampaign.value.id, buildRequest())` for edit; on success, closes the dialog, reloads the list, and shows success.

`openClaimsDialog(row)` sets `selectedCampaign`, resets `claimsPagination.page = 1`, sets `showClaimsDialog = true`, and calls `loadClaims`.

`loadClaims` calls `adminAPI.benefits.listClaims(selectedCampaign.value.id, claimsPagination.page, claimsPagination.page_size)` and fills `claims` plus `claimsPagination.total`.

`openDeleteDialog(row)` sets `selectedCampaign` and `showDeleteDialog = true`.

`confirmDelete` calls `adminAPI.benefits.delete(selectedCampaign.value.id)`, closes the dialog, reloads the list, and shows success.

- [ ] **Step 4: Run admin view test**

Run:

```powershell
cd frontend
pnpm exec vitest run src/views/admin/__tests__/BenefitCampaignsView.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/views/admin/BenefitCampaignsView.vue frontend/src/views/admin/__tests__/BenefitCampaignsView.spec.ts
git commit -m "feat: add admin benefit campaign page"
```

---

### Task 9: Frontend Routes, Sidebar, And I18n

**Files:**
- Modify: `frontend/src/router/index.ts`
- Modify: `frontend/src/components/layout/AppSidebar.vue`
- Modify: `frontend/src/i18n/locales/zh.ts`
- Modify: `frontend/src/i18n/locales/en.ts`
- Test: `frontend/src/__tests__/integration/navigation.spec.ts`
- Test: `frontend/src/components/layout/__tests__/AppSidebar.spec.ts`

- [ ] **Step 1: Write route assertion test**

Modify `frontend/src/__tests__/integration/navigation.spec.ts` or add `frontend/src/__tests__/integration/benefitsNavigation.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import router from '@/router'

describe('benefit routes', () => {
  it('registers user and admin benefit routes', () => {
    expect(router.getRoutes().some((route) => route.path === '/benefits')).toBe(true)
    expect(router.getRoutes().some((route) => route.path === '/admin/benefits')).toBe(true)
  })
})
```

- [ ] **Step 2: Run route test to verify failure**

Run:

```powershell
cd frontend
pnpm exec vitest run src/__tests__/integration/benefitsNavigation.spec.ts
```

Expected: FAIL because routes do not exist.

- [ ] **Step 3: Add routes**

Modify `frontend/src/router/index.ts` after `/redeem` user route:

```ts
{
  path: '/benefits',
  name: 'Benefits',
  component: () => import('@/views/user/BenefitsView.vue'),
  meta: {
    requiresAuth: true,
    requiresAdmin: false,
    title: 'Benefits',
    titleKey: 'benefits.title',
    descriptionKey: 'benefits.description'
  }
},
```

Add admin route near promo/redeem:

```ts
{
  path: '/admin/benefits',
  name: 'AdminBenefits',
  component: () => import('@/views/admin/BenefitCampaignsView.vue'),
  meta: {
    requiresAuth: true,
    requiresAdmin: true,
    title: 'Benefit Campaigns',
    titleKey: 'admin.benefits.title',
    descriptionKey: 'admin.benefits.description'
  }
},
```

- [ ] **Step 4: Add sidebar entries**

Modify `frontend/src/components/layout/AppSidebar.vue`:

- Add `'gift'` to `SidebarIconName` if `Icon.vue` supports it; otherwise reuse existing `'badge'`.
- Add user nav item in `buildSelfNavItems` near payment/redeem:

```ts
{ path: '/benefits', label: t('nav.benefits'), icon: GiftIcon, hideInSimpleMode: true },
```

- Add admin nav item near promo/redeem:

```ts
{ path: '/admin/benefits', label: t('nav.benefitCampaigns'), icon: GiftIcon },
```

- [ ] **Step 5: Add i18n keys**

Modify `frontend/src/i18n/locales/zh.ts`:

```ts
nav: {
  benefits: '福利中心',
  benefitCampaigns: '福利活动',
}
benefits: {
  title: '福利中心',
  description: '查看并领取满足条件的充值福利。',
  empty: '暂无可领取福利',
  loadFailed: '福利活动加载失败',
  claimFailed: '领取失败，请稍后重试',
  threshold: '累计充值满 ${amount}',
  progress: '当前累计 ${current} / 目标 ${target}',
  scopeLifetime: '历史累计',
  scopeCampaignWindow: '活动期间累计',
  claimWindow: '领取期限：{start} - {end}',
}
admin: {
  benefits: {
    title: '福利活动',
    description: '配置固定时间窗内可领取的充值福利。',
    create: '创建活动',
    edit: '编辑活动',
    claims: '领取记录',
    enabled: '启用',
    visible: '展示',
    thresholdAmount: '充值门槛',
    grantAmount: '赠送额度',
    rechargeScope: '累计范围',
    claimWindow: '领取期限',
    sortOrder: '排序',
  }
}
```

Modify `frontend/src/i18n/locales/en.ts` with corresponding English keys.

- [ ] **Step 6: Run navigation/sidebar tests**

Run:

```powershell
cd frontend
pnpm exec vitest run src/__tests__/integration/benefitsNavigation.spec.ts src/components/layout/__tests__/AppSidebar.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add frontend/src/router/index.ts frontend/src/components/layout/AppSidebar.vue frontend/src/i18n/locales/zh.ts frontend/src/i18n/locales/en.ts frontend/src/__tests__/integration/benefitsNavigation.spec.ts
git commit -m "feat: add benefit campaign navigation"
```

---

### Task 10: Final Verification And Polish

**Files:**
- Review all touched files.
- Update tests only if failures reveal real integration mismatches.

- [ ] **Step 1: Run backend focused tests**

Run:

```powershell
cd backend
go test ./migrations -run Benefit -count=1
go test -tags=unit ./internal/repository -run Benefit -count=1
go test -tags=unit ./internal/service -run Benefit -count=1
go test -tags=unit ./internal/handler -run Benefit -count=1
go test ./cmd/server -run TestWireGenCompiles -count=1
```

Expected: PASS.

- [ ] **Step 2: Run backend package compile**

Run:

```powershell
cd backend
go test ./internal/server ./internal/handler ./internal/service ./internal/repository ./cmd/server
```

Expected: PASS.

- [ ] **Step 3: Run frontend focused tests**

Run:

```powershell
cd frontend
pnpm exec vitest run src/api/__tests__/benefits.spec.ts src/views/user/__tests__/BenefitsView.spec.ts src/views/admin/__tests__/BenefitCampaignsView.spec.ts src/__tests__/integration/benefitsNavigation.spec.ts
pnpm exec vue-tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Manual browser smoke test**

Start dev servers using the repository's normal commands. If backend setup is not available locally, run at least frontend with mocked API disabled and verify pages render route shells:

```powershell
cd frontend
pnpm dev
```

Open:

```text
http://localhost:3000/benefits
http://localhost:3000/admin/benefits
```

Expected:

- User page renders loading/error/empty state without layout breakage.
- Admin page renders table controls and create dialog.
- No button text overflows on desktop-width viewport.

- [ ] **Step 5: Inspect git diff**

Run:

```powershell
git status --short
git diff --stat
```

Expected:

- Only benefit campaign implementation files are changed.
- Existing unrelated `.dockerignore` and `Dockerfile` changes remain unstaged unless they were already staged by the user.

- [ ] **Step 6: Final commit**

```powershell
git add backend frontend
git commit -m "feat: add benefit campaign system"
```

Expected: Commit succeeds.

---

## Self-Review Notes

Spec coverage:

- Fixed campaign claim window: Tasks 1, 3, 4, 7, 8.
- Single threshold/grant rule: Tasks 1, 3, 8.
- Lifetime vs campaign-window recharge scope: Tasks 2, 3, 5.
- One claim per user per campaign: Tasks 1, 3, 5.
- Direct normal balance credit: Tasks 3 and 5.
- Benefit grants are credited as normal balance without any balance expiry: Tasks 2, 3, 5, 7.
- Full configurable copy: Tasks 1, 3, 4, 8, 9.
- Admin CRUD and claim records: Tasks 4, 8.
- User list and claim: Tasks 4, 7.

No unresolved placeholders are intentionally left in this plan. The plan gives a concrete recommended path and validation command for each task.
