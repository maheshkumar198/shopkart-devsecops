# Troubleshooting Guide

This document covers common issues encountered while developing, deploying, and operating the ShopKart microservices platform.

---

## 1. Docker Build Fails with `ENOSPC`

### Error

```text
no space left on device
````

### Cause

The Docker host has insufficient disk space, often caused by:

* Old Docker images
* Unused containers
* Build cache
* Unused volumes

### Check Disk Usage

```bash
df -h
```

Check Docker usage:

```bash
docker system df
```

### Cleanup

```bash
docker system prune
```

For more aggressive cleanup:

```bash
docker system prune -a
```

> Use `-a` carefully because it removes unused images.

---

## 2. Node.js Engine Version Mismatch

### Error

```text
Unsupported engine
Required: node >=20
Current: node v18
```

### Cause

The application dependencies require a newer Node.js version.

### Check Version

```bash
node --version
npm --version
```

### Solution

Use the Node.js version required by the service's `package.json`.

For Docker builds, verify the base image in the service's `Dockerfile`.

Example:

```dockerfile
FROM node:20
```

Then rebuild:

```bash
docker compose build --no-cache
```

---

## 3. MySQL Authentication Error

### Error

```text
ER_NOT_SUPPORTED_AUTH_MODE
```

or:

```text
Access denied for user
```

### Checks

Verify the database credentials:

```bash
mysql -u <user> -p
```

Check the application's database environment variables.

For Docker Compose:

```bash
docker compose config
```

Verify that the application and database are using compatible credentials and authentication configuration.

---

## 4. Service Container Is Not Starting

Check running containers:

```bash
docker compose ps
```

Check logs:

```bash
docker compose logs <service-name>
```

Example:

```bash
docker compose logs auth-service
```

Follow logs:

```bash
docker compose logs -f auth-service
```

Check the container directly:

```bash
docker ps
docker inspect <container-id>
```

---

## 5. Kubernetes Pod Is Not Running

Check pods:

```bash
kubectl get pods -A
```

For the ShopKart namespace:

```bash
kubectl get pods -n shopkart
```

Describe the affected pod:

```bash
kubectl describe pod <pod-name> -n shopkart
```

Check logs:

```bash
kubectl logs <pod-name> -n shopkart
```

For a previous container:

```bash
kubectl logs <pod-name> -n shopkart --previous
```

### Common Pod States

| Status                       | Common Cause                             |
| ---------------------------- | ---------------------------------------- |
| `Pending`                    | Scheduling, resource, PVC or node issue  |
| `CrashLoopBackOff`           | Application repeatedly crashes           |
| `ImagePullBackOff`           | Image or registry authentication problem |
| `ErrImagePull`               | Image cannot be pulled                   |
| `CreateContainerConfigError` | ConfigMap/Secret configuration problem   |
| `OOMKilled`                  | Container exceeded memory limit          |

---

## 6. ImagePullBackOff / ErrImagePull

Check the pod events:

```bash
kubectl describe pod <pod-name> -n shopkart
```

Verify the image:

```bash
kubectl get deployment <deployment-name> -n shopkart \
  -o jsonpath='{.spec.template.spec.containers[*].image}'
