# CLAUDE.md — LanceZero

## Mission

Build **LanceZero**, a PT-BR-first chess learning web app whose central promise is:

> **Treine o que perde suas partidas.**

The app is not a generic collection of chess tools. It must create a closed learning loop:

**diagnose → explain → guided practice → independent retrieval → spaced review → real-game application → game review → updated training plan**.

Primary initial audience: roughly **800–1600 rating**, with the default onboarding and curriculum optimized for a player around **1100**.

The core product must work without a paid AI API or paid chess API.

---

## Source of truth

Read these before implementing any feature:

1. `docs/PRODUCT.md` — product behavior and roadmap.
2. `docs/PEDAGOGY.md` — learning rules.
3. `docs/LICENSES.md` — dependency/data obligations.
4. `docs/adr/*` — architecture decisions.
5. This file.

If implementation and docs conflict, stop the affected feature, document the discrepancy, and prefer the latest explicit ADR. Do not silently invent product behavior.

---

## Non-negotiable product principles

1. **Daily plan first.** The default authenticated/local home is “Treino de hoje”, not a toolbox.
2. **User thinks before engine.** Game review initially hides engine output and asks the player to identify critical moments.
3. **Errors become future training.** A meaningful mistake can create a review card and update skill priorities.
4. **Skills, not only puzzles.** Attempts update a skill model.
5. **Retrieval before explanation when testing.** Do not show the motif name before mixed puzzles.
6. **Spaced review.** Use FSRS for exact positions, mistakes, endgame positions, concepts and repertoire nodes.
7. **Guidance fades.** New concepts can use worked examples/hints; later attempts remove them.
8. **No fake precision.** Stockfish WDL is not presented as literal human win probability.
9. **Local-first.** Core training, PGN storage and analysis work without an account.
10. **Free core.** No paid LLM/engine/service is required for core behavior.

---

## Approved initial stack

Use stable versions at bootstrap and pin them in the lockfile.

- Next.js + React + TypeScript
- `pnpm`
- `chess.js` — chess rules/FEN/PGN
- `react-chessboard` — board UI
- `ts-fsrs` — spaced repetition
- Stockfish 18 WASM through `nmrugg/stockfish.js`, initially **lite single-threaded**
- IndexedDB behind our own repository interface
- Vitest
- Playwright

Do not add state-management, ORM, UI-kit, analytics or backend dependencies without a demonstrated need.

### Explicitly avoid in MVP

- Chessground unless the project consciously adopts its GPL implications.
- Maia-3.
- Lc0 in browser.
- paid LLM APIs.
- scraping Chess.com or Lichess HTML.
- server-side Stockfish as default.

---

## License boundaries

Stockfish / stockfish.js are GPL-3.0. Keep their distributed assets isolated under:

`public/engine/stockfish/`

Include:

- engine JS/WASM;
- `COPYING.txt`;
- `SOURCE.txt` with exact version/tag/source URL;
- version/hash information.

Do not modify engine source in MVP.

`react-chessboard` is MIT. `chess.js` is BSD-2-Clause. `ts-fsrs` is MIT. Lichess open database and `chess-openings` data are CC0.

Every new dependency must be added to `docs/LICENSES.md` with package, version, license, reason for use and source URL.

---

## Brand system

Working brand: **LanceZero**.

### Copy

Primary tagline: **Treine o que perde suas partidas.**  
Secondary: **Do próximo lance ao próximo nível.**

Tone:

- analytical;
- calm;
- direct;
- never patronizing;
- no casino-style gamification;
- explain an error without humiliating the player.

### Tokens

```css
--ink-950: #101318;
--ink-800: #20252c;
--paper-50: #f6f1e8;
--paper-200: #e5ded2;
--signal-500: #ff6b4a;
--sage-500: #7fa68a;
--slate-500: #68707d;

--board-paper-light: #e8e0d3;
--board-paper-dark: #778276;
--board-graphite-light: #c9c9c2;
--board-graphite-dark: #555f64;
```

Do not mimic Lichess green branding or Chess.com visual language.

