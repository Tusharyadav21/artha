#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAIL=0

echo "========================================="
echo "  Artha — Pre-push Test Suite"
echo "========================================="

echo ""
echo "── Frontend TypeScript Typecheck ──"
(cd "$ROOT/frontend" && bun run typecheck) || { echo "❌ Typecheck failed"; FAIL=1; }

echo ""
echo "── Frontend Lint ──"
(cd "$ROOT/frontend" && bun run lint) || { echo "❌ Lint failed"; FAIL=1; }

echo ""
echo "── Frontend Unit Tests ──"
(cd "$ROOT/frontend" && bun run test) || { echo "❌ Frontend tests failed"; FAIL=1; }

echo ""
echo "── Backend Unit Tests ──"
(cd "$ROOT/backend" && uv run pytest --cov --cov-report=term-missing -v) || { echo "❌ Backend tests failed"; FAIL=1; }

echo ""
echo "========================================="
if [ "$FAIL" -eq 0 ]; then
    echo "  ✅ All checks passed!"
else
    echo "  ❌ Some checks failed. Fix before pushing."
fi
echo "========================================="
exit "$FAIL"
