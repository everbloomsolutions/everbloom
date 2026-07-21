# GitHub Actions OIDC integration for CI/CD
#
# This module codifies the manually-created `everbloom-github-actions-role`
# and the aws-auth ConfigMap mapping for GitHub Actions.
#
# The GitHub OIDC provider (token.actions.githubusercontent.com) is already
# present in the account and is referenced as a data source.

locals {
  github_org  = "everbloomsolutions"
  github_repo = "everbloom"
}

# The GitHub OIDC provider was created manually; reference it instead of
# attempting to recreate it. If you ever recreate the account from scratch,
# change this to an `aws_iam_openid_connect_provider` resource.
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

data "aws_iam_policy_document" "github_actions_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${local.github_org}/${local.github_repo}:*"]
    }
  }
}

# This role already exists from the manual setup; the import block below
# brings it under Terraform management on the next plan/apply.
resource "aws_iam_role" "github_actions" {
  name               = "everbloom-github-actions-role"
  assume_role_policy = data.aws_iam_policy_document.github_actions_trust.json

  tags = {
    Name        = "everbloom-github-actions-role"
    Environment = "production"
    ManagedBy   = "terraform"
    Purpose     = "github-actions-cicd"
  }
}

import {
  to = aws_iam_role.github_actions
  id = "everbloom-github-actions-role"
}

# Managed ECR policy already attached to the role; keep it here for IaC.
resource "aws_iam_role_policy_attachment" "github_actions_ecr" {
  role       = aws_iam_role.github_actions.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser"
}

# Minimal custom policy for EKS read access (aws eks update-kubeconfig).
resource "aws_iam_policy" "github_actions_eks" {
  name        = "everbloom-github-actions-eks-policy"
  description = "EKS access for GitHub Actions CI/CD"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EKSAccess"
        Effect = "Allow"
        Action = [
          "eks:DescribeCluster",
          "eks:ListClusters",
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name        = "everbloom-github-actions-eks-policy"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_iam_role_policy_attachment" "github_actions_eks" {
  role       = aws_iam_role.github_actions.name
  policy_arn = aws_iam_policy.github_actions_eks.arn
}

# Grant the GitHub Actions role cluster-admin access via EKS access entries.
# The cluster must be configured with authentication_mode = "API_AND_CONFIG_MAP".
resource "aws_eks_access_entry" "github_actions" {
  cluster_name  = aws_eks_cluster.everbloom.name
  principal_arn = aws_iam_role.github_actions.arn
  type          = "STANDARD"
  user_name     = "github-actions"

  depends_on = [aws_eks_cluster.everbloom]
}

resource "aws_eks_access_policy_association" "github_actions_cluster_admin" {
  cluster_name  = aws_eks_cluster.everbloom.name
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
  principal_arn = aws_iam_role.github_actions.arn

  access_scope {
    type = "cluster"
  }

  depends_on = [aws_eks_access_entry.github_actions]
}

# Manage the aws-auth ConfigMap so it only contains the node role.
# GitHub Actions access is handled by the EKS access entry above.
resource "kubernetes_config_map_v1_data" "aws_auth" {
  metadata {
    name      = "aws-auth"
    namespace = "kube-system"
  }

  force = true

  data = {
    mapRoles = trimspace(yamlencode([
      {
        groups   = ["system:bootstrappers", "system:nodes"]
        rolearn  = aws_iam_role.eks_nodes.arn
        username = "system:node:{{EC2PrivateDNSName}}"
      }
    ]))
  }

  depends_on = [
    aws_eks_cluster.everbloom,
    aws_iam_role.eks_nodes,
    aws_eks_access_policy_association.github_actions_cluster_admin,
  ]
}

output "github_actions_role_arn" {
  description = "IAM role ARN used by GitHub Actions"
  value       = aws_iam_role.github_actions.arn
}
