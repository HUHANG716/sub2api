#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
script_path="${script_dir}/resolve-main-deploy-plan.sh"
tmp_root="$(mktemp -d)"
trap 'rm -rf "$tmp_root"' EXIT

assert_eq() {
  local expected="$1"
  local actual="$2"
  local message="$3"
  if [ "$expected" != "$actual" ]; then
    echo "FAIL: ${message}. Expected '${expected}', got '${actual}'" >&2
    exit 1
  fi
}

assert_failed() {
  local message="$1"
  shift
  if "$@" >/tmp/resolve-main-deploy-plan-test.out 2>/tmp/resolve-main-deploy-plan-test.err; then
    echo "FAIL: ${message}. Command unexpectedly succeeded." >&2
    exit 1
  fi
}

init_repo() {
  local repo="$1"
  mkdir -p "$repo"
  git -C "$repo" init -q
  git -C "$repo" config user.email test@example.com
  git -C "$repo" config user.name "CI Test"
  mkdir -p "$repo/backend"
  printf 'base\n' > "$repo/backend/app.go"
  git -C "$repo" add .
  git -C "$repo" commit -q -m base
}

commit_file() {
  local repo="$1"
  local path="$2"
  local content="$3"
  mkdir -p "$(dirname "$repo/$path")"
  printf '%s\n' "$content" > "$repo/$path"
  git -C "$repo" add .
  git -C "$repo" commit -q -m "change ${path}"
}

run_plan() {
  local repo="$1"
  shift
  local output="$repo/output.env"
  rm -f "$output"
  (
    cd "$repo"
    env -u GITHUB_REPOSITORY -u GH_TOKEN -u GITHUB_TOKEN GITHUB_OUTPUT="$output" "$@" bash "$script_path" >/dev/null
  )
  cat "$output"
}

get_output() {
  local name="$1"
  local file="$2"
  sed -n "s/^${name}=//p" "$file" | tail -n 1
}

repo_frontend="$tmp_root/frontend"
init_repo "$repo_frontend"
base_sha="$(git -C "$repo_frontend" rev-parse HEAD)"
commit_file "$repo_frontend" frontend/src/App.vue "frontend"
target_sha="$(git -C "$repo_frontend" rev-parse HEAD)"
output_frontend="$repo_frontend/result.env"
run_plan "$repo_frontend" \
  DEPLOY_MODE=auto \
  TARGET_SHA="$target_sha" \
  DEPLOYED_IMAGE="ghcr.io/example/sub2api:main-${base_sha:0:12}" \
  FRONTEND_DIST_RUN_ID=12345 > "$output_frontend"
assert_eq frontend "$(get_output mode "$output_frontend")" "frontend-only changes use frontend deployment"
assert_eq 12345 "$(get_output frontend_dist_run_id "$output_frontend")" "frontend artifact run id is preserved"

repo_third_party="$tmp_root/third-party"
init_repo "$repo_third_party"
base_sha="$(git -C "$repo_third_party" rev-parse HEAD)"
commit_file "$repo_third_party" third_party/gpt_image_playground/src/lib/downloadImages.ts "playground"
target_sha="$(git -C "$repo_third_party" rev-parse HEAD)"
output_third_party="$repo_third_party/result.env"
run_plan "$repo_third_party" \
  DEPLOY_MODE=auto \
  TARGET_SHA="$target_sha" \
  DEPLOYED_IMAGE="ghcr.io/example/sub2api:main-${base_sha:0:12}" \
  FRONTEND_DIST_RUN_ID=12345 > "$output_third_party"
assert_eq frontend "$(get_output mode "$output_third_party")" "image playground changes use frontend deployment"

repo_backend="$tmp_root/backend"
init_repo "$repo_backend"
base_sha="$(git -C "$repo_backend" rev-parse HEAD)"
commit_file "$repo_backend" backend/internal/server/router.go "backend"
target_sha="$(git -C "$repo_backend" rev-parse HEAD)"
output_backend="$repo_backend/result.env"
run_plan "$repo_backend" \
  DEPLOY_MODE=auto \
  TARGET_SHA="$target_sha" \
  DEPLOYED_IMAGE="ghcr.io/example/sub2api:main-${base_sha:0:12}" \
  FRONTEND_DIST_RUN_ID=12345 > "$output_backend"
assert_eq image "$(get_output mode "$output_backend")" "backend changes use image deployment"

repo_mixed="$tmp_root/mixed"
init_repo "$repo_mixed"
base_sha="$(git -C "$repo_mixed" rev-parse HEAD)"
mkdir -p "$repo_mixed/frontend/src" "$repo_mixed/deploy"
printf 'frontend\n' > "$repo_mixed/frontend/src/App.vue"
printf 'deploy\n' > "$repo_mixed/deploy/docker-compose.yml"
git -C "$repo_mixed" add .
git -C "$repo_mixed" commit -q -m mixed
target_sha="$(git -C "$repo_mixed" rev-parse HEAD)"
output_mixed="$repo_mixed/result.env"
run_plan "$repo_mixed" \
  DEPLOY_MODE=auto \
  TARGET_SHA="$target_sha" \
  DEPLOYED_IMAGE="ghcr.io/example/sub2api:main-${base_sha:0:12}" \
  FRONTEND_DIST_RUN_ID=12345 > "$output_mixed"
