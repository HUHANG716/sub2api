#!/usr/bin/env bash
set -euo pipefail

BLUE_PORT="${BLUE_PORT:-8081}"
GREEN_PORT="${GREEN_PORT:-8082}"
LEGACY_PORT="${LEGACY_PORT:-8080}"
APP_INTERNAL_PORT="${APP_INTERNAL_PORT:-8080}"
APP_NAME_PREFIX="${APP_NAME_PREFIX:-sub2api}"
CADDYFILE="${CADDYFILE:-/etc/caddy/Caddyfile}"
CADDY_SITE_HOST="${CADDY_SITE_HOST:-}"
DRAIN_SECONDS="${DRAIN_SECONDS:-60}"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-120}"
PUBLIC_HEALTH_URL="${PUBLIC_HEALTH_URL:-}"
STATE_FILE="${STATE_FILE:-.zero-downtime-active-port}"
PREVIOUS_STATE_FILE="${PREVIOUS_STATE_FILE:-${STATE_FILE}.previous}"
ACTIVE_MARKER="${ACTIVE_MARKER:-sub2api-zero-downtime-active-port}"
LOCK_FILE="${LOCK_FILE:-.zero-downtime-deploy.lock}"
CADDY_RESTART_ON_RELOAD_FAILURE="${CADDY_RESTART_ON_RELOAD_FAILURE:-true}"
TEMP_FILES=""
LOCK_DIR=""

cleanup_temp_files() {
  local file
  if [ -n "$TEMP_FILES" ]; then
    while IFS= read -r file; do
      [ -n "$file" ] || continue
      rm -f "$file"
    done <<EOF
$TEMP_FILES
EOF
  fi
  if [ -n "$LOCK_DIR" ]; then
    rmdir "$LOCK_DIR" 2>/dev/null || true
  fi
}
trap cleanup_temp_files EXIT

usage() {
  cat <<'USAGE' >&2
Usage:
  zero-downtime-deploy.sh deploy IMAGE
  zero-downtime-deploy.sh rollback
  zero-downtime-deploy.sh status
  zero-downtime-deploy.sh active-port
  zero-downtime-deploy.sh active-container

Environment:
  CADDYFILE=/etc/caddy/Caddyfile
  CADDY_SITE_HOST=example.com
  PUBLIC_HEALTH_URL=https://example.com/health
  STATE_FILE=.zero-downtime-active-port
  PREVIOUS_STATE_FILE=.zero-downtime-active-port.previous
  BLUE_PORT=8081
  GREEN_PORT=8082
  DRAIN_SECONDS=60
  LOCK_FILE=.zero-downtime-deploy.lock
  CADDY_RESTART_ON_RELOAD_FAILURE=true
USAGE
}

die() {
  echo "zero-downtime-deploy: $*" >&2
  exit 1
}

slot_name_for_port() {
  case "$1" in
    "$BLUE_PORT") printf '%s-blue\n' "$APP_NAME_PREFIX" ;;
    "$GREEN_PORT") printf '%s-green\n' "$APP_NAME_PREFIX" ;;
    "$LEGACY_PORT") printf '%s\n' "$APP_NAME_PREFIX" ;;
    *) return 1 ;;
  esac
}

slot_label_for_port() {
  case "$1" in
    "$BLUE_PORT") printf 'blue\n' ;;
    "$GREEN_PORT") printf 'green\n' ;;
    "$LEGACY_PORT") printf 'legacy\n' ;;
    *) return 1 ;;
  esac
}

other_blue_green_port() {
  case "$1" in
    "$BLUE_PORT") printf '%s\n' "$GREEN_PORT" ;;
    "$GREEN_PORT"|"$LEGACY_PORT") printf '%s\n' "$BLUE_PORT" ;;
    *) return 1 ;;
  esac
}

read_state_port() {
  [ -f "$STATE_FILE" ] || return 1
  local port
  port="$(tr -d '[:space:]' < "$STATE_FILE")"
  case "$port" in
    "$BLUE_PORT"|"$GREEN_PORT"|"$LEGACY_PORT") printf '%s\n' "$port" ;;
    *) return 1 ;;
  esac
}

