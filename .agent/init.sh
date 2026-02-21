#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "=== Installing dependencies ==="
pnpm install

echo "=== Starting dev server ==="
pnpm dev --port 3000 &
DEV_PID=$!

echo "=== Waiting for server (port 3000) ==="
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000/ > /dev/null 2>&1; then
    echo "✅ Server ready on port 3000"
    exit 0
  fi
  sleep 2
done

echo "❌ Server failed to start"
kill $DEV_PID 2>/dev/null
exit 1
