/**
 * Fixture de puzzles no formato exato do dump do Lichess (CC0).
 *
 * Colunas, na ordem do arquivo oficial:
 * `PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags`
 *
 * SEMÂNTICA QUE NÃO PODE SER ESQUECIDA: `FEN` é a posição ANTES de um lance
 * preparatório, e o PRIMEIRO lance de `Moves` é esse lance, jogado pelo
 * ADVERSÁRIO. Quem resolve é o lado que joga DEPOIS de `Moves[0]`. Por isso
 * quase toda linha aqui tem `b` no FEN e é resolvida pelas BRANCAS — e duas
 * linhas têm `w` no FEN e são resolvidas pelas PRETAS, justamente para que o
 * teste de regressão não passe por acidente.
 *
 * Todas as posições foram construídas à mão e conferidas com `chess.js`:
 * o FEN é legal e cada lance de `Moves` é legal na sua vez.
 */

export const PUZZLE_CSV_HEADER =
  'PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags'

/** Mate em 1 na última fileira. Resolvido pelas brancas: `Rd8#`. */
export const CSV_MATE_EM_UM =
  'LZmt1,r5k1/5ppp/8/8/8/8/8/3R2K1 b - - 0 1,a8a7 d1d8,750,74,96,1840,backRankMate mate mateIn1 endgame short,https://lichess.org/lz000001#42,'

/** Garfo de cavalo em f6, ganhando a dama em d5. */
export const CSV_GARFO =
  'LZfrk,6k1/3q1ppp/8/8/4N3/8/5PPP/6K1 b - - 0 1,d7d5 e4f6 g8h8 f6d5,1120,80,93,2410,fork advantage middlegame short,https://lichess.org/lz000002#31,'

/** Peça pendurada: o bispo vai para d5 e a torre come de graça. */
export const CSV_PECA_PENDURADA =
  'LZhng,6k1/5ppp/4b3/8/8/8/5PPP/3R2K1 b - - 0 1,e6d5 d1d5,620,88,90,3120,hangingPiece advantage endgame oneMove short,https://lichess.org/lz000003#55,'

/** Cravada: Bg5 crava o cavalo f6 na dama d8 e ganha a peça. */
export const CSV_CRAVADA =
  'LZpin,3q1rk1/5ppp/5n2/8/8/8/5PPP/2B2RK1 b - - 0 1,f8e8 c1g5 g7g6 g5f6,1340,79,88,1560,pin advantage middlegame short,https://lichess.org/lz000004#22,'

/** Corredor com sacrifício de dama: Qe8+ Rxe8 Rxe8#. */
export const CSV_CORREDOR =
  'LZbrk,6k1/3r1ppp/8/8/Q7/8/5PPP/4R1K1 b - - 0 1,d7d8 a4e8 d8e8 e1e8,1480,77,95,2050,backRankMate deflection mate mateIn2 sacrifice short,https://lichess.org/lz000005#48,'

/** Promoção simples em final de rei e peão. */
export const CSV_PROMOCAO =
  'LZprm,8/1P6/8/8/8/6k1/8/6K1 b - - 0 1,g3f3 b7b8q,540,92,84,980,advancedPawn promotion endgame oneMove short,https://lichess.org/lz000006#77,'

/** Mate da escada: solução de 7 lances (4 do jogador). */
export const CSV_ESCADA_LONGA =
  'LZlad,8/8/8/8/3k4/8/1R6/R6K b - - 0 1,d4d5 a1a5 d5d6 b2b6 d6d7 a5a7 d7d8 b6b8,1610,85,91,760,mate mateIn4 endgame rookEndgame veryLong,https://lichess.org/lz000007#61,'

/** Espeto: Qh4+ e a torre em h1 cai. */
export const CSV_ESPETO =
  'LZskw,6k1/8/8/8/1Q6/2K5/8/7r b - - 0 1,g8h8 b4h4 h8g8 h4h1,1250,81,89,1330,skewer advantage endgame queenEndgame short,https://lichess.org/lz000008#39,'

/** Ataque descoberto: Nc6+ abre a torre em d1 e o cavalo come a dama. */
export const CSV_DESCOBERTO =
  'LZdsc,3k4/8/q7/8/3N4/8/8/3R2K1 b - - 0 1,a6a5 d4c6 d8c8 c6a5,1390,83,87,1120,discoveredAttack advantage endgame short,https://lichess.org/lz000009#27,'

