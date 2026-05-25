package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
)

const (
	imageStudioTemplatePreviewMaxBytes = 5 << 20
	imageStudioTemplateImportTimeout   = 15 * time.Second
	imageStudioTemplatePreviewBasePath = "/api/v1/images/template-assets/previews"
	imageStudioTemplateLocalAssetMode  = "local"
)

var (
	imageStudioGitHubSourceSlugPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,63}$`)
	imageStudioPreviewFilenamePattern  = regexp.MustCompile(`^[a-f0-9]{64}\.(jpg|jpeg|png|webp)$`)
)

type ImageStudioTemplateGitHubImportParams struct {
	Sources []string `json:"sources"`
	Limit   int      `json:"limit"`
}

type ImageStudioTemplateGitHubImportResult struct {
	Discovered       int      `json:"discovered"`
	Created          int      `json:"created"`
	Updated          int      `json:"updated"`
	ImageDownloaded  int      `json:"image_downloaded"`
	ImageFailed      int      `json:"image_failed"`
	Sources          []string `json:"sources"`
	Errors           []string `json:"errors,omitempty"`
	PreviewAssetRoot string   `json:"preview_asset_root"`
}

type imageStudioGitHubImportSource struct {
	Slug               string
	Name               string
	Model              string
	License            string
	Kind               string
	MarkdownURL        string
	ContentsURL        string
	EntryHeadingPrefix string
	IncludePrefix      string
	JSONURL            string
	RepoURL            string
	Tags               []string
}

type imageStudioGitHubContentItem struct {
	Name        string `json:"name"`
	Path        string `json:"path"`
	Type        string `json:"type"`
	DownloadURL string `json:"download_url"`
	HTMLURL     string `json:"html_url"`
}

type imageStudioNanoPromptRecord struct {
	Rank       int      `json:"rank"`
	ID         string   `json:"id"`
	Prompt     string   `json:"prompt"`
	Author     string   `json:"author"`
	AuthorName string   `json:"author_name"`
	Likes      int      `json:"likes"`
	Views      int      `json:"views"`
	Image      string   `json:"image"`
	Images     []string `json:"images"`
	Model      string   `json:"model"`
	Categories []string `json:"categories"`
	Rating     int      `json:"rating"`
	Score      float64  `json:"score"`
	Date       string   `json:"date"`
	SourceURL  string   `json:"source_url"`
}

var imageStudioGitHubImportSources = []imageStudioGitHubImportSource{
	{
		Slug:               "gpt-image-2",
		Name:               "Awesome GPT Image 2 Prompts",
		Model:              "GPT Image 2",
		License:            "CC0",
		Kind:               "markdown",
		MarkdownURL:        "https://raw.githubusercontent.com/EvoLinkAI/awesome-gpt-image-2-API-and-Prompts/main/README.md",
		EntryHeadingPrefix: "### ",
		RepoURL:            "https://github.com/EvoLinkAI/awesome-gpt-image-2-API-and-Prompts",
		Tags:               []string{"gpt-image-2"},
	},
	{
		Slug:    "nano-banana",
		Name:    "Nano Banana Trending Prompts",
		Model:   "Nano Banana",
		License: "MIT",
		Kind:    "json",
		JSONURL: "https://raw.githubusercontent.com/jau123/nanobanana-trending-prompts/main/prompts/prompts.json",
		RepoURL: "https://github.com/jau123/nanobanana-trending-prompts",
		Tags:    []string{"nano-banana"},
	},
	{
		Slug:               "gpt-image-2-skill",
		Name:               "GPT Image 2 Skill Gallery",
		Model:              "GPT Image 2",
		License:            "MIT",
		Kind:               "markdown_index",
		ContentsURL:        "https://api.github.com/repos/wuyoscar/GPT-Image2-Skill/contents/skills/gpt-image/references?ref=main",
		EntryHeadingPrefix: "### ",
		IncludePrefix:      "gallery-",
		RepoURL:            "https://github.com/wuyoscar/GPT-Image2-Skill",
		Tags:               []string{"gpt-image-2", "gallery"},
	},
	{
		Slug:               "magiccreator-gpt-image-2",
		Name:               "MagicCreator GPT Image 2 Prompts",
		Model:              "GPT Image 2",
		License:            "MIT",
		Kind:               "markdown",
		MarkdownURL:        "https://raw.githubusercontent.com/magiccreator-ai/awesome-gpt-image-2-prompts/main/README.md",
		EntryHeadingPrefix: "## ",
		RepoURL:            "https://github.com/magiccreator-ai/awesome-gpt-image-2-prompts",
		Tags:               []string{"gpt-image-2", "twitter"},
	},
	{
		Slug:               "awesome-ai-image-prompts",
		Name:               "Awesome AI Image Prompts",
		Model:              "Nano Banana / GPT Image",
		License:            "MIT",
		Kind:               "markdown",
		MarkdownURL:        "https://raw.githubusercontent.com/devanshug2307/Awesome-AI-Image-Prompts/main/README.md",
		EntryHeadingPrefix: "### ",
		RepoURL:            "https://github.com/devanshug2307/Awesome-AI-Image-Prompts",
		Tags:               []string{"community", "multi-model"},
	},
}

func (s *ImageStudioService) ImportGitHubTemplates(ctx context.Context, params ImageStudioTemplateGitHubImportParams) (*ImageStudioTemplateGitHubImportResult, error) {
	if s.templateRepo == nil {
		return nil, ErrImageStudioTemplateNotFound
	}
	client := &http.Client{Timeout: imageStudioTemplateImportTimeout}
	result := &ImageStudioTemplateGitHubImportResult{
		Sources:          make([]string, 0),
		Errors:           make([]string, 0),
		PreviewAssetRoot: s.imageStudioTemplatePreviewAssetRoot(),
	}
	sources := selectedImageStudioGitHubImportSources(params.Sources)
	for _, source := range sources {
		result.Sources = append(result.Sources, source.Slug)
		templates, err := fetchImageStudioTemplatesFromGitHub(ctx, client, source)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", source.Slug, err))
			continue
		}
		if params.Limit > 0 && len(templates) > params.Limit {
			templates = templates[:params.Limit]
		}
		result.Discovered += len(templates)
		for i := range templates {
			templates[i].Enabled = false
			if templates[i].PromptHash == "" {
				templates[i].PromptHash = imageStudioTemplateHash(templates[i].Prompt)
			}
			publicURL, imageHash, err := cacheImageStudioTemplatePreview(imageStudioTemplateAssetStoreContext(ctx, s.assetStore), client, source.Slug, templates[i].OriginalImageURL)
			if err != nil {
				templates[i].ImageDownloadError = err.Error()
				if templates[i].Image == "" {
					templates[i].Image = templates[i].OriginalImageURL
				}
				result.ImageFailed++
				continue
			}
			templates[i].Image = publicURL
			templates[i].ImageHash = imageHash
			templates[i].ImageDownloadError = ""
			result.ImageDownloaded++
		}
		stats, err := s.templateRepo.ImportMany(ctx, templates)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("%s save: %v", source.Slug, err))
			continue
		}
		result.Created += stats.Created
		result.Updated += stats.Updated
	}
	return result, nil
}

func (s *ImageStudioService) imageStudioTemplatePreviewAssetRoot() string {
	if s != nil && s.assetStore != nil {
		return s.assetStore.AssetRoot()
	}
	return imageStudioTemplatePreviewRoot()
}

func selectedImageStudioGitHubImportSources(names []string) []imageStudioGitHubImportSource {
	selected := map[string]bool{}
	for _, name := range names {
		name = strings.ToLower(strings.TrimSpace(name))
		if name != "" && name != "all" {
			selected[name] = true
		}
	}
	out := make([]imageStudioGitHubImportSource, 0, len(imageStudioGitHubImportSources))
	for _, source := range imageStudioGitHubImportSources {
		if len(selected) == 0 || selected[source.Slug] {
			out = append(out, source)
		}
	}
	return out
}

func fetchImageStudioTemplatesFromGitHub(ctx context.Context, client *http.Client, source imageStudioGitHubImportSource) ([]ImageStudioTemplate, error) {
	switch source.Kind {
	case "json":
		body, err := fetchImageStudioImportText(ctx, client, source.JSONURL, 8<<20)
		if err != nil {
			return nil, err
		}
		return parseNanoBananaPromptJSON(source, body)
	case "markdown_index":
		return fetchImageStudioTemplatesFromMarkdownIndex(ctx, client, source)
	default:
		body, err := fetchImageStudioImportText(ctx, client, source.MarkdownURL, 8<<20)
		if err != nil {
			return nil, err
		}
		return parseImageStudioMarkdownTemplates(source, body, source.MarkdownURL), nil
	}
}

func fetchImageStudioTemplatesFromMarkdownIndex(ctx context.Context, client *http.Client, source imageStudioGitHubImportSource) ([]ImageStudioTemplate, error) {
	body, err := fetchImageStudioImportText(ctx, client, source.ContentsURL, 4<<20)
	if err != nil {
		return nil, err
	}
	var items []imageStudioGitHubContentItem
	if err := json.Unmarshal([]byte(body), &items); err != nil {
		return nil, err
	}
	out := make([]ImageStudioTemplate, 0)
	for _, item := range items {
		if item.Type != "file" || !strings.HasSuffix(strings.ToLower(item.Name), ".md") || item.DownloadURL == "" {
			continue
		}
		if source.IncludePrefix != "" && !strings.HasPrefix(item.Name, source.IncludePrefix) {
			continue
		}
		markdown, err := fetchImageStudioImportText(ctx, client, item.DownloadURL, 4<<20)
		if err != nil {
			return out, err
		}
		fileSource := source
		fileSource.Tags = append(append([]string{}, source.Tags...), strings.TrimSuffix(item.Name, ".md"))
		templates := parseImageStudioMarkdownTemplates(fileSource, markdown, item.DownloadURL)
		out = append(out, templates...)
	}
	return out, nil
}

func fetchImageStudioImportText(ctx context.Context, client *http.Client, rawURL string, maxBytes int64) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "sub2api-image-studio-importer/1.0")
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("fetch %s: http %d", rawURL, resp.StatusCode)
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, maxBytes+1))
	if err != nil {
		return "", err
	}
	if int64(len(data)) > maxBytes {
		return "", fmt.Errorf("fetch %s: response too large", rawURL)
	}
	return string(data), nil
}

func parseNanoBananaPromptJSON(source imageStudioGitHubImportSource, body string) ([]ImageStudioTemplate, error) {
	var records []imageStudioNanoPromptRecord
	if err := json.Unmarshal([]byte(body), &records); err != nil {
		return nil, err
	}
	out := make([]ImageStudioTemplate, 0, len(records))
	for _, record := range records {
		prompt := strings.TrimSpace(record.Prompt)
		imageURL := firstNonEmpty(record.Image, firstString(record.Images))
		if prompt == "" || imageURL == "" {
			continue
		}
		promptHash := imageStudioTemplateHash(prompt)
		tags := append([]string{}, source.Tags...)
		for _, category := range record.Categories {
			tags = append(tags, strings.ToLower(strings.TrimSpace(category)))
		}
		title := nanoBananaTemplateTitle(record)
		sourceURL := firstNonEmpty(record.SourceURL, source.RepoURL)
		out = append(out, ImageStudioTemplate{
			Key:              fmt.Sprintf("%s-%s", source.Slug, imageStudioStableKeyPart(firstNonEmpty(record.ID, promptHash))),
			Mode:             "generation",
			Title:            title,
			Model:            source.Model,
			Image:            imageURL,
			OriginalImageURL: imageURL,
			PromptHash:       promptHash,
			Prompt:           prompt,
			SourceName:       source.Name,
			SourceURL:        sourceURL,
			SourceType:       "github",
			License:          source.License,
			Author:           firstNonEmpty(record.AuthorName, record.Author),
			Meta:             nanoBananaTemplateMeta(record),
			Tags:             cleanImageStudioTemplateTags(tags),
			Enabled:          false,
			SortOrder:        record.Rank,
		})
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].SortOrder < out[j].SortOrder })
	return out, nil
}

func parseImageStudioMarkdownTemplates(source imageStudioGitHubImportSource, body, markdownURL string) []ImageStudioTemplate {
	lines := strings.Split(body, "\n")
	sections := make([]string, 0)
	currentCategory := ""
	var current []string
	entryPrefix := source.EntryHeadingPrefix
	if entryPrefix == "" {
		entryPrefix = "### "
	}
	for _, line := range lines {
		if strings.HasPrefix(line, "## ") && !strings.HasPrefix(line, entryPrefix) {
			currentCategory = cleanMarkdownTitle(line)
		}
		if strings.HasPrefix(line, entryPrefix) {
			if len(current) > 0 {
				sections = append(sections, strings.Join(current, "\n"))
			}
			current = []string{"<!-- category: " + currentCategory + " -->", line}
			continue
		}
		if len(current) > 0 {
			current = append(current, line)
		}
	}
	if len(current) > 0 {
		sections = append(sections, strings.Join(current, "\n"))
	}
	out := make([]ImageStudioTemplate, 0, len(sections))
	for _, section := range sections {
		template, ok := parseImageStudioMarkdownTemplateSection(source, section, markdownURL)
		if ok {
			out = append(out, template)
		}
	}
	return out
}

func parseImageStudioMarkdownTemplateSection(source imageStudioGitHubImportSource, section, markdownURL string) (ImageStudioTemplate, bool) {
	headingPattern := regexp.MustCompile(`(?m)^#{2,4}\s+(.+)$`)
	heading := firstMatchingSubmatch(section, headingPattern, 1)
	title := cleanMarkdownTitle(heading)
	prompt := extractFirstFencedCode(section)
	imageURL := resolveImageStudioMarkdownURL(markdownURL, extractFirstImageURL(section))
	if title == "" || prompt == "" || imageURL == "" {
		return ImageStudioTemplate{}, false
	}
	category := strings.TrimSpace(firstMatchingSubmatch(section, regexp.MustCompile(`<!-- category:\s*(.*?)\s*-->`), 1))
	sourceURL := firstMatchingSubmatch(heading, regexp.MustCompile(`\]\((https?://[^)]+)\)`), 1)
	if sourceURL == "" {
		sourceURL = source.RepoURL
	}
	author := firstMatchingSubmatch(heading, regexp.MustCompile(`(?i)\(by\s+\[@?([^\]]+)\]`), 1)
	caseNo := firstNonEmpty(
		firstMatchingSubmatch(heading, regexp.MustCompile(`(?i)Case\s+([0-9]+)`), 1),
		firstMatchingSubmatch(heading, regexp.MustCompile(`(?i)No\.\s*([0-9]+)`), 1),
		firstMatchingSubmatch(heading, regexp.MustCompile(`^([0-9]+(?:\.[0-9]+)?)\.`), 1),
	)
	promptHash := imageStudioTemplateHash(prompt)
	sortOrder := imageStudioSortOrderFromCase(caseNo)
	tags := append([]string{}, source.Tags...)
	tags = append(tags, strings.ToLower(category))
	return ImageStudioTemplate{
		Key:              fmt.Sprintf("%s-%s", source.Slug, imageStudioStableKeyPart(firstNonEmpty(caseNo, promptHash[:12]))),
		Mode:             "generation",
		Title:            title,
		Model:            source.Model,
		Image:            imageURL,
		OriginalImageURL: imageURL,
		PromptHash:       promptHash,
		Prompt:           prompt,
		SourceName:       source.Name,
		SourceURL:        sourceURL,
		SourceType:       "github",
		License:          source.License,
		Author:           author,
		Meta:             imageStudioMarkdownMeta(caseNo, category),
		Tags:             cleanImageStudioTemplateTags(tags),
		Enabled:          false,
		SortOrder:        sortOrder,
	}, true
}

