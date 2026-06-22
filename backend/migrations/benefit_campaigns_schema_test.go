package migrations

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestBenefitCampaignMigrationDefinesCampaignsAndClaims(t *testing.T) {
	content, err := FS.ReadFile("154_benefit_campaigns.sql")
	require.NoError(t, err)
	sql := string(content)

	require.Contains(t, sql, "CREATE TABLE IF NOT EXISTS benefit_campaigns")
	require.Contains(t, sql, "CREATE TABLE IF NOT EXISTS benefit_claims")
	require.Contains(t, sql, "recharge_scope")
	require.NotContains(t, sql, "grant_validity_days")
	require.NotContains(t, sql, "grant_expires_at")
	require.Contains(t, sql, "UNIQUE (campaign_id, user_id)")
	require.Contains(t, sql, "CREATE INDEX IF NOT EXISTS idx_benefit_campaigns_visible_sort")
	require.Contains(t, sql, "CREATE INDEX IF NOT EXISTS idx_benefit_claims_claimed_at")
}
