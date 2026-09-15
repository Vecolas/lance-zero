---
name: lancezero-visual-quality-gate
description: This skill should be used whenever finishing, reviewing, testing, refactoring, or releasing LanceZero frontend work, especially after changing layout, typography, cards, chessboards, tabs, responsive behavior, Today, Training, Openings, Endgames, Game Review, Progress, or settings. Use it when the user asks to check visual bugs, spacing, overlaps, regressions, responsiveness, presentation quality, or whether a page is ready to ship.
version: 1.0.0
---

# LanceZero Visual Quality Gate

Do not declare frontend work complete based only on code review.

Verify the rendered product.

## Required viewport set

At minimum inspect:
```text
360 × 800
768 × 1024
1280 × 800
1440 × 900
```

Add a short-height desktop case for sticky layouts.

## Content stress cases

Test each relevant component with:
- short title;
- long 2-line title;
- long Portuguese description;
- completed status;
- in-progress status;
- missing optional metadata;
- error message;
- empty state.

For board/commentary pages, test unusually long commentary.

## Overlap audit

Fail the page for:
- text covering text;
- title covering action;
- tabs covering each other;
- board covered by ordinary content;
- sticky header covering anchor content;
- status icon covering title;
- feedback expanding over controls;
- tooltip/popover trapped by overflow unexpectedly.

## Clipping audit

Fail if required content is hidden by:
- fixed `height`;
- line-clamp with no full alternative;
- `overflow: hidden`;
- `white-space: nowrap`.

## Visual hierarchy audit

Ask:
1. Can the user identify the page in one glance?
2. Is the main task obvious?
3. Is only one action visually primary in the current decision context?
4. Is tertiary metadata quiet?
5. Is the board sufficiently prominent on chess-task pages?

## Consistency audit

Compare:
- card radii;
- padding;
- page gutters;
- heading sizes;
- status vocabulary;
- tab behavior;
- button hierarchy;
- mini-board sizing.

Do not create route-specific variants without reason.

## Visual regression

Use Playwright `toHaveScreenshot()` for stable structural pages/components.

Good candidates:
- Hoje;
- Treino;
- Aberturas library;
- Opening learn;
- Opening train;
- Finais library;
- Endgame learn;
- Endgame play-out;
- Game Review;
- Progress;
- Settings shell.

Run screenshot tests in a stable environment.

Mask or neutralize volatile content instead of accepting huge pixel thresholds.

## Accessibility structure snapshot

Use `toMatchAriaSnapshot()` for key pages where heading/landmark/control structure matters.

Do not rely on screenshot snapshots to prove accessibility.

## Layout shift

Reserve dimensions for:
- images;
- mini-boards;
- loading skeletons;
- major panels.

Avoid font/image changes that cause major reflow after first paint.

Use Next.js font/image facilities appropriately.

## Interaction state screenshots

Where useful, capture:
- default;
- hover/focus if meaningful;
- completed;
- feedback open;
- error;
- mobile.

Do not snapshot every trivial state.

## Manual check

Visual snapshots cannot reliably judge:
- whether hierarchy makes pedagogical sense;
- whether copy is too verbose;
- whether board is too small relative to task;
- whether the page feels crowded.

Perform a brief human-style visual review after automated gates.

## Release blocker

Block release for:
- overlapping text;
- inaccessible primary control;
- private content rendering into wrong shell;
- unusable mobile board/task;
- hidden lesson explanation;
- completion status not visible/persistent;
- visual regression changing hierarchy without deliberate approval.
