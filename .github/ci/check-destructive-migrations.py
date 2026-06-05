#!/usr/bin/env python3
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS_DIR = REPO_ROOT / "backend" / "migrations"
PLAN_DIR = MIGRATIONS_DIR / "destructive"

DESTRUCTIVE_PATTERNS = [
    ("DROP COLUMN", re.compile(r"\bDROP\s+COLUMN\b", re.IGNORECASE)),
    ("DROP TABLE", re.compile(r"\bDROP\s+TABLE\b", re.IGNORECASE)),
    ("RENAME COLUMN", re.compile(r"\bRENAME\s+COLUMN\b", re.IGNORECASE)),
    ("RENAME TABLE", re.compile(r"\bALTER\s+TABLE\b[\s\S]*?\bRENAME\s+TO\b", re.IGNORECASE)),
    ("ALTER COLUMN TYPE", re.compile(r"\bALTER\s+(?:COLUMN\s+)?[A-Za-z_][A-Za-z0-9_.\"]*\b[\s\S]*?\bTYPE\b", re.IGNORECASE)),
    ("SET NOT NULL", re.compile(r"\bALTER\s+(?:COLUMN\s+)?[A-Za-z_][A-Za-z0-9_.\"]*\b[\s\S]*?\bSET\s+NOT\s+NULL\b", re.IGNORECASE)),
    ("DROP CONSTRAINT", re.compile(r"\bDROP\s+CONSTRAINT\b", re.IGNORECASE)),
    ("DROP SCHEMA", re.compile(r"\bDROP\s+SCHEMA\b", re.IGNORECASE)),
    ("DROP TYPE", re.compile(r"\bDROP\s+TYPE\b", re.IGNORECASE)),
    ("DROP VIEW", re.compile(r"\bDROP\s+(?:MATERIALIZED\s+)?VIEW\b", re.IGNORECASE)),
    ("TRUNCATE", re.compile(r"\bTRUNCATE\b", re.IGNORECASE)),
]

HIGH_RISK_PATTERNS = [
    ("LOCK TABLE", re.compile(r"\bLOCK\s+TABLE\b", re.IGNORECASE)),
    ("ADD CONSTRAINT", re.compile(r"\bALTER\s+TABLE\b[\s\S]*?\bADD\s+CONSTRAINT\b", re.IGNORECASE)),
    ("ADD TABLE CONSTRAINT", re.compile(r"\bALTER\s+TABLE\b[\s\S]*?\bADD\s+(?:PRIMARY\s+KEY|UNIQUE|CHECK|FOREIGN\s+KEY|EXCLUDE)\b", re.IGNORECASE)),
    ("VALIDATE CONSTRAINT", re.compile(r"\bVALIDATE\s+CONSTRAINT\b", re.IGNORECASE)),
    ("ADD NOT NULL COLUMN", re.compile(r"\bADD\s+COLUMN\b[\s\S]*?\bNOT\s+NULL\b", re.IGNORECASE)),
    ("BULK UPDATE", re.compile(r"\bUPDATE\s+[A-Za-z_][A-Za-z0-9_.\"]*\s+SET\b", re.IGNORECASE)),
    ("BULK DELETE", re.compile(r"\bDELETE\s+FROM\b", re.IGNORECASE)),
]

NONCONCURRENT_INDEX_RE = re.compile(
    r"\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+(?!CONCURRENTLY\b)",
    re.IGNORECASE,
)
NONCONCURRENT_DROP_INDEX_RE = re.compile(
    r"\bDROP\s+INDEX\s+(?!CONCURRENTLY\b)",
    re.IGNORECASE,
)

IMAGE_SHA_RE = re.compile(r":(?:dev|main)-([0-9a-fA-F]{12,40})$")
SHA_RE = re.compile(r"^[0-9a-fA-F]{7,40}$")

