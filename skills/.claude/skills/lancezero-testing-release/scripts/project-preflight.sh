#!/usr/bin/env bash
set -euo pipefail

echo "== LanceZero preflight =="

if [ ! -f package.json ]; then
  echo "package.json not found"
  exit 1
fi

if command -v pnpm >/dev/null 2>&1; then
  PM=pnpm
elif command -v npm >/dev/null 2>&1; then
  PM=npm
else
  echo "No pnpm/npm found"
  exit 1
fi

run_if_script() {
  local name="$1"
  if node -e "const p=require('./package.json'); process.exit(p.scripts&&p.scripts['$name']?0:1)" 2>/dev/null; then
    echo "Running $name..."
    "$PM" run "$name"
  else
    echo "Skipping missing script: $name"
  fi
}

run_if_script lint
run_if_script typecheck
run_if_script test
run_if_script build

echo "Preflight completed."
