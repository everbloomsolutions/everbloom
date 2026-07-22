# Deployment Guide

This guide explains how to deploy applications using GitOps principles.

## Overview

Deployments are managed through GitOps, where:
- Git is the single source of truth
- Changes are automatically synchronized
- Rollbacks are done via Git commits

## Deployment Platforms

### Vercel (Admin Panel)

1. **Setup Vercel Project**
   ```bash
   vercel login
   vercel link
   ```

2. **Set Environment Variables**
   ```bash
   vercel env add VITE_API_BASE_URL
   vercel env add VITE_SOCKET_URL
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Kubernetes (Optional)

1. **Install ArgoCD**
   ```bash
   kubectl create namespace argocd
   kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
   ```

2. **Create Applications**
   ```bash
   kubectl apply -f deploy/applications/api-core-prod.yaml
   kubectl apply -f deploy/applications/web-admin-prod.yaml
   kubectl apply -f deploy/applications/web-public-prod.yaml
   ```

3. **Sync Applications**
   ```bash
   argocd app sync api-core-prod
   argocd app sync web-admin-prod
   argocd app sync web-public-prod
   ```

## Environment-Specific Deployments

### Local Development
- Uses Docker Compose for MongoDB and Redis (`docker-compose.dev.yaml`)
- Generate local secrets with `./scripts/create-local-env.sh`
- Run `api-core` and `web-admin` via `pnpm dev`

### Production
- High availability on AWS EKS
- Production-grade resources
- Monitoring and alerting

## CI/CD (GitHub Actions)

- **Image build**: Push to `main` builds, pushes `:sha` and `:latest`, and updates GitOps. Push to `develop` runs `pnpm` checks and a local smoke test; no image push.
- **Opt-in**: Set in GitHub Environment or repository variables:
  - `UPDATE_GITOPS=true` — build workflows commit newTag to `deploy/apps/*/base/kustomization.yaml` after push (Argo CD then syncs).
  - `DEPLOY_TO=vercel` — web-admin workflow runs Vercel deploy (needs `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`). Step uses `continue-on-error: true` if Vercel is not configured.
- **Update Image Tags**: Manual workflow; input `image_tag` (default: SHA) and `update_gitops` (boolean). When `update_gitops` is true, commits tag changes to all three base kustomizations.

## Configuration (UPDATE_GITOPS, DEPLOY_TO)

Set these in GitHub so build workflows can update GitOps or deploy to Vercel:

1. **Repository**: Settings → Secrets and variables → Actions → Variables. Add `UPDATE_GITOPS` (value `true`) and/or `DEPLOY_TO` (value `vercel`) if you want them for all runs.
2. **Environment**: Settings → Environments → e.g. `production` → Environment variables. Add `UPDATE_GITOPS=true` so only production runs commit tag updates. Add `DEPLOY_TO=vercel` for web-admin in that environment.

Build workflows use the job’s `environment` (production from branch or workflow_dispatch input), so variables set on the `production` environment apply only when that environment is used.

## Deployment Workflow Summary

| Component | What it does |
|-----------|---------------|
| **build-api-core** | PR/develop: `pnpm` lint, type-check, test, build + smoke test. Main: build, push `:sha`/`:latest` to ECR and update base `newTag` via GitOps. |
| **build-web-admin** | Same pattern for PR/develop; main builds/pushes to ECR and updates GitOps. Optional Vercel deploy if `DEPLOY_TO=vercel`. |
| **build-web-public** | Same pattern (gated until implemented). |
| **update-image-tags** | Manual: set image tag in all three bases; input `update_gitops` to commit and push. |
| **Argo CD** | *-prod apps: `targetRevision: main`, path `deploy/environments/production/<app>`, inherit base `newTag` (SHA from CI). |

## Naming Conventions

| Kind | Convention | Examples |
|------|-------------|----------|
| Workflow file | kebab-case | `build-api-core.yml`, `update-image-tags.yml` |
| Job name | kebab-case | `build-and-push`, `update-tags` |
| Step name | Title Case, short | `Checkout`, `Lint`, `Build and push Docker image` |
| Argo Application | `<app>-<env>` | `api-core-prod`, `web-admin-prod` |
| Kustomize path | `deploy/apps/<app>/base`, `deploy/environments/<env>/<app>` | `api-core`, `web-admin`, `production` |
| Image name | kebab-case, matches app | `api-core`, `web-admin`, `web-public` |
| Image tag | `latest` (main) or SHA | Pushed by CI on `main` |
| Commit message (deploy) | `chore(deploy): <description>` | `chore(deploy): update api-core image to <sha>` |
| Base image newName | `ghcr.io/everbloom/<app>` | Matches CI `github.repository_owner` when repo is everbloom; for forks, set owner or update base kustomization. |

## Deployment Workflow

1. **Make Changes**
   - Update application code
   - Update GitOps configurations
   - Commit changes

2. **CI/CD Pipeline**
   - Builds Docker images
   - Runs tests
   - Pushes to registry
   - (If enabled) Updates GitOps repo with new image tag

3. **GitOps Sync**
   - ArgoCD detects changes
   - Syncs to cluster
   - Monitors health

4. **Verification**
   - Check deployment status
   - Verify health endpoints
   - Monitor logs

## Rollback

### Vercel
```bash
vercel rollback
```

### Kubernetes/ArgoCD
```bash
argocd app rollback api-core-prod
```

## Monitoring

- **Health Checks**: `/health` endpoint
- **Metrics**: Prometheus endpoints
- **Logs**: Centralized logging
- **Alerts**: Prometheus alerts

