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
  }

  backend "s3" {
    bucket = "everbloom-terraform-state"
    key    = "terraform.tfstate"
    region = "us-east-1"
  }
}

provider "kubernetes" {
  config_path = var.kubeconfig_path
}

provider "helm" {
  kubernetes {
    config_path = var.kubeconfig_path
  }
}

# Kubernetes Namespaces
resource "kubernetes_namespace" "development" {
  metadata {
    name = "development"
    labels = {
      environment = "development"
    }
  }
}

resource "kubernetes_namespace" "staging" {
  metadata {
    name = "staging"
    labels = {
      environment = "staging"
    }
  }
}

resource "kubernetes_namespace" "production" {
  metadata {
    name = "production"
    labels = {
      environment = "production"
    }
  }
}

# ArgoCD Installation (if using GitOps)
resource "helm_release" "argocd" {
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  version          = "5.51.6"
  namespace        = "argocd"
  create_namespace = true
}

# Monitoring Stack (Prometheus + Grafana)
resource "helm_release" "monitoring" {
  name             = "monitoring"
  repository       = "https://prometheus-community.github.io/helm-charts"
  chart            = "kube-prometheus-stack"
  version          = "51.0.0"
  namespace        = "monitoring"
  create_namespace = true
}

# Ingress Controller (NGINX)
resource "helm_release" "ingress" {
  name             = "ingress-nginx"
  repository       = "https://kubernetes.github.io/ingress-nginx"
  chart            = "ingress-nginx"
  version          = "4.8.3"
  namespace        = "ingress-nginx"
  create_namespace = true
}

variable "kubeconfig_path" {
  description = "Path to kubeconfig file"
  type        = string
  default     = "~/.kube/config"
}

output "argocd_server_url" {
  value = "https://argocd.everbloom.com"
}

output "grafana_url" {
  value = "https://grafana.everbloom.com"
}
