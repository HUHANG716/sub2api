-- Speed up admin dashboard balance adjustment totals.
CREATE INDEX IF NOT EXISTS idx_redeem_codes_admin_balance_used_at
ON redeem_codes (used_at)
WHERE type = 'admin_balance' AND status = 'used';
