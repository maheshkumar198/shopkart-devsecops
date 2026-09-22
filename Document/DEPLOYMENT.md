# ShopKart Deployment

## 1. Overview

ShopKart supports two main deployment workflows:

1. Local deployment using Docker Compose
2. AWS deployment using Terraform, Amazon EKS, Helm and Argo CD

The overall AWS deployment flow is:

```text
Terraform
   │
   ▼
AWS Infrastructure
   │
   ▼
Amazon EKS
   │
   ▼
Helm
   │
   ▼
Argo CD
   │
   ▼
ShopKart
````

---

# 2. Local Deployment

Local development uses Docker Compose to run the application stack.

The Compose configuration is:

```text
docker-compose.yml
```

The local stack includes:

```text
Frontend
Auth Service
Catalog Service
Order Service
PostgreSQL
Redis
```

---

# 3. Local Prerequisites

Install the following:

* Docker
* Docker Compose
* Node.js
* npm
* Git

Verify Docker:

```bash
docker --version
```

Verify Docker Compose:

```bash
docker compose version
```

Verify Node.js:

```bash
node --version
```

---

# 4. Clone the Repository

```bash
git clone https://github.com/maheshkumar198/shopkart-devsecops.git
```

Enter the project directory:

```bash
cd shopkart-devsecops
```

---

# 5. Environment Configuration

The repository contains:

```text
.env.example
```

Use it as a reference for the required environment variables.

Do not commit real credentials or secrets into Git.

For local development, create the required `.env` configuration according to the application's environment requirements.

---

# 6. Start the Local Application

Build and start all services:

```bash
docker compose up -d --build
```

Check the containers:

```bash
docker compose ps
```

View logs:

```bash
docker compose logs
```

View logs for a specific service:

```bash
docker compose logs auth-service
```

```bash
docker compose logs catalog-service
```

```bash
docker compose logs order-service
```

---

# 7. Local Application Ports

| Component       | Port |
| --------------- | ---: |
| Frontend        | 8080 |
| Auth Service    | 3001 |
| Catalog Service | 3002 |
| Order Service   | 3003 |
| PostgreSQL      | 5432 |
| Redis           | 6379 |

Frontend:

```text
http://localhost:8080
```

Auth Service:

```text
http://localhost:3001
```

Catalog Service:

```text
http://localhost:3002
```

Order Service:

```text
http://localhost:3003
```

---

# 8. Health Checks

Each backend service exposes a health endpoint.

Auth:

```bash
curl http://localhost:3001/health
```

Catalog:

```bash
curl http://localhost:3002/health
```

Order:

```bash
curl http://localhost:3003/health
```

The health endpoints can be used to verify that the services are running.

---

# 9. Metrics Checks

Each backend service exposes:

```text
/metrics
```

Auth:

```bash
curl http://localhost:3001/metrics
```

Catalog:

```bash
curl http://localhost:3002/metrics
```

Order:

```bash
curl http://localhost:3003/metrics
```

---

# 10. Stop the Local Environment

Stop the containers:

```bash
docker compose down
```

To rebuild the containers after application changes:

```bash
docker compose down
docker compose up -d --build
```

---

# 11. AWS Deployment Overview

The AWS deployment consists of several stages:

```text
1. Provision AWS Infrastructure
          ↓
2. Configure EKS Access
          ↓
3. Deploy Platform Components
          ↓
4. Deploy ShopKart with Helm
          ↓
5. Configure Argo CD
          ↓
6. Verify Application
          ↓
7. Verify Monitoring
```

---

# 12. Terraform Structure

Infrastructure code is located under:

```text
terraform/
```

Structure:

```text
terraform/
├── environments/
│   ├── dev/
│   └── prod/
│
└── modules/
    ├── vpc/
    ├── eks/
    ├── rds/
    ├── alb-controller/
    ├── eso/
    └── monitoring/
```

The reusable modules contain infrastructure components.

Environment directories contain environment-specific Terraform configuration.

---

# 13. Terraform Initialization

For the DEV environment:

```bash
cd terraform/environments/dev
```

Initialize Terraform:

```bash
terraform init
```

Validate the configuration:

```bash
terraform validate
```

Format Terraform files:

```bash
terraform fmt -recursive
```

Review the infrastructure plan:

```bash
terraform plan
```

Apply the infrastructure:

```bash
terraform apply
```

Review the plan carefully before applying infrastructure changes.

---

# 14. AWS Infrastructure

The Terraform configuration provisions infrastructure required by the application.

The architecture includes:

```text
VPC
 │
 ├── Public Subnets
 │
 ├── Private Subnets
 │
 ├── NAT Gateway
 │
 ├── Amazon EKS
 │
 └── Amazon RDS
