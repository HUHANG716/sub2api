package admin

import (
	"net/http"
	"net/http/httptest"
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"github.com/stretchr/testify/require"
)

func newAdminPaymentAnalyticsTestRouter(h *PaymentHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/admin/payment/analytics", h.GetAnalytics)
	return router
}

func TestAdminPaymentAnalyticsReturnsMissingWhenTableDoesNotExist(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { _ = db.Close() })

	h := NewPaymentHandler(nil, nil, db)
	router := newAdminPaymentAnalyticsTestRouter(h)

	mock.ExpectQuery("SELECT event_name, COUNT").
		WillReturnError(&pq.Error{Code: "42P01"})

	req := httptest.NewRequest(http.MethodGet, "/admin/payment/analytics?days=365", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	require.Contains(t, rec.Body.String(), `"window_days":180`)
	require.Contains(t, rec.Body.String(), `"events_missing":true`)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestAdminPaymentAnalyticsMethodsUseResultStatusAsCanonicalSuccess(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { _ = db.Close() })

	h := NewPaymentHandler(nil, nil, db)
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodGet, "/admin/payment/analytics", nil)

	mock.ExpectQuery(regexp.QuoteMeta("SELECT COALESCE(payment_type, ''), event_name, COUNT(*) AS count")).
		WillReturnRows(sqlmock.NewRows([]string{"payment_type", "event_name", "count"}).
			AddRow("alipay", "payment_order_submit", int64(3)).
			AddRow("alipay", "payment_result_status", int64(1)).
			AddRow("wxpay", "payment_result_status", int64(2)))

	methods, err := h.queryPaymentAnalyticsMethods(c, time.Now().Add(-24*time.Hour))

	require.NoError(t, err)
	require.Equal(t, []PaymentAnalyticsMethod{
		{PaymentType: "alipay", EventName: "payment_order_submit", Count: 3},
		{PaymentType: "alipay", EventName: "payment_result_status", Count: 1},
		{PaymentType: "wxpay", EventName: "payment_result_status", Count: 2},
	}, methods)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestAdminPaymentAnalyticsStepsTreatSuccessAndSettledAsResultSuccess(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { _ = db.Close() })

	h := NewPaymentHandler(nil, nil, db)
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodGet, "/admin/payment/analytics", nil)

	mock.ExpectQuery(regexp.QuoteMeta("SELECT event_name, COUNT(*) AS count, COUNT(DISTINCT user_id) AS unique_users")).
		WillReturnRows(sqlmock.NewRows([]string{"event_name", "count", "unique_users"}).
			AddRow("payment_result_success", int64(2), int64(1)))

	steps, err := h.queryPaymentAnalyticsSteps(c, time.Now().Add(-24*time.Hour))

	require.NoError(t, err)
	require.Equal(t, []PaymentAnalyticsStep{
		{Name: "payment_result_success", Count: 2, UniqueUsers: 1},
	}, steps)
	require.NoError(t, mock.ExpectationsWereMet())
}
