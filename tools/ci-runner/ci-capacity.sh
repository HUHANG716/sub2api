#!/usr/bin/env bash
set -euo pipefail

# Both repositories use one host lock; their code, credentials and caches stay private.
ci_worker=$PPID
while (( ci_worker > 1 )); do
  IFS= read -r ci_comm < "/proc/$ci_worker/comm" || break
  [[ "$ci_comm" == Runner.Worker ]] && break
  ci_worker=$(awk '/^PPid:/ { print $2 }' "/proc/$ci_worker/status")
done
if [[ ${ci_comm:-} != Runner.Worker ]]; then
  [[ ${1:-} == release ]] && exit 0
  printf 'Could not identify the GitHub job worker.\n' >&2
  exit 1
fi
ci_state=/root/.ci-capacity
ci_ready="$ci_state/$ci_worker.ready"
if [[ ${1:-} == release ]]; then
  rm -f "$ci_ready"
  exit 0
fi
[[ ${1:-} == acquire && -d /ci-job-coordinator ]]
mkdir -p "$ci_state"
rm -f "$ci_ready"
printf 'Waiting for Linux CI capacity on this host.\n'
# Detach the lock holder from job process cleanup and close its output pipes.
# Worker death or container shutdown releases the flock even after a cancelled job.
env -u RUNNER_TRACKING_ID nohup bash -c '
  exec 9>/ci-job-coordinator/global.lock
  flock --exclusive 9
  kill -0 "$2" 2>/dev/null || exit 0
  touch "$1"
  trap '\''rm -f "$1"'\'' EXIT
  while [[ -f "$1" ]] && kill -0 "$2" 2>/dev/null; do sleep 1; done
' -- "$ci_ready" "$ci_worker" </dev/null >"$ci_state/$ci_worker.log" 2>&1 &
ci_holder=$!
ci_deadline=$((SECONDS + 21600))
while [[ ! -f "$ci_ready" ]]; do
  if ! kill -0 "$ci_holder" 2>/dev/null; then
    printf 'The CI capacity lock could not be acquired.\n' >&2
    exit 1
  fi
  if (( SECONDS >= ci_deadline )); then
    kill "$ci_holder" 2>/dev/null || true
    printf 'Timed out waiting for CI capacity.\n' >&2
    exit 1
  fi
  sleep 1
done
printf 'Linux CI capacity acquired.\n'
