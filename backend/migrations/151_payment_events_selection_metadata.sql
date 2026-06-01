-- Extend payment funnel analytics with pre-submit selection intent.
ALTER TABLE payment_events
ADD COLUMN IF NOT EXISTS source VARCHAR(32);

ALTER TABLE payment_events
DROP CONSTRAINT IF EXISTS payment_events_name_check;

ALTER TABLE payment_events
ADD CONSTRAINT payment_events_name_check CHECK (
    event_name IN (
        'payment_page_view',
        'payment_tab_change',
        'payment_amount_select',
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
);