func extractFirstFencedCode(section string) string {
	match := regexp.MustCompile("(?s)```(?:[a-zA-Z0-9_-]+)?\\s*\\n(.*?)\\n```").FindStringSubmatch(section)
	if len(match) < 2 {
		return ""
	}
	return strings.TrimSpace(match[1])
}

func extractFirstImageURL(section string) string {
	patterns := []*regexp.Regexp{
		regexp.MustCompile(`(?i)<img[^>]+src=["']([^"']+)["']`),
		regexp.MustCompile(`!\[[^\]]*]\(([^)]+)\)`),
	}
	for _, pattern := range patterns {
		match := pattern.FindStringSubmatch(section)
		if len(match) >= 2 {
			return strings.TrimSpace(match[1])
		}
	}
	return ""
}

func resolveImageStudioMarkdownURL(markdownURL, raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	if parsed, err := url.Parse(raw); err == nil && parsed.Scheme != "" && parsed.Host != "" {
		return raw
	}
	base, err := url.Parse(markdownURL)
	if err != nil || base.Scheme == "" || base.Host == "" {
		return raw
	}
	ref, err := url.Parse(raw)
	if err != nil {
		return raw
	}
	return base.ResolveReference(ref).String()
}

func cacheImageStudioTemplatePreview(ctx context.Context, client *http.Client, source, remoteURL string) (string, string, error) {
	if !imageStudioGitHubSourceSlugPattern.MatchString(source) {
		return "", "", errors.New("invalid source")
	}
	remoteURL = strings.TrimSpace(remoteURL)
	if remoteURL == "" {
		return "", "", errors.New("missing remote image url")
	}
	parsed, err := url.Parse(remoteURL)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return "", "", errors.New("invalid remote image url")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, remoteURL, nil)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("User-Agent", "sub2api-image-studio-importer/1.0")
	resp, err := client.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", "", fmt.Errorf("image http %d", resp.StatusCode)
	}
	contentType := normalizeImageStudioContentType(resp.Header.Get("Content-Type"))
	if contentType == "" {
		return "", "", fmt.Errorf("unsupported image content type: %s", resp.Header.Get("Content-Type"))
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, imageStudioTemplatePreviewMaxBytes+1))
	if err != nil {
		return "", "", err
	}
	if len(data) > imageStudioTemplatePreviewMaxBytes {
		return "", "", errors.New("image too large")
	}
	hashBytes := sha256.Sum256(data)
	hash := hex.EncodeToString(hashBytes[:])
	ext := imageStudioImageExtension(contentType)
	filename := hash + ext
	if s := imageStudioTemplateAssetStoreFromContext(ctx); s != nil {
		publicURL, err := s.SavePreview(ctx, source, filename, contentType, data)
		if err != nil {
			return "", "", err
		}
		return publicURL, hash, nil
	}
	dir := filepath.Join(imageStudioTemplatePreviewRoot(), source)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", "", err
	}
	target := filepath.Join(dir, filename)
	if _, err := os.Stat(target); errors.Is(err, os.ErrNotExist) {
		tmp := target + ".tmp"
		if err := os.WriteFile(tmp, data, 0644); err != nil {
			return "", "", err
		}
		if err := os.Rename(tmp, target); err != nil {
			_ = os.Remove(tmp)
			return "", "", err
		}
	} else if err != nil {
		return "", "", err
	}
	return imageStudioTemplatePreviewBasePath + "/" + source + "/" + filename, hash, nil
}

