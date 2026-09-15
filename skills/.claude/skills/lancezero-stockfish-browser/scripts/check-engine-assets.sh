#!/usr/bin/env bash
set -euo pipefail

DIR="${1:-public/engine/stockfish}"

echo "Checking LanceZero Stockfish distribution at: $DIR"

test -d "$DIR" || { echo "Missing directory: $DIR"; exit 1; }

found_wasm=0
found_js=0

find "$DIR" -maxdepth 1 -type f -name '*.wasm' | grep -q . && found_wasm=1 || true
find "$DIR" -maxdepth 1 -type f -name '*.js' | grep -q . && found_js=1 || true

test "$found_wasm" -eq 1 || { echo "Missing .wasm engine asset"; exit 1; }
test "$found_js" -eq 1 || { echo "Missing .js engine loader/worker asset"; exit 1; }

test -f "$DIR/COPYING.txt" || { echo "Missing COPYING.txt"; exit 1; }
test -f "$DIR/SOURCE.txt" || { echo "Missing SOURCE.txt"; exit 1; }

echo "Stockfish asset boundary looks complete."
