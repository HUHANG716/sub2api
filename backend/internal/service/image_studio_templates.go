package service

import (
	"context"
	"fmt"
	"strings"

	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
)

type ImageStudioTemplateRepository interface {
	Create(ctx context.Context, template *ImageStudioTemplate) error
	GetByID(ctx context.Context, id int64) (*ImageStudioTemplate, error)
	Update(ctx context.Context, template *ImageStudioTemplate) error
	Delete(ctx context.Context, id int64) error
	List(ctx context.Context, filter ImageStudioTemplateFilter) ([]ImageStudioTemplate, error)
	UpsertMany(ctx context.Context, templates []ImageStudioTemplate) (int, error)
	ImportMany(ctx context.Context, templates []ImageStudioTemplate) (ImageStudioTemplateImportSaveStats, error)
}

type ImageStudioTemplate struct {
	ID                 int64    `json:"id,omitempty"`
	Key                string   `json:"key"`
	Mode               string   `json:"mode"`
	Title              string   `json:"title"`
	Model              string   `json:"model"`
	Image              string   `json:"image"`
	OriginalImageURL   string   `json:"original_image_url,omitempty"`
	ImageHash          string   `json:"image_hash,omitempty"`
	ImageDownloadError string   `json:"image_download_error,omitempty"`
	PromptHash         string   `json:"prompt_hash,omitempty"`
	Prompt             string   `json:"prompt"`
	SourceName         string   `json:"source_name"`
	SourceURL          string   `json:"source_url"`
	SourceType         string   `json:"source_type"`
	License            string   `json:"license,omitempty"`
	Author             string   `json:"author,omitempty"`
	Meta               string   `json:"meta"`
	Tags               []string `json:"tags,omitempty"`
	RequiresReference  bool     `json:"requires_reference"`
	Enabled            bool     `json:"enabled"`
	SortOrder          int      `json:"sort_order"`
}

type ImageStudioTemplateFilter struct {
	Mode            string
	Model           string
	Query           string
	IncludeDisabled bool
}

type ImageStudioTemplateCreateParams struct {
	Key                string   `json:"key"`
	Mode               string   `json:"mode"`
	Title              string   `json:"title"`
	Model              string   `json:"model"`
	Image              string   `json:"image"`
	OriginalImageURL   string   `json:"original_image_url"`
	ImageHash          string   `json:"image_hash"`
	ImageDownloadError string   `json:"image_download_error"`
	PromptHash         string   `json:"prompt_hash"`
	Prompt             string   `json:"prompt"`
	SourceName         string   `json:"source_name"`
	SourceURL          string   `json:"source_url"`
	SourceType         string   `json:"source_type"`
	License            string   `json:"license"`
	Author             string   `json:"author"`
	Meta               string   `json:"meta"`
	Tags               []string `json:"tags"`
	RequiresReference  bool     `json:"requires_reference"`
	Enabled            *bool    `json:"enabled"`
	SortOrder          int      `json:"sort_order"`
}

type ImageStudioTemplateUpdateParams struct {
	Key                *string   `json:"key"`
	Mode               *string   `json:"mode"`
	Title              *string   `json:"title"`
	Model              *string   `json:"model"`
	Image              *string   `json:"image"`
	OriginalImageURL   *string   `json:"original_image_url"`
	ImageHash          *string   `json:"image_hash"`
	ImageDownloadError *string   `json:"image_download_error"`
	PromptHash         *string   `json:"prompt_hash"`
	Prompt             *string   `json:"prompt"`
	SourceName         *string   `json:"source_name"`
	SourceURL          *string   `json:"source_url"`
	SourceType         *string   `json:"source_type"`
	License            *string   `json:"license"`
	Author             *string   `json:"author"`
	Meta               *string   `json:"meta"`
	Tags               *[]string `json:"tags"`
	RequiresReference  *bool     `json:"requires_reference"`
	Enabled            *bool     `json:"enabled"`
	SortOrder          *int      `json:"sort_order"`
}

var (
	ErrImageStudioTemplateNotFound = infraerrors.NotFound("IMAGE_STUDIO_TEMPLATE_NOT_FOUND", "image studio template not found")
	ErrImageStudioTemplateInvalid  = infraerrors.BadRequest("IMAGE_STUDIO_TEMPLATE_INVALID", "invalid image studio template")
	ErrImageStudioTemplateConflict = infraerrors.Conflict("IMAGE_STUDIO_TEMPLATE_CONFLICT", "image studio template key already exists")
)

