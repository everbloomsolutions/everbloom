# Cursor Rules — Admin Panel

## 1. Scope & Isolation 🔥

- Admin Panel is **UI-only**
- Treat Backend as a **black-box HTTP API**
- Do **not** reference or reason about:
  - Backend internals
  - Database schema
  - Services, jobs, permissions
- Do **not** infer backend behavior beyond documented APIs

## 2. API Usage 🔥

- **Source of truth**: `src/api/**`
- Use **only existing API modules** (`*Api.js`)
- Do **not** guess:
  - Endpoints
  - Payloads
  - Response shapes
- If API behavior is unclear, **explicitly request backend contract**

## 3. Components & Pages 🟢

- **Pages** (`src/pages/**`):
  - Orchestrate data and layout
- **Components** (`src/components/**`):
  - Reusable
  - Presentational
- Do **not** reprint full components unless explicitly requested
- Prefer **minimal diffs** and **partial snippets** (`...`)

## 4. State & Data Flow 🟢

- Data fetching lives in **hooks** (`src/hooks/**`)
- Components **consume hooks only**
- **Context** is limited to cross-cutting UI state:
  - Auth
  - Theme
  - UI state
- Avoid duplicating:
  - Fetching logic
  - Transformation logic

## 5. Styling & UI 🟡

- Tailwind-first styling
- Avoid inline styles unless trivial
- Reuse shared UI components (`src/components/shared/**`)
- Do **not** introduce new UI patterns unless requested

## 6. Files & Output 🔥

- Do **not** generate new files unless explicitly requested
- Ask before creating **multiple files**
- Inline output only if **<300 lines**
- Prefer **patch-style updates** over full file dumps

## 7. Tests & Docs 🟢

- Tests belong in `apps/web-admin/tests/`
- Do **not** generate documentation unless explicitly requested
- Prefer concise **inline explanations** over markdown docs

## 8. Forbidden Actions 🔥

- Do **not** explain backend authorization or validation logic
- Do **not** redesign API responses
- Do **not** mirror backend validation client-side unless already present
- Do **not** refactor unrelated components

## 9 Token Usage 

- **Every response must include a token usage estimate**
- Always add a section titled: `## Token Usage`
- Place it **at the end of the response**

### Format
```md
## Token Usage
- Input (est.): <number>
- Output (est.): <number>
- Total (est.): <number>

