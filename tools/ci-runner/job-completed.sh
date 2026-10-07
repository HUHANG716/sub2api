#!/usr/bin/env bash
set -euo pipefail
[[ -f /.dockerenv && -f /opt/runner/.ci-ready ]] || exit 0
trap '/opt/runner-hooks/ci-capacity.sh release || true' EXIT

# Deployment credentials must not survive a job on a persistent runner.
rm -f /root/.ssh/id_deploy /root/.ssh/id_seoul /root/.ssh/known_hosts
ci_docker=(docker --host=unix:///var/run/docker.sock)
if [[ $("${ci_docker[@]}" info --format '{{.Name}}' 2>/dev/null) != "$(hostname)" ]]; then
  printf 'Skipping cache cleanup: unexpected Docker daemon.\n'
  exit 0
fi
timeout 90 "${ci_docker[@]}" buildx prune --builder sub2api-ci-local --force \
  --max-used-space 1GB --min-free-space 2GB || true
ci_available=$(df --output=avail -B1 /var/lib/docker | tail -1 | tr -d ' ')
if (( ci_available < 2 * 1024 * 1024 * 1024 )); then
  # This daemon contains only this repository's disposable CI images.
  timeout 90 "${ci_docker[@]}" image prune --all --force || true
  if [[ -d /root/.cache/go-build ]]; then
    find /root/.cache/go-build -type f -delete
  fi
fi
if command -v fstrim >/dev/null; then fstrim /var/lib/docker || true; fi
df -h /var/lib/docker
