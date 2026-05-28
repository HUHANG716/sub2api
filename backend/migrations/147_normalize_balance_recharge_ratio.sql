-- Normalize balance recharge units from 1 CNY = 7.5 balance units to 1 CNY = 1 balance unit.
--
-- This is a one-time value-preserving rescale:
--   - balance/quota/usage/bonus numeric amounts are divided by 7.5
--   - billing multipliers are divided by 7.5
--   - real payment amounts, plan prices, base model/channel prices, concurrency, RPM, and request counts are unchanged
--
-- The marker setting prevents accidental double-scaling if this SQL is replayed manually outside
-- the schema_migrations checksum guard.

DO $$
DECLARE
    v_ratio CONSTANT numeric := 7.5;
    v_marker CONSTANT text := 'balance_recharge_ratio_normalized_1_to_1';
BEGIN
    IF EXISTS (SELECT 1 FROM settings WHERE key = v_marker AND value = 'true') THEN
        RETURN;
    END IF;

    EXECUTE $ddl$
        CREATE OR REPLACE FUNCTION pg_temp._ratio_try_jsonb(raw text)
        RETURNS jsonb
        LANGUAGE plpgsql
        AS $func$
        BEGIN
            RETURN raw::jsonb;
        EXCEPTION WHEN others THEN
            RETURN NULL;
        END
        $func$
    $ddl$;

    CREATE TEMPORARY TABLE IF NOT EXISTS _ratio_balance_setting_keys (key text PRIMARY KEY) ON COMMIT DROP;
    TRUNCATE _ratio_balance_setting_keys;
    INSERT INTO _ratio_balance_setting_keys (key) VALUES
        ('default_balance'),
        ('auth_source_default_email_balance'),
        ('auth_source_default_linuxdo_balance'),
        ('auth_source_default_oidc_balance'),
        ('auth_source_default_wechat_balance'),
        ('auth_source_default_github_balance'),
        ('auth_source_default_google_balance'),
        ('auth_source_default_dingtalk_balance'),
        ('balance_low_notify_threshold'),
        ('affiliate_rebate_per_invitee_cap')
    ON CONFLICT DO NOTHING;

    CREATE TEMPORARY TABLE IF NOT EXISTS _ratio_platform_quota_setting_keys (key text PRIMARY KEY) ON COMMIT DROP;
    TRUNCATE _ratio_platform_quota_setting_keys;
    INSERT INTO _ratio_platform_quota_setting_keys (key) VALUES
        ('default_platform_quotas'),
        ('auth_source_default_email_platform_quotas'),
        ('auth_source_default_linuxdo_platform_quotas'),
        ('auth_source_default_oidc_platform_quotas'),
        ('auth_source_default_wechat_platform_quotas'),
        ('auth_source_default_github_platform_quotas'),
        ('auth_source_default_google_platform_quotas'),
        ('auth_source_default_dingtalk_platform_quotas')
    ON CONFLICT DO NOTHING;

    UPDATE settings
    SET value = '1',
        updated_at = NOW()
    WHERE key = 'BALANCE_RECHARGE_MULTIPLIER';

    UPDATE settings
    SET value = COALESCE((
            SELECT jsonb_agg(
                CASE
                    WHEN jsonb_typeof(tier) = 'object'
                         AND tier ? 'bonus_amount'
                         AND (tier->>'bonus_amount') ~ '^-?[0-9]+(\.[0-9]+)?$'
                    THEN jsonb_set(
                        tier,
                        '{bonus_amount}',
                        to_jsonb(round(((tier->>'bonus_amount')::numeric / v_ratio), 2)),
                        true
                    )
                    ELSE tier
                END
                ORDER BY ord
            )::text
            FROM jsonb_array_elements(pg_temp._ratio_try_jsonb(value)) WITH ORDINALITY AS elems(tier, ord)
        ), '[]'),
        updated_at = NOW()
    WHERE key = 'BALANCE_RECHARGE_BONUS_TIERS'
      AND jsonb_typeof(pg_temp._ratio_try_jsonb(value)) = 'array';

    UPDATE settings s
    SET value = round((s.value::numeric / v_ratio), 8)::text,
        updated_at = NOW()
    FROM _ratio_balance_setting_keys k
    WHERE s.key = k.key
      AND s.value ~ '^-?[0-9]+(\.[0-9]+)?$';

    UPDATE settings s
    SET value = COALESCE((
            SELECT jsonb_object_agg(platform_key, platform_value)
            FROM (
                SELECT
                    platform_key,
                    CASE
                        WHEN jsonb_typeof(platform_value) = 'object'
                        THEN (
                            SELECT jsonb_object_agg(
                                field_key,
                                CASE
                                    WHEN field_key IN ('daily', 'weekly', 'monthly')
                                         AND field_value IS NOT NULL
                                         AND jsonb_typeof(field_value) = 'number'
                                    THEN to_jsonb(round((field_value::text)::numeric / v_ratio, 8))
                                    ELSE field_value
                                END
                            )
                            FROM jsonb_each(platform_value) AS field(field_key, field_value)
                        )
                        ELSE platform_value
                    END AS platform_value
                FROM jsonb_each(pg_temp._ratio_try_jsonb(s.value)) AS platform(platform_key, platform_value)
            ) scaled
        )::text, '{}'),
        updated_at = NOW()
    FROM _ratio_platform_quota_setting_keys k
    WHERE s.key = k.key
      AND jsonb_typeof(pg_temp._ratio_try_jsonb(s.value)) = 'object';

    UPDATE users
    SET balance = balance / v_ratio,
        total_recharged = total_recharged / v_ratio,
        balance_notify_threshold = CASE
            WHEN balance_notify_threshold_type = 'fixed' AND balance_notify_threshold IS NOT NULL
                THEN balance_notify_threshold / v_ratio
            ELSE balance_notify_threshold
        END,
        updated_at = NOW()
    WHERE balance <> 0
       OR total_recharged <> 0
       OR (balance_notify_threshold_type = 'fixed' AND balance_notify_threshold IS NOT NULL);

    UPDATE groups
    SET rate_multiplier = rate_multiplier / v_ratio,
        image_rate_multiplier = image_rate_multiplier / v_ratio,
        daily_limit_usd = daily_limit_usd / v_ratio,
        weekly_limit_usd = weekly_limit_usd / v_ratio,
        monthly_limit_usd = monthly_limit_usd / v_ratio,
        updated_at = NOW()
    WHERE rate_multiplier <> 0
       OR image_rate_multiplier <> 0
       OR daily_limit_usd IS NOT NULL
       OR weekly_limit_usd IS NOT NULL
       OR monthly_limit_usd IS NOT NULL;

    UPDATE accounts
    SET rate_multiplier = rate_multiplier / v_ratio,
        extra = COALESCE(extra, '{}'::jsonb)
            || CASE
                WHEN COALESCE(extra, '{}'::jsonb) ? 'quota_limit'
                     AND (extra->>'quota_limit') ~ '^-?[0-9]+(\.[0-9]+)?$'
                THEN jsonb_build_object('quota_limit', round((extra->>'quota_limit')::numeric / v_ratio, 8))
                ELSE '{}'::jsonb
            END
            || CASE
                WHEN COALESCE(extra, '{}'::jsonb) ? 'quota_used'
                     AND (extra->>'quota_used') ~ '^-?[0-9]+(\.[0-9]+)?$'
                THEN jsonb_build_object('quota_used', round((extra->>'quota_used')::numeric / v_ratio, 8))
                ELSE '{}'::jsonb
            END
            || CASE
                WHEN COALESCE(extra, '{}'::jsonb) ? 'quota_daily_limit'
                     AND (extra->>'quota_daily_limit') ~ '^-?[0-9]+(\.[0-9]+)?$'
                THEN jsonb_build_object('quota_daily_limit', round((extra->>'quota_daily_limit')::numeric / v_ratio, 8))
                ELSE '{}'::jsonb
            END
            || CASE
                WHEN COALESCE(extra, '{}'::jsonb) ? 'quota_daily_used'
                     AND (extra->>'quota_daily_used') ~ '^-?[0-9]+(\.[0-9]+)?$'
                THEN jsonb_build_object('quota_daily_used', round((extra->>'quota_daily_used')::numeric / v_ratio, 8))
                ELSE '{}'::jsonb
            END
            || CASE
                WHEN COALESCE(extra, '{}'::jsonb) ? 'quota_weekly_limit'
                     AND (extra->>'quota_weekly_limit') ~ '^-?[0-9]+(\.[0-9]+)?$'
                THEN jsonb_build_object('quota_weekly_limit', round((extra->>'quota_weekly_limit')::numeric / v_ratio, 8))
                ELSE '{}'::jsonb
            END
            || CASE
                WHEN COALESCE(extra, '{}'::jsonb) ? 'quota_weekly_used'
                     AND (extra->>'quota_weekly_used') ~ '^-?[0-9]+(\.[0-9]+)?$'
                THEN jsonb_build_object('quota_weekly_used', round((extra->>'quota_weekly_used')::numeric / v_ratio, 8))
                ELSE '{}'::jsonb
            END
            || CASE
                WHEN COALESCE(extra, '{}'::jsonb) ? 'quota_notify_daily_threshold'
                     AND (extra->>'quota_notify_daily_threshold') ~ '^-?[0-9]+(\.[0-9]+)?$'
                     AND COALESCE(extra->>'quota_notify_daily_threshold_type', 'fixed') = 'fixed'
                THEN jsonb_build_object('quota_notify_daily_threshold', round((extra->>'quota_notify_daily_threshold')::numeric / v_ratio, 8))
                ELSE '{}'::jsonb
            END
            || CASE
                WHEN COALESCE(extra, '{}'::jsonb) ? 'quota_notify_weekly_threshold'
                     AND (extra->>'quota_notify_weekly_threshold') ~ '^-?[0-9]+(\.[0-9]+)?$'
                     AND COALESCE(extra->>'quota_notify_weekly_threshold_type', 'fixed') = 'fixed'
                THEN jsonb_build_object('quota_notify_weekly_threshold', round((extra->>'quota_notify_weekly_threshold')::numeric / v_ratio, 8))
                ELSE '{}'::jsonb
            END
            || CASE
                WHEN COALESCE(extra, '{}'::jsonb) ? 'quota_notify_total_threshold'
                     AND (extra->>'quota_notify_total_threshold') ~ '^-?[0-9]+(\.[0-9]+)?$'
                     AND COALESCE(extra->>'quota_notify_total_threshold_type', 'fixed') = 'fixed'
                THEN jsonb_build_object('quota_notify_total_threshold', round((extra->>'quota_notify_total_threshold')::numeric / v_ratio, 8))
                ELSE '{}'::jsonb
            END,
        updated_at = NOW()
    WHERE rate_multiplier <> 0
       OR COALESCE(extra, '{}'::jsonb) ?| ARRAY[
            'quota_limit',
            'quota_used',
            'quota_daily_limit',
            'quota_daily_used',
            'quota_weekly_limit',
            'quota_weekly_used',
            'quota_notify_daily_threshold',
            'quota_notify_weekly_threshold',
            'quota_notify_total_threshold'
        ];

    UPDATE user_group_rate_multipliers
    SET rate_multiplier = rate_multiplier / v_ratio,
        updated_at = NOW()
    WHERE rate_multiplier IS NOT NULL
      AND rate_multiplier <> 0;

    UPDATE api_keys
    SET quota = quota / v_ratio,
        quota_used = quota_used / v_ratio,
        rate_limit_5h = rate_limit_5h / v_ratio,
        rate_limit_1d = rate_limit_1d / v_ratio,
        rate_limit_7d = rate_limit_7d / v_ratio,
        usage_5h = usage_5h / v_ratio,
        usage_1d = usage_1d / v_ratio,
        usage_7d = usage_7d / v_ratio,
        updated_at = NOW()
    WHERE quota <> 0
       OR quota_used <> 0
       OR rate_limit_5h <> 0
       OR rate_limit_1d <> 0
       OR rate_limit_7d <> 0
       OR usage_5h <> 0
       OR usage_1d <> 0
       OR usage_7d <> 0;

    UPDATE user_subscriptions
    SET daily_usage_usd = daily_usage_usd / v_ratio,
        weekly_usage_usd = weekly_usage_usd / v_ratio,
        monthly_usage_usd = monthly_usage_usd / v_ratio,
        updated_at = NOW()
    WHERE daily_usage_usd <> 0
       OR weekly_usage_usd <> 0
       OR monthly_usage_usd <> 0;

    UPDATE user_platform_quotas
    SET daily_limit_usd = daily_limit_usd / v_ratio,
        weekly_limit_usd = weekly_limit_usd / v_ratio,
        monthly_limit_usd = monthly_limit_usd / v_ratio,
        daily_usage_usd = daily_usage_usd / v_ratio,
        weekly_usage_usd = weekly_usage_usd / v_ratio,
        monthly_usage_usd = monthly_usage_usd / v_ratio,
        updated_at = NOW()
    WHERE daily_limit_usd IS NOT NULL
       OR weekly_limit_usd IS NOT NULL
       OR monthly_limit_usd IS NOT NULL
       OR daily_usage_usd <> 0
       OR weekly_usage_usd <> 0
       OR monthly_usage_usd <> 0;

    UPDATE payment_orders
    SET amount = amount / v_ratio,
        refund_amount = refund_amount / v_ratio,
        updated_at = NOW()
    WHERE order_type = 'balance'
      AND (amount <> 0 OR refund_amount <> 0);

    UPDATE redeem_codes
    SET value = value / v_ratio
    WHERE type IN ('balance', 'admin_balance')
      AND value <> 0;

    UPDATE promo_codes
    SET bonus_amount = bonus_amount / v_ratio,
        updated_at = NOW()
    WHERE bonus_amount <> 0;

    UPDATE promo_code_usages
    SET bonus_amount = bonus_amount / v_ratio
    WHERE bonus_amount <> 0;

    UPDATE user_affiliates
    SET aff_quota = aff_quota / v_ratio,
        aff_frozen_quota = aff_frozen_quota / v_ratio,
        aff_history_quota = aff_history_quota / v_ratio,
        updated_at = NOW()
    WHERE aff_quota <> 0
       OR aff_frozen_quota <> 0
       OR aff_history_quota <> 0;

    UPDATE user_affiliate_ledger
    SET amount = amount / v_ratio,
        balance_after = balance_after / v_ratio,
        aff_quota_after = aff_quota_after / v_ratio,
        aff_frozen_quota_after = aff_frozen_quota_after / v_ratio,
        aff_history_quota_after = aff_history_quota_after / v_ratio,
        updated_at = NOW()
    WHERE amount <> 0
       OR balance_after IS NOT NULL
       OR aff_quota_after IS NOT NULL
       OR aff_frozen_quota_after IS NOT NULL
       OR aff_history_quota_after IS NOT NULL;

    UPDATE usage_logs
    SET actual_cost = actual_cost / v_ratio,
        discount_amount = discount_amount / v_ratio,
        rate_multiplier = rate_multiplier / v_ratio,
        account_rate_multiplier = account_rate_multiplier / v_ratio
    WHERE actual_cost <> 0
       OR discount_amount <> 0
       OR rate_multiplier <> 0
       OR account_rate_multiplier IS NOT NULL;

    UPDATE usage_dashboard_hourly
    SET actual_cost = actual_cost / v_ratio,
        account_cost = account_cost / v_ratio
    WHERE actual_cost <> 0
       OR account_cost <> 0;

    UPDATE usage_dashboard_daily
    SET actual_cost = actual_cost / v_ratio,
        account_cost = account_cost / v_ratio
    WHERE actual_cost <> 0
       OR account_cost <> 0;

    INSERT INTO settings (key, value, updated_at)
    VALUES (v_marker, 'true', NOW())
    ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value,
            updated_at = EXCLUDED.updated_at;
END $$;
