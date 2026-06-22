CREATE TABLE IF NOT EXISTS benefit_campaigns (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    visible BOOLEAN NOT NULL DEFAULT TRUE,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    threshold_amount DECIMAL(20,8) NOT NULL,
    grant_amount DECIMAL(20,8) NOT NULL,
    recharge_scope VARCHAR(32) NOT NULL DEFAULT 'lifetime',
    copy JSONB NOT NULL DEFAULT '{}'::jsonb,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT chk_benefit_campaigns_window CHECK (ends_at > starts_at),
    CONSTRAINT chk_benefit_campaigns_amounts CHECK (threshold_amount > 0 AND grant_amount > 0),
    CONSTRAINT chk_benefit_campaigns_recharge_scope CHECK (recharge_scope IN ('lifetime', 'campaign_window'))
);

CREATE TABLE IF NOT EXISTS benefit_claims (
    id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES benefit_campaigns(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'claimed',
    eligible_recharge_amount DECIMAL(20,8) NOT NULL,
    granted_amount DECIMAL(20,8) NOT NULL,
    balance_before DECIMAL(20,8) NOT NULL,
    balance_after DECIMAL(20,8) NOT NULL,
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_redeem_code VARCHAR(64) NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_benefit_claims_status CHECK (status IN ('claimed')),
    CONSTRAINT benefit_claims_campaign_user_unique UNIQUE (campaign_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_benefit_campaigns_enabled ON benefit_campaigns(enabled);
CREATE INDEX IF NOT EXISTS idx_benefit_campaigns_visible ON benefit_campaigns(visible);
CREATE INDEX IF NOT EXISTS idx_benefit_campaigns_window ON benefit_campaigns(starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_benefit_campaigns_visible_sort ON benefit_campaigns(visible, sort_order);
CREATE INDEX IF NOT EXISTS idx_benefit_campaigns_deleted_at ON benefit_campaigns(deleted_at);
CREATE INDEX IF NOT EXISTS idx_benefit_claims_campaign_id ON benefit_claims(campaign_id);
CREATE INDEX IF NOT EXISTS idx_benefit_claims_user_id ON benefit_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_benefit_claims_claimed_at ON benefit_claims(claimed_at);
