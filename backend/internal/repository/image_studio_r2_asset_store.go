package repository

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"path"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	v4 "github.com/aws/aws-sdk-go-v2/aws/signer/v4"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/service"
)

const backupS3ConfigSettingKeyForImageStudio = "backup_s3_config"

type R2ImageStudioTemplateAssetStore struct {
	client *s3.Client
	bucket string
	prefix string
}

func NewImageStudioTemplateAssetStore(cfg *config.Config, settingRepo service.SettingRepository, encryptor service.SecretEncryptor) service.ImageStudioTemplateAssetStore {
	if cfg == nil {
		return service.NewLocalImageStudioTemplateAssetStore()
	}
	assetCfg, ok, err := resolveImageStudioAssetStorageConfig(context.Background(), cfg.ImageStudio.AssetStorage, settingRepo, encryptor)
	if err != nil {
		panic(fmt.Sprintf("initialize image studio asset storage config: %v", err))
	}
	if !ok {
		return service.NewLocalImageStudioTemplateAssetStore()
	}
	store, err := NewR2ImageStudioTemplateAssetStore(context.Background(), assetCfg)
	if err != nil {
		panic(fmt.Sprintf("initialize image studio R2 asset store: %v", err))
	}
	return store
}

func resolveImageStudioAssetStorageConfig(ctx context.Context, cfg config.ImageStudioAssetStorageConfig, settingRepo service.SettingRepository, encryptor service.SecretEncryptor) (config.ImageStudioAssetStorageConfig, bool, error) {
	mode := strings.ToLower(strings.TrimSpace(cfg.Mode))
	switch mode {
	case "r2":
		return cfg, cfg.IsR2Configured(), nil
	case "backup_s3":
		if settingRepo == nil {
			return config.ImageStudioAssetStorageConfig{}, false, nil
		}
		raw, err := settingRepo.GetValue(ctx, backupS3ConfigSettingKeyForImageStudio)
		if err != nil || strings.TrimSpace(raw) == "" {
			return config.ImageStudioAssetStorageConfig{}, false, nil
		}
		var backupCfg service.BackupS3Config
		if err := json.Unmarshal([]byte(raw), &backupCfg); err != nil {
			return config.ImageStudioAssetStorageConfig{}, false, err
		}
		secret := strings.TrimSpace(backupCfg.SecretAccessKey)
		if secret != "" && encryptor != nil {
			decrypted, err := encryptor.Decrypt(secret)
			if err == nil {
				secret = decrypted
			}
		}
		prefix := strings.Trim(strings.TrimSpace(cfg.Prefix), "/")
		if prefix == "" {
			prefix = "image-studio/previews"
		}
		resolved := config.ImageStudioAssetStorageConfig{
			Mode:            "r2",
			Endpoint:        backupCfg.Endpoint,
			Region:          backupCfg.Region,
			Bucket:          backupCfg.Bucket,
			AccessKeyID:     backupCfg.AccessKeyID,
			SecretAccessKey: secret,
			Prefix:          prefix,
			ForcePathStyle:  backupCfg.ForcePathStyle,
		}
		return resolved, resolved.IsR2Configured(), nil
	default:
		return config.ImageStudioAssetStorageConfig{}, false, nil
	}
}

func NewR2ImageStudioTemplateAssetStore(ctx context.Context, cfg config.ImageStudioAssetStorageConfig) (*R2ImageStudioTemplateAssetStore, error) {
	region := strings.TrimSpace(cfg.Region)
	if region == "" {
		region = "auto"
	}
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx,
		awsconfig.WithRegion(region),
		awsconfig.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(cfg.AccessKeyID, cfg.SecretAccessKey, ""),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("load aws config: %w", err)
	}
	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		if cfg.Endpoint != "" {
			o.BaseEndpoint = &cfg.Endpoint
		}
		if cfg.ForcePathStyle {
			o.UsePathStyle = true
		}
		o.APIOptions = append(o.APIOptions, v4.SwapComputePayloadSHA256ForUnsignedPayloadMiddleware)
		o.RequestChecksumCalculation = aws.RequestChecksumCalculationWhenRequired
	})
	return &R2ImageStudioTemplateAssetStore{
		client: client,
		bucket: cfg.Bucket,
		prefix: strings.Trim(strings.TrimSpace(cfg.Prefix), "/"),
	}, nil
}

func (s *R2ImageStudioTemplateAssetStore) AssetRoot() string {
	if s.prefix == "" {
		return "r2://" + s.bucket
	}
	return "r2://" + s.bucket + "/" + s.prefix
}

func (s *R2ImageStudioTemplateAssetStore) SavePreview(ctx context.Context, source, filename, contentType string, data []byte) (string, error) {
	rel, ok := service.ValidateImageStudioTemplatePreviewName(source, filename)
	if !ok {
		return "", fmt.Errorf("invalid preview asset path")
	}
	key := s.objectKey(rel)
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:       &s.bucket,
		Key:          &key,
		Body:         bytes.NewReader(data),
		ContentType:  &contentType,
		CacheControl: aws.String("public, max-age=31536000, immutable"),
	})
	if err != nil {
		return "", fmt.Errorf("R2 PutObject: %w", err)
	}
	return "/api/v1/images/template-assets/previews/" + rel, nil
}

func (s *R2ImageStudioTemplateAssetStore) OpenPreview(ctx context.Context, source, filename string) (io.ReadCloser, string, error) {
	rel, ok := service.ValidateImageStudioTemplatePreviewName(source, filename)
	if !ok {
		return nil, "", service.ErrImageStudioTemplateNotFound
	}
	key := s.objectKey(rel)
	out, err := s.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: &s.bucket,
		Key:    &key,
	})
	if err != nil {
		return nil, "", fmt.Errorf("R2 GetObject: %w", err)
	}
	contentType := "application/octet-stream"
	if out.ContentType != nil && strings.TrimSpace(*out.ContentType) != "" {
		contentType = strings.TrimSpace(*out.ContentType)
	}
	return out.Body, contentType, nil
}

func (s *R2ImageStudioTemplateAssetStore) objectKey(rel string) string {
	if s.prefix == "" {
		return rel
	}
	return path.Join(s.prefix, rel)
}
