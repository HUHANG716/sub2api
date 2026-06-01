CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_created_at
ON payment_audit_logs (created_at DESC);
