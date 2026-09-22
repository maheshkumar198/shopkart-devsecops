output "alb_controller_role_arn" {
  value = aws_iam_role.alb_controller.arn
}

output "alb_controller_release" {
  value = helm_release.alb_controller.name
}
