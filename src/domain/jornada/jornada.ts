/**
 * A jornada de estudo: a INFRAESTRUTURA compartilhada entre Aberturas e Finais.
 *
 * O QUE ELA RESOLVE: hoje o aluno precisa entender a arquitetura da interface
 * para aprender. Ele abre uma abertura e tem de escolher sozinho entre "Visão
 * geral", "Aprender", "Variações", "Planos" e "Treinar" — decidindo, a cada
 * volta ao menu, qual é a próxima etapa pedagógica. Isso está invertido: o
 * aluno escolhe o CONTEÚDO ("quero estudar a Italiana"), e o produto decide a
 * SEQUÊNCIA.
 *
 * O QUE ELA NÃO RESOLVE, e é a fronteira que este arquivo existe para proteger:
 * o CURRÍCULO. Abertura e final compartilham a forma de uma jornada — etapas em
 * ordem, retomada, progresso — e não compartilham nada do que ensinam nem de
 * como validam um lance. Um `GenericChessTrainer` com dezenas de condicionais é
 * exatamente o que este desenho recusa (plano §161): o que se reaproveita é
 * APRESENTAÇÃO, nunca regra de domínio.
 *
 * Por isso `StudyJourney` não sabe o que é um repertório nem o que é uma
 * tablebase. Ela sabe que existem etapas, que uma delas é a última, e que
 * concluir a última não é a mesma coisa que ter passado por ela.
 */

import { rodadaFoiSucesso, type DesfechoDaRodada } from './niveis'

/** Os dois domínios. Não há um terceiro, e não há um agregado dos dois. */
export type DominioDeJornada = 'abertura' | 'final'

export type StatusDaJornada = 'nao-iniciada' | 'em-andamento' | 'em-treino' | 'concluida'

/**
 * A regra que faz uma etapa concluir.
 *
 * `leitura` é a etapa que o aluno só precisa ver — e "só precisa ver" NÃO
 * significa temporizador (plano §17). Quem decide que terminou de ler é o
 * aluno; quem decide o que vem depois é o sistema.
 *
 * `cobertura` é a regra do TREINO, e é a única que pode reprovar: ela exige que
 * um conjunto nomeado de alvos tenha sido demonstrado com SUCESSO. É onde a
 * proibição do bug se materializa — uma rodada falha não acrescenta nada aqui.
 */
export type RegraDeEtapa =
  /** Passou pela tela e disse que terminou. */
  | { tipo: 'leitura' }
  /** Respondeu os itens previstos. Errar não impede concluir a ETAPA. */
  | { tipo: 'itens'; total: number }
  /** Demonstrou com sucesso cada alvo exigido. */
  | { tipo: 'cobertura'; alvosExigidos: readonly string[] }

export interface StudyStage {
  id: string
  /** Tipo da etapa, próprio de cada domínio. A jornada não o interpreta. */
  tipo: string
  titulo: string
  /** Rótulo curto para o trilho de progresso. Cabe em celular. */
  rotuloCurto: string
  /** O que o aluno vai conseguir fazer ao fim desta etapa. */
  objetivo: string
  regra: RegraDeEtapa
  /**
   * A etapa é o ÁPICE da jornada (o treino final).
   *
   * Marcada e não inferida de "é a última": inferir amarraria a posição do
   * treino à ordem do array, e uma etapa de revisão acrescentada depois dele
   * quebraria a inferência em silêncio.
   */
  ehTreinoFinal?: boolean
}

/**
 * O estado gravado de uma jornada.
 *
 * `alvosCobertos` é por ETAPA de propósito: a cobertura de treino da Italiana
 * não tem nada a ver com a de outra abertura, e um conjunto global misturaria
 * as duas no dia em que dois ids coincidissem.
 */
export interface StudyJourney {
  id: string
  /** A abertura ou o final que esta jornada estuda. */
  learningObjectId: string
  dominio: DominioDeJornada
  stageIds: string[]
  currentStageId: string
  completedStageIds: string[]
  /** Alvos de cobertura já demonstrados, por etapa. */
  alvosCobertos: Record<string, string[]>
  /** Itens já respondidos, por etapa. Errar conta: responder é o que conclui. */
  itensRespondidos: Record<string, string[]>
  status: StatusDaJornada
  startedAt: string | null
  completedAt: string | null
  version: number
}

export const JOURNEY_VERSION = 1

