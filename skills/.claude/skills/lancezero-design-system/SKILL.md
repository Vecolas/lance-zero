---
name: lancezero-design-system
description: Use when creating or modifying LanceZero UI, pages, components, landing sections, dashboard, chessboard styling, forms, navigation, cards, icons, dark mode, responsive behavior, accessibility, motion, visual assets, or frontend design decisions. Use this skill to keep all UI consistent with the current LanceZero identity.
version: 1.0.0
---

# LanceZero Design System

## Current identity is authoritative

Use the latest identity:

```text
clean
precise
intelligent
calm
modern
analytical
premium
minimal
```

Central mark:
> chess pawn enclosed/wrapped by the number 0.

## Current palette

```text
Background:      #F7F9FB
Surface:         #FFFFFF
Secondary BG:    #EEF3F7

Navy 950:        #071521
Navy 900:        #0B1D2C
Navy 800:        #112B40

Slate 600:       #596B78
Slate 400:       #91A0AA

Zero Blue:       #00A9D6
Zero Cyan:       #20C9E8
Zero Deep:       #087DA7
Zero Soft:       #D9F4FA
```

The older paper/coral/sage palette is superseded.

## Typography

Default:
- Inter;
- modern system sans fallback.

Use strong hierarchy and generous whitespace.

## Shape

Recommended radii:
- 6 small;
- 8 controls;
- 12 cards;
- 16 large modal/card.

Avoid pill-shape everywhere.

## Visual priority

Every screen should have one clear primary action.

Do not make:
- cards;
- graphs;
- badges;
- CTA buttons

all compete simultaneously.

## Brand anti-patterns

Avoid:
- medieval wood/gold;
- aggressive esports;
- neon cyberpunk;
- casino gamification;
- clutter;
- generic Chess.com/Lichess imitation;
- excessive glassmorphism.

## Chess UI

The board is functional first.

Selection/move states must be readable without relying on red/green alone.

Keyboard/touch interactions and screen-reader semantics matter.

## Feedback

Correct:
- restrained success cue;
- concise explanation.

Incorrect:
- informative, not punitive;
- highlight why;
- explain next mental check.

## Responsive

On mobile prioritize:
1. board;
2. action;
3. explanation.

Secondary panels should collapse into drawers/tabs/accordions.

## Motion

Prefer 120–220 ms subtle transitions.

Avoid bounce/celebratory noise for ordinary actions.

## When not to use

Do not use for backend or domain-only work.
For generic visual execution you may combine this skill with the official frontend-design plugin, but this skill wins on brand constraints.
