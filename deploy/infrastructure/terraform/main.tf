terraform {
  required_version = ">= 1.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    http = {
      source  = "hashicorp/http"
      version = "~> 3.4"
    }
  }

  backend "s3" {
    bucket  = "everbloom-terraform-state"
    key     = "terraform.tfstate"
    region  = "ap-south-2"
    encrypt = true
  }
}

provider "kubernetes" {
  host                   = aws_eks_cluster.everbloom.endpoint
  cluster_ca_certificate = base64decode(aws_eks_cluster.everbloom.certificate_authority[0].data)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", aws_eks_cluster.everbloom.name, "--region", var.region]
  }
}

provider "helm" {
  kubernetes {
    host                   = aws_eks_cluster.everbloom.endpoint
    cluster_ca_certificate = base64decode(aws_eks_cluster.everbloom.certificate_authority[0].data)

    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", aws_eks_cluster.everbloom.name, "--region", var.region]
    }
  }
}

# Kubernetes resources - will be deployed after EKS cluster is created
resource "kubernetes_namespace" "production" {
  metadata {
    name = "production"
    labels = {
      environment = "production"
    }
  }
}

# ArgoCD Installation (GitOps)
resource "helm_release" "argocd" {
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  version          = "5.51.6"
  namespace        = "argocd"
  create_namespace = true
}

# Monitoring Stack (Prometheus + Grafana) - uncomment when ready for monitoring
# resource "helm_release" "monitoring" {
#   name             = "monitoring"
#   repository       = "https://prometheus-community.github.io/helm-charts"
#   chart            = "kube-prometheus-stack"
#   version          = "51.0.0"
#   namespace        = "monitoring"
#   create_namespace = true
# }

# AWS Load Balancer Controller
resource "aws_iam_role" "aws_load_balancer_controller" {
  name = "everbloom-aws-load-balancer-controller"

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
            "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:sub" = "system:serviceaccount:kube-system:aws-load-balancer-controller"
            "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })
}

data "http" "aws_lb_controller_iam_policy" {
  url = "https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.7.2/docs/install/iam_policy.json"
}

resource "aws_iam_role_policy" "aws_load_balancer_controller" {
  name   = "AWSLoadBalancerControllerIAMPolicy"
  role   = aws_iam_role.aws_load_balancer_controller.id
  policy = data.http.aws_lb_controller_iam_policy.response_body
}

# Fluent Bit (CloudWatch logs shipper)
resource "aws_iam_role" "fluent_bit" {
  name = "everbloom-fluent-bit"

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
            "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:sub" = "system:serviceaccount:production:fluent-bit"
            "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "fluent_bit_cloudwatch" {
  name = "FluentBitCloudWatchLogs"
  role = aws_iam_role.fluent_bit.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
        ]
        Resource = "*"
      }
    ]
  })
}

resource "helm_release" "aws_load_balancer_controller" {
  name             = "aws-load-balancer-controller"
  repository       = "https://aws.github.io/eks-charts"
  chart            = "aws-load-balancer-controller"
  version          = "1.7.2" # or latest compatible
  namespace        = "kube-system"
  create_namespace = false

  set {
    name  = "clusterName"
    value = aws_eks_cluster.everbloom.name
  }

  set {
    name  = "region"
    value = var.region
  }

  set {
    name  = "vpcId"
    value = aws_vpc.everbloom.id
  }

  set {
    name  = "serviceAccount.create"
    value = "true"
  }

  set {
    name  = "serviceAccount.name"
    value = "aws-load-balancer-controller"
  }

  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = aws_iam_role.aws_load_balancer_controller.arn
  }

  depends_on = [
    aws_eks_cluster.everbloom,
    aws_iam_role.aws_load_balancer_controller,
    aws_iam_role_policy.aws_load_balancer_controller,
  ]
}

# Ingress Controller (NGINX)
resource "helm_release" "ingress" {
  name             = "ingress-nginx"
  repository       = "https://kubernetes.github.io/ingress-nginx"
  chart            = "ingress-nginx"
  version          = "4.15.1"
  namespace        = "ingress-nginx"
  create_namespace = true

  values = [
    yamlencode({
      controller = {
        service = {
          annotations = {
            "service.beta.kubernetes.io/aws-load-balancer-type"                              = "nlb"
            "service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled" = "true"
            "service.beta.kubernetes.io/aws-load-balancer-scheme"                            = "internet-facing"
            "service.beta.kubernetes.io/aws-load-balancer-attributes"                        = "load_balancing.cross_zone.enabled=true"
            "service.beta.kubernetes.io/aws-load-balancer-additional-resource-tags"          = "Environment=production,ManagedBy=terraform"
          }
        }
      }
    })
  ]

  depends_on = [helm_release.aws_load_balancer_controller]
}
