# Troubleshooting Guide

Common issues and solutions for GitOps deployments.

## Backend Deployment Issues

### Issue: Backend fails to start

**Symptoms:**
- Pods in CrashLoopBackOff
- Health checks failing

**Solutions:**
1. Check logs:
   ```bash
   kubectl logs -l app=api-core --tail=100
   ```

2. Verify environment variables:
   ```bash
   kubectl get configmap api-core-config -o yaml
   kubectl get secret api-core-secrets -o yaml
   ```

3. Check MongoDB connection:
   - Verify MONGODB_URI is correct
   - Check network connectivity
   - Verify MongoDB Atlas IP whitelist

4. Check Redis connection:
   - Verify REDIS_URL is correct
   - Check network connectivity

### Issue: CORS errors

**Symptoms:**
- Browser console shows CORS errors
- API requests blocked

**Solutions:**
1. Verify ADMIN_PANEL_URL is set correctly
2. Check BACKEND_CORS_ORIGIN includes frontend URL
3. For Vercel preview URLs, ensure wildcard pattern is configured

## Admin Panel Deployment Issues

### Issue: Admin panel shows blank page

**Symptoms:**
- Page loads but shows blank screen
- Console errors about API URL

**Solutions:**
1. Verify VITE_API_BASE_URL is set:
   ```bash
   # Vercel
   vercel env ls

   # Kubernetes
   kubectl get configmap web-admin-config -o yaml
   ```

2. Check build logs for errors:
   ```bash
   # Vercel
   vercel logs

   # Kubernetes
   kubectl logs -l app=web-admin --tail=100
   ```

3. Verify API URL is accessible:
   ```bash
   curl https://api.vartulaa.com/api/v1/health
   ```

### Issue: Environment variables not working

**Symptoms:**
- Build succeeds but wrong API URL
- Runtime config not injected

**Solutions:**
1. For Vercel: Ensure env vars are set at build time
2. For Docker: Check docker-entrypoint.sh execution
3. Verify env vars are prefixed with VITE_ for Vite

## Vercel Deployment Issues

### Issue: Vercel build fails

**Symptoms:**
- Build error in Vercel dashboard
- Missing environment variables

**Solutions:**
1. Check build logs in Vercel dashboard
2. Verify all VITE_* env vars are set
3. Run validation script locally:
   ```bash
   cd apps/web-admin
   pnpm run validate:env
   ```

4. Ensure pnpm-lock.yaml exists

### Issue: Preview deployments don't work

**Symptoms:**
- Preview URLs show errors
- CORS issues

**Solutions:**
1. Verify CORS configuration supports *.vercel.app
2. Check BACKEND_CORS_ORIGIN includes preview URLs
3. Update backend CORS config if needed

## Kubernetes Deployment Issues

### Issue: Pods not starting

**Symptoms:**
- Pods in Pending state
- Image pull errors

**Solutions:**
1. Check pod status:
   ```bash
   kubectl describe pod <pod-name>
   ```

2. Verify image exists:
   ```bash
   docker pull ghcr.io/everbloom/api-core:latest
   ```

3. Check image pull secrets:
   ```bash
   kubectl get secrets
   ```

### Issue: ArgoCD sync fails

**Symptoms:**
- Application out of sync
- Sync errors

**Solutions:**
1. Check ArgoCD application status:
   ```bash
   argocd app get api-core-prod
   ```

2. Verify repository access:
   ```bash
   argocd repo list
   ```

3. Check sync logs:
   ```bash
   argocd app logs api-core-prod
   ```

## Secret Management Issues

### Issue: Secrets not decrypting

**Symptoms:**
- SOPS decryption fails
- Secrets show as encrypted

**Solutions:**
1. Verify GPG keys are available:
   ```bash
   gpg --list-secret-keys
   ```

2. Check .sops.yaml configuration
3. For AWS KMS, verify credentials:
   ```bash
   aws sts get-caller-identity
   ```

## General Troubleshooting

### Check Application Health
```bash
# Backend
curl https://api.vartulaa.com/health

# Admin Panel
curl https://admin.vartulaa.com/health
```

### View Logs
```bash
# Kubernetes
kubectl logs -l app=api-core --tail=100 -f

# Vercel
vercel logs
```

### Verify Environment Variables
```bash
# Kubernetes
kubectl exec <pod-name> -- env | grep -E "(MONGODB|REDIS|JWT|API)"

# Vercel
vercel env ls
```

## Getting Help

1. Check application logs
2. Verify environment variables
3. Check network connectivity
4. Review GitOps sync status
5. Consult deployment platform documentation
