# Everbloom

Monorepo for Everbloom applications and GitOps deployment.

## Structure

- **apps/** — Application source code
  - **web-admin/** — Admin web UI (React / Vite)
  - **web-public/** — Public / marketing website
  - **api-core/** — Core backend API
- **deploy/** — GitOps root (Argo CD watches this)
  - **applications/** — Argo CD Application CRs
  - **apps/** — Reusable Kustomize bases per app
  - **environments/** — Environment overlays (development, staging, production)
  - **infrastructure/** — Cluster-level (Kubernetes, Terraform)
- **.github/workflows/** — CI workflows (build & push images)

## Quick start

- From repo root: `pnpm install` (single lockfile; uses `pnpm-workspace.yaml`).
- Build all apps: `pnpm turbo run build`. Or one app: `pnpm turbo run build --filter=@everbloom/api-core`.
- See each app’s `README.md` for run instructions.

**Development:** Run `pnpm dev` from repo root. This clears dev ports once (8080, 3001, 3000), then starts api-core and web-admin. Port design: Backend 8080, Admin 3001, Frontend 3000 (distinct ports to avoid EADDRINUSE). Registry: `scripts/dev-ports.config.js`. Env: Backend `PORT`/`BACKEND_PORT` (8080); Admin `VITE_DEV_PORT` (3001); `VITE_BACKEND_PORT` (8080). If 8080 is in use, the backend tries 8081–8085 and logs the chosen port. Deployments: Docker/Kubernetes/AWS use `PORT`; Vercel is serverless. For api-core-only dev, run `pnpm run kill-ports` from `apps/api-core` first.

**Docker:** One Compose Application (mongo + redis only). Put `.env` at repo root. From root: `docker compose -f docker-compose.dev.yaml up -d`. Run api-core and web-admin locally (`pnpm dev`). See [Docker Desktop](#docker-desktop) below.

## Docker Desktop

Default: one Compose Application in Docker Desktop for dev infrastructure (mongo, redis). Run api-core and web-admin locally.

| Project directory | Compose file |
|-------------------|--------------|
| Repo root | `docker-compose.dev.yaml` (or `apps/api-core/docker-compose.dev.yaml`) |

**Steps (Docker Desktop 4.x+):**

1. **Containers** → **+** (New) → **Create a Compose Application**.
2. **Project directory:** repo root (e.g. `everbloom`).
3. **Compose file:** `docker-compose.dev.yaml`.
4. **Application name:** e.g. `everbloom-dev`.
5. **Create and run.** Services: mongo, redis.

**CLI (from repo root):** `docker compose -f docker-compose.dev.yaml up -d`.

**Workflow:** Start mongo + redis via Docker Desktop or CLI; run `pnpm dev` in `apps/api-core` and `apps/web-admin` for backend and admin UI.
