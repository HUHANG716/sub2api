package service

import (
	"context"
	"testing"
	"time"

	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
	"github.com/stretchr/testify/require"
)

func TestAssignOrExtendSubscriptionQueuesLimitedPeriods(t *testing.T) {
	groupRepo := &subscriptionGroupRepoStub{
		group: &Group{ID: 1, SubscriptionType: SubscriptionTypeSubscription},
	}
	subRepo := newSubscriptionUserSubRepoStub()
	limit := 500.0
	svc := NewSubscriptionService(groupRepo, subRepo, nil, nil, nil)

	first, reused, err := svc.AssignOrExtendSubscription(context.Background(), &AssignSubscriptionInput{
		UserID:         1001,
		GroupID:        1,
		ValidityDays:   7,
		PeriodLimitUSD: &limit,
		Notes:          "week 1",
	})
	require.NoError(t, err)
	require.False(t, reused)
	require.Len(t, subRepo.periods[first.ID], 1)
	firstPeriod := subRepo.periods[first.ID][0]
	require.WithinDuration(t, first.StartsAt, firstPeriod.StartsAt, time.Second)
	require.WithinDuration(t, first.ExpiresAt, firstPeriod.ExpiresAt, time.Second)
	require.NotNil(t, firstPeriod.LimitUSD)
	require.Equal(t, limit, *firstPeriod.LimitUSD)

	renewed, reused, err := svc.AssignOrExtendSubscription(context.Background(), &AssignSubscriptionInput{
		UserID:         1001,
		GroupID:        1,
		ValidityDays:   7,
		PeriodLimitUSD: &limit,
		Notes:          "week 2",
	})
	require.NoError(t, err)
	require.True(t, reused)
	require.Equal(t, first.ID, renewed.ID)
	require.Len(t, subRepo.periods[first.ID], 2)
	secondPeriod := subRepo.periods[first.ID][1]
	require.WithinDuration(t, firstPeriod.ExpiresAt, secondPeriod.StartsAt, time.Second)
	require.WithinDuration(t, firstPeriod.ExpiresAt.AddDate(0, 0, 7), secondPeriod.ExpiresAt, time.Second)
}

func TestAssignOrExtendSubscriptionReturnsExistingPeriodForSameOrder(t *testing.T) {
	groupRepo := &subscriptionGroupRepoStub{
		group: &Group{ID: 1, SubscriptionType: SubscriptionTypeSubscription},
	}
	subRepo := newSubscriptionUserSubRepoStub()
	orderID := int64(88)
	svc := NewSubscriptionService(groupRepo, subRepo, nil, nil, nil)

	first, reused, err := svc.AssignOrExtendSubscription(context.Background(), &AssignSubscriptionInput{
		UserID:       1001,
		GroupID:      1,
		OrderID:      &orderID,
		ValidityDays: 7,
		Notes:        "payment order 88",
	})
	require.NoError(t, err)
	require.False(t, reused)
	require.Len(t, subRepo.periods[first.ID], 1)

	second, reused, err := svc.AssignOrExtendSubscription(context.Background(), &AssignSubscriptionInput{
		UserID:       1001,
		GroupID:      1,
		OrderID:      &orderID,
		ValidityDays: 7,
		Notes:        "payment order 88",
	})
	require.NoError(t, err)
	require.True(t, reused)
	require.Equal(t, first.ID, second.ID)
	require.Len(t, subRepo.periods[first.ID], 1)
	require.WithinDuration(t, first.ExpiresAt, second.ExpiresAt, time.Second)
}

func TestValidateAndCheckLimitsEnforcesCurrentPeriodLimit(t *testing.T) {
	limit := 500.0
	sub := &UserSubscription{
		Status:    SubscriptionStatusActive,
		ExpiresAt: time.Now().Add(24 * time.Hour),
		CurrentPeriod: &UserSubscriptionPeriod{
			LimitUSD: &limit,
			UsageUSD: 500,
		},
	}
	group := &Group{ID: 1, SubscriptionType: SubscriptionTypeSubscription}
	svc := NewSubscriptionService(nil, nil, nil, nil, nil)

	_, err := svc.ValidateAndCheckLimits(sub, group)
	require.Error(t, err)
	require.Equal(t, infraerrors.Code(ErrPeriodLimitExceeded), infraerrors.Code(err))
}

