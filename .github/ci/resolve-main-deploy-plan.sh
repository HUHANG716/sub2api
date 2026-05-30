#!/usr/bin/env bash
set -euo pipefail

deploy_mode="${DEPLOY_MODE:-auto}"
target_sha="${TARGET_SHA:-}"
deployed_image="${DEPLOYED_IMAGE:-}"
frontend_deployed_sha="${FRONTEND_DEPLOYED_SHA:-}"
frontend_dist_run_id="${FRONTEND_DIST_RUN_ID:-}"
repository="${GITHUB_REPOSITORY:-}"
output_file="${GITHUB_OUTPUT:-}"

write_output() {
  local name="$1"
  local value="$2"
  if [ -n "$output_file" ]; then
    printf '%s=%s\n' "$name" "$value" >> "$output_file"
  fi
  printf '%s=%s\n' "$name" "$value"
}

fail() {
  echo "::error::$*" >&2
  exit 1
}

is_frontend_path() {
  case "$1" in
    frontend/*|third_party/gpt_image_playground/*|backend/internal/web/dist/*|tools/image-playground/*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

is_image_path() {
  case "$1" in
    backend/*|deploy/*|Dockerfile|Dockerfile.goreleaser|.goreleaser*.yaml|Makefile)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

resolve_frontend_run_id() {
  if [ -n "$frontend_dist_run_id" ]; then
    case "$frontend_dist_run_id" in
      *[!0-9]*)
        fail "FRONTEND_DIST_RUN_ID must be a GitHub Actions run id: ${frontend_dist_run_id}"
        ;;
    esac
    if [ -n "$repository" ] && command -v gh >/dev/null 2>&1; then
      local matching_run_id
      matching_run_id="$(
        gh api "/repos/${repository}/actions/runs/${frontend_dist_run_id}/artifacts" \
          --jq ".artifacts[] | select(.name == \"frontend-dist\" and .workflow_run.head_sha == \"${target_sha}\" and .expired == false) | .workflow_run.id" |
          head -n 1
      )"
      if [ -z "$matching_run_id" ]; then
        fail "frontend_dist_run_id ${frontend_dist_run_id} does not contain an unexpired frontend-dist artifact for ${target_sha}."
      fi
    fi
    printf '%s\n' "$frontend_dist_run_id"
    return
  fi

  if [ -z "$repository" ]; then
    fail "GITHUB_REPOSITORY is required to auto-resolve frontend_dist_run_id."
  fi
  if ! command -v gh >/dev/null 2>&1; then
    fail "gh CLI is required to auto-resolve frontend_dist_run_id."
  fi

  local run_id
  run_id="$(
    gh api "/repos/${repository}/actions/artifacts?name=frontend-dist&per_page=100" \
      --paginate \
      --jq ".artifacts[] | select(.workflow_run.head_sha == \"${target_sha}\" and .expired == false) | .workflow_run.id" |
      head -n 1
  )"
  if [ -z "$run_id" ]; then
    fail "No unexpired frontend-dist artifact found for ${target_sha}. Wait for CI to finish or pass frontend_dist_run_id."
  fi
  printf '%s\n' "$run_id"
}

case "$deploy_mode" in
  auto|frontend-only|full-image)
    ;;
  *)
    fail "Unsupported DEPLOY_MODE: ${deploy_mode}. Expected auto, frontend-only, or full-image."
    ;;
esac

if [ -z "$target_sha" ]; then
  fail "TARGET_SHA is required."
fi
case "$target_sha" in
  *[!0-9a-fA-F]*)
    fail "TARGET_SHA must be a commit SHA: ${target_sha}"
    ;;
esac

if [ "$deploy_mode" = "full-image" ]; then
  write_output mode image
  write_output target_sha "$target_sha"
  exit 0
fi

if [ "$deploy_mode" = "frontend-only" ]; then
  write_output mode frontend
  write_output target_sha "$target_sha"
  write_output frontend_dist_run_id "$(resolve_frontend_run_id)"
  exit 0
fi

if [[ ! "$deployed_image" =~ :main-([0-9a-fA-F]{12,40})$ ]]; then
  fail "Cannot determine the currently deployed main image from: ${deployed_image:-<empty>}. Choose full-image to force a container deploy."
fi

deployed_ref="${BASH_REMATCH[1]}"
base_sha="$(git rev-parse "${deployed_ref}^{commit}" 2>/dev/null || true)"
if [ -z "$base_sha" ]; then
  fail "Cannot resolve deployed image commit ${deployed_ref} in the local checkout."
fi

frontend_base_sha=""
if [ -n "$frontend_deployed_sha" ]; then
  case "$frontend_deployed_sha" in
    *[!0-9a-fA-F]*)
      fail "FRONTEND_DEPLOYED_SHA must be a commit SHA: ${frontend_deployed_sha}"
      ;;
  esac
  frontend_base_sha="$(git rev-parse "${frontend_deployed_sha}^{commit}" 2>/dev/null || true)"
  if [ -z "$frontend_base_sha" ]; then
    fail "Cannot resolve deployed frontend commit ${frontend_deployed_sha} in the local checkout."
  fi
fi

changed_files="$(git diff --name-only "$base_sha" "$target_sha")"
if [ -z "$changed_files" ]; then
  write_output mode noop
  write_output target_sha "$target_sha"
  exit 0
fi

needs_frontend=0
while IFS= read -r path; do
  if is_image_path "$path"; then
    write_output mode image
    write_output target_sha "$target_sha"
    exit 0
  fi
  if is_frontend_path "$path"; then
    needs_frontend=1
  fi
done <<< "$changed_files"

frontend_changed_files=""
if [ "$needs_frontend" -eq 1 ]; then
  frontend_changed_files="$changed_files"
  if [ -n "$frontend_base_sha" ]; then
    frontend_changed_files="$(git diff --name-only "$frontend_base_sha" "$target_sha")"
  fi
fi

needs_frontend_deploy=0
while IFS= read -r path; do
  if [ -n "$path" ] && is_frontend_path "$path"; then
    needs_frontend_deploy=1
    break
  fi
done <<< "$frontend_changed_files"

if [ "$needs_frontend_deploy" -eq 1 ]; then
  write_output mode frontend
  write_output target_sha "$target_sha"
  write_output frontend_dist_run_id "$(resolve_frontend_run_id)"
  exit 0
fi

write_output mode noop
write_output target_sha "$target_sha"
