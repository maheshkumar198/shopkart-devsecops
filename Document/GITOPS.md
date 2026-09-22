
# ShopKart GitOps

## 1. Overview

ShopKart uses GitOps principles for Kubernetes application deployment.

Git is used as the source of truth for the desired application configuration.

Argo CD continuously compares the desired configuration stored in Git with the actual state of the Kubernetes cluster and synchronizes the application when required.

The deployment stack is:

```text
GitHub
   │
   ▼
Helm
   │
   ▼
Argo CD
   │
   ▼
Amazon EKS
````

---

# 2. GitOps Architecture

```text
                         GitHub Repository
                                │
                                │
                                ▼
                         Helm Chart
                                │
                                │
                                ▼
                            Argo CD
                                │
                                │ Sync
                                ▼
                         Amazon EKS
                                │
                                ▼
                       ShopKart Workloads
```

The desired Kubernetes state is maintained in Git.

Argo CD is responsible for applying that desired state to the EKS cluster.

---

# 3. Why GitOps

The GitOps approach provides:

* Version-controlled deployment configuration
* Deployment traceability
* Git-based change history
* Declarative application configuration
* Automated synchronization
* Drift detection
* Self-healing
* Easier rollback through Git history

Instead of manually changing Kubernetes resources, changes are made in Git and synchronized by Argo CD.

---

# 4. Helm as the Deployment Package

The Kubernetes application is packaged using Helm.

The chart is located at:

```text
helm/shopkart/
```

Structure:

```text
helm/
└── shopkart/
    ├── Chart.yaml
    ├── values.yaml
    ├── values-dev.yaml
    ├── values-qa.yaml
    ├── values-prod.yaml
    └── templates/
```

The Helm templates define the Kubernetes resources required by the application.

---

# 5. Helm Templates

The chart contains templates for application and infrastructure-related Kubernetes resources.

Examples include:

```text
auth-deployment.yaml
auth-service.yaml

catalog-deployment.yaml
catalog-service.yaml

order-deployment.yaml
order-service.yaml

frontend-deployment.yaml
frontend-service.yaml

redis-statefulset.yaml
redis-service.yaml
redis-pvc.yaml

ingress.yaml
namespace.yaml
configmap.yaml

cluster-secret-store.yaml
external-secret.yaml
external-secret-jwt.yaml

servicemonitors.yaml
```

The chart also contains:

```text
argocd-application.yaml
```

for Argo CD application configuration.

---

# 6. Environment-Specific Configuration

The Helm chart contains separate values files:

```text
values-dev.yaml
values-qa.yaml
values-prod.yaml
```

The purpose is to keep a common application chart while allowing environment-specific configuration.

Conceptually:

```text
                     Helm Chart
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
       DEV Values     QA Values     PROD Values
          │              │              │
          ▼              ▼              ▼
         DEV            QA             PROD
```

This avoids maintaining completely separate Kubernetes manifests for each environment.

---

# 7. Argo CD

Argo CD is the GitOps deployment controller used by ShopKart.

Argo CD watches the Git repository and manages the Kubernetes application.

The high-level flow is:

```text
Developer
    │
    ▼
Git Commit
    │
    ▼
GitHub
    │
    ▼
Argo CD
    │
    ▼
Kubernetes API
    │
    ▼
Amazon EKS
```

---

# 8. Desired State vs Actual State

GitOps separates the desired state from the actual cluster state.

### Desired State

Stored in Git:

```text
Helm Chart
+
Environment Values
```

### Actual State

Running inside EKS:

```text
Deployments
Services
Pods
Ingress
Secrets
Redis
ServiceMonitors
```

Argo CD compares these two states.

```text
             Git
              │
              │ Desired State
              ▼
           Argo CD
              │
              │ Compare
              ▼
         Kubernetes
              │
              │ Actual State
              ▼
            EKS
```

---

# 9. Synchronization

When Git contains a change to the desired application state, Argo CD can synchronize that change to Kubernetes.

Example:

```text
Developer
    │
    │ Update image tag
    ▼
GitHub
    │
    ▼
Argo CD detects change
    │
    ▼
Helm renders configuration
    │
    ▼
Kubernetes resources updated
    │
    ▼
New application version runs on EKS
```

---

# 10. Automated Sync

The Argo CD application configuration supports automated synchronization.

The configuration can include:

```yaml
syncPolicy:
  automated:
    prune: true
    selfHeal: true
```

### Automated Sync

Argo CD automatically synchronizes changes from Git.

### Prune

Resources removed from the desired configuration can be removed from the cluster.

### Self-Heal

If a managed resource is changed manually in the cluster and differs from the desired Git configuration, Argo CD can restore it to the desired state.

---

# 11. Drift Detection

GitOps allows Kubernetes drift to be detected.

For example:

```text
Git
 │
 │ Desired:
 │ replicas = 2
 ▼
Argo CD
 │
 ▼
EKS
 │
 │ Actual:
 │ replicas = 3
 ▼
Drift Detected
```

With self-healing enabled, Argo CD can reconcile the resource back to the configuration stored in Git.

---

# 12. Git-Based Deployment

A deployment change is made by changing the desired configuration in Git.

For example:

```text
values-dev.yaml
```

could contain an application image reference.

A new application version can then be represented by changing the image tag.

Conceptually:

```text
Old:

image:
  tag: abc123


New:

image:
  tag: def456
```

After the change is committed, Argo CD can synchronize the new desired state to EKS.

---

# 13. Image Traceability

Docker images are tagged using the Git commit SHA.

Example:

```text
shopkart/order-service:def456
```

This creates a relationship between:

```text
Git Commit
     │
     ▼
