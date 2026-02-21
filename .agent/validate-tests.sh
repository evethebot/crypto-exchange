#!/bin/bash
# Scan test files for anti-patterns
set -e
FAIL=0
echo "=== Test Quality Validation ==="

# 1. Ban data-testid marker patterns
MARKERS=$(grep -rn 'data-testid="feature-.*-complete\|data-testid="feature-.*-edge' tests/ 2>/dev/null | wc -l | tr -d ' ')
if [ "$MARKERS" -gt 0 ]; then
  echo "❌ FAIL: Found $MARKERS data-testid marker assertions"
  FAIL=1
else
  echo "✅ No data-testid markers found"
fi

# 2. Every E2E test file must have interactions
for f in tests/e2e/*.spec.ts; do
  [ -f "$f" ] || continue
  INTERACTIONS=$(grep -cE '\.(click|fill|type|press|check|uncheck|selectOption|hover|focus|waitForTimeout)\(' "$f" 2>/dev/null || true)
  INTERACTIONS=$(echo "$INTERACTIONS" | tail -1 | tr -d ' ')
  if [ "$INTERACTIONS" -lt 1 ]; then
    echo "❌ FAIL: $f has NO user interactions"
    FAIL=1
  else
    echo "✅ $f has $INTERACTIONS interactions"
  fi
done

# 3. Must use semantic selectors
for f in tests/e2e/*.spec.ts; do
  [ -f "$f" ] || continue
  SEMANTIC=$(grep -cE 'getByRole|getByText|getByPlaceholder|getByLabel|getByAltText' "$f" 2>/dev/null || true)
  SEMANTIC=$(echo "$SEMANTIC" | tail -1 | tr -d ' ')
  if [ "$SEMANTIC" -lt 1 ]; then
    echo "❌ FAIL: $f uses NO semantic selectors"
    FAIL=1
  else
    echo "✅ $f has $SEMANTIC semantic selectors"
  fi
done

# 4. Check that tests navigate to specific pages (not just /)
for f in tests/e2e/*.spec.ts; do
  [ -f "$f" ] || continue
  SPECIFIC_PAGES=$(grep -cE "goto\('/(trade|markets|admin|wallet|login|register|account)" "$f" 2>/dev/null || true)
  SPECIFIC_PAGES=$(echo "$SPECIFIC_PAGES" | tail -1 | tr -d ' ')
  TOTAL_GOTOS=$(grep -cE "goto\(" "$f" 2>/dev/null || true)
  TOTAL_GOTOS=$(echo "$TOTAL_GOTOS" | tail -1 | tr -d ' ')
  if [ "${TOTAL_GOTOS:-0}" -gt 0 ] && [ "${SPECIFIC_PAGES:-0}" -lt 1 ]; then
    echo "⚠️  WARNING: $f only navigates to / (no specific pages)"
  fi
done

# 5. Count total test cases
TOTAL_TESTS=$(grep -rcE "test\('Feature #" tests/ 2>/dev/null | awk -F: '{sum += $2} END {print sum}')
echo ""
echo "📊 Total Feature tests: $TOTAL_TESTS"

# 6. Count covered features
FEATURES=$(grep -rhoE 'Feature #[0-9]+' tests/ 2>/dev/null | sort -t'#' -k2 -n | uniq | wc -l | tr -d ' ')
echo "📊 Features covered: $FEATURES"

echo ""
if [ "$FAIL" -eq 1 ]; then
  echo "❌ TEST QUALITY VALIDATION FAILED"
  exit 1
else
  echo "✅ Test quality validation passed"
fi
