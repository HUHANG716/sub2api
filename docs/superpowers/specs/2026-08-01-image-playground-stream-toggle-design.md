# Image Playground Stream Toggle Design

## Goal

Allow users of the Hahacode-embedded image playground to turn streaming off independently for the Images and Agent API profiles. The choice must survive reloads and later visits.

## Scope

- Enable only the existing **流式传输** switch in product-embed mode.
- Keep API URL, API key, provider, model, timeout, proxy, and partial-image count read-only.
- Preserve one `streamImages` boolean for each stable embedded profile ID:
  - `hahacode-images`
  - `hahacode-agent`
- Keep streaming enabled by default when no valid saved boolean exists.

## Design

The embedded workbench continues receiving authoritative profiles from the parent page on every load. When those profiles are applied, the workbench may copy only `streamImages` from its existing persisted profile with the same ID. All other profile fields continue to come from the parent payload.

In the settings modal, product-embed mode remains generally read-only. The existing streaming switch uses a dedicated update path that can commit only `streamImages`; it does not relax the general profile update guard. The partial-image selector remains disabled in product-embed mode.

The request path is unchanged. It already selects streaming or non-streaming behavior from the active profile's `streamImages` value.

## Data Flow

1. The user changes the streaming switch for the active Images or Agent profile.
2. The existing Zustand store persists that profile's `streamImages` value.
3. On the next load, the parent supplies fresh authoritative embedded profiles.
4. The workbench matches saved and supplied profiles by stable ID and restores only the saved streaming boolean.
5. Requests use the restored value through the existing API implementation.

## Fallbacks and Safety

- Missing, malformed, or non-boolean saved values fall back to the supplied default (`true`).
- A saved profile with an unknown ID is ignored.
- Saved API credentials, endpoints, models, or other locked fields never override the parent payload.

## Verification

- Verify product-embed profile merging preserves only `streamImages` by profile ID.
- Verify Images and Agent values remain independent.
- Verify missing or invalid saved values retain the default.
- Verify the embedded settings UI can toggle streaming while the other API controls and partial-image selector remain read-only.

## Out of Scope

- A global streaming switch shared by both profiles.
- Changes to streaming response parsing or request transport.
- New storage keys or iframe messaging protocols.
