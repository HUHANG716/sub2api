package repository

import (
	"context"
	"fmt"
	"strings"

	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/ent/imagestudiotemplate"
	"github.com/Wei-Shaw/sub2api/internal/service"
)

type imageStudioTemplateRepository struct {
	client *dbent.Client
}

func NewImageStudioTemplateRepository(client *dbent.Client) service.ImageStudioTemplateRepository {
	return &imageStudioTemplateRepository{client: client}
}

func (r *imageStudioTemplateRepository) Create(ctx context.Context, template *service.ImageStudioTemplate) error {
	row, err := r.client.ImageStudioTemplate.Create().
		SetKey(template.Key).
		SetMode(template.Mode).
		SetTitle(template.Title).
		SetModel(template.Model).
		SetImage(template.Image).
		SetOriginalImageURL(template.OriginalImageURL).
		SetImageHash(template.ImageHash).
		SetImageDownloadError(template.ImageDownloadError).
		SetPromptHash(template.PromptHash).
		SetPrompt(template.Prompt).
		SetSourceName(template.SourceName).
		SetSourceURL(template.SourceURL).
		SetSourceType(template.SourceType).
		SetLicense(template.License).
		SetAuthor(template.Author).
		SetMeta(template.Meta).
		SetTags(emptyStringSliceIfNil(template.Tags)).
		SetRequiresReference(template.RequiresReference).
		SetEnabled(template.Enabled).
		SetSortOrder(template.SortOrder).
		Save(ctx)
	if err != nil {
		return translatePersistenceError(err, service.ErrImageStudioTemplateNotFound, service.ErrImageStudioTemplateConflict)
	}
	copyImageStudioTemplateFromEnt(template, row)
	return nil
}

func (r *imageStudioTemplateRepository) GetByID(ctx context.Context, id int64) (*service.ImageStudioTemplate, error) {
	row, err := r.client.ImageStudioTemplate.Query().
		Where(imagestudiotemplate.IDEQ(id)).
		Only(ctx)
	if err != nil {
		return nil, translatePersistenceError(err, service.ErrImageStudioTemplateNotFound, service.ErrImageStudioTemplateConflict)
	}
	return imageStudioTemplateFromEnt(row), nil
}

func (r *imageStudioTemplateRepository) Update(ctx context.Context, template *service.ImageStudioTemplate) error {
	row, err := r.client.ImageStudioTemplate.UpdateOneID(template.ID).
		SetKey(template.Key).
		SetMode(template.Mode).
		SetTitle(template.Title).
		SetModel(template.Model).
		SetImage(template.Image).
		SetOriginalImageURL(template.OriginalImageURL).
		SetImageHash(template.ImageHash).
		SetImageDownloadError(template.ImageDownloadError).
		SetPromptHash(template.PromptHash).
		SetPrompt(template.Prompt).
		SetSourceName(template.SourceName).
		SetSourceURL(template.SourceURL).
		SetSourceType(template.SourceType).
		SetLicense(template.License).
		SetAuthor(template.Author).
		SetMeta(template.Meta).
		SetTags(emptyStringSliceIfNil(template.Tags)).
		SetRequiresReference(template.RequiresReference).
		SetEnabled(template.Enabled).
		SetSortOrder(template.SortOrder).
		Save(ctx)
	if err != nil {
		return translatePersistenceError(err, service.ErrImageStudioTemplateNotFound, service.ErrImageStudioTemplateConflict)
	}
	copyImageStudioTemplateFromEnt(template, row)
	return nil
}

func (r *imageStudioTemplateRepository) Delete(ctx context.Context, id int64) error {
	if err := r.client.ImageStudioTemplate.DeleteOneID(id).Exec(ctx); err != nil {
		return translatePersistenceError(err, service.ErrImageStudioTemplateNotFound, service.ErrImageStudioTemplateConflict)
	}
	return nil
}

func (r *imageStudioTemplateRepository) List(ctx context.Context, filter service.ImageStudioTemplateFilter) ([]service.ImageStudioTemplate, error) {
	q := r.client.ImageStudioTemplate.Query()
	mode := strings.ToLower(strings.TrimSpace(filter.Mode))
	if mode != "" && mode != "all" {
		q = q.Where(imagestudiotemplate.ModeEQ(mode))
	}
	if model := strings.TrimSpace(filter.Model); model != "" {
		q = q.Where(imagestudiotemplate.ModelContainsFold(model))
	}
	if !filter.IncludeDisabled {
		q = q.Where(imagestudiotemplate.EnabledEQ(true))
	}
	if query := strings.TrimSpace(filter.Query); query != "" {
		q = q.Where(
			imagestudiotemplate.Or(
				imagestudiotemplate.KeyContainsFold(query),
				imagestudiotemplate.TitleContainsFold(query),
				imagestudiotemplate.ModelContainsFold(query),
				imagestudiotemplate.PromptContainsFold(query),
				imagestudiotemplate.SourceNameContainsFold(query),
				imagestudiotemplate.MetaContainsFold(query),
			),
		)
	}
	rows, err := q.Order(dbent.Asc(imagestudiotemplate.FieldSortOrder), dbent.Asc(imagestudiotemplate.FieldID)).All(ctx)
	if err != nil {
		return nil, fmt.Errorf("list image studio templates: %w", err)
	}
	out := make([]service.ImageStudioTemplate, 0, len(rows))
	for _, row := range rows {
		out = append(out, *imageStudioTemplateFromEnt(row))
	}
	return out, nil
}

