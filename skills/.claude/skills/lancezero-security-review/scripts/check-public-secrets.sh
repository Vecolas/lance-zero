#!/usr/bin/env bash
set -euo pipefail

echo "Checking for suspicious public environment variable names..."

PATTERN='NEXT_PUBLIC_.*(SECRET|SERVICE|PRIVATE|DATABASE|TOKEN|PASSWORD|WEBHOOK)'

if command -v rg >/dev/null 2>&1; then
  if rg -n --hidden --glob '!node_modules/**' --glob '!.git/**' "$PATTERN" .; then
    echo
    echo "Potentially dangerous NEXT_PUBLIC_ secret-like variables found."
    exit 1
  fi
else
  if grep -RInE --exclude-dir=node_modules --exclude-dir=.git "$PATTERN" .; then
    echo
    echo "Potentially dangerous NEXT_PUBLIC_ secret-like variables found."
    exit 1
  fi
fi

echo "No obvious public secret-like variable names found."