```

Verify that the image exists in Amazon ECR.

Typical ShopKart ECR images:

```text
auth-service
catalog-service
order-service
```

If the image tag is based on the Git commit SHA, verify that the expected SHA image exists in ECR.

---

## 7. Application Returns `401 Unauthorized`

### Possible Causes

* Invalid JWT
* Expired JWT
* Missing `Authorization` header
* Incorrect JWT secret
* Stale token stored by the frontend

Check the request:

```text
Authorization: Bearer <token>
```

Check authentication service logs:

```bash
kubectl logs deployment/auth-service -n shopkart
```

For frontend authentication issues, clear the stored token and log in again.

---

## 8. Application Returns `404 Not Found`

Check the service logs:

```bash
kubectl logs deployment/<service-name> -n shopkart
```

Verify the exposed routes:

```bash
kubectl get svc -n shopkart
```

Check ingress configuration:

```bash
kubectl get ingress -n shopkart
kubectl describe ingress <ingress-name> -n shopkart
```

A `404` can originate from:

* Incorrect frontend API URL
* Incorrect application route
* Incorrect ingress path
* Request reaching the wrong service

---

## 9. Service-to-Service Communication Failure

ShopKart services communicate through Kubernetes services.

Check services:

```bash
kubectl get svc -n shopkart
```

Check endpoints:

```bash
kubectl get endpoints -n shopkart
```

Test DNS resolution from a pod:

```bash
kubectl exec -it <pod-name> -n shopkart -- sh
```

Then:

```bash
nslookup <service-name>
```

or:

```bash
curl http://<service-name>:<port>/health
```

Check:

* Kubernetes Service name
* Service port
* Target port
* Deployment labels
* Application listening port

---

## 10. Redis Connection Problems

Check Redis resources:

```bash
kubectl get statefulset -n shopkart
kubectl get pods -n shopkart | grep redis
kubectl get svc -n shopkart | grep redis
```

Check Redis logs:

```bash
kubectl logs <redis-pod> -n shopkart
```

Test connectivity from an application pod:

```bash
kubectl exec -it <pod-name> -n shopkart -- sh
```

Then verify that the configured Redis hostname and port are reachable.

---

## 11. PostgreSQL / RDS Connection Problems

Check the application logs:

```bash
kubectl logs deployment/auth-service -n shopkart
kubectl logs deployment/catalog-service -n shopkart
kubectl logs deployment/order-service -n shopkart
```

Verify:

* RDS endpoint
* Database name
* Username
* Password
* Port
* Security group rules
* Kubernetes Secret / ExternalSecret
* Network connectivity

Check External Secrets:

```bash
kubectl get externalsecret -n shopkart
kubectl describe externalsecret <name> -n shopkart
```

Check generated Secrets:

```bash
kubectl get secrets -n shopkart
```

Do not print secret values in troubleshooting output.

---

## 12. External Secrets Not Syncing

Check the ExternalSecret:

```bash
kubectl get externalsecret -n shopkart
```

Describe it:

```bash
kubectl describe externalsecret <name> -n shopkart
```

Check the ClusterSecretStore:

```bash
kubectl get clustersecretstore
kubectl describe clustersecretstore <name>
```

Common causes:

* Incorrect AWS Secrets Manager secret name
* Incorrect IAM permissions
* Incorrect service account / IRSA configuration
* Secret does not exist
* External Secrets Operator is not running

Check the operator:

```bash
kubectl get pods -A | grep external
```

---

## 13. Ingress / AWS Load Balancer Not Working

Check ingress:

```bash
kubectl get ingress -n shopkart
```

Describe it:

```bash
kubectl describe ingress <ingress-name> -n shopkart
```

Check the AWS Load Balancer Controller:

```bash
kubectl get pods -n kube-system | grep aws-load-balancer
```

Check controller logs:

```bash
kubectl logs -n kube-system \
  deployment/aws-load-balancer-controller
```

Verify:

* Subnet tags
* Security groups
* IAM permissions
* Ingress annotations
* Target health
* AWS Load Balancer Controller status

A common AWS Load Balancer Controller error is:

```text
could not find any suitable subnets for creating the ELB
```

This can occur when the required subnet tags are missing or incorrect.

---

## 14. Terraform Plan/Apply Fails

Always validate first:

```bash
terraform fmt -check
terraform validate
terraform plan
```

Check the current state:

```bash
terraform state list
```

Inspect a resource:

```bash
terraform state show <resource>
```

### Resource Exists in AWS but Terraform Does Not Manage It

Terraform import can bring an existing resource into the Terraform state:

```bash
terraform import <resource-address> <resource-id>
```

After importing:

```bash
terraform plan
```

The configuration should be reconciled with the imported resource.

---

## 15. Terraform State Is Out of Sync

If infrastructure was changed manually in AWS, Terraform may detect drift.

Run:

```bash
terraform plan
```

Review the proposed changes before applying them.

Do not immediately run:

```bash
terraform apply
```

until the difference between the Terraform configuration and the real infrastructure is understood.

---

## 16. Kubernetes StorageClass / EBS CSI Problems

Check StorageClasses:

```bash
kubectl get storageclass
```

Check EBS CSI pods:

```bash
kubectl get pods -n kube-system | grep ebs-csi
```

Check the EBS CSI addon:

```bash
aws eks describe-addon \
  --cluster-name <cluster-name> \
  --addon-name aws-ebs-csi-driver
