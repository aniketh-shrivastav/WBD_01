# Solr Search Optimization Report

## Summary
Implemented an optional Apache Solr-backed product search pipeline to improve user search relevance and scalability while preserving stability with automatic MongoDB fallback.

## What Was Implemented
1. Search engine abstraction
- File: `services/search/productSearchService.js`
- Behavior:
  - Uses `SEARCH_ENGINE=solr` to query Solr.
  - Falls back to Mongo text search if Solr is unavailable.
  - Supports `q`, `category`, `limit`, and `offset`.

2. Solr indexing utilities
- File: `services/search/solrIndexer.js`
- Behavior:
  - Index single product on add/edit.
  - Remove product from index on delete.
  - Full reindex helper for all approved products.

3. Search API endpoint
- Route: `GET /customer/api/search/products`
- Files:
  - `routes/customerRoutes.js`
  - `controllers/customerController.js` (`searchProductsApi`)

4. Customer UI integration
- File: `client/src/pages/customer/Index.jsx`
- Behavior:
  - Debounced server-side search requests.
  - Dynamic filtering by text/category through backend endpoint.
  - Keeps original load path and graceful UX when search not active.

5. Seller-side synchronization
- File: `services/seller/productService.js`
- Behavior:
  - Calls Solr index update after create/edit.
  - Calls Solr delete after product removal.

6. Tooling and operations
- Script: `scripts/reindexProductsToSolr.js`
- `package.json` scripts:
  - `search:solr:up`
  - `search:solr:down`
  - `search:solr:reindex`
- Compose services added:
  - `docker-compose.yml` -> `solr`
  - `docker-compose.dev.yml` -> `solr`

## Configuration
Add to `.env`:

```env
SEARCH_ENGINE=solr
SOLR_BASE_URL=http://localhost:8983
SOLR_COLLECTION=products
SOLR_COMMIT_WITHIN_MS=1000
```

If `SEARCH_ENGINE` is not set to `solr`, system uses Mongo search only.

## Solr Query Strategy
- Parser: `edismax`
- Query fields and boosts:
  - `name^6`, `sku^5`, `brand^4`, `category^3`, `subcategory^2`, `compatibility^2`, `description^1`
- Filters:
  - `status:approved`
  - optional exact category filter
- Sort:
  - By `score desc` when query text exists, otherwise `createdAt desc`
- Post-sort:
  - Verified sellers are promoted in result ordering.

## Validation Steps
1. Start Solr
```bash
npm run search:solr:up
```

2. Reindex products
```bash
npm run search:solr:reindex
```

3. Start app and test endpoint
```bash
GET /customer/api/search/products?q=mat&category=ACCESSORIES
```

4. UI check
- Open customer products page.
- Type search text and apply category filter.
- Confirm results update quickly.

## Expected Improvement
- Better relevance control via field boosts.
- Scalable search performance as product catalog grows.
- Cleaner separation between transactional DB reads and search reads.
- Resilience: if Solr is down, Mongo fallback keeps search functional.

## Notes
- Current implementation is product-search specific.
- Same pattern can be extended for chat/customer lookup and parts compatibility search.
