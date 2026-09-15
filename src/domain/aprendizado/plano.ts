/**
 * O plano do dia, PERSISTIDO.
 *
 * A MUDANÇA DE NATUREZA QUE ESTE ARQUIVO CARREGA, e que é o coração da §9 do
 * plano: o plano do dia deixa de ser um valor DERIVADO a cada renderização e
 * passa a ser um FATO GRAVADO.
 *
 * No desenho antigo, `buildDailyPlan` rodava dentro do componente a cada
 * montagem. Funcionava enquanto o plano não tinha estado: a lista era a mesma
 * porque as entradas eram as mesmas. No instante em que concluir uma atividade
 * passa a MUDAR as entradas — a maestria sobe, o card sai da fila de vencidos —
 * o mesmo cálculo passa a devolver outra lista. O aluno concluiria o card 2 e
 * veria os cards 3 e 4 trocarem de lugar sozinhos.
 *
 * Por isso: gera UMA VEZ por dia, grava, e depois só LÊ. `planoDoDia` é a única
 * porta, e ela não regenera um plano que já existe.
 *
 * A SEGUNDA REGRA, que o sync torna obrigatória: a fusão é MONOTÔNICA. Duas
 * cópias do mesmo plano, vindas de dois aparelhos, produzem a união das
 * conclusões. `pendente + concluida` dá `concluida`, nunca o contrário. Um ✓
 * revertido por conflito de sync é a pior coisa que este produto pode fazer com
 * a confiança do aluno, porque ele fez o trabalho e o app esqueceu.
 */

import { concluiu, type ActivityStatus, type DailyActivity } from './atividade'

/**
 * Versão do planner que gerou o plano.
 *
 * Incrementar quando a SELEÇÃO mudar de forma que um plano antigo deixe de ser
 * comparável a um novo. Serve para auditoria e para a migração saber o que está
 * lendo; NÃO é usada para regenerar plano do passado, que é história.
 */
export const PLANNER_VERSION = 2

export interface PlanoDoDia {
  /** `YYYY-MM-DD` no fuso do aluno. Chave primária. */
  dateKey: string
  activities: DailyActivity[]
  generatedAt: string
  plannerVersion: number
  /** A seed que gerou este plano. Guardada para reproduzir a seleção. */
  seed: string
}

/** Quantas concluídas, de quantas. Derivado — nunca um contador gravado. */
export interface ProgressoDoDia {
  concluidas: number
  total: number
  /** Minutos estimados do que ainda não foi concluído. */
  minutosRestantes: number
  /** Todas concluídas. `false` para plano vazio: nada feito não é tudo feito. */
  tudoConcluido: boolean
}

export function progressoDoDia(plano: PlanoDoDia): ProgressoDoDia {
  const concluidas = plano.activities.filter((a) => a.status === 'concluida').length
  const minutosRestantes = plano.activities
    .filter((a) => a.status !== 'concluida')
    .reduce((soma, a) => soma + a.definition.estimatedMinutes, 0)

  return {
    concluidas,
    total: plano.activities.length,
    minutosRestantes,
    tudoConcluido: plano.activities.length > 0 && concluidas === plano.activities.length,
  }
}

/**
 * Troca UMA atividade dentro do plano, preservando a ORDEM e todo o resto.
 *
 * É a única forma de o plano mudar depois de gerado, e a assinatura diz por
 * quê: entra uma atividade, sai o mesmo plano com ela no lugar. Não há caminho
 * por onde concluir um card reordene, remova ou substitua outro — o teste 3 do
 * plano.
 *
 * Atividade desconhecida devolve o plano INTACTO em vez de acrescentar: um id
 * que não está no plano de hoje veio de outro dia ou de uma aba velha, e
 * enxertá-lo criaria um card que o planner nunca escolheu.
 */
export function substituirAtividade(plano: PlanoDoDia, atividade: DailyActivity): PlanoDoDia {
  const indice = plano.activities.findIndex((a) => a.id === atividade.id)
  if (indice === -1) return plano

  const activities = [...plano.activities]
  activities[indice] = atividade
  return { ...plano, activities }
}

/** A atividade pelo id, ou `null`. `null` e não exceção: id vem da URL. */
export function atividadeDoPlano(plano: PlanoDoDia, atividadeId: string): DailyActivity | null {
  return plano.activities.find((a) => a.id === atividadeId) ?? null
}

