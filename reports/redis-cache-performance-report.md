# Redis Cache Performance Report

Date: 2026-04-15

## Scope

Implemented Redis read-through caching for:

- Product listing (customer index API path)
- Service category lists
- Product category lists
- Manager dashboard aggregate stats
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
- `services/admin/apiService.js`
  - `getApiDashboard()` key: `cache:dashboard:admin:api:v1`

### Supporting changes

- Added dependency: `redis` in `package.json`
- Added benchmark script command: `npm run perf:cache`
- Added benchmark script: `scripts/cachePerfReport.js`

## Benchmark Methodology

- Tool: `scripts/cachePerfReport.js`
- Iterations: 12 (`CACHE_PERF_ITERATIONS=12`)
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
| Product listing (customer index API) |        61.09 |       669.82 |       73.33 |            0.61 |            1.84 |          99.00% |          99.73% |
| Service categories (active list)     |        32.01 |        56.35 |       31.32 |            0.88 |            1.03 |          97.25% |          98.17% |
| Product categories (active list)     |        30.66 |        62.06 |       28.42 |            0.40 |            0.90 |          98.70% |          98.55% |
| Manager dashboard aggregates         |       232.53 |       456.72 |      779.58 |            0.63 |            0.73 |          99.73% |          99.84% |
| Admin dashboard aggregates           |        76.80 |       802.51 |       69.81 |            0.39 |            1.05 |          99.49% |          99.87% |

## Interpretation

- Warm-cache latencies are consistently sub-2ms for all measured targets.
- Biggest wins are dashboard aggregates, where expensive multi-collection aggregation is avoided on repeated reads.
- Category and product listing endpoints also show strong p50/p95 reductions with cache hits.
- Cold-cache values reflect first-request compute + Redis set overhead and are expectedly higher for heavy dashboards.

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
   - `CACHE_PERF_ITERATIONS=12`

## Notes

- Read paths are cache-accelerated; category mutations include cache invalidation.
- Product/dashboard invalidation can be expanded further with event-based invalidation on product/order/booking writes if required.
