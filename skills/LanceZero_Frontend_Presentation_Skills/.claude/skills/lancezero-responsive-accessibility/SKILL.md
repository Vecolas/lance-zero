---
name: lancezero-responsive-accessibility
description: This skill should be used whenever implementing or reviewing LanceZero responsive behavior, mobile/tablet layout, keyboard navigation, focus states, zoom/text resizing, contrast, target sizes, ARIA/semantic HTML, tabs, drawers, forms, chessboard accessibility, or when fixing clipping, horizontal overflow, overlapping text, tiny controls, or inaccessible interactions.
version: 1.0.0
---

# LanceZero Responsive and Accessibility

Target WCAG 2.2 AA for application UI.

## Reflow

Ensure ordinary content works at a width equivalent to 320 CSS px without loss of information/functionality.

The chessboard is inherently two-dimensional, but surrounding content must reflow.

Never require horizontal scrolling for:
- page titles;
- explanatory text;
- cards;
- forms;
- activity lists.

Tabs may use controlled horizontal scrolling when it is the clearest compact pattern.

## Text resize

Test at 200% text zoom.

Allow:
- headings to wrap;
- cards to grow vertically;
- buttons to grow or wrap when needed.

Do not clip because of fixed height.

## Target size

Treat 24×24 CSS px as a minimum WCAG 2.2 baseline or provide sufficient spacing.

For primary product controls prefer larger practical targets, usually around 40–44 px high.

Chess squares are spatial targets and follow their own interaction semantics, but alternative click/tap interactions should remain usable.

## Contrast

Use at least:
- 4.5:1 normal text;
- 3:1 large text in applicable cases;
- sufficient contrast for controls, focus and non-text indicators.

Validate actual combinations rather than assuming brand colors pass.

## Focus

Every keyboard-interactive element requires a visible focus state.

Do not remove outline without an equal or better replacement.

Focus order follows visual/logical order.

When a drawer/modal closes, return focus sensibly.

## Semantics

Use:
- `header`;
- `nav`;
- `main`;
- `section`/`article` where meaningful;
- `aside` for supporting content;
- real `button` and `a`.

Do not simulate a button with `div` + click handler.

## Headings

Use one H1 for page identity.

Nest section headings according to content structure.

Do not skip levels merely to get a visual size.

## Navigation landmarks

Label multiple navigation regions distinctly.

Examples:
- Primary;
- Opening sections;
- Lesson navigation.

Avoid excessive landmarks.

## Cards

If the whole card navigates:
- implement a real link or clearly structured link;
- avoid invalid nested buttons/links.

If card contains multiple independent actions, do not make the entire card a conflicting interaction surface.

## Status and color

Use text/icon/shape plus color.

`✓ Concluída` is better than green background alone.

## Board

Provide:
- accessible label/context;
- textual move feedback;
- keyboard/click alternative where feasible;
- orientation announcement where needed.

Do not encode essential learning only through arrows/highlights.

## Responsive rules

### Mobile
Prioritize:
1. page identity;
2. board/task;
3. primary prompt/explanation;
4. secondary tools.

### Tablet
Avoid awkward half-width board + half-width long prose if both become narrow.

### Desktop
Use side-by-side when it actually improves simultaneous reference.

## Zoom/overflow acceptance

At 200%:
- no text overlaps;
- no actions disappear;
- no fixed bottom/sticky region covers content;
- page remains navigable.

## Reduced motion

Respect `prefers-reduced-motion`.

Do not require animation to understand state changes.

## Testing

Use Playwright for:
- keyboard routes;
- accessible role/name assertions;
- ARIA snapshots on structural pages;
- 320/360 mobile;
- zoom/text stress where automation permits.

Read `references/acceptance-checklist.md` before declaring a page done.