Use color + icon/text for status. Never rely on red/green alone.

---

## Architecture rules

### 1. Domain must not depend on React

`src/domain/**` must contain pure TypeScript wherever practical.

Components may call domain services; domain logic must not import UI components/hooks.

### 2. Engine must not run on main thread

All Stockfish communication goes through a Web Worker and an abstraction:

```ts
export interface EngineProvider {
  init(): Promise<void>
  analyzePosition(
    fen: string,
    options: {
      nodes?: number
      depth?: number
      multiPv?: number
      showWdl?: boolean
    },
  ): Promise<EngineAnalysis>
  stop(): Promise<void>
  dispose(): Promise<void>
}
```

Required behavior:

- UCI handshake;
- serialized command queue;
- analysis IDs;
- stale-response rejection;
- cancellation;
- timeout/restart;
- worker disposal.

### 3. Persistence behind repository interfaces

Do not call IndexedDB directly from pages/components.

Start with:

```ts
interface TrainingRepository {
  getProfile(): Promise<UserProfile | null>
  saveProfile(profile: UserProfile): Promise<void>
  saveGame(game: Game): Promise<void>
  listGames(query?: GameQuery): Promise<Game[]>
  savePuzzleAttempt(attempt: PuzzleAttempt): Promise<void>
  savePositionAnalyses(items: PositionAnalysis[]): Promise<void>
  getDueCards(now: Date): Promise<ReviewCard[]>
  saveReviewCard(card: ReviewCard): Promise<void>
}
```

### 4. External services behind adapters

```ts
interface OpeningExplorerProvider {
  getStats(fen: string, filters: ExplorerFilters): Promise<ExplorerStats>
}

interface TablebaseProvider {
  probe(fen: string): Promise<TablebaseResult | null>
}

interface GameImportProvider {
  listGames(identity: string, cursor?: string): Promise<GamePage>
}
```

No third-party URL should be embedded throughout components.

### 5. Pure planner

`buildDailyPlan(context, seed)` must be deterministic for the same inputs/seed so it can be tested.

---

## Suggested project layout

```text
src/
  app/
    onboarding/
    dashboard/
    train/
    puzzles/
    calculate/
    games/
    openings/
    endgames/
    lessons/
    progress/
    settings/
  components/
    chess/
    training/
    analysis/
    ui/
  domain/
    skills/
    planning/
    puzzles/
    games/
    repertoire/
  lib/
    chess/
    engine/
    fsrs/
    importers/
    storage/
  workers/
    stockfish.worker.ts
  content/
    lessons/
scripts/
  puzzles/
tests/
  fixtures/
  unit/
  e2e/
docs/
  adr/
```

---

## Core domain concepts

### Skill

Keep the first taxonomy small. Initial IDs include:

```text
tactics.hanging-piece
tactics.fork
tactics.pin
tactics.skewer
tactics.discovered-attack
tactics.removal-of-defender
tactics.deflection
tactics.overloaded-piece
tactics.back-rank
tactics.mating-net
calculation.checks-captures-threats
calculation.candidate-moves
calculation.opponent-best-response
endgame.basic-mates
endgame.king-pawn-opposition
endgame.key-squares
opening.development
opening.center
opening.king-safety
```

Do not create hundreds of skills before telemetry demands it.

### Mastery

Track:

- exposures;
- attempts;
- first-try accuracy;
- recent EWMA accuracy;
- retention accuracy;
- hint usage;
- think time;
- real-game occurrences/errors;
- mastery 0..1;
- confidence 0..1.

Make weights configurable.

### Daily planner

Initial allocation target for ~1100:

- tactics 35%;
- calculation 20%;
- own-game analysis 20%;
- endgames 15%;
- openings 10%.

These are product heuristics, not scientific constants. Adapt from real data.

Plan ordering preference:

1. due reviews;
2. recent real-game weakness;
3. weak/high-value skill;
4. calculation;
5. rotating curriculum.

---

## Puzzle rules

Lichess puzzle source is CC0.

Important dataset semantic:

