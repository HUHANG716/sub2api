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

func TestAdminPaymentAnalyticsRecentEventsFallbackWhenSourceColumnMissing(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { _ = db.Close() })

	h := NewPaymentHandler(nil, nil, db)
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodGet, "/admin/payment/analytics", nil)
	createdAt := time.Now()

	mock.ExpectQuery(regexp.QuoteMeta("SELECT event_name, tab, order_type, payment_type, launch_kind, source, status,")).
		WillReturnError(&pq.Error{Code: "42703"})
	mock.ExpectQuery(regexp.QuoteMeta("SELECT event_name, tab, order_type, payment_type, launch_kind, status,")).
		WillReturnRows(sqlmock.NewRows([]string{
			"event_name", "tab", "order_type", "payment_type", "launch_kind", "status",
			"amount", "pay_amount", "plan_id", "order_id", "error_kind", "created_at",
		}).AddRow(
			"payment_order_submit", "balance", "balance", "alipay", "web", "SUBMITTED",
			12.5, 12.5, int64(0), int64(123), "", createdAt,
		))

	events, err := h.queryPaymentAnalyticsRecentEvents(c, time.Now().Add(-24*time.Hour))

	require.NoError(t, err)
	require.Len(t, events, 1)
	require.Equal(t, "payment_order_submit", events[0].Name)
	require.Nil(t, events[0].Source)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestAdminPaymentAnalyticsSkipsMissingAuditTable(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { _ = db.Close() })

	h := NewPaymentHandler(nil, nil, db)
	router := newAdminPaymentAnalyticsTestRouter(h)

	mock.ExpectQuery(regexp.QuoteMeta("SELECT event_name, COUNT(*) AS count, COUNT(DISTINCT user_id) AS unique_users")).
		WillReturnRows(sqlmock.NewRows([]string{"event_name", "count", "unique_users"}))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT COALESCE(payment_type, ''), event_name, COUNT(*) AS count")).
		WillReturnRows(sqlmock.NewRows([]string{"payment_type", "event_name", "count"}))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT event_name, tab, order_type, payment_type, launch_kind, source, status,")).
		WillReturnRows(sqlmock.NewRows([]string{
			"event_name", "tab", "order_type", "payment_type", "launch_kind", "source", "status",
			"amount", "pay_amount", "plan_id", "order_id", "error_kind", "created_at",
		}))
	mock.ExpectQuery(regexp.QuoteMeta("SELECT operator, action, COUNT(*) AS count, MAX(created_at) AS last_action_at")).
		WillReturnError(&pq.Error{Code: "42P01"})

	req := httptest.NewRequest(http.MethodGet, "/admin/payment/analytics?days=30", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	require.Contains(t, rec.Body.String(), `"operators":null`)
	require.Contains(t, rec.Body.String(), `"audit_events":null`)
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

func TestAdminPaymentAnalyticsOperatorsParseAdminActor(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { _ = db.Close() })

	h := NewPaymentHandler(nil, nil, db)
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodGet, "/admin/payment/analytics", nil)
	lastActionAt := time.Now()

	mock.ExpectQuery(regexp.QuoteMeta("SELECT operator, action, COUNT(*) AS count, MAX(created_at) AS last_action_at")).
		WillReturnRows(sqlmock.NewRows([]string{"operator", "action", "count", "last_action_at"}).
			AddRow("admin:123", "REFUND_SUCCESS", int64(2), lastActionAt).
			AddRow("system", "ORDER_PAID", int64(1), lastActionAt))

	operators, err := h.queryPaymentAnalyticsOperators(c, time.Now().Add(-24*time.Hour))

	require.NoError(t, err)
	require.Len(t, operators, 2)
	require.Equal(t, "admin", operators[0].ActorType)
	require.NotNil(t, operators[0].ActorID)
	require.Equal(t, int64(123), *operators[0].ActorID)
	require.Equal(t, "system", operators[1].ActorType)
	require.Nil(t, operators[1].ActorID)
	require.NoError(t, mock.ExpectationsWereMet())
}
