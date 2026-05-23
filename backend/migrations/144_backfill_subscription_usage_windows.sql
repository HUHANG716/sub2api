WITH anchored_windows AS (
    SELECT
        id,
        starts_at,
        starts_at + (
            GREATEST(FLOOR(EXTRACT(EPOCH FROM (NOW() - starts_at)) / 86400), 0)
            * INTERVAL '1 day'
        ) AS current_daily_window_start,
        starts_at + (
            GREATEST(FLOOR(EXTRACT(EPOCH FROM (NOW() - starts_at)) / 604800), 0)
            * INTERVAL '7 days'
        ) AS current_weekly_window_start,
        starts_at + (
            GREATEST(FLOOR(EXTRACT(EPOCH FROM (NOW() - starts_at)) / 2592000), 0)
            * INTERVAL '30 days'
        ) AS current_monthly_window_start
    FROM user_subscriptions
    WHERE deleted_at IS NULL
      AND starts_at IS NOT NULL
)
UPDATE user_subscriptions us
SET
    daily_window_start = CASE
        WHEN us.daily_window_start IS NULL AND us.daily_usage_usd > 0 THEN aw.current_daily_window_start
        WHEN us.daily_window_start::time = TIME '00:00:00'
             AND aw.starts_at::time <> TIME '00:00:00'
            THEN aw.current_daily_window_start
        ELSE us.daily_window_start
    END,
    daily_usage_usd = CASE
        WHEN us.daily_window_start::time = TIME '00:00:00'
             AND aw.starts_at::time <> TIME '00:00:00'
             AND aw.current_daily_window_start > us.daily_window_start + INTERVAL '1 day'
            THEN 0
        ELSE us.daily_usage_usd
    END,
    weekly_window_start = CASE
        WHEN us.weekly_window_start IS NULL AND us.weekly_usage_usd > 0 THEN aw.current_weekly_window_start
        WHEN us.weekly_window_start::time = TIME '00:00:00'
             AND aw.starts_at::time <> TIME '00:00:00'
            THEN aw.current_weekly_window_start
        ELSE us.weekly_window_start
    END,
    weekly_usage_usd = CASE
        WHEN us.weekly_window_start::time = TIME '00:00:00'
             AND aw.starts_at::time <> TIME '00:00:00'
             AND aw.current_weekly_window_start > us.weekly_window_start + INTERVAL '7 days'
            THEN 0
        ELSE us.weekly_usage_usd
    END,
    monthly_window_start = CASE
        WHEN us.monthly_window_start IS NULL AND us.monthly_usage_usd > 0 THEN aw.current_monthly_window_start
        WHEN us.monthly_window_start::time = TIME '00:00:00'
             AND aw.starts_at::time <> TIME '00:00:00'
            THEN aw.current_monthly_window_start
        ELSE us.monthly_window_start
    END,
    monthly_usage_usd = CASE
        WHEN us.monthly_window_start::time = TIME '00:00:00'
             AND aw.starts_at::time <> TIME '00:00:00'
             AND aw.current_monthly_window_start > us.monthly_window_start + INTERVAL '30 days'
            THEN 0
        ELSE us.monthly_usage_usd
    END,
    updated_at = NOW()
FROM anchored_windows aw
WHERE us.id = aw.id
  AND (
      (us.daily_window_start IS NULL AND us.daily_usage_usd > 0)
      OR (us.weekly_window_start IS NULL AND us.weekly_usage_usd > 0)
      OR (us.monthly_window_start IS NULL AND us.monthly_usage_usd > 0)
      OR (us.daily_window_start::time = TIME '00:00:00' AND aw.starts_at::time <> TIME '00:00:00')
      OR (us.weekly_window_start::time = TIME '00:00:00' AND aw.starts_at::time <> TIME '00:00:00')
      OR (us.monthly_window_start::time = TIME '00:00:00' AND aw.starts_at::time <> TIME '00:00:00')
  );
