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

func newImagePlaygroundEventsTestRouter(t *testing.T, h *UsageHandler) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set(string(middleware2.ContextKeyUser), middleware2.AuthSubject{UserID: 42})
		c.Next()
	})
	router.POST("/usage/image-playground-events", h.RecordImagePlaygroundEvents)
	return router
}

func TestRecordImagePlaygroundEventsInsertsWhitelistedEvent(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { _ = db.Close() })

	h := NewUsageHandler(nil, nil, nil, nil, nil)
	h.SetSQLDB(db)
	router := newImagePlaygroundEventsTestRouter(t, h)

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta("INSERT INTO image_playground_events")).
		WithArgs(
			int64(42),
			"image_generate_success",
			"gallery",
			"openai",
			"responses",
			"gpt-image-2",
			"1024x1024",
			nil,
			nil,
			1,
			0,
			false,
			1200,
			1,
			nil,
			nil,
		).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	body := []byte(`{"events":[{"name":"image_generate_success","sourceMode":"gallery","provider":"openai","apiMode":"responses","model":"gpt-image-2","size":"1024x1024","n":1,"inputImageCount":0,"hasMask":false,"durationMs":1200,"outputImageCount":1}]}`)
	req := httptest.NewRequest(http.MethodPost, "/usage/image-playground-events", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestRecordImagePlaygroundEventsRejectsUnknownEvent(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { _ = db.Close() })

	h := NewUsageHandler(nil, nil, nil, nil, nil)
	h.SetSQLDB(db)
	router := newImagePlaygroundEventsTestRouter(t, h)

	mock.ExpectBegin()
	mock.ExpectRollback()

	body := []byte(`{"events":[{"name":"brinatosmr","provider":"openai"}]}`)
	req := httptest.NewRequest(http.MethodPost, "/usage/image-playground-events", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	require.Equal(t, http.StatusBadRequest, rec.Code)
	require.NoError(t, mock.ExpectationsWereMet())
}
