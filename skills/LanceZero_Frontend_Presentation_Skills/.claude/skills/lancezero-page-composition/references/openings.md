# Openings Pages

## `/aberturas`

Purpose:
> visually browse opening courses/repertoires.

Header:
```text
Aberturas
Aprenda ideias, planos e variações. Não apenas memorize lances.
```

Filters must not dominate the page.

Use mini-board cards.

Card anatomy:
```text
mini-board
opening name
side / level
short opening sequence
short description
status/progress
```

The mini-board is preview content, not an interactive board.

Do not load Stockfish in cards.

Do not place a large CTA inside every card. The whole card can be the link.

### Grid
Use responsive CSS grid:
```text
repeat(auto-fit/minmax(...))
```
with a controlled max number of columns.

Ensure mini-boards keep a square aspect ratio.

## `/aberturas/[slug]`

Header:
```text
Abertura Italiana
Brancas · ECO...
short concept statement
```

Primary actions:
- Aprender
- Treinar

Peer views:
- Visão geral
- Aprender
- Treinar
- Variações
- Planos
- Erros comuns
- Progresso

Do not squeeze every tab into tiny widths on mobile.

### Learn mode

Desktop:
```text
board | commentary
      | move list / supporting content
```

Board remains the dominant visual object.

Comment panel:
```text
current move
why
what it prepares
warning/alternative
```

Never place long move commentary as a floating overlay on the board.

### Training mode

Remove answer-revealing UI:
- no arrows;
- no best move;
- no engine bar;
- no opening-explorer percentages.

Prompt/feedback should have a stable reserved area below/beside board so the board does not jump when feedback changes.

### Variations

Use visual hierarchy, not a wall of nested indentation.

Mini-boards can identify major branches.

Progressive disclosure for deeper branches.