# Risky migrations that existed before this safety gate was introduced. They
# are still immutable, and changing any of them in a PR is blocked by the
# normal CI rule. The deploy-time gate only skips plans for these exact files.
GRANDFATHERED_RISK_MIGRATIONS = {
    "001_init.sql",
    "002_account_type_migration.sql",
    "003_subscription.sql",
    "005_schema_parity.sql",
    "006_fix_invalid_subscription_expires_at.sql",
    "007_add_user_allowed_groups.sql",
    "009_fix_usage_logs_cache_columns.sql",
    "010_add_usage_logs_aggregated_indexes.sql",
    "011_remove_duplicate_unique_indexes.sql",
    "012_add_user_subscription_soft_delete.sql",
    "013_log_orphan_allowed_groups.sql",
    "014_drop_legacy_allowed_groups.sql",
    "015_fix_settings_unique_constraint.sql",
    "016_soft_delete_partial_unique_indexes.sql",
    "018_user_attributes.sql",
    "019_migrate_wechat_to_attributes.sql",
    "020_add_temp_unschedulable.sql",
    "024_add_gemini_tier_id.sql",
    "026_ops_metrics_aggregation_tables.sql",
    "027_usage_billing_consistency.sql",
    "029_add_group_claude_code_restriction.sql",
    "030_add_account_expires_at.sql",
    "031_add_ip_address.sql",
    "033_add_promo_codes.sql",
    "033_ops_monitoring_vnext.sql",
    "034_usage_dashboard_aggregation_tables.sql",
    "036_ops_error_logs_add_is_count_tokens.sql",
    "036_scheduler_outbox.sql",
    "037_add_account_rate_multiplier.sql",
    "037_ops_alert_silences.sql",
    "038_ops_errors_resolution_retry_results_and_standardize_classification.sql",
    "041_add_model_routing_enabled.sql",
    "042_add_usage_cleanup_tasks.sql",
    "042b_add_ops_system_metrics_switch_count.sql",
    "043_add_usage_cleanup_cancel_audit.sql",
    "043b_add_group_invalid_request_fallback.sql",
    "044_add_user_totp.sql",
    "044b_add_group_mcp_xml_inject.sql",
    "045_add_accounts_extra_index.sql",
    "045_add_announcements.sql",
    "045_add_api_key_quota.sql",
    "046b_add_group_supported_model_scopes.sql",
    "047_add_user_group_rate_multipliers.sql",
    "048_add_error_passthrough_rules.sql",
    "049_unify_antigravity_model_mapping.sql",
    "050_map_opus46_to_opus45.sql",
    "051_migrate_opus45_to_opus46_thinking.sql",
    "052_add_group_sort_order.sql",
    "052_migrate_upstream_to_apikey.sql",
    "053_add_security_secrets.sql",
    "053_add_skip_monitoring_to_error_passthrough.sql",
    "054_drop_legacy_cache_columns.sql",
    "054_ops_system_logs.sql",
    "055_add_cache_ttl_overridden.sql",
    "056_add_api_key_last_used_at.sql",
    "057_add_idempotency_records.sql",
    "058_add_sonnet46_to_model_mapping.sql",
    "059_add_gemini31_pro_to_model_mapping.sql",
    "060_add_gemini31_flash_image_to_model_mapping.sql",
    "060_add_usage_log_openai_ws_mode.sql",
    "061_add_usage_log_request_type.sql",
    "063_add_sora_client_tables.sql",
    "064_add_api_key_rate_limits.sql",
    "065_add_search_trgm_indexes.sql",
    "066_add_scheduled_test_tables.sql",
    "068_add_announcement_notify_mode.sql",
    "069_add_group_messages_dispatch.sql",
    "070_add_scheduled_test_auto_recover.sql",
    "070_add_usage_log_service_tier.sql",
    "071_add_gemini25_flash_image_to_model_mapping.sql",
    "071_add_usage_billing_dedup.sql",
    "075_map_haiku45_to_sonnet46.sql",
    "079_ops_error_logs_add_endpoint_fields.sql",
    "081_add_group_account_filter.sql",
    "081_create_channels.sql",
    "082_refactor_channel_pricing.sql",
    "086_channel_platform_pricing.sql",
    "089_usage_log_image_output_tokens.sql",
    "090_drop_sora.sql",
    "091_add_group_messages_dispatch_model_config.sql",
    "092_payment_orders.sql",
    "093_payment_audit_logs.sql",
    "095_channel_features.sql",
    "095_subscription_plans.sql",
    "096_payment_provider_instances.sql",
    "097_fix_settings_updated_at_default.sql",
    "098_migrate_purchase_subscription_to_custom_menu.sql",
    "099_fix_migrated_purchase_menu_label_icon.sql",
    "100_remove_easypay_from_enabled_payment_types.sql",
    "101_add_account_stats_pricing.sql",
    "101_add_balance_notify_fields.sql",
    "101_add_channel_features_config.sql",
    "101_add_payment_mode.sql",
    "102_add_balance_notify_threshold_type.sql",
    "102_add_out_trade_no_to_payment_orders.sql",
    "103_add_allow_user_refund.sql",
    "104_migrate_notify_emails_to_struct.sql",
    "105_migrate_websearch_emulation_to_tristate.sql",
    "106_add_account_stats_pricing_intervals.sql",
    "107_add_account_cost_to_dashboard_tables.sql",
    "108_auth_identity_foundation_core.sql",
    "108a_widen_auth_identity_migration_report_type.sql",
    "109_auth_identity_compat_backfill.sql",
    "110_pending_auth_and_provider_default_grants.sql",
    "112_add_payment_order_provider_key_snapshot.sql",
    "114_auth_identity_migration_report_resolution.sql",
    "116_auth_identity_legacy_external_safety_reports.sql",
    "120a_align_payment_orders_out_trade_no_index_name.sql",
    "121_auth_identity_migration_report_type_widen.sql",
    "122_pending_auth_completion_token_cleanup.sql",
    "123_fix_legacy_auth_source_grant_on_signup_defaults.sql",
    "125_add_channel_monitors.sql",
    "125_add_group_rpm_limit.sql",
    "126_add_channel_monitor_aggregation.sql",
    "126_add_user_rpm_limit.sql",
    "127_add_user_group_rpm_override.sql",
    "127_drop_channel_monitor_deleted_at.sql",
    "128_add_channel_monitor_request_templates.sql",
    "130_add_user_affiliates.sql",
    "131_affiliate_rebate_hardening.sql",
    "132_affiliate_custom_settings.sql",
    "133_affiliate_rebate_freeze.sql",
    "134_affiliate_ledger_audit_snapshots.sql",
    "134_image_generation_group_controls.sql",
    "135_allow_email_oauth_provider_types.sql",
    "135_content_moderation.sql",
    "136_add_dingtalk_provider_type.sql",
    "136_remove_ops_retry_replay.sql",
    "136_usage_log_image_size_metadata.sql",
    "137_redeem_code_expires_at.sql",
    "138_channel_monitor_openai_api_mode.sql",
    "140_extend_user_provider_default_grants_check.sql",
    "142_subscription_period_quota.sql",
    "143_drop_subscription_period_quota.sql",
    "143_group_models_list_config.sql",
    "144_add_opus48_to_model_mapping.sql",
    "145_user_platform_quotas.sql",
    "146_add_usage_log_global_discount.sql",
    "147_normalize_balance_recharge_ratio.sql",
    "148_add_redeem_code_admin_balance_dashboard_index.sql",
    "149_image_playground_events.sql",
    "150_payment_events.sql",
    "151_payment_events_selection_metadata.sql",
    "152_payment_audit_logs_created_at_index.sql",
}


