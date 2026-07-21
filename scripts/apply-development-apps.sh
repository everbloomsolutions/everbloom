#!/usr/bin/env bash
set -euo pipefail

# Register the development ArgoCD applications.
# Requires AWS credentials and kubectl access to the EKS cluster.

CLUSTER_NAME="${CLUSTER_NAME:-everbloom-production}"
AWS_REGION="${AWS_REGION:-ap-south-2}"

command -v aws >/dev/null 2>&1 || { echo "aws cli is required"; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo "kubectl is required"; exit 1; }

echo "Updating kubeconfig for $CLUSTER_NAME..."
aws eks update-kubeconfig --region "$AWS_REGION" --name "$CLUSTER_NAME"

echo "Applying ArgoCD dev applications..."
kubectl apply -f deploy/applications/namespace-dev.yaml
kubectl apply -f deploy/applications/mongodb-dev.yaml
kubectl apply -f deploy/applications/api-core-dev.yaml
kubectl apply -f deploy/applications/web-admin-dev.yaml
kubectl apply -f deploy/applications/web-public-dev.yaml

echo "ArgoCD dev applications registered."
echo "Verify sync status: argocd app list  (or in the ArgoCD UI)"
