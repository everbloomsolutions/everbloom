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
  count  = 1
  domain = "vpc"

  tags = {
    Name        = "everbloom-nat-eip-1"
    Environment = "production"
    ManagedBy   = "terraform"
  }

  depends_on = [aws_internet_gateway.everbloom]
}

resource "aws_nat_gateway" "everbloom" {
  count         = 1
  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name        = "everbloom-nat-gateway-1"
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
  count  = 1
  vpc_id = aws_vpc.everbloom.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.everbloom[0].id
  }

  tags = {
    Name        = "everbloom-private-rt-1"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_route_table_association" "private" {
  count          = 3
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[0].id
}

# S3 Gateway VPC Endpoint (free; ECR image layers are in S3)
resource "aws_vpc_endpoint" "s3" {
  vpc_id          = aws_vpc.everbloom.id
  service_name    = "com.amazonaws.ap-south-2.s3"
  route_table_ids = aws_route_table.private[*].id

  tags = {
    Name        = "everbloom-s3-endpoint"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Data source for availability zones
data "aws_availability_zones" "available" {
  state = "available"
}
