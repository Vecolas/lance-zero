/**
 * Contrato de um exercício posicional conferível, e a verificação dele.
 *
 * ONDE ISTO MORA, e por quê: em `@/domain/exercicios`. É o vocabulário
 * COMPARTILHADO entre o banco de diagnóstico (`@/content/diagnostic`) e a etapa
 * de recuperação das lições. Os dois precisam da mesma prova — lance aceito
 * cumpre o objetivo, alternativa apresentada como errada falha — e escrever
 * essa verificação duas vezes seria duas fontes para a mesma verdade, com a
 * segunda cópia divergindo no dia em que a primeira ganhasse um caso novo.
 *
 * Morava em `@/domain/diagnostic` só porque aquele era o único diretório que a
 * rodada que o escreveu podia criar, e o nome do endereço fazia parecer que a
 * regra era do diagnóstico. Ver a issue #74.
 *
 * DECISÃO QUE ESTE ARQUIVO CARREGA — as alternativas erradas são CONTEÚDO
 * VERIFICADO, não enfeite. O portão exige que cada uma seja legal e que cada
 * uma FALHE o objetivo. É o lado do portão que morde para dentro: se eu
 * escrever como "errada" uma jogada que também ganha, o banco reprova em vez de
 * ensinar ao aluno que a resposta certa dele estava errada.
 *
 * `lancesAceitos` e `alternativas` são TUPLAS não-vazias: exercício sem
 * resposta certa, ou sem nenhuma alternativa, não chega a compilar. É a mesma
 * ideia do esquema de lição — impedir na forma em vez de cobrar num portão
 * depois.
 */

import type { Side } from '@/domain/types'
import { posicaoEhJogavel, positionStatus } from '@/lib/chess'
import { avaliarLance, type ObjetivoDeDiagnostico } from './objetivo'

/** Lista com pelo menos um elemento. */
export type NaoVazia<T> = readonly [T, ...T[]]

/** Um exercício posicional conferível: posição, objetivo e a chave de correção. */
export interface ExercicioPosicional {
  /** Único no catálogo onde ele vive. */
  id: string
  fen: string
  /** Lado do aluno. É sempre a vez dele no FEN. */
  ladoDoAluno: Side
  objetivo: ObjetivoDeDiagnostico
  lancesAceitos: NaoVazia<string>
  alternativas: NaoVazia<string>
}

/** Um problema encontrado num exercício, já com o item que o carrega. */
export interface FalhaDeItem {
  itemId: string
  problema: string
}

/**
 * Confere um exercício inteiro e devolve TODOS os problemas dele.
 *
 * Devolve lista em vez de lançar no primeiro problema porque quem chama é o
 * portão do banco: parar no primeiro item quebrado esconderia os outros e
 * transformaria a correção do conteúdo numa fila de uma falha por execução.
 */
export function verificarExercicio(item: ExercicioPosicional): FalhaDeItem[] {
  const falhas: string[] = []

  if (!posicaoEhJogavel(item.fen)) {
    // Sem posição jogável nada mais pode ser conferido: as buscas lançariam.
    return [{ itemId: item.id, problema: `FEN inválido ou posição impossível: ${item.fen}` }]
  }
  const estado = positionStatus(item.fen)
  if (estado.turn !== item.ladoDoAluno) {
    return [{ itemId: item.id, problema: `o FEN não está na vez de ${item.ladoDoAluno}` }]
  }
  if (estado.isGameOver) {
    return [{ itemId: item.id, problema: 'a posição já está terminada' }]
  }

  for (const uci of item.lancesAceitos) {
    const veredito = avaliarLance(item.fen, item.ladoDoAluno, uci, item.objetivo)
    if (!veredito.cumpre) {
      falhas.push(`lance aceito não cumpre o objetivo: ${veredito.motivo}`)
    }
  }

  for (const uci of item.alternativas) {
    if (item.lancesAceitos.includes(uci)) {
      falhas.push(`${uci} está ao mesmo tempo entre os aceitos e entre as alternativas`)
      continue
    }
    const veredito = avaliarLance(item.fen, item.ladoDoAluno, uci, item.objetivo)
    if (veredito.cumpre) {
      falhas.push(
        `alternativa apresentada como errada também cumpre o objetivo: ${veredito.motivo}`,
      )
    }
  }

  return falhas.map((problema) => ({ itemId: item.id, problema }))
}
