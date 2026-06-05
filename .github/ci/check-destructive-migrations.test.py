#!/usr/bin/env python3
import atexit
import json
import shutil
import subprocess
import tempfile
from pathlib import Path


CHECKER = Path(__file__).with_name("check-destructive-migrations.py")
TEMP_ROOTS: list[Path] = []


def cleanup_temp_roots() -> None:
    for root in TEMP_ROOTS:
        shutil.rmtree(root, ignore_errors=True)


atexit.register(cleanup_temp_roots)


def run(cmd: list[str], cwd: Path, *, expect_success: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        cmd,
        cwd=cwd,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    success = result.returncode == 0
    if success != expect_success:
        print("COMMAND:", " ".join(cmd))
        print("RETURN:", result.returncode)
        print("STDOUT:", result.stdout)
        print("STDERR:", result.stderr)
        raise SystemExit(1)
    return result


def init_repo() -> tuple[Path, str]:
    root = Path(tempfile.mkdtemp(prefix="sub2api-migration-gate-test-"))
    TEMP_ROOTS.append(root)
    (root / ".github/ci").mkdir(parents=True)
    (root / "backend/migrations/destructive").mkdir(parents=True)
    shutil.copy2(CHECKER, root / ".github/ci/check-destructive-migrations.py")
    run(["git", "init", "-q"], root)
    run(["git", "config", "user.email", "codex@example.test"], root)
    run(["git", "config", "user.name", "Codex"], root)
    run(["git", "add", "."], root)
    run(["git", "commit", "-qm", "init"], root)
    base = run(["git", "rev-parse", "HEAD"], root).stdout.strip()
    return root, base


def write_plan(root: Path, migration: str, phase: str = "cleanup") -> None:
    data = {
        "migration": migration,
        "phase": phase,
        "reason": "test risky migration",
        "risk": "test risk",
        "mitigation": "test mitigation",
        "approved_by": "codex-test",
    }
    if phase == "cleanup":
        data["safe_after_commit"] = run(["git", "rev-parse", "HEAD"], root).stdout.strip()
    (root / "backend/migrations/destructive" / f"{migration}.json").write_text(json.dumps(data))


def commit_and_check(root: Path, base: str, message: str, *, expect_success: bool = True) -> subprocess.CompletedProcess[str]:
    run(["git", "add", "."], root)
    run(["git", "commit", "-qm", message], root)
    head = run(["git", "rev-parse", "HEAD"], root).stdout.strip()
    return run(
        ["python3", ".github/ci/check-destructive-migrations.py", "ci", base, head],
        root,
        expect_success=expect_success,
    )


def assert_output(result: subprocess.CompletedProcess[str], expected: str) -> None:
    output = f"{result.stdout}\n{result.stderr}"
    if expected not in output:
        print("Expected output to contain:", expected)
        print("Actual output:", output)
        raise SystemExit(1)


def test_destructive_requires_plan() -> None:
    root, base = init_repo()
    (root / "backend/migrations/200_drop_column.sql").write_text("ALTER TABLE users DROP COLUMN old_name;\n")
    result = commit_and_check(root, base, "drop column", expect_success=False)
    assert_output(result, "missing backend/migrations/destructive/200_drop_column.sql.json")


def test_destructive_with_plan_passes() -> None:
    root, base = init_repo()
    migration = "200_drop_column.sql"
    (root / "backend/migrations" / migration).write_text("ALTER TABLE users DROP COLUMN old_name;\n")
    write_plan(root, migration)
    result = commit_and_check(root, base, "drop column with plan")
    assert_output(result, "destructive:DROP COLUMN")


def test_destructive_must_be_isolated_from_code() -> None:
    root, base = init_repo()
    migration = "200_drop_column.sql"
    (root / "backend/main.go").write_text("package main\n")
    (root / "backend/migrations" / migration).write_text("ALTER TABLE users DROP COLUMN old_name;\n")
    write_plan(root, migration)
    result = commit_and_check(root, base, "drop column with code", expect_success=False)
    assert_output(result, "Destructive migrations must be isolated from code changes")


def test_postgres_alter_column_variants_are_destructive() -> None:
    for migration, sql, reason in [
        ("201_alter_type.sql", "ALTER TABLE users ALTER status TYPE TEXT;\n", "destructive:ALTER COLUMN TYPE"),
        ("202_set_not_null.sql", "ALTER TABLE users ALTER email SET NOT NULL;\n", "destructive:SET NOT NULL"),
    ]:
        root, base = init_repo()
        (root / "backend/migrations" / migration).write_text(sql)
        write_plan(root, migration)
        result = commit_and_check(root, base, migration)
        assert_output(result, reason)


def test_high_risk_requires_plan() -> None:
    for migration, sql, reason in [
        ("203_index.sql", "CREATE INDEX idx_users_email ON users(email);\n", "high-risk:CREATE INDEX WITHOUT CONCURRENTLY"),
        ("204_drop_index.sql", "DROP INDEX idx_users_email;\n", "high-risk:DROP INDEX WITHOUT CONCURRENTLY"),
        ("205_add_primary_key.sql", "ALTER TABLE users ADD PRIMARY KEY (id);\n", "high-risk:ADD TABLE CONSTRAINT"),
    ]:
        root, base = init_repo()
        (root / "backend/migrations" / migration).write_text(sql)
        result = commit_and_check(root, base, migration, expect_success=False)
        assert_output(result, f"missing backend/migrations/destructive/{migration}.json")


def test_high_risk_review_plan_passes() -> None:
    root, base = init_repo()
    migration = "203_index.sql"
    (root / "backend/migrations" / migration).write_text("CREATE INDEX idx_users_email ON users(email);\n")
    write_plan(root, migration, phase="review")
    result = commit_and_check(root, base, "index with review plan")
    assert_output(result, "high-risk:CREATE INDEX WITHOUT CONCURRENTLY")


def test_truncate_is_destructive() -> None:
    root, base = init_repo()
    migration = "206_truncate.sql"
    (root / "backend/migrations" / migration).write_text("TRUNCATE users;\n")
    result = commit_and_check(root, base, "truncate", expect_success=False)
    assert_output(result, f"missing backend/migrations/destructive/{migration}.json")


def test_future_numbered_deploy_risk_is_not_grandfathered() -> None:
    root, _ = init_repo()
    (root / "backend/migrations/1000_future.sql").write_text("CREATE INDEX idx_future ON users(id);\n")
    run(["git", "add", "."], root)
    run(["git", "commit", "-qm", "future risky"], root)
    head = run(["git", "rev-parse", "HEAD"], root).stdout.strip()
    applied = root / "applied.txt"
    applied.write_text("")
    result = run(
        [
            "python3",
            ".github/ci/check-destructive-migrations.py",
            "deploy",
            "--applied-list",
            str(applied),
            "--active-image",
            f"ghcr.io/example/sub2api:dev-{head[:12]}",
        ],
        root,
        expect_success=False,
    )
    assert_output(result, "1000_future.sql contains risky SQL but has no migration plan")


def test_new_low_numbered_deploy_risk_is_not_grandfathered() -> None:
    root, _ = init_repo()
    (root / "backend/migrations/099_new_low_number.sql").write_text("CREATE INDEX idx_low_number ON users(id);\n")
    run(["git", "add", "."], root)
    run(["git", "commit", "-qm", "low numbered risky"], root)
    head = run(["git", "rev-parse", "HEAD"], root).stdout.strip()
    applied = root / "applied.txt"
    applied.write_text("")
    result = run(
        [
            "python3",
            ".github/ci/check-destructive-migrations.py",
            "deploy",
            "--applied-list",
            str(applied),
            "--active-image",
            f"ghcr.io/example/sub2api:dev-{head[:12]}",
        ],
        root,
        expect_success=False,
    )
    assert_output(result, "099_new_low_number.sql contains risky SQL but has no migration plan")


def test_explicit_grandfathered_migration_still_skips() -> None:
    root, _ = init_repo()
    (root / "backend/migrations/152_payment_audit_logs_created_at_index.sql").write_text(
        "CREATE INDEX idx_payment_audit_logs_created_at ON payment_audit_logs(created_at);\n"
    )
    run(["git", "add", "."], root)
    run(["git", "commit", "-qm", "grandfathered risky"], root)
    head = run(["git", "rev-parse", "HEAD"], root).stdout.strip()
    applied = root / "applied.txt"
    applied.write_text("")
    result = run(
        [
            "python3",
            ".github/ci/check-destructive-migrations.py",
            "deploy",
            "--applied-list",
            str(applied),
            "--active-image",
            f"ghcr.io/example/sub2api:dev-{head[:12]}",
        ],
        root,
    )
    assert_output(result, "Skipping grandfathered risky migration: 152_payment_audit_logs_created_at_index.sql")


def main() -> None:
    tests = [
        test_destructive_requires_plan,
        test_destructive_with_plan_passes,
        test_destructive_must_be_isolated_from_code,
        test_postgres_alter_column_variants_are_destructive,
        test_high_risk_requires_plan,
        test_high_risk_review_plan_passes,
        test_truncate_is_destructive,
        test_future_numbered_deploy_risk_is_not_grandfathered,
        test_new_low_numbered_deploy_risk_is_not_grandfathered,
        test_explicit_grandfathered_migration_still_skips,
    ]
    for test in tests:
        test()
        print(f"PASS {test.__name__}")


if __name__ == "__main__":
    main()
