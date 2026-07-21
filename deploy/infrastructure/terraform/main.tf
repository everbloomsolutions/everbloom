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
  }

  backend "s3" {
    bucket = "everbloom-terraform-state"
    key    = "terraform.tfstate"
    region = "ap-south-2"
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

# ArgoCD Installation (if using GitOps) - uncomment when ready for GitOps
# resource "helm_release" "argocd" {
#   name             = "argocd"
#   repository       = "https://argoproj.github.io/argo-helm"
#   chart            = "argo-cd"
#   version          = "5.51.6"
#   namespace        = "argocd"
#   create_namespace = true
# }

# Monitoring Stack (Prometheus + Grafana) - uncomment when ready for monitoring
# resource "helm_release" "monitoring" {
#   name             = "monitoring"
#   repository       = "https://prometheus-community.github.io/helm-charts"
#   chart            = "kube-prometheus-stack"
#   version          = "51.0.0"
#   namespace        = "monitoring"
#   create_namespace = true
# }

# Ingress Controller (NGINX)
resource "helm_release" "ingress" {
  name             = "ingress-nginx"
  repository       = "https://kubernetes.github.io/ingress-nginx"
  chart            = "ingress-nginx"
  version          = "4.15.1"
  namespace        = "ingress-nginx"
  create_namespace = true
}
