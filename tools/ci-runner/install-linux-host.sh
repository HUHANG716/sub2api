#!/usr/bin/env bash
set -euo pipefail
umask 077

# Run on a trusted x64 Linux host. Registration uses a short-lived token only.
# The runner has its own Docker daemon, filesystem and resource limits.
ci_root=/opt/sub2api-ci
ci_storage="$ci_root/storage"
ci_container=sub2api-ci-linux
ci_image=sub2api-ci-linux:local
ci_source=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
ci_memory=${SUB2API_CI_MEMORY:-5g}
ci_cpus=${SUB2API_CI_CPUS:-2}
ci_disk_gib=${SUB2API_CI_DISK_GIB:-8}
ci_name=${SUB2API_CI_RUNNER_NAME:-sub2api-$(hostname -s)-linux}
ci_labels=${SUB2API_CI_RUNNER_LABELS:-sub2api-linux}
ci_repository=${SUB2API_CI_REPOSITORY:-HUHANG716/sub2api}

[[ $(id -u) == 0 && $(uname -m) == x86_64 ]]
[[ "$ci_repository" =~ ^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$ ]]
[[ "$ci_name" =~ ^[a-zA-Z0-9_-]+$ && "$ci_labels" =~ ^[a-zA-Z0-9_,-]+$ ]]
[[ "$ci_memory" =~ ^[1-9][0-9]*[gm]$ && "$ci_cpus" =~ ^[1-9][0-9]*([.][0-9]+)?$ ]]
[[ "$ci_disk_gib" =~ ^[0-9]+$ ]] && (( ci_disk_gib >= 8 && ci_disk_gib <= 64 ))
for ci_command in docker curl python3 sha256sum fallocate mkfs.ext4 mountpoint systemctl; do
  command -v "$ci_command" >/dev/null
done
docker info >/dev/null
if docker container inspect "$ci_container" >/dev/null 2>&1; then
  printf 'Runner container already exists; inspect it before reinstalling.\n' >&2
  exit 1
fi
[[ -n ${ACTIONS_RUNNER_INPUT_TOKEN:-} ]]
[[ -f "$ci_source/runner-manifest.json" ]]

install -d -m 700 "$ci_root" "$ci_storage" /opt/ci-job-coordinator
if [[ ! -e "$ci_root/storage.img" ]]; then
  ci_available=$(df --output=avail -B1 "$ci_root" | tail -1 | tr -d ' ')
  # Reserve space for production and the CI image outside the bounded filesystem.
  (( ci_available >= (ci_disk_gib + 6) * 1024 * 1024 * 1024 ))
  fallocate -l "${ci_disk_gib}G" "$ci_root/storage.img"
  mkfs.ext4 -q -F "$ci_root/storage.img"
fi
if ! mountpoint -q "$ci_storage"; then
  mount -o loop,nosuid,nodev "$ci_root/storage.img" "$ci_storage"
fi
if ! awk '$1 == "/opt/sub2api-ci/storage.img" { found=1 } END { exit !found }' /etc/fstab; then
  printf '/opt/sub2api-ci/storage.img /opt/sub2api-ci/storage ext4 loop,nosuid,nodev 0 0\n' >> /etc/fstab
fi
for ci_dir in runner work tools cache docker hooks; do
  install -d -m 700 "$ci_storage/$ci_dir"
done

