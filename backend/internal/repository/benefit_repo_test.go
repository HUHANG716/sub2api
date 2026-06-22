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
		CampaignID:             campaign.ID,
		UserID:                 user.ID,
		Status:                 service.BenefitClaimStatusClaimed,
		EligibleRechargeAmount: 120,
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

	balanceAfter, err := repo.CreditUserBalanceOnly(ctx, user.ID, 10)
	require.NoError(t, err)
	require.Equal(t, 15.0, balanceAfter)

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