- take the FEN;
- apply the **first UCI move** from `Moves`;
- the player begins solving from the **second move**.

Write a regression test for this before any production ingestion.

Do not download the full dataset in browser.

Development:

- small fixture file.

Production pipeline:

- download official `.csv.zst`;
- filter/validate;
- stratify by rating/theme;
- output a manageable database/artifact;
- store source date/hash.

Initial target: 100k–300k curated puzzles; an earlier beta may ship 25k–50k.

---

## Puzzle experience

Before answer:

- no engine eval;
- no motif label in mixed mode;
- optional hint;
- board is primary focus.

Hints escalate:

1. category of thought;
2. relevant piece/square;
3. first move.

After answer:

- solution;
- motif;
- short explanation;
- playable variation;
- “por que meu lance falha?”;
- update attempt + skill;
- if important, create/update review card.

---

## Game-review rules

### Pass 1 — human

Engine hidden. Ask:

- “Onde você acha que a partida mudou?”
- allow notes/markers.

### Pass 2 — engine

Perform cheap scan first, then deeper analysis only on candidate critical positions.

Prefer node budgets over only fixed depth.

For each critical user move persist:

- FEN before;
- user move;
- best move;
- PV;
- CP/mate;
- WDL before/after;
- score loss;
- severity;
- detected skills/explanation code.

Do not mark every slightly inferior move. Typical game review should emphasize a small number of actionable moments.

### WDL warning

Stockfish WDL is engine-selfplay calibrated. It can be used internally for consistent severity comparison; never label it “sua chance humana de vitória”.

Initial severity heuristics can use expected-score loss bands around:

- 3–8 percentage points: inaccuracy;
- 8–18 pp: mistake;
- more than 18 pp: blunder;

These are configurable and must be empirically calibrated. Mate/material overrides are allowed.

---

## Deterministic explanations

Do not invent a motif when confidence is low.

Start with detectors for:

- hanging piece;
- missed clean capture;
- fork/dual attack;
- pin;
- back rank;
- missed mate;
- king-safety tactical exposure;
- basic endgame/tablebase issue.

Output structure:

1. what happened;
2. what signal was visible;
3. what thinking habit would prevent it;
4. what training is generated.

Unknown is better than a confident wrong explanation.

---

## Openings

Do not build a deep memorization tree as the core experience for 1100.

Prioritize:

- principles;
- narrow repertoire;
- most common opponent responses;
- structures/plans;
- lines actually seen in user's games.

Use:

- CC0 Lichess opening names;
- Lichess Opening Explorer through an adapter/cache;
- FSRS for repertoire nodes.

Every repertoire card should be able to store an **idea/note**, not only a move.

---

## Endgames

Initial curriculum:

- queen mate;
- rook mate;
- opposition;
- key squares;
- rule of square;
- passed pawn;
- basic rook concepts.

When position is covered by tablebase, use tablebase adapter for perfect play. Cache results and provide graceful fallback if external service fails.

---

## Lichess API behavior

Follow current official guidance:

- one request at a time;
- if HTTP 429 occurs, wait one full minute before resuming;
- cache results;
- never scrape HTML.

Import must be incremental and deduplicate by source game ID.

---

## Chess.com import

Use official read-only PubAPI for public data.

- no HTML scraping;
- use a descriptive User-Agent as required/recommended by current docs;
- respect ETag/Last-Modified when useful;
- cache and deduplicate.

---

## Accessibility

All feature PRs must consider:

- keyboard focus;
- visible focus style;
- WCAG AA contrast;
- no color-only status;
- reduced motion;
- 200% zoom;
- 360px viewport;
- touch targets;
- textual move list as a board alternative.

---

## Performance

- Do not load Stockfish on landing page.
- Lazy-load engine on first analysis/training need.
- Stockfish stays in Worker.
- Preload next puzzle, not entire dataset.
- Cancel stale analysis.
- Avoid deep engine pass on every ply.
- Test on mid-range hardware/mobile.

---

## Tests required before merge

### Unit

