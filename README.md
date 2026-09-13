# ShopKart Simple Production-Like App

A deliberately small ShopKart-style application that you can understand and run reliably.

## User flow

```text
Login/Register
      |
      v
User Identity (JWT)
      |
      v
Product Catalog
      |
      v
Cart belongs to user (Redis)
      |
      v
Checkout
      |
      v
Order History
      |
      v
Order Details
```

## Architecture

```text
Browser
   |
   v
Nginx Frontend :8080
   |
   +--> Auth Service :3001 ----> PostgreSQL
   |
   +--> Catalog Service :3002 -> PostgreSQL + Redis cache
   |
   +--> Order Service :3003 ----> PostgreSQL + Redis cart
              |
              +---------------> Catalog Service

All services:
  /health
  /metrics
  structured JSON logs
  Jest tests + coverage
```

## Run

```bash
docker compose up --build -d
docker compose ps
```

Open:

```text
http://YOUR_EC2_PUBLIC_IP:8080
```

For local Linux:

```text
http://localhost:8080
```

## Demo login

Use:

```text
Email: demo@shopkart.local
Password: password
```

The demo login is implemented for tests; in normal Docker production mode, create a real account with Register.

## Test the flow

1. Register.
2. You are logged in and a JWT is stored in the browser.
3. Browse products.
4. Add products to your own cart.
5. Checkout.
6. Open My Orders.
7. Open Order Details.

## API endpoints

Auth:

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

Catalog:

```text
GET  /api/products
GET  /api/products/:id
POST /api/products
```

Cart:

```text
GET    /api/cart
POST   /api/cart/items
DELETE /api/cart/items/:productId
```

Orders:

```text
POST /api/orders
GET  /api/orders
GET  /api/orders/:id
```

## Metrics

```text
http://localhost:3001/metrics
http://localhost:3002/metrics
http://localhost:3003/metrics
```

## Logs

```bash
docker compose logs -f auth-service
docker compose logs -f catalog-service
docker compose logs -f order-service
```

Logs are structured JSON through Pino.

## Tests

Run for every service:

```bash
cd services/auth-service && npm install && npm test
cd ../catalog-service && npm install && npm test
cd ../order-service && npm install && npm test
```

Coverage:

```bash
npm run test:coverage
```

Coverage reports appear under each service's `coverage/` directory.

## Redis

Cart data:

```bash
docker compose exec redis redis-cli
KEYS cart:*
GET cart:1
```

Catalog cache:

```text
products:all
product:1
```

## Database

```bash
docker compose exec postgres psql -U shopkart -d shopkart
```

Useful:

```sql
\dt
SELECT * FROM users;
SELECT * FROM products;
SELECT * FROM orders;
SELECT * FROM order_items;
```

## DevOps next steps

Once this application works, add:

```text
Prometheus -> Grafana
ELK/Filebeat
SonarQube
npm audit / SCA
Gitleaks
Trivy
GitHub Actions
Docker image registry
Kubernetes / EKS
```

This keeps the application understandable while still giving you the production-style DevOps learning path.
