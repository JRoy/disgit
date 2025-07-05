#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <id> <secret>"
  exit 1
fi

echo "Running test with ID: $1 and Secret: $2"

# Script directory, so it works no matter where you call it from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

HEADERS_FILE="$SCRIPT_DIR/headers.http"
BODY_FILE="$SCRIPT_DIR/body.json"
BASE_URL="http://localhost:8787"

# Basic sanity‑checks
[[ -f "$HEADERS_FILE" ]] || { echo "Missing $HEADERS_FILE"; exit 1; }
[[ -f "$BODY_FILE"    ]] || { echo "Missing $BODY_FILE"; exit 1; }

curl -vv --show-error --fail \
     -X POST \
     -H @"$HEADERS_FILE" \
     --data @"$BODY_FILE" \
     "${BASE_URL}/$1/$2"
