# Operations Guide

This document describes the routine operational activities for the ShopKart platform running on AWS EKS.

---

## 1. Platform Overview

ShopKart consists of:

- AWS EKS for Kubernetes workloads
- Amazon ECR for container images
- Amazon RDS PostgreSQL for persistent application data
- Redis for caching and cart data
- AWS Secrets Manager for sensitive configuration
- External Secrets Operator for Kubernetes secret synchronization
- AWS Load Balancer Controller for ingress
- Helm for application packaging
- Argo CD for GitOps-based deployment
- Terraform for infrastructure management
- Prometheus for metrics collection
- Grafana for visualization

---

## 2. Daily Health Check

Start with the Kubernetes cluster:

```bash
kubectl get nodes
````

Expected:

```text
STATUS: Ready
```

Check all ShopKart pods:

```bash
kubectl get pods -n shopkart
```

Check services:

```bash
kubectl get svc -n shopkart
```

Check ingress:

```bash
kubectl get ingress -n shopkart
```

Check recent events:

```bash
kubectl get events -n shopkart --sort-by=.lastTimestamp
```

---

## 3. Application Health

Each backend service exposes a health endpoint.

Test from inside the cluster or through the appropriate service endpoint:

```bash
curl http://<service>:<port>/health
```

A healthy application should return a successful HTTP response.

The main services are:

```text
auth-service
catalog-service
order-service
```

---

## 4. Pod Health

Check pod status:

```bash
kubectl get pods -n shopkart
```

For more details:

```bash
kubectl describe pod <pod-name> -n shopkart
```

Check resource consumption:

```bash
kubectl top pods -n shopkart
```

Check node resources:

```bash
kubectl top nodes
```

Look for:

* Restarting containers
* High CPU usage
* High memory usage
* Pending pods
* OOMKilled containers
* Image pull failures

---

## 5. Application Logs

View logs for a deployment:

```bash
kubectl logs deployment/auth-service -n shopkart
```

```bash
kubectl logs deployment/catalog-service -n shopkart
```

```bash
kubectl logs deployment/order-service -n shopkart
```

Follow logs:

```bash
kubectl logs -f deployment/order-service -n shopkart
```

For a specific pod:

```bash
kubectl logs <pod-name> -n shopkart
```

If the container restarted:

```bash
kubectl logs <pod-name> -n shopkart --previous
```

---

## 6. Deployment Verification

After a deployment, verify the rollout:

```bash
kubectl rollout status deployment/auth-service -n shopkart
kubectl rollout status deployment/catalog-service -n shopkart
kubectl rollout status deployment/order-service -n shopkart
```

Check deployment status:

```bash
kubectl get deployments -n shopkart
```

Verify the running image:

```bash
kubectl get deployment auth-service -n shopkart \
  -o jsonpath='{.spec.template.spec.containers[*].image}'
```

Repeat for other services when required.

---

## 7. Rollback

If a deployment introduces a problem, inspect rollout history:

```bash
kubectl rollout history deployment/<deployment-name> -n shopkart
```

Rollback:

```bash
kubectl rollout undo deployment/<deployment-name> -n shopkart
```

Verify:

```bash
kubectl rollout status deployment/<deployment-name> -n shopkart
```

With GitOps, the preferred long-term approach is to revert the problematic Git change so that Git remains the source of truth.

---

## 8. Argo CD Operations

Check Argo CD applications:

```bash
kubectl get applications -n argocd
```

Check application status:

```bash
kubectl describe application <application-name> -n argocd
```

The normal GitOps flow is:

```text
Git Change
    ↓
GitHub Actions
    ↓
Container Image
    ↓
ECR
    ↓
Helm Configuration
    ↓
Argo CD
    ↓
EKS
```

Argo CD continuously compares the desired state in Git with the live Kubernetes state.

---

## 9. Checking GitOps Synchronization

Check whether an application is synchronized:

```bash
kubectl get application <application-name> -n argocd
```

Important states include:

```text
Synced
OutOfSync
Healthy
Degraded
Progressing
```

If an application is `OutOfSync`, investigate the difference before manually changing Kubernetes resources.

The preferred correction is normally:

```text
Identify difference
      ↓
Update Git
      ↓
Commit
      ↓
Push
      ↓
Argo CD reconciliation
```

---

## 10. Helm Operations

List Helm releases:

```bash
helm list -A
```

Validate the ShopKart chart:

```bash
helm lint helm/shopkart
```

Render the chart locally:

```bash
helm template shopkart helm/shopkart
```

Render with DEV values:

```bash
helm template shopkart helm/shopkart \
  -f helm/shopkart/values-dev.yaml
```

The repository contains environment-specific Helm values for:

```text
DEV
QA
PROD
```

Infrastructure implementation should be checked separately because the Terraform environment directories currently do not represent identical levels of implementation.

---

## 11. Container Image Operations

ShopKart images are stored in Amazon ECR.

Expected services:

```text
auth-service
catalog-service
order-service
```

List images:

```bash
aws ecr describe-images \
  --repository-name shopkart/auth-service \
  --region ap-south-1