/** Remoção do defensor: Rxd7 tira o bispo e o bispo branco espeta em b5. */
export const CSV_REMOVE_DEFENSOR =
  'LZcpd,2b1k3/8/8/1r6/8/8/8/3RKB2 b - - 0 1,c8d7 d1d7 e8d7 f1b5,1520,78,86,940,capturingDefender advantage endgame short,https://lichess.org/lz000010#33,'

/** Garfo de peão: d5 ataca cavalo e torre ao mesmo tempo. */
export const CSV_GARFO_DE_PEAO =
  'LZpwn,4k3/8/2n1r3/8/3P4/8/8/6K1 b - - 0 1,e8f8 d4d5 e6e5 d5c6,880,86,92,1690,fork advantage endgame short,https://lichess.org/lz000011#19,'

/**
 * FEN com `w`, resolvido pelas PRETAS. Existe para provar que o lado que
 * resolve sai de `Moves[0]`, não do campo `w`/`b` do FEN cru.
 */
export const CSV_PECA_PENDURADA_PRETAS =
  'LZhnb,3r2k1/5ppp/8/8/8/4B3/5PPP/6K1 w - - 0 1,e3d4 d8d4,660,90,89,1410,hangingPiece advantage endgame oneMove short,https://lichess.org/lz000012#40,'

/** Mate em 1 na última fileira, também resolvido pelas PRETAS. */
export const CSV_MATE_EM_UM_PRETAS =
  'LZmtb,3r2k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1,a1a2 d8d1,780,75,94,2230,backRankMate mate mateIn1 endgame short,https://lichess.org/lz000013#52,'

/** Todas as linhas válidas, na ordem em que aparecem no CSV de teste. */
export const CSV_PUZZLES_VALIDOS = [
  CSV_MATE_EM_UM,
  CSV_GARFO,
  CSV_PECA_PENDURADA,
  CSV_CRAVADA,
  CSV_CORREDOR,
  CSV_PROMOCAO,
  CSV_ESCADA_LONGA,
  CSV_ESPETO,
  CSV_DESCOBERTO,
  CSV_REMOVE_DEFENSOR,
  CSV_GARFO_DE_PEAO,
  CSV_PECA_PENDURADA_PRETAS,
  CSV_MATE_EM_UM_PRETAS,
] as const

/** Colunas de menos: o parser precisa recusar sem derrubar o lote. */
export const CSV_INVALIDO_COLUNAS = 'LZbad1,8/8/8/8/8/8/8/8 w - - 0 1,e2e4,1500'

/** FEN impossível: `isValidFen` reprova. */
export const CSV_INVALIDO_FEN =
  'LZbad2,zzz/8/8 w - - 0 1,e2e4 e7e5,1400,75,90,120,fork,https://lichess.org/lzbad2,'

/** Rating não numérico. */
export const CSV_INVALIDO_RATING =
  'LZbad3,6k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1,g8h8 g1h1,muito-dificil,75,90,120,fork,https://lichess.org/lzbad3,'

/**
 * Linha bem formada, mas `Moves[0]` é ilegal no FEN. Passa no CSV e explode
 * em `toSolvable` — é assim que o pipeline de ingestão descobre puzzle podre.
 */
export const CSV_SETUP_ILEGAL =
  'LZbad4,6k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1,a1a8 g1f1,1200,80,90,100,fork,https://lichess.org/lzbad4,'

export const CSV_LINHAS_INVALIDAS = [
  CSV_INVALIDO_COLUNAS,
  CSV_INVALIDO_FEN,
  CSV_INVALIDO_RATING,
] as const

/** CSV completo com cabeçalho, linhas válidas e linhas quebradas misturadas. */
export const CSV_COMPLETO = [
  PUZZLE_CSV_HEADER,
  CSV_MATE_EM_UM,
  CSV_INVALIDO_COLUNAS,
  CSV_GARFO,
  CSV_PECA_PENDURADA,
  CSV_INVALIDO_FEN,
  CSV_CRAVADA,
  CSV_CORREDOR,
  CSV_PROMOCAO,
  CSV_INVALIDO_RATING,
  CSV_ESCADA_LONGA,
  CSV_ESPETO,
  CSV_DESCOBERTO,
  CSV_REMOVE_DEFENSOR,
  CSV_GARFO_DE_PEAO,
  CSV_PECA_PENDURADA_PRETAS,
  CSV_MATE_EM_UM_PRETAS,
].join('\n')

/** Só as linhas válidas, com cabeçalho. */
export const CSV_SOMENTE_VALIDOS = [PUZZLE_CSV_HEADER, ...CSV_PUZZLES_VALIDOS].join('\n')
