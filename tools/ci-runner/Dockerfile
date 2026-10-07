ARG CI_BASE_IMAGE=public.ecr.aws/ubuntu/ubuntu:24.04
FROM ${CI_BASE_IMAGE}

ENV DEBIAN_FRONTEND=noninteractive RUNNER_ALLOW_RUNASROOT=1 \
    BUILDX_BUILDER=sub2api-ci-local

# A pre-existing CI image can share OS layers, but never runner credentials or caches.
RUN if ! command -v docker >/dev/null || ! command -v gh >/dev/null; then \
      apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates curl gnupg git jq sudo unzip zip xz-utils python3 python3-venv \
        build-essential pkg-config openssh-client rsync iptables iproute2 \
        libicu74 libssl3t64 libkrb5-3 zlib1g libunwind8 gh \
      && install -m 0755 -d /etc/apt/keyrings \
      && curl --retry 3 -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc \
      && echo 'deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu noble stable' > /etc/apt/sources.list.d/docker.list \
      && apt-get update && apt-get install -y --no-install-recommends \
         docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin \
      && rm -rf /var/lib/apt/lists/*; \
    fi

# Match the Python command provided by GitHub's Ubuntu runner image.
RUN ln -sf /usr/bin/python3 /usr/local/bin/python

COPY linux-entrypoint.sh /usr/local/bin/sub2api-ci-start
RUN chmod +x /usr/local/bin/sub2api-ci-start
WORKDIR /opt/runner
ENTRYPOINT ["/usr/local/bin/sub2api-ci-start"]
