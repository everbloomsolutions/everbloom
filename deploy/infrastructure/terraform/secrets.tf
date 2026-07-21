# AWS Secrets Manager Configuration for Everbloom Production
# Region: ap-south-2 (Asia Pacific - Hyderabad)

# MongoDB Secrets
resource "aws_secretsmanager_secret" "mongodb" {
  name = "everbloom/production/mongodb"

  tags = {
    Name        = "everbloom-mongodb-secrets"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_secretsmanager_secret_version" "mongodb" {
  secret_id = aws_secretsmanager_secret.mongodb.id
  secret_string = jsonencode({
    root-username = "root"
    root-password = var.mongodb_root_password
    username = var.mongodb_username
    password = var.mongodb_password
  })

  lifecycle {
    ignore_changes = [secret_string, version_stages]
  }
}

# API Core Secrets
resource "aws_secretsmanager_secret" "api_core" {
  name = "everbloom/production/api-core"

  tags = {
    Name        = "everbloom-api-core-secrets"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_secretsmanager_secret_version" "api_core" {
  secret_id = aws_secretsmanager_secret.api_core.id
  secret_string = jsonencode({
    mongodb-uri = "mongodb://${urlencode(var.mongodb_username)}:${urlencode(var.mongodb_password)}@mongodb:27017/everbloom?authSource=admin"
    redis-url = "rediss://:${urlencode(var.valkey_auth_token)}@${aws_elasticache_replication_group.everbloom.primary_endpoint_address}:6379"
    jwt-secret = var.jwt_secret
    jwt-refresh-secret = var.jwt_refresh_secret
    cloudinary-cloud-name = var.cloudinary_cloud_name
    cloudinary-api-key = var.cloudinary_api_key
    cloudinary-api-secret = var.cloudinary_api_secret
    google-maps-api-key = var.google_maps_api_key
  })

  lifecycle {
    ignore_changes = [secret_string, version_stages]
  }
}

# Web Admin Secrets
resource "aws_secretsmanager_secret" "web_admin" {
  name = "everbloom/production/web-admin"

  tags = {
    Name        = "everbloom-web-admin-secrets"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_secretsmanager_secret_version" "web_admin" {
  secret_id = aws_secretsmanager_secret.web_admin.id
  secret_string = jsonencode({
    api-base-url = "https://api.everbloom.com"
    socket-url = "wss://api.everbloom.com"
  })
}

# Web Public Secrets
resource "aws_secretsmanager_secret" "web_public" {
  name = "everbloom/production/web-public"

  tags = {
    Name        = "everbloom-web-public-secrets"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_secretsmanager_secret_version" "web_public" {
  secret_id = aws_secretsmanager_secret.web_public.id
  secret_string = jsonencode({
    api-base-url = "https://api.everbloom.com"
    socket-url = "wss://api.everbloom.com"
  })
}

