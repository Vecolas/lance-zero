/**
 * Fixture de aberturas: recorte curado do `lichess-org/chess-openings` (CC0-1.0).
 *
 * A ORIGEM. Cinco arquivos TSV (`a.tsv` … `e.tsv`) com três colunas — `eco`,
 * `name`, `pgn` — e ~3.810 linhas no total. Este arquivo é um RECORTE, não uma
 * cópia: as linhas abaixo foram extraídas verbatim da origem em 2026-09-09 e
 * conferidas uma a uma contra ela; nada aqui foi digitado de memória.
 *
 * POR QUE NÃO O DUMP INTEIRO. Duas razões, e a segunda é a que manda:
 *
 * 1. peso — 3.810 linhas viram bundle que ninguém no público-alvo precisa;
 * 2. produto — o `CLAUDE.md` e a issue #10 são explícitos: árvore profunda de
 *    memorização é a experiência ERRADA para ~1100. O que o aluno precisa é
 *    reconhecer meia dúzia de aberturas pelo nome, entender o princípio e saber
 *    o que fazer quando o adversário sai do livro. Uma fixture pequena é o
 *    tamanho certo do problema, não uma limitação temporária.
 *
 * O FORMATO QUE UM PIPELINE DE INGESTÃO DEVE PRODUZIR (fora desta rodada, como
 * `scripts/puzzles/build-dataset.mjs` faz para os puzzles):
 *
 * - baixar os cinco TSV de `lichess-org/chess-openings`;
 * - registrar data e hash da origem, como o pipeline de puzzles faz;
 * - filtrar pelo conjunto que o produto usa — as aberturas dos repertórios
 *   iniciais mais as respostas que aparecem de fato nas partidas do usuário;
 * - emitir exatamente `EntradaEco[]`: `eco`, `nome` e `pgn` copiados sem
 *   alteração; `nomePt` NÃO vem da origem e é preenchido à mão.
 *
 * `nomePt` fica `undefined` sempre que não houver nome brasileiro consagrado.
 * Inventar tradução para `Zukertort Opening` seria criar um nome que só existe
 * aqui, e o aluno nunca mais o encontraria em lugar nenhum.
 *
 * O portão `tests/unit/openings-eco.test.ts` varre esta lista INTEIRA: forma do
 * ECO, legalidade de cada `pgn`, unicidade da posição, e a prova de que o nome
 * é encontrado por POSIÇÃO e não por texto (transposição).
 */

import type { EntradaEco } from '@/lib/openings'

