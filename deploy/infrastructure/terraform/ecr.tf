# ECR Repositories Configuration for Everbloom Production
# Region: ap-south-2 (Asia Pacific - Hyderabad)

# ECR Repository for API Core
resource "aws_ecr_repository" "api_core" {
  name = "everbloom/api-core"
  # Kept MUTABLE because develop branch still pushes a mutable "staging" tag.
  # Switch to IMMUTABLE only when staging also moves to git-SHA tags or a separate staging repo is used.
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "everbloom-api-core"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_ecr_lifecycle_policy" "api_core" {
  repository = aws_ecr_repository.api_core.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Delete untagged images older than 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep last 10 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# ECR Repository for Web Admin
resource "aws_ecr_repository" "web_admin" {
  name = "everbloom/web-admin"
  # Kept MUTABLE because develop branch still pushes a mutable "staging" tag.
  # Switch to IMMUTABLE only when staging also moves to git-SHA tags or a separate staging repo is used.
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "everbloom-web-admin"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_ecr_lifecycle_policy" "web_admin" {
  repository = aws_ecr_repository.web_admin.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Delete untagged images older than 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep last 10 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# ECR Repository for Web Public
resource "aws_ecr_repository" "web_public" {
  name = "everbloom/web-public"
  # Kept MUTABLE because develop branch still pushes a mutable "staging" tag.
  # Switch to IMMUTABLE only when staging also moves to git-SHA tags or a separate staging repo is used.
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "everbloom-web-public"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_ecr_lifecycle_policy" "web_public" {
  repository = aws_ecr_repository.web_public.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Delete untagged images older than 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep last 10 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# ECR Repository Policy for Cross-Account Access (if needed)
resource "aws_ecr_repository_policy" "api_core" {
  repository = aws_ecr_repository.api_core.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowPull"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability"
        ]
      }
    ]
  })
}

resource "aws_ecr_repository_policy" "web_admin" {
  repository = aws_ecr_repository.web_admin.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowPull"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability"
        ]
      }
    ]
  })
}

resource "aws_ecr_repository_policy" "web_public" {
  repository = aws_ecr_repository.web_public.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowPull"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability"
        ]
      }
    ]
  })
}

# Data source for current account ID
data "aws_caller_identity" "current" {}