write_state_port() {
  local port="$1"
  case "$port" in
    "$BLUE_PORT"|"$GREEN_PORT"|"$LEGACY_PORT") ;;
    *) die "Unsupported state port: $port" ;;
  esac
  local state_dir tmp
  state_dir="$(dirname "$STATE_FILE")"
  mkdir -p "$state_dir"
  tmp="$(mktemp "${STATE_FILE}.tmp.XXXXXX")"
  printf '%s\n' "$port" > "$tmp"
  mv "$tmp" "$STATE_FILE"
}

read_previous_state_port() {
  [ -f "$PREVIOUS_STATE_FILE" ] || return 1
  local port
  port="$(tr -d '[:space:]' < "$PREVIOUS_STATE_FILE")"
  case "$port" in
    "$BLUE_PORT"|"$GREEN_PORT"|"$LEGACY_PORT") printf '%s\n' "$port" ;;
    *) return 1 ;;
  esac
}

write_previous_state_port() {
  local port="$1"
  case "$port" in
    "$BLUE_PORT"|"$GREEN_PORT"|"$LEGACY_PORT") ;;
    *) die "Unsupported previous state port: $port" ;;
  esac
  local state_dir tmp
  state_dir="$(dirname "$PREVIOUS_STATE_FILE")"
  mkdir -p "$state_dir"
  tmp="$(mktemp "${PREVIOUS_STATE_FILE}.tmp.XXXXXX")"
  printf '%s\n' "$port" > "$tmp"
  mv "$tmp" "$PREVIOUS_STATE_FILE"
}

acquire_deploy_lock() {
  local lock_parent
  lock_parent="$(dirname "$LOCK_FILE")"
  mkdir -p "$lock_parent"
  if command -v flock >/dev/null 2>&1; then
    exec 9>"$LOCK_FILE"
    flock -n 9 || die "Another zero-downtime deployment is already running: ${LOCK_FILE}"
    return
  fi

  LOCK_DIR="${LOCK_FILE}.d"
  mkdir "$LOCK_DIR" 2>/dev/null || die "Another zero-downtime deployment is already running: ${LOCK_FILE}"
}

container_id_for_port() {
  local port="$1" name
  name="$(slot_name_for_port "$port" || true)"
  [ -n "${name:-}" ] || return 1
  docker ps -q --filter "name=^/${name}$" | head -n 1
}

container_id_for_port_any_state() {
  local port="$1" name
  name="$(slot_name_for_port "$port" || true)"
  [ -n "${name:-}" ] || return 1
  docker ps -aq --filter "name=^/${name}$" | head -n 1
}

port_is_healthy() {
  curl -fsS "http://127.0.0.1:${1}/health" >/dev/null 2>&1
}

detect_active_port() {
  local detected
  if [ -f "$CADDYFILE" ]; then
    detected="$(python3 - "$CADDYFILE" "$CADDY_SITE_HOST" "$ACTIVE_MARKER" "$BLUE_PORT" "$GREEN_PORT" "$LEGACY_PORT" <<'PY' 2>/dev/null || true
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
site_host = sys.argv[2]
marker = sys.argv[3]
ports = set(sys.argv[4:])
text = path.read_text()

def find_site_block(source: str, host: str):
    if not host:
        return source
    for match in re.finditer(r"(?m)^[ \t]*([^#\n{]*\b" + re.escape(host) + r"\b[^{}\n]*)\{", source):
        open_brace = match.end() - 1
        depth = 0
        for index in range(open_brace, len(source)):
            char = source[index]
            if char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
                if depth == 0:
                    return source[open_brace:index + 1]
    raise SystemExit(1)

text = find_site_block(text, site_host)
marker_match = re.search(r"(?m)^[ \t]*#\s*" + re.escape(marker) + r":\s*(\d+)\s*$", text)
if marker_match and marker_match.group(1) in ports:
    print(marker_match.group(1))
    raise SystemExit(0)

matches = re.findall(r"\breverse_proxy\s+(?:localhost|127\.0\.0\.1):(\d+)\b", text)
for port in reversed(matches):
    if port in ports:
        print(port)
        raise SystemExit(0)
raise SystemExit(1)
PY
)"
    if [ -n "$detected" ]; then
      printf '%s\n' "$detected"
      return
    fi
  fi

  read_state_port && return
  for port in "$BLUE_PORT" "$GREEN_PORT" "$LEGACY_PORT"; do
    if port_is_healthy "$port"; then
      printf '%s\n' "$port"
      return
    fi
  done
  return 1
}

