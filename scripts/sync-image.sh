#!/usr/bin/env bash
# Single-version gate: deletes every stored version from GHCR, then pushes the
# freshly built `wiki` image as :latest. Exactly one version ever remains —
# no comparison, no accumulation, nothing to prune later.

set -eu

GHCR_REF="${GHCR_REF:?GHCR_REF is required (e.g. ghcr.io/owner/repo)}"
GH_OWNER="${GH_OWNER:?GH_OWNER is required}"
PKG_NAME="${GHCR_REF##*/}"

echo "[sync] removing all versions of $GHCR_REF"
if versions=$(gh api "/users/$GH_OWNER/packages/container/$PKG_NAME/versions" \
  --paginate \
  --jq '.[].id' 2>/dev/null); then
  for id in $versions; do
    if gh api --method DELETE "/users/$GH_OWNER/packages/container/$PKG_NAME/versions/$id" >/dev/null 2>&1; then
      echo "[sync] deleted version $id"
    else
      echo "[sync] WARN: could not delete version $id"
    fi
  done
else
  echo "[sync] WARN: could not list versions (first push or no access)"
fi

echo "[sync] pushing fresh image as $GHCR_REF:latest"
docker tag wiki "$GHCR_REF:latest"
docker push "$GHCR_REF:latest"

echo "[sync] done — only :latest remains in $GHCR_REF"