def run_git(args: list[str], *, check: bool = True) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=REPO_ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if check and result.returncode != 0:
        raise SystemExit(result.stderr.strip() or f"git {' '.join(args)} failed")
    return result.stdout.strip()


def strip_sql_comments(sql: str) -> str:
    sql = re.sub(r"/\*[\s\S]*?\*/", " ", sql)
    sql = re.sub(r"--[^\n\r]*", " ", sql)
    return sql


def destructive_reasons(path: Path) -> list[str]:
    sql = strip_sql_comments(path.read_text())
    return [name for name, pattern in DESTRUCTIVE_PATTERNS if pattern.search(sql)]


def high_risk_reasons(path: Path) -> list[str]:
    sql = strip_sql_comments(path.read_text())
    reasons = [name for name, pattern in HIGH_RISK_PATTERNS if pattern.search(sql)]
    if NONCONCURRENT_INDEX_RE.search(sql):
        reasons.append("CREATE INDEX WITHOUT CONCURRENTLY")
    if NONCONCURRENT_DROP_INDEX_RE.search(sql):
        reasons.append("DROP INDEX WITHOUT CONCURRENTLY")
    return reasons


def migration_risks(path: Path) -> tuple[list[str], list[str]]:
    return destructive_reasons(path), high_risk_reasons(path)