assert_eq image "$(get_output mode "$output_mixed")" "mixed frontend and deploy changes use image deployment"

repo_docs="$tmp_root/docs"
init_repo "$repo_docs"
base_sha="$(git -C "$repo_docs" rev-parse HEAD)"
commit_file "$repo_docs" README.md "docs"
target_sha="$(git -C "$repo_docs" rev-parse HEAD)"
output_docs="$repo_docs/result.env"
run_plan "$repo_docs" \
  DEPLOY_MODE=auto \
  TARGET_SHA="$target_sha" \
  DEPLOYED_IMAGE="ghcr.io/example/sub2api:main-${base_sha:0:12}" \
  FRONTEND_DIST_RUN_ID=12345 > "$output_docs"
assert_eq noop "$(get_output mode "$output_docs")" "docs-only changes do not deploy runtime services"

repo_frontend_docs="$tmp_root/frontend-docs"
init_repo "$repo_frontend_docs"
base_sha="$(git -C "$repo_frontend_docs" rev-parse HEAD)"
mkdir -p "$repo_frontend_docs/frontend/src"
printf 'frontend\n' > "$repo_frontend_docs/frontend/src/App.vue"
printf 'docs\n' > "$repo_frontend_docs/README.md"
git -C "$repo_frontend_docs" add .
git -C "$repo_frontend_docs" commit -q -m frontend-docs
target_sha="$(git -C "$repo_frontend_docs" rev-parse HEAD)"
output_frontend_docs="$repo_frontend_docs/result.env"
run_plan "$repo_frontend_docs" \
  DEPLOY_MODE=auto \
  TARGET_SHA="$target_sha" \
  DEPLOYED_IMAGE="ghcr.io/example/sub2api:main-${base_sha:0:12}" \
  FRONTEND_DIST_RUN_ID=12345 > "$output_frontend_docs"
assert_eq frontend "$(get_output mode "$output_frontend_docs")" "frontend plus docs changes use frontend deployment"

repo_frontend_marker="$tmp_root/frontend-marker"
init_repo "$repo_frontend_marker"
image_sha="$(git -C "$repo_frontend_marker" rev-parse HEAD)"
commit_file "$repo_frontend_marker" frontend/src/App.vue "frontend"
frontend_sha="$(git -C "$repo_frontend_marker" rev-parse HEAD)"
commit_file "$repo_frontend_marker" README.md "docs"
target_sha="$(git -C "$repo_frontend_marker" rev-parse HEAD)"
output_frontend_marker="$repo_frontend_marker/result.env"
run_plan "$repo_frontend_marker" \
  DEPLOY_MODE=auto \
  TARGET_SHA="$target_sha" \
  DEPLOYED_IMAGE="ghcr.io/example/sub2api:main-${image_sha:0:12}" \
  FRONTEND_DEPLOYED_SHA="$frontend_sha" \
  FRONTEND_DIST_RUN_ID=12345 > "$output_frontend_marker"
assert_eq noop "$(get_output mode "$output_frontend_marker")" "already deployed frontend sha prevents docs-only redeploy"

repo_noop="$tmp_root/noop"
init_repo "$repo_noop"
target_sha="$(git -C "$repo_noop" rev-parse HEAD)"
output_noop="$repo_noop/result.env"
run_plan "$repo_noop" \
  DEPLOY_MODE=auto \
  TARGET_SHA="$target_sha" \
  DEPLOYED_IMAGE="ghcr.io/example/sub2api:main-${target_sha:0:12}" \
  FRONTEND_DIST_RUN_ID=12345 > "$output_noop"
assert_eq noop "$(get_output mode "$output_noop")" "unchanged target uses noop"

repo_force="$tmp_root/force"
init_repo "$repo_force"
target_sha="$(git -C "$repo_force" rev-parse HEAD)"
output_force="$repo_force/result.env"
run_plan "$repo_force" \
  DEPLOY_MODE=full-image \
  TARGET_SHA="$target_sha" \
  DEPLOYED_IMAGE=not-a-main-image > "$output_force"
assert_eq image "$(get_output mode "$output_force")" "full-image force does not need current image parsing"

repo_invalid_frontend_run="$tmp_root/invalid-frontend-run"
init_repo "$repo_invalid_frontend_run"
base_sha="$(git -C "$repo_invalid_frontend_run" rev-parse HEAD)"
commit_file "$repo_invalid_frontend_run" frontend/src/App.vue "frontend"
target_sha="$(git -C "$repo_invalid_frontend_run" rev-parse HEAD)"
assert_failed "frontend run id must be numeric" env \
  DEPLOY_MODE=auto \
  TARGET_SHA="$target_sha" \
  DEPLOYED_IMAGE="ghcr.io/example/sub2api:main-${base_sha:0:12}" \
  FRONTEND_DIST_RUN_ID=abc \
  bash "$script_path"

repo_invalid="$tmp_root/invalid"
init_repo "$repo_invalid"
target_sha="$(git -C "$repo_invalid" rev-parse HEAD)"
assert_failed "auto mode rejects unparseable deployed images" env \
  DEPLOY_MODE=auto \
  TARGET_SHA="$target_sha" \
  DEPLOYED_IMAGE=not-a-main-image \
  bash "$script_path"

echo "resolve-main-deploy-plan tests passed"
