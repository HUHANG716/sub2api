//go:build !embed

package web

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestServeEmbeddedFrontend_NonEmbedSkipsBackendRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)

	paths := []string{
		"/api/v1/settings/public",
		"/v1/models",
		"/v1beta/chat",
		"/backend-api/codex/responses",
		"/antigravity/test",
		"/setup/status",
		"/health",
		"/responses",
		"/images/generations",
	}

	for _, path := range paths {
		t.Run(path, func(t *testing.T) {
			nextCalled := false
			router := gin.New()
			router.Use(ServeEmbeddedFrontend())
			router.GET(path, func(c *gin.Context) {
				nextCalled = true
				c.Status(http.StatusNoContent)
			})

			req := httptest.NewRequest(http.MethodGet, path, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			require.True(t, nextCalled)
			require.Equal(t, http.StatusNoContent, w.Code)
		})
	}
}

func TestServeEmbeddedFrontend_NonEmbedReturnsFrontendMissingForSpaRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(ServeEmbeddedFrontend())

	req := httptest.NewRequest(http.MethodGet, "/admin/dashboard", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	require.Equal(t, http.StatusNotFound, w.Code)
	require.Contains(t, w.Body.String(), "Frontend not embedded")
}
