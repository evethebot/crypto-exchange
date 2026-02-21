#!/bin/bash
# Master test runner script for crypto-exchange
set -e

cd "$(dirname "$0")/.."

echo "============================================="
echo "  Crypto Exchange — Test Runner"
echo "============================================="

# Step 1: Validate test quality
echo ""
echo "📋 Step 1: Validating test quality..."
bash .agent/validate-tests.sh

# Step 2: TypeScript compilation check
echo ""
echo "📋 Step 2: TypeScript check..."
npx tsc --noEmit --skipLibCheck 2>/dev/null && echo "✅ TypeScript OK" || echo "⚠️ TypeScript errors (expected in TDD)"

# Step 3: Run Playwright tests (will fail until implementation)
echo ""
echo "📋 Step 3: Running Playwright tests..."
echo "⚠️  Tests are expected to FAIL in TDD mode (no implementation yet)"

if [ "$1" = "--run" ]; then
  npx playwright test --reporter=list 2>&1 || true
  echo ""
  echo "📊 Test execution complete (failures expected in TDD)"
else
  echo "ℹ️  Skipping test execution (pass --run to execute)"
  echo "ℹ️  Usage: bash .agent/test.sh --run"
fi

echo ""
echo "============================================="
echo "  Done"
echo "============================================="
