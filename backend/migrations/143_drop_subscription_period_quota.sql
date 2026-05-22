-- Forward rollback for the removed subscription period quota feature.
-- Keep migration 142 in the repository because it was already applied on dev.
DROP TABLE IF EXISTS user_subscription_periods;

DROP INDEX IF EXISTS idx_subscription_plans_period_limit;

ALTER TABLE subscription_plans
    DROP COLUMN IF EXISTS period_limit_usd;
