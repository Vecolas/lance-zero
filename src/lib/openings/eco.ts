/**
 * Nomes e códigos ECO: schema, índice por posição e busca por linha.
 *
 * A FONTE é o `lichess-org/chess-openings` (CC0-1.0), três colunas por linha —
 * `eco`, `name`, `pgn` — em cinco arquivos TSV (`a.tsv` … `e.tsv`). O schema
 * daqui espelha essas três colunas de propósito: quando o pipeline de ingestão
 * existir, ele converte linha a linha sem inventar campo nenhum.
 *
 * DECISÃO — O DUMP NÃO VAI PARA O NAVEGADOR. São ~3.810 linhas na origem, e a
 * experiência que o produto quer para ~1100 não é uma árvore profunda de
 * memorização: é reconhecer meia dúzia de aberturas pelo nome. O que este
 * módulo consome é uma FIXTURE pequena e curada (`@/content/openings`), no
 * mesmo espírito de `scripts/puzzles/build-dataset.mjs`, que filtra o dump de
 * puzzles em vez de embarcá-lo. O script de ingestão em si ficou fora desta
 * rodada — ver o cabeçalho da fixture para o formato que ele deve produzir.
 *
 * DECISÃO — O ÍNDICE É POR POSIÇÃO, NÃO POR SEQUÊNCIA DE LANCES. É o que faz
 * transposição funcionar de graça: `1.e4 e5 2.Bc4 Nc6 3.Nf3` não existe como
 * linha no `chess-openings`, e mesmo assim é reconhecida como `C50 Italian
 * Game`, porque chega à mesma posição que `1.e4 e5 2.Nf3 Nc6 3.Bc4`. Um índice
 * por texto de PGN erraria esse caso — e erraria calado, dizendo "abertura
 * desconhecida" para uma das aberturas mais jogadas do mundo.
 *
 * DECISÃO — NOME DE ABERTURA É O MAIS PROFUNDO, não o primeiro. `1.e4 e5 2.Nf3
 * Nc6 3.Bc4 Bc5` passa por `King's Pawn Game`, `King's Knight Opening` e
 * `Italian Game` antes de chegar a `Giuoco Piano`. O nome útil é o último
 * reconhecido, como faz qualquer visualizador de partida.
 */

import { applyMove, ChessParseError, identidadeDePosicao, START_FEN, type Ply } from '@/lib/chess'
import type { Abertura } from '@/domain/types'

/**
 * Uma linha da fixture, espelhando as colunas do `chess-openings`.
 *
 * `nomePt` é acréscimo NOSSO e não existe na origem: o app é PT-BR-first e o
 * aluno brasileiro chama a `Italian Game` de Abertura Italiana. Fica opcional
 * porque a maioria das aberturas não tem nome consagrado em português, e
 * inventar um seria pior que mostrar o nome internacional.
 */
export interface EntradaEco {
  /** Código ECO, de `A00` a `E99`. */
  eco: string
  /** Nome canônico, em inglês, exatamente como na origem CC0. */
  nome: string
  /** Lances em SAN a partir da posição inicial, no formato `1. e4 e5 2. Nf3`. */
  pgn: string
  /** Nome consagrado em português, quando existir. */
  nomePt?: string
}

/** Forma do código ECO. É a FONTE da validação; nada valida ECO por conta. */
const ECO_PATTERN = /^[A-E][0-9]{2}$/

export function ehCodigoEco(eco: string): boolean {
  return ECO_PATTERN.test(eco)
}

/**
 * Quebra o campo `pgn` da fixture em lances SAN.
 *
 * O formato da origem intercala numeração (`1. e4 e5 2. Nf3`). Aqui ela é
 * descartada: o que importa é a sequência de lances, e a numeração é derivável
 * da posição na lista.
 */
export function lancesDaEntrada(pgn: string): string[] {
  return pgn
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0 && !/^\d+\.+$/.test(token))
}

/** Índice de aberturas por identidade de posição. */
export interface IndiceEco {
  /** Chave: identidade da posição. Valor: a abertura reconhecida ali. */
  readonly porPosicao: ReadonlyMap<string, Abertura>
  /** Quantas entradas entraram no índice. */
  readonly tamanho: number
}