func (s *ImageStudioService) SaveTemplatePreview(ctx context.Context, source, remoteURL string) (string, string, error) {
	client := &http.Client{Timeout: imageStudioTemplateImportTimeout}
	return cacheImageStudioTemplatePreview(imageStudioTemplateAssetStoreContext(ctx, s.assetStore), client, source, remoteURL)
}

func (s *ImageStudioService) OpenTemplatePreview(ctx context.Context, source, filename string) (io.ReadCloser, string, error) {
	if _, ok := ValidateImageStudioTemplatePreviewName(source, filename); !ok {
		return nil, "", ErrImageStudioTemplateNotFound
	}
	if s != nil && s.assetStore != nil {
		body, contentType, err := s.assetStore.OpenPreview(ctx, source, filename)
		if err != nil {
			return nil, "", err
		}
		return body, contentType, nil
	}
	path, ok := ImageStudioTemplatePreviewPath(source, filename)
	if !ok {
		return nil, "", ErrImageStudioTemplateNotFound
	}
	file, err := os.Open(path)
	if err != nil {
		return nil, "", err
	}
	return file, contentTypeFromImageStudioTemplateFilename(filename), nil
}

func ValidateImageStudioTemplatePreviewName(source, filename string) (string, bool) {
	source = strings.TrimSpace(source)
	filename = strings.TrimSpace(filename)
	if !imageStudioGitHubSourceSlugPattern.MatchString(source) || !imageStudioPreviewFilenamePattern.MatchString(filename) {
		return "", false
	}
	return source + "/" + filename, true
}

