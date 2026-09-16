/**
 * A porta única para o plano de hoje.
 *
 * TODA A REGRA §9 DO PLANO MORA NESTA FUNÇÃO, e é por isso que ela existe em
 * vez de o componente chamar `buildDailyPlanV2` direto: **gera uma vez, grava,
 * e depois só lê.**
 *
 * O defeito que ela impede é sutil e teria sido muito difícil de diagnosticar
 * depois. Se a tela chamasse o planner a cada montagem, o plano continuaria
 * estável enquanto as ENTRADAS fossem estáveis — e elas eram, na V1. Na V2,
 * concluir uma atividade MUDA as entradas: o estágio sobe, o card sai da fila
 * de vencidos, a maestria muda. O aluno concluiria o segundo card e veria o
 * terceiro e o quarto trocarem de lugar, ou sumirem. Pareceria um bug de
 * renderização e seria um erro de arquitetura.
 *
 * `carregarPlanoDeHoje` é idempotente: chamar dez vezes no mesmo dia devolve o
 * mesmo plano, com as mesmas conclusões, e grava uma vez só.
 */

import {
  buildDailyPlanV2,
  type PlannerV2Context,
  type PlannerV2Config,
} from '@/domain/planning/planner-v2'
import {
  chaveDoDia,
  criarSkillState,
  fundirPlanos,
  marcarParaReensino,
  substituirAtividade,
  type DailyActivity,
  type PlanoDoDia,
  type SkillState,
} from '@/domain/aprendizado'
import { SKILL_IDS, type SkillId, type TrainingRepository } from '@/domain/types'

/**
 * Os estados de habilidade, COMPLETOS.
 *
 * O repositório devolve só o que foi gravado; o resto do catálogo existe em
 * `unseen` e precisa existir como OBJETO para o planner poder perguntar o
 * estágio sem tratar `undefined` em cada ponto. O preenchimento acontece na
 * leitura e NÃO é gravado: gravar 22 linhas vazias no primeiro acesso encheria
 * o banco de fatos que não aconteceram, e faria um backup de um aluno novo
 * parecer com o de um aluno que treinou.
 */
export async function carregarSkillStates(
  repo: TrainingRepository,
  agora: Date,
): Promise<SkillState[]> {
  const gravados = await repo.getSkillStates()
  const porId = new Map(gravados.map((estado) => [estado.skillId, estado]))
  return SKILL_IDS.map((id) => porId.get(id) ?? criarSkillState(id, agora))
}

/**
 * Grava só os estados que MUDARAM.
 *
 * A comparação é por conteúdo. Regravar os 22 a cada evento funcionaria e
 * custaria uma transação larga por tentativa respondida — e, pior, carimbaria
 * `updatedAt` em habilidades que ninguém tocou, apagando a informação de quando
 * cada uma foi de fato mexida.
 */
export async function gravarSkillStates(
  repo: TrainingRepository,
  anteriores: readonly SkillState[],
  proximos: readonly SkillState[],
): Promise<void> {
  const antes = new Map(anteriores.map((estado) => [estado.skillId, estado]))
  const mudados = proximos.filter((estado) => {
    const anterior = antes.get(estado.skillId)
    return anterior === undefined || JSON.stringify(anterior) !== JSON.stringify(estado)
  })
  if (mudados.length > 0) await repo.saveSkillStates(mudados)
}

export interface EntradaDoPlano {
  repo: TrainingRepository
  contexto: Omit<PlannerV2Context, 'skillStates'>
  config?: PlannerV2Config
}

/**
 * O plano de hoje: o gravado, se existir; senão gera, grava e devolve.
 *
 * A seed é a CHAVE DO DIA. Determinística por construção, e legível: dois
 * alunos com o mesmo estado veem o mesmo plano no mesmo dia, o que torna um
 * relato de bug reproduzível sem precisar do banco de ninguém.
 */
export async function carregarPlanoDeHoje({
  repo,
  contexto,
  config,
}: EntradaDoPlano): Promise<PlanoDoDia> {
  const dateKey = chaveDoDia(contexto.now)

  const gravado = await repo.getPlanoDoDia(dateKey)
  if (gravado !== null) {
    // Planos gravados antes do gate V3 podem conter revisão de conteúdo nunca
    // ensinado. Regerar remove apenas atividades ainda não concluídas; ✓ já
    // concluídos continuam sendo fundidos por `regerarPlanoDeHoje`.
    const estados = await carregarSkillStates(repo, contexto.now)
    const porId = new Map(estados.map((estado) => [estado.skillId, estado]))
    const legadoIlegivel = gravado.activities.some((activity) =>
      activity.definition.kind === 'revisao' && activity.definition.skillIds.some((skillId) => {
        const state = porId.get(skillId)
        return state === undefined || state.exposureCount === 0 || state.precisaDeReensino
      }),
    )
    if (!legadoIlegivel) return gravado
    return regerarPlanoDeHoje({ repo, contexto, config })
  }

  const skillStates = await carregarSkillStates(repo, contexto.now)
  const plano = buildDailyPlanV2({ ...contexto, skillStates }, dateKey, config)
  await repo.savePlanoDoDia(plano)
  return plano
}

