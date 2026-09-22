# ShopKart Observability

## 1. Overview

ShopKart implements application-level observability using Prometheus and Grafana.

Each backend microservice exposes a Prometheus-compatible `/metrics` endpoint.

The monitoring stack provides visibility into:

- HTTP traffic
- HTTP errors
- Request latency
- Authentication activity
- Catalog activity
- Order activity
- Node.js runtime behavior
- Memory usage
- CPU usage
- Event loop performance
- Garbage collection
- Active resources

---

# 2. Observability Architecture

```text
                 ┌──────────────────┐
                 │   Auth Service   │
                 │    /metrics     │
                 └────────┬─────────┘
                          │
                          │
                 ┌────────▼─────────┐
                 │ Catalog Service  │
                 │    /metrics      │
                 └────────┬─────────┘
                          │
                          │
                 ┌────────▼─────────┐
                 │  Order Service   │
                 │    /metrics      │
                 └────────┬─────────┘
                          │
                          ▼
                  ┌──────────────┐
                  │ ServiceMonitor│
                  └───────┬──────┘
                          │
                          ▼
                   ┌────────────┐
                   │ Prometheus │
                   └─────┬──────┘
                         │
                         ▼
                    ┌─────────┐
                    │ Grafana │
                    └─────────┘
````

---

# 3. Metrics Endpoint

Each backend service exposes:

```text
/metrics
```

The endpoint provides metrics in Prometheus exposition format.

Health endpoints are also available:

```text
/health
```

The services therefore provide separate endpoints for:

```text
Health
  ↓
/health

Metrics
  ↓
/metrics
```

---

# 4. Prometheus

Prometheus is responsible for collecting and storing application metrics.

The Kubernetes monitoring configuration uses ServiceMonitor resources to discover the application services.

The application ServiceMonitors are defined through the Helm chart.

```text
helm/shopkart/templates/servicemonitors.yaml
```

---

# 5. ServiceMonitor

The ServiceMonitor connects Prometheus to the Kubernetes Services exposing the application.

Conceptually:

```text
Kubernetes Service
        │
        ▼
ServiceMonitor
        │
        ▼
Prometheus
        │
        ▼
