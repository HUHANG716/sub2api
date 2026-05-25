package repository

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/stretchr/testify/require"
)

type imageStudioAssetStoreSettingRepoStub struct {
	values map[string]string
}

func (s imageStudioAssetStoreSettingRepoStub) Get(_ context.Context, key string) (*service.Setting, error) {
	value, ok := s.values[key]
	if !ok {
		return nil, service.ErrSettingNotFound
	}
	return &service.Setting{Key: key, Value: value}, nil
}

func (s imageStudioAssetStoreSettingRepoStub) GetValue(_ context.Context, key string) (string, error) {
	value, ok := s.values[key]
	if !ok {
		return "", service.ErrSettingNotFound
	}
	return value, nil
}

func (s imageStudioAssetStoreSettingRepoStub) Set(_ context.Context, key, value string) error {
	s.values[key] = value
	return nil
}

func (s imageStudioAssetStoreSettingRepoStub) GetMultiple(_ context.Context, keys []string) (map[string]string, error) {
	result := map[string]string{}
	for _, key := range keys {
		if value, ok := s.values[key]; ok {
			result[key] = value
		}
	}
	return result, nil
}

func (s imageStudioAssetStoreSettingRepoStub) SetMultiple(_ context.Context, settings map[string]string) error {
	for key, value := range settings {
		s.values[key] = value
	}
	return nil
}

func (s imageStudioAssetStoreSettingRepoStub) GetAll(_ context.Context) (map[string]string, error) {
	result := map[string]string{}
	for key, value := range s.values {
		result[key] = value
	}
	return result, nil
}

func (s imageStudioAssetStoreSettingRepoStub) Delete(_ context.Context, key string) error {
	delete(s.values, key)
	return nil
}

type imageStudioAssetStoreEncryptorStub struct{}

func (imageStudioAssetStoreEncryptorStub) Encrypt(plaintext string) (string, error) {
	return "encrypted:" + plaintext, nil
}

func (imageStudioAssetStoreEncryptorStub) Decrypt(ciphertext string) (string, error) {
	return strings.TrimPrefix(ciphertext, "encrypted:"), nil
}

func TestR2ImageStudioTemplateAssetStoreUsesServerSideS3Requests(t *testing.T) {
	objects := map[string][]byte{}
	var putPath, getPath string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		key := strings.TrimPrefix(r.URL.Path, "/bucket/")
		switch r.Method {
		case http.MethodPut:
			putPath = r.URL.Path
			body, err := io.ReadAll(r.Body)
			require.NoError(t, err)
			objects[key] = body
			w.WriteHeader(http.StatusOK)
		case http.MethodGet:
			getPath = r.URL.Path
			body, ok := objects[key]
			if !ok {
				http.NotFound(w, r)
				return
			}
			w.Header().Set("Content-Type", "image/png")
			_, _ = w.Write(body)
		default:
			http.Error(w, "unexpected method", http.StatusMethodNotAllowed)
		}
	}))
	t.Cleanup(server.Close)

	store, err := NewR2ImageStudioTemplateAssetStore(context.Background(), config.ImageStudioAssetStorageConfig{
		Mode:            "r2",
		Endpoint:        server.URL,
		Region:          "auto",
		Bucket:          "bucket",
		AccessKeyID:     "key",
		SecretAccessKey: "secret",
		Prefix:          "image-studio/previews",
		ForcePathStyle:  true,
	})
	require.NoError(t, err)

	publicURL, err := store.SavePreview(context.Background(), "nano-banana", strings.Repeat("a", 64)+".png", "image/png", []byte("image-bytes"))
	require.NoError(t, err)
	require.Equal(t, "/api/v1/images/template-assets/previews/nano-banana/"+strings.Repeat("a", 64)+".png", publicURL)
	require.Equal(t, "/bucket/image-studio/previews/nano-banana/"+strings.Repeat("a", 64)+".png", putPath)

	body, contentType, err := store.OpenPreview(context.Background(), "nano-banana", strings.Repeat("a", 64)+".png")
	require.NoError(t, err)
	defer body.Close()
	got, err := io.ReadAll(body)
	require.NoError(t, err)
	require.Equal(t, []byte("image-bytes"), got)
	require.Equal(t, "image/png", contentType)
	require.Equal(t, "/bucket/image-studio/previews/nano-banana/"+strings.Repeat("a", 64)+".png", getPath)
}

func TestResolveImageStudioAssetStorageConfigReusesBackupS3Config(t *testing.T) {
	backupCfg := service.BackupS3Config{
		Endpoint:        "https://account.r2.cloudflarestorage.com",
		Region:          "auto",
		Bucket:          "shared-bucket",
		AccessKeyID:     "backup-access-key",
		SecretAccessKey: "encrypted:backup-secret",
		Prefix:          "database-backups",
		ForcePathStyle:  true,
	}
	raw, err := json.Marshal(backupCfg)
	require.NoError(t, err)

	resolved, ok, err := resolveImageStudioAssetStorageConfig(
		context.Background(),
		config.ImageStudioAssetStorageConfig{
			Mode:   "backup_s3",
			Prefix: "/image-studio/previews/",
		},
		imageStudioAssetStoreSettingRepoStub{
			values: map[string]string{
				backupS3ConfigSettingKeyForImageStudio: string(raw),
			},
		},
		imageStudioAssetStoreEncryptorStub{},
	)
	require.NoError(t, err)
	require.True(t, ok)
	require.Equal(t, "r2", resolved.Mode)
	require.Equal(t, backupCfg.Endpoint, resolved.Endpoint)
	require.Equal(t, backupCfg.Region, resolved.Region)
	require.Equal(t, backupCfg.Bucket, resolved.Bucket)
	require.Equal(t, backupCfg.AccessKeyID, resolved.AccessKeyID)
	require.Equal(t, "backup-secret", resolved.SecretAccessKey)
	require.Equal(t, "image-studio/previews", resolved.Prefix)
	require.Equal(t, backupCfg.ForcePathStyle, resolved.ForcePathStyle)
}

func TestResolveImageStudioAssetStorageConfigUsesImageStudioDefaultPrefixForBackupS3(t *testing.T) {
	backupCfg := service.BackupS3Config{
		Endpoint:        "https://account.r2.cloudflarestorage.com",
		Region:          "auto",
		Bucket:          "shared-bucket",
		AccessKeyID:     "backup-access-key",
		SecretAccessKey: "backup-secret",
		Prefix:          "database-backups",
		ForcePathStyle:  true,
	}
	raw, err := json.Marshal(backupCfg)
	require.NoError(t, err)

	resolved, ok, err := resolveImageStudioAssetStorageConfig(
		context.Background(),
		config.ImageStudioAssetStorageConfig{Mode: "backup_s3"},
		imageStudioAssetStoreSettingRepoStub{
			values: map[string]string{
				backupS3ConfigSettingKeyForImageStudio: string(raw),
			},
		},
		nil,
	)
	require.NoError(t, err)
	require.True(t, ok)
	require.Equal(t, "image-studio/previews", resolved.Prefix)
	require.NotEqual(t, backupCfg.Prefix, resolved.Prefix)
}
