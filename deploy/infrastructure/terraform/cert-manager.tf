# cert-manager Configuration for Everbloom Production
# Region: ap-south-2 (Asia Pacific - Hyderabad)

# cert-manager Helm Release
resource "helm_release" "cert_manager" {
  name             = "cert-manager"
  repository       = "https://charts.jetstack.io"
  chart            = "cert-manager"
  version          = "v1.13.2"
  namespace        = "cert-manager"
  create_namespace = true

  set {
    name  = "installCRDs"
    value = "true"
  }

  set {
    name  = "replicaCount"
    value = "1"
  }

  set {
    name  = "prometheus.enabled"
    value = "true"
  }

  set {
    name  = "serviceAccount.automountServiceAccountToken"
    value = "true"
  }

  values = [
    yamlencode({
      podLabels = {
        environment = "production"
        managedBy   = "terraform"
      }
    })
  ]

  depends_on = [
    aws_eks_cluster.everbloom,
    helm_release.ingress
  ]
}
