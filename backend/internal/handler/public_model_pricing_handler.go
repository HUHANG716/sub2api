package handler

import (
	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

type publicModelPricingCatalogProvider interface {
	ListPublicModelPricing() service.PublicModelPricingCatalog
}

// PublicModelPricingHandler serves the public default model pricing catalog.
type PublicModelPricingHandler struct {
	pricing publicModelPricingCatalogProvider
}

func NewPublicModelPricingHandler(pricing publicModelPricingCatalogProvider) *PublicModelPricingHandler {
	return &PublicModelPricingHandler{pricing: pricing}
}

// List returns default reference pricing for public visitors.
func (h *PublicModelPricingHandler) List(c *gin.Context) {
	response.Success(c, h.pricing.ListPublicModelPricing())
}
