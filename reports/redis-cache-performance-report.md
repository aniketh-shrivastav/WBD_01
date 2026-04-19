# Redis Cache Performance Report

Date: 2026-04-19

## Scope

Implemented Redis read-through caching for:

- Product listing (customer index API path)
- Service category lists
- Product category lists
- Manager dashboard aggregate stats
- Manager users snapshot
- Manager orders/bookings snapshot
- Manager services snapshot
- Manager payments snapshot
- Manager support snapshot
- Admin dashboard aggregate stats

## Implementation Summary

### New cache utility

- `utils/cacheClient.js`
- Features:
  - lazy Redis connect
  - JSON get/set helpers
  - read-through helper (`withCache`)
  - pattern invalidation (`deleteByPattern`)
  - fail-safe behavior when Redis is unavailable

### Cached areas

- `services/customer/catalogService.js`
  - `getIndexData()` cached key: `cache:products:index:view:v1`
  - `getIndexApiData()` cached key: `cache:products:index:api:v1`
- `controllers/serviceCategoryController.js`
  - `getCategories()` key: `cache:service-categories:all:v1`
  - `getActiveCategories()` key: `cache:service-categories:active:v1`
  - invalidation on add/update/delete
- `controllers/productCategoryController.js`
  - `getCategories()` key: `cache:product-categories:all:v1`
  - `getActiveCategories()` key: `cache:product-categories:active:v1`
  - invalidation on add/update/delete/addSubcategory/removeSubcategory
- `services/manager/apiService.js`
  - `getApiDashboard()` key: `cache:dashboard:manager:api:v1`
  - `getApiDashboardReport()` reuses same cached aggregate
  - `getApiUsers()` key: `cache:manager:users:api:v1`
  - `getApiServices()` key: `cache:manager:services:api:v1`
  - `getApiOrders()` key: `cache:manager:orders:api:v1`
  - `getApiPayments()` key: `cache:manager:payments:api:v1`
  - `getApiSupport()` key: `cache:manager:support:api:v1`
- `services/admin/apiService.js`
  - `getApiDashboard()` key: `cache:dashboard:admin:api:v1`

### Supporting changes

- Added dependency: `redis` in `package.json`
- Added benchmark script command: `npm run perf:cache`
- Added benchmark script: `scripts/cachePerfReport.js`

## Benchmark Methodology

- Tool: `scripts/cachePerfReport.js`
- Iterations: 25 (`CACHE_PERF_ITERATIONS`, default)
- Measurements per target:
  - uncached path repeated N times
  - first cached cold-hit time (cache fill)
  - cached warm-hit repeated N times
- Metrics:
  - p50 latency (median)
  - p95 latency
  - p50/p95 improvement percentages

## Results (ms)

| Target                               | Uncached p50 | Uncached p95 | Cached cold | Cached warm p50 | Cached warm p95 | p50 improvement | p95 improvement |
| ------------------------------------ | -----------: | -----------: | ----------: | --------------: | --------------: | --------------: | --------------: |
| Product listing (customer index API) |        60.05 |        93.83 |       67.57 |            0.71 |            1.21 |          98.82% |          98.71% |
| Service categories (active list)     |        27.05 |        30.18 |       28.25 |            0.27 |            0.34 |          99.00% |          98.87% |
| Product categories (active list)     |        28.29 |        68.72 |       30.39 |            0.23 |            0.40 |          99.19% |          99.42% |
| Manager dashboard aggregates         |        86.68 |       779.99 |       76.76 |            0.59 |            0.78 |          99.32% |          99.90% |
| Manager users snapshot               |        29.32 |        33.24 |       32.72 |            0.29 |            0.42 |          99.01% |          98.74% |
| Manager orders/bookings snapshot     |       141.56 |       223.05 |      155.31 |            1.48 |            1.94 |          98.95% |          99.13% |
| Admin dashboard aggregates           |        74.65 |       777.13 |      880.28 |            0.40 |            0.58 |          99.46% |          99.93% |

## Interpretation

- Warm-cache latencies are consistently sub-2ms for all measured targets.
- Dashboard and orders/bookings snapshots show the strongest real-world gain because expensive aggregation/population work is skipped on repeated reads.
- Manager users snapshot also benefits significantly due to frequent dashboard panel refresh access patterns.
- Cold-cache values still include first-request compute + Redis set overhead and can spike for heavy aggregate paths.

## Runbook

1. Ensure Redis service is running on `localhost:6379` or set `REDIS_URL`.
2. Run benchmark:
   - `npm run perf:cache`
3. Optional tuning env vars:
   - `REDIS_ENABLED=true`
   - `REDIS_URL=redis://127.0.0.1:6379`
   - `CACHE_TTL_PRODUCTS=60`
   - `CACHE_TTL_CATEGORIES=300`
   - `CACHE_TTL_DASHBOARD=60`

- `CACHE_TTL_MANAGER_DATA=45`
- `CACHE_PERF_ITERATIONS=25`

## Notes

- Read paths are cache-accelerated; category mutations include cache invalidation.
- Manager snapshot caches currently use short TTL-based refresh (no explicit invalidation hooks yet), which is suitable for operational dashboards.
- Product/dashboard invalidation can be expanded further with event-based invalidation on product/order/booking writes if required.
