package handler

import (
	"context"
	"sort"
	"strings"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

type publicModelPricingCatalogProvider interface {
	ListPublicModelPricing() service.PublicModelPricingCatalog
}

type publicAvailableChannelProvider interface {
	ListAvailable(ctx context.Context) ([]service.AvailableChannel, error)
}

// PublicModelPricingHandler serves the public model pricing catalog.
type PublicModelPricingHandler struct {
	pricing  publicModelPricingCatalogProvider
	channels publicAvailableChannelProvider
}

func NewPublicModelPricingHandler(
	pricing publicModelPricingCatalogProvider,
	channels publicAvailableChannelProvider,
) *PublicModelPricingHandler {
	return &PublicModelPricingHandler{pricing: pricing, channels: channels}
}

// List returns true group-aware channel pricing for public visitors. If no
// active channel/group pricing exists yet, it falls back to the default catalog.
func (h *PublicModelPricingHandler) List(c *gin.Context) {
	fallback := h.pricing.ListPublicModelPricing()
	if h.channels == nil {
		response.Success(c, fallback)
		return
	}

	channels, err := h.channels.ListAvailable(c.Request.Context())
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	catalog := buildPublicChannelPricingCatalog(channels, fallback.LastUpdated)
	if len(catalog.Groups) == 0 || len(catalog.Items) == 0 {
		response.Success(c, fallback)
		return
	}
	response.Success(c, catalog)
}

func buildPublicChannelPricingCatalog(
	channels []service.AvailableChannel,
	lastUpdated time.Time,
) service.PublicModelPricingCatalog {
	groupsByID := make(map[int64]service.PublicModelPricingGroup)
	groupNameByID := make(map[int64]string)
	items := make([]service.PublicModelPricingItem, 0)

	for _, ch := range channels {
		if ch.Status != service.StatusActive {
			continue
		}
		for _, group := range ch.Groups {
			if group.IsExclusive {
				continue
			}
			groupsByID[group.ID] = service.PublicModelPricingGroup{
				ID:               group.ID,
				Name:             group.Name,
				Platform:         group.Platform,
				RateMultiplier:   group.RateMultiplier,
				SubscriptionType: group.SubscriptionType,
				IsExclusive:      group.IsExclusive,
			}
			groupNameByID[group.ID] = group.Name

			for _, model := range ch.SupportedModels {
				if model.Platform != group.Platform {
					continue
				}
				item := publicPricingItemForGroupModel(group, model)
				if item.Model == "" {
					continue
				}
				items = append(items, item)
			}
		}
	}

	groups := make([]service.PublicModelPricingGroup, 0, len(groupsByID))
	for _, group := range groupsByID {
		groups = append(groups, group)
	}
	sort.SliceStable(groups, func(i, j int) bool {
		return strings.ToLower(groups[i].Name) < strings.ToLower(groups[j].Name)
	})
	sort.SliceStable(items, func(i, j int) bool {
		leftGroup := groupNameByID[firstGroupID(items[i].GroupIDs)]
		rightGroup := groupNameByID[firstGroupID(items[j].GroupIDs)]
		if leftGroup != rightGroup {
			return strings.ToLower(leftGroup) < strings.ToLower(rightGroup)
		}
		if items[i].Provider != items[j].Provider {
			return items[i].Provider < items[j].Provider
		}
		return strings.ToLower(items[i].Model) < strings.ToLower(items[j].Model)
	})

	catalog := service.PublicModelPricingCatalog{
		Groups: groups,
		Items:  items,
	}
	if !lastUpdated.IsZero() {
		catalog.LastUpdated = lastUpdated
	}
	return catalog
}

func publicPricingItemForGroupModel(
	group service.AvailableGroupRef,
	model service.SupportedModel,
) service.PublicModelPricingItem {
	item := service.PublicModelPricingItem{
		Provider:    model.Platform,
		Model:       model.Name,
		Mode:        string(service.BillingModeToken),
		BillingMode: string(service.BillingModeToken),
		GroupIDs:    []int64{group.ID},
	}
	if model.Pricing == nil {
		return item
	}
	billingMode := string(model.Pricing.BillingMode)
	if billingMode == "" {
		billingMode = string(service.BillingModeToken)
	}
	item.Mode = billingMode
	item.BillingMode = billingMode
	item.InputPricePerMillion = perTokenToPublicMillionPtr(model.Pricing.InputPrice, group.RateMultiplier)
	item.OutputPricePerMillion = perTokenToPublicMillionPtr(model.Pricing.OutputPrice, group.RateMultiplier)
	item.CacheWritePricePerMillion = perTokenToPublicMillionPtr(model.Pricing.CacheWritePrice, group.RateMultiplier)
	item.CacheReadPricePerMillion = perTokenToPublicMillionPtr(model.Pricing.CacheReadPrice, group.RateMultiplier)
	item.ImageOutputPrice = perTokenToPublicMillionPtr(model.Pricing.ImageOutputPrice, group.RateMultiplier)
	item.PerRequestPrice = multiplyPublicPricePtr(model.Pricing.PerRequestPrice, group.RateMultiplier)
	return item
}

func firstGroupID(ids []int64) int64 {
	if len(ids) == 0 {
		return 0
	}
	return ids[0]
}

func perTokenToPublicMillionPtr(value *float64, multiplier float64) *float64 {
	if value == nil {
		return nil
	}
	scaled := *value * 1_000_000 * multiplier
	return &scaled
}

func multiplyPublicPricePtr(value *float64, multiplier float64) *float64 {
	if value == nil {
		return nil
	}
	scaled := *value * multiplier
	return &scaled
}