active_container() {
  local active_port name container_id
  active_port="$(detect_active_port 2>/dev/null || true)"
  if [ -n "$active_port" ]; then
    container_id="$(container_id_for_port "$active_port" || true)"
    if [ -n "$container_id" ]; then
      printf '%s\n' "$container_id"
      return 0
    fi
    return 1
  fi

  for name in "${APP_NAME_PREFIX}-blue" "${APP_NAME_PREFIX}-green" "$APP_NAME_PREFIX"; do
    container_id="$(docker ps -q --filter "name=^/${name}$" | head -n 1)"
    if [ -n "$container_id" ]; then
      printf '%s\n' "$container_id"
      return 0
    fi
  done
  return 1
}

source_container() {
  active_container || {
    if docker compose version >/dev/null 2>&1; then
      docker compose ps -q sub2api 2>/dev/null | head -n 1
    else
      docker-compose ps -q sub2api 2>/dev/null | head -n 1
    fi
  }
}

write_container_env_file() {
  local container="$1"
  local env_file="$2"
  docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$container" > "$env_file"
}

docker_run_mount_args() {
  local container="$1"
  python3 - "$container" <<'PY'
import json
import subprocess
import sys

container = sys.argv[1]
raw = subprocess.check_output(["docker", "inspect", container], text=True)
info = json.loads(raw)[0]
args = []
for mount in info.get("Mounts", []):
    mount_type = mount.get("Type")
    source = mount.get("Name") if mount_type == "volume" else mount.get("Source")
    target = mount.get("Destination")
    if not source or not target:
        continue
    spec = f"type={mount_type},source={source},target={target}"
    if mount.get("RW") is False:
        spec += ",readonly"
    args.extend(["--mount", spec])
print("\n".join(args))
PY
}

docker_run_runtime_args() {
  local container="$1"
  python3 - "$container" <<'PY'
import json
import subprocess
import sys

container = sys.argv[1]
raw = subprocess.check_output(["docker", "inspect", container], text=True)
info = json.loads(raw)[0]
host = info.get("HostConfig", {})
config = info.get("Config", {})
args = []

for ulimit in host.get("Ulimits") or []:
    name = ulimit.get("Name")
    soft = ulimit.get("Soft")
    hard = ulimit.get("Hard")
    if name and soft is not None and hard is not None:
        args.extend(["--ulimit", f"{name}={soft}:{hard}"])

log_config = host.get("LogConfig") or {}
log_type = log_config.get("Type")
if log_type and log_type != "json-file":
    args.extend(["--log-driver", log_type])
for key, value in sorted((log_config.get("Config") or {}).items()):
    args.extend(["--log-opt", f"{key}={value}"])

for host_entry in host.get("ExtraHosts") or []:
    args.extend(["--add-host", host_entry])
for dns in host.get("Dns") or []:
    args.extend(["--dns", dns])
for dns_search in host.get("DnsSearch") or []:
    args.extend(["--dns-search", dns_search])
for security_opt in host.get("SecurityOpt") or []:
    args.extend(["--security-opt", security_opt])
for cap in host.get("CapAdd") or []:
    args.extend(["--cap-add", cap])
for group in host.get("GroupAdd") or []:
    args.extend(["--group-add", group])

workdir = config.get("WorkingDir")
if workdir:
    args.extend(["--workdir", workdir])
user = config.get("User")
if user:
    args.extend(["--user", user])

print("\n".join(args))
PY
}

container_network() {
  local container="$1"
  docker inspect -f '{{range $name, $_ := .NetworkSettings.Networks}}{{println $name}}{{end}}' "$container" | head -n 1
}

