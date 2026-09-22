terraform {
  required_version = ">= 1.0.0"

  backend "s3" {
    bucket       = "shopkart-remote-backend-state-tf"  
    key          = "terraform/dev/terraform.tfstate"
    region       = "ap-south-1"
    encrypt      = true
    use_lockfile = true
  }
}

module "vpc" {
  source = "../../modules/vpc"

  name = "shopkart-dev"

  vpc_cidr = "10.0.0.0/16"

  availability_zones = [
    "ap-south-1a",
    "ap-south-1b"
  ]

  public_subnet_cidrs = [
    "10.0.1.0/24",
    "10.0.2.0/24"
  ]

  private_subnet_cidrs = [
    "10.0.11.0/24",
    "10.0.12.0/24"
  ]
}



module "eks" {
  source             = "../../modules/eks"
  name               = "shopkart-dev"
  kubernetes_version = "1.35"
  private_subnet_ids = module.vpc.private_subnet_ids
  node_instance_type = "m7i-flex.large"
  desired_nodes      = 2
  min_nodes          = 2
  max_nodes          = 5
}

module "alb_controller" {
  source = "../../modules/alb-controller"

  name              = "shopkart-dev"
  cluster_name      = module.eks.cluster_name
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_issuer_url   = module.eks.oidc_issuer_url
  vpc_id            = module.vpc.vpc_id
}


module "rds" {
  source = "../../modules/rds"

  name = "shopkart-dev-postgres"
  snapshot_identifier = "shopkart-dev-postgres-snapshot" # Optional: Specify a snapshot identifier to restore from an existing snapshot. If you want to create a new RDS instance without restoring from a snapshot, you can remove this line or set it to null.
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids

  eks_security_group_id = module.eks.cluster_security_group_id

  instance_class = "db.t3.micro"

  database_name = "shopkart"
  username      = "shopkart"
}

module "external_secrets" {
  source = "../../modules/eso"

  name = "shopkart-dev-eso"

  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_issuer_url   = module.eks.oidc_issuer_url

  depends_on = [module.eks,module.alb_controller]
}

module "monitoring" {
  source = "../../modules/monitoring"

  grafana_admin_password = var.grafana_admin_password

  

  depends_on = [
    module.eks
  ]
  
}