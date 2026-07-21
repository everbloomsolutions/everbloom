# Terraform Variables for Everbloom Production Infrastructure

variable "region" {
  description = "AWS region for deployment"
  type        = string
  default     = "ap-south-2"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# ElastiCache Variables
variable "valkey_auth_token" {
  description = "Auth token for Valkey"
  type        = string
  sensitive   = true
}

# MongoDB Self-hosted Variables
variable "mongodb_root_password" {
  description = "MongoDB root password"
  type        = string
  sensitive   = true
}

variable "mongodb_username" {
  description = "MongoDB application username"
  type        = string
  sensitive   = true
}

variable "mongodb_password" {
  description = "MongoDB application password"
  type        = string
  sensitive   = true
}

# Application Secrets
variable "jwt_secret" {
  description = "JWT secret for authentication"
  type        = string
  sensitive   = true
}

variable "jwt_refresh_secret" {
  description = "JWT refresh secret"
  type        = string
  sensitive   = true
}

variable "cloudinary_cloud_name" {
  description = "Cloudinary cloud name"
  type        = string
  sensitive   = true
}

variable "cloudinary_api_key" {
  description = "Cloudinary API key"
  type        = string
  sensitive   = true
}

variable "cloudinary_api_secret" {
  description = "Cloudinary API secret"
  type        = string
  sensitive   = true
}

variable "google_maps_api_key" {
  description = "Google Maps API key"
  type        = string
  sensitive   = true
}

variable "kubeconfig_path" {
  description = "Path to kubeconfig file"
  type        = string
  default     = "~/.kube/config"
}

# cert-manager Variables
variable "letsencrypt_email" {
  description = "Email for Let's Encrypt notifications"
  type        = string
}

# Alert Variables
variable "alerts_email" {
  description = "Email for infrastructure alerts"
  type        = string
  default     = ""
}
