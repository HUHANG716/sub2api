-- Minimal beta analytics for the embedded image playground.
CREATE TABLE IF NOT EXISTS image_playground_events (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_name VARCHAR(32) NOT NULL,
    source_mode VARCHAR(32),
    provider VARCHAR(32),
    api_mode VARCHAR(32),
    model VARCHAR(100),
    image_size VARCHAR(32),
    quality VARCHAR(32),
    output_format VARCHAR(32),
    image_count INT,
    input_image_count INT,
    has_mask BOOLEAN,
    duration_ms INT,
    output_image_count INT,
    error_kind VARCHAR(100),
    recoverable BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT image_playground_events_name_check CHECK (
        event_name IN ('image_generate_submit', 'image_generate_success', 'image_generate_error')
    )
);

CREATE INDEX IF NOT EXISTS idx_image_playground_events_created_at
ON image_playground_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_image_playground_events_user_created_at
ON image_playground_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_image_playground_events_name_created_at
ON image_playground_events (event_name, created_at DESC);
