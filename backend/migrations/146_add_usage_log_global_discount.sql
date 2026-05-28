-- Store the global discount snapshot applied to each usage log.
ALTER TABLE usage_logs
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(20,10) NOT NULL DEFAULT 0;

ALTER TABLE usage_logs
  ADD COLUMN IF NOT EXISTS discount_rate DECIMAL(10,4) NOT NULL DEFAULT 1;