def migration_plan_path(migration_name: str) -> Path:
    return PLAN_DIR / f"{migration_name}.json"


def has_plan(migration_name: str) -> bool:
    return migration_plan_path(migration_name).exists()


def load_plan(migration_name: str, *, cleanup_required: bool) -> dict:
    path = migration_plan_path(migration_name)
    if not path.exists():
        raise SystemExit(
            f"{migration_name} contains risky SQL but is missing {path.relative_to(REPO_ROOT)}"
        )
    try:
        data = json.loads(path.read_text())
    except json.JSONDecodeError as exc:
        raise SystemExit(f"{path.relative_to(REPO_ROOT)} is not valid JSON: {exc}") from exc

    required = ["migration", "phase", "reason", "risk", "mitigation", "approved_by"]
    missing = [field for field in required if not str(data.get(field, "")).strip()]
    if missing:
        raise SystemExit(f"{path.relative_to(REPO_ROOT)} is missing required fields: {', '.join(missing)}")
    if data["migration"] != migration_name:
        raise SystemExit(
            f"{path.relative_to(REPO_ROOT)} migration must be {migration_name}, got {data['migration']}"
        )
    allowed_phases = {"expand", "compatible", "review", "cleanup"}
    if data["phase"] not in allowed_phases:
        raise SystemExit(
            f"{path.relative_to(REPO_ROOT)} phase must be one of: {', '.join(sorted(allowed_phases))}"
        )
    if cleanup_required and data["phase"] != "cleanup":
        raise SystemExit(f"{path.relative_to(REPO_ROOT)} phase must be cleanup for destructive SQL")
    if (cleanup_required or data["phase"] == "cleanup") and not SHA_RE.fullmatch(str(data.get("safe_after_commit", ""))):
        raise SystemExit(f"{path.relative_to(REPO_ROOT)} safe_after_commit must be a Git commit SHA")
    return data


def changed_files(base: str, head: str) -> list[str]:
    if not base or set(base) == {"0"}:
        base = f"{head}^"
    run_git(["rev-parse", "--verify", f"{base}^{{commit}}"])
    run_git(["rev-parse", "--verify", f"{head}^{{commit}}"])
    output = run_git(["diff", "--name-only", "--diff-filter=ACMR", base, head])
    return [line for line in output.splitlines() if line]


def is_migration_sql(path: str) -> bool:
    p = Path(path)
    return p.parent == Path("backend/migrations") and p.suffix == ".sql"