type ImageStudioTemplateImportSaveStats struct {
	Created int `json:"created"`
	Updated int `json:"updated"`
}

func (s *ImageStudioService) Templates(ctx context.Context, filter ImageStudioTemplateFilter) ([]ImageStudioTemplate, error) {
	if s.templateRepo != nil {
		templates, err := s.templateRepo.List(ctx, filter)
		if err != nil {
			return nil, err
		}
		if len(templates) == 0 && shouldSeedDefaultImageStudioTemplates(filter) {
			if _, err := s.templateRepo.UpsertMany(ctx, imageStudioTemplates); err != nil {
				return nil, fmt.Errorf("seed image studio templates: %w", err)
			}
			return s.templateRepo.List(ctx, filter)
		}
		return templates, nil
	}
	return filterStaticImageStudioTemplates(filter), nil
}

func (s *ImageStudioService) CreateTemplate(ctx context.Context, params ImageStudioTemplateCreateParams) (*ImageStudioTemplate, error) {
	if s.templateRepo == nil {
		return nil, infraerrors.InternalServer("IMAGE_STUDIO_TEMPLATE_REPO_UNAVAILABLE", "image studio template repository is unavailable")
	}
	template := templateFromCreateParams(params)
	if err := validateImageStudioTemplate(&template); err != nil {
		return nil, err
	}
	if err := s.templateRepo.Create(ctx, &template); err != nil {
		return nil, fmt.Errorf("create image studio template: %w", err)
	}
	return &template, nil
}

func (s *ImageStudioService) GetTemplate(ctx context.Context, id int64) (*ImageStudioTemplate, error) {
	if s.templateRepo == nil {
		return nil, ErrImageStudioTemplateNotFound
	}
	return s.templateRepo.GetByID(ctx, id)
}

func (s *ImageStudioService) UpdateTemplate(ctx context.Context, id int64, params ImageStudioTemplateUpdateParams) (*ImageStudioTemplate, error) {
	if s.templateRepo == nil {
		return nil, ErrImageStudioTemplateNotFound
	}
	template, err := s.templateRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	applyImageStudioTemplateUpdate(template, params)
	if err := validateImageStudioTemplate(template); err != nil {
		return nil, err
	}
	if err := s.templateRepo.Update(ctx, template); err != nil {
		return nil, fmt.Errorf("update image studio template: %w", err)
	}
	return template, nil
}

func (s *ImageStudioService) DeleteTemplate(ctx context.Context, id int64) error {
	if s.templateRepo == nil {
		return ErrImageStudioTemplateNotFound
	}
	if err := s.templateRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("delete image studio template: %w", err)
	}
	return nil
}

func (s *ImageStudioService) SeedDefaultTemplates(ctx context.Context) (int, error) {
	if s.templateRepo == nil {
		return 0, infraerrors.InternalServer("IMAGE_STUDIO_TEMPLATE_REPO_UNAVAILABLE", "image studio template repository is unavailable")
	}
	count, err := s.templateRepo.UpsertMany(ctx, imageStudioTemplates)
	if err != nil {
		return 0, fmt.Errorf("seed image studio templates: %w", err)
	}
	return count, nil
}

func filterStaticImageStudioTemplates(filter ImageStudioTemplateFilter) []ImageStudioTemplate {
	mode := strings.ToLower(strings.TrimSpace(filter.Mode))
	model := normalizeImageStudioTemplateText(filter.Model)
	query := normalizeImageStudioTemplateText(filter.Query)

	out := make([]ImageStudioTemplate, 0, len(imageStudioTemplates))
	for _, template := range imageStudioTemplates {
		if !filter.IncludeDisabled && !template.Enabled {
			continue
		}
		if mode != "" && mode != "all" && template.Mode != mode {
			continue
		}
		if model != "" && !strings.Contains(normalizeImageStudioTemplateText(template.Model), model) {
			continue
		}
		if query != "" && !imageStudioTemplateMatches(template, query) {
			continue
		}
		out = append(out, template)
	}
	return out
}

