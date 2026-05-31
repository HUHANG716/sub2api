package admin

import (
	"net/http"
	"net/http/httptest"
	"testing"

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
	defer db.Close()

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
