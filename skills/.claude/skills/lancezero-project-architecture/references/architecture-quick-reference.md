# Architecture Quick Reference

## Product loop

```text
diagnose
→ explain
→ guided practice
→ independent retrieval
→ spaced review
→ real-game application
→ game review
→ updated training plan
```

## Approved core stack

- Next.js + React + TypeScript
- pnpm
- chess.js
- react-chessboard
- ts-fsrs
- Stockfish 18 via stockfish.js
- IndexedDB local repositories
- Clerk + Supabase when account/sync is involved
- Vitest + Playwright

## Avoid by default

- UI state library without need
- ORM without need
- server-side Stockfish as default
- paid LLM dependency
- scraping chess websites
- direct IndexedDB calls from UI
- direct third-party URLs spread through components