Time-Series Database
```

The application metrics endpoint is:

```text
/metrics
```

The configured scrape interval is:

```text
15 seconds
```

---

# 6. HTTP Metrics

The application exposes HTTP request metrics.

## Request Counter

```text
shopkart_http_requests_total
```

This counts HTTP requests handled by the application.

Important labels include:

```text
method
route
status_code
```

Example:

```text
shopkart_http_requests_total{
    method="POST",
    route="/auth/login",
    status_code="200"
}
```

---

# 7. HTTP Error Metrics

The application exposes:

```text
shopkart_http_errors_total
```

This tracks HTTP error responses.

The metric includes labels such as:

```text
method
route
status_code
```

Example:

```text
shopkart_http_errors_total{
    method="POST",
    route="/auth/login",
    status_code="401"
}
```

This allows dashboards to distinguish successful requests from failed requests.

---

# 8. Requests in Flight

The application exposes:

```text
shopkart_http_requests_in_flight
```

This represents the number of HTTP requests currently being processed.

This can be useful for identifying periods of increased concurrent application activity.

---

# 9. HTTP Request Duration

Request latency is exposed through:

```text
shopkart_http_request_duration_seconds
```

This metric is implemented as a Prometheus histogram.

Histogram buckets allow Prometheus to estimate latency percentiles.

The metric contains bucket values such as:

```text
0.005
0.01
0.025
0.05
0.1
0.25
0.5
1
2.5
5
10
+Inf
```

Values are measured in seconds.

---

# 10. P50 Latency

P50 represents the 50th percentile, also called the median.

Approximately 50% of observations are at or below the calculated P50 value.

Example PromQL:

```promql
histogram_quantile(
  0.50,
  sum by (le, route) (
    rate(shopkart_http_request_duration_seconds_bucket[5m])
  )
)
```

---

# 11. P95 Latency

P95 represents the 95th percentile.

Approximately 95% of observations are at or below the calculated P95 value, while approximately 5% are above it.

Example:

```promql
histogram_quantile(
  0.95,
  sum by (le, route) (
    rate(shopkart_http_request_duration_seconds_bucket[5m])
  )
)
```

---

# 12. P99 Latency

P99 represents the 99th percentile.

Approximately 99% of observations are at or below the calculated P99 value, while approximately 1% are above it.

Example:

```promql
histogram_quantile(
  0.99,
  sum by (le, route) (
    rate(shopkart_http_request_duration_seconds_bucket[5m])
  )
)
```

---

# 13. Understanding the P95 Query

The P95 query is:

```promql
histogram_quantile(
  0.95,
  sum by (le, route) (
    rate(shopkart_http_request_duration_seconds_bucket[5m])
  )
)
```

It consists of three main operations.

### `rate()`

```promql
rate(metric[5m])
```

Calculates the per-second rate of increase over the previous five minutes.

### `sum by (le, route)`

```promql
sum by (le, route)
```

Combines histogram bucket rates while preserving:

```text
le
route
```

`le` represents the histogram bucket upper bound.

### `histogram_quantile()`

```promql
histogram_quantile(0.95, ...)
```

Estimates the requested percentile from the histogram buckets.

---

# 14. Authentication Metrics

Authentication-specific metrics include:

```text
shopkart_auth_logins_total
shopkart_auth_registrations_total
```

These metrics provide visibility into authentication activity.

For example, login traffic can be queried using:

```promql
rate(shopkart_auth_logins_total[5m])
```

---

# 15. Catalog Metrics

Catalog-specific metrics include:

```text
shopkart_catalog_cache_total
shopkart_catalog_product_creations_total
```

These provide visibility into:

* Catalog cache activity
* Product creation activity

---

# 16. Order Metrics

Order-specific metrics include:

```text
shopkart_orders_checkout_total
shopkart_cart_operations_total
```

These provide visibility into:

* Checkout activity
* Shopping cart operations

Example:

```promql
rate(shopkart_orders_checkout_total[5m])
```

---

# 17. Node.js Runtime Metrics

The services also expose Node.js runtime metrics.

These include:

* Process CPU
* Process memory
* Heap usage
* External memory
* Event loop metrics
* Garbage collection
* Active handles
* Active resources
* Active requests
* File descriptors

These metrics help monitor the health of the Node.js runtime in addition to application traffic.

---

# 18. Process CPU Metrics

The application exposes process CPU metrics.

Examples include:

```text
shopkart_process_cpu_user_seconds_total
shopkart_process_cpu_system_seconds_total
shopkart_process_cpu_seconds_total
```

These metrics can be used to understand CPU consumption by the Node.js process.

---

# 19. Memory Metrics

Runtime memory metrics include:

```text
shopkart_process_resident_memory_bytes
shopkart_process_virtual_memory_bytes
shopkart_nodejs_heap_size_used_bytes
shopkart_nodejs_heap_size_total_bytes
shopkart_nodejs_external_memory_bytes
```

These metrics provide visibility into:

* Resident memory
* Virtual memory
* JavaScript heap usage
* Total heap allocation
* External memory

---

# 20. Event Loop Monitoring

Node.js event-loop metrics provide visibility into application runtime responsiveness.

Available measurements include:

```text
Event loop lag
P50
P90
P99
Minimum
Maximum
Mean
Standard deviation
```

High event-loop latency can indicate that the Node.js process is spending significant time processing synchronous or CPU-intensive work.

Example metric:

```text
shopkart_nodejs_eventloop_lag_seconds
```

---

# 21. Garbage Collection Metrics

Node.js garbage-collection metrics provide visibility into GC activity.

GC monitoring can help identify changes in memory-management behavior.

The monitoring dashboard includes a panel for GC duration.

---

# 22. Active Resources

The application exposes runtime resource metrics including:

```text
Active handles
Active requests
Active resources
Open file descriptors
```

These metrics can help identify abnormal resource usage.

---

# 23. Grafana Dashboard

The Grafana dashboard is stored in:

```text
monitoring/Graphana-Dashboard.json
```

The dashboard provides application and runtime visibility from Prometheus metrics.

---

# 24. Dashboard Panels

The dashboard contains panels covering the following areas.

## HTTP

```text
HTTP Request Rate
HTTP Error Rate
HTTP Requests In Flight
HTTP Requests by Status Code
Total HTTP Requests
```

## Latency

```text
P50 Latency
P95 Latency
P99 Latency
```

## Authentication

```text
Failed Login Rate
Successful Login Rate
```

## Runtime

```text
Process Resident Memory
Node.js Heap Used
Node.js Event Loop Lag P99
Node.js Event Loop Lag P90
Node.js Event Loop Lag P50
CPU Usage
Open File Descriptors
Active Handles
Active Requests
Active Resources
GC Duration
External Memory
```

---

# 25. Monitoring Flow

The complete application monitoring flow is:

```text
Application
    │
    │ /metrics
    ▼
