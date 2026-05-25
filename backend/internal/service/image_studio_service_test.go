package service

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

type imageStudioUserRepoStub struct {
	UserRepository
	user *User
}

func (r imageStudioUserRepoStub) GetByID(context.Context, int64) (*User, error) {
	return r.user, nil
}

type imageStudioGroupRepoStub struct {
	GroupRepository
	groups []Group
}

func (r imageStudioGroupRepoStub) ListActive(context.Context) ([]Group, error) {
	return r.groups, nil
}

func (r imageStudioGroupRepoStub) GetByID(_ context.Context, id int64) (*Group, error) {
	for i := range r.groups {
		if r.groups[i].ID == id {
			return &r.groups[i], nil
		}
	}
	return nil, ErrGroupNotFound
}

type imageStudioUserSubRepoStub struct {
	UserSubscriptionRepository
	subs []UserSubscription
}

func (r imageStudioUserSubRepoStub) ListActiveByUserID(context.Context, int64) ([]UserSubscription, error) {
	return r.subs, nil
}

func newImageStudioServiceForTest(user *User, groups []Group, subs []UserSubscription) *ImageStudioService {
	userRepo := imageStudioUserRepoStub{user: user}
	groupRepo := imageStudioGroupRepoStub{groups: groups}
	apiKeySvc := &APIKeyService{
		userRepo:    userRepo,
		groupRepo:   groupRepo,
		userSubRepo: imageStudioUserSubRepoStub{subs: subs},
	}
	return NewImageStudioService(apiKeySvc, userRepo, groupRepo, &BillingService{}, nil, nil)
}

func TestImageStudioOptionsFiltersUsableOpenAIImageGroups(t *testing.T) {
	user := &User{ID: 42, Balance: 9.25, AllowedGroups: []int64{6}}
	groups := []Group{
		{ID: 1, Name: "usable", Platform: PlatformOpenAI, Status: StatusActive, AllowImageGeneration: true, ActiveAccountCount: 1},
		{ID: 2, Name: "no-account", Platform: PlatformOpenAI, Status: StatusActive, AllowImageGeneration: true, ActiveAccountCount: 0},
		{ID: 3, Name: "disabled", Platform: PlatformOpenAI, Status: StatusActive, AllowImageGeneration: false, ActiveAccountCount: 1},
		{ID: 4, Name: "wrong-platform", Platform: PlatformAnthropic, Status: StatusActive, AllowImageGeneration: true, ActiveAccountCount: 1},
		{ID: 5, Name: "inactive", Platform: PlatformOpenAI, Status: StatusDisabled, AllowImageGeneration: true, ActiveAccountCount: 1},
		{ID: 6, Name: "exclusive-allowed", Platform: PlatformOpenAI, Status: StatusActive, IsExclusive: true, AllowImageGeneration: true, ActiveAccountCount: 1},
		{ID: 7, Name: "exclusive-denied", Platform: PlatformOpenAI, Status: StatusActive, IsExclusive: true, AllowImageGeneration: true, ActiveAccountCount: 1},
	}
	svc := newImageStudioServiceForTest(user, groups, nil)

	options, err := svc.Options(context.Background(), user.ID)
	require.NoError(t, err)
	require.Equal(t, ImageStudioDefaultModel, options.DefaultModel)
	require.Equal(t, 9.25, options.Balance)
	require.Len(t, options.Groups, 2)
	require.Equal(t, int64(1), options.Groups[0].ID)
	require.Equal(t, int64(6), options.Groups[1].ID)
}

func TestImageStudioEstimateUsesGroupImagePricingAndIndependentMultiplier(t *testing.T) {
	price4K := 0.40
	user := &User{ID: 42, Balance: 10}
	groups := []Group{
		{
			ID:                   1,
			Name:                 "priced",
			Platform:             PlatformOpenAI,
			Status:               StatusActive,
			RateMultiplier:       5,
			AllowImageGeneration: true,
			ImageRateIndependent: true,
			ImageRateMultiplier:  2,
			ImagePrice4K:         &price4K,
			ActiveAccountCount:   1,
		},
	}
	svc := newImageStudioServiceForTest(user, groups, nil)

	cost, tier, err := svc.Estimate(context.Background(), user.ID, 1, ImageBillingSize4K, 3)
	require.NoError(t, err)
	require.Equal(t, ImageBillingSize4K, tier)
	require.InDelta(t, 2.40, cost, 0.0001)
}

func TestImageStudioValidateGroupAllowsSubscribedImageGroup(t *testing.T) {
	user := &User{ID: 42, Balance: 10}
	group := Group{
		ID:                   9,
		Name:                 "sub-image",
		Platform:             PlatformOpenAI,
		Status:               StatusActive,
		SubscriptionType:     SubscriptionTypeSubscription,
		AllowImageGeneration: true,
		ActiveAccountCount:   1,
	}
	subs := []UserSubscription{{UserID: user.ID, GroupID: group.ID, Status: SubscriptionStatusActive, ExpiresAt: time.Now().Add(time.Hour)}}
	svc := newImageStudioServiceForTest(user, []Group{group}, subs)

	got, err := svc.ValidateGroup(context.Background(), user.ID, group.ID)
	require.NoError(t, err)
	require.Equal(t, group.ID, got.ID)
}

func TestImageStudioTemplatesFiltersModeModelAndQuery(t *testing.T) {
	svc := newImageStudioServiceForTest(&User{ID: 42}, nil, nil)

	nanoTemplates, err := svc.Templates(context.Background(), ImageStudioTemplateFilter{Model: "nano"})
	require.NoError(t, err)
	require.NotEmpty(t, nanoTemplates)
	for _, template := range nanoTemplates {
		require.Contains(t, strings.ToLower(template.Model), "nano")
	}

	infographicTemplates, err := svc.Templates(context.Background(), ImageStudioTemplateFilter{Query: "infographic"})
	require.NoError(t, err)
	require.NotEmpty(t, infographicTemplates)
	require.True(t, len(infographicTemplates) < len(imageStudioTemplates))
}