/** Onde uma abertura foi reconhecida dentro de uma linha. */
export interface AberturaReconhecida {
  abertura: Abertura
  /** Meios-lances até a posição reconhecida. `0` é a posição inicial. */
  profundidade: number
  /** Identidade da posição reconhecida. */
  identidade: string
}

function aberturaDe(entrada: EntradaEco): Abertura {
  return { eco: entrada.eco, nome: entrada.nome, nomePt: entrada.nomePt ?? null }
}

/**
 * Identidade da posição ao fim dos lances de uma entrada.
 *
 * LANÇA quando algum lance é ilegal. Não é degradação graciosa: a fixture é
 * dado NOSSO, versionado no repositório, e uma linha inválida ali é bug de
 * ingestão — engolir em silêncio deixaria a abertura sem nome para sempre.
 * `@/content/openings/indice` monta o índice no carregamento do módulo justamente
 * para que a varredura de módulos (`tests/unit/varredura-de-modulos.test.ts`)
 * reprove uma fixture quebrada; leia o cabeçalho de lá antes de mudar isto.
 */
export function identidadeDaEntrada(entrada: EntradaEco): string {
  const lances = lancesDaEntrada(entrada.pgn)
  if (lances.length === 0) {
    throw new ChessParseError(`Entrada ECO sem lance nenhum: ${entrada.eco} ${entrada.nome}`)
  }
  let fen = START_FEN
  for (const san of lances) {
    const aplicado = applyMove(fen, san)
    if (aplicado === null) {
      throw new ChessParseError(
        `Lance ilegal na entrada ECO ${entrada.eco} ${entrada.nome}: ${san} em ${fen}`,
      )
    }
    fen = aplicado.fenAfter
  }
  return identidadeDePosicao(fen)
}

/**
 * Monta o índice.
 *
 * Entrada repetida (mesma posição duas vezes) faz a ÚLTIMA vencer, e isso é
 * decisão consciente: a fixture é curada e o portão
 * (`tests/unit/openings-eco.test.ts`) reprova posição repetida, então esta
 * regra nunca deveria ser exercida em produção. Ela existe só para o
 * comportamento ser determinístico caso seja.
 */
export function construirIndiceEco(entradas: readonly EntradaEco[]): IndiceEco {
  const porPosicao = new Map<string, Abertura>()
  for (const entrada of entradas) {
    porPosicao.set(identidadeDaEntrada(entrada), aberturaDe(entrada))
  }
  return { porPosicao, tamanho: porPosicao.size }
}

/** A abertura desta posição exata, ou `null`. Aceita FEN em qualquer forma. */
export function aberturaDaPosicao(indice: IndiceEco, fen: string): Abertura | null {
  return indice.porPosicao.get(identidadeDePosicao(fen)) ?? null
}

/**
 * A abertura mais profunda reconhecida ao longo de uma sequência de lances SAN.
 *
 * Devolve `null` quando nenhuma posição da linha está no índice. Lance ilegal
 * INTERROMPE a busca e devolve o que já se reconheceu, em vez de lançar: aqui a
 * entrada costuma vir de uma partida importada, e uma partida com PGN torto não
 * pode derrubar a contagem de frequência das outras.
 */
export function aberturaDaLinha(
  indice: IndiceEco,
  lancesSan: readonly string[],
): AberturaReconhecida | null {
  let fen = START_FEN
  let encontrada: AberturaReconhecida | null = null

  const inicial = indice.porPosicao.get(identidadeDePosicao(fen))
  if (inicial) {
    encontrada = { abertura: inicial, profundidade: 0, identidade: identidadeDePosicao(fen) }
  }

  for (let i = 0; i < lancesSan.length; i += 1) {
    const aplicado = applyMove(fen, lancesSan[i])
    if (aplicado === null) {
      return encontrada
    }
    fen = aplicado.fenAfter
    const identidade = identidadeDePosicao(fen)
    const abertura = indice.porPosicao.get(identidade)
    if (abertura) {
      encontrada = { abertura, profundidade: i + 1, identidade }
    }
  }
  return encontrada
}

/** Atalho para quem já tem os meios-lances de uma partida lida por `parsePgn`. */
export function aberturaDosPlies(
  indice: IndiceEco,
  plies: readonly Ply[],
): AberturaReconhecida | null {
  return aberturaDaLinha(
    indice,
    plies.map((ply) => ply.san),
  )
}