def check_ci(args: argparse.Namespace) -> None:
    files = changed_files(args.base, args.head)
    changed_migrations = [REPO_ROOT / path for path in files if is_migration_sql(path)]

    risky: list[tuple[Path, list[str], list[str]]] = []
    for path in changed_migrations:
        destructive, high_risk = migration_risks(path)
        if destructive or high_risk:
            risky.append((path, destructive, high_risk))

    if not risky:
        print("No risky migration changes detected.")
        return

    destructive_paths = []
    for path, destructive, high_risk in risky:
        migration_name = path.name
        cleanup_required = bool(destructive)
        load_plan(migration_name, cleanup_required=cleanup_required)
        if destructive:
            destructive_paths.append(path)
        reasons = [*(f"destructive:{reason}" for reason in destructive), *(f"high-risk:{reason}" for reason in high_risk)]
        print(f"Risky migration requires plan: {migration_name} ({', '.join(reasons)})")

    if not destructive_paths:
        return

    allowed_prefixes = ("backend/migrations/",)
    blocked = [
        path for path in files
        if not path.startswith(allowed_prefixes)
    ]
    if blocked:
        raise SystemExit(
            "Destructive migrations must be isolated from code changes. Blocked paths:\n"
            + "\n".join(f"  - {path}" for path in blocked)
        )


def active_commit_from_image(active_image: str) -> str:
    match = IMAGE_SHA_RE.search(active_image.strip())
    if not match:
        raise SystemExit(
            "Cannot verify destructive migration safety because active image does not expose "
            f"a dev/main SHA tag: {active_image or '<empty>'}"
        )
    short_sha = match.group(1)
    return run_git(["rev-parse", "--verify", f"{short_sha}^{{commit}}"])


def pending_migrations(applied_list: Path) -> list[Path]:
    applied = set()
    if applied_list.exists():
        applied = {line.strip() for line in applied_list.read_text().splitlines() if line.strip()}
    return sorted(
        path for path in MIGRATIONS_DIR.glob("*.sql")
        if path.name not in applied
    )


def is_grandfathered_migration(migration_name: str) -> bool:
    return migration_name in GRANDFATHERED_RISK_MIGRATIONS


def check_deploy(args: argparse.Namespace) -> None:
    cleanup_risky: list[tuple[Path, list[str], dict]] = []
    for path in pending_migrations(Path(args.applied_list)):
        destructive, high_risk = migration_risks(path)
        if not destructive and not high_risk:
            continue
        if not has_plan(path.name):
            if is_grandfathered_migration(path.name):
                reasons = [*destructive, *high_risk]
                print(f"Skipping grandfathered risky migration: {path.name} ({', '.join(reasons)})")
                continue
            raise SystemExit(
                f"{path.name} contains risky SQL but has no migration plan. "
                f"Add {migration_plan_path(path.name).relative_to(REPO_ROOT)}."
            )
        plan = load_plan(path.name, cleanup_required=bool(destructive))
        reasons = [*(f"destructive:{reason}" for reason in destructive), *(f"high-risk:{reason}" for reason in high_risk)]
        if plan["phase"] == "cleanup":
            cleanup_risky.append((path, reasons, plan))
        else:
            print(f"Pending risky migration allowed by reviewed plan: {path.name} ({', '.join(reasons)})")

    if not cleanup_risky:
        print("No pending cleanup migrations require active image ancestry checks.")
        return

    active_commit = active_commit_from_image(args.active_image)
    for path, reasons, plan in cleanup_risky:
        safe_commit = run_git(["rev-parse", "--verify", f"{plan['safe_after_commit']}^{{commit}}"])
        ancestor = subprocess.run(
            ["git", "merge-base", "--is-ancestor", safe_commit, active_commit],
            cwd=REPO_ROOT,
        )
        if ancestor.returncode != 0:
            raise SystemExit(
                f"{path.name} is cleanup-risky ({', '.join(reasons)}), but active image {args.active_image} "
                f"is not known to include safe_after_commit {plan['safe_after_commit']}. "
                "Deploy the compatibility release first, then run cleanup in a later release."
            )
        print(f"Pending cleanup migration allowed after active commit check: {path.name}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Block unsafe destructive database migrations.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    ci = subparsers.add_parser("ci", help="Check changed migrations in CI.")
    ci.add_argument("base")
    ci.add_argument("head")
    ci.set_defaults(func=check_ci)

    deploy = subparsers.add_parser("deploy", help="Check pending migrations before deployment.")
    deploy.add_argument("--applied-list", required=True)
    deploy.add_argument("--active-image", required=True)
    deploy.set_defaults(func=check_deploy)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