```

For a PVC:

```bash
kubectl get pvc -n shopkart
kubectl describe pvc <pvc-name> -n shopkart
```

Common causes:

* EBS CSI driver unavailable
* Incorrect IAM role
* Incorrect StorageClass
* Availability Zone constraints
* PVC waiting for a pod to be scheduled

The GP3 StorageClass uses:

```text
ebs.csi.aws.com
```

with:

```text
type: gp3
```

---

## 17. Argo CD Application Not Syncing

Check Argo CD applications:

```bash
kubectl get applications -A
```

Describe the application:

```bash
kubectl describe application <application-name> -n argocd
```

Check Argo CD components:

```bash
kubectl get pods -n argocd
```

Typical issues:

* Incorrect Git repository URL
* Incorrect branch
* Incorrect Helm path
* Invalid Helm values
* Kubernetes resource conflict
* Missing CRD
* Repository authentication problem

Check the application status from the Argo CD UI or CLI.

---

## 18. Argo CD Shows OutOfSync

`OutOfSync` means the desired state stored in Git differs from the current Kubernetes state.

Investigate:

```bash
kubectl get application <application-name> -n argocd -o yaml
```

Compare the Git configuration with the live Kubernetes resources.

If the change was intentional, update Git.

Avoid manually changing Kubernetes resources when GitOps is managing them because Argo CD may reconcile them back to the Git-defined state.

---

## 19. Prometheus Target Is Down

Check ServiceMonitors:

```bash
kubectl get servicemonitor -n shopkart
```

Check the application service:

```bash
kubectl get svc -n shopkart
```

Verify the metrics endpoint:

```bash
kubectl port-forward svc/<service-name> <local-port>:<service-port>
```

Then:

```bash
curl http://localhost:<local-port>/metrics
```

Check Prometheus targets from the Prometheus UI.

Verify:

* ServiceMonitor selector
* Service labels
* Service port name
* `/metrics` path
* Application is exposing Prometheus metrics
* Prometheus is discovering the ServiceMonitor

---

## 20. Grafana Shows No Data

Check Prometheus first.

If Prometheus targets are healthy, verify the Grafana data source.

Test a basic PromQL query:

```promql
up
```

Then test ShopKart metrics:

```promql
shopkart_http_requests_total
```

For request rate:

```promql
sum(
  rate(shopkart_http_requests_total[5m])
)
```

For HTTP errors:

```promql
sum(
  rate(shopkart_http_errors_total[5m])
)
```

For P95 latency:

```promql
histogram_quantile(
  0.95,
  sum by (le, route) (
    rate(shopkart_http_request_duration_seconds_bucket[5m])
  )
)
```

---

## 21. GitHub Actions AWS Authentication Failure

For AWS OIDC failures, verify:

```yaml
permissions:
  id-token: write
  contents: read
```

Check that the IAM role trust policy matches the GitHub OIDC token claims.

The trust relationship must correctly match:

```text
token.actions.githubusercontent.com:aud
```

and:

```text
token.actions.githubusercontent.com:sub
```

Also verify that the GitHub Actions job is using the expected GitHub Environment.

Do not solve OIDC failures by adding long-lived AWS access keys to GitHub Secrets.

---

## 22. ECR Push Fails in GitHub Actions

Check AWS authentication first.

Verify:

```bash
aws sts get-caller-identity
```

Then verify ECR login:

```bash
aws ecr get-login-password --region ap-south-1 |
docker login \
  --username AWS \
  --password-stdin <account-id>.dkr.ecr.ap-south-1.amazonaws.com
