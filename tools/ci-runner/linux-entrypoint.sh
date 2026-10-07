#!/usr/bin/env bash
set -euo pipefail

# Prefer ending a CI process over production if the host runs out of memory.
printf '500\n' > /proc/self/oom_score_adj

mkdir -p /opt/runner/_work /opt/runner/_tool
dockerd --host=unix:///var/run/docker.sock \
  --bip=172.28.0.1/24 --default-address-pool=base=172.29.0.0/16,size=24 \
  >/var/log/sub2api-ci-docker.log 2>&1 &
daemon_pid=$!
runner_pid=''
cleanup() {
  if [[ -n "$runner_pid" ]]; then
    kill -TERM "$runner_pid" 2>/dev/null || true
    wait "$runner_pid" || true
  fi
  kill -TERM "$daemon_pid" 2>/dev/null || true
  wait || true
}
trap cleanup EXIT
trap 'exit 0' TERM INT
for attempt in {1..60}; do
  if docker info >/dev/null 2>&1; then break; fi
  if ! kill -0 "$daemon_pid" 2>/dev/null; then cat /var/log/sub2api-ci-docker.log; exit 1; fi
  sleep 1
done
docker info >/dev/null

# Keep the default builder state across service restarts. Workflow-created builders
# are separate and cleaned up by docker/setup-buildx-action.
if ! docker buildx inspect "$BUILDX_BUILDER" >/dev/null 2>&1; then
  docker buildx create --name "$BUILDX_BUILDER" --driver docker-container \
    --driver-opt default-load=true --buildkitd-config /opt/runner/buildkitd.toml
fi
docker buildx inspect "$BUILDX_BUILDER" --bootstrap
while [[ ! -f .runner || ! -f .ci-ready ]]; do sleep 2; done
./bin/runsvc.sh &
runner_pid=$!
wait "$runner_pid"
