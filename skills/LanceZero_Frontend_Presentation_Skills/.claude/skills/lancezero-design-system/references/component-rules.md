# Component Rules

## Buttons
- 40–44 px default visual height when practical.
- Keep icon and text aligned.
- Avoid icon-only primary actions unless universally understood and labelled.
- Do not place multiple primary buttons in the same compact region.

## Cards
- Use heading + description + metadata/status.
- Entire card may be the interaction target in library/list contexts.
- Do not place nested clickable controls inside a clickable card without careful semantics.
- Use `min-width: 0` in flex/grid children that contain text.

## Tabs
- Clear selected state.
- Selected state includes more than color when possible.
- On narrow screens: horizontal scroll or compact alternative; never squeeze labels into overlap.
- Keep tab names short.
- Tabs represent peer views, not sequential lesson steps.

## Badges
- Metadata only.
- Keep quiet.
- Do not use badges as the dominant visual element.

## Empty states
Explain:
1. what this area is;
2. why it is empty;
3. what action is possible.

## Loading
Reserve approximate dimensions to prevent layout shift.

## Errors
Place error near the affected content.
Do not destroy the surrounding layout when an error appears.

## Text overflow
For user/content-driven text:
- allow wrapping;
- use `overflow-wrap` when needed;
- do not use `whitespace-nowrap` broadly.

Line clamp may be used only for non-critical previews. Full content must remain reachable.
