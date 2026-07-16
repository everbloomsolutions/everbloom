# VPC Configuration for Everbloom Production
# Region: ap-south-2 (Asia Pacific - Hyderabad)

resource "aws_vpc" "everbloom" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "everbloom-production-vpc"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Public Subnets
resource "aws_subnet" "public" {
  count                   = 3
  vpc_id                  = aws_vpc.everbloom.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name        = "everbloom-public-subnet-${count.index + 1}"
    Environment = "production"
    Type        = "public"
    ManagedBy   = "terraform"
  }
}

# Private Subnets
resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.everbloom.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name        = "everbloom-private-subnet-${count.index + 1}"
    Environment = "production"
    Type        = "private"
    ManagedBy   = "terraform"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "everbloom" {
  vpc_id = aws_vpc.everbloom.id

  tags = {
    Name        = "everbloom-igw"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# NAT Gateways
resource "aws_eip" "nat" {
  count  = 3
  domain = "vpc"

  tags = {
    Name        = "everbloom-nat-eip-${count.index + 1}"
    Environment = "production"
    ManagedBy   = "terraform"
  }

  depends_on = [aws_internet_gateway.everbloom]
}

resource "aws_nat_gateway" "everbloom" {
  count         = 3
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name        = "everbloom-nat-gateway-${count.index + 1}"
    Environment = "production"
    ManagedBy   = "terraform"
  }

  depends_on = [aws_internet_gateway.everbloom]
}

# Public Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.everbloom.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.everbloom.id
  }

  tags = {
    Name        = "everbloom-public-rt"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_route_table_association" "public" {
  count          = 3
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Private Route Tables
resource "aws_route_table" "private" {
  count  = 3
  vpc_id = aws_vpc.everbloom.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.everbloom[count.index].id
  }

  tags = {
    Name        = "everbloom-private-rt-${count.index + 1}"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_route_table_association" "private" {
  count          = 3
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# VPC Endpoints for ECR, S3, Secrets Manager
resource "aws_vpc_endpoint" "ecr_dkr" {
  vpc_id              = aws_vpc.everbloom.id
  service_name        = "com.amazonaws.ap-south-2.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]

  tags = {
    Name        = "everbloom-ecr-dkr-endpoint"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_vpc_endpoint" "ecr_api" {
  vpc_id              = aws_vpc.everbloom.id
  service_name        = "com.amazonaws.ap-south-2.ecr.api"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]

  tags = {
    Name        = "everbloom-ecr-api-endpoint"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_vpc_endpoint" "s3" {
  vpc_id           = aws_vpc.everbloom.id
  service_name     = "com.amazonaws.ap-south-2.s3"
  route_table_ids  = aws_route_table.private[*].id

  tags = {
    Name        = "everbloom-s3-endpoint"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_vpc_endpoint" "secretsmanager" {
  vpc_id              = aws_vpc.everbloom.id
  service_name        = "com.amazonaws.ap-south-2.secretsmanager"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]

  tags = {
    Name        = "everbloom-secretsmanager-endpoint"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# VPC Endpoint Security Groups
resource "aws_security_group" "vpc_endpoints" {
  name        = "everbloom-vpc-endpoints-sg"
  description = "Security group for VPC endpoints"
  vpc_id      = aws_vpc.everbloom.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "everbloom-vpc-endpoints-sg"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Data source for availability zones
data "aws_availability_zones" "available" {
  state = "available"
}