func ImageStudioTemplatePreviewPath(source, filename string) (string, bool) {
	source = strings.TrimSpace(source)
	filename = strings.TrimSpace(filename)
	if _, ok := ValidateImageStudioTemplatePreviewName(source, filename); !ok {
		return "", false
	}
	root := imageStudioTemplatePreviewRoot()
	sourceDir := filepath.Join(root, source)
	target := filepath.Clean(filepath.Join(sourceDir, filename))
	cleanSourceDir := filepath.Clean(sourceDir)
	if target != cleanSourceDir && strings.HasPrefix(target, cleanSourceDir+string(os.PathSeparator)) {
		return target, true
	}
	return "", false
}

func contentTypeFromImageStudioTemplateFilename(filename string) string {
	switch strings.ToLower(filepath.Ext(filename)) {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".webp":
		return "image/webp"
	default:
		return "application/octet-stream"
	}
}

type imageStudioTemplateAssetStoreContextKey struct{}

func imageStudioTemplateAssetStoreContext(ctx context.Context, store ImageStudioTemplateAssetStore) context.Context {
	if store == nil {
		return ctx
	}
	return context.WithValue(ctx, imageStudioTemplateAssetStoreContextKey{}, store)
}

func imageStudioTemplateAssetStoreFromContext(ctx context.Context) ImageStudioTemplateAssetStore {
	if ctx == nil {
		return nil
	}
	store, _ := ctx.Value(imageStudioTemplateAssetStoreContextKey{}).(ImageStudioTemplateAssetStore)
	return store
}

