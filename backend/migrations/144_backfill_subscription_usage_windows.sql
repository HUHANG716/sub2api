UPDATE user_subscriptions
SET
    daily_window_start = CASE
        WHEN daily_window_start IS NULL AND daily_usage_usd > 0 THEN starts_at
        ELSE daily_window_start
    END,
    weekly_window_start = CASE
        WHEN weekly_window_start IS NULL AND weekly_usage_usd > 0 THEN starts_at
        ELSE weekly_window_start
    END,
    monthly_window_start = CASE
        WHEN monthly_window_start IS NULL AND monthly_usage_usd > 0 THEN starts_at
        ELSE monthly_window_start
    END,
    updated_at = NOW()
WHERE deleted_at IS NULL
  AND starts_at IS NOT NULL
  AND (
      (daily_window_start IS NULL AND daily_usage_usd > 0)
      OR (weekly_window_start IS NULL AND weekly_usage_usd > 0)
      OR (monthly_window_start IS NULL AND monthly_usage_usd > 0)
  );
