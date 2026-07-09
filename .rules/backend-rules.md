# Cursor Rules — Backend

## 1. Scope & Isolation 🔥

- Backend is the **source of truth** for:
  - Data
  - Validation
  - Permissions
- Do **not** reference or reason about:
  - Admin Panel behavior
  - Frontend UI behavior
- Do **not** assume frontend state management or rendering logic

## 2. Module Boundaries 🔥

- Modules under `src/modules/**` are **isolated**
- Do **not** import services across modules directly
- Shared logic belongs in:
  - `core/**`
  - `utils/**`
- No cross-module coupling without **explicit abstraction**

## 3. Layered Architecture 🟢

- **Controllers**:
  - Request → Service → Response only
- **Services**:
  - Business logic only
- **Models**:
  - Persistence only
- When modifying code:
  - Show **only affected layers**
  - Do **not** dump full module files

## 4. API Contracts 🔥

- Public API is defined by `*.routes.ts`
- Do **not** infer frontend requirements
- Explicitly call out:
  - Breaking changes
  - UI-impacting contract changes

## 5. Validation & Security 🟢

- All validation via **schemas**
- Auth and permissions enforced via **middleware**
- Never inline validation logic in controllers
- Never expose:
  - Secrets
  - Environment variables

## 6. Data & Performance 🟢

- Pagination must be **explicit**
- Avoid unbounded queries
- Prefer existing helpers:
  - `queryBuilder`
  - Pagination helpers
  - Performance utilities
- Do **not** introduce premature optimization

## 7. Scripts, Jobs & Migrations 🔥

- Scripts are assumed **destructive** unless stated otherwise
- Always explain **side effects** before generating scripts
- Jobs must be **idempotent**
- Do **not** assume UI workflows in background jobs

## 8. Files & Output 🔥

- Ask before generating large code blocks. File creation is allowed after explicit user approval.
- Prefer **minimal diffs**
- Avoid full-file dumps
- Explain plan before **multi-file changes**

## 9. Tests & Docs 🟢

- Unit tests: `tests/unit/`
- Integration tests: `tests/integration/`
- Do **not** generate documentation unless explicitly requested
- Prefer concise **inline explanations**

## 10. Forbidden Actions 🔥

- Do **not** mirror frontend filtering or pagination logic
- Do **not** add fields for hypothetical future UI needs
- Do **not** refactor unrelated modules
- Do **not** rewrite schemas for style or formatting only

## 11 Token Usage 

- **Every response must include a token usage estimate**
- Always add a section titled: `## Token Usage`
- Place it **at the end of the response**

### Format
```md
## Token Usage
- Input (est.): <number>
- Output (est.): <number>
- Total (est.): <number>

