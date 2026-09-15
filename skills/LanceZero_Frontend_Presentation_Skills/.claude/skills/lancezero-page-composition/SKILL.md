---
name: lancezero-page-composition
description: This skill should be used whenever the user asks to implement or redesign a LanceZero page, route, dashboard, page shell, Today page, Training hub, Openings library/detail, Endgames library/detail, Game Review, Progress, profile/settings, or asks how page sections should be arranged. Use it whenever layout hierarchy, page titles, spacing between regions, tabs, side panels, cards, or desktop/mobile composition need decisions.
version: 1.0.0
---

# LanceZero Page Composition

Design each page around one job. Avoid assembling unrelated widgets because space is available.

Read the specific reference matching the route:
- `references/today-training.md`
- `references/openings.md`
- `references/endgames.md`
- `references/analysis-progress-settings.md`

## Universal page shell

Use:
```text
App navigation
└─ Main
   ├─ Page header
   ├─ Primary page region
   └─ Supporting regions
```

Ensure one semantic `main`.

Use a single page H1.

Page description should explain the purpose in one or two short sentences, not repeat the title.

## Desktop structure

Use grids only when regions benefit from simultaneous visibility.

For chess teaching pages:
- board gets visual priority;
- explanation gets enough width for comfortable reading;
- tertiary panels do not steal board width.

Use a board/content grid such as:
```text
minmax(0, board-column)
minmax(320px, commentary-column)
```
rather than rigid pixel columns.

## Mobile structure

Recompose rather than shrink:
```text
title
context
tabs/actions
board
primary prompt/explanation
secondary content
```

Move secondary sidebars into:
- tabs;
- accordions;
- drawers;
- sections below.

Do not preserve desktop two-column layout at widths where either column becomes unusable.

## Page rhythm

Keep consistent order:
1. identify where the user is;
2. state what can be done;
3. present main task;
4. show supporting details;
5. show history/progress last.

## Tabs

Use tabs when content is:
- peer-level;
- alternate view of same entity.

Do not use tabs for a mandatory sequential lesson flow; use lesson steps instead.

## Sticky behavior

Use sticky regions sparingly.

Good:
- move list/comment tools beside a desktop chessboard when viewport permits.

Bad:
- several stacked sticky toolbars consuming most vertical space.

Always test sticky layout with:
- short viewport height;
- browser zoom;
- mobile keyboard where relevant.

## No-overlap rule

Never use absolute positioning to solve ordinary alignment of:
- title + action;
- card status;
- comment + board;
- tabs;
- form labels.

For dynamic text, use flow/grid/flex.

Reserve absolute positioning for true overlays:
- board arrows;
- badges anchored to media;
- popovers/tooltips.

## State completeness

Every route with data needs:
- loading;
- empty;
- error;
- populated.

Ensure each state preserves page title and orientation.

## Done

A page is not finished until:
- heading hierarchy is valid;
- desktop and mobile compositions are explicit;
- 200% text zoom is considered;
- long content is considered;
- no required text is clipped;
- interactive controls remain reachable.
