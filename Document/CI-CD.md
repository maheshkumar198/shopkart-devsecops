# ShopKart CI/CD Pipeline

## 1. Overview

ShopKart uses GitHub Actions to automate the software delivery lifecycle.

The CI/CD pipeline performs:

- Source validation
- Unit testing
- Code quality analysis
- Dependency security scanning
- Secret detection
- Dockerfile linting
- Container image vulnerability scanning
- Docker image building
- Amazon ECR publishing
- AWS authentication using OIDC

The pipeline integrates security checks directly into the development workflow.

---

# 2. CI/CD Architecture

```text
                         GitHub Repository
                                │
                                ▼
                       GitHub Pull Request
                                │
                                ▼
                        GitHub Actions
                                │
             ┌──────────────────┼──────────────────┐
             │                  │                  │
             ▼                  ▼                  ▼
          Gitleaks          Unit Tests         SonarQube
             │                  │                  │
             └──────────────────┼──────────────────┘
                                │
                                ▼
                              Snyk
                                │
                                ▼
                         Docker Build
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
                Hadolint                  Trivy
                    │                       │
                    └───────────┬───────────┘
                                │
                                ▼
                           AWS OIDC
                                │
                                ▼
                            Amazon ECR
````

---

# 3. Git Workflow

The project follows an environment-based Git workflow.

```text
feature/*
     │
     │ Pull Request
     ▼
 develop
     │
     ▼
    DEV
     │
     │ Promotion
     ▼
     QA
     │
     │ Promotion
     ▼
    main
     │
     ▼
    PROD
```

### Feature Branches

Development work is performed in feature branches.

Example:

```text
feature/add-payment-api
feature/catalog-cache
feature/order-validation
```

Changes are submitted through Pull Requests.

---

# 4. Pull Request Pipeline

Pull Requests are used to validate changes before they are merged.

The CI process performs checks such as:

```text
Pull Request
     │
     ├── Unit Tests
     ├── Code Coverage
     ├── SonarQube
     ├── Snyk
     └── Gitleaks
```

The objective is to identify application and security issues before changes are merged into the environment branch.

---

# 5. GitHub Actions

The CI/CD workflows are stored under:

```text
.github/workflows/
```

Current workflows include:

```text
.github/workflows/
├── ci.yaml
└── frontend.yml
```

The backend CI workflow handles the application services.

The frontend workflow handles frontend image building and publishing.

---

# 6. Backend CI Pipeline

The backend pipeline works with the following services:

```text
services/
├── auth-service/
├── catalog-service/
└── order-service/
```

The services are tested independently.

A matrix strategy can be used to run the same validation process against multiple services.

Conceptually:

```yaml
strategy:
  matrix:
    service:
      - auth-service
      - catalog-service
      - order-service
```

This avoids duplicating the same workflow logic for each backend service.

---

# 7. Unit Testing

Each backend service contains Jest tests.

```text
auth-service
     │
     ▼
   Jest

catalog-service
     │
     ▼
   Jest

order-service
     │
     ▼
   Jest
```

Example:

```bash
cd services/auth-service
npm ci
npm test
```

Coverage information is generated during the test process.

Coverage reports can then be consumed by SonarQube.

---

# 8. SonarQube

SonarQube performs static code analysis and code-quality checks.

The pipeline uses SonarQube to identify issues such as:

* Bugs
* Vulnerabilities
* Code smells
* Code duplication
* Test coverage information

The project configuration is stored in:

```text
sonar-project.properties
```

For JavaScript services, LCOV coverage reports can be supplied to SonarQube.

Example:

```properties
sonar.javascript.lcov.reportPaths=services/order-service/coverage/lcov.info
```

---

# 9. Snyk

Snyk is used to scan application dependencies.

The application contains Node.js dependencies managed through:

```text
package.json
package-lock.json
```

Snyk checks dependencies against known security vulnerabilities.

The pipeline can perform:

```text
snyk test
```

and:

```text
snyk monitor
```

### `snyk test`

Performs a vulnerability scan during the CI pipeline.

### `snyk monitor`

Creates or updates the project in Snyk for ongoing dependency monitoring.

---

# 10. Gitleaks

Gitleaks scans the repository for accidentally committed secrets.

Examples of secrets that should not be committed include:

```text
AWS access keys
Passwords
API keys
Private keys
Database credentials
JWT secrets
```

The goal is to detect secrets before they reach the deployment process.

---

# 11. Docker Build

Each backend service has its own Dockerfile.

```text
services/
├── auth-service/
│   └── Dockerfile
│
├── catalog-service/
│   └── Dockerfile
│
└── order-service/
    └── Dockerfile
```

The frontend also has a Dockerfile:

```text
web/
└── Dockerfile
```

The CI pipeline builds the required Docker images.

---

# 12. Hadolint

Hadolint is used to analyze Dockerfiles.

It checks for common Dockerfile problems and recommended practices.

The pipeline therefore performs:

```text
Dockerfile
    │
    ▼
Hadolint
    │
    ▼
Docker Build
```

This helps catch Dockerfile issues before images are published.

---

# 13. Trivy

Trivy is used to scan container images for known vulnerabilities.

The process is:

```text
Dockerfile
    │
    ▼
Docker Build
    │
    ▼
Container Image
    │
    ▼
Trivy Scan
```

The scan can identify vulnerabilities in:

* OS packages
* Application dependencies
* Container components

The CI workflow can also generate SARIF output for security findings.

---

# 14. AWS Authentication

GitHub Actions uses AWS OIDC to authenticate with AWS.

The workflow does not need a permanent AWS access key stored as a GitHub secret.

Authentication flow:

```text
GitHub Actions
       │
       │ OIDC Token
       ▼
AWS STS
       │
       │ AssumeRoleWithWebIdentity
       ▼
AWS IAM Role
       │
       ▼
AWS Services
```

The GitHub Actions job requires:

```yaml
permissions:
  id-token: write
  contents: read
```

The OIDC provider is:

```text
https://token.actions.githubusercontent.com
```

The STS audience is:

```text
sts.amazonaws.com
```

---

# 15. Amazon ECR

After the required CI and security stages, Docker images are published to Amazon ECR.

Repository naming:

```text
shopkart/auth-service
shopkart/catalog-service
shopkart/order-service
```

Example image:

```text
905179308072.dkr.ecr.ap-south-1.amazonaws.com/shopkart/order-service:<git-sha>
```

The Git commit SHA is used as an image tag.

This provides traceability between:

```text
Git Commit
    │
    ▼
Docker Image
    │
    ▼
ECR
    │
    ▼
Kubernetes Deployment
```

---

# 16. Image Versioning

Images are associated with the Git commit that produced them.

Example:

```text
Git Commit
1367952001
     │
     ▼
Docker Image
shopkart/order-service:1367952001
```

This makes it possible to identify which source revision produced a deployed container image.

The current pipeline also publishes a `latest` tag.

The Git SHA should be treated as the immutable deployment reference.

---

# 17. Frontend CI/CD

The frontend has a separate GitHub Actions workflow:

```text
.github/workflows/frontend.yml
```

The frontend source is located under:

```text
web/
```

The workflow builds the frontend container image and publishes the resulting image to Amazon ECR.

High-level flow:

```text
Frontend Code
     │
     ▼
GitHub Actions
     │
     ▼
Docker Build
     │
     ▼
Amazon ECR
```

---

# 18. Environment Promotion

The project uses separate environment stages.

```text
                    ┌──────────┐
                    │ Feature  │
                    │ Branch   │
                    └────┬─────┘
                         │
                         ▼
                    ┌──────────┐
                    │ develop  │
                    └────┬─────┘
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
helm/shopkart/
├── values-dev.yaml
├── values-qa.yaml
└── values-prod.yaml
```

This allows the same application chart to be configured differently for each environment.

---

# 19. CI/CD and GitOps Separation

CI and CD responsibilities are separated.

### CI

GitHub Actions handles:

```text
Code
 ↓
Test
 ↓
Security Scan
 ↓
Build
 ↓
Publish Image
```

### CD

Argo CD handles:

```text
Git
 ↓
Helm
 ↓
Argo CD
 ↓
EKS
```

Therefore:

```text
GitHub Actions = Build and Delivery Pipeline

Argo CD = Kubernetes Deployment and Synchronization
```

---

# 20. Complete Delivery Flow

The complete application delivery process is:

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
GitHub Actions
    │
    ├── Unit Tests
    ├── Coverage
    ├── SonarQube
    ├── Snyk
    ├── Gitleaks
    ├── Hadolint
    └── Trivy
    │
    ▼
Docker Image
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
ShopKart Application
```

---

# 21. CI/CD Security Model

The pipeline follows a shift-left security approach.

Security checks are performed before deployment:

```text
Source Code
    │
    ├── Gitleaks
    │
    ├── SonarQube
    │
    └── Snyk
    │
    ▼
Dockerfile
    │
    └── Hadolint
    │
    ▼
Container Image
    │
    └── Trivy
    │
    ▼
Amazon ECR
    │
    ▼
EKS
```

This allows security checks to be integrated into the software delivery lifecycle rather than performed only after deployment.

---

# 22. Traceability

The pipeline provides traceability across the delivery lifecycle.

```text
Git Commit
    │
    ▼
GitHub Actions Run
    │
    ▼
Docker Image
    │
    ▼
Amazon ECR
    │
    ▼
Argo CD
    │
    ▼
Kubernetes
```

Using Git SHA image tags makes it possible to associate a deployed image with its source revision.

---

# 23. Related Documentation

* [Architecture](ARCHITECTURE.md)
* [Security](SECURITY.md)
* [Observability](OBSERVABILITY.md)
* [GitOps](GITOPS.md)
* [Deployment](DEPLOYMENT.md)
* [Troubleshooting](TROUBLESHOOTING.md)

