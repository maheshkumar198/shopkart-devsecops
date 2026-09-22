
# ShopKart – Cloud-Native E-Commerce DevSecOps Platform

ShopKart is a production-style microservices-based e-commerce application built to demonstrate modern Cloud, DevOps, DevSecOps, Kubernetes, Infrastructure as Code, GitOps, CI/CD, and application observability practices.

The application consists of independent authentication, catalog, and order services, a web frontend, PostgreSQL for persistent data, and Redis for caching and cart management.

The platform is containerized with Docker and deployed to Amazon EKS using Helm and Argo CD. AWS infrastructure is provisioned using Terraform.

---

## Architecture Overview

```text
                         ┌──────────────────┐
                         │      Users       │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │   AWS ALB /      │
                         │     Ingress      │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ Frontend / Nginx │
                         └────────┬─────────┘
                                  │
                ┌─────────────────┼─────────────────┐
                │                 │                 │
                ▼                 ▼                 ▼
        ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
        │ Auth Service │  │   Catalog    │  │    Order     │
        │    :3001     │  │   Service    │  │   Service    │
        │              │  │    :3002     │  │    :3003     │
        └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
               │                  │                  │
               │                  │                  │
               └──────────────────┼──────────────────┘
                                  │
                         ┌────────┴────────┐
                         │                 │
                         ▼                 ▼
                  ┌──────────────┐  ┌──────────────┐
                  │  PostgreSQL  │  │    Redis     │
                  │    / RDS     │  │              │
                  └──────────────┘  └──────────────┘
````

---

# Project Objectives

The project demonstrates an end-to-end cloud-native delivery lifecycle:

```text
Development
     ↓
Testing
     ↓
Security Scanning
     ↓
Docker Build
     ↓
Amazon ECR
     ↓
GitOps
     ↓
Amazon EKS
     ↓
Monitoring
```

---

# Application Components

| Component       | Responsibility                              | Technology        |
| --------------- | ------------------------------------------- | ----------------- |
| Auth Service    | User registration, login and authentication | Node.js / Express |
| Catalog Service | Product management and catalog APIs         | Node.js / Express |
| Order Service   | Cart, checkout and order management         | Node.js / Express |
| Frontend        | E-commerce web interface                    | HTML / Nginx      |
| PostgreSQL      | Persistent application data                 | PostgreSQL        |
| Redis           | Cart storage and caching                    | Redis             |

---

# Microservices

## 1. Auth Service

The Auth Service handles user authentication and authorization.

Responsibilities:

* User registration
* User login
* JWT generation
* JWT validation
* Current-user information
* Password hashing
* PostgreSQL integration
* Prometheus metrics

Main endpoints:

```text
POST /auth/register
POST /auth/login
GET  /auth/me
GET  /health
GET  /metrics
```

---

## 2. Catalog Service

The Catalog Service manages products.

Responsibilities:

* Product listing
* Product details
* Product creation
* PostgreSQL integration
* Redis caching
* Prometheus metrics

Main endpoints:

```text
GET  /products
GET  /products/:id
POST /products
GET  /health
GET  /metrics
```

Redis is used to cache product information and reduce repeated database queries.

---

## 3. Order Service

The Order Service manages shopping carts and orders.

Responsibilities:

* Shopping cart management
* Add items to cart
* Remove items from cart
* Checkout
* Order creation
* Order history
* Order details
* JWT authentication
* Redis integration
* PostgreSQL integration
* Catalog Service communication
* Prometheus metrics

Main endpoints:

```text
GET    /cart
POST   /cart/items
DELETE /cart/items/:productId

POST   /orders
GET    /orders
GET    /orders/:id

GET    /health
GET    /metrics
```

---

# Application Data Flow

A typical checkout flow looks like:

```text
User
 │
 ▼
Frontend
 │
 ▼
Order Service
 │
 ├── Read Cart
 │      │
 │      ▼
 │    Redis
 │
 ├── Request Product Information
 │      │
 │      ▼
 │    Catalog Service
 │
 ├── Create Order
 │      │
 │      ▼
 │    PostgreSQL
 │
 └── Clear Cart
        │
        ▼
      Redis
```

---

# Technology Stack

## Application

* Node.js
* Express.js
* PostgreSQL
* Redis
* JWT
* bcrypt
* Pino
* Prometheus Client
* Jest

## Containerization

* Docker
* Docker Compose

## AWS

* Amazon VPC
* Amazon EKS
* Amazon RDS
* Amazon ECR
* AWS IAM
* AWS Secrets Manager
* Application Load Balancer
* Amazon S3
* NAT Gateway

## Kubernetes

* Kubernetes
* Amazon EKS
* Helm
* AWS Load Balancer Controller
* External Secrets Operator
* EBS CSI Driver

## Infrastructure as Code

* Terraform

## CI/CD

* GitHub Actions
* Amazon ECR
* AWS OIDC

## GitOps

* Argo CD
* Helm

## DevSecOps

* SonarQube
* Snyk
* Trivy
* Gitleaks
* Hadolint

## Monitoring

* Prometheus
* Grafana

---

# Local Development

## Prerequisites

Install:

* Docker
* Docker Compose
* Node.js
* npm

Clone the repository:

```bash
git clone https://github.com/maheshkumar198/shopkart-devsecops.git
cd shopkart-devsecops
```

Start the application:

```bash
docker compose up -d --build
```

Check running containers:

```bash
docker compose ps
```

Stop the application:

```bash
docker compose down
```

---

# Local Application Ports

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

---

# Testing

Each backend microservice contains Jest tests.

Services:

```text
services/
├── auth-service/
├── catalog-service/
└── order-service/
```

Example:

```bash
cd services/auth-service
npm ci
npm test
```

The CI pipeline runs tests for the backend services and generates coverage information.

---

# Infrastructure as Code

AWS infrastructure is provisioned using Terraform.

Repository structure:

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

Terraform modules are used to separate reusable infrastructure components from environment-specific configuration.

---

# AWS Infrastructure

The platform uses AWS infrastructure including:

* VPC
* Public and private subnets
* NAT Gateway
* Amazon EKS
* EKS managed node groups
* Amazon RDS PostgreSQL
* Amazon ECR
* AWS Load Balancer Controller
* External Secrets Operator
* Monitoring components

High-level architecture:

```text
                         AWS VPC
                            │
              ┌─────────────┴─────────────┐
              │                           │
       Public Subnets              Private Subnets
              │                           │
       ┌──────┴──────┐             ┌──────┴──────┐
       │             │             │             │
      ALB          NAT GW         EKS           RDS
                                     │
                                     │
                              ShopKart Pods
```

---

# Amazon EKS

ShopKart is deployed to Amazon EKS.

The Kubernetes workloads include:

```text
Frontend
Auth Service
Catalog Service
Order Service
Redis
```

Additional platform components include:

```text
AWS Load Balancer Controller
External Secrets Operator
Prometheus
Grafana
Argo CD
```

---

# Helm

The Kubernetes application is packaged as a Helm chart.

Chart location:

```text
helm/shopkart/
```

The chart contains templates for:

* Deployments
* Services
* Ingress
* Redis
* ConfigMap
* External Secrets
* ServiceMonitors
* Argo CD Application

Environment-specific values are provided through:

```text
values-dev.yaml
values-qa.yaml
values-prod.yaml
```

Example deployment:

```bash
helm upgrade --install shopkart \
  ./helm/shopkart \
  -f ./helm/shopkart/values-dev.yaml
```

---

# Secrets Management

Sensitive application configuration is managed using AWS Secrets Manager and External Secrets Operator.

Architecture:

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
Application Pods
```

Secrets are not intended to be committed directly into the Git repository.

---

# CI/CD Pipeline

GitHub Actions automates testing, security scanning, Docker image building and image publishing.

High-level flow:

```text
Pull Request
      │
      ▼
Unit Tests
      │
      ▼
Security Scanning
      │
      ▼
Docker Build
      │
      ▼
Container Scanning
      │
      ▼
AWS OIDC
      │
      ▼
Amazon ECR
```

---

# DevSecOps

The CI/CD pipeline integrates multiple security tools.

| Tool      | Purpose                                |
| --------- | -------------------------------------- |
| SonarQube | Source-code analysis and quality       |
| Snyk      | Dependency vulnerability scanning      |
| Gitleaks  | Secret detection                       |
| Hadolint  | Dockerfile linting                     |
| Trivy     | Container image vulnerability scanning |

The objective is to identify security and quality issues as early as possible in the software delivery lifecycle.

---

# AWS OIDC

GitHub Actions uses AWS OpenID Connect instead of storing long-lived AWS access keys.

Flow:

```text
GitHub Actions
      │
      │ OIDC Token
      ▼
AWS STS
      │
      ▼
IAM Role
      │
      ▼
AWS Services
```

This allows the CI/CD workflow to obtain temporary AWS credentials.

---

# Amazon ECR

Docker images are stored in Amazon ECR.

Application images include:

```text
shopkart/auth-service
shopkart/catalog-service
shopkart/order-service
```

Images are tagged using the Git commit SHA to provide version traceability.

Example:

```text
shopkart/order-service:<git-sha>
```

---

# GitOps

Argo CD is used for GitOps-based Kubernetes deployment.

Deployment flow:

```text
GitHub Repository
       │
       ▼
Helm Chart
       │
       ▼
Argo CD
       │
       ▼
Amazon EKS
```

Git contains the desired application configuration.

Argo CD synchronizes the desired state with the Kubernetes cluster.

---

# Environment Promotion

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

The Helm chart provides separate values files for:

```text
DEV
QA
PROD
```

This allows environment-specific configuration while maintaining a common application chart.

---

# Monitoring

Application services expose Prometheus metrics through:

```text
/metrics
```

Prometheus collects application and Node.js runtime metrics.

Architecture:

```text
ShopKart Services
       │
       │ /metrics
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

# Application Metrics

The application exposes metrics including:

```text
shopkart_http_requests_total
shopkart_http_request_duration_seconds
shopkart_http_requests_in_flight
shopkart_http_errors_total
```

Authentication metrics:

```text
shopkart_auth_logins_total
shopkart_auth_registrations_total
```

Catalog metrics:

```text
shopkart_catalog_cache_total
shopkart_catalog_product_creations_total
```

Order metrics:

```text
shopkart_orders_checkout_total
shopkart_cart_operations_total
```

Node.js runtime metrics include:

* CPU
* Memory
* Heap
* Event loop
* Garbage collection
* Active handles
* Active resources
* File descriptors

---

# Grafana

The Grafana dashboard is stored in:

```text
monitoring/Graphana-Dashboard.json
```

The dashboard provides visibility into:

* HTTP request rate
* HTTP error rate
* HTTP status codes
* P50 latency
* P95 latency
* P99 latency
* Authentication activity
* Memory
* CPU
* Node.js heap
* Event loop lag
* Garbage collection
* File descriptors
* Active resources

---

# Latency Monitoring

HTTP request duration is collected as a Prometheus histogram.

Example P95 query:

```promql
histogram_quantile(
  0.95,
  sum by (le, route) (
    rate(shopkart_http_request_duration_seconds_bucket[5m])
  )
)
```

P50:

```promql
histogram_quantile(
  0.50,
  sum by (le, route) (
    rate(shopkart_http_request_duration_seconds_bucket[5m])
  )
)
```

P99:

```promql
histogram_quantile(
  0.99,
  sum by (le, route) (
    rate(shopkart_http_request_duration_seconds_bucket[5m])
  )
)
```

---

# Repository Structure

```text
.github/
└── workflows/
    ├── ci.yaml
    └── frontend.yml

db/
└── init.sql

helm/
└── shopkart/
    ├── Chart.yaml
    ├── values.yaml
    ├── values-dev.yaml
    ├── values-qa.yaml
    ├── values-prod.yaml
    └── templates/

monitoring/
└── Graphana-Dashboard.json

services/
├── auth-service/
├── catalog-service/
└── order-service/

terraform/
├── environments/
│   ├── dev/
│   └── prod/
└── modules/
    ├── vpc/
    ├── eks/
    ├── rds/
    ├── alb-controller/
    ├── eso/
    └── monitoring/

web/
├── Dockerfile
├── index.html
└── nginx.conf

docker-compose.yml
sonar-project.properties
.env.example
.gitignore
README.md
```

---

# End-to-End Platform Flow

```text
Developer
    │
    ▼
GitHub
    │
    ▼
GitHub Actions
    │
    ├── Tests
    ├── SonarQube
    ├── Snyk
    ├── Gitleaks
    ├── Hadolint
    └── Trivy
    │
    ▼
Docker Images
    │
    ▼
Amazon ECR
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

# Documentation

Detailed project documentation:

* [Architecture](Document/ARCHITECTURE.md)
* [CI/CD](Document/CI-CD.md)
* [Security](Document/SECURITY.md)
* [Observability](Document/OBSERVABILITY.md)
* [GitOps](Document/GITOPS.md)
* [Deployment](Document/DEPLOYMENT.md)
* [Troubleshooting](Document/TROUBLESHOOTING.md)

---

# Key DevOps Practices Demonstrated

* Microservices architecture
* Containerization with Docker
* Infrastructure as Code with Terraform
* Kubernetes deployment with Amazon EKS
* Helm-based application packaging
* GitOps with Argo CD
* CI/CD with GitHub Actions
* AWS OIDC authentication
* Amazon ECR image management
* Automated security scanning
* External secret management
* Prometheus application monitoring
* Grafana dashboards
* Environment-specific configuration
* Git-based deployment workflow

---

# Project Outcome

The project demonstrates an end-to-end approach for developing, securing, containerizing, deploying and monitoring a cloud-native application on AWS.

The architecture combines application development with:

```text
Cloud
+
DevOps
+
DevSecOps
+
Kubernetes
+
Infrastructure as Code
+
GitOps
+
Observability
```

---

# Author

**Mahesh Maharana**

Cloud / DevOps Engineer

Focus Areas:

* AWS
* Linux
* Docker
* Kubernetes
* Terraform
* CI/CD
* DevSecOps
* GitOps
* Monitoring



Next file should be **`Document/ARCHITECTURE.md`**.
