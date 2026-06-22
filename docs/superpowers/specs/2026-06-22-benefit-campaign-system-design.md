# Benefit Campaign System Design

## Summary

Build a welfare/benefit campaign system that lets admins configure time-limited claimable benefits for users.

The first version supports single-tier campaigns such as "users whose cumulative recharge is at least 100 can claim 10 balance." Claim availability is controlled by a fixed campaign time window. After a successful claim, the grant is credited directly to the user's normal balance.

The campaign also stores an optional grant validity period for future benefit-balance expiration support, but the first version does not implement separate benefit-balance deduction or expiration.

## Goals

- Let admins create benefit campaigns with a fixed claim window.
- Support a single recharge threshold and a fixed grant amount per campaign.
- Let admins choose whether eligibility uses lifetime cumulative recharge or campaign-window recharge.
- Let each user claim each campaign at most once.
- Provide complete configurable user-facing copy for each claim state.
- Keep claim records auditable with eligibility and balance snapshots.
- Fit the existing payment, balance, and admin/user API patterns.

## Non-Goals

- Do not build a generic rule engine.
- Do not support multi-tier campaigns in the first version.
- Do not support daily, weekly, or repeated claims in the first version.
- Do not implement separate benefit-balance consumption or expiration in the first version.
- Do not automatically revoke or reverse claimed benefits after a refund in the first version.
- Do not replace the existing redeem-code, payment-order, or subscription systems.

## Business Rules

Admins can create multiple campaigns. A campaign can be enabled or disabled, and can be visible or hidden from the user-facing benefit list.

Each campaign has one rule:

```text
eligible recharge amount >= threshold amount
```

When the rule is satisfied during the claim window, the user can claim the configured grant amount once.

The claim window is controlled by:

- `starts_at`
- `ends_at`

Users cannot claim before `starts_at` or after `ends_at`.

The eligibility recharge amount is calculated from one of two scopes:

- `lifetime`: use the user's historical cumulative recharge, based on the existing user total recharge field.
- `campaign_window`: sum successful recharge orders within the campaign claim window.

On successful claim, the system adds the grant amount to the user's normal balance. The grant is not treated as a separate expiring balance in the first version.

The campaign may store `grant_validity_days`. When present, the claim record stores `grant_expires_at` for display and future migration, but the first version does not enforce this expiry during usage billing.

## Data Model

Add `benefit_campaigns`.

Important fields:

- `id`
- `name`: admin-facing campaign name.
- `enabled`: whether the campaign can be evaluated and claimed.
- `visible`: whether the campaign appears in the user-facing list.
- `starts_at`
- `ends_at`
- `threshold_amount`: recharge threshold.
- `grant_amount`: balance amount granted on claim.
- `recharge_scope`: `lifetime` or `campaign_window`.
- `grant_validity_days`: optional future-facing display/storage field.
- `copy`: JSON object containing user-facing copy for all states.
- `sort_order`
- `created_at`
- `updated_at`
- `deleted_at`

The `copy` JSON should include:

```json
{
  "title": "Recharge benefit",
  "description": "Claim a bonus after meeting the recharge requirement.",
  "button": "Claim",
  "success": "Benefit claimed.",
  "not_eligible": "Recharge more to unlock this benefit.",
  "not_started": "This benefit is not available yet.",
  "ended": "This benefit has ended.",
  "claimed": "You have already claimed this benefit.",
  "failed": "Could not claim this benefit. Please try again."
}
```

Add `benefit_claims`.

Important fields:

- `id`
- `campaign_id`
- `user_id`
- `status`: first version mainly uses `claimed`.
- `eligible_recharge_amount`: eligibility snapshot at claim time.
- `granted_amount`: grant amount snapshot.
- `balance_before`
- `balance_after`
- `claimed_at`
- `grant_expires_at`: optional display/future-use timestamp.
- `source_redeem_code`: optional code if implementation reuses an internal redeem-code path.
- `metadata`: JSON for future audit details.
- `created_at`
- `updated_at`

Constraints and indexes:

- Unique active claim per `campaign_id` and `user_id`.
- Index `campaign_id`.
- Index `user_id`.
- Index `claimed_at`.

## Backend Design

Add a benefit campaign service with three responsibilities:

- Admin campaign CRUD.
- User-facing campaign state evaluation.
- Atomic claim fulfillment.

Suggested admin endpoints:

```text
GET    /api/v1/admin/benefits/campaigns
POST   /api/v1/admin/benefits/campaigns
GET    /api/v1/admin/benefits/campaigns/:id
PUT    /api/v1/admin/benefits/campaigns/:id
DELETE /api/v1/admin/benefits/campaigns/:id
GET    /api/v1/admin/benefits/campaigns/:id/claims
```

Suggested user endpoints:

