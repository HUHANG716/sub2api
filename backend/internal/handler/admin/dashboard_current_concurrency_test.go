package admin

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/pkg/usagestats"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

type dashboardStatsRepoStub struct {
	service.UsageLogRepository
}

func (s *dashboardStatsRepoStub) GetDashboardStats(ctx context.Context) (*usagestats.DashboardStats, error) {
	return &usagestats.DashboardStats{TotalUsers: 1, TotalUserBalance: 12.34}, nil
}

type dashboardAccountRepoStub struct {
	service.AccountRepository
	accounts []service.Account
	err      error
}

func (s *dashboardAccountRepoStub) ListSchedulable(ctx context.Context) ([]service.Account, error) {
	if s.err != nil {
		return nil, s.err
	}
	return s.accounts, nil
}

type dashboardConcurrencyCacheStub struct {
	service.ConcurrencyCache
	counts map[int64]int
	err    error
}

func (s *dashboardConcurrencyCacheStub) GetAccountConcurrencyBatch(ctx context.Context, accountIDs []int64) (map[int64]int, error) {
	if s.err != nil {
		return nil, s.err
	}
	result := make(map[int64]int, len(accountIDs))
	for _, accountID := range accountIDs {
		result[accountID] = s.counts[accountID]
	}
	return result, nil
}

func newDashboardConcurrencyTestHandler(counts map[int64]int, concurrencyErr error) *DashboardHandler {
	dashboardSvc := service.NewDashboardService(&dashboardStatsRepoStub{}, nil, nil, nil)
	concurrencySvc := service.NewConcurrencyService(&dashboardConcurrencyCacheStub{
		counts: counts,
		err:    concurrencyErr,
	})
	accountRepo := &dashboardAccountRepoStub{
		accounts: []service.Account{
			{ID: 1},
			{ID: 2},
		},
	}
	return NewDashboardHandler(dashboardSvc, nil, concurrencySvc, accountRepo)
}

func decodeDashboardResponse(t *testing.T, rec *httptest.ResponseRecorder) map[string]any {
	t.Helper()

	var body struct {
		Code int            `json:"code"`
		Data map[string]any `json:"data"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
	require.Equal(t, 0, body.Code)
	return body.Data
}

func TestDashboardHandler_GetStats_IncludesCurrentTotalConcurrency(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := newDashboardConcurrencyTestHandler(map[int64]int{1: 2, 2: 3}, nil)
	router := gin.New()
	router.GET("/admin/dashboard/stats", handler.GetStats)

	req := httptest.NewRequest(http.MethodGet, "/admin/dashboard/stats", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	data := decodeDashboardResponse(t, rec)
	require.Equal(t, float64(5), data["current_total_concurrency"])
}

func TestDashboardHandler_GetStats_IncludesTotalUserBalance(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := newDashboardConcurrencyTestHandler(map[int64]int{}, nil)
	router := gin.New()
	router.GET("/admin/dashboard/stats", handler.GetStats)

	req := httptest.NewRequest(http.MethodGet, "/admin/dashboard/stats", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	data := decodeDashboardResponse(t, rec)
	require.Equal(t, 12.34, data["total_user_balance"])
}

func TestDashboardHandler_GetSnapshotV2_IncludesCurrentTotalConcurrency(t *testing.T) {
	t.Cleanup(resetDashboardReadCachesForTest)
	resetDashboardReadCachesForTest()

	gin.SetMode(gin.TestMode)
	handler := newDashboardConcurrencyTestHandler(map[int64]int{1: 2, 2: 3}, nil)
	router := gin.New()
	router.GET("/admin/dashboard/snapshot-v2", handler.GetSnapshotV2)

	req := httptest.NewRequest(http.MethodGet, "/admin/dashboard/snapshot-v2?include_stats=true&include_trend=false&include_model_stats=false", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	data := decodeDashboardResponse(t, rec)
	stats, ok := data["stats"].(map[string]any)
	require.True(t, ok)
	require.Equal(t, float64(5), stats["current_total_concurrency"])
}

func TestDashboardHandler_GetStats_ReturnsZeroWhenConcurrencyReadFails(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := newDashboardConcurrencyTestHandler(nil, errors.New("redis unavailable"))
	router := gin.New()
	router.GET("/admin/dashboard/stats", handler.GetStats)

	req := httptest.NewRequest(http.MethodGet, "/admin/dashboard/stats", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	data := decodeDashboardResponse(t, rec)
	require.Equal(t, float64(0), data["current_total_concurrency"])
}