```

Repeat for the other repositories as required.

Image tags are associated with Git versions, allowing a deployed image to be traced back to a source revision.

---

## 12. Database Operations

ShopKart uses PostgreSQL for persistent application data.

Primary application data includes:

```text
users
products
orders
order_items
```

Before performing database maintenance:

1. Confirm the affected environment.
2. Verify database connectivity.
3. Confirm backup/recovery procedures.
4. Avoid destructive commands unless explicitly required.
5. Validate application connectivity after the change.

Application database problems should first be investigated through application logs and configuration rather than modifying the database immediately.

---

## 13. Redis Operations

Redis is used by ShopKart for application data such as:

* Catalog caching
* Shopping cart data

Check Redis:

```bash
kubectl get pods -n shopkart | grep redis
```

Check the StatefulSet:

```bash
kubectl get statefulset -n shopkart
```

Check Redis service:

```bash
kubectl get svc -n shopkart | grep redis
```

If Redis becomes unavailable, inspect:

```bash
kubectl describe pod <redis-pod> -n shopkart
kubectl logs <redis-pod> -n shopkart
```

---

## 14. Secrets Operations

Sensitive application configuration should not be stored directly in Git.

The intended flow is:

```text
AWS Secrets Manager
        ↓
External Secrets Operator
        ↓
Kubernetes Secret
        ↓
Application Pod
```

Check ExternalSecrets:

```bash
kubectl get externalsecret -n shopkart
```

Check secret stores:

```bash
kubectl get clustersecretstore
```

Check generated Kubernetes Secrets:

```bash
kubectl get secrets -n shopkart
```

Do not expose secret values when troubleshooting.

---

## 15. Prometheus Operations

Check ServiceMonitors:

```bash
kubectl get servicemonitor -n shopkart
```

Application metrics are exposed through:

```text
/metrics
```

Verify an application's metrics endpoint:

```bash
curl http://<service>:<port>/metrics
```

Prometheus should discover the application through the configured ServiceMonitor.

Important application metrics include:

* HTTP request count
* HTTP error count
* Request duration
* Authentication activity
* Node.js runtime metrics
* Memory metrics
* Event loop metrics

---

## 16. Grafana Operations

Grafana is used to visualize Prometheus metrics.

Typical operational checks include:

```text
Prometheus targets
        ↓
Prometheus metrics
        ↓
Grafana data source
        ↓
ShopKart dashboard
```

If the dashboard shows no data:

1. Check Prometheus targets.
2. Verify the Prometheus data source.
3. Test `up`.
4. Test a ShopKart metric.
5. Check the dashboard time range.
6. Check the PromQL query.

Example:

```promql
up
```

Example ShopKart query:

```promql
shopkart_http_requests_total
```

---

## 17. Monitoring Request Latency

The application exposes HTTP request duration metrics.

A P95 query can be used to identify high-latency routes:

```promql
histogram_quantile(
  0.95,
  sum by (le, route) (
    rate(shopkart_http_request_duration_seconds_bucket[5m])
  )
)
```

Interpretation:

* P50 = median request latency
* P95 = approximately 95% of observed requests are at or below this value
* P99 = approximately 99% are at or below this value

Latency should be investigated together with:

* Request rate
* Error rate
* CPU
* Memory
* Database performance
* Redis performance

---

## 18. Production Change Procedure

Before making an infrastructure or application change:

### Step 1 — Identify the change

Document:

```text
What is changing?
Why is it changing?
Which environment is affected?
```

### Step 2 — Validate the current state

Check:

```bash
kubectl get nodes
kubectl get pods -n shopkart
kubectl get ingress -n shopkart
```

### Step 3 — Check monitoring

Review:

* Prometheus
* Grafana
* Application health
* Error rate
* Request latency

### Step 4 — Make the change

Prefer the appropriate source of truth:

```text
Application → Git
Infrastructure → Terraform
Kubernetes application configuration → Helm/Git
Deployment state → Argo CD
```

### Step 5 — Verify

Check:

```bash
kubectl rollout status deployment/<deployment-name> -n shopkart
```

Then verify application functionality and monitoring.

---

## 19. Post-Deployment Validation

After deployment, verify:

### Kubernetes

```bash
kubectl get pods -n shopkart
kubectl get svc -n shopkart
kubectl get ingress -n shopkart
```

### Application

```text
Health endpoint
Login
Product listing
Product details
Cart
Checkout
Order history
```

### Monitoring

Verify:

```text
Prometheus targets → UP
Grafana → Data available
HTTP request metrics → Increasing
Error metrics → Expected behavior
Latency → Within expected range
```

### GitOps

Verify:

```text
Argo CD → Synced
Argo CD → Healthy
```

---

## 20. Incident Investigation

For an application incident, collect information before making changes.

Record:

```text
Time of incident
Affected service
Affected environment
Observed error
Pod status
Application logs
Recent deployment
Recent Git change
Prometheus metrics
Grafana observations
Infrastructure changes
```

Example investigation flow:

```text
Incident
   ↓
Check application response
   ↓
Check Kubernetes pods
   ↓
Check recent deployment
   ↓
Check logs
   ↓
Check Prometheus/Grafana
   ↓
Check dependencies
   ↓
Identify root cause
   ↓
Apply corrective action
   ↓
Verify recovery
   ↓
Document incident
```

---

## 21. Operational Principles

ShopKart follows these operational principles:

### Infrastructure as Code

Terraform manages AWS infrastructure.

### GitOps

Git represents the desired Kubernetes application state.

### Immutable Images

Container images are built and stored in ECR rather than modified after deployment.

### Secret Separation

Sensitive credentials are retrieved from AWS Secrets Manager rather than stored in Git.

### Observability

Prometheus and Grafana provide application and runtime visibility.

### Controlled Changes

Changes should be validated before deployment and verified afterward.

### Traceability

Application versions can be traced through:

```text
Git Commit
    ↓
GitHub Actions
    ↓
Container Image
    ↓
ECR
    ↓
Helm
    ↓
Argo CD
    ↓
EKS
```

This provides an operational path from source code to the running workload.

