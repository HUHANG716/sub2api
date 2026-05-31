-- Minimal payment funnel analytics for the authenticated payment page.
CREATE TABLE IF NOT EXISTS payment_events (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_name VARCHAR(40) NOT NULL,
    tab VARCHAR(32),
    order_type VARCHAR(32),
    payment_type VARCHAR(32),
    launch_kind VARCHAR(32),
    status VARCHAR(32),
    amount DECIMAL(20,2),
    pay_amount DECIMAL(20,2),
    fee_rate DECIMAL(10,4),
    plan_id BIGINT,
    order_id BIGINT REFERENCES payment_orders(id) ON DELETE SET NULL,
    error_kind VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT payment_events_name_check CHECK (
        event_name IN (
            'payment_page_view',
            'payment_tab_change',
            'payment_method_select',
            'payment_plan_select',
            'payment_order_submit',
            'payment_order_create_success',
            'payment_order_create_error',
            'payment_launch',
            'payment_success',
            'payment_settled',
            'payment_result_view',
            'payment_result_status'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_payment_events_created_at
ON payment_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_events_user_created_at
ON payment_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_events_name_created_at
ON payment_events (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_events_order_created_at
ON payment_events (order_id, created_at DESC);
