package service

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestParseImageStudioMarkdownTemplates(t *testing.T) {
	body := `## Poster Cases

### Case 42: [Museum Infographic](https://x.com/example/status/1) (by [@maker](https://x.com/maker))

| Output |
| :---: |
| <img src="https://example.com/output.jpg" width="300"> |

**Prompt:**

` + "```" + `
Using the provided reference image, transform it into a museum-style infographic.
` + "```" + `
`
	got := parseImageStudioMarkdownTemplates(imageStudioGitHubImportSources[0], body, "https://raw.githubusercontent.com/example/repo/main/README.md")
	require.Len(t, got, 1)
	require.Equal(t, "gpt-image-2-42", got[0].Key)
	require.Equal(t, "generation", got[0].Mode)
	require.False(t, got[0].RequiresReference)
	require.Equal(t, "Museum Infographic", got[0].Title)
	require.Equal(t, "https://example.com/output.jpg", got[0].OriginalImageURL)
	require.Equal(t, "maker", got[0].Author)
	require.False(t, got[0].Enabled)
}

func TestParseImageStudioMarkdownTemplatesSupportsSecondLevelEntriesAndRelativeImages(t *testing.T) {
	source := imageStudioGitHubImportSource{
		Slug:               "magiccreator-gpt-image-2",
		Name:               "MagicCreator GPT Image 2 Prompts",
		Model:              "GPT Image 2",
		License:            "MIT",
		EntryHeadingPrefix: "## ",
		RepoURL:            "https://github.com/magiccreator-ai/awesome-gpt-image-2-prompts",
		Tags:               []string{"gpt-image-2"},
	}
	body := `## Data Visualization: Dual-Axis Chart

Shared by [@maxescu](https://x.com/maxescu/status/2043979078798323727)

` + "```text" + `
Create a dual-axis chart about crime perception.
` + "```" + `

<img src="../images/chart.jpg" alt="chart" />
`
	got := parseImageStudioMarkdownTemplates(source, body, "https://raw.githubusercontent.com/org/repo/main/docs/README.md")
	require.Len(t, got, 1)
	require.Equal(t, "magiccreator-gpt-image-2-2c880a3ae9bc", got[0].Key)
	require.Equal(t, "Data Visualization: Dual-Axis Chart", got[0].Title)
	require.Equal(t, "https://raw.githubusercontent.com/org/repo/main/images/chart.jpg", got[0].OriginalImageURL)
}

func TestParseNanoBananaPromptJSON(t *testing.T) {
	body := `[{
		"rank": 3,
		"id": "201",
		"prompt": "Create a clean product poster for [brand].",
		"author_name": "Creator",
		"likes": 12,
		"views": 345,
		"image": "https://example.com/nano.jpg",
		"categories": ["Product & Brand"],
		"source_url": "https://x.com/creator/status/201"
	}]`
	got, err := parseNanoBananaPromptJSON(imageStudioGitHubImportSources[1], body)
	require.NoError(t, err)
	require.Len(t, got, 1)
	require.Equal(t, "nano-banana-201", got[0].Key)
	require.Equal(t, "generation", got[0].Mode)
	require.Equal(t, "Product & Brand #3", got[0].Title)
	require.Equal(t, "Nano Banana", got[0].Model)
	require.Contains(t, got[0].Meta, "12 likes")
	require.False(t, got[0].Enabled)
}

func TestCacheImageStudioTemplatePreviewValidatesAndStoresLocalFile(t *testing.T) {
	t.Setenv("DATA_DIR", t.TempDir())
	imageServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		_, _ = w.Write([]byte("png-bytes"))
	}))
	t.Cleanup(imageServer.Close)

	publicURL, hash, err := cacheImageStudioTemplatePreview(context.Background(), imageServer.Client(), "nano-banana", imageServer.URL+"/image.png")
	require.NoError(t, err)
	require.Len(t, hash, 64)
	require.True(t, strings.HasPrefix(publicURL, imageStudioTemplatePreviewBasePath+"/nano-banana/"))

	filename := strings.TrimPrefix(publicURL, imageStudioTemplatePreviewBasePath+"/nano-banana/")
	path, ok := ImageStudioTemplatePreviewPath("nano-banana", filename)
	require.True(t, ok)
	require.FileExists(t, path)
}

func TestCacheImageStudioTemplatePreviewRejectsInvalidImages(t *testing.T) {
	t.Setenv("DATA_DIR", t.TempDir())
	textServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		_, _ = w.Write([]byte("not image"))
	}))
	t.Cleanup(textServer.Close)

	_, _, err := cacheImageStudioTemplatePreview(context.Background(), textServer.Client(), "nano-banana", textServer.URL)
	require.ErrorContains(t, err, "unsupported image content type")

	largeServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/jpeg")
		_, _ = w.Write(make([]byte, imageStudioTemplatePreviewMaxBytes+1))
	}))
	t.Cleanup(largeServer.Close)

	_, _, err = cacheImageStudioTemplatePreview(context.Background(), largeServer.Client(), "nano-banana", largeServer.URL)
	require.ErrorContains(t, err, "image too large")
}

func TestImageStudioTemplatePreviewPathRejectsUnsafeInput(t *testing.T) {
	t.Setenv("DATA_DIR", t.TempDir())
	validName := strings.Repeat("a", 64) + ".jpg"
	_, ok := ImageStudioTemplatePreviewPath("nano-banana", validName)
	require.True(t, ok)

	_, ok = ImageStudioTemplatePreviewPath("../nano-banana", validName)
	require.False(t, ok)
	_, ok = ImageStudioTemplatePreviewPath("nano-banana", "../"+validName)
	require.False(t, ok)
	_, ok = ImageStudioTemplatePreviewPath("nano-banana", strings.Repeat("a", 64)+".gif")
	require.False(t, ok)
}

func TestLiveImageStudioGitHubSourcesParse(t *testing.T) {
	if os.Getenv("IMAGE_STUDIO_IMPORT_LIVE") != "1" {
		t.Skip("set IMAGE_STUDIO_IMPORT_LIVE=1 to parse live GitHub sources")
	}
	client := &http.Client{Timeout: imageStudioTemplateImportTimeout}
	total := 0
	for _, source := range imageStudioGitHubImportSources {
		templates, err := fetchImageStudioTemplatesFromGitHub(context.Background(), client, source)
		require.NoError(t, err, source.Slug)
		t.Logf("%s: %d templates", source.Slug, len(templates))
		total += len(templates)
	}
	require.Greater(t, total, 900)
}