```

Additional Kubernetes platform components include:

```text
AWS Load Balancer Controller
External Secrets Operator
Monitoring Stack
```

---

# 15. EKS Access

After the EKS cluster is available, configure the local kubeconfig:

```bash
aws eks update-kubeconfig \
  --region ap-south-1 \
  --name <cluster-name>
```

Verify access:

```bash
kubectl get nodes
```

Verify cluster information:

```bash
kubectl cluster-info
```

---

# 16. Verify Kubernetes Namespaces

List namespaces:

```bash
kubectl get namespaces
```

Check the ShopKart namespace:

```bash
kubectl get namespace shopkart
```

If the deployment uses another namespace configured through Helm values, use that namespace instead.

---

# 17. Deploying with Helm

The ShopKart Helm chart is located at:

```text
helm/shopkart/
```

Before deployment, inspect the chart:

```bash
helm lint ./helm/shopkart
```

Render the Kubernetes manifests without deploying:

```bash
helm template shopkart \
  ./helm/shopkart \
  -f ./helm/shopkart/values-dev.yaml
```

Install the application:

```bash
helm upgrade --install shopkart \
  ./helm/shopkart \
  -f ./helm/shopkart/values-dev.yaml
```

---

# 18. Verify Helm Deployment

Check Helm releases:

```bash
helm list -A
```

Check the ShopKart release:

```bash
helm status shopkart -n shopkart
```

List application resources:

```bash
kubectl get all -n shopkart
```

---

# 19. Verify Pods

```bash
kubectl get pods -n shopkart
```

For continuous monitoring:

```bash
kubectl get pods -n shopkart -w
```

A healthy deployment should eventually show the expected application pods in a running/ready state.

---

# 20. Verify Services

```bash
kubectl get svc -n shopkart
```

Expected application services include:

```text
Frontend
Auth Service
Catalog Service
Order Service
Redis
```

---

# 21. Verify Ingress

Check the Kubernetes Ingress:

```bash
kubectl get ingress -n shopkart
```

Detailed information:

```bash
kubectl describe ingress -n shopkart
```

The AWS Load Balancer Controller provisions the AWS Application Load Balancer based on the Kubernetes Ingress configuration.

---

# 22. Application Traffic Flow

The AWS deployment follows:

```text
Internet
    │
    ▼
AWS Application Load Balancer
    │
    ▼
Kubernetes Ingress
    │
    ▼
Frontend Service
    │
    ▼
Frontend Pod
```

Backend API traffic is routed from the frontend to the corresponding backend services.

---

# 23. External Secrets

Verify External Secrets Operator resources:

```bash
kubectl get externalsecret -n shopkart
```

Check the ClusterSecretStore:

```bash
kubectl get clustersecretstore
```

Describe an ExternalSecret:

```bash
kubectl describe externalsecret \
  <external-secret-name> \
  -n shopkart
```

The expected flow is:

```text
AWS Secrets Manager
        │
        ▼
External Secrets Operator
        │
        ▼
Kubernetes Secret
        │
        ▼
Application Pod
```

---

# 24. Redis Deployment

Check Redis:

```bash
kubectl get pods -n shopkart | grep redis
```

Check Redis resources:

```bash
kubectl get statefulset -n shopkart
```

```bash
kubectl get pvc -n shopkart
```

The Helm chart manages Redis using:

```text
redis-statefulset.yaml
redis-service.yaml
redis-pvc.yaml
```

---

# 25. Argo CD Deployment

Argo CD is used to synchronize the ShopKart application from Git.

The deployment flow is:

```text
GitHub
   │
   ▼
Argo CD
   │
   ▼
Helm
   │
   ▼
Amazon EKS
```

Check Argo CD applications:

```bash
kubectl get applications -n argocd
```

Check Argo CD pods:

```bash
kubectl get pods -n argocd
```

---

# 26. Argo CD Application Status

Inspect the ShopKart application:

```bash
kubectl get application \
  <application-name> \
  -n argocd
```

Detailed information:

```bash
kubectl describe application \
  <application-name> \
  -n argocd
```

A healthy application should report an appropriate synchronized and healthy state.

---

# 27. Monitoring Deployment

The monitoring stack runs in the monitoring namespace.

Check monitoring workloads:

```bash
kubectl get pods -n monitoring
```

Check services:

```bash
kubectl get svc -n monitoring
```

---

# 28. Prometheus

Port-forward Prometheus:

```bash
kubectl port-forward \
  -n monitoring \
  svc/prometheus-operated \
  9090:9090
```

Open:

```text
http://localhost:9090
```

Check application targets from:

```text
Status → Targets
```

The ShopKart ServiceMonitor targets should appear as active targets.

---

# 29. Grafana

Port-forward Grafana:

```bash
kubectl port-forward \
  -n monitoring \
  svc/kube-prometheus-stack-grafana \
  3000:80
