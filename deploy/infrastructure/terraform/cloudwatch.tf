# CloudWatch Log Group for Fluent Bit container logs
# Managed here so Terraform controls retention instead of Fluent Bit creating it.

resource "aws_cloudwatch_log_group" "eks_containers" {
  name              = "/eks/everbloom/containers"
  retention_in_days = 7

  tags = {
    Name        = "everbloom-eks-containers"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
