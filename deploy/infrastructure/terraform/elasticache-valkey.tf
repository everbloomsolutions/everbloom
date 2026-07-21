# Amazon ElastiCache for Valkey Configuration for Everbloom Production
# Region: ap-south-2 (Asia Pacific - Hyderabad)

# Subnet Group for ElastiCache
resource "aws_elasticache_subnet_group" "everbloom" {
  name        = "everbloom-valkey-subnet-group"
  description = "Subnet group for Everbloom Valkey cluster"
  subnet_ids  = aws_subnet.private[*].id

  tags = {
    Name        = "everbloom-valkey-subnet-group"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Security Group for ElastiCache
resource "aws_security_group" "elasticache" {
  name        = "everbloom-elasticache-sg"
  description = "Security group for ElastiCache Valkey"
  vpc_id      = aws_vpc.everbloom.id

  tags = {
    Name        = "everbloom-elasticache-sg"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_security_group_rule" "elasticache_ingress_eks" {
  description              = "Allow EKS nodes to access Valkey"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  security_group_id        = aws_security_group.elasticache.id
  source_security_group_id = aws_security_group.eks_nodes.id
  type                     = "ingress"
}

resource "aws_security_group_rule" "elasticache_ingress_eks_cluster_sg" {
  description              = "Allow EKS cluster security group to access Valkey"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  security_group_id        = aws_security_group.elasticache.id
  source_security_group_id = aws_eks_cluster.everbloom.vpc_config[0].cluster_security_group_id
  type                     = "ingress"
}

resource "aws_security_group_rule" "elasticache_egress" {
  description       = "Allow egress from Valkey"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  security_group_id = aws_security_group.elasticache.id
  cidr_blocks       = ["0.0.0.0/0"]
  type              = "egress"
}

# Parameter Group for Valkey
resource "aws_elasticache_parameter_group" "everbloom" {
  name        = "everbloom-valkey-params"
  family      = "valkey7"
  description = "Custom parameter group for Everbloom Valkey"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }
}

# ElastiCache Replication Group for Valkey (Multi-AZ)
resource "aws_elasticache_replication_group" "everbloom" {
  replication_group_id = "everbloom-valkey"
  description          = "Everbloom Valkey replication group"
  node_type            = "cache.t3.medium"
  num_cache_clusters   = 2
  port                 = 6379
  engine               = "valkey"
  engine_version       = "7.2"
  parameter_group_name = aws_elasticache_parameter_group.everbloom.name
  subnet_group_name    = aws_elasticache_subnet_group.everbloom.name
  security_group_ids   = [aws_security_group.elasticache.id]

  automatic_failover_enabled = true
  multi_az_enabled           = true
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.valkey_auth_token

  # Snapshot configuration
  snapshot_retention_limit = 7
  snapshot_window          = "03:00-05:00"

  # Maintenance window (must not overlap with snapshot window)
  maintenance_window = "sun:06:00-sun:07:00"

  # Notification configuration
  notification_topic_arn = aws_sns_topic.elasticache_alerts.arn

  # Cluster mode disabled for single primary/replica setup
  cluster_mode = "disabled"

  tags = {
    Name        = "everbloom-valkey"
    Environment = "production"
    ManagedBy   = "terraform"
  }

  depends_on = [
    aws_security_group_rule.elasticache_ingress_eks,
    aws_security_group_rule.elasticache_egress
  ]
}

# ElastiCache Replication Group for Valkey (Development)
resource "aws_elasticache_replication_group" "everbloom_dev" {
  replication_group_id = "everbloom-valkey-dev"
  description          = "Everbloom Valkey replication group for development"
  node_type            = "cache.t3.small"
  num_cache_clusters   = 1
  port                 = 6379
  engine               = "valkey"
  engine_version       = "7.2"
  parameter_group_name = aws_elasticache_parameter_group.everbloom.name
  subnet_group_name    = aws_elasticache_subnet_group.everbloom.name
  security_group_ids   = [aws_security_group.elasticache.id]

  automatic_failover_enabled = false
  multi_az_enabled           = false
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.valkey_auth_token

  snapshot_retention_limit = 0

  tags = {
    Name        = "everbloom-valkey-dev"
    Environment = "development"
    ManagedBy   = "terraform"
  }

  depends_on = [
    aws_security_group_rule.elasticache_ingress_eks,
    aws_security_group_rule.elasticache_egress
  ]
}

# SNS Topic for ElastiCache Notifications
resource "aws_sns_topic" "elasticache_alerts" {
  name = "everbloom-elasticache-alerts"

  tags = {
    Name        = "everbloom-elasticache-alerts"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# SNS Topic Subscription (optional - add your email/endpoint)
# resource "aws_sns_topic_subscription" "elasticache_email" {
#   topic_arn = aws_sns_topic.elasticache_alerts.arn
#   protocol  = "email"
#   endpoint  = var.alerts_email
# }
