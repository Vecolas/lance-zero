/** Partidas curtas usadas nos testes de PGN e de navegação. */

/** Mate do pastor: 4 lances completos, termina em mate. */
export const matePastor = `[Event "Fixture LanceZero"]
[Site "?"]
[Date "2026.01.01"]
[Round "?"]
[White "Brancas"]
[Black "Pretas"]
[Result "1-0"]

1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0`

/** Partida com roque dos dois lados e captura. */
export const comRoque = `[Event "Fixture LanceZero"]
[White "Brancas"]
[Black "Pretas"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6 5. d3 O-O 6. Bg5 h6 7. Bxf6 Qxf6 *`

/** PGN com comentários e uma variação, para provar que o parser não quebra. */
export const comComentarios = `[Event "Fixture LanceZero"]
[White "Brancas"]
[Black "Pretas"]
[Result "*"]

1. e4 {a abertura mais comum} e5 2. Nf3 (2. Bc4 {a italiana} Bc5) 2... Nc6 3. Bb5 *`