wait_for_health() {
  local port="$1"
  local deadline=$((SECONDS + HEALTH_TIMEOUT_SECONDS))
  until curl -fsS "http://127.0.0.1:${port}/health" >/dev/null 2>&1; do
    if [ "$SECONDS" -ge "$deadline" ]; then
      return 1
    fi
    sleep 2
  done
}

restore_caddy_backup() {
  local backup="$1"
  sudo cp "$backup" "$CADDYFILE"
  sudo caddy validate --config "$CADDYFILE" >/dev/null || true
  if ! sudo systemctl reload caddy; then
    if [ "$CADDY_RESTART_ON_RELOAD_FAILURE" = "true" ]; then
      sudo systemctl restart caddy || true
    else
      echo "Caddy reload failed while restoring backup; restart disabled." >&2
    fi
  fi
}

reload_caddy() {
  if sudo systemctl reload caddy; then
    return 0
  fi
  if [ "$CADDY_RESTART_ON_RELOAD_FAILURE" = "true" ]; then
    echo "Caddy reload failed; restarting caddy." >&2
    sudo systemctl restart caddy
    return
  fi
  echo "Caddy reload failed; restart disabled by CADDY_RESTART_ON_RELOAD_FAILURE=false." >&2
  return 1
}

switch_caddy_upstream() {
  local from_port="$1"
  local to_port="$2"
  if [ ! -f "$CADDYFILE" ]; then
    echo "Caddyfile not found: $CADDYFILE" >&2
    return 1
  fi

  local backup
  backup="${CADDYFILE}.bak-zero-downtime-$(date +%Y%m%d%H%M%S)"
  sudo cp "$CADDYFILE" "$backup"
  if ! sudo python3 - "$CADDYFILE" "$CADDY_SITE_HOST" "$ACTIVE_MARKER" "$from_port" "$to_port" <<'PY'
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
site_host = sys.argv[2]
marker = sys.argv[3]
from_port = re.escape(sys.argv[4])
to_port = sys.argv[5]
text = path.read_text()
pattern = re.compile(rf"\breverse_proxy\s+(localhost|127\.0\.0\.1):{from_port}\b")

def find_site_block(source: str, host: str):
    if not host:
        return 0, len(source)
    for match in re.finditer(r"(?m)^[ \t]*([^#\n{]*\b" + re.escape(host) + r"\b[^{}\n]*)\{", source):
        open_brace = match.end() - 1
        depth = 0
        for index in range(open_brace, len(source)):
            char = source[index]
            if char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
                if depth == 0:
                    return open_brace, index + 1
    raise SystemExit(f"site block not found for {host}")

start, end = find_site_block(text, site_host)
block = text[start:end]
updated_block, count = pattern.subn(lambda m: f"reverse_proxy 127.0.0.1:{to_port}", block)
if count == 0:
    raise SystemExit(f"no reverse_proxy upstream found for port {sys.argv[4]}")
marker_re = re.compile(r"(?m)^[ \t]*#\s*" + re.escape(marker) + r":\s*\d+\s*$")
marker_line = f"# {marker}: {to_port}"
if marker_re.search(updated_block):
    updated_block = marker_re.sub(marker_line, updated_block, count=1)
else:
    brace = updated_block.find("{")
    if brace == -1:
        raise SystemExit("site block opening brace not found")
    updated_block = updated_block[:brace + 1] + "\n\t" + marker_line + updated_block[brace + 1:]
updated = text[:start] + updated_block + text[end:]
path.write_text(updated)
print(count)
PY
  then
    restore_caddy_backup "$backup"
    echo "Failed to update Caddy upstream; restored ${backup}" >&2
    return 1
  fi

  if sudo caddy validate --config "$CADDYFILE"; then
    if ! reload_caddy; then
      restore_caddy_backup "$backup"
      return 1
    fi
    if ! sudo systemctl is-active --quiet caddy; then
      echo "Caddy is not active after reload/restart." >&2
      restore_caddy_backup "$backup"
      return 1
    fi
  else
    restore_caddy_backup "$backup"
    echo "Caddy validation failed; restored ${backup}" >&2
    return 1
  fi
  write_previous_state_port "$from_port"
  write_state_port "$to_port"
}

