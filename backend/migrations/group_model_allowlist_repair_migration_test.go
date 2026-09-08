package migrations

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestGroupModelAllowlistRepairMigration(t *testing.T) {
	expandContent, err := FS.ReadFile("235_group_model_allowlist.sql")
	require.NoError(t, err)
	repairContent, err := FS.ReadFile("236_group_model_allowlist_repair.sql")
	require.NoError(t, err)

	expandSQL := strings.Join(strings.Fields(string(expandContent)), " ")
	repairSQL := strings.Join(strings.Fields(string(repairContent)), " ")

	// 先扩展、再回填同步；部署期间不能移除旧镜像仍在读取的列。
	require.Contains(t, expandSQL, "ADD COLUMN IF NOT EXISTS model_allowlist JSONB NOT NULL DEFAULT '{}'::jsonb")
	require.NotContains(t, expandSQL, "RENAME COLUMN")
	require.Contains(t, repairSQL, "SET model_allowlist = CASE")
	require.Contains(t, repairSQL, "models_list_config = CASE")
	require.Contains(t, repairSQL, "ADD COLUMN IF NOT EXISTS models_list_config JSONB NOT NULL DEFAULT '{}'::jsonb")
	require.Contains(t, repairSQL, "CREATE TRIGGER groups_model_allowlist_compat_sync")
	require.Contains(t, repairSQL, "sync_groups_model_allowlist_compat()")
	require.NotContains(t, repairSQL, "RENAME COLUMN")
	require.NotContains(t, repairSQL, "SET NOT NULL")
	require.Contains(t, repairSQL, "COMMENT ON COLUMN groups.model_allowlist")

	// 触发器检查用 regclass 跟随实际 search_path。
	require.NotContains(t, repairSQL, "table_schema = 'public'")
	require.Contains(t, repairSQL, "tgrelid = 'groups'::regclass")
}
