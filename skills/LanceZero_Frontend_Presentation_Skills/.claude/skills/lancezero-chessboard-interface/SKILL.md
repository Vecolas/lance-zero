---
name: lancezero-chessboard-interface
description: This skill should be used whenever implementing or styling a LanceZero chessboard, mini-board, board workspace, move list, arrows, highlights, opening-learning board, endgame play-out board, calculation board, puzzle board, or board-adjacent commentary/feedback. Trigger whenever the board must share space with text, panels, tabs, controls, or mobile layouts.
version: 1.0.0
---

# LanceZero Chessboard Interface

Treat the board as the primary interactive canvas for chess learning.

Do not let navigation, metadata, engine numbers or commentary reduce it to a secondary thumbnail on task pages.

## Board container

Maintain a square aspect ratio.

Use container-aware sizing.

Avoid hardcoded board pixel sizes across routes.

Provide a reasonable maximum so the board does not consume the entire ultrawide viewport.

## Side-by-side workspace

On wide screens use:
```text
board | learning panel
```

Requirements:
- both columns `min-width: 0`;
- board column remains usable;
- commentary wraps naturally;
- panel may scroll internally only when that improves the experience and does not trap focus.

Avoid fixed-height commentary that clips text.

## Stack breakpoint

When side-by-side would make the board or text uncomfortable, switch to:
```text
board
panel
```
rather than squeezing both.

Do not use a breakpoint merely because a framework default exists; test actual content.

## Board overlays

Allowed:
- arrows;
- square highlights;
- legal-move markers;
- last move;
- selection.

These overlays may use absolute positioning because they belong to board coordinates.

Ordinary UI text must not be overlaid on board squares.

## Color

Board colors:
```text
light  #EDF3F6
dark   #AFC6D1
```
or a close, tested variant.

Selected/last move states must remain visible without damaging piece contrast.

Do not use red/green as the sole distinction.

## Coordinates

Optional on mini-boards.

On learning/training boards, support coordinate visibility preference.

Coordinate labels must not obscure pieces.

## Move list

Use semantic buttons/controls for clickable moves.

Current move must be visually and programmatically identifiable.

On mobile:
- move list can become horizontal/compact;
- do not force a narrow permanent side column.

## Mini-boards

Mini-boards are previews:
- non-interactive by default;
- no Stockfish;
- no drag/drop;
- no API call per card;
- accessible name describes the represented opening/endgame.

Keep aspect ratio stable to avoid layout shift.

## Opening learn mode

Board + commentary is the main pair.

Commentary includes:
- current SAN;
- reason;
- plan;
- warning/alternative.

Do not place comments inside floating board overlays.

## Opening training mode

Hide answer-leading states:
- arrows;
- best move;
- engine evaluation;
- explorer percentages.

## Endgame learn mode

The panel emphasizes:
- current principle;
- recognition question;
- technique phase.

Do not make a move list the dominant explanatory element.

## Endgame play-out

Preserve:
- objective;
- current state;
- board continuity.

Do not reset the board after each correct move.

## Calculation

Allow user to think without moving pieces when the exercise requires blind calculation.

Separate:
- candidate recording;
- line visualization;
- final engine comparison.

## Accessibility fallback

Ensure important board instruction is also available as text.

Examples:
- “Bispo de f1 para c4, pressionando f7.”
- “A torre corta o rei na quinta fileira.”

Do not rely only on arrows.

## Performance

Avoid re-rendering the full page on every drag event.

Lazy-load heavy engine-related behavior.

Keep preview boards cheap.