verify_public_health() {
  [ -n "$PUBLIC_HEALTH_URL" ] || return 0
  curl -fsS "$PUBLIC_HEALTH_URL" >/dev/null
}

start_container_for_port() {
  local port="$1" container_id
  container_id="$(container_id_for_port "$port" || true)"
  if [ -n "$container_id" ]; then
    return 0
  fi
  container_id="$(container_id_for_port_any_state "$port" || true)"
  [ -n "$container_id" ] || return 1
  docker start "$container_id" >/dev/null
}

stop_container_for_port() {
  local port="$1" container_id
  container_id="$(container_id_for_port "$port" || true)"
  [ -n "$container_id" ] || return 0
  docker stop "$container_id" >/dev/null 2>&1 || true
}

deploy_image() {
  local image="$1"
  [ -n "$image" ] || die "IMAGE is required"
  acquire_deploy_lock

  local active_port target_port target_name old_container source env_file network
  local mount_args=() runtime_args=()
  active_port="$(detect_active_port || printf '%s\n' "$LEGACY_PORT")"
  target_port="$(other_blue_green_port "$active_port")"

  target_name="$(slot_name_for_port "$target_port")"
  old_container="$(container_id_for_port "$active_port" || true)"
  source="$(source_container)"
  [ -n "$source" ] || die "No running source container found to clone runtime settings from."
  network="$(container_network "$source")"
  [ -n "$network" ] || die "No Docker network found for source container ${source}."

  env_file="$(mktemp)"
  TEMP_FILES="${TEMP_FILES}${env_file}
"
  write_container_env_file "$source" "$env_file"
  while IFS= read -r mount_arg; do
    [ -n "$mount_arg" ] || continue
    mount_args+=("$mount_arg")
  done < <(docker_run_mount_args "$source")
  while IFS= read -r runtime_arg; do
    [ -n "$runtime_arg" ] || continue
    runtime_args+=("$runtime_arg")
  done < <(docker_run_runtime_args "$source")

  docker rm -f "$target_name" >/dev/null 2>&1 || true
  docker run -d \
    --name "$target_name" \
    --restart unless-stopped \
    --network "$network" \
    --env-file "$env_file" \
    --label "${APP_NAME_PREFIX}.zero-downtime=true" \
    --label "${APP_NAME_PREFIX}.zero-downtime.slot=$(slot_label_for_port "$target_port")" \
    --label "${APP_NAME_PREFIX}.zero-downtime.port=${target_port}" \
    -p "127.0.0.1:${target_port}:${APP_INTERNAL_PORT}" \
    "${runtime_args[@]}" \
    "${mount_args[@]}" \
    "$image" >/dev/null
  rm -f "$env_file"

  if ! wait_for_health "$target_port"; then
    docker logs --tail 120 "$target_name" >&2 || true
    docker rm -f "$target_name" >/dev/null 2>&1 || true
    die "${target_name} did not become healthy on port ${target_port}"
  fi

  if ! switch_caddy_upstream "$active_port" "$target_port"; then
    docker rm -f "$target_name" >/dev/null 2>&1 || true
    die "Failed to switch Caddy upstream to ${target_port}"
  fi
  curl -fsS "http://127.0.0.1:${target_port}/health" >/dev/null
  if ! verify_public_health; then
    echo "Public health check failed after switching to ${target_port}; rolling back to ${active_port}." >&2
    switch_caddy_upstream "$target_port" "$active_port" || true
    docker rm -f "$target_name" >/dev/null 2>&1 || true
    die "Public health check failed for ${PUBLIC_HEALTH_URL}"
  fi

  if [ -n "$old_container" ]; then
    echo "Draining $(slot_name_for_port "$active_port") for ${DRAIN_SECONDS}s before stop..."
    sleep "$DRAIN_SECONDS"
    docker stop "$old_container" >/dev/null 2>&1 || true
  fi

  echo "Active container: ${target_name}"
  echo "Active port: ${target_port}"
}

