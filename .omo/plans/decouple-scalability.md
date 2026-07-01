# Plan: Decouple & Scale Artha Backend

**Goal**: Fix top coupling and scalability issues identified in architecture audit.

## TODOs

- [x] T1 — Add abstract interfaces for AgentRouter, AgentRuntime, MemoryManager, EventBus
- [x] T2 — Extract ChatService from chat.py god handler
- [x] T3 — Wire ToolExecutor into AgentRuntime with real tool implementations
- [x] T4 — Final Verification Wave

## Acceptance Criteria

Each task is verified by:
- TypeScript/Python type checks pass (ruff)
- No broken imports (app starts without ImportError)
- Existing behavior preserved (manually verified)
- lsp_diagnostics zero on changed files

## Definition of Done

All TODOs checked, verification passes, no regression.

## Final Verification Wave

- [x] F1 — Oracle reviews: architecture compliance
- [x] F2 — Build check: `ruff check .` + Python import integrity