/**
 * Regera o plano de hoje, PRESERVANDO o que já foi concluído.
 *
 * A REGRA §9 DIZ "o plano não muda durante o dia", e esta função não a viola —
 * a regra é contra mudança SILENCIOSA. Trocar o tempo disponível é o aluno
 * pedindo, em voz alta, um plano diferente; recusar seria transformar uma
 * escolha de 20 minutos feita às 8h numa sentença para o dia inteiro.
 *
 * O QUE ELA NUNCA FAZ É PERDER TRABALHO. As atividades já concluídas são
 * reinjetadas no plano novo, mesmo quando o planner não as escolheria de novo:
 * `fundirPlanos` traz de volta tudo o que existia só no plano anterior. Um
 * aluno que concluiu duas atividades e depois reduziu o tempo continua com os
 * dois ✓ — e é exatamente o caso em que um `savePlanoDoDia` direto os apagaria,
 * sem erro nenhum, parecendo que ele nunca tinha feito nada.
 *
 * O preço declarado: o plano pode ficar MAIOR que o orçamento novo, quando o que
 * já foi concluído sozinho já o estoura. É o resultado certo — o tempo já foi
 * gasto, e escondê-lo não o devolve.
 */
export async function regerarPlanoDeHoje({
  repo,
  contexto,
  config,
}: EntradaDoPlano): Promise<PlanoDoDia> {
  const dateKey = chaveDoDia(contexto.now)
  const anterior = await repo.getPlanoDoDia(dateKey)

  const skillStates = await carregarSkillStates(repo, contexto.now)
  const novo = buildDailyPlanV2({ ...contexto, skillStates }, dateKey, config)

  if (anterior === null) {
    await repo.savePlanoDoDia(novo)
    return novo
  }

  // Só o que foi CONCLUÍDO volta. Uma atividade apenas iniciada não tem
  // trabalho a preservar que valha desobedecer o orçamento novo, e mantê-la
  // deixaria o plano cheio de restos de todas as configurações já tentadas.
  const concluidas = anterior.activities.filter((a) => a.status === 'concluida')
  const comHistorico = fundirPlanos(novo, { ...anterior, activities: concluidas })

  await repo.savePlanoDoDia(comHistorico)
  return comHistorico
}

/**
 * Grava uma atividade alterada dentro do plano do dia dela.
 *
 * LÊ O PLANO DE NOVO antes de gravar, e isso não é zelo: duas abas abertas no
 * mesmo plano produziriam escritas que se sobrescrevem, e a última a gravar
 * apagaria a conclusão que a outra registrou. Reler e substituir só a atividade
 * alvo mantém as outras como estão no disco, e não como estavam na memória da
 * aba que ficou parada.
 *
 * Plano ausente devolve `null` em vez de criar um: gravar uma atividade num dia
 * sem plano inventaria um plano de uma atividade só, que nenhum planner gerou.
 */
export async function gravarAtividade(
  repo: TrainingRepository,
  atividade: DailyActivity,
): Promise<PlanoDoDia | null> {
  const plano = await repo.getPlanoDoDia(atividade.dateKey)
  if (plano === null) return null

  const atualizado = substituirAtividade(plano, atividade)
  await repo.savePlanoDoDia(atualizado)
  return atualizado
}

/**
 * Marca para reensino as habilidades que têm card de revisão e nunca foram
 * ensinadas (plano §42).
 *
 * É A MIGRAÇÃO DOS USUÁRIOS QUE JÁ EXISTEM, e ela roda na leitura, uma vez, em
 * vez de num script de migração. O motivo é que não há como rodar script no
 * navegador de alguém: o banco é local, e o "servidor" não tem como alcançá-lo.
 *
 * O CRITÉRIO, e ele é conservador de propósito: a habilidade tem card agendado
 * (logo, o app já cobrou dela) E `exposureCount` é zero (logo, o app nunca a
 * ensinou). Na dúvida, o plano manda preferir `introduced` a presumir domínio —
 * e é exatamente isso que `marcarParaReensino` faz.
 *
 * A EXCEÇÃO DO REPERTÓRIO, e ela não é um detalhe: cards de `kind:
 * 'repertorio'` NÃO contam. Eles perguntam ao aluno o que ELE MESMO escreveu na
 * própria linha — não cobram um conceito que o app devia ter ensinado antes.
 * Sem esta exceção, a primeira abertura de tela de qualquer aluno com
 * repertório marcaria a área de aberturas inteira para reensino, tiraria os
 * cards dele da fila de revisão e ofereceria no lugar uma lição de
 * "desenvolvimento" — desfazendo, em nome da correção pedagógica, justamente a
 * funcionalidade que o aluno construiu à mão. Descoberto por
 * `planning-aberturas-tela`, que reprovou no primeiro lugar certo.
 *
 * Idempotente: quem já está marcado não é marcado de novo, e quem já foi
 * ensinado nunca é marcado.
 */
export async function migrarHabilidadesSemEnsino(
  repo: TrainingRepository,
  agora: Date,
): Promise<SkillState[]> {
  const [cards, estados] = await Promise.all([
    repo.listReviewCards(),
    carregarSkillStates(repo, agora),
  ])

  const comCard = new Set<SkillId>(
    cards.filter((card) => card.kind !== 'repertorio').flatMap((card) => card.skillIds),
  )
  const proximos = estados.map((estado) => {
    if (!comCard.has(estado.skillId)) return estado
    if (estado.exposureCount > 0 || estado.precisaDeReensino) return estado
    return marcarParaReensino(estado, agora)
  })

  await gravarSkillStates(repo, estados, proximos)
  return proximos
}
