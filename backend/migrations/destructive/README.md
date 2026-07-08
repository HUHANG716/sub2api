# Risky migration plans

Risky migrations are blocked by default during CI and deployment until they
have an explicit JSON plan.

The gate treats destructive cleanup as operations such as dropping or renaming
columns/tables/views/types/schemas, changing column types, setting `NOT NULL`,
dropping constraints, or truncating data. It treats operations such as
non-concurrent index changes, adding table constraints, table locks, bulk
updates/deletes, and constraint validation as high-risk compatible work that
still needs review.

For a cleanup-only migration that drops or renames schema used by older code,
add a JSON plan next to this README:

```json
{
  "migration": "150_drop_old_column.sql",
  "phase": "cleanup",
  "safe_after_commit": "0123456789abcdef0123456789abcdef01234567",
  "reason": "The previous release removed all reads and writes of old_column.",
  "risk": "Dropping old_column will break any older container that still reads it.",
  "mitigation": "Deploy the compatibility release first, then run this cleanup in a later deploy.",
  "approved_by": "hang"
}
```

For a high-risk but compatible migration, use a reviewed non-cleanup phase:

```json
{
  "migration": "153_add_large_table_index.sql",
  "phase": "review",
  "reason": "Adds an index on a large table.",
  "risk": "A non-concurrent index can block writes while it builds.",
  "mitigation": "Use CREATE INDEX CONCURRENTLY or run during a low-traffic window.",
  "approved_by": "hang"
}
```

Rules:

- Destructive cleanup migrations must only ship with files under
  `backend/migrations/`.
- `safe_after_commit` is required for cleanup migrations and must point to the
  compatibility release that no longer depends on the deleted schema.
- Deployment refuses to run cleanup until the currently active image is a
  descendant of `safe_after_commit`.
- High-risk compatible migrations can use `phase: "review"` or
  `phase: "expand"` with a concrete mitigation.
- When restoring historical migration files onto a long-lived branch, keep the
  risky SQL isolated from follow-up code or metadata commits so CI can evaluate
  the migration plans separately from application changes.
