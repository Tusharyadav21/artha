# Shared AI Agent Rules

These rules apply to all AI coding agents (Claude, ChatGPT/Codex, Gemini, Antigravity) working in this repository.

## 1. Do Not Hallucinate Code

- Only use dependencies that are explicitly installed in `package.json`.
- Do not invent APIs or endpoints. Verify against existing implementation.

## 2. Maintain Context Discipline

- Do not read unrelated files unless necessary for the task.
- When generating code, output only the required changes. Avoid rewriting unchanged sections.
- Keep explanations concise. Favor writing code over explaining it unless the user asks for an explanation.

## 3. Strict Engineering Standards

- **Zero TypeScript Errors**: Do not use `any` or `// @ts-ignore` without a very strong justification and explicit comment.
- **No Console Logs**: Never commit `console.log` in production paths. Remove debugging statements before finalizing the code.
- **No Magic Numbers**: Extract constants to variables with descriptive names.
- **DRY Principle**: If code is duplicated, extract it.

## 4. AI-Friendly Coding Conventions

- Prefer small, modular functions.
- Write JSDoc comments for complex logic so future AI context is improved.
- Name variables explicitly (e.g., `vehicleList` instead of `vl`).

## 5. Security First

- Never expose environment variables or raw database errors to the client.
- Always use the Zod schemas for validation before trusting input.
