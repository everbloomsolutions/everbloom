# EKS Cluster Configuration for Everbloom Production
# Region: ap-south-2 (Asia Pacific - Hyderabad)

# IAM Role for EKS Cluster
resource "aws_iam_role" "eks_cluster" {
  name = "everbloom-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "everbloom-eks-cluster-role"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster.name
}

resource "aws_iam_role_policy_attachment" "eks_vpc_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
  role       = aws_iam_role.eks_cluster.name
}

# EKS Cluster
resource "aws_eks_cluster" "everbloom" {
  name     = "everbloom-production"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = "1.32"

  vpc_config {
    subnet_ids         = concat(aws_subnet.private[*].id, aws_subnet.public[*].id)
    security_group_ids = [aws_security_group.eks_cluster.id]

    endpoint_private_access = true
    endpoint_public_access  = true

    public_access_cidrs = ["0.0.0.0/0"]
  }

  access_config {
    authentication_mode                         = "API_AND_CONFIG_MAP"
    bootstrap_cluster_creator_admin_permissions = true
  }

  enabled_cluster_log_types = [
    "api",
    "audit",
    "authenticator",
    "controllerManager",
    "scheduler"
  ]

  tags = {
    Name        = "everbloom-production"
    Environment = "production"
    ManagedBy   = "terraform"
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
    aws_iam_role_policy_attachment.eks_vpc_policy
  ]
}

# Security Group for EKS Cluster
resource "aws_security_group" "eks_cluster" {
  name        = "everbloom-eks-cluster-sg"
  description = "Security group for EKS cluster"
  vpc_id      = aws_vpc.everbloom.id

  tags = {
    Name        = "everbloom-eks-cluster-sg"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_security_group_rule" "eks_cluster_ingress" {
  description              = "Allow cluster communication from control plane to worker nodes"
  from_port                = 0
  to_port                  = 0
  protocol                 = "-1"
  security_group_id        = aws_security_group.eks_cluster.id
  source_security_group_id = aws_security_group.eks_nodes.id
  type                     = "ingress"
}

resource "aws_security_group_rule" "eks_cluster_egress" {
  description       = "Allow cluster egress to anywhere"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  security_group_id = aws_security_group.eks_cluster.id
  cidr_blocks       = ["0.0.0.0/0"]
  type              = "egress"
}

# IAM Role for EKS Node Group
resource "aws_iam_role" "eks_nodes" {
  name = "everbloom-eks-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "everbloom-eks-node-role"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_nodes.name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_nodes.name
}

resource "aws_iam_role_policy_attachment" "ecr_readonly_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_nodes.name
}

# IRSA (IAM Roles for Service Accounts)
resource "aws_iam_role_policy_attachment" "eks_cw_policy" {
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
  role       = aws_iam_role.eks_nodes.name
}

# Security Group for EKS Nodes
resource "aws_security_group" "eks_nodes" {
  name        = "everbloom-eks-nodes-sg"
  description = "Security group for EKS nodes"
  vpc_id      = aws_vpc.everbloom.id

  tags = {
    Name        = "everbloom-eks-nodes-sg"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_security_group_rule" "eks_nodes_ingress_cluster" {
  description              = "Allow worker nodes to communicate with cluster API server"
  from_port                = 443
  to_port                  = 443
  protocol                 = "tcp"
  security_group_id        = aws_security_group.eks_nodes.id
  source_security_group_id = aws_security_group.eks_cluster.id
  type                     = "ingress"
}

resource "aws_security_group_rule" "eks_nodes_ingress_self" {
  description              = "Allow worker nodes to communicate with each other"
  from_port                = 0
  to_port                  = 0
  protocol                 = "-1"
  security_group_id        = aws_security_group.eks_nodes.id
  source_security_group_id = aws_security_group.eks_nodes.id
  type                     = "ingress"
}

resource "aws_security_group_rule" "eks_nodes_ingress_web" {
  description       = "Allow worker nodes to receive web traffic"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  security_group_id = aws_security_group.eks_nodes.id
  cidr_blocks       = ["0.0.0.0/0"]
  type              = "ingress"
}

resource "aws_security_group_rule" "eks_nodes_ingress_web_secure" {
  description       = "Allow worker nodes to receive secure web traffic"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  security_group_id = aws_security_group.eks_nodes.id
  cidr_blocks       = ["0.0.0.0/0"]
  type              = "ingress"
}

resource "aws_security_group_rule" "eks_nodes_egress" {
  description       = "Allow worker nodes egress to anywhere"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  security_group_id = aws_security_group.eks_nodes.id
  cidr_blocks       = ["0.0.0.0/0"]
  type              = "egress"
}

# EKS Node Group (Application)
resource "aws_eks_node_group" "application" {
  cluster_name    = aws_eks_cluster.everbloom.name
  node_group_name = "everbloom-application-nodes"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = aws_subnet.private[*].id

  scaling_config {
    desired_size = 5
    min_size     = 2
    max_size     = 6
  }

  instance_types = ["t3.medium"]

  disk_size = 50

  labels = {
    node-type   = "application"
    environment = "production"
  }

  tags = {
    Name        = "everbloom-application-node"
    Environment = "production"
    ManagedBy   = "terraform"
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.ecr_readonly_policy,
    aws_iam_role_policy_attachment.eks_cw_policy
  ]
}
