---
name: lancezero-design-system
description: This skill should be used whenever the user asks to create, redesign, restyle, polish, implement, or review any LanceZero frontend page, component, card, navigation, dashboard, chess-learning UI, opening/endgame UI, responsive layout, typography, spacing, colors, dark mode, visual hierarchy, or presentation quality. It is the authoritative visual identity skill for LanceZero and should also be used when UI looks crowded, inconsistent, misaligned, generic, or unlike the brand.
version: 2.0.0
---

# LanceZero Design System

Apply a clean, analytical, calm visual language. Make the interface feel like a learning product, not a game portal, casino, esports dashboard, or generic admin template.

## Brand

Use the central mark:
- pawn enclosed/wrapped by the number zero.

Use the current palette:

```text
Background        #F7F9FB
Surface           #FFFFFF
Background 2      #EEF3F7

Navy 950          #071521
Navy 900          #0B1D2C
Navy 800          #112B40

Slate 600         #596B78
Slate 400         #91A0AA

Zero Blue         #00A9D6
Zero Cyan         #20C9E8
Zero Deep         #087DA7
Zero Soft         #D9F4FA

Success           #18A572
Warning           #E5A82B
Error             #D9534F
Info              #3A8DDE
Border            #E3E9ED
```

Treat older coral/sage/paper palettes as superseded.

## Typography hierarchy

Use Inter or the existing approved sans stack.

Create a predictable scale:
- page H1: 32–40 desktop, 28–34 compact/mobile;
- section H2: 24–30;
- subsection H3: 18–22;
- body: 15–17;
- metadata: 12–14.

Use responsive sizing when helpful, but keep hierarchy obvious.

Keep headings concise and meaningful. Do not use a styled `div` where a semantic heading is appropriate.

Allow headings to wrap. Never solve long headings by:
- shrinking to unreadable text;
- overlapping adjacent controls;
- clipping important words.

## Spacing

Use the 4 px scale:

```text
4 8 12 16 20 24 32 40 48 64 80 96
```

Default patterns:
- control internal gap: 8–12;
- compact group: 12–16;
- card padding: 20–24;
- section separation: 32–48;
- major page regions: 48–64.

Do not invent arbitrary gaps throughout the page.

## Containers

Prefer:
- app content max: ~1440 px;
- learning/chess workspace: ~1180–1280 px when side-by-side;
- prose/explanation column: ~680–860 px;
- consistent page gutter: 16 mobile, 24 tablet, 32–40 desktop.

Avoid full-width text paragraphs on ultrawide monitors.

## Cards

Use:
- Surface background;
- 1 px subtle border;
- 12 px radius;
- restrained shadow or no shadow;
- semantic internal hierarchy.

Do not use fixed card heights to force a perfect grid if content can vary.

Prefer:
```css
min-height
```
over:
```css
height
```

Never hide required text solely to preserve alignment.

## Actions

Keep one visual primary action per decision context.

Use:
- Primary — high-confidence action;
- Secondary — alternative;
- Ghost — utility;
- Destructive — actual destructive action only.

Do not make every card contain a bright CTA if the card itself is clickable.

## Status

Represent state with:
- icon/shape;
- text;
- color as reinforcement.

Examples:
```text
○ Pendente
◔ Em andamento
✓ Concluída
```

Do not communicate status by green/red alone.

## Visual density

Aim for a spacious learning environment.

When a page feels crowded:
1. remove redundant metadata;
2. group related content;
3. demote tertiary information;
4. use progressive disclosure;
5. add space only after simplifying structure.

Do not respond to crowding by shrinking everything.

## Icons

Use one coherent outline family, preferably Lucide/Phosphor if already present.

Avoid decorative icons with no semantic value.

## Motion

Use restrained transitions, generally 120–220 ms.

Respect `prefers-reduced-motion`.

Avoid bounce, confetti, or aggressive reward animations.

## Anti-patterns

Avoid:
- medieval wood/gold;
- neon/cyberpunk;
- excessive gradients;
- glassmorphism everywhere;
- casino gamification;
- huge hero cards inside the app;
- nested cards inside nested cards without semantic reason;
- absolute positioning for ordinary page layout;
- fixed heights on text panels;
- important information hidden behind hover only;
- arbitrary color variants per module.

## Read relevant references

Read `references/component-rules.md` when creating reusable components.

Read `references/content-hierarchy.md` when a page has many titles, labels, tabs or explanatory text.

For page-specific structure, also use `lancezero-page-composition`.
