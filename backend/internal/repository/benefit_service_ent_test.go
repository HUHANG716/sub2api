//go:build unit

package repository

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
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/stretchr/testify/require"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	_ "modernc.org/sqlite"
)

func TestBenefitServiceEntConcurrentClaimCreditsOnce(t *testing.T) {
	ctx := context.Background()
	client := newBenefitServiceEntClient(t)
	userRepo := NewUserRepository(client, nil)
	benefitRepo := NewBenefitRepository(client)
	svc := service.ProvideBenefitService(benefitRepo, userRepo, nil, nil, client)
	now := time.Now().UTC()

	user, err := client.User.Create().
		SetEmail("benefit-ent@example.com").
		SetPasswordHash("hash").
		SetUsername("benefit-ent").
		SetBalance(1).
		SetTotalRecharged(120).
		Save(ctx)
	require.NoError(t, err)

	campaign, err := svc.CreateCampaign(ctx, service.CreateBenefitCampaignInput{
		Name:            "Recharge 100 get 10",
		Enabled:         true,
		Visible:         true,
		StartsAt:        now.Add(-time.Hour),
		EndsAt:          now.Add(time.Hour),
		ThresholdAmount: 100,
		GrantAmount:     10,
		RechargeScope:   service.BenefitRechargeScopeLifetime,
		Copy:            service.DefaultBenefitCampaignCopy(),
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
		if err == nil {
			successes++
		}
		if err != nil && errors.Is(err, service.ErrBenefitAlreadyClaimed) {
			conflicts++
		}
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
	userRepo := NewUserRepository(client, nil)
	benefitRepo := NewBenefitRepository(client)
	svc := service.ProvideBenefitService(benefitRepo, userRepo, nil, nil, client)
	now := time.Now().UTC()

	user, err := client.User.Create().
		SetEmail("benefit-window@example.com").
		SetPasswordHash("hash").
		SetUsername("benefit-window").
		SetBalance(0).
		SetTotalRecharged(999).
		Save(ctx)
	require.NoError(t, err)
	_, err = client.PaymentOrder.Create().
		SetUserID(user.ID).
		SetUserEmail(user.Email).
		SetUserName(user.Username).
		SetAmount(40).
		SetPayAmount(40).
		SetFeeRate(0).
		SetRechargeCode("BENEFIT-WINDOW-1").
		SetOutTradeNo("sub2_benefit_window_1").
		SetPaymentType(payment.TypeAlipay).
		SetPaymentTradeNo("trade-1").
		SetOrderType(payment.OrderTypeBalance).
		SetStatus(payment.OrderStatusCompleted).
		SetExpiresAt(now.Add(time.Hour)).
		SetPaidAt(now.Add(-30 * time.Minute)).
		SetCompletedAt(now.Add(-20 * time.Minute)).
		SetClientIP("127.0.0.1").
		SetSrcHost("example.com").
		Save(ctx)
	require.NoError(t, err)

	campaign, err := svc.CreateCampaign(ctx, service.CreateBenefitCampaignInput{
		Name:            "Window",
		Enabled:         true,
		Visible:         true,
		StartsAt:        now.Add(-time.Hour),
		EndsAt:          now.Add(time.Hour),
		ThresholdAmount: 100,
		GrantAmount:     10,
		RechargeScope:   service.BenefitRechargeScopeCampaignWindow,
		Copy:            service.DefaultBenefitCampaignCopy(),
	})
	require.NoError(t, err)

	views, err := svc.ListUserCampaigns(ctx, user.ID)
	require.NoError(t, err)
	require.Len(t, views, 1)
	require.Equal(t, campaign.ID, views[0].Campaign.ID)
	require.Equal(t, service.BenefitStateNotEligible, views[0].State)
	require.Equal(t, 40.0, views[0].EligibleRechargeAmount)
}

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