func imageStudioTemplatePreviewRoot() string {
	return filepath.Join(imageStudioTemplateDataDir(), "image-studio", "previews")
}

func imageStudioTemplateDataDir() string {
	if dir := strings.TrimSpace(os.Getenv("DATA_DIR")); dir != "" {
		return dir
	}
	if info, err := os.Stat("/app/data"); err == nil && info.IsDir() {
		if file, err := os.CreateTemp("/app/data", ".sub2api-write-test-*"); err == nil {
			name := file.Name()
			_ = file.Close()
			_ = os.Remove(name)
			return "/app/data"
		}
	}
	wd, err := os.Getwd()
	if err != nil {
		return "."
	}
	return wd
}

func normalizeImageStudioContentType(value string) string {
	value = strings.ToLower(strings.TrimSpace(strings.Split(value, ";")[0]))
	switch value {
	case "image/jpeg", "image/png", "image/webp":
		return value
	default:
		return ""
	}
}

func imageStudioImageExtension(contentType string) string {
	switch contentType {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	default:
		return ""
	}
}

func cleanMarkdownTitle(value string) string {
	value = strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(value), "###"))
	value = regexp.MustCompile(`(?i)^Case\s+[0-9]+:\s*`).ReplaceAllString(value, "")
	value = regexp.MustCompile(`\[(.*?)\]\([^)]+\)`).ReplaceAllString(value, "$1")
	value = regexp.MustCompile(`(?i)\s+\(by\s+.*?\)\s*$`).ReplaceAllString(value, "")
	value = strings.Trim(value, "# ")
	if len([]rune(value)) > 150 {
		value = string([]rune(value)[:150])
	}
	return strings.TrimSpace(value)
}

