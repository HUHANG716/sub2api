package service

import (
	"context"
	"fmt"
	"io"
	"strings"

	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
)

const ImageStudioDefaultModel = "gpt-image-2"

var (
	ErrImageStudioGroupUnavailable = infraerrors.Forbidden("IMAGE_GROUP_UNAVAILABLE", "image generation group is not available")
	ErrImageStudioBalanceTooLow    = infraerrors.Forbidden("INSUFFICIENT_BALANCE", "insufficient balance")
)

type ImageStudioService struct {
	apiKeyService *APIKeyService
	userRepo      UserRepository
	groupRepo     GroupRepository
	billing       *BillingService
	templateRepo  ImageStudioTemplateRepository
	assetStore    ImageStudioTemplateAssetStore
}

type ImageStudioTemplateAssetStore interface {
	AssetRoot() string
	SavePreview(ctx context.Context, source, filename, contentType string, data []byte) (string, error)
	OpenPreview(ctx context.Context, source, filename string) (io.ReadCloser, string, error)
}

func NewImageStudioService(apiKeyService *APIKeyService, userRepo UserRepository, groupRepo GroupRepository, billing *BillingService, templateRepo ImageStudioTemplateRepository, assetStore ImageStudioTemplateAssetStore) *ImageStudioService {
	return &ImageStudioService{
		apiKeyService: apiKeyService,
		userRepo:      userRepo,
		groupRepo:     groupRepo,
		billing:       billing,
		templateRepo:  templateRepo,
		assetStore:    assetStore,
	}
}

type ImageStudioGroupOption struct {
	ID                   int64    `json:"id"`
	Name                 string   `json:"name"`
	ImagePrice1K         *float64 `json:"image_price_1k"`
	ImagePrice2K         *float64 `json:"image_price_2k"`
	ImagePrice4K         *float64 `json:"image_price_4k"`
	ImageRateMultiplier  float64  `json:"image_rate_multiplier"`
	ImageRateIndependent bool     `json:"image_rate_independent"`
}

type ImageStudioOptions struct {
	DefaultModel string                   `json:"default_model"`
	Balance      float64                  `json:"balance"`
	Groups       []ImageStudioGroupOption `json:"groups"`
	Prices       map[string]float64       `json:"prices"`
}

func (s *ImageStudioService) Options(ctx context.Context, userID int64) (*ImageStudioOptions, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	groups, err := s.apiKeyService.GetAvailableGroups(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := &ImageStudioOptions{
		DefaultModel: ImageStudioDefaultModel,
		Balance:      user.Balance,
		Groups:       make([]ImageStudioGroupOption, 0),
		Prices:       map[string]float64{},
	}
	for _, size := range []string{ImageBillingSize1K, ImageBillingSize2K, ImageBillingSize4K} {
		out.Prices[size] = s.imageCostForSize(nil, ImageStudioDefaultModel, size, 1).ActualCost
	}
	for i := range groups {
		group := &groups[i]
		if !s.isUsableImageGroup(group) {
			continue
		}
		out.Groups = append(out.Groups, ImageStudioGroupOption{
			ID:                   group.ID,
			Name:                 group.Name,
			ImagePrice1K:         group.ImagePrice1K,
			ImagePrice2K:         group.ImagePrice2K,
			ImagePrice4K:         group.ImagePrice4K,
			ImageRateMultiplier:  group.ImageRateMultiplier,
			ImageRateIndependent: group.ImageRateIndependent,
		})
	}
	return out, nil
}

func (s *ImageStudioService) Estimate(ctx context.Context, userID, groupID int64, size string, n int) (float64, string, error) {
	group, err := s.ValidateGroup(ctx, userID, groupID)
	if err != nil {
		return 0, "", err
	}
	if n <= 0 {
		return 0, "", infraerrors.BadRequest("INVALID_IMAGE_COUNT", "n must be greater than 0")
	}
	if n > 10 {
		return 0, "", infraerrors.BadRequest("INVALID_IMAGE_COUNT", "n must be <= 10")
	}
	tier, ok := ClassifyImageBillingTier(size)
	if !ok {
		return 0, "", infraerrors.BadRequest("INVALID_IMAGE_SIZE", "size must be 1K, 2K, or 4K")
	}
	cost := s.imageCostForSize(group, ImageStudioDefaultModel, tier, n)
	return cost.ActualCost, tier, nil
}

func (s *ImageStudioService) EnsureAPIKey(ctx context.Context, userID, groupID int64) (*APIKey, error) {
	key, err := s.apiKeyService.EnsureImageStudioAPIKey(ctx, userID, groupID)
	if err != nil {
		return nil, err
	}
	if key.User == nil {
		key.User, _ = s.userRepo.GetByID(ctx, userID)
	}
	if key.Group == nil {
		key.Group, _ = s.groupRepo.GetByID(ctx, groupID)
	}
	return key, nil
}

func (s *ImageStudioService) ValidateGroup(ctx context.Context, userID, groupID int64) (*Group, error) {
	groups, err := s.apiKeyService.GetAvailableGroups(ctx, userID)
	if err != nil {
		return nil, err
	}
	for i := range groups {
		if groups[i].ID == groupID && s.isUsableImageGroup(&groups[i]) {
			return &groups[i], nil
		}
	}
	return nil, ErrImageStudioGroupUnavailable
}

func (s *ImageStudioService) CheckBalance(ctx context.Context, userID int64, cost float64) (*User, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	if cost > 0 && user.Balance+1e-9 < cost {
		return nil, ErrImageStudioBalanceTooLow
	}
	return user, nil
}

func (s *ImageStudioService) isUsableImageGroup(group *Group) bool {
	return group != nil &&
		group.Platform == PlatformOpenAI &&
		group.Status == StatusActive &&
		GroupAllowsImageGeneration(group) &&
		group.ActiveAccountCount > 0
}

func (s *ImageStudioService) imageCost(group *Group, model string, n int) *CostBreakdown {
	return s.imageCostForSize(group, model, ImageBillingSize2K, n)
}

func (s *ImageStudioService) imageCostForSize(group *Group, model, size string, n int) *CostBreakdown {
	var cfg *ImagePriceConfig
	multiplier := 1.0
	if group != nil {
		cfg = &ImagePriceConfig{Price1K: group.ImagePrice1K, Price2K: group.ImagePrice2K, Price4K: group.ImagePrice4K}
		multiplier = group.RateMultiplier
		if group.ImageRateIndependent {
			multiplier = group.ImageRateMultiplier
		}
	}
	if strings.TrimSpace(model) == "" {
		model = ImageStudioDefaultModel
	}
	if s.billing == nil {
		return &CostBreakdown{}
	}
	return s.billing.CalculateImageCost(model, size, n, cfg, multiplier)
}
