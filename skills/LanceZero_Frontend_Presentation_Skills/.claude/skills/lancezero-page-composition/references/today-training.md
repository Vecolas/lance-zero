# Hoje and Treino

## Hoje

Purpose:
> choose and complete today's independent activities in any order.

Header:
```text
Hoje
3 de 5 concluídas
~18 min restantes (optional)
```

Do not show a global `Começar treino` button.

Primary region is the list/grid of DailyActivity cards.

Each card shows only useful information:
```text
mode label
title
short description
estimated time
reason (optional)
status
```

Status:
```text
○ pending
◔ in progress
✓ completed
```

Completed cards remain visible.

Do not reorder or visually remove cards after completion unless user explicitly selects a filter.

### Layout

Prefer a single strong list on narrow/medium screens.

On wide desktop, a 2-column card grid is allowed only if:
- reading order remains obvious;
- cards do not become excessively tall/uneven;
- long titles do not distort alignment.

### Completed card

Visually quieter, not disabled-looking.

It remains clickable for `Rever`.

## Treino

Purpose:
> choose what kind of learning action to perform.

Opening the page never starts a puzzle.

Regions:
1. Continuar aprendendo
2. Praticar
3. Revisões
4. Cálculo
5. Currículo
6. Minhas partidas / erros transformados em treino

Avoid rendering every region as identical card grids.

Use hierarchy:
- current/recommended work first;
- library/curriculum lower;
- stats tertiary.

Modes must be visibly distinct by label and copy, not arbitrary colors.