- legal moves / PGN adapter;
- Lichess puzzle first-move semantic;
- UCI parser;
- WDL perspective/orientation;
- planner;
- mastery update;
- FSRS adapter;
- severity classifier;
- explanation detectors.

### Contract

- Stockfish mate-in-1 fixture;
- MultiPV;
- cancel old analysis;
- worker restart.

Do not assert one exact centipawn number across engine versions. Assert ranking/properties/ranges.

### E2E

At minimum as features land:

- onboarding;
- solve puzzle;
- fail puzzle → review;
- reload persistence;
- import PGN;
- review game;
- create training from mistake;
- finish daily plan;
- export/import backup;
- mobile viewport.

---

## Definition of Done

A feature is not done until:

- TypeScript passes;
- lint passes;
- relevant tests pass;
- loading/error/empty states exist;
- mobile works;
- keyboard/focus checked;
- persistence checked if applicable;
- external requests have timeout/cache/error behavior;
- new dependency is documented with license;
- docs/ADR updated if behavior or architecture changed.

---

## Implementation sequence

Never implement more than one numbered phase without an explicit instruction to continue.

### Phase 0 — Repository foundation

- bootstrap;
- design tokens;
- routes/shell;
- lint/typecheck/test;
- docs + ADR skeleton;
- CI;
- licenses inventory.

### Phase 1 — Chess domain + board

- chess.js adapter;
- react-chessboard wrapper;
- FEN/PGN viewer;
- navigation;
- tests.

### Phase 2 — Stockfish worker

- GPL assets/source notice;
- provider;
- UCI;
- nodes/MultiPV/WDL;
- cancellation/recovery.

### Phase 3 — Puzzles

- fixture dataset;
- parser;
- trainer;
- attempts;
- themes;
- ingestion scripts.

### Phase 4 — Local persistence + FSRS

- repository;
- IndexedDB;
- review cards;
- backup import/export.

### Phase 5 — Skill graph + daily planner

- mastery;
- adaptive selection;
- 20/40/60-min plans;
- dashboard.

### Phase 6 — Game import + analysis

- PGN;
- Lichess;
- Chess.com;
- human-first review;
- critical-position pipeline.

### Phase 7 — Own mistakes → training

- mistake cards;
- deterministic explanation rules;
- planner feedback loop.

### Phase 8 — Endgames

- lesson schema;
- tablebase adapter;
- initial curriculum.

### Phase 9 — Openings

- ECO/name data;
- explorer adapter;
- repertoire + FSRS;
- own-game frequency.

### Phase 10 — Diagnostic + content

- 12–20-item diagnostic;
- 30–40 micro-lessons;
- first seven-day plan.

### Phase 11 — PWA + launch quality

- offline/local-first polish;
- performance;
- accessibility;
- legal/source pages;
- beta release.

### Later only

- account/cloud sync;
- Maia/human-like sparring;
- social/community;
- LLM explanations.

---

## How to work on each phase

For every phase:

1. Read related product/docs.
2. Inspect existing code before changing architecture.
3. Write a short implementation checklist in the task/PR notes.
4. Implement the smallest vertical slice first.
5. Add tests with the logic, not after all code is written.
6. Run lint/typecheck/tests.
7. Manually verify the primary flow.
8. Update docs/licenses.
9. Summarize files changed, tradeoffs, tests and remaining risks.
10. Stop at the phase boundary.

Do not “helpfully” start the next phase.

---

## First command to Claude Code

When starting from an empty repository, use this instruction:

> Read `CLAUDE.md` and the full LanceZero product specification. Implement **Phase 0 only**. Bootstrap the project with the approved stack, create the folder/documentation skeleton, implement the LanceZero design tokens and a responsive application shell with placeholder routes, configure lint/typecheck/Vitest, add a minimal CI workflow, and create the initial license inventory. Do not install Stockfish or chess-specific runtime packages until the phase that needs them unless required to validate the bootstrap. At the end, run all checks and report changed files, commands run, decisions made and any blocker. Do not proceed to Phase 1.

After reviewing Phase 0, explicitly tell Claude Code to proceed to Phase 1, and so on.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
