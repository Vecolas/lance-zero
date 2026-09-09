/**
 * Objetivo de uma posição de final, e a sua verificação.
 *
 * DECISÃO CENTRAL: o objetivo de um final é VERIFICÁVEL POR CÓDIGO, nunca por
 * opinião. "Converter a vantagem" e "jogar bem" não entram aqui — só condições
 * que `avaliarObjetivo` sabe decidir olhando o tabuleiro. Um objetivo que só um
 * humano sabe julgar vira, na prática, um objetivo que ninguém julga: a lição
 * fica verde para qualquer coisa que o aluno faça.
 *
 * Segunda decisão: nada aqui chama engine nem rede. A função é pura e roda em
 * milissegundos, para poder ser aplicada a cada lance do treino e para o portão
 * do currículo poder varrer todas as posições sem depender de serviço externo.
 *
 * LIMITE DECLARADO: empate por REPETIÇÃO (tríplice) não é reconhecido. Um FEN
 * não carrega histórico, e o desenho preferido é não afirmar do que afirmar
 * errado. Empate por regra dos 50 lances é reconhecido, porque o contador de
 * meios-lances está no próprio FEN.
 */

import type { Side } from '@/domain/types'
import { positionStatus, type PieceType, type PromotionPiece } from '@/lib/chess'

/**
 * Os tipos de objetivo que existem.
 *
 * É a FONTE que o portão do currículo varre: um tipo novo que entre aqui e não
 * seja tratado em `avaliarObjetivo` ou não apareça no currículo reprova. Lista
 * escrita à mão em outro lugar nunca acusaria o que nunca entrou nela.
 */
export const TIPOS_DE_OBJETIVO = ['mate-em', 'promocao', 'empate-defendido'] as const

export type TipoDeObjetivo = (typeof TIPOS_DE_OBJETIVO)[number]

/** Dar mate em no máximo `lancesMaximos` lances do aluno. */
export interface ObjetivoMateEm {
  tipo: 'mate-em'
  /** Meios-lances DO ALUNO permitidos até o mate. */
  lancesMaximos: number
}

/**
 * Promover um peão.
 *
 * A condição é expressa como "ter pelo menos N peças do tipo X", e não como
 * "promoveu", porque essa é a forma que se decide olhando só o FEN atual. O
 * portão do currículo exige que a condição NÃO esteja satisfeita na posição
 * inicial — senão o objetivo nasceria cumprido e a lição aprovaria qualquer
 * lance.
 */
export interface ObjetivoPromocao {
  tipo: 'promocao'
  peca: PromotionPiece
  quantidadeMinima: number
}

/** Segurar o empate com a posição inferior. */
export interface ObjetivoEmpateDefendido {
  tipo: 'empate-defendido'
}

export type ObjetivoFinal = ObjetivoMateEm | ObjetivoPromocao | ObjetivoEmpateDefendido

/**
 * Motivos possíveis, como CÓDIGO e não como frase.
 *
 * Quem desenha a tela traduz; função de domínio não tem tradutor e não deve
 * inventar um. De quebra, o teste não passa a depender do idioma da máquina.
 */
export const MOTIVOS_DE_OBJETIVO = [
  'mate-aplicado',
  'promocao-alcancada',
  'empate-alcancado',
  'aluno-recebeu-mate',
  'afogamento-indevido',
  'empate-indevido',
  'lances-esgotados',
  'sem-peao-para-promover',
  'em-andamento',
] as const

export type MotivoDeObjetivo = (typeof MOTIVOS_DE_OBJETIVO)[number]

/**
 * Estado tri-valorado de propósito.
 *
 * Booleano esconderia a diferença entre "ainda dá" e "já era", que é
 * exatamente o que a tela precisa saber para oferecer recomeçar a posição.
 */
export type EstadoDoObjetivo = 'cumprido' | 'falhou' | 'em-andamento'

export interface ResultadoObjetivo {
  estado: EstadoDoObjetivo
  motivo: MotivoDeObjetivo
}

/**
 * O que a avaliação precisa saber além do tabuleiro.
 *
 * Os dois campos são OBRIGATÓRIOS de propósito. Campo opcional aqui seria o
 * desenho em que alguém esquece de passar `lancesDoAluno` e todo mate em 2 vira
 * mate em qualquer número de lances, sem uma linha no console.
 */
export interface ContextoObjetivo {
  /** Lado que o aluno joga. */
  ladoDoAluno: Side
  /** Meios-lances DO ALUNO já jogados a partir da posição inicial. */
  lancesDoAluno: number
}

/** Tipos de peça que podem aparecer num FEN. É a fonte da contagem. */
const TIPOS_DE_PECA: readonly PieceType[] = ['p', 'n', 'b', 'r', 'q', 'k']

