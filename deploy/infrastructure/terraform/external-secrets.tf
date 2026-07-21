# External Secrets Operator with IRSA for AWS Secrets Manager

# OIDC Provider for EKS IRSA
data "tls_certificate" "eks_oidc" {
  url = aws_eks_cluster.everbloom.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks_oidc.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.everbloom.identity[0].oidc[0].issuer

  tags = {
    Name        = "everbloom-eks-oidc"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# IAM Role for External Secrets Operator
resource "aws_iam_role" "external_secrets" {
  name = "everbloom-external-secrets-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.eks.arn
        }
        Condition = {
          StringEquals = {
            "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:sub" = "system:serviceaccount:external-secrets:external-secrets-sa"
            "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = {
    Name        = "everbloom-external-secrets-role"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# IAM Policy for reading Everbloom secrets from Secrets Manager
resource "aws_iam_policy" "external_secrets" {
  name        = "everbloom-external-secrets-policy"
  description = "Policy for External Secrets Operator to read Everbloom secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.mongodb.arn,
          aws_secretsmanager_secret.api_core.arn,
          aws_secretsmanager_secret.web_admin.arn,
          aws_secretsmanager_secret.web_public.arn,
          "arn:aws:secretsmanager:${var.region}:${data.aws_caller_identity.current.account_id}:secret:everbloom/development/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "external_secrets" {
  role       = aws_iam_role.external_secrets.name
  policy_arn = aws_iam_policy.external_secrets.arn
}

# Helm release for External Secrets Operator
resource "helm_release" "external_secrets" {
  name             = "external-secrets"
  repository       = "https://charts.external-secrets.io"
  chart            = "external-secrets"
  version          = "0.9.16"
  namespace        = "external-secrets"
  create_namespace = true

  set {
    name  = "serviceAccount.create"
    value = "true"
  }

  set {
    name  = "serviceAccount.name"
    value = "external-secrets-sa"
  }

  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = aws_iam_role.external_secrets.arn
  }

  depends_on = [
    aws_eks_cluster.everbloom,
    aws_iam_role.external_secrets
  ]
}

output "external_secrets_role_arn" {
  description = "IAM role ARN for External Secrets Operator"
  value       = aws_iam_role.external_secrets.arn
}