/** Jornada nova: nada começado, cursor na primeira etapa. */
export function criarJornada(
  id: string,
  learningObjectId: string,
  dominio: DominioDeJornada,
  stages: readonly StudyStage[],
): StudyJourney {
  return {
    id,
    learningObjectId,
    dominio,
    stageIds: stages.map((stage) => stage.id),
    currentStageId: stages[0]?.id ?? '',
    completedStageIds: [],
    alvosCobertos: {},
    itensRespondidos: {},
    status: 'nao-iniciada',
    startedAt: null,
    completedAt: null,
    version: JOURNEY_VERSION,
  }
}

/**
 * A etapa cumpriu a própria regra?
 *
 * PURA, e é a peça central. `cobertura` só fecha quando TODO alvo exigido foi
 * coberto — e alvo só entra em `alvosCobertos` por `registrarRodada`, que
 * recusa rodada falha. É assim que "errar não conclui" deixa de depender de
 * disciplina.
 */
export function etapaCumprida(jornada: StudyJourney, stage: StudyStage): boolean {
  switch (stage.regra.tipo) {
    case 'leitura':
      return jornada.completedStageIds.includes(stage.id)
    case 'itens':
      return (jornada.itensRespondidos[stage.id]?.length ?? 0) >= stage.regra.total
    case 'cobertura': {
      const cobertos = new Set(jornada.alvosCobertos[stage.id] ?? [])
      return stage.regra.alvosExigidos.every((alvo) => cobertos.has(alvo))
    }
  }
}

/**
 * Registra o desfecho de uma rodada.
 *
 * AQUI A TRAVA MORDE. Rodada falha devolve a jornada com o `alvo` NÃO
 * acrescentado — e sem alvo, `etapaCumprida` continua `false`, e sem etapa
 * cumprida a jornada não avança nem conclui. O caminho do bug deixou de existir.
 *
 * Não muta, e não apaga sucesso anterior (plano §65): errar a variação B depois
 * de acertar a mainline e a variação A mantém as duas primeiras cobertas. Zerar
 * tudo a cada erro seria punição, e transformaria o treino numa corrida de
 * sorte em vez de uma medida de cobertura.
 */
export function registrarRodada(
  jornada: StudyJourney,
  stageId: string,
  alvo: string,
  desfecho: DesfechoDaRodada,
): StudyJourney {
  if (!rodadaFoiSucesso(desfecho)) return jornada

  const atuais = jornada.alvosCobertos[stageId] ?? []
  if (atuais.includes(alvo)) return jornada

  return {
    ...jornada,
    alvosCobertos: { ...jornada.alvosCobertos, [stageId]: [...atuais, alvo] },
  }
}

/** Registra um item respondido. Certo ou errado — responder é o que conta. */
export function registrarItem(
  jornada: StudyJourney,
  stageId: string,
  itemId: string,
): StudyJourney {
  const atuais = jornada.itensRespondidos[stageId] ?? []
  if (atuais.includes(itemId)) return jornada
  return {
    ...jornada,
    itensRespondidos: { ...jornada.itensRespondidos, [stageId]: [...atuais, itemId] },
  }
}

/**
 * Conclui a etapa atual e move o cursor para a seguinte.
 *
 * RECUSA avançar quando a regra não foi cumprida. É o que impede o botão
 * "Continuar" de existir numa etapa interativa incompleta (plano §134) e o que
 * impede pular direto para o treino (§14).
 *
 * `agora` entra por parâmetro: nada aqui chama o relógio, para a função
 * continuar pura e testável.
 */
export function concluirEtapa(
  jornada: StudyJourney,
  stages: readonly StudyStage[],
  agora: Date,
): StudyJourney {
  const stage = stages.find((item) => item.id === jornada.currentStageId)
  if (!stage) return jornada

  // Leitura conclui pelo ato de avançar; as demais precisam da regra cumprida.
  if (stage.regra.tipo !== 'leitura' && !etapaCumprida(jornada, stage)) return jornada

  const completedStageIds = jornada.completedStageIds.includes(stage.id)
    ? jornada.completedStageIds
    : [...jornada.completedStageIds, stage.id]

  const indice = jornada.stageIds.indexOf(stage.id)
  const proxima = jornada.stageIds[indice + 1] ?? stage.id
  const acabou = indice === jornada.stageIds.length - 1

  return {
    ...jornada,
    completedStageIds,
    currentStageId: acabou ? stage.id : proxima,
    startedAt: jornada.startedAt ?? agora.toISOString(),
    status: acabou ? 'concluida' : proximoStatus(stages, proxima),
    completedAt: acabou ? agora.toISOString() : null,
  }
}

function proximoStatus(stages: readonly StudyStage[], stageId: string): StatusDaJornada {
  const stage = stages.find((item) => item.id === stageId)
  return stage?.ehTreinoFinal === true ? 'em-treino' : 'em-andamento'
}

/**
 * Abre uma etapa qualquer da jornada.
 *
 * NÃO APAGA NADA. Ir e voltar é consulta, não regressão: o aluno vê o que
 * quiser e o progresso continua onde estava. Uma navegação que resetasse a
 * etapa transformaria "reler" em "refazer", e o aluno aprenderia a não voltar.
 *
 * O BLOQUEIO DE AVANÇO SAIU, e é a mudança do V5.1. Antes só a etapa concluída
 * ou a atual eram alcançáveis, e o trilho anunciava as demais como "ainda não
 * aberta". Progressão passa a definir RECOMENDAÇÃO e CONCLUSÃO — não
 * visibilidade.
 *
 * Isso não afrouxa nada do que importa: quem decide se a jornada está concluída
 * continua sendo `jornadaConcluida`, que exige a regra de CADA etapa cumprida,
 * inclusive a cobertura do treino. Espiar o treino cedo não marca nada; a única
 * coisa que o aluno ganha ao abrir uma etapa adiantada é ver o conteúdo.
 */
export function abrirEtapa(jornada: StudyJourney, stageId: string): StudyJourney {
  if (!jornada.stageIds.includes(stageId)) return jornada
  return { ...jornada, currentStageId: stageId }
}

/**
 * @deprecated Use `abrirEtapa`. Mantido enquanto os chamadores migram — o nome
 * antigo prometia "só volta", e a regra deixou de ser essa.
 */
export const voltarParaEtapa = abrirEtapa

/**
 * A jornada está concluída DE VERDADE?
 *
 * Derivada das etapas, e não do campo `status`: o campo é cache de leitura, e
 * um cache que discorda do fato é como a mentira volta. Toda etapa obrigatória
 * precisa ter cumprido a própria regra — inclusive o treino final, cuja regra é
 * a cobertura.
 */
export function jornadaConcluida(jornada: StudyJourney, stages: readonly StudyStage[]): boolean {
  if (stages.length === 0) return false
  return stages.every((stage) => etapaCumprida(jornada, stage))
}

export interface ProgressoDaJornada {
  concluidas: number
  total: number
  /** Índice da etapa atual, base 1, para "etapa 5 de 9". */
  atual: number
}

export function progressoDaJornada(
  jornada: StudyJourney,
  stages: readonly StudyStage[],
): ProgressoDaJornada {
  return {
    concluidas: stages.filter((stage) => etapaCumprida(jornada, stage)).length,
    total: stages.length,
    atual: jornada.stageIds.indexOf(jornada.currentStageId) + 1,
  }
}

/**
 * Estado de cada etapa no índice do estudo.
 *
 * `disponivel` E NÃO `futura`, e a troca de palavra é a decisão. "Futura"
 * descrevia um conteúdo que o aluno não podia abrir, e o trilho o anunciava como
 * "ainda não aberta". Toda etapa principal passou a ser alcançável desde o
 * primeiro acesso: o que o estado diz agora é onde o aluno ESTÁ no caminho
 * recomendado, não o que ele tem permissão de ver.
 */
export type EstadoNoTrilho = 'concluida' | 'atual' | 'disponivel'

export function estadoNoTrilho(jornada: StudyJourney, stage: StudyStage): EstadoNoTrilho {
  if (stage.id === jornada.currentStageId) return 'atual'
  return jornada.completedStageIds.includes(stage.id) ? 'concluida' : 'disponivel'
}

/**
 * QUAL rótulo o botão principal do card usa (plano §10 e §11).
 *
 * Um lugar só decide, para Aberturas e Finais dizerem a mesma coisa nos mesmos
 * estados — e para a tela de Hoje e o Roadmap poderem reusar sem copiar a
 * escada de `if`.
 *
 * DEVOLVE A ESCOLHA, NÃO O TEXTO. O domínio não fala idioma: ele sabe que o
 * estado pede "estudar", "retomar" ou "treinar de novo", e quem escreve isso em
 * português ou em inglês é a camada de apresentação. Enquanto a frase morava
 * aqui, internacionalizar o card exigiria traduzir dentro do domínio — que é
 * onde a regra vive, e onde idioma não tem nada a fazer.
 */
export type RetomadaDaJornada = 'estudar' | 'continuar' | 'treinar-de-novo'

export function retomadaDaJornada(jornada: StudyJourney | null): RetomadaDaJornada {
  if (jornada === null || jornada.status === 'nao-iniciada') return 'estudar'
  if (jornada.status === 'concluida') return 'treinar-de-novo'
  return 'continuar'
}