export type ContagemDePecas = Record<PieceType, number>

/**
 * Conta as peças de uma cor lendo o campo de tabuleiro do FEN.
 *
 * Mora aqui, e não em `@/lib/chess`, porque o adapter de xadrez ainda não expõe
 * o tabuleiro e este arquivo não pode editá-lo. Quando expuser, esta função
 * muda de casa — é uma dívida conhecida, não um desenho.
 */
export function contarPecas(fen: string, cor: Side): ContagemDePecas {
  const contagem: ContagemDePecas = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 }
  const tabuleiro = fen.trim().split(/\s+/)[0] ?? ''
  for (const caractere of tabuleiro) {
    const ehBranca = caractere >= 'A' && caractere <= 'Z'
    const tipo = caractere.toLowerCase() as PieceType
    if (!TIPOS_DE_PECA.includes(tipo)) {
      continue
    }
    if ((cor === 'w') !== ehBranca) {
      continue
    }
    contagem[tipo] += 1
  }
  return contagem
}

function adversarioDe(lado: Side): Side {
  return lado === 'w' ? 'b' : 'w'
}

/**
 * Diz se a posição atual cumpre o objetivo.
 *
 * FEN inválido LANÇA (via `positionStatus`), de propósito: FEN inválido
 * chegando aqui é bug de quem chama, não situação de treino. Devolver
 * `em-andamento` para um FEN quebrado seria o desenho em que o erro passa.
 */
export function avaliarObjetivo(
  fen: string,
  objetivo: ObjetivoFinal,
  contexto: ContextoObjetivo,
): ResultadoObjetivo {
  const status = positionStatus(fen)
  const adversario = adversarioDe(contexto.ladoDoAluno)

  // Levar mate derruba qualquer objetivo, inclusive o de segurar empate.
  if (status.isCheckmate && status.turn === contexto.ladoDoAluno) {
    return { estado: 'falhou', motivo: 'aluno-recebeu-mate' }
  }

  switch (objetivo.tipo) {
    case 'mate-em':
      return avaliarMate(status, objetivo, contexto, adversario)
    case 'promocao':
      return avaliarPromocao(fen, status, objetivo, contexto)
    case 'empate-defendido':
      return avaliarEmpate(status)
    default:
      // Tipo novo no union sem tratamento aqui: o compilador reprova nesta linha.
      return objetivoNaoTratado(objetivo)
  }
}

function objetivoNaoTratado(objetivo: never): never {
  throw new Error(`Objetivo de final sem tratamento: ${JSON.stringify(objetivo)}`)
}

type Status = ReturnType<typeof positionStatus>

function avaliarMate(
  status: Status,
  objetivo: ObjetivoMateEm,
  contexto: ContextoObjetivo,
  adversario: Side,
): ResultadoObjetivo {
  if (status.isCheckmate && status.turn === adversario) {
    return contexto.lancesDoAluno <= objetivo.lancesMaximos
      ? { estado: 'cumprido', motivo: 'mate-aplicado' }
      : { estado: 'falhou', motivo: 'lances-esgotados' }
  }
  if (status.isStalemate) {
    return { estado: 'falhou', motivo: 'afogamento-indevido' }
  }
  if (status.isInsufficientMaterial || status.isDraw) {
    return { estado: 'falhou', motivo: 'empate-indevido' }
  }
  if (contexto.lancesDoAluno >= objetivo.lancesMaximos) {
    return { estado: 'falhou', motivo: 'lances-esgotados' }
  }
  return { estado: 'em-andamento', motivo: 'em-andamento' }
}

function avaliarPromocao(
  fen: string,
  status: Status,
  objetivo: ObjetivoPromocao,
  contexto: ContextoObjetivo,
): ResultadoObjetivo {
  const contagem = contarPecas(fen, contexto.ladoDoAluno)
  if (contagem[objetivo.peca] >= objetivo.quantidadeMinima) {
    return { estado: 'cumprido', motivo: 'promocao-alcancada' }
  }
  // Sem peão não há promoção possível: é falha, não "ainda dá".
  if (contagem.p === 0) {
    return { estado: 'falhou', motivo: 'sem-peao-para-promover' }
  }
  if (status.isStalemate) {
    return { estado: 'falhou', motivo: 'afogamento-indevido' }
  }
  if (status.isInsufficientMaterial || status.isDraw) {
    return { estado: 'falhou', motivo: 'empate-indevido' }
  }
  return { estado: 'em-andamento', motivo: 'em-andamento' }
}

function avaliarEmpate(status: Status): ResultadoObjetivo {
  if (status.isStalemate || status.isInsufficientMaterial || status.isDraw) {
    return { estado: 'cumprido', motivo: 'empate-alcancado' }
  }
  return { estado: 'em-andamento', motivo: 'em-andamento' }
}
