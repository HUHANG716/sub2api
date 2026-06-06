package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

type fakePublicModelPricingCatalogProvider struct {
	catalog service.PublicModelPricingCatalog
}

func (f fakePublicModelPricingCatalogProvider) ListPublicModelPricing() service.PublicModelPricingCatalog {
	return f.catalog
}

type fakePublicAvailableChannelProvider struct {
	channels []service.AvailableChannel
	err      error
}

func (f fakePublicAvailableChannelProvider) ListAvailable(context.Context) ([]service.AvailableChannel, error) {
	return f.channels, f.err
}

func TestPublicModelPricingHandler_ListReturnsWhitelistedCatalog(t *testing.T) {
	gin.SetMode(gin.TestMode)

	inputPrice := 2.5
	outputPrice := 15.0
	cacheReadPrice := 0.25
	lastUpdated := time.Date(2026, 6, 6, 10, 30, 0, 0, time.UTC)
	h := NewPublicModelPricingHandler(fakePublicModelPricingCatalogProvider{
		catalog: service.PublicModelPricingCatalog{
			LastUpdated: lastUpdated,
			Items: []service.PublicModelPricingItem{
				{
					Provider:                 "openai",
					Model:                    "gpt-5.4",
					Mode:                     "chat",
					InputPricePerMillion:     &inputPrice,
					OutputPricePerMillion:    &outputPrice,
					CacheReadPricePerMillion: &cacheReadPrice,
					SupportsPromptCaching:    true,
					SupportsServiceTier:      true,
				},
			},
		},
	}, nil)

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/public/model-pricing", nil)

	h.List(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	var envelope struct {
		Code int `json:"code"`
		Data struct {
			LastUpdated time.Time `json:"last_updated"`
			Items       []struct {
				Provider                 string   `json:"provider"`
				Model                    string   `json:"model"`
				Mode                     string   `json:"mode"`
				InputPricePerMillion     *float64 `json:"input_price_per_million"`
				OutputPricePerMillion    *float64 `json:"output_price_per_million"`
				CacheReadPricePerMillion *float64 `json:"cache_read_price_per_million"`
				SupportsPromptCaching    bool     `json:"supports_prompt_caching"`
				SupportsServiceTier      bool     `json:"supports_service_tier"`
			} `json:"items"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &envelope))
	require.Equal(t, 0, envelope.Code)
	require.Equal(t, lastUpdated, envelope.Data.LastUpdated)
	require.Len(t, envelope.Data.Items, 1)
	require.Equal(t, "openai", envelope.Data.Items[0].Provider)
	require.Equal(t, "gpt-5.4", envelope.Data.Items[0].Model)
	require.NotNil(t, envelope.Data.Items[0].InputPricePerMillion)
	require.InDelta(t, 2.5, *envelope.Data.Items[0].InputPricePerMillion, 1e-12)

	var raw map[string]any
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &raw))
	require.NotContains(t, recorder.Body.String(), "litellm_provider")
	require.NotContains(t, recorder.Body.String(), "input_cost_per_token")
}

func TestPublicModelPricingHandler_ListReturnsTrueGroupPricing(t *testing.T) {
	gin.SetMode(gin.TestMode)

	inputPrice := 2.5e-6
	outputPrice := 15e-6
	perRequestPrice := 0.2
	lastUpdated := time.Date(2026, 6, 6, 10, 30, 0, 0, time.UTC)
	h := NewPublicModelPricingHandler(
		fakePublicModelPricingCatalogProvider{
			catalog: service.PublicModelPricingCatalog{LastUpdated: lastUpdated},
		},
		fakePublicAvailableChannelProvider{
			channels: []service.AvailableChannel{
				{
					Name:   "public channel",
					Status: service.StatusActive,
					Groups: []service.AvailableGroupRef{
						{
							ID:               11,
							Name:             "Claude Kiro",
							Platform:         service.PlatformAnthropic,
							RateMultiplier:   2.6,
							SubscriptionType: service.SubscriptionTypeStandard,
						},
						{
							ID:             12,
							Name:           "Private",
							Platform:       service.PlatformOpenAI,
							RateMultiplier: 8,
							IsExclusive:    true,
						},
					},
					SupportedModels: []service.SupportedModel{
						{
							Name:     "claude-sonnet-4-5",
							Platform: service.PlatformAnthropic,
							Pricing: &service.ChannelModelPricing{
								BillingMode: service.BillingModeToken,
								InputPrice:  &inputPrice,
								OutputPrice: &outputPrice,
							},
						},
						{
							Name:     "gpt-private",
							Platform: service.PlatformOpenAI,
							Pricing: &service.ChannelModelPricing{
								BillingMode:     service.BillingModePerRequest,
								PerRequestPrice: &perRequestPrice,
							},
						},
					},
				},
			},
		},
	)

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/public/model-pricing", nil)

	h.List(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	var envelope struct {
		Code int `json:"code"`
		Data struct {
			LastUpdated time.Time `json:"last_updated"`
			Groups      []struct {
				ID             int64   `json:"id"`
				Name           string  `json:"name"`
				Platform       string  `json:"platform"`
				RateMultiplier float64 `json:"rate_multiplier"`
			} `json:"groups"`
			Items []struct {
				Provider             string   `json:"provider"`
				Model                string   `json:"model"`
				BillingMode          string   `json:"billing_mode"`
				GroupIDs             []int64  `json:"group_ids"`
				InputPricePerMillion *float64 `json:"input_price_per_million"`
			} `json:"items"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &envelope))
	require.Equal(t, 0, envelope.Code)
	require.Equal(t, lastUpdated, envelope.Data.LastUpdated)
	require.Len(t, envelope.Data.Groups, 1)
	require.Equal(t, int64(11), envelope.Data.Groups[0].ID)
	require.Equal(t, "Claude Kiro", envelope.Data.Groups[0].Name)
	require.InDelta(t, 2.6, envelope.Data.Groups[0].RateMultiplier, 1e-12)
	require.Len(t, envelope.Data.Items, 1)
	require.Equal(t, "anthropic", envelope.Data.Items[0].Provider)
	require.Equal(t, "claude-sonnet-4-5", envelope.Data.Items[0].Model)
	require.Equal(t, "token", envelope.Data.Items[0].BillingMode)
	require.Equal(t, []int64{11}, envelope.Data.Items[0].GroupIDs)
	require.NotNil(t, envelope.Data.Items[0].InputPricePerMillion)
	require.InDelta(t, 6.5, *envelope.Data.Items[0].InputPricePerMillion, 1e-12)
	require.NotContains(t, recorder.Body.String(), "gpt-private")
	require.NotContains(t, recorder.Body.String(), "Private")
}
