-- Migration: 145_image_studio_templates
-- Database-backed prompt template library for the image studio.

CREATE TABLE IF NOT EXISTS image_studio_templates (
    id                 BIGSERIAL PRIMARY KEY,
    key                VARCHAR(120)  NOT NULL UNIQUE,
    mode               VARCHAR(20)   NOT NULL,
    title              VARCHAR(160)  NOT NULL,
    model              VARCHAR(80)   NOT NULL,
    image              VARCHAR(1000) NOT NULL,
    prompt             TEXT          NOT NULL,
    source_name        VARCHAR(200)  NOT NULL DEFAULT '',
    source_url         VARCHAR(1000) NOT NULL DEFAULT '',
    source_type        VARCHAR(50)   NOT NULL DEFAULT '',
    license            VARCHAR(120)  NOT NULL DEFAULT '',
    author             VARCHAR(120)  NOT NULL DEFAULT '',
    meta               VARCHAR(500)  NOT NULL DEFAULT '',
    tags               JSONB         NOT NULL DEFAULT '[]'::jsonb,
    requires_reference BOOLEAN       NOT NULL DEFAULT FALSE,
    enabled            BOOLEAN       NOT NULL DEFAULT TRUE,
    sort_order         INTEGER       NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT image_studio_templates_mode_check
        CHECK (mode IN ('generation', 'edit')),
    CONSTRAINT image_studio_templates_tags_array_check
        CHECK (jsonb_typeof(tags) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_image_studio_templates_enabled_mode
    ON image_studio_templates (enabled, mode);
CREATE INDEX IF NOT EXISTS idx_image_studio_templates_model
    ON image_studio_templates (model);
CREATE INDEX IF NOT EXISTS idx_image_studio_templates_sort_order
    ON image_studio_templates (sort_order);
