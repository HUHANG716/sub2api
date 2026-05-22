ALTER TABLE subscription_plans
    ADD COLUMN IF NOT EXISTS period_limit_usd DECIMAL(20, 10);

CREATE TABLE IF NOT EXISTS user_subscription_periods (
    id              BIGSERIAL PRIMARY KEY,
    subscription_id BIGINT NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id        BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    order_id        BIGINT REFERENCES payment_orders(id) ON DELETE SET NULL,
    starts_at       TIMESTAMPTZ NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    limit_usd       DECIMAL(20, 10),
    usage_usd       DECIMAL(20, 10) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT chk_user_subscription_period_time CHECK (expires_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_period_limit
    ON subscription_plans(period_limit_usd);

CREATE INDEX IF NOT EXISTS idx_user_subscription_periods_subscription
    ON user_subscription_periods(subscription_id);

CREATE INDEX IF NOT EXISTS idx_user_subscription_periods_active_lookup
    ON user_subscription_periods(subscription_id, status, starts_at, expires_at)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_subscription_periods_user_group
    ON user_subscription_periods(user_id, group_id, starts_at, expires_at)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscription_periods_order_unique
    ON user_subscription_periods(order_id)
    WHERE order_id IS NOT NULL AND deleted_at IS NULL;

WITH latest_completed_subscription_orders AS (
    SELECT DISTINCT ON (po.user_id, po.subscription_group_id)
        po.user_id,
        po.subscription_group_id AS group_id,
        CASE
            WHEN (po.provider_snapshot ->> 'subscription_period_limit_usd') ~ '^[0-9]+(\.[0-9]+)?$'
                THEN (po.provider_snapshot ->> 'subscription_period_limit_usd')::DECIMAL(20, 10)
            ELSE NULL
        END AS period_limit_usd
    FROM payment_orders po
    WHERE po.order_type = 'subscription'
      AND po.status = 'COMPLETED'
      AND po.subscription_group_id IS NOT NULL
    ORDER BY po.user_id, po.subscription_group_id, COALESCE(po.completed_at, po.paid_at, po.created_at) DESC, po.id DESC
)
INSERT INTO user_subscription_periods (
    subscription_id,
    user_id,
    group_id,
    order_id,
    starts_at,
    expires_at,
    status,
    limit_usd,
    usage_usd,
    created_at,
    updated_at
)
SELECT
    us.id,
    us.user_id,
    us.group_id,
    NULL,
    GREATEST(us.starts_at, COALESCE(us.daily_window_start, us.starts_at)),
    us.expires_at,
    us.status,
    CASE WHEN o.period_limit_usd > 0 THEN o.period_limit_usd ELSE NULL END,
    0,
    NOW(),
    NOW()
FROM user_subscriptions us
LEFT JOIN latest_completed_subscription_orders o
    ON o.user_id = us.user_id
   AND o.group_id = us.group_id
WHERE us.deleted_at IS NULL
  AND us.status = 'active'
  AND us.expires_at > NOW()
  AND us.expires_at > GREATEST(us.starts_at, COALESCE(us.daily_window_start, us.starts_at))
  AND NOT EXISTS (
      SELECT 1
      FROM user_subscription_periods usp
      WHERE usp.subscription_id = us.id
        AND usp.deleted_at IS NULL
  );