func (r *imageStudioTemplateRepository) UpsertMany(ctx context.Context, templates []service.ImageStudioTemplate) (int, error) {
	count := 0
	for i := range templates {
		template := templates[i]
		row, err := r.client.ImageStudioTemplate.Query().
			Where(imagestudiotemplate.KeyEQ(template.Key)).
			Only(ctx)
		if err != nil && !dbent.IsNotFound(err) {
			return count, translatePersistenceError(err, service.ErrImageStudioTemplateNotFound, service.ErrImageStudioTemplateConflict)
		}
		if dbent.IsNotFound(err) {
			if err := r.Create(ctx, &template); err != nil {
				return count, err
			}
			count++
			continue
		}
		template.ID = row.ID
		if err := r.Update(ctx, &template); err != nil {
			return count, err
		}
		count++
	}
	return count, nil
}

func (r *imageStudioTemplateRepository) ImportMany(ctx context.Context, templates []service.ImageStudioTemplate) (service.ImageStudioTemplateImportSaveStats, error) {
	var stats service.ImageStudioTemplateImportSaveStats
	for i := range templates {
		template := templates[i]
		row, err := r.findImportMatch(ctx, template)
		if err != nil {
			return stats, err
		}
		if row == nil {
			if err := r.Create(ctx, &template); err != nil {
				return stats, err
			}
			stats.Created++
			continue
		}
		if err := r.updateImportedTemplateMetadata(ctx, row, template); err != nil {
			return stats, err
		}
		stats.Updated++
	}
	return stats, nil
}

func (r *imageStudioTemplateRepository) findImportMatch(ctx context.Context, template service.ImageStudioTemplate) (*dbent.ImageStudioTemplate, error) {
	row, err := r.client.ImageStudioTemplate.Query().
		Where(imagestudiotemplate.KeyEQ(template.Key)).
		Only(ctx)
	if err == nil {
		return row, nil
	}
	if err != nil && !dbent.IsNotFound(err) {
		return nil, translatePersistenceError(err, service.ErrImageStudioTemplateNotFound, service.ErrImageStudioTemplateConflict)
	}
	if strings.TrimSpace(template.SourceURL) == "" || strings.TrimSpace(template.PromptHash) == "" {
		return nil, nil
	}
	row, err = r.client.ImageStudioTemplate.Query().
		Where(
			imagestudiotemplate.SourceURLEQ(template.SourceURL),
			imagestudiotemplate.PromptHashEQ(template.PromptHash),
		).
		Only(ctx)
	if err != nil && !dbent.IsNotFound(err) {
		return nil, translatePersistenceError(err, service.ErrImageStudioTemplateNotFound, service.ErrImageStudioTemplateConflict)
	}
	if dbent.IsNotFound(err) {
		return nil, nil
	}
	return row, nil
}

func (r *imageStudioTemplateRepository) updateImportedTemplateMetadata(ctx context.Context, row *dbent.ImageStudioTemplate, template service.ImageStudioTemplate) error {
	update := r.client.ImageStudioTemplate.UpdateOneID(row.ID).
		SetSourceName(template.SourceName).
		SetSourceURL(template.SourceURL).
		SetSourceType(template.SourceType).
		SetOriginalImageURL(template.OriginalImageURL).
		SetImageHash(template.ImageHash).
		SetImageDownloadError(template.ImageDownloadError).
		SetPromptHash(template.PromptHash).
		SetMeta(template.Meta)
	if template.Author != "" {
		update.SetAuthor(template.Author)
	}
	if template.License != "" {
		update.SetLicense(template.License)
	}
	if shouldRefreshImportedTemplateImage(row, template) {
		update.SetImage(template.Image)
	}
	if _, err := update.Save(ctx); err != nil {
		return translatePersistenceError(err, service.ErrImageStudioTemplateNotFound, service.ErrImageStudioTemplateConflict)
	}
	return nil
}

func shouldRefreshImportedTemplateImage(row *dbent.ImageStudioTemplate, template service.ImageStudioTemplate) bool {
	if row == nil || template.Image == "" || template.Image == row.Image {
		return false
	}
	return row.Image == "" ||
		row.Image == row.OriginalImageURL ||
		strings.HasPrefix(row.Image, "/api/v1/images/template-assets/previews/") ||
		row.ImageDownloadError != ""
}

func imageStudioTemplateFromEnt(row *dbent.ImageStudioTemplate) *service.ImageStudioTemplate {
	if row == nil {
		return nil
	}
	tags := row.Tags
	if tags == nil {
		tags = []string{}
	}
	return &service.ImageStudioTemplate{
		ID:                 row.ID,
		Key:                row.Key,
		Mode:               row.Mode,
		Title:              row.Title,
		Model:              row.Model,
		Image:              row.Image,
		OriginalImageURL:   row.OriginalImageURL,
		ImageHash:          row.ImageHash,
		ImageDownloadError: row.ImageDownloadError,
		PromptHash:         row.PromptHash,
		Prompt:             row.Prompt,
		SourceName:         row.SourceName,
		SourceURL:          row.SourceURL,
		SourceType:         row.SourceType,
		License:            row.License,
		Author:             row.Author,
		Meta:               row.Meta,
		Tags:               tags,
		RequiresReference:  row.RequiresReference,
		Enabled:            row.Enabled,
		SortOrder:          row.SortOrder,
	}
}

func copyImageStudioTemplateFromEnt(dst *service.ImageStudioTemplate, row *dbent.ImageStudioTemplate) {
	if dst == nil || row == nil {
		return
	}
	*dst = *imageStudioTemplateFromEnt(row)
}

func emptyStringSliceIfNil(values []string) []string {
	if values == nil {
		return []string{}
	}
	return values
}