func nanoBananaTemplateTitle(record imageStudioNanoPromptRecord) string {
	prefix := firstString(record.Categories)
	if prefix == "" {
		prefix = "Trending Prompt"
	}
	if record.Rank > 0 {
		return fmt.Sprintf("%s #%d", prefix, record.Rank)
	}
	return prefix
}

func nanoBananaTemplateMeta(record imageStudioNanoPromptRecord) string {
	parts := make([]string, 0, 5)
	if record.Rank > 0 {
		parts = append(parts, fmt.Sprintf("Rank %d", record.Rank))
	}
	if record.Likes > 0 {
		parts = append(parts, fmt.Sprintf("%d likes", record.Likes))
	}
	if record.Views > 0 {
		parts = append(parts, fmt.Sprintf("%d views", record.Views))
	}
	if record.Date != "" {
		parts = append(parts, record.Date)
	}
	return strings.Join(parts, " · ")
}

func imageStudioMarkdownMeta(caseNo, category string) string {
	parts := make([]string, 0, 2)
	if strings.TrimSpace(caseNo) != "" {
		parts = append(parts, "Case "+strings.TrimSpace(caseNo))
	}
	if strings.TrimSpace(category) != "" {
		parts = append(parts, strings.TrimSpace(category))
	}
	return strings.Join(parts, " · ")
}

func imageStudioSortOrderFromCase(value string) int {
	value = strings.TrimSpace(value)
	if value == "" {
		return 0
	}
	parts := strings.Split(value, ".")
	n, _ := strconv.Atoi(parts[0])
	if len(parts) > 1 {
		minor, _ := strconv.Atoi(parts[1])
		return n*1000 + minor
	}
	return n
}

func imageStudioTemplateHash(value string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(value)))
	return hex.EncodeToString(sum[:])
}

func imageStudioStableKeyPart(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = regexp.MustCompile(`[^a-z0-9_-]+`).ReplaceAllString(value, "-")
	value = strings.Trim(value, "-_")
	if value == "" {
		value = "template"
	}
	if len(value) > 48 {
		value = value[:48]
	}
	return value
}

func firstMatchingSubmatch(value string, pattern *regexp.Regexp, index int) string {
	match := pattern.FindStringSubmatch(value)
	if len(match) <= index {
		return ""
	}
	return strings.TrimSpace(match[index])
}

func firstString(values []string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}
