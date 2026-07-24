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

variable "mongodb_protocol" {
  description = "MongoDB connection protocol. Production uses the in-cluster mongodb:// protocol only."
  type        = string
  default     = "mongodb"
  validation {
    condition     = var.mongodb_protocol == "mongodb"
    error_message = "mongodb_protocol must be mongodb for the in-cluster database"
  }
}

variable "mongodb_host" {
  description = "MongoDB host. Must be the in-cluster MongoDB service (e.g. mongodb:27017)."
  type        = string
  default     = "mongodb:27017"
  validation {
    condition     = !strcontains(lower(var.mongodb_host), "localhost") && !strcontains(lower(var.mongodb_host), "127.0.0.1") && !strcontains(lower(var.mongodb_host), "mongodb.net") && !strcontains(lower(var.mongodb_host), "atlas")
    error_message = "mongodb_host must be the in-cluster MongoDB service; localhost, Atlas and mongodb.net hosts are not allowed"
  }
}

variable "mongodb_options" {
  description = "MongoDB connection options query string. The in-cluster standalone instance must not use replica-set options."
  type        = string
  default     = "authSource=admin"
  validation {
    condition     = strcontains(lower(var.mongodb_options), "authsource=admin") && !strcontains(lower(var.mongodb_options), "retrywrites=true") && !strcontains(lower(var.mongodb_options), "w=majority")
    error_message = "mongodb_options must include authSource=admin and must not include retryWrites=true or w=majority for the in-cluster standalone database"
  }
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