```

Open:

```text
http://localhost:3000
```

The dashboard is stored in:

```text
monitoring/Graphana-Dashboard.json
```

The dashboard visualizes application and Node.js runtime metrics.

---

# 30. Deployment Verification

After deployment, verify the following.

### Kubernetes

```bash
kubectl get nodes
kubectl get pods -n shopkart
kubectl get svc -n shopkart
kubectl get ingress -n shopkart
```

### Helm

```bash
helm list -n shopkart
```

### Argo CD

```bash
kubectl get applications -n argocd
```

### Monitoring

```bash
kubectl get pods -n monitoring
```

### Application

Verify:

```text
Frontend
Health endpoints
API endpoints
```

---

# 31. Troubleshooting Deployment

If a pod is not running:

```bash
kubectl get pods -n shopkart
```

Then:

```bash
kubectl describe pod <pod-name> -n shopkart
```

Check logs:

```bash
kubectl logs <pod-name> -n shopkart
```

For a previous container:

```bash
kubectl logs <pod-name> \
  -n shopkart \
  --previous
```

---

# 32. Image Pull Problems

If a pod reports `ImagePullBackOff` or `ErrImagePull`:

```bash
kubectl describe pod <pod-name> -n shopkart
```

Check the configured image:

```bash
kubectl get deployment \
  <deployment-name> \
  -n shopkart \
  -o yaml
```

Verify the ECR repository:

```bash
aws ecr describe-repositories \
  --region ap-south-1
```

Verify images:

```bash
aws ecr describe-images \
  --repository-name shopkart/order-service \
  --region ap-south-1
```

---

# 33. Database Connectivity Problems

If an application cannot connect to PostgreSQL, verify:

```text
RDS status
Security groups
Private subnet routing
Database endpoint
Database port
Kubernetes Secret
Application environment variables
```

PostgreSQL uses:

```text
TCP 5432
```

The database should be reachable from the appropriate application network but should not require public internet exposure.

---

# 34. Redis Connectivity Problems

Verify Redis:

```bash
kubectl get pods -n shopkart | grep redis
```

Check Redis service:

```bash
kubectl get svc -n shopkart | grep redis
```

Check application configuration for the Redis service hostname and port.

Redis uses:

```text
TCP 6379
```

---

# 35. Deployment Rollout

Check deployment status:

```bash
kubectl rollout status \
  deployment/<deployment-name> \
  -n shopkart
```

Check rollout history:

```bash
kubectl rollout history \
  deployment/<deployment-name> \
  -n shopkart
```

---

# 36. Manual Rollback

If a Kubernetes deployment needs to be reverted:

```bash
kubectl rollout undo \
  deployment/<deployment-name> \
  -n shopkart
```

For GitOps-managed resources, the preferred long-term approach is to revert the corresponding Git configuration and allow Argo CD to reconcile the desired state.

---

# 37. Deployment Lifecycle

The complete deployment lifecycle is:

```text
Developer
    │
    ▼
GitHub
    │
    ▼
GitHub Actions
    │
    ├── Test
    ├── Security Scan
    ├── Docker Build
    └── ECR Push
    │
    ▼
Git / Helm Configuration
    │
    ▼
Argo CD
    │
    ▼
Amazon EKS
    │
    ├── Frontend
    ├── Auth
    ├── Catalog
    ├── Order
    └── Redis
    │
    ▼
Prometheus
    │
    ▼
Grafana
```

---

# 38. Production Deployment Considerations

Before deploying an environment intended for production use, verify:

* Terraform plan has been reviewed
* Correct AWS account and region are selected
* IAM permissions follow least privilege
* Secrets are stored externally
* Database is not publicly accessible
* ECR images are scanned
* Kubernetes resources have appropriate resource requests and limits
* Ingress configuration is correct
* Monitoring targets are healthy
* Argo CD application is synchronized
* Application health endpoints are responding

---

# 39. Deployment Summary

ShopKart uses different tools for different layers of deployment:

| Layer                | Tool                                   |
| -------------------- | -------------------------------------- |
| AWS Infrastructure   | Terraform                              |
| Container Build      | Docker                                 |
| Container Registry   | Amazon ECR                             |
| Kubernetes Packaging | Helm                                   |
| Kubernetes Platform  | Amazon EKS                             |
| GitOps Deployment    | Argo CD                                |
| Secrets              | AWS Secrets Manager + External Secrets |
| Metrics              | Prometheus                             |
| Dashboards           | Grafana                                |

The resulting deployment pipeline is:

```text
Terraform
   ↓
AWS
   ↓
EKS
   ↓
Helm
   ↓
Argo CD
   ↓
ShopKart
   ↓
Prometheus
   ↓
Grafana
```

---

# 40. Related Documentation

* [Architecture](ARCHITECTURE.md)
* [CI/CD](CI-CD.md)
* [Security](SECURITY.md)
* [Observability](OBSERVABILITY.md)
* [GitOps](GITOPS.md)
* [Troubleshooting](TROUBLESHOOTING.md)


