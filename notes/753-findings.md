# #753 default-sort freshness findings

## Result

No production defect reproduced at current `main`; the deliverable is regression coverage.

## Observed chain

- OBSERVED: `GET /api/v1/books` defaults `sort` to `new`.
- OBSERVED: `SORT_MAP["new"]` is `Books.timestamp.desc()`.
- OBSERVED: a default API request with three distinct seeded timestamps returns newest, middle, oldest when the requested ordering is honored.
- OBSERVED: a fresh non-series `Catalog` initializes its sort token to `new`.
- OBSERVED: when search/sort/filter/entity/view changes, non-placeholder data replaces `allBooks`; only same-key pages use `dedupAppend`.
- OBSERVED: placeholder data is ignored during that reset, preventing old pages from being installed under the new key.

## Likely reporter condition

ASSUMED: the report most likely described a timestamp expectation mismatch (Calibre's added/modified `timestamp` versus publication date), a pre-v4.1.8 client state, or a restored catalog snapshot whose selected sort was not `new`. Current code intentionally restores a user's prior sort for Back navigation; a genuinely fresh library mount without a matching snapshot uses `new`.