```text
GET  /api/v1/benefits/campaigns
POST /api/v1/benefits/campaigns/:id/claim
```

User list response should return each campaign with computed claim state:

- `not_started`
- `ended`
- `claimed`
- `not_eligible`
- `claimable`

It should include the eligible recharge snapshot used for display, the threshold, the grant amount, the relevant copy, and any display-only `grant_expires_at` information if already claimed.

Claim flow:

1. Load the campaign.
2. Validate `enabled`, `visible` where appropriate, and the current time window.
3. Check whether the user already claimed the campaign.
4. Calculate eligible recharge amount from `lifetime` or `campaign_window`.
5. Reject if the amount is below the threshold.
6. Start a transaction.
7. Insert `benefit_claims`; rely on the unique constraint to prevent double claims.
8. Add the grant amount to the user's normal balance.
9. Store `balance_before`, `balance_after`, and `grant_expires_at`.
10. Invalidate balance/auth caches using the existing balance update path.
11. Return claim success with the latest balance and claim details.

The implementation should prefer existing repository/service patterns. If the current balance history UI depends on redeem-code records, the claim flow may generate an internal redeem code and store it in `source_redeem_code`; otherwise, a dedicated benefit claim record is enough for the first version.

## Frontend Design

Admin UI:

- Add a benefit campaign management page.
- Show campaign name, enabled state, visible state, time window, threshold, grant amount, recharge scope, claim count, and sort order.
- Provide create/edit dialogs for rule fields and complete state copy.
- Provide a claim-record detail list for each campaign.

User UI:

- Add a benefit list view or integrate into the existing recharge/payment area.
- Show visible campaigns in sort order.
- For each campaign, display title, description, threshold, grant amount, claim window, current eligibility progress, status copy, and the claim button.
- Disable the claim button for non-claimable states.
- After claim success, update the row state and refresh user balance.

The UI should make the distinction clear:

- Claim availability is controlled by the campaign window.
- Grant validity is display-only in the first version and does not affect normal balance spending.

## Data Flow

User campaign list:

1. User opens the benefit area.
2. Frontend calls `GET /api/v1/benefits/campaigns`.
3. Backend loads visible campaigns and the user's existing claims.
4. Backend calculates eligibility for each campaign.
5. Frontend renders each campaign with state-specific copy.

User claim:

1. User clicks claim.
2. Frontend calls `POST /api/v1/benefits/campaigns/:id/claim`.
3. Backend rechecks every rule server-side.
4. Backend writes the claim record and credits balance in one transaction.
5. Frontend shows success copy and updates balance/state.

Admin management:

1. Admin creates or updates a campaign.
2. Backend validates the time window, amounts, recharge scope, and copy object.
3. User-facing list reflects enabled and visible campaign changes immediately.

## Error Handling

Backend validation:

- Reject missing or invalid campaign names.
- Reject `ends_at <= starts_at`.
- Reject non-positive threshold and grant amounts.
- Reject unknown recharge scopes.
- Reject malformed copy JSON.
- Reject claims for disabled, hidden, not-started, ended, already-claimed, or not-eligible campaigns.

Concurrency:

- Use the `campaign_id + user_id` unique constraint as the final guard against duplicate claims.
- Treat duplicate insert conflicts as an already-claimed response.
- Keep balance credit and claim record updates in the same transaction.

Refunds:

- First version does not automatically revoke benefits after refund.
- Claim records retain the eligibility recharge snapshot so admins can audit edge cases later.

## Testing

Backend tests:

- Admin can create, update, list, and delete benefit campaigns.
- Invalid windows, amounts, scopes, and copy payloads are rejected.
- User campaign list returns correct states for not started, ended, claimed, not eligible, and claimable campaigns.
- Lifetime scope uses existing cumulative recharge.
- Campaign-window scope sums only successful orders inside the campaign window.
- Claiming credits balance and creates a claim record.
- Claiming twice is rejected and does not credit balance twice.
- Concurrent duplicate claims cannot double-credit.
- `grant_validity_days` stores `grant_expires_at` but does not alter balance consumption.

Frontend tests:

- Admin campaign form validates required fields.
- Admin list renders campaign summary and claim counts.
- User benefit list renders each claim state with configured copy.
- Claim button is enabled only for claimable campaigns.
- Successful claim refreshes state and balance display.
- Claim failure shows configured failure copy or a safe default.

## Implementation Notes

- Prefer a dedicated benefit service instead of embedding this logic directly in payment fulfillment.
- Keep recharge eligibility calculation server-side only.
- Keep copy defaults server-side so incomplete legacy records still render safely.
- Use decimal-compatible database column definitions consistent with existing balance and payment amount fields.
- Avoid naming the first-version grant as expiring balance in code paths that actually credit normal balance.
