# Development Marker Convention

Use inline comment markers to surface leftover work without blocking the current PR. They are warnings, not errors.

## Markers

| Marker | Meaning | When to remove |
|--------|---------|----------------|
| `TODO` | Planned work or follow-up task | When the work is done |
| `FIXME` | Known bug or broken edge case | When the bug is fixed |
| `HACK` | Temporary workaround | When a proper solution replaces it |
| `BUG` | Confirmed bug waiting for a ticket fix | When the linked issue is resolved |
| `XXX` | Dangerous or uncertain code that needs review | After review and refactor |

## Format

```ts
// TODO(jane)[#1234]: migrate sendAuditNotification to use the NestJS email queue
// FIXME(john): pagination returns duplicates when cursor and search are combined
// HACK(alice): remove once legacy import endpoints are retired
```

- **Author** in parentheses is optional but recommended.
- **Reference** in brackets is optional: issue number, ticket ID, or plan file.
- Keep the description short and actionable.

## Tooling

- ESLint surfaces markers during `pnpm lint` via `no-warning-comments`.
- Run `pnpm run todos` from the repo root to list all markers in `apps/*/src`.

## Scope

Apply markers across the monorepo:
- `apps/api-core`
- `apps/web-admin`
- `apps/web-public` (when active)

Do not add markers inside `node_modules`, generated files, or `dist/`.
