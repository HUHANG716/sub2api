package service

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
)

type LocalImageStudioTemplateAssetStore struct{}

func NewLocalImageStudioTemplateAssetStore() *LocalImageStudioTemplateAssetStore {
	return &LocalImageStudioTemplateAssetStore{}
}

func (s *LocalImageStudioTemplateAssetStore) AssetRoot() string {
	_ = s
	return imageStudioTemplatePreviewRoot()
}

func (s *LocalImageStudioTemplateAssetStore) SavePreview(ctx context.Context, source, filename, contentType string, data []byte) (string, error) {
	_ = ctx
	_, _ = contentType, s
	if _, ok := ValidateImageStudioTemplatePreviewName(source, filename); !ok {
		return "", errors.New("invalid preview asset path")
	}
	dir := filepath.Join(imageStudioTemplatePreviewRoot(), source)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}
	target := filepath.Join(dir, filename)
	if _, err := os.Stat(target); errors.Is(err, os.ErrNotExist) {
		tmp := target + ".tmp"
		if err := os.WriteFile(tmp, data, 0644); err != nil {
			return "", err
		}
		if err := os.Rename(tmp, target); err != nil {
			_ = os.Remove(tmp)
			return "", err
		}
	} else if err != nil {
		return "", err
	}
	return imageStudioTemplatePreviewBasePath + "/" + source + "/" + filename, nil
}

func (s *LocalImageStudioTemplateAssetStore) OpenPreview(ctx context.Context, source, filename string) (io.ReadCloser, string, error) {
	_, _ = ctx, s
	path, ok := ImageStudioTemplatePreviewPath(source, filename)
	if !ok {
		return nil, "", ErrImageStudioTemplateNotFound
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, "", fmt.Errorf("open local preview: %w", err)
	}
	return io.NopCloser(bytes.NewReader(data)), contentTypeFromImageStudioTemplateFilename(filename), nil
}
