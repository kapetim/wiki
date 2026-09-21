FROM node:24-alpine AS base

ARG ACTIONLINT_VERSION=1.7.12
ARG HADOLINT_VERSION=2.15.1

RUN apk add --no-cache \
        git=2.54.0-r0 \
        git-lfs=3.7.1-r1 \
        qpdf=12.3.2-r0 \
        poppler-utils=25.12.0-r1 \
        github-cli=2.97.0-r1 \
        rclone=1.74.1-r2 \
        bash=5.3.9-r1 \
        unzip=6.0-r16 \
        zip=3.0-r13 \
        shellcheck=0.11.0-r1 \
    && wget -qO /tmp/actionlint.tar.gz https://github.com/rhysd/actionlint/releases/download/v${ACTIONLINT_VERSION}/actionlint_${ACTIONLINT_VERSION}_linux_amd64.tar.gz \
    && tar -xzf /tmp/actionlint.tar.gz -C /usr/local/bin actionlint \
    && chmod +x /usr/local/bin/actionlint \
    && rm /tmp/actionlint.tar.gz \
    && wget -qO /usr/local/bin/hadolint https://github.com/hadolint/hadolint/releases/download/v${HADOLINT_VERSION}/hadolint-Linux-x86_64 \
    && chmod +x /usr/local/bin/hadolint \
    && git config --global --add safe.directory /repo \
    && git config --system filter.lfs.clean "git-lfs clean -- %f" \
    && git config --system filter.lfs.smudge "git-lfs smudge -- %f" \
    && git config --system filter.lfs.process "git-lfs filter-process" \
    && git config --system filter.lfs.required true \
    && git config --system lfs.repositoryformatversion 0

WORKDIR /opt/wiki/scripts
COPY scripts/package.json scripts/package-lock.json ./
RUN npm ci && npm cache clean --force
COPY scripts .

ENV REPO_DIR=/repo

# The image dispatches npm scripts by name. The workflow calls the remote
# stages only; the local stage is the developer's batched check (local.sh).
ENTRYPOINT ["npm", "--prefix", "/opt/wiki/scripts", "run"]

FROM base AS local
CMD ["local"]

FROM base AS remote-test
CMD ["test"]

FROM base AS remote-release
CMD ["release"]

FROM base AS remote-verify
CMD ["verify"]
