resource "helm_release" "kube_prometheus_stack" {
  name             = "kube-prometheus-stack"
  namespace        = "monitoring"
  create_namespace = true

  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"

  wait    = true
  timeout = 900

  values = [
    yamlencode({
      grafana = {
        enabled = true

        persistence = {
        enabled = true
        storageClassName = "gp3"
        type    = "pvc"
        size    = "10Gi"
      }

        service = {
          type = "ClusterIP"
        }

        adminPassword = var.grafana_admin_password
      }

      prometheus = {
        prometheusSpec = {
          retention = "15d"
        }
      }
      
      
      
      alertmanager = {
        enabled = true
      }

      kubeStateMetrics = {
        enabled = true
      }

      nodeExporter = {
        enabled = true
      }
    })
  ]
}