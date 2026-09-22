# ShopKart Architecture

## 1. Overview

ShopKart is a containerized e-commerce application built using a microservices architecture.

The application separates major business capabilities into independent services:

- Auth Service
- Catalog Service
- Order Service
- Frontend

The services communicate through HTTP APIs and use PostgreSQL and Redis for data persistence and caching.

The application can run locally using Docker Compose and is designed for deployment on Amazon EKS using Kubernetes, Helm and Argo CD.

---

## 2. High-Level Architecture

```text
                         ┌─────────────────┐
                         │      User       │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │    Frontend     │
                         │      Nginx      │
                         └────────┬────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
      ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
      │ Auth Service │    │   Catalog    │    │    Order     │
      │    :3001     │    │   Service    │    │   Service    │
      └──────┬───────┘    │    :3002     │    │    :3003     │
             │            └──────┬───────┘    └──────┬───────┘
             │                   │                   │
             │                   │                   │
             │                   ▼                   │
             │             ┌─────────────┐           │
             │             │    Redis    │◄──────────┤
             │             └─────────────┘           │
             │                                      │
             └──────────────────┬───────────────────┘
                                │
                                ▼
                         ┌─────────────┐
                         │ PostgreSQL  │
                         └─────────────┘
````

---

# 3. Application Components

## 3.1 Frontend

The frontend provides the user interface for the e-commerce application.

It provides functionality for:

* User registration
* User login
* Product browsing
* Shopping cart
* Checkout
* Order history
* Order details

The frontend is served using Nginx.

The frontend communicates with the backend services through HTTP APIs.

---

# 4. Auth Service

The Auth Service is responsible for user authentication.

### Responsibilities

* User registration
* User login
* Password hashing
* JWT generation
* JWT validation
* Current-user information

### Dependencies

```text
Auth Service
     │
     ▼
PostgreSQL
```

User information and password hashes are stored in PostgreSQL.

### API

```text
POST /auth/register
POST /auth/login
GET  /auth/me
```

The service also exposes:

```text
GET /health
GET /metrics
```

---

# 5. Catalog Service

The Catalog Service manages product information.

### Responsibilities

* Retrieve products
* Retrieve individual products
* Create products
* Cache product information

### Dependencies

```text
             ┌──────────────┐
             │   Catalog    │
             │   Service    │
             └──────┬───────┘
                    │
             ┌──────┴───────┐
             │              │
             ▼              ▼
       PostgreSQL         Redis
```

PostgreSQL is the persistent data store.

Redis is used for caching to reduce repeated database queries.

### API

```text
GET  /products
GET  /products/:id
POST /products
```

The service also exposes:

```text
GET /health
GET /metrics
```

---

# 6. Order Service

The Order Service manages shopping carts and customer orders.

### Responsibilities

* Shopping cart management
* Add items to cart
* Remove items from cart
* Checkout
* Order creation
* Order history
* Order details

### Dependencies

```text
                    ┌──────────────┐
                    │    Order     │
                    │   Service    │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
           Redis      PostgreSQL   Catalog Service
```

Redis stores cart information.

PostgreSQL stores orders and order items.

The Order Service communicates with the Catalog Service to retrieve product information during order processing.

### API

```text
GET    /cart
POST   /cart/items
DELETE /cart/items/:productId

POST   /orders
GET    /orders
GET    /orders/:id
```

The service also exposes:

```text
GET /health
GET /metrics
```

---

# 7. Authentication Flow

The authentication flow is based on JWT.

```text
User
 │
 ▼
Frontend
 │
 │ POST /auth/login
 ▼
Auth Service
 │
 │ Validate credentials
 ▼
PostgreSQL
 │
 │ Successful authentication
 ▼
Auth Service
 │
 │ Generate JWT
 ▼
Frontend
 │
 │ Store token
 ▼
Authenticated API Requests
```

The JWT is then sent with requests to protected APIs.

---

# 8. Product Browsing Flow

```text
User
 │
 ▼
Frontend
 │
 │ GET /products
 ▼
Catalog Service
 │
 ▼
Redis
 │
 ├── Cache Hit
 │      │
 │      ▼
 │   Return Product Data
 │
 └── Cache Miss
        │
        ▼
     PostgreSQL
        │
        ▼
     Store/Return Cache
        │
        ▼
     Return Products
```

Redis reduces the need to query PostgreSQL for repeatedly requested product information.

---

# 9. Shopping Cart Flow

The shopping cart is stored in Redis.

```text
User
 │
 ▼
Frontend
 │
 │ Cart Request
 ▼
Order Service
 │
 ▼
Redis
 │
 └── cart:<user_id>
```

This allows the cart to be accessed without storing temporary cart state directly in PostgreSQL.

---

# 10. Checkout Flow

The checkout process involves multiple application components.

```text
User
 │
 ▼
Frontend
 │
 │ POST /orders
 ▼
Order Service
 │
 ├── Read cart
 │      │
 │      ▼
 │     Redis
 │
 ├── Retrieve product information
 │      │
 │      ▼
 │   Catalog Service
 │
 ├── Create order
 │      │
 │      ▼
 │   PostgreSQL
 │
 └── Clear cart
        │
        ▼
      Redis
```

The resulting order and order items are persisted in PostgreSQL.

---

# 11. Database Architecture

PostgreSQL contains the application's persistent relational data.

The main entities are:

```text
Users
  │
  ▼
Orders
  │
  ▼
Order Items
  │
  ▼
Products
```

Conceptually:

```text
users
  │
  │ 1:N
  ▼
orders
  │
  │ 1:N
  ▼
order_items
  │
  │ N:1
  ▼
products
```

The database initialization and schema are maintained in:

```text
db/init.sql
```

---

# 12. Redis Architecture

Redis provides in-memory storage for application workloads.

Current application use cases include:

### Catalog Cache

```text
Product Request
      │
      ▼
Catalog Service
      │
      ▼
Redis Cache
```

### Shopping Cart

```text
User
 │
 ▼
Order Service
 │
 ▼
Redis
 │
 └── cart:<user_id>
```

Redis is therefore used for temporary/high-speed application data rather than replacing PostgreSQL as the system of persistent record.

---

# 13. Container Architecture

Each backend service has its own Docker image.

```text
services/
│
├── auth-service/
│   └── Dockerfile
│
├── catalog-service/
│   └── Dockerfile
│
└── order-service/
    └── Dockerfile
```

The frontend also has its own Docker image:

```text
web/
└── Dockerfile
```

Local development uses Docker Compose to run the complete application stack.

```text
docker-compose.yml
```

---

# 14. Kubernetes Architecture

In the AWS environment, the application is deployed to Amazon EKS.

High-level structure:

```text
                         Amazon EKS
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
      Frontend           Auth Service       Catalog Service
                                                │
                                                │
                                                ▼
                                              Redis

                         Order Service
                              │
                 ┌────────────┼────────────┐
                 │            │            │
                 ▼            ▼            ▼
               Redis      PostgreSQL   Catalog Service
```

The application workloads are managed using Kubernetes Deployments, Services and Ingress resources through the Helm chart.

---

# 15. Kubernetes Networking

External traffic enters the application through an AWS Application Load Balancer created through the AWS Load Balancer Controller.

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
Kubernetes Service
   │
   ▼
Application Pod
```

Kubernetes Services provide stable network endpoints for the application workloads.

---

# 16. AWS Architecture

The application infrastructure is provisioned using Terraform.

```text
                         AWS
                          │
                         VPC
                          │
             ┌────────────┴────────────┐
             │                         │
             ▼                         ▼
      Public Subnets             Private Subnets
             │                         │
             │                  ┌──────┴───────┐
             │                  │              │
             ▼                  ▼              ▼
            ALB                EKS            RDS
                                │
                                │
                         ShopKart Pods
```

The EKS workloads and database are placed in private network areas where appropriate.

The Application Load Balancer provides the external entry point for application traffic.

---

# 17. Infrastructure Components

Terraform modules are organized under:

```text
terraform/modules/
```

The repository contains modules for:

```text
vpc
eks
rds
alb-controller
eso
monitoring
```

Environment-specific Terraform configuration is maintained under:

```text
terraform/environments/
```

Current environments represented in the repository include:

```text
dev
prod
```

---

# 18. Secrets Architecture

Sensitive configuration is managed through AWS Secrets Manager and External Secrets Operator.

```text
                    AWS
                     │
                     ▼
             Secrets Manager
                     │
                     ▼
       External Secrets Operator
                     │
                     ▼
            Kubernetes Secret
                     │
                     ▼
               Application
```

This separates secret storage from application source code.

---

# 19. Observability Architecture

The application exposes Prometheus-compatible metrics.

```text
Auth Service ────────┐
                     │
Catalog Service ─────┼──► ServiceMonitor
                     │          │
Order Service ───────┘          ▼
                           Prometheus
                                │
                                ▼
                             Grafana
```

The application metrics include:

* HTTP request counts
* HTTP errors
* Request duration
* Requests in flight
* Authentication metrics
* Catalog metrics
* Order metrics
* Node.js runtime metrics

---

# 20. DevSecOps Architecture

Security and quality checks are integrated into the CI/CD process.

```text
                    GitHub
                       │
                       ▼
                GitHub Actions
                       │
       ┌───────────────┼────────────────┐
       │               │                │
       ▼               ▼                ▼
   Gitleaks         SonarQube          Snyk
       │               │                │
       └───────────────┼────────────────┘
                       │
                       ▼
                  Docker Build
                       │
              ┌────────┴────────┐
              ▼                 ▼
          Hadolint            Trivy
              │                 │
              └────────┬────────┘
                       ▼
                    Amazon ECR
```

---

# 21. GitOps Architecture

Argo CD manages Kubernetes application deployment from the Git repository.

```text
Developer
    │
    ▼
GitHub Repository
    │
    │ Helm configuration
    ▼
   Argo CD
    │
    │ Synchronization
    ▼
Amazon EKS
    │
    ▼
ShopKart Application
```

Git acts as the desired-state source for the Kubernetes application configuration.

---

# 22. Complete Platform Architecture

The complete platform can be represented as:

```text
                              USER
                                │
                                ▼
                         ┌──────────────┐
                         │   AWS ALB    │
                         └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                         │   Ingress    │
                         └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                         │   Frontend   │
                         └──────┬───────┘
                                │
                 ┌──────────────┼──────────────┐
                 │              │              │
                 ▼              ▼              ▼
             Auth Service   Catalog Service  Order Service
                 │              │              │
                 │              │         ┌────┴─────┐
                 │              │         │          │
                 │              ▼         ▼          ▼
                 │            Redis     Redis      PostgreSQL
                 │              │
                 └──────────────┼───────────────────┐
                                │                   │
                                ▼                   ▼
                           PostgreSQL          Catalog API
```

Platform management:

```text
                         GitHub
                            │
             ┌──────────────┴──────────────┐
             │                             │
             ▼                             ▼
       GitHub Actions                    Argo CD
             │                             │
       DevSecOps                         GitOps
             │                             │
             ▼                             ▼
          ECR ─────────────────────────► EKS
                                          │
                             ┌────────────┼────────────┐
                             ▼            ▼            ▼
                         Prometheus     Grafana      ShopKart
```

---

# 23. Architecture Principles

The project follows these architectural principles:

* Independent microservices
* Containerized workloads
* Infrastructure as Code
* Git-based configuration
* Automated CI/CD
* GitOps-based Kubernetes deployment
* Externalized secrets
* Persistent data in PostgreSQL
* High-speed temporary data in Redis
* Application-level metrics
* Environment-specific configuration
* Automated security checks

---

# 24. Related Documentation

* [CI/CD](CI-CD.md)
* [Security](SECURITY.md)
* [Observability](OBSERVABILITY.md)
* [GitOps](GITOPS.md)
* [Deployment](DEPLOYMENT.md)
* [Troubleshooting](TROUBLESHOOTING.md)

````
