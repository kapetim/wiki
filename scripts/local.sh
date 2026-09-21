#!/usr/bin/env bash
# Local check — every linter + unit tests, batched in one docker run (all tools
# guaranteed). Integration tests are the "real tests" CI runs via the remote
# stages (`docker run private test`).
set -euo pipefail

cd "$(dirname "$0")/.."

if ! docker image inspect private:local >/dev/null 2>&1; then
  docker build -t private:local --target local -f Dockerfile .
fi

exec docker run --rm -v "$PWD":/repo private:local
