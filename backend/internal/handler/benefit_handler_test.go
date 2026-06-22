//go:build unit

package handler

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestBenefitHandlerListAndClaim(t *testing.T) {
	gin.SetMode(gin.TestMode)
	now := time.Date(2026, 6, 22, 12, 0, 0, 0, time.UTC)
	svc := &stubBenefitService{
		views: []service.BenefitCampaignView{{
			Campaign:               service.BenefitCampaign{ID: 1, Name: "Recharge 100", StartsAt: now.Add(-time.Hour), EndsAt: now.Add(time.Hour), ThresholdAmount: 100, GrantAmount: 10, RechargeScope: service.BenefitRechargeScopeLifetime, Copy: service.DefaultBenefitCampaignCopy()},
			State:                  service.BenefitStateClaimable,
			EligibleRechargeAmount: 120,
		}},
		claim: &service.BenefitClaimResult{
			Balance:  13,
			Campaign: service.BenefitCampaign{ID: 1, Name: "Recharge 100", GrantAmount: 10, Copy: service.DefaultBenefitCampaignCopy()},
			Claim:    service.BenefitClaim{ID: 9, CampaignID: 1, UserID: 7, GrantedAmount: 10, ClaimedAt: now},
		},
	}
	h := NewBenefitHandler(svc)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set(string(middleware.ContextKeyUser), middleware.AuthSubject{UserID: 7})
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

type stubBenefitService struct {
	views []service.BenefitCampaignView
	claim *service.BenefitClaimResult
}

func (s *stubBenefitService) ListUserCampaigns(context.Context, int64) ([]service.BenefitCampaignView, error) {
	return s.views, nil
}

func (s *stubBenefitService) Claim(context.Context, int64, int64) (*service.BenefitClaimResult, error) {
	return s.claim, nil
}
