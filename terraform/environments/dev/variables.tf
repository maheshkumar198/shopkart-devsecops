variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "grafana_admin_password" {
  type      = string
  sensitive = true
  default = "Admin@123" #use env variable TF_VAR_graphana_admin_password="passs"
}