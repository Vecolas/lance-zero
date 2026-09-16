/**
 * A jornada vista de FORA: pelo Roadmap, pelo Hoje e pelos catálogos.
 *
 * POR QUE ISTO É UM MÓDULO, e não três trechos repetidos: quatro telas
 * diferentes precisam responder as mesmas três perguntas sobre uma jornada —
 * "para onde este card leva?", "o que escrevo no botão?" e "quanto falta?". Sem
 * um lugar só, o Roadmap escreveria "Continuar" enquanto o Hoje escreveria
 * "Retomar" para o mesmo estado, e os dois discordariam do catálogo. O aluno
 * leria três produtos.
 *
 * O QUE ESTE MÓDULO NÃO FAZ: decidir se a jornada está concluída. Isso é
 * `jornadaConcluida`, derivado das etapas. Aqui só se TRADUZ o estado para
 * quem mostra.
 */

import {
  etapaCumprida,
  jornadaConcluida,
  progressoDaJornada,
  retomadaDaJornada,
  type DominioDeJornada,
  type RetomadaDaJornada,
  type StudyJourney,
  type StudyStage,
} from './jornada'

/**
 * O endereço de uma jornada.
 *
 * As rotas são PT-BR e cada domínio tem a sua, porque as abas são separadas e
 * continuam separadas. Um mapa aqui evita que cada chamador monte a string à
 * mão e erre o plural no dia em que uma rota mudar.
 */
export const ROTA_DO_DOMINIO: Record<DominioDeJornada, string> = {
  abertura: '/aberturas',
  final: '/finais',
}

export function rotaDaJornada(dominio: DominioDeJornada, slug: string): string {
  return `${ROTA_DO_DOMINIO[dominio]}/${slug}`
}

/**
 * Abre a jornada DIRETO numa etapa (plano §151).
 *
 * Existe para o card do Hoje que diz "Treinar Abertura Italiana" poder levar ao
 * treino em vez de recomeçar pela visão.
 *
 * NÃO É UM ATALHO: quem recebe o parâmetro aplica `voltarParaEtapa`, que só
 * aceita etapa já CONCLUÍDA ou a atual. Um link que pulasse o aprendizado
 * levaria o aluno ao treino sem o repertório — exatamente o que este trabalho
 * veio impedir —, e bastaria alguém colar a URL.
 */
export function rotaDaEtapa(dominio: DominioDeJornada, slug: string, stageId: string): string {
  return `${rotaDaJornada(dominio, slug)}?etapa=${encodeURIComponent(stageId)}`
}

/** O que uma tela de fora precisa saber sobre a jornada. */
export interface ResumoDaJornada {
  /**
   * QUAL rótulo o botão usa. Vem de `retomadaDaJornada`: um lugar só decide.
   *
   * É a ESCOLHA, não o texto: o domínio não fala idioma, e a frase é escrita pela
   * tela. Enquanto a frase saía daqui, traduzir o card exigiria traduzir dentro
   * do domínio.
   */
  rotulo: RetomadaDaJornada
  /**
   * As etapas, em número.
   *
   * ERA UMA FRASE ("5 de 9 etapas"), e a frase não atravessa idioma: em inglês a
   * ordem das palavras muda, e o plural de "etapa" muda com o número. Devolver
   * os dois números deixa a montagem para quem sabe o idioma.
   */
  concluidas: number
  total: number
  concluida: boolean
  /** A etapa onde o aluno está, para o deep link. `null` se nunca começou. */
  etapaAtual: string | null
}

export function resumoDaJornada(
  jornada: StudyJourney | null,
  stages: readonly StudyStage[],
): ResumoDaJornada {
  if (jornada === null) {
    return {
      rotulo: retomadaDaJornada(null),
      concluidas: 0,
      total: stages.length,
      concluida: false,
      etapaAtual: null,
    }
  }

  const progresso = progressoDaJornada(jornada, stages)
  return {
    rotulo: retomadaDaJornada(jornada),
    concluidas: progresso.concluidas,
    total: progresso.total,
    // DERIVADA das etapas, e não lida de `jornada.status`: o campo é cache, e um
    // cache que discorda do fato é como a mentira volta.
    concluida: jornadaConcluida(jornada, stages),
    etapaAtual: jornada.currentStageId,
  }
}

/**
 * O aluno já pode ir direto ao treino?
 *
 * Só quando tudo o que vem ANTES do treino já foi cumprido. É a mesma regra de
 * `concluirEtapa`, aplicada de fora — e é ela que permite ao Hoje oferecer
 * "Treinar" como card próprio sem criar uma porta que pula o conteúdo.
 */
export function podeIrDiretoAoTreino(
  jornada: StudyJourney | null,
  stages: readonly StudyStage[],
): boolean {
  if (jornada === null) return false
  const treino = stages.find((stage) => stage.ehTreinoFinal === true)
  if (!treino) return false
  return stages
    .filter((stage) => stage.id !== treino.id)
    .every((stage) => etapaCumprida(jornada, stage))
}

/**
 * O verbo do card do Hoje para esta jornada (plano §148–151).
 *
 * Três estados, três palavras, e nenhuma delas inventada na tela:
 * "Aprender" (nunca começou), "Continuar" (em andamento) e "Treinar" (o
 * conteúdo acabou e só falta demonstrar).
 */
export function verboDoHoje(
  jornada: StudyJourney | null,
  stages: readonly StudyStage[],
): VerboDoHoje {
  if (jornada === null || jornada.status === 'nao-iniciada') return 'aprender'
  return podeIrDiretoAoTreino(jornada, stages) ? 'treinar' : 'continuar'
}

/**
 * O VERBO é uma escolha, não uma palavra.
 *
 * Ele saía daqui já escrito em português — "Aprender", "Continuar", "Treinar" —
 * e isso amarrava o domínio a um idioma. Quem escreve a palavra é a tela, que
 * sabe em que idioma está; aqui fica só a decisão, que é a parte que não muda.
 */
export type VerboDoHoje = 'aprender' | 'continuar' | 'treinar'
