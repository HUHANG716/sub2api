-- Migration: 146_image_studio_template_import_metadata
-- Metadata used by GitHub prompt imports and local preview image caching.

ALTER TABLE image_studio_templates
    ADD COLUMN IF NOT EXISTS original_image_url VARCHAR(1000) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS image_hash VARCHAR(64) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS image_download_error VARCHAR(1000) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS prompt_hash VARCHAR(64) NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_image_studio_templates_source_prompt_hash
    ON image_studio_templates (source_url, prompt_hash);
