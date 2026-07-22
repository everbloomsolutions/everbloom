# gp3 StorageClass for EKS (used by MongoDB StatefulSet)
resource "kubernetes_storage_class" "gp3" {
  metadata {
    name = "gp3"
    annotations = {
      "storageclass.kubernetes.io/is-default-class" = "true"
    }
  }
  storage_provisioner    = "ebs.csi.aws.com"
  volume_binding_mode    = "WaitForFirstConsumer"
  allow_volume_expansion = true
  reclaim_policy         = "Delete"
  parameters = {
    type      = "gp3"
    fsType    = "ext4"
    encrypted = "true"
    iops      = "3000"
    throughput = "125"
  }
}
