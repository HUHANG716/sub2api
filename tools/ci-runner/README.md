# Baole Linux runner

Linux CI, security scans, image builds, releases and deployments for
`HUHANG716/sub2api` use the repository runner labelled
`self-hosted`, `Linux`, `X64`, `sub2api-linux`. The macOS shell checks continue to
use `macos-15`. Workflows in other repositories and external fork pull requests
use GitHub-hosted runners.

The public repository requires approval for **all external contributors**.
Before approving a fork workflow, review its workflow changes and keep it on
GitHub-hosted runners. Do not approve a fork that targets this cloud runner.
The runner container is privileged for nested Docker; it is for trusted code.

## Host layout and limits

- Host: Baole, Ubuntu 22.04, x86_64.
- Container and service: `sub2api-ci-linux`.
- State: `/opt/sub2api-ci/storage`, a bounded 12 GiB ext4 loop filesystem.
- Limits: 2 CPUs, 5 GiB RAM, no swap allowance, low CPU shares.
- Go: one concurrent build process, `GOMAXPROCS=2`, `GOMEMLIMIT=2560MiB`.
- Node: 2 GiB maximum V8 heap.
- Scheduling: CPU nice 10 and idle I/O priority, inherited by CI processes.

Runner registration, work, tool caches, home and nested Docker storage are
separate from Todoee and production. The host Docker socket is not mounted and
the CI container publishes no ports. OS image layers can be shared with the
existing Todoee CI image; only the host capacity lock is shared. No credentials or application caches are shared.

The completion hook deletes deployment SSH keys and bounds this runner's
unused build cache. Under disk pressure it removes unused CI images and old Go
build cache entries. It never prunes production Docker images or volumes.
GitHub artifacts remain in use for releases and cross-workflow deployment;
artifact storage limits still apply independently of runner execution.

The two Linux runners acquire a host lock before each job. Jobs run in sequence
so a large Go scan can use its memory limit while the other runner is idle.
The lock is released after cleanup, worker death or container shutdown.

## Installation and operation

Run `tools/ci-runner/install-linux-host.sh` as root on a trusted Linux x64 host
with Docker and systemd. Supply `ACTIONS_RUNNER_INPUT_TOKEN` through a secure
environment or stdin wrapper, using a short-lived **repository registration
token**, not a personal access token. For this host set
`SUB2API_CI_RUNNER_NAME=sub2api-baole-linux`.

The checked-in runner manifest contains the official download URL and SHA-256
checksum. Refresh it from GitHub's runner downloads API before a future install.
The installer verifies the package, registers only this repository, and enables
the service. It refuses to overwrite an existing container and reserves host
disk space before creating the filesystem.

Useful host checks:

```sh
systemctl status sub2api-ci-linux
docker stats --no-stream sub2api-ci-linux todoee-ci-linux
df -h / /opt/sub2api-ci/storage /opt/todoee-ci/storage
journalctl -u sub2api-ci-linux -n 50
```

Restart with `systemctl restart sub2api-ci-linux` after confirming the runner is
idle. Persistent runner state keeps its registration across restarts.

To validate changes, run CI on a feature branch with `force_backend_image=true`;
image publication remains limited to `main` and `dev`. Release supports a
non-publishing dry run on `main` workflow tooling with `dry_run=true` and
`simple_release=true`.

To return to GitHub-hosted execution, replace the Linux `runs-on` expressions
with `ubuntu-latest` on both `main` and `dev`, then stop this runner service.
