/**
 * Schema de lição de final.
 *
 * Uma lição é: um conceito curto em PT-BR + posições treináveis, cada uma com
 * um objetivo que o código sabe julgar (`objetivo.ts`).
 *
 * DECISÃO: toda posição carrega uma LINHA MODELO obrigatória, em UCI, a partir
 * do FEN inicial. Ela serve a dois donos ao mesmo tempo:
 *
 * 1. ao aluno, como exemplo resolvido — o PEDAGOGY manda a orientação começar
 *    forte e desvanecer, e exemplo resolvido é a forma mais barata disso;
 * 2. ao portão, como PROVA de que o objetivo é alcançável naquele FEN. Currículo
 *    com posição inválida é pior que currículo vazio: a lição parece existir e
 *    não pode ser cumprida.
 *
 * O que a linha modelo NÃO prova está escrito em `linha-modelo.ts`.
 *
 * Este arquivo é só o contrato e o cálculo derivado. O conteúdo mora em
 * `@/content/endgames/curriculo`.
 */

import type { SkillId, Side } from '@/domain/types'
import type { ContextoObjetivo, ObjetivoFinal } from './objetivo'

/**
 * Números ajustáveis das lições de final.
 *
 * HEURÍSTICA DE PRODUTO, não constante científica: o minuto por posição foi
 * escolhido para o planner conseguir dimensionar o bloco de finais antes de
 * existir telemetria. Recalibrar com o tempo real de resolução medido nas
 * tentativas, e não com opinião.
 */
export const LICAO_CONFIG = {
  /** Minutos estimados para o aluno resolver uma posição de final. */
  minutosPorPosicao: 2,
  /** Minutos estimados de leitura do conceito, uma vez por lição. */
  minutosDeConceito: 1,
} as const

/** Uma posição treinável dentro de uma lição. */
export interface PosicaoDeFinal {
  /** Único no currículo inteiro, não só dentro da lição. */
  id: string
  fen: string
  /** Lado que o aluno joga. É sempre a vez dele no FEN inicial. */
  ladoDoAluno: Side
  objetivo: ObjetivoFinal
  /** O que o aluno tem de fazer, em uma frase. */
  enunciado: string
  /**
   * Linha modelo em UCI a partir de `fen`, alternando os dois lados, começando
   * pelo aluno. Ao final dela o objetivo está cumprido.
   */
  linhaModelo: readonly string[]
  /**
   * Dicas em ordem crescente de entrega, como manda o CLAUDE.md: categoria de
   * pensamento, depois peça/casa relevante, depois o primeiro lance. Pode ser
   * vazia — array vazio é neutro; opcional seria o desenho em que alguém
   * esquece e a tela não sabe se não há dica ou se ninguém escreveu.
   */
  dicas: readonly string[]
}

/** Uma unidade do currículo de finais. */
export interface LicaoDeFinal {
  /** Único no currículo. */
  id: string
  /** Título em PT-BR. */
  titulo: string
  /** Habilidade do catálogo que esta lição treina. */
  habilidade: SkillId
  /** Conceito em uma ou duas frases. Não é aula: é o que fica na cabeça. */
  conceito: string
  posicoes: readonly PosicaoDeFinal[]
}

/**
 * Contexto inicial de uma posição: nenhum lance do aluno ainda.
 *
 * Existe para ninguém montar `{ ladoDoAluno, lancesDoAluno: 0 }` à mão em cinco
 * lugares diferentes e um deles divergir.
 */
export function contextoInicialDe(posicao: PosicaoDeFinal): ContextoObjetivo {
  return { ladoDoAluno: posicao.ladoDoAluno, lancesDoAluno: 0 }
}

/**
 * Minutos estimados de uma lição.
 *
 * Calculado na hora a partir de `LICAO_CONFIG`, nunca gravado no conteúdo: um
 * número derivado e congelado é uma cópia que diverge da fonte em silêncio no
 * dia em que alguém girar o botão.
 */
export function estimarMinutos(licao: LicaoDeFinal): number {
  return LICAO_CONFIG.minutosDeConceito + licao.posicoes.length * LICAO_CONFIG.minutosPorPosicao
}

/** Todas as posições do currículo informado, achatadas. */
export function posicoesDe(licoes: readonly LicaoDeFinal[]): PosicaoDeFinal[] {
  return licoes.flatMap((licao) => [...licao.posicoes])
}