func templateFromCreateParams(params ImageStudioTemplateCreateParams) ImageStudioTemplate {
	enabled := true
	if params.Enabled != nil {
		enabled = *params.Enabled
	}
	return ImageStudioTemplate{
		Key:                params.Key,
		Mode:               params.Mode,
		Title:              params.Title,
		Model:              params.Model,
		Image:              params.Image,
		OriginalImageURL:   params.OriginalImageURL,
		ImageHash:          params.ImageHash,
		ImageDownloadError: params.ImageDownloadError,
		PromptHash:         params.PromptHash,
		Prompt:             params.Prompt,
		SourceName:         params.SourceName,
		SourceURL:          params.SourceURL,
		SourceType:         params.SourceType,
		License:            params.License,
		Author:             params.Author,
		Meta:               params.Meta,
		Tags:               params.Tags,
		RequiresReference:  params.RequiresReference,
		Enabled:            enabled,
		SortOrder:          params.SortOrder,
	}
}

func applyImageStudioTemplateUpdate(template *ImageStudioTemplate, params ImageStudioTemplateUpdateParams) {
	if params.Key != nil {
		template.Key = *params.Key
	}
	if params.Mode != nil {
		template.Mode = *params.Mode
	}
	if params.Title != nil {
		template.Title = *params.Title
	}
	if params.Model != nil {
		template.Model = *params.Model
	}
	if params.Image != nil {
		template.Image = *params.Image
	}
	if params.OriginalImageURL != nil {
		template.OriginalImageURL = *params.OriginalImageURL
	}
	if params.ImageHash != nil {
		template.ImageHash = *params.ImageHash
	}
	if params.ImageDownloadError != nil {
		template.ImageDownloadError = *params.ImageDownloadError
	}
	if params.PromptHash != nil {
		template.PromptHash = *params.PromptHash
	}
	if params.Prompt != nil {
		template.Prompt = *params.Prompt
	}
	if params.SourceName != nil {
		template.SourceName = *params.SourceName
	}
	if params.SourceURL != nil {
		template.SourceURL = *params.SourceURL
	}
	if params.SourceType != nil {
		template.SourceType = *params.SourceType
	}
	if params.License != nil {
		template.License = *params.License
	}
	if params.Author != nil {
		template.Author = *params.Author
	}
	if params.Meta != nil {
		template.Meta = *params.Meta
	}
	if params.Tags != nil {
		template.Tags = *params.Tags
	}
	if params.RequiresReference != nil {
		template.RequiresReference = *params.RequiresReference
	}
	if params.Enabled != nil {
		template.Enabled = *params.Enabled
	}
	if params.SortOrder != nil {
		template.SortOrder = *params.SortOrder
	}
}

func validateImageStudioTemplate(template *ImageStudioTemplate) error {
	if template == nil {
		return ErrImageStudioTemplateInvalid
	}
	template.Key = strings.TrimSpace(template.Key)
	template.Mode = strings.ToLower(strings.TrimSpace(template.Mode))
	template.Title = strings.TrimSpace(template.Title)
	template.Model = strings.TrimSpace(template.Model)
	template.Image = strings.TrimSpace(template.Image)
	template.OriginalImageURL = strings.TrimSpace(template.OriginalImageURL)
	template.ImageHash = strings.TrimSpace(template.ImageHash)
	template.ImageDownloadError = strings.TrimSpace(template.ImageDownloadError)
	template.PromptHash = strings.TrimSpace(template.PromptHash)
	template.Prompt = strings.TrimSpace(template.Prompt)
	template.SourceName = strings.TrimSpace(template.SourceName)
	template.SourceURL = strings.TrimSpace(template.SourceURL)
	template.SourceType = strings.TrimSpace(template.SourceType)
	template.License = strings.TrimSpace(template.License)
	template.Author = strings.TrimSpace(template.Author)
	template.Meta = strings.TrimSpace(template.Meta)
	template.Tags = cleanImageStudioTemplateTags(template.Tags)
	if template.Key == "" || template.Title == "" || template.Model == "" || template.Image == "" || template.Prompt == "" {
		return ErrImageStudioTemplateInvalid
	}
	if template.Mode != "generation" && template.Mode != "edit" {
		return ErrImageStudioTemplateInvalid
	}
	return nil
}

func cleanImageStudioTemplateTags(tags []string) []string {
	out := make([]string, 0, len(tags))
	seen := map[string]bool{}
	for _, tag := range tags {
		tag = strings.ToLower(strings.TrimSpace(tag))
		if tag == "" || seen[tag] {
			continue
		}
		seen[tag] = true
		out = append(out, tag)
	}
	return out
}

