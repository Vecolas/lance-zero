# ADR-0005 — Isolar artefatos GPL e não usar Chessground

- **Estado:** aceito
- **Data:** 2026-09-09

## Contexto

O Stockfish é GPL-3.0. O Chessground, biblioteca de tabuleiro do Lichess, também
é GPL-3.0, e o próprio projeto afirma que o website combinado deve ser
distribuído sob GPL. As duas escolhas têm efeitos bem diferentes: uma engine
carregada como binário separado e uma biblioteca de UI importada dentro do bundle
não ocupam o mesmo lugar na fronteira de licença.

## Decisão

1. **Não usar Chessground.** O tabuleiro do núcleo é `react-chessboard`, MIT.
2. **Isolar os artefatos do Stockfish** em `public/engine/stockfish/`, com
   `COPYING.txt`, um `SOURCE.txt` contendo versão, tag, commit e URL exatas, e
   registro de hash.
3. Não modificar o código da engine no MVP.
4. Não fazer bundling da engine dentro do bundle da aplicação: carregar apenas
   via Web Worker, a partir de `public/`.
5. Toda dependência nova entra com linha em `docs/LICENSES.md` e na página
   pública `/licenses`.

## Consequências

- O projeto preserva liberdade sobre a própria licença.
- `react-chessboard` tem menos recursos que o Chessground: setas, highlights e
  acessibilidade de teclado ficam por nossa conta na Fase 1.
- A página `/licenses` existe desde a Fase 0, e não como item de última hora
  antes do beta.
