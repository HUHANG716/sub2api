# Public Model Pricing Page Design

## Summary

Build a public model pricing reference page at `/model-pricing`.

The page shows default model reference pricing for OpenAI, Anthropic, and Gemini only. It does not show channel-specific selling prices, user-specific multipliers, subscription prices, or billing overrides.

Prices are displayed as USD per 1 million tokens.

## Goals

- Let unauthenticated visitors inspect default model pricing.
- Keep the page clearly scoped as a reference table, not a sales-plan page.
- Reuse the existing backend pricing catalog and sync behavior.
- Avoid exposing raw LiteLLM catalog fields that the product does not render.
- Keep the frontend dense and searchable for fast comparison.

## Non-Goals

- Do not expose channel actual selling prices.
- Do not expose account, group, user, discount, or billing multiplier data.
- Do not expose all LiteLLM providers.
- Do not add editing or admin controls to the public page.
- Do not make this a marketing landing page.

## Backend Design

Add a public endpoint:

```text
GET /api/v1/public/model-pricing
```

The endpoint requires no authentication.

It reads from the existing pricing catalog service and returns a provider-filtered, field-whitelisted response. Supported providers:

- `openai`
- `anthropic`
- `google`

The response maps `google` to the user-facing provider label `gemini`.

Example response shape:

```json
{
  "items": [
    {
      "provider": "openai",
      "model": "gpt-5.4",
      "mode": "chat",
      "input_price_per_million": 2.5,
      "output_price_per_million": 15,
      "cache_write_price_per_million": 2.5,
      "cache_read_price_per_million": 0.25,
      "image_output_price": null,
      "supports_prompt_caching": true,
      "supports_service_tier": true
    }
  ],
  "last_updated": "2026-06-06T00:00:00Z"
}
```

Field rules:

- Convert token prices from per-token to per-1M tokens in the backend.
- Use `null` for missing price fields.
- Sort by provider, then model name.
- Return only the whitelisted fields above.
- Include `last_updated` from the pricing service status.

## Frontend Design

Add a public Vue route:

```text
/model-pricing
```

The route has `requiresAuth: false`.

Add `/model-pricing` to the backend-mode public allowlist so anonymous visitors are not redirected to `/login`.

Add a frontend API module for the public endpoint.

The page uses a dense catalog-table layout:

- Header with title and a short scope note.
- Platform filter tabs: `All`, `OpenAI`, `Anthropic`, `Gemini`.
- Search input filtering by model name.
- Table columns:
  - Model
  - Platform
  - Mode
  - Input
  - Output
  - Cache write
  - Cache read
  - Image output
  - Capabilities
- Price unit label: `USD / 1M tokens`.
- Empty numeric fields render as `-`.
- Capabilities render as compact labels, such as prompt cache and priority tier.

States:

- Loading state while the endpoint is pending.
- Error state with retry when the endpoint fails.
- Empty state when filters match no rows.

The page should remain utilitarian and readable. It should not use a hero layout or marketing-style cards.

## Data Flow

1. Browser loads `/model-pricing`.
2. Vue route renders the public pricing page without authentication.
3. Page calls `GET /api/v1/public/model-pricing`.
4. Backend reads current pricing data from `PricingService`.
5. Backend filters providers, converts prices to per-1M token units, and returns the whitelist DTO.
6. Frontend applies client-side platform and model-name filters.

## Error Handling

Backend:

- If the pricing catalog is initialized but empty, return an empty `items` array with HTTP 200.
- If pricing service access fails unexpectedly, return a normal API error response.
- Do not expose internal file paths, upstream URLs, hashes, or raw provider metadata in the public response.

Frontend:

- Show a retryable error message if the request fails.
- Keep filters usable only after data is loaded.
- Show `-` for missing optional price fields.

## Testing

Backend tests:

- Public endpoint returns HTTP 200 without auth middleware.
- Endpoint returns only OpenAI, Anthropic, and Gemini provider rows.
- Per-token prices are converted to USD per 1M tokens.
- Raw LiteLLM fields are not present in the response.
- Items are sorted consistently.

Frontend tests:

- `/model-pricing` route is registered as public.
- Backend mode allows anonymous access to `/model-pricing`.
- Page renders table rows from the public pricing API.
- Platform tabs filter rows.
- Search filters by model name.
- Request failure shows an error state with retry.

## Implementation Notes

- Prefer adding a small dedicated public pricing handler instead of expanding the admin channel handler.
- Reuse existing pricing DTO concepts where they fit, but keep public response types explicit.
- Do not read the JSON file directly from the frontend.
- Do not expose channel pricing through this page.