```

Make sure the ECR repository exists and the GitHub Actions role has permission to push images.

### GitHub Actions Variable Scope

A shell variable created in one GitHub Actions step does not automatically exist in the next step.

Persist values through `GITHUB_ENV`:

```bash
echo "ECR_IMAGE=$ECR_IMAGE" >> "$GITHUB_ENV"
```

---

## 23. SonarQube Indexing the Same File Twice

### Error

```text
File .../package.json can't be indexed twice
```

### Cause

The SonarQube scan configuration is overlapping directories or project configuration.

Keep one clear scan root and exclude generated/dependency directories such as:

```text
node_modules/
coverage/
```

For JavaScript/Node.js coverage, use the appropriate LCOV report:

```properties
sonar.javascript.lcov.reportPaths=services/<service-name>/coverage/lcov.info
```

---

## 24. Snyk Reports No Supported Files

### Error

```text
SNYK-CLI-0008
No supported files found
```

### Cause

Snyk was executed from a location where it could not discover the Node.js dependency manifests.

ShopKart has separate Node.js services.

Run the scan against the service directories or use Snyk's multi-project scanning option.

Verify the manifests exist:

```text
services/auth-service/package.json
services/catalog-service/package.json
services/order-service/package.json
```

---

## 25. Trivy Reports Vulnerabilities

Trivy can identify vulnerabilities in container images and repository content.

First identify:

* Image name
* Image tag
* Vulnerability severity
* Package causing the vulnerability
* Fixed version, if available

Example:

```bash
trivy image <image>:<tag>
```

Do not automatically ignore vulnerabilities.

Review whether the finding is:

* Critical
* High
* Medium
* Low
* Fixable
* Not currently fixable

Then update the affected base image or dependency when appropriate.

---

## 26. Gitleaks Detects a Secret

If Gitleaks detects a credential:

1. Do not commit the secret again.
2. Revoke or rotate the exposed credential.
3. Remove it from the repository.
4. Move the secret to an appropriate secret-management mechanism.
5. Re-run the security scan.

For AWS workloads, prefer:

```text
AWS Secrets Manager
        ↓
External Secrets Operator
        ↓
Kubernetes Secret
        ↓
Application
```

Git history should also be considered if a real secret was previously committed.

---

## 27. Helm Deployment Fails

Validate the chart:

```bash
helm lint helm/shopkart
```

Render the manifests:

```bash
helm template shopkart helm/shopkart
```

Render with an environment-specific values file:

```bash
helm template shopkart helm/shopkart \
  -f helm/shopkart/values-dev.yaml
```

Then check the rendered Kubernetes YAML for:

* Invalid values
* Missing environment variables
* Incorrect image names
* Incorrect ports
* Invalid selectors
* Missing Secrets
* Invalid annotations

---

## 28. Debugging Order

When troubleshooting a production-style deployment, follow this sequence:

```text
User Request
     ↓
Ingress / Load Balancer
     ↓
Kubernetes Service
     ↓
Pod
     ↓
Application
     ↓
Redis / PostgreSQL / Other Service
```

Check the failure at each layer rather than changing multiple components at once.

Recommended order:

1. Check application response.
2. Check Ingress.
3. Check Service.
4. Check Pod status.
5. Check application logs.
6. Check configuration.
7. Check Secrets.
8. Check Redis/database connectivity.
9. Check AWS networking and IAM.
10. Check Terraform / Helm / Argo CD state if the issue is infrastructure or deployment related.

---

## 29. General Diagnostic Commands

### Kubernetes

```bash
kubectl get pods -A
kubectl get svc -A
kubectl get ingress -A
kubectl get events -A --sort-by=.lastTimestamp
```

### Docker

```bash
docker ps
docker images
docker system df
docker compose ps
docker compose logs
```

### Terraform

```bash
terraform validate
terraform plan
terraform state list
terraform state show <resource>
```

### Helm

```bash
helm list -A
helm lint helm/shopkart
helm template shopkart helm/shopkart
```

### AWS

```bash
aws sts get-caller-identity
aws eks describe-cluster --name <cluster-name>
aws ecr describe-repositories
```

---

## 30. Troubleshooting Principle

The primary troubleshooting approach for ShopKart is:

```text
Observe
   ↓
Identify the failing layer
   ↓
Inspect logs/events/metrics
   ↓
Verify configuration
   ↓
Make the smallest required change
   ↓
Validate
   ↓
Document the root cause
```

Avoid making multiple unrelated changes simultaneously. This makes the root cause harder to identify and can introduce additional failures.