/**
 * O status que sobrevive à fusão de duas cópias.
 *
 * `concluida` vence tudo. Entre `pendente` e `em-andamento` vence
 * `em-andamento`, pelo mesmo princípio: o aluno fez alguma coisa em algum
 * lugar, e a cópia que não viu isso é a desatualizada.
 */
function statusMaisAvancado(a: ActivityStatus, b: ActivityStatus): ActivityStatus {
  if (a === 'concluida' || b === 'concluida') return 'concluida'
  if (a === 'em-andamento' || b === 'em-andamento') return 'em-andamento'
  return 'pendente'
}

/**
 * Funde duas versões da MESMA atividade.
 *
 * Os itens feitos são a UNIÃO — fazer o item 1 num aparelho e o item 2 no outro
 * tem de somar dois itens feitos, não escolher um dos aparelhos. E é a união
 * que pode, sozinha, completar a atividade: por isso `concluiu` é reconsultado
 * depois de unir, em vez de apenas herdar o status mais avançado.
 *
 * Os INSTANTES seguem o mesmo princípio do resto: começou vale o mais CEDO
 * (foi quando o aluno de fato começou), concluiu vale o mais CEDO entre os que
 * existem (foi quando de fato terminou). Pegar o mais tarde faria o instante
 * andar para a frente a cada sync, e um carimbo que se move não é um carimbo.
 */
export function fundirAtividade(a: DailyActivity, b: DailyActivity): DailyActivity {
  const itens = [...new Set([...a.progress.completedItemIds, ...b.progress.completedItemIds])]
  const progress = {
    stepIndex: Math.max(a.progress.stepIndex, b.progress.stepIndex, itens.length),
    completedItemIds: itens,
    updatedAt:
      a.progress.updatedAt > b.progress.updatedAt ? a.progress.updatedAt : b.progress.updatedAt,
  }

  // A definição vem da cópia de maior `contentVersion`: se um aparelho já
  // recebeu a lição corrigida, é ela que vale.
  const definition =
    b.definition.contentVersion > a.definition.contentVersion ? b.definition : a.definition

  const status = concluiu(definition.completionRule, progress)
    ? 'concluida'
    : statusMaisAvancado(a.status, b.status)

  const maisCedo = (x: string | null, y: string | null): string | null => {
    if (x === null) return y
    if (y === null) return x
    return x < y ? x : y
  }

  const completadoEm = maisCedo(a.completedAt, b.completedAt)
  return {
    ...a,
    definition,
    status,
    startedAt: maisCedo(a.startedAt, b.startedAt),
    // Concluída sem carimbo em nenhuma das cópias (a união é que completou)
    // recebe o instante do progresso mais recente, que é quando aconteceu.
    completedAt: status === 'concluida' ? (completadoEm ?? progress.updatedAt) : null,
    progress,
  }
}

/**
 * Funde dois planos do mesmo dia.
 *
 * A ORDEM VEM DE `local`. O plano remoto pode ter sido gerado por outra versão
 * do planner, com outra seed; deixar a ordem oscilar entre aparelhos faria a
 * lista do aluno se reorganizar a cada sync, que é exatamente o que a §9 proíbe
 * por conclusão e não teria por que permitir por sincronização.
 *
 * Atividade que só existe no remoto ENTRA, no fim: é trabalho que o aluno fez e
 * que este aparelho não conhecia. Descartá-la seria perder conclusão.
 *
 * Dias diferentes não se fundem — devolve `local`. Fundir 12/09 com 13/09
 * misturaria dois planos que nunca foram o mesmo.
 */
export function fundirPlanos(local: PlanoDoDia, remoto: PlanoDoDia): PlanoDoDia {
  if (local.dateKey !== remoto.dateKey) return local

  const porId = new Map(remoto.activities.map((a) => [a.id, a]))
  const fundidas = local.activities.map((atividade) => {
    const par = porId.get(atividade.id)
    porId.delete(atividade.id)
    return par ? fundirAtividade(atividade, par) : atividade
  })

  return { ...local, activities: [...fundidas, ...porId.values()] }
}

/**
 * Chave do dia no fuso do ALUNO.
 *
 * `toISOString().slice(0,10)` daria o dia em UTC, e um aluno em São Paulo
 * treinando às 22h veria o plano virar antes da meia-noite dele. O recorte por
 * fuso já mordeu este projeto uma vez (commit 7be6d27); a correção mora aqui
 * para não ser reescrita em cada chamador.
 */
export function chaveDoDia(agora: Date): string {
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}
