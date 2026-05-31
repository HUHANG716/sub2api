package handler

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	middleware2 "github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func newPaymentEventsTestRouter(t *testing.T, h *PaymentHandler) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set(string(middleware2.ContextKeyUser), middleware2.AuthSubject{UserID: 42})
		c.Next()
	})
	router.POST("/payment/events", h.RecordPaymentEvents)
	return router
}

func TestRecordPaymentEventsInsertsWhitelistedEvent(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	h := NewPaymentHandler(nil, nil, nil, db)
	router := newPaymentEventsTestRouter(t, h)

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta("INSERT INTO payment_events")).
		WithArgs(
			int64(42),
			"payment_order_create_success",
			"recharge",
			"balance",
			"alipay",
			"qrcode",
			"PENDING",
			88.0,
			90.64,
			3.0,
			nil,
			int64(123),
			nil,
		).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	body := []byte(`{"events":[{"name":"payment_order_create_success","tab":"recharge","orderType":"balance","paymentType":"alipay","launchKind":"qrcode","status":"PENDING","amount":88,"payAmount":90.64,"feeRate":3,"orderId":123}]}`)
	req := httptest.NewRequest(http.MethodPost, "/payment/events", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestRecordPaymentEventsRejectsUnknownEvent(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	h := NewPaymentHandler(nil, nil, nil, db)
	router := newPaymentEventsTestRouter(t, h)

	mock.ExpectBegin()
	mock.ExpectRollback()

	body := []byte(`{"events":[{"name":"payment_secret_dump","paymentType":"alipay"}]}`)
	req := httptest.NewRequest(http.MethodPost, "/payment/events", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	require.Equal(t, http.StatusBadRequest, rec.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}
