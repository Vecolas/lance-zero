---
name: lancezero-chess-data-integrations
description: Use when integrating LanceZero with Lichess or other chess data sources, including game import, puzzle datasets, Opening Explorer, tablebases, API authentication, rate limits, caching, provenance, CC0 data, external adapter design, or fallback behavior when a chess API is unavailable.
version: 1.0.0
---

# LanceZero Chess Data Integrations

## Boundary

External chess services are optional adapters.

The site must not fail to boot because Lichess/Chess.com/Explorer/Tablebase is unavailable.

Use interfaces such as:

```ts
interface OpeningExplorerProvider { ... }
interface TablebaseProvider { ... }
interface GameImportProvider { ... }
```

## Lichess API

Use official endpoints.
Do not scrape HTML.

Respect:
- rate limits;
- authentication requirements;
- retry guidance;
- 429 handling.

Do not hide repeated aggressive retries behind a generic client.

## Opening Explorer

Treat current authentication requirements as versioned external behavior.

Lichess changed Opening Explorer endpoints in 2026 and requires authentication in current flows.

Do not assume examples from older blog posts remain anonymous.

Wrap behind adapter and provide graceful fallback.

## Puzzle data

Lichess Open Database is suitable for offline preprocessing.

Do not ship the entire corpus in the browser.

Build a curated subset:
- target rating range;
- themes;
- popularity/quality;
- balanced buckets.

Persist source/provenance.

## Tablebase

Use tablebase only for supported low-piece-count positions.

Cache results.
Do not make endgame lesson unusable if the external service is temporarily down.

## Imports

Normalize external game records into LanceZero domain types.

Never let provider-specific JSON become the core domain model.

## Licensing/provenance

Track data/dependency source and license.

CC0 data may not require attribution, but maintaining a “Data sources” section is good engineering/product hygiene.

## When not to use

Do not use for Stockfish local analysis.
Do not use for auth/profile data unless the chess account connection itself is being implemented.