Docker Image
     │
     ▼
Amazon ECR
     │
     ▼
Kubernetes Deployment
```

This makes it easier to determine which source revision is running in the cluster.

---

# 14. CI and GitOps Responsibilities

ShopKart separates CI from Kubernetes deployment.

## GitHub Actions

GitHub Actions handles:

```text
Source Code
    │
    ▼
Tests
    │
    ▼
Security Scanning
    │
    ▼
Docker Build
    │
    ▼
Amazon ECR
```

## Argo CD

Argo CD handles:

```text
Git
 │
 ▼
Helm
 │
 ▼
Kubernetes
 │
 ▼
EKS
```

Therefore:

```text
GitHub Actions = CI / Image Delivery

Argo CD = Kubernetes Continuous Delivery
```

---

# 15. GitOps Environment Flow

The project follows an environment promotion model:

```text
feature/*
     │
     ▼
 develop
     │
     ▼
    DEV
     │
     ▼
     QA
     │
     ▼
    main
     │
     ▼
    PROD
```

The Helm chart provides environment-specific values:

```text
values-dev.yaml
values-qa.yaml
values-prod.yaml
```

The same application chart can therefore be configured for different environments.

---

# 16. GitOps Deployment Flow

A typical deployment looks like:

```text
Developer
    │
    ▼
Feature Branch
    │
    ▼
Pull Request
    │
    ▼
develop
    │
    ▼
GitHub Actions
    │
    ├── Tests
    ├── Security Scans
    └── Docker Build
    │
    ▼
Amazon ECR
    │
    ▼
Environment Configuration
    │
    ▼
Argo CD
    │
    ▼
Amazon EKS
    │
    ▼
ShopKart
```

---

# 17. Kubernetes Resources Managed by Helm

The ShopKart Helm chart manages application resources such as:

```text
Namespace
Deployments
Services
StatefulSet
PersistentVolumeClaim
Ingress
ConfigMap
ExternalSecret
ClusterSecretStore
ServiceMonitor
Argo CD Application
```

This provides a declarative definition of the application platform.

---

# 18. Redis and GitOps

Redis is deployed as part of the Helm application stack.

Resources include:

```text
redis-statefulset.yaml
redis-service.yaml
redis-pvc.yaml
```

The Redis configuration is therefore version controlled together with the application deployment configuration.

---

# 19. Application Secrets and GitOps

GitOps does not require secret values to be stored directly in Git.

Instead, the repository contains the configuration required to retrieve secrets.

```text
Git
 │
 │ ExternalSecret configuration
 ▼
Argo CD
 │
 ▼
External Secrets Operator
 │
 ▼
AWS Secrets Manager
 │
 ▼
Kubernetes Secret
 │
 ▼
Application
```

The secret value itself remains in AWS Secrets Manager.

---

# 20. Monitoring and GitOps

Monitoring resources are also represented through Kubernetes configuration.

The Helm chart contains:

```text
servicemonitors.yaml
```

These resources allow Prometheus to discover and scrape application metrics.

The flow is:

```text
Git
 │
 ▼
Argo CD
 │
 ▼
ServiceMonitor
 │
 ▼
Prometheus
 │
 ▼
Grafana
```

---

# 21. Rollback

One benefit of Git-based deployment is that configuration changes are version controlled.

If a deployment configuration needs to be reverted, the Git change can be reverted to a previous known configuration.

Conceptually:

```text
Version A
   │
   ▼
Version B
   │
   ▼
Version C
   │
   │ Problem
   ▼
Revert Git Change
   │
   ▼
Version B
```

Argo CD then synchronizes the reverted desired state to Kubernetes.

The exact rollback behavior depends on the image tag and deployment configuration retained in Git/ECR.

---

# 22. Drift Prevention

Manual changes to managed Kubernetes resources should generally be avoided.

Preferred workflow:

```text
Wrong approach:

kubectl edit deployment
        │
        ▼
Manual Cluster Change


Preferred:

Git Change
    │
    ▼
Pull Request
    │
    ▼
Review
    │
    ▼
Argo CD
    │
    ▼
EKS
```

This keeps the deployment configuration auditable and version controlled.

---

# 23. GitOps Benefits

The ShopKart GitOps implementation provides:

### Version Control

Deployment configuration is stored in Git.

### Auditability

Changes can be tracked through Git history and pull requests.

### Reproducibility

The Kubernetes application configuration is declarative.

### Drift Detection

Argo CD compares Git state with cluster state.

### Self-Healing

Argo CD can reconcile supported resources back to the desired state.

### Deployment Traceability

Git commits can be associated with Docker image tags.

### Reduced Manual Operations

Application deployment does not require manually applying every Kubernetes resource.

---

# 24. GitOps Architecture Summary

```text
                         GitHub
                            │
                            │
                            ▼
                     Helm Configuration
                            │
                            ▼
                         Argo CD
                            │
                 ┌──────────┴──────────┐
                 │                     │
                 ▼                     ▼
            Desired State          Kubernetes
                                      │
                                      ▼
                                  Amazon EKS
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
                Frontend          Backend            Redis
                                   Services
```

---

# 25. Related Documentation

* [Architecture](ARCHITECTURE.md)
* [CI/CD](CI-CD.md)
* [Security](SECURITY.md)
* [Observability](OBSERVABILITY.md)
* [Deployment](DEPLOYMENT.md)
* [Troubleshooting](TROUBLESHOOTING.md)

