# Terraform Outputs for Everbloom Production Infrastructure

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.everbloom.id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.everbloom.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = aws_subnet.private[*].id
}

output "eks_cluster_id" {
  description = "ID of the EKS cluster"
  value       = aws_eks_cluster.everbloom.id
}

output "eks_cluster_endpoint" {
  description = "Endpoint of the EKS cluster"
  value       = aws_eks_cluster.everbloom.endpoint
}

output "eks_cluster_name" {
  description = "Name of the EKS cluster"
  value       = aws_eks_cluster.everbloom.name
}

output "eks_cluster_security_group_id" {
  description = "Security group ID of the EKS cluster"
  value       = aws_security_group.eks_cluster.id
}

output "eks_node_group_id" {
  description = "ID of the EKS node group"
  value       = aws_eks_node_group.application.id
}

output "eks_node_role_arn" {
  description = "ARN of the EKS node role"
  value       = aws_iam_role.eks_nodes.arn
}

output "ecr_repository_urls" {
  description = "URLs of ECR repositories"
  value = {
    api_core   = aws_ecr_repository.api_core.repository_url
    web_admin  = aws_ecr_repository.web_admin.repository_url
    web_public = aws_ecr_repository.web_public.repository_url
  }
}

output "elasticache_endpoint" {
  description = "ElastiCache Valkey primary endpoint"
  value       = aws_elasticache_replication_group.everbloom.primary_endpoint_address
  sensitive   = true
}

output "elasticache_port" {
  description = "ElastiCache Valkey port"
  value       = aws_elasticache_replication_group.everbloom.port
}

output "elasticache_dev_endpoint" {
  description = "ElastiCache Valkey development primary endpoint"
  value       = aws_elasticache_replication_group.everbloom_dev.primary_endpoint_address
  sensitive   = true
}

output "secrets_manager_arns" {
  description = "ARNs of Secrets Manager secrets"
  value = {
    api_core   = aws_secretsmanager_secret.api_core.arn
    web_admin  = aws_secretsmanager_secret.web_admin.arn
    web_public = aws_secretsmanager_secret.web_public.arn
  }
}

output "nat_gateway_public_ips" {
  description = "Public IPs of NAT gateways"
  value       = aws_eip.nat[*].public_ip
}

