
#vpc module outputs

output "vpc_id" {
  value = module.vpc.vpc_id
}

output "public_subnet_ids" {
  value = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  value = module.vpc.private_subnet_ids
}
#eks

output "oidc_issuer_url" {
  value = module.eks.oidc_issuer_url
}

output "oidc_provider_arn" {
  value = module.eks.oidc_provider_arn
}

output "rds_endpoint" {
  description = "ShopKart RDS endpoint"
  value       = module.rds.endpoint
}

output "rds_port" {
  description = "ShopKart RDS port"
  value       = module.rds.port
}

output "rds_database_name" {
  description = "ShopKart database name"
  value       = module.rds.database_name
}

output "rds_username" {
  description = "ShopKart RDS username"
  value       = module.rds.username
}

output "rds_master_user_secret_arn" {
  description = "RDS master credentials secret ARN"
  value       = module.rds.master_user_secret_arn
}