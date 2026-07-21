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
    kubectl = {
      source  = "gavinbunney/kubectl"
      version = "~> 1.14"
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
  }
}

provider "kubernetes" {
  config_path = var.kubeconfig_path

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", "everbloom-production", "--region", "ap-south-2"]
  }
}

provider "helm" {
  kubernetes {
    config_path = var.kubeconfig_path

    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", "everbloom-production", "--region", "ap-south-2"]
    }
  }
}

provider "kubectl" {
  config_path = var.kubeconfig_path

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", "everbloom-production", "--region", "ap-south-2"]
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
  version          = "4.8.3"
  namespace        = "ingress-nginx"
  create_namespace = true
}