rollback_deploy() {
  local active_port rollback_port rollback_name active_container rollback_container
  acquire_deploy_lock
  active_port="$(detect_active_port)" || die "Cannot detect active port"
  rollback_port="$(read_previous_state_port || true)"
  if [ -z "$rollback_port" ] || [ "$rollback_port" = "$active_port" ]; then
    rollback_port="$(other_blue_green_port "$active_port")" || die "Cannot choose rollback port from ${active_port}"
  fi
  rollback_name="$(slot_name_for_port "$rollback_port")"
  rollback_container="$(container_id_for_port_any_state "$rollback_port" || true)"
  [ -n "$rollback_container" ] || die "No rollback container found for ${rollback_name}"

  start_container_for_port "$rollback_port" || die "Failed to start ${rollback_name}"
  if ! wait_for_health "$rollback_port"; then
    docker logs --tail 120 "$rollback_name" >&2 || true
    die "${rollback_name} did not become healthy on port ${rollback_port}"
  fi
  if ! switch_caddy_upstream "$active_port" "$rollback_port"; then
    die "Failed to switch Caddy upstream to rollback port ${rollback_port}"
  fi
  curl -fsS "http://127.0.0.1:${rollback_port}/health" >/dev/null
  if ! verify_public_health; then
    switch_caddy_upstream "$rollback_port" "$active_port" || true
    die "Public health check failed after rollback to ${rollback_port}"
  fi

  active_container="$(container_id_for_port "$active_port" || true)"
  if [ -n "$active_container" ]; then
    echo "Draining $(slot_name_for_port "$active_port") for ${DRAIN_SECONDS}s before stop..."
    sleep "$DRAIN_SECONDS"
    stop_container_for_port "$active_port"
  fi
  echo "Rolled back to container: ${rollback_name}"
  echo "Active port: ${rollback_port}"
}

show_status() {
  local active_port port name container_id state image status health
  active_port="$(detect_active_port 2>/dev/null || true)"
  printf 'Active port: %s\n' "${active_port:-unknown}"
  printf 'State file: %s\n' "$STATE_FILE"
  if [ -f "$STATE_FILE" ]; then
    printf 'State file port: %s\n' "$(tr -d '[:space:]' < "$STATE_FILE")"
  fi
  printf 'Previous state file: %s\n' "$PREVIOUS_STATE_FILE"
  if [ -f "$PREVIOUS_STATE_FILE" ]; then
    printf 'Previous state file port: %s\n' "$(tr -d '[:space:]' < "$PREVIOUS_STATE_FILE")"
  fi
  for port in "$BLUE_PORT" "$GREEN_PORT" "$LEGACY_PORT"; do
    name="$(slot_name_for_port "$port")"
    container_id="$(container_id_for_port_any_state "$port" || true)"
    if [ -z "$container_id" ]; then
      printf '%s port=%s container=missing\n' "$name" "$port"
      continue
    fi
    status="$(docker inspect -f '{{.State.Status}}' "$container_id" 2>/dev/null || printf unknown)"
    image="$(docker inspect -f '{{.Config.Image}}' "$container_id" 2>/dev/null || printf unknown)"
    if port_is_healthy "$port"; then
      health="healthy"
    else
      health="unhealthy"
    fi
    state="inactive"
    [ "$port" = "$active_port" ] && state="active"
    printf '%s port=%s state=%s container=%s status=%s health=%s image=%s\n' \
      "$name" "$port" "$state" "$container_id" "$status" "$health" "$image"
  done
}

case "${1:-}" in
  deploy)
    [ "$#" -eq 2 ] || {
      usage
      exit 2
    }
    deploy_image "$2"
    ;;
  rollback)
    [ "$#" -eq 1 ] || {
      usage
      exit 2
    }
    rollback_deploy
    ;;
  status)
    [ "$#" -eq 1 ] || {
      usage
      exit 2
    }
    show_status
    ;;
  active-port)
    detect_active_port
    ;;
  active-container)
    active_container
    ;;
  *)
    usage
    exit 2
    ;;
esac
