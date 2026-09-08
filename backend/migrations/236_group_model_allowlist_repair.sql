-- 236: Backfill the new model_allowlist column and keep it synchronized with
-- models_list_config while old and new application images may both be active.
-- The legacy column and compatibility trigger can be removed in a later release
-- after every deployed image reads model_allowlist.
ALTER TABLE groups
    ADD COLUMN IF NOT EXISTS model_allowlist JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE groups
    ADD COLUMN IF NOT EXISTS models_list_config JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE groups
   SET model_allowlist = CASE
           WHEN COALESCE(model_allowlist, '{}'::jsonb) = '{}'::jsonb
            AND COALESCE(models_list_config, '{}'::jsonb) <> '{}'::jsonb
           THEN models_list_config
           ELSE COALESCE(model_allowlist, '{}'::jsonb)
       END,
       models_list_config = CASE
           WHEN COALESCE(model_allowlist, '{}'::jsonb) = '{}'::jsonb
            AND COALESCE(models_list_config, '{}'::jsonb) <> '{}'::jsonb
           THEN models_list_config
           ELSE COALESCE(model_allowlist, '{}'::jsonb)
       END
 WHERE model_allowlist IS DISTINCT FROM models_list_config
    OR model_allowlist IS NULL
    OR models_list_config IS NULL;

ALTER TABLE groups ALTER COLUMN model_allowlist SET DEFAULT '{}'::jsonb;
ALTER TABLE groups ALTER COLUMN models_list_config SET DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION sync_groups_model_allowlist_compat()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $sync$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF COALESCE(NEW.model_allowlist, '{}'::jsonb) = '{}'::jsonb
           AND COALESCE(NEW.models_list_config, '{}'::jsonb) <> '{}'::jsonb THEN
            NEW.model_allowlist := NEW.models_list_config;
        ELSE
            NEW.models_list_config := NEW.model_allowlist;
        END IF;
    ELSIF NEW.model_allowlist IS DISTINCT FROM OLD.model_allowlist THEN
        NEW.models_list_config := NEW.model_allowlist;
    ELSIF NEW.models_list_config IS DISTINCT FROM OLD.models_list_config THEN
        NEW.model_allowlist := NEW.models_list_config;
    END IF;
    RETURN NEW;
END
$sync$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgrelid = 'groups'::regclass
          AND tgname = 'groups_model_allowlist_compat_sync'
          AND NOT tgisinternal
    ) THEN
        EXECUTE $trigger$
            CREATE TRIGGER groups_model_allowlist_compat_sync
            BEFORE INSERT OR UPDATE ON groups
            FOR EACH ROW EXECUTE FUNCTION sync_groups_model_allowlist_compat()
        $trigger$;
    END IF;
END
$$;

COMMENT ON COLUMN groups.model_allowlist IS
    'Group model allowlist: constrains both model listing responses and request admission';
