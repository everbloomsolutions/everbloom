# cert-manager Configuration for Everbloom Production
# Region: ap-south-2 (Asia Pacific - Hyderabad)
# Commented out for initial infrastructure deployment
# Uncomment after EKS cluster is available and kubeconfig is configured

# # cert-manager Helm Release
# resource "helm_release" "cert_manager" {
#   name       = "cert-manager"
#   repository = "https://charts.jetstack.io"
#   chart      = "cert-manager"
#   version    = "v1.13.2"
#   namespace  = "cert-manager"
#   create_namespace = true
#
#   set {
#     name  = "installCRDs"
#     value = "true"
#   }
#
#   set {
#     name  = "replicaCount"
#     value = "1"
#   }
#
#   set {
#     name  = "prometheus.enabled"
#     value = "true"
#   }
#
#   set {
#     name  = "serviceAccount.automountServiceAccountToken"
#     value = "true"
#   }
#
#   values = [
#     yamlencode({
#       podLabels = {
#         environment = "production"
#         managedBy   = "terraform"
#       }
#     })
#   ]
#
#   depends_on = [
#     aws_eks_cluster.everbloom
#   ]
# }
#
# # Let's Encrypt Production ClusterIssuer
# resource "kubectl_manifest" "letsencrypt_prod_cluster_issuer" {
#   yaml_body = yamlencode({
#     apiVersion = "cert-manager.io/v1"
#     kind       = "ClusterIssuer"
#     metadata = {
#       name = "letsencrypt-prod"
#       namespace = "cert-manager"
#     }
#     spec = {
#       acme = {
#         server = "https://acme-v02.api.letsencrypt.org/directory"
#         email  = var.letsencrypt_email
#         privateKeySecretRef = {
#           name = "letsencrypt-prod"
#         }
#         solvers = [
#           {
#             http01 = {
#               ingress = {
#                 class = "nginx"
#               }
#             }
#           }
#         ]
#       }
#     }
#   })
#
#   depends_on = [
#     helm_release.cert_manager
#   ]
# }
#
# # Let's Encrypt Staging ClusterIssuer (for testing)
# resource "kubectl_manifest" "letsencrypt_staging_cluster_issuer" {
#   yaml_body = yamlencode({
#     apiVersion = "cert-manager.io/v1"
#     kind       = "ClusterIssuer"
#     metadata = {
#       name = "letsencrypt-staging"
#       namespace = "cert-manager"
#     }
#     spec = {
#       acme = {
#         server = "https://acme-staging-v02.api.letsencrypt.org/directory"
#         email  = var.letsencrypt_email
#         privateKeySecretRef = {
#           name = "letsencrypt-staging"
#         }
#         solvers = [
#           {
#             http01 = {
#               ingress = {
#                 class = "nginx"
#               }
#             }
#           }
#         ]
#       }
#     }
#   })
#
#   depends_on = [
#     helm_release.cert_manager
#   ]
# }