func TestExtendSubscriptionShortenTrimsQueuedPeriods(t *testing.T) {
	now := time.Now()
	groupRepo := &subscriptionGroupRepoStub{
		group: &Group{ID: 1, SubscriptionType: SubscriptionTypeSubscription},
	}
	subRepo := newSubscriptionUserSubRepoStub()
	subRepo.seed(&UserSubscription{
		ID:        10,
		UserID:    1001,
		GroupID:   1,
		StartsAt:  now.AddDate(0, 0, -1),
		ExpiresAt: now.AddDate(0, 0, 14),
		Status:    SubscriptionStatusActive,
	})
	require.NoError(t, subRepo.CreatePeriod(context.Background(), &UserSubscriptionPeriod{
		SubscriptionID: 10,
		UserID:         1001,
		GroupID:        1,
		StartsAt:       now.AddDate(0, 0, -1),
		ExpiresAt:      now.AddDate(0, 0, 7),
		Status:         SubscriptionStatusActive,
	}))
	require.NoError(t, subRepo.CreatePeriod(context.Background(), &UserSubscriptionPeriod{
		SubscriptionID: 10,
		UserID:         1001,
		GroupID:        1,
		StartsAt:       now.AddDate(0, 0, 7),
		ExpiresAt:      now.AddDate(0, 0, 14),
		Status:         SubscriptionStatusActive,
	}))
	svc := NewSubscriptionService(groupRepo, subRepo, nil, nil, nil)

	shortened, err := svc.ExtendSubscription(context.Background(), 10, -7)

	require.NoError(t, err)
	require.Len(t, subRepo.periods[10], 2)
	require.Len(t, subRepo.activePeriods(10), 1)
	require.WithinDuration(t, shortened.ExpiresAt, subRepo.periods[10][0].ExpiresAt, time.Second)
	require.Equal(t, SubscriptionStatusExpired, subRepo.periods[10][1].Status)
}

func TestExtendSubscriptionShortenRemovesFullyQueuedPeriods(t *testing.T) {
	now := time.Now()
	groupRepo := &subscriptionGroupRepoStub{
		group: &Group{ID: 1, SubscriptionType: SubscriptionTypeSubscription},
	}
	subRepo := newSubscriptionUserSubRepoStub()
	subRepo.seed(&UserSubscription{
		ID:        11,
		UserID:    1002,
		GroupID:   1,
		StartsAt:  now.AddDate(0, 0, -1),
		ExpiresAt: now.AddDate(0, 0, 14),
		Status:    SubscriptionStatusActive,
	})
	require.NoError(t, subRepo.CreatePeriod(context.Background(), &UserSubscriptionPeriod{
		SubscriptionID: 11,
		UserID:         1002,
		GroupID:        1,
		StartsAt:       now.AddDate(0, 0, -1),
		ExpiresAt:      now.AddDate(0, 0, 7),
		Status:         SubscriptionStatusActive,
	}))
	require.NoError(t, subRepo.CreatePeriod(context.Background(), &UserSubscriptionPeriod{
		SubscriptionID: 11,
		UserID:         1002,
		GroupID:        1,
		StartsAt:       now.AddDate(0, 0, 7),
		ExpiresAt:      now.AddDate(0, 0, 14),
		Status:         SubscriptionStatusActive,
	}))
	svc := NewSubscriptionService(groupRepo, subRepo, nil, nil, nil)

	shortened, err := svc.ExtendSubscription(context.Background(), 11, -8)

	require.NoError(t, err)
	require.Len(t, subRepo.periods[11], 2)
	require.Len(t, subRepo.activePeriods(11), 1)
	require.False(t, subRepo.periods[11][0].ExpiresAt.After(shortened.ExpiresAt))
	require.Equal(t, SubscriptionStatusExpired, subRepo.periods[11][1].Status)
}