mapfile -t ci_package < <(python3 - "$ci_source/runner-manifest.json" <<'PY'
import json,re,sys
from urllib.parse import urlparse
item=json.load(open(sys.argv[1]))
url=item['download_url']
digest=item['sha256_checksum']
if not re.fullmatch(r'[a-f0-9]{64}',digest):
    raise SystemExit('Invalid runner checksum')
if not re.fullmatch(r'/actions/runner/releases/download/v[0-9.]+/actions-runner-linux-x64-[0-9.]+\.tar\.gz',urlparse(url).path) or urlparse(url).scheme!='https' or urlparse(url).netloc!='github.com':
    raise SystemExit('Unexpected runner download source')
print(url)
print(digest)
PY
)
[[ ${#ci_package[@]} == 2 ]]
ci_archive="$ci_root/runner-download.tar.gz"
curl --fail --location --silent --show-error --retry 3 --connect-timeout 20 \
  --max-time 600 --output "$ci_archive" "${ci_package[0]}"
printf '%s  %s\n' "${ci_package[1]}" "$ci_archive" | sha256sum --check -
tar -xzf "$ci_archive" -C "$ci_storage/runner"
rm "$ci_archive"

cat > "$ci_root/buildkitd.toml" <<'BUILD_CONFIG'
[worker.oci]
  gc = true
  reservedSpace = "256MB"
  maxUsedSpace = "1GB"
  minFreeSpace = "1GB"
BUILD_CONFIG
ci_build_args=()
if docker image inspect sub2api-ci-base:local >/dev/null 2>&1; then
  ci_build_args+=(--build-arg CI_BASE_IMAGE=sub2api-ci-base:local)
elif docker image inspect todoee-ci-linux:local >/dev/null 2>&1; then
  ci_build_args+=(--build-arg CI_BASE_IMAGE=todoee-ci-linux:local)
fi
docker build "${ci_build_args[@]}" -t "$ci_image" "$ci_source"
cp "$ci_root/buildkitd.toml" "$ci_storage/runner/buildkitd.toml"

docker run --detach --name "$ci_container" --platform linux/amd64 \
  --privileged --init --restart no \
  --memory "$ci_memory" --memory-swap "$ci_memory" --oom-score-adj 500 --cpus "$ci_cpus" --cpu-shares 128 \
  --mount "type=bind,source=$ci_storage/runner,target=/opt/runner" \
  --mount "type=bind,source=$ci_storage/work,target=/opt/runner/_work" \
  --mount "type=bind,source=$ci_storage/tools,target=/opt/runner/_tool" \
  --mount "type=bind,source=$ci_storage/cache,target=/root" \
  --mount "type=bind,source=$ci_storage/docker,target=/var/lib/docker" \
  --mount "type=bind,source=$ci_storage/hooks,target=/opt/runner-hooks,readonly" \
  --mount "type=bind,source=/opt/ci-job-coordinator,target=/ci-job-coordinator" \
  --env RUNNER_TOOL_CACHE=/opt/runner/_tool \
  --env GIT_CONFIG_GLOBAL=/root/ci-gitconfig \
  "$ci_image"
printf '%s\n' "$ACTIONS_RUNNER_INPUT_TOKEN" | docker exec -i "$ci_container" bash -c \
  'IFS= read -r ACTIONS_RUNNER_INPUT_TOKEN; export ACTIONS_RUNNER_INPUT_TOKEN; exec ./config.sh "$@"' \
  -- --unattended --url "https://github.com/$ci_repository" --name "$ci_name" \
  --labels "$ci_labels" --work _work
unset ACTIONS_RUNNER_INPUT_TOKEN

for ci_hook in ci-capacity.sh job-started.sh job-completed.sh; do
  install -m 700 "$ci_source/$ci_hook" "$ci_storage/hooks/$ci_hook"
done
cat >> "$ci_storage/runner/.env" <<'RUNNER_ENV'
GOMAXPROCS=2
GOMEMLIMIT=2560MiB
GOFLAGS=-p=1
NODE_OPTIONS=--max-old-space-size=2048
NODE_USE_ENV_PROXY=0
NO_PROXY=localhost,127.0.0.1,::1
no_proxy=localhost,127.0.0.1,::1
ACTIONS_RUNNER_HOOK_JOB_STARTED=/opt/runner-hooks/job-started.sh
ACTIONS_RUNNER_HOOK_JOB_COMPLETED=/opt/runner-hooks/job-completed.sh
RUNNER_ENV
docker exec "$ci_container" git config --global http.lowSpeedLimit 1024
docker exec "$ci_container" git config --global http.lowSpeedTime 60
docker stop --time 30 "$ci_container"

cat > /etc/systemd/system/sub2api-ci-linux.service <<'SERVICE'
[Unit]
Description=Sub2API GitHub Actions Linux runner
After=network-online.target docker.service
Requires=docker.service
RequiresMountsFor=/opt/sub2api-ci/storage

[Service]
Type=simple
ExecStart=/usr/bin/docker start --attach sub2api-ci-linux
ExecStop=/usr/bin/docker stop --time 30 sub2api-ci-linux
Restart=always
RestartSec=15
TimeoutStopSec=60

[Install]
WantedBy=multi-user.target
SERVICE
touch "$ci_storage/runner/.ci-ready"
systemctl daemon-reload
systemctl enable --now sub2api-ci-linux.service
docker inspect --format 'memory={{.HostConfig.Memory}} cpu-quota={{.HostConfig.NanoCpus}} published-ports={{json .HostConfig.PortBindings}}' "$ci_container"
df -h / "$ci_storage"
printf 'Sub2API Linux runner installed with labels %s\n' "$ci_labels"
