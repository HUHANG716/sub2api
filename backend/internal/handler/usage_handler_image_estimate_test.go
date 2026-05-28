package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	middleware2 "github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

type imageEstimateUserRepoStub struct {
	service.UserRepository
	user *service.User
}

func (s *imageEstimateUserRepoStub) GetByID(ctx context.Context, id int64) (*service.User, error) {
	if s.user != nil {
		return s.user, nil
	}
	return &service.User{ID: id, AllowedGroups: nil, Status: service.StatusActive}, nil
}

type imageEstimateGroupRepoStub struct {
	service.GroupRepository
	groups []service.Group
}

func (s *imageEstimateGroupRepoStub) ListActive(ctx context.Context) ([]service.Group, error) {
	return s.groups, nil
}

type imageEstimateSubscriptionRepoStub struct {
	service.UserSubscriptionRepository
}

func (s *imageEstimateSubscriptionRepoStub) ListActiveByUserID(ctx context.Context, userID int64) ([]service.UserSubscription, error) {
	return nil, nil
}

type imageEstimateRateRepoStub struct {
	service.UserGroupRateRepository
	rate *float64
}

func (s *imageEstimateRateRepoStub) GetByUserAndGroup(ctx context.Context, userID, groupID int64) (*float64, error) {
	return s.rate, nil
}

func TestUsageImageEstimateUsesImagePricingAndUserRate(t *testing.T) {
	gin.SetMode(gin.TestMode)
	price1K := 0.03
	userRate := 1.5
	apiKeySvc := service.NewAPIKeyService(
		nil,
		&imageEstimateUserRepoStub{},
		&imageEstimateGroupRepoStub{groups: []service.Group{{
			ID:                   11,
			Name:                 "OpenAI Images",
			Platform:             service.PlatformOpenAI,
			Status:               service.StatusActive,
			RateMultiplier:       2,
			AllowImageGeneration: true,
			ImagePrice1K:         &price1K,
		}}},
		&imageEstimateSubscriptionRepoStub{},
		nil,
		nil,
		nil,
	)
	h := NewUsageHandler(nil, apiKeySvc, service.NewBillingService(&config.Config{}, nil), nil, &imageEstimateRateRepoStub{rate: &userRate})

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set(string(middleware2.ContextKeyUser), middleware2.AuthSubject{UserID: 42})
		c.Next()
	})
	router.POST("/usage/image-estimate", h.ImageEstimate)

	body := bytes.NewBufferString(`{"group_id":11,"model":"gpt-image-2","size":"1024x1024","count":2}`)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/usage/image-estimate", body))

	require.Equal(t, http.StatusOK, rec.Code)
	var got struct {
		Code int `json:"code"`
		Data struct {
			ImageSize      string  `json:"image_size"`
			ImageCount     int     `json:"image_count"`
			UnitCost       float64 `json:"unit_cost"`
			TotalCost      float64 `json:"total_cost"`
			ActualCost     float64 `json:"actual_cost"`
			RateMultiplier float64 `json:"rate_multiplier"`
			BillingMode    string  `json:"billing_mode"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &got))
	require.Equal(t, "1K", got.Data.ImageSize)
	require.Equal(t, 2, got.Data.ImageCount)
	require.InDelta(t, 0.03, got.Data.UnitCost, 1e-12)
	require.InDelta(t, 0.06, got.Data.TotalCost, 1e-12)
	require.InDelta(t, 0.09, got.Data.ActualCost, 1e-12)
	require.InDelta(t, 1.5, got.Data.RateMultiplier, 1e-12)
	require.Equal(t, string(service.BillingModeImage), got.Data.BillingMode)
}