Kubernetes Service
    │
    ▼
ServiceMonitor
    │
    ▼
Prometheus
    │
    │ PromQL
    ▼
Grafana
    │
    ▼
Dashboard
```

---

# 26. Accessing Prometheus

Find the Prometheus service:

```bash
kubectl get svc -n monitoring
```

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

Prometheus targets can be checked from:

```text
Status → Targets
```

The application ServiceMonitor targets should show as:

```text
UP
```

---

# 27. Accessing Grafana

Find Grafana:

```bash
kubectl get svc -n monitoring
```

Port-forward:

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

---

# 28. Generating Application Load

Load testing can be used to generate traffic and observe application metrics.

Example k6 test:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 10 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3003';

export default function () {
  let res = http.get(`${BASE_URL}/health`);

  check(res, {
    'health status 200': (r) => r.status === 200,
  });

  sleep(1);
}
```

Example:

```bash
k6 run load-test.js
```

The resulting traffic can be observed in Grafana.

---

# 29. Useful PromQL Queries

## Request Rate

```promql
sum(
  rate(shopkart_http_requests_total[5m])
)
```

## Error Rate

```promql
sum(
  rate(shopkart_http_errors_total[5m])
)
```

## Requests by Status Code

```promql
sum by (status_code) (
  rate(shopkart_http_requests_total[5m])
)
```

## P50 Latency

```promql
histogram_quantile(
  0.50,
  sum by (le, route) (
    rate(shopkart_http_request_duration_seconds_bucket[5m])
  )
)
```

## P95 Latency

```promql
histogram_quantile(
  0.95,
  sum by (le, route) (
    rate(shopkart_http_request_duration_seconds_bucket[5m])
  )
)
```

## P99 Latency

```promql
histogram_quantile(
  0.99,
  sum by (le, route) (
    rate(shopkart_http_request_duration_seconds_bucket[5m])
  )
)
```

## Login Rate

```promql
rate(shopkart_auth_logins_total[5m])
```

## Checkout Rate

```promql
rate(shopkart_orders_checkout_total[5m])
```

---

# 30. Observability Design

The monitoring design separates application metrics from application logs.

```text
Application
    │
    ├────────── Metrics ──────────► Prometheus ─────► Grafana
    │
    └────────── Logs ──────────────► Container Logs
```

Prometheus and Grafana are responsible for metrics visualization.

The current documentation focuses on application metrics and runtime monitoring.

---

# 31. Example Monitoring Scenario

Consider an increase in API latency.

The investigation can follow:

```text
Grafana
   │
   ▼
P95/P99 Latency
   │
   ▼
HTTP Request Rate
   │
   ▼
HTTP Error Rate
   │
   ▼
Node.js CPU
   │
   ▼
Node.js Heap
   │
   ▼
Event Loop Lag
```

This provides several metrics that can be correlated when investigating application performance.

---

# 32. Observability Goals

The monitoring implementation provides visibility into:

### Availability

```text
Health endpoints
HTTP request success/error rates
```

### Performance

```text
P50
P95
P99
Request duration
Request rate
```

### Application Behavior

```text
Login activity
Catalog activity
Cart operations
Checkout activity
```

### Runtime Health

```text
CPU
Memory
Heap
Event loop
GC
Active resources
File descriptors
```

---

# 33. Related Documentation

* [Architecture](ARCHITECTURE.md)
* [CI/CD](CI-CD.md)
* [Security](SECURITY.md)
* [GitOps](GITOPS.md)
* [Deployment](DEPLOYMENT.md)
* [Troubleshooting](TROUBLESHOOTING.md)

