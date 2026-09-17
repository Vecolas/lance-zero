/**
 * A TRAVESSIA DE NOVE ETAPAS PARA OITO, sem apagar o que o aluno já fez.
 *
 * A jornada de abertura tinha `respostas` e `variacoes` como etapas separadas.
 * O VNext funde as duas: o ramo passa a ser a unidade que o aluno vê, e "quem
 * tomou a decisão" volta a ser metadata. Ver o ADR desta entrega.
 *
 * O PROBLEMA QUE ESTE ARQUIVO RESOLVE é que `studyJourneys` é PERSISTIDO. Quem
 * estudou ontem tem, gravado no IndexedDB, uma jornada com nove `stageIds`, um
 * `currentStageId` que pode ser `respostas`, e `completedStageIds` que podem
 * conter as duas. Montar a jornada nova por cima disso sem traduzir produz três
 * defeitos, e nenhum deles dá erro:
 *
 *   1. `currentStageId: 'respostas'` não existe mais na lista. `stages.find`
 *      devolve `undefined`, a tela cai no `?? stages[0]` e o aluno volta para a
 *      VISÃO — perdendo a posição sem nenhuma mensagem;
 *   2. `completedStageIds` com `respostas` conta uma etapa que sumiu, e o
 *      contador do cabeçalho passa a dizer "6 de 8" numa jornada de 5;
 *   3. `itensRespondidos['respostas']` fica órfão: o trabalho existe no
 *      armazenamento e não conta para nada.
 *
 * A REGRA DE FUSÃO é conservadora de propósito. Duas etapas concluídas viram
 * uma concluída; UMA concluída vira EM ANDAMENTO, não concluída. Rebaixar quem
 * fez metade custa alguns minutos de releitura; promover quem fez metade
 * esconde para sempre o conteúdo que ele não viu — e a etapa fundida é
 * justamente a que passou a cobrir os dois lados.
 *
 * PURO: sem relógio, sem armazenamento. Quem grava é quem chamou.
 */

import type { StudyJourney, StudyStage } from '@/domain/jornada'

/** A etapa que sumiu na fusão. */
const ETAPA_REMOVIDA = 'respostas'

/** A etapa que absorveu a removida. */
const ETAPA_QUE_ABSORVEU = 'variacoes'

/**
 * A versão da FORMA da jornada de abertura.
 *
 * Separada de `JOURNEY_VERSION`, que é da infraestrutura compartilhada: o que
 * mudou aqui é o currículo de aberturas, e finais não têm nada com isso. Subir
 * a versão compartilhada obrigaria a jornada de finais a migrar por uma
 * mudança que não a toca.
 */
export const VERSAO_DA_JORNADA_DE_ABERTURA = 2

export interface ResultadoDaMigracao {
  jornada: StudyJourney
  /** `true` quando algo de fato mudou — para o chamador saber se precisa gravar. */
  migrou: boolean
}

/**
 * Traduz uma jornada gravada para a forma atual.
 *
 * IDEMPOTENTE: rodar duas vezes dá o mesmo resultado, e é isso que permite
 * chamá-la no caminho de leitura sem medo. Uma jornada já migrada sai intacta e
 * com `migrou: false`.
 */
export function migrarJornadaDeAbertura(
  gravada: StudyJourney,
  stages: readonly StudyStage[],
): ResultadoDaMigracao {
  const idsValidos = new Set(stages.map((stage) => stage.id))
  const tinhaARemovida =
    gravada.stageIds.includes(ETAPA_REMOVIDA) ||
    gravada.completedStageIds.includes(ETAPA_REMOVIDA) ||
    gravada.currentStageId === ETAPA_REMOVIDA ||
    ETAPA_REMOVIDA in gravada.itensRespondidos ||
    ETAPA_REMOVIDA in gravada.alvosCobertos

  if (!tinhaARemovida) return { jornada: gravada, migrou: false }

  const removidaConcluida = gravada.completedStageIds.includes(ETAPA_REMOVIDA)
  const absorveuConcluida = gravada.completedStageIds.includes(ETAPA_QUE_ABSORVEU)

  /*
    AS DUAS CONCLUÍDAS VIRAM UMA CONCLUÍDA. Uma só vira EM ANDAMENTO: quem viu
    apenas metade do que a etapa nova cobre não pode ser marcado como tendo
    visto tudo.
  */
  const concluidas = gravada.completedStageIds.filter(
    (id) => id !== ETAPA_REMOVIDA && id !== ETAPA_QUE_ABSORVEU,
  )
  if (removidaConcluida && absorveuConcluida) concluidas.push(ETAPA_QUE_ABSORVEU)

  const ordem = stages.map((stage) => stage.id)
  const completedStageIds = ordem.filter((id) => concluidas.includes(id))

  /*
    O CURSOR. Quem estava em qualquer uma das duas retoma na etapa fundida — é
    lá que está o que ele ainda não viu. Um cursor que apontasse para um id
    inexistente faria a tela cair silenciosamente na primeira etapa.
  */
  const cursor =
    gravada.currentStageId === ETAPA_REMOVIDA || !idsValidos.has(gravada.currentStageId)
      ? ETAPA_QUE_ABSORVEU
      : gravada.currentStageId

  /*
    OS ITENS RESPONDIDOS SE SOMAM, sem duplicar. Os ids da prática guiada
    carregam o índice do lance (`guiada:4`), então a união é segura: o mesmo
    item tem o mesmo id nas duas etapas. Jogar fora o que estava em `respostas`
    faria o aluno reresponder o que já respondeu.
  */
  const itensRespondidos = unirEtapas(gravada.itensRespondidos, idsValidos)
  const alvosCobertos = unirEtapas(gravada.alvosCobertos, idsValidos)

  return {
    migrou: true,
    jornada: {
      ...gravada,
      stageIds: ordem,
      currentStageId: cursor,
      completedStageIds,
      itensRespondidos,
      alvosCobertos,
    },
  }
}

/**
 * Funde o registro da etapa removida no da que absorveu, e descarta chaves de
 * etapas que não existem mais.
 *
 * O DESCARTE É DELIBERADO e não é perda: uma chave para um id que a jornada não
 * lista é trabalho que nenhuma tela consegue mostrar e nenhuma regra consegue
 * contar. Mantê-la só faria o armazenamento crescer com lixo que parece dado.
 */
function unirEtapas(
  registro: Record<string, string[]>,
  idsValidos: ReadonlySet<string>,
): Record<string, string[]> {
  const saida: Record<string, string[]> = {}
  for (const [stageId, valores] of Object.entries(registro)) {
    if (stageId === ETAPA_REMOVIDA) continue
    if (!idsValidos.has(stageId)) continue
    saida[stageId] = [...valores]
  }

  const daRemovida = registro[ETAPA_REMOVIDA] ?? []
  if (daRemovida.length > 0 && idsValidos.has(ETAPA_QUE_ABSORVEU)) {
    const atuais = saida[ETAPA_QUE_ABSORVEU] ?? []
    const unidos = [...atuais]
    for (const valor of daRemovida) if (!unidos.includes(valor)) unidos.push(valor)
    saida[ETAPA_QUE_ABSORVEU] = unidos
  }

  return saida
}