export const FIXTURE_ECO: readonly EntradaEco[] = [
  // --- primeiros lances -----------------------------------------------------
  { eco: 'A04', nome: 'Zukertort Opening', pgn: '1. Nf3' },
  { eco: 'A06', nome: 'Zukertort Opening', pgn: '1. Nf3 d5' },
  { eco: 'A10', nome: 'English Opening', pgn: '1. c4', nomePt: 'Abertura Inglesa' },
  { eco: 'A40', nome: "Queen's Pawn Game", pgn: '1. d4', nomePt: 'Abertura do Peão da Dama' },
  { eco: 'B00', nome: "King's Pawn Game", pgn: '1. e4', nomePt: 'Abertura do Peão do Rei' },

  // --- respostas a 1.e4 que não são 1...e5 ---------------------------------
  { eco: 'B00', nome: 'Pirc Defense', pgn: '1. e4 d6', nomePt: 'Defesa Pirc' },
  { eco: 'B01', nome: 'Scandinavian Defense', pgn: '1. e4 d5', nomePt: 'Defesa Escandinava' },
  { eco: 'B02', nome: 'Alekhine Defense', pgn: '1. e4 Nf6', nomePt: 'Defesa Alekhine' },
  { eco: 'B06', nome: 'Modern Defense', pgn: '1. e4 g6', nomePt: 'Defesa Moderna' },
  { eco: 'B10', nome: 'Caro-Kann Defense', pgn: '1. e4 c6', nomePt: 'Defesa Caro-Kann' },
  { eco: 'B20', nome: 'Sicilian Defense', pgn: '1. e4 c5', nomePt: 'Defesa Siciliana' },
  { eco: 'C00', nome: 'French Defense', pgn: '1. e4 e6', nomePt: 'Defesa Francesa' },

  // --- 1.e4 e5 --------------------------------------------------------------
  { eco: 'C20', nome: "King's Pawn Game", pgn: '1. e4 e5', nomePt: 'Abertura do Peão do Rei' },
  { eco: 'C23', nome: "Bishop's Opening", pgn: '1. e4 e5 2. Bc4', nomePt: 'Abertura do Bispo' },
  { eco: 'C25', nome: 'Vienna Game', pgn: '1. e4 e5 2. Nc3', nomePt: 'Abertura Vienense' },
  { eco: 'C30', nome: "King's Gambit", pgn: '1. e4 e5 2. f4', nomePt: 'Gambito do Rei' },
  {
    eco: 'C40',
    nome: "King's Knight Opening",
    pgn: '1. e4 e5 2. Nf3',
    nomePt: 'Abertura do Cavalo do Rei',
  },
  { eco: 'C41', nome: 'Philidor Defense', pgn: '1. e4 e5 2. Nf3 d6', nomePt: 'Defesa Philidor' },
  { eco: 'C42', nome: "Petrov's Defense", pgn: '1. e4 e5 2. Nf3 Nf6', nomePt: 'Defesa Petrov' },
  {
    eco: 'C44',
    nome: "King's Knight Opening: Normal Variation",
    pgn: '1. e4 e5 2. Nf3 Nc6',
    nomePt: 'Abertura do Cavalo do Rei: Variante Normal',
  },
  {
    eco: 'C44',
    nome: 'Scotch Game',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. d4',
    nomePt: 'Abertura Escocesa',
  },
  {
    eco: 'C46',
    nome: 'Three Knights Opening',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Nc3',
    nomePt: 'Abertura dos Três Cavalos',
  },

  // --- italiana: o repertório inicial de brancas -----------------------------
  {
    eco: 'C50',
    nome: 'Italian Game',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4',
    nomePt: 'Abertura Italiana',
  },
  {
    eco: 'C50',
    nome: 'Italian Game: Giuoco Piano',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5',
    nomePt: 'Abertura Italiana: Giuoco Piano',
  },
  {
    eco: 'C50',
    nome: 'Italian Game: Giuoco Pianissimo',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d3',
    nomePt: 'Abertura Italiana: Giuoco Pianissimo',
  },
  {
    eco: 'C51',
    nome: 'Italian Game: Evans Gambit',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4',
    nomePt: 'Abertura Italiana: Gambito Evans',
  },
  {
    eco: 'C53',
    nome: 'Italian Game: Classical Variation',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3',
    nomePt: 'Abertura Italiana: Variante Clássica',
  },
  {
    eco: 'C54',
    nome: 'Italian Game: Classical Variation',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6',
    nomePt: 'Abertura Italiana: Variante Clássica',
  },
  {
    eco: 'C55',
    nome: 'Italian Game: Two Knights Defense',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6',
    nomePt: 'Abertura Italiana: Defesa dos Dois Cavalos',
  },
  {
    eco: 'C57',
    nome: 'Italian Game: Two Knights Defense, Knight Attack',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5',
    nomePt: 'Abertura Italiana: Defesa dos Dois Cavalos, Ataque do Cavalo',
  },
  {
    eco: 'C60',
    nome: 'Ruy Lopez',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5',
    nomePt: 'Abertura Espanhola',
  },

  // --- 1.d4 -----------------------------------------------------------------
  { eco: 'A45', nome: 'Indian Defense', pgn: '1. d4 Nf6', nomePt: 'Defesa Índia' },
  { eco: 'A80', nome: 'Dutch Defense', pgn: '1. d4 f5', nomePt: 'Defesa Holandesa' },
  { eco: 'D00', nome: "Queen's Pawn Game", pgn: '1. d4 d5', nomePt: 'Abertura do Peão da Dama' },
  { eco: 'D02', nome: "Queen's Pawn Game: Zukertort Variation", pgn: '1. d4 d5 2. Nf3' },
  { eco: 'D06', nome: "Queen's Gambit", pgn: '1. d4 d5 2. c4', nomePt: 'Gambito da Dama' },
  { eco: 'D10', nome: 'Slav Defense', pgn: '1. d4 d5 2. c4 c6', nomePt: 'Defesa Eslava' },
  {
    eco: 'D30',
    nome: "Queen's Gambit Declined",
    pgn: '1. d4 d5 2. c4 e6',
    nomePt: 'Gambito da Dama Recusado',
  },
  { eco: 'E60', nome: 'Indian Defense: West Indian Defense', pgn: '1. d4 Nf6 2. c4 g6' },
]
