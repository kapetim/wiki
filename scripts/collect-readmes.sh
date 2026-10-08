#!/usr/bin/env bash
# collect-readmes.sh — mirror the microSD readme tree into the wiki.
#
# Walks --from (the card), prunes hidden dirs (including .Trash*), and copies
# every README (readme, README.md, readme.md, ...) to --to, preserving the
# from-relative structure. Existing files are not modified unless --force is
# given, so an already-synced page stays as it was.
set -euo pipefail

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
repo_dir=$(cd -- "$script_dir/.." && pwd)

from=${MICROSD:-}
if [ -z "$from" ]; then
  from=/run/media/${USER:-$(id -un)}/microsd
fi
to="$repo_dir/src/tools/devices/microsd"
force=0
dry=0

usage() {
  cat >&2 <<'EOF'
usage: collect-readmes.sh [--from ROOT] [--to DIR] [--force] [--dry-run]

  --from ROOT   media root to read from   (default: $MICROSD, else /run/media/$USER/microsd)
  --to DIR      destination directory     (default: <repo>/src/tools/devices/microsd)
  --force       overwrite existing files  (default: skip them)
  --dry-run     print what would happen, copy nothing
EOF
  exit 2
}

while [ $# -gt 0 ]; do
  case $1 in
    --from) [ $# -ge 2 ] || usage; from=$2; shift 2 ;;
    --from=*) from=${1#--from=}; shift ;;
    --to) [ $# -ge 2 ] || usage; to=$2; shift 2 ;;
    --to=*) to=${1#--to=}; shift ;;
    --force) force=1; shift ;;
    --dry-run) dry=1; shift ;;
    -h | --help) usage ;;
    *)
      echo "unknown argument: $1" >&2
      usage
      ;;
  esac
done

from=$(realpath -m -- "$from")
to=$(realpath -m -- "$to")

[ -d "$from" ] || {
  echo "from not found: $from" >&2
  exit 1
}
[ "$from" = "$to" ] && {
  echo "to must differ from from: $to" >&2
  exit 1
}
case $to/ in "$from"/*)
  echo "to must be outside from: $to" >&2
  exit 1
  ;;
esac

printf 'from: %s\n' "$from"
printf 'to:   %s\n' "$to"

[ "$dry" -eq 1 ] || mkdir -p -- "$to"

found=0
while IFS= read -r -d '' file; do
  found=1
  rel=${file#"$from"/}
  out=$to/$rel
  if [ -e "$out" ] && [ "$force" -eq 0 ]; then
    printf 'skipped %s\n' "$rel"
    continue
  fi
  if [ "$dry" -eq 1 ]; then
    printf 'would copy %s\n' "$rel"
    continue
  fi
  mkdir -p -- "$(dirname -- "$out")"
  cp -f -- "$file" "$out"
  printf 'copied %s\n' "$rel"
done < <(
  find "$from" \
    -type d -name '.*' -prune -o \
    -type f \( -iname 'readme' -o -iname 'readme.*' \) -print0 |
    LC_ALL=C sort -z
)

[ "$found" -eq 1 ] || echo "no READMEs found under $from" >&2