func shouldSeedDefaultImageStudioTemplates(filter ImageStudioTemplateFilter) bool {
	mode := strings.ToLower(strings.TrimSpace(filter.Mode))
	return !filter.IncludeDisabled &&
		(mode == "" || mode == "all") &&
		strings.TrimSpace(filter.Model) == "" &&
		strings.TrimSpace(filter.Query) == ""
}

func imageStudioTemplateMatches(template ImageStudioTemplate, query string) bool {
	haystack := normalizeImageStudioTemplateText(strings.Join([]string{
		template.Key,
		template.Mode,
		template.Title,
		template.Model,
		template.Prompt,
		template.SourceName,
		template.Meta,
		strings.Join(template.Tags, " "),
	}, " "))
	return strings.Contains(haystack, query)
}

func normalizeImageStudioTemplateText(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

var imageStudioTemplates = []ImageStudioTemplate{
	{
		Key:        "gpt-miniature-skincare",
		Mode:       "generation",
		Title:      "微缩护肤广告",
		Model:      "GPT Image 2",
		Image:      "/image-studio/model-examples/gpt-miniature-skincare.jpg",
		Prompt:     "A hyper-realistic miniature diorama product advertisement featuring an oversized luxury skincare pump bottle labeled \"LUXEVEIL Skin Science - Radiance Nourishing Body Lotion\" in cream/beige with a polished gold pump top, placed on a circular platform. Tiny figurine construction workers dressed in yellow coveralls and white hard hats swarm around the bottle climbing scaffolding, painting the bottle with rollers, operating a tower crane, working near industrial tanks and pipework, and unloading a miniature flatbed truck. The scene includes metal scaffolding structures, industrial silos, orange traffic cones, wooden barricades, and storage barrels. The overall color palette is warm beige, cream, gold, and mustard yellow. Studio photography style with soft diffused lighting, no shadows, clean beige background. The concept metaphorically shows workers \"crafting\" or \"building\" the perfect lotion. Tilt-shift miniature aesthetic, ultra-detailed, commercial product photography, 8K resolution, photorealistic CGI render.",
		SourceName: "Awesome GPT Image 2 Prompts",
		SourceURL:  "https://github.com/EvoLinkAI/awesome-gpt-image-2-API-and-Prompts",
		SourceType: "github",
		License:    "CC0",
		Meta:       "CC0 · Case 151",
		Enabled:    true,
		Tags:       []string{"product", "advertising", "miniature"},
	},
	{
		Key:        "gpt-tvc-storyboard",
		Mode:       "generation",
		Title:      "商品 TVC 分镜",
		Model:      "GPT Image 2",
		Image:      "/image-studio/model-examples/gpt-tvc-storyboard.jpg",
		Prompt:     "Using the provided reference image, transform the single casual product photo into a polished e-commerce TVC storyboard board for a {argument name=\"video duration\" default=\"15-second\"} ad in a {argument name=\"aspect ratio\" default=\"9:16\"} vertical format, presented as a 9-panel grid. Keep the same blue-and-white ceramic ashtray as the product base, but restage it across cinematic advertising shots with warm premium lighting, shallow depth of field, and a refined lifestyle desktop environment. Add a dark storyboard layout with Chinese titles and timing for each panel. Include exactly 9 scenes: 1) environment-establishing wide shot with desk, books, window, and the product placed in context; 2) hero product medium shot on the table; 3) extreme close-up of the blue floral craftsmanship pattern; 4) use case showing a hand placing a cigarette into the ashtray with visible smoke; 5) top-down capacity display showing multiple cigarette butts inside; 6) cleaning scene under running water in a sink with a hand holding the product; 7) bottom-detail close-up showing the underside and anti-slip pads; 8) mood/lifestyle scene at night with the product on a desk, smoke rising, and ambient lamp light; 9) brand closing frame with the product as the hero plus Chinese marketing text. Add the overall header text \"产品TVC分镜脚本(15秒 / 9:16竖屏 / 9宫格)\" and a product subtitle naming it {argument name=\"product name\" default=\"青花瓷烟灰缸\"}. Give each of the 9 panels a Chinese scene title and timestamp, plus small descriptive Chinese copy beneath each image in the style of a professional commercial shot list. Use premium, realistic commercial photography throughout, consistent product identity, elegant Chinese aesthetic, and a clean high-end storyboard presentation.",
		SourceName: "Awesome GPT Image 2 Prompts",
		SourceURL:  "https://github.com/EvoLinkAI/awesome-gpt-image-2-API-and-Prompts",
		SourceType: "github",
		License:    "CC0",
		Meta:       "CC0 · Case 160",
		Enabled:    true,
		Tags:       []string{"product", "storyboard", "ecommerce"},
	},
	{
		Key:        "gpt-industrial-sheet",
		Mode:       "generation",
		Title:      "工业设计提案板",
		Model:      "GPT Image 2",
		Image:      "/image-studio/model-examples/gpt-industrial-sheet.jpg",
		Prompt:     "Core Subject: [{argument name=\"reference\" default=\"use the uploaded image\"}, keep the details, typography and structure locked 100%]\n\nLayout & Composition: A {argument name=\"presentation type\" default=\"professional industrial design presentation sheet\"}. The image should be organized into a clean grid system.\n\nTop Row: A 3x3 layout showing top-down flat lay views and close-up macro details of materials.\n\nMiddle Section: Three hero shots of the product standing upright in different color ways (Matte Black, Arctic White, and accented variants). The products should be slightly tilted to show depth and form.\n\nBottom Section: A dynamic \"floating\" composition featuring two products overlapping at opposing angles to showcase the front and side profiles simultaneously.\n\nEnvironment & Lighting: Set against a minimalist, neutral studio gray background. Soft top-down lighting with realistic contact shadows. High-end product photography aesthetic.\n\nStyle & Finish: Matte textures, clean silhouettes, and sharp edges. Leave designated blank areas on the product surfaces for \"Placeholder Branding\" and \"Graphic Mockups.\" 4k resolution, Unreal Engine 5 render style, hyper-realistic, clean aesthetic.",
		SourceName: "Awesome GPT Image 2 Prompts",
		SourceURL:  "https://github.com/EvoLinkAI/awesome-gpt-image-2-API-and-Prompts",
		SourceType: "github",
		License:    "CC0",
		Meta:       "CC0 · Case 116",
		Enabled:    true,
		Tags:       []string{"industrial", "product", "presentation"},
	},
	{
		Key:        "gpt-museum-hanfu",
		Mode:       "generation",
		Title:      "中文博物馆图鉴",
		Model:      "GPT Image 2",
		Image:      "/image-studio/model-examples/gpt-museum-hanfu.jpg",
		Prompt:     "请根据【主题】自动生成一张“博物馆图鉴式中文拆解信息图”。\n\n要求整张图兼具真实写实主视觉、结构拆解、中文标注、材质说明、纹样寓意、色彩含义和核心特征总结。你需要根据【主题】自动判断最合适的主体对象、服饰体系、器物结构、时代风格、关键部件、材质工艺、颜色方案与版式结构，用户无需再提供其他信息。\n\n整体风格应为：国家博物馆展板、历史服饰图鉴、文博专题信息图，而不是普通海报、古风写真、电商详情页或动漫插画。背景采用米白、绢纸白、浅茶色等纸张质感，整体高级、克制、专业、可收藏。\n\n版式固定为：顶部：中文主标题 + 副标题 + 导语；左侧：结构拆解区，中文引线标注关键部件，并配局部特写；右上：材质 / 工艺 / 质感区，展示真实纹理小样并附说明；右中：纹样 / 色彩 / 寓意区，展示主色板、纹样样本和文化解释；底部：穿着顺序 / 构成流程图 + 核心特征总结。\n\n若主题适合人物展示，则以真实人物全身站姿为中央主体；若更适合器物或单体结构，则改为中心主体拆解图，但整体仍保持完整中文信息图形式。所有文字必须为简体中文，清晰、规整、可读，不要乱码、错字、英文或拼音。重点突出真实结构、材质差异、文化说明与图鉴气质。\n\n避免：海报感、影楼感、电商感、动漫感、cosplay感、乱标注、错结构、糊字、假材质、过度装饰。",
		SourceName: "Awesome GPT Image 2 Prompts",
		SourceURL:  "https://github.com/EvoLinkAI/awesome-gpt-image-2-API-and-Prompts",
		SourceType: "github",
		License:    "CC0",
		Meta:       "CC0 · Case 25",
		Enabled:    true,
		Tags:       []string{"chinese", "infographic", "museum"},
	},
	{
		Key:        "gpt-western-poster",
		Mode:       "generation",
		Title:      "暗黑西部海报",
		Model:      "GPT Image 2",
		Image:      "/image-studio/model-examples/gpt-western-poster.jpg",
		Prompt:     "高级电影感西部亡命徒海报，竖版 2:3 构图，暗黑西部游戏角色设定海报风格。一个神秘蒙面牛仔与黑马站在荒漠边境，人物全身正面，宽檐牛仔帽压低，花纹面巾遮住下半张脸，深色长发，黑色皮革手套，黑色西部夹克与多层皮革装备，子弹带、左轮枪套、金属腰带扣、厚重长靴，肩上披着红棕色几何图案披毯，边缘破损飘动。人物姿态冷静危险，一只手靠近枪套。右侧黑马半身入镜，带白色额纹，缰绳细节清晰。背景是暴风雨中的西部荒漠，闪电、乌云、远处峡谷岩壁、枯树、沙尘、烟雾、火星、泥地反光，氛围压抑史诗。画面左侧是复古羊皮纸留白，右侧是黑暗风暴场景，强烈明暗分割。加入大号竖排英文标题、通缉令信息、人物档案、坐标、地图网格、细线框、圆形罗盘图形、小红色标记、签名印章等高级海报排版元素。风格：黑色墨迹飞溅、旧纸纹理、电影级写实、暗黑西部、强烈明暗对比、皮革和金属超细节、尘土、泥点、划痕、烟雾、火星、边缘轮廓光、高级收藏级游戏海报、荒野大镖客氛围、艺术设定集质感、8K、高细节。",
		SourceName: "Awesome GPT Image 2 Prompts",
		SourceURL:  "https://github.com/EvoLinkAI/awesome-gpt-image-2-API-and-Prompts",
		SourceType: "github",
		License:    "CC0",
		Meta:       "CC0 · Case 253",
		Enabled:    true,
		Tags:       []string{"poster", "character", "chinese"},
	},
	{
		Key:        "gpt-recipe-infographic",
		Mode:       "generation",
		Title:      "食谱信息图",
		Model:      "GPT Image 2",
		Image:      "/image-studio/model-examples/gpt-recipe-infographic.jpg",
		Prompt:     "Create step-by-step recipe infographic for creamy garlic mushroom pasta, top-down view, minimal style on white background, ingredient photos labeled: \"200g spaghetti\", \"150g mushrooms\", \"3 garlic cloves\", \"200ml cream\", \"1 tbsp olive oil\", \"parmesan\", \"parsley\", dotted lines showing process steps with icons (boiling pot, sauté pan, mixing), final plated pasta shot at the bottom",
		SourceName: "Awesome GPT Image 2 Prompts",
		SourceURL:  "https://github.com/EvoLinkAI/awesome-gpt-image-2-API-and-Prompts",
		SourceType: "github",
		License:    "CC0",
		Meta:       "CC0 · Case 127",
		Enabled:    true,
		Tags:       []string{"recipe", "infographic"},
	},
	{
		Key:        "nano-product-storyboard",
		Mode:       "generation",
		Title:      "商品九宫格分镜",
		Model:      "Nano Banana",
		Image:      "/image-studio/model-examples/nano-product-storyboard.jpg",
		Prompt:     "Create ONE final image. A clean 3x3 [ratio] storyboard grid with nine equal [ratio] sized panels on [4:5] ratio. Use the reference image as the base product reference. Keep the same product, packaging design, branding, materials, colors, proportions and overall identity across all nine panels exactly as the reference. The product must remain clearly recognizable in every frame. The label, logo and proportions must stay exactly the same. This storyboard is a high-end designer mockup presentation for a branding portfolio. The focus is on form, composition, materiality and visual rhythm rather than realism or lifestyle narrative. Include hero shot, close-up texture, environment shot, minimal interaction, isometric arrangement, levitating product, label detail, unexpected editorial setting, and refined in-use setup. Ultra high-quality studio imagery with a real camera look, controlled depth of field, precise lighting, accurate materials and reflections. Output a clean 3x3 grid with no borders, no text, no captions and no watermarks.",
		SourceName: "NanoBanana Trending Prompts / MeiGen.ai",
		SourceURL:  "https://github.com/jau123/nanobanana-trending-prompts",
		SourceType: "github",
		License:    "CC BY 4.0",
		Author:     "@Dari_Designs",
		Meta:       "CC BY 4.0 · @Dari_Designs · 5072 likes",
		Enabled:    true,
		Tags:       []string{"product", "storyboard", "nanobanana"},
	},
	{
		Key:        "nano-3d-icons",
		Mode:       "generation",
		Title:      "3D 图标套组",
		Model:      "Nano Banana",
		Image:      "/image-studio/model-examples/nano-3d-icons.jpg",
		Prompt:     "Create a collection of icons representing [a theme], they belong together as a single theme. Put them in a 3x3 grid. The background is white. Make the icons in a colorful and tactile 3D style. No text. Example themes: dogs with different emotions, bananas, January, or the same cat in different emotions.",
		SourceName: "NanoBanana Trending Prompts / MeiGen.ai",
		SourceURL:  "https://github.com/jau123/nanobanana-trending-prompts",
		SourceType: "github",
		License:    "CC BY 4.0",
		Author:     "@NanoBanana",
		Meta:       "CC BY 4.0 · @NanoBanana · 2506 likes",
		Enabled:    true,
		Tags:       []string{"icons", "3d", "nanobanana"},
	},
	{
		Key:        "nano-character-transfer",
		Mode:       "generation",
		Title:      "参考图角色转换",
		Model:      "Nano Banana",
		Image:      "/image-studio/model-examples/nano-character-transfer.jpg",
		Prompt:     "Task: image_style_transfer_3d_character. Use USER_UPLOADED_IMAGE as the source image. Preserve identity, pose, and composition. Re-render as a stylized 3D character with a soft minimal cartoon 3D aesthetic, toy-figure render quality, clean product character design, smooth matte plastic skin, simplified rounded facial features, minimal streetwear, studio softbox lighting, very soft shadows, muted pastel background, front-facing medium close-up, clean edges, no noise, stylized over realistic.",
		SourceName: "NanoBanana Trending Prompts / MeiGen.ai",
		SourceURL:  "https://github.com/jau123/nanobanana-trending-prompts",
		SourceType: "github",
		License:    "CC BY 4.0",
		Author:     "@firatbilal",
		Meta:       "CC BY 4.0 · @firatbilal · 1694 likes",
		Enabled:    true,
		Tags:       []string{"character", "style-transfer", "nanobanana"},
	},
	{
		Key:        "nano-four-part-story",
		Mode:       "generation",
		Title:      "四格连续故事",
		Model:      "Nano Banana",
		Image:      "/image-studio/model-examples/nano-four-part-story.jpg",
		Prompt:     "Create a funny 4-part story featuring 3 fluffy creatures building a treehouse. The story has emotional highs and lows and ends in a happy moment. Maintain consistent identity across the 3 characters. Generate 4 images in 16:9 format, one at a time.",
		SourceName: "NanoBanana Trending Prompts / MeiGen.ai",
		SourceURL:  "https://github.com/jau123/nanobanana-trending-prompts",
		SourceType: "github",
		License:    "CC BY 4.0",
		Author:     "@GoogleAI",
		Meta:       "CC BY 4.0 · @GoogleAI · 1304 likes",
		Enabled:    true,
		Tags:       []string{"story", "sequence", "nanobanana"},
	},
	{
		Key:        "nano-cn-new-year-grid",
		Mode:       "generation",
		Title:      "中文新年九宫格",
		Model:      "Nano Banana",
		Image:      "/image-studio/model-examples/nano-cn-new-year-grid.jpg",
		Prompt:     "生成一张九宫格新年祝福肖像，1:1，3x3。九宫格内为同一位亚洲男性，干净、阳光、自然，不油腻；黑色短发，自然蓬松；红色针织毛衣或卫衣，简洁无图案；真实自然肤质，克制微笑。九格分别使用不同手势：食指竖于嘴前、比 V、OK、双手轻松手势、单手遮半脸、电话手势、轻点脸颊、托下巴、克制比心变体。每格顶部居中使用传统中文新年书法字体，中国红文字 + 深蓝年份，依次写“一帆风顺 2026、双喜临门 2026、三阳开泰 2026、四季发财 2026、五福临门 2026、六六大顺 2026、七星高照 2026、八方来财 2026、九九同心 2026”。保持人物脸型五官、服装颜色和拍摄距离一致；纯色白墙背景，自然柔光，不添加复杂节日道具。",
		SourceName: "NanoBanana Trending Prompts / MeiGen.ai",
		SourceURL:  "https://github.com/jau123/nanobanana-trending-prompts",
		SourceType: "github",
		License:    "CC BY 4.0",
		Author:     "@wanerfu",
		Meta:       "CC BY 4.0 · @wanerfu · 1234 likes",
		Enabled:    true,
		Tags:       []string{"chinese", "portrait", "grid", "nanobanana"},
	},
	{
		Key:        "nano-cn-westlake-magnet",
		Mode:       "generation",
		Title:      "西湖珐琅冰箱贴",
		Model:      "Nano Banana",
		Image:      "/image-studio/model-examples/nano-cn-westlake-magnet.jpg",
		Prompt:     "珐琅彩琉璃艺术风格，金属质感，制作一枚冰箱贴，写着\"西湖·杭州 WEST LAKE\"字样。冰箱贴以断桥拱形轮廓为基底外形，金色金属边框包边。画面描绘西湖经典风景：断桥残雪、湖面莲叶、楼外楼画舫、雷峰塔剪影、三潭印月石灯、粉色桃花与垂柳。左侧点缀龙井茶叶图案，右侧装饰杭绣扇面。采用珐琅彩填色工艺：湖水呈透明翠绿，金属线勾勒波纹细节。浅咖色背景，正面展示，所有元素严格控制在基底轮廓范围内，布局美观协调，产品摄影质感，8K细节。",
		SourceName: "NanoBanana Trending Prompts / MeiGen.ai",
		SourceURL:  "https://github.com/jau123/nanobanana-trending-prompts",
		SourceType: "github",
		License:    "CC BY 4.0",
		Author:     "@VigoCreativeAI",
		Meta:       "CC BY 4.0 · @VigoCreativeAI · 530 likes",
		Enabled:    true,
		Tags:       []string{"chinese", "product", "souvenir", "nanobanana"},
	},
	{
		Key:        "nano-exploded-product",
		Mode:       "generation",
		Title:      "产品爆炸拆解图",
		Model:      "Nano Banana",
		Image:      "/image-studio/model-examples/nano-exploded-product.jpg",
		Prompt:     "Create an exploded products with inner mechanics [product], high-end product advertising, white seamless background, exploded view with inner mechanics revealed, outer shell hovering above core, micro screws and components suspended, perfect alignment guides implied, crisp soft shadow, ultra realistic, macro product photography, 100mm lens look, f/8, 8k, 1:1",
		SourceName: "NanoBanana Trending Prompts / MeiGen.ai",
		SourceURL:  "https://github.com/jau123/nanobanana-trending-prompts",
		SourceType: "github",
		License:    "CC BY 4.0",
		Author:     "@azed_ai",
		Meta:       "CC BY 4.0 · @azed_ai · 1299 likes",
		Enabled:    true,
		Tags:       []string{"product", "exploded-view", "nanobanana"},
	},
	{
		Key:        "nano-travel-guide",
		Mode:       "generation",
		Title:      "3D 旅行指南",
		Model:      "Nano Banana",
		Image:      "/image-studio/model-examples/nano-travel-guide.jpg",
		Prompt:     "A hyper-realistic 3D travel guide infographic poster for [COUNTRY]. The country shape is rendered as a raised, textured terrain map floating on a clean light gray surface. Iconic landmarks are placed as miniature 3D sculpted models at their correct geographic locations across the map, each one highly detailed and photorealistic. Roads or railway lines connect key cities as white paths across the terrain. Around the map, floating 3D decorative props related to travel are scattered: a vintage leather suitcase with travel stickers, a compass rose, crystal heart charms, and a postage stamp seal reading \"Travel to COUNTRY.\" The national flag of [COUNTRY] is shown as a small realistic folded flag in the upper right corner. Each major city has a bold black label on the map, and beside the map, each city has a neat checklist of its top attractions in clean sans-serif typography. A large bold title at the top reads \"TRAVEL GUIDE TO COUNTRY\" in black uppercase typography. Premium editorial travel content, soft studio lighting, photorealistic 3D render, white/light gray background, clean layout.",
		SourceName: "NanoBanana Trending Prompts / MeiGen.ai",
		SourceURL:  "https://github.com/jau123/nanobanana-trending-prompts",
		SourceType: "github",
		License:    "CC BY 4.0",
		Author:     "@TechieBySA",
		Meta:       "CC BY 4.0 · @TechieBySA · 3725 likes",
		Enabled:    true,
		Tags:       []string{"travel", "infographic", "nanobanana"},
	},
}
