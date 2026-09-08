-- 235: Add the new group model allowlist column without removing the legacy
-- models_list_config column. Both columns must coexist while old and new images
-- overlap during a zero-downtime deployment.
ALTER TABLE groups
    ADD COLUMN IF NOT EXISTS model_allowlist JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN groups.model_allowlist IS
    'Group model allowlist: constrains both model listing responses and request admission';
