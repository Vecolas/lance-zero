/**
 * A unidade central do Hoje e do Treinar: a atividade de aprendizagem.
 *
 * A REGRA QUE ESTE ARQUIVO EXISTE PARA TORNAR IMPOSSÍVEL DE QUEBRAR é a §19 do
 * plano: **concluir não é dominar.** Elas são dois tipos diferentes, em dois
 * lugares diferentes, movidos por duas funções diferentes. `concluiu` responde
 * "o aluno terminou?"; quem responde "o aluno sabe?" é `./skill-state`, e
 * nenhuma função deste arquivo escreve lá.
 *
 * Por que isso precisa de força estrutural e não de disciplina: no desenho
 * antigo, sair da atividade EXIGIA acertar. O aluno que errava ficava preso, e
 * a saída era chutar até passar — o que treina força bruta e ainda registra
 * como domínio um resultado que foi persistência. Uma `CompletionRule` que não
 * consegue ler acerto nenhum é a forma de impedir isso: o desempenho não tem
 * por onde entrar na decisão de concluir.
 *
 * SEPARAÇÃO DEFINIÇÃO / INSTÂNCIA. `ActivityDefinition` é o que a atividade É
 * (conteúdo, versionado). `DailyActivity` é o que ACONTECEU com ela num dia
 * (status, progresso, checkpoint). Fundir as duas faria o progresso do aluno de
 * ontem viajar junto com uma correção de conteúdo de hoje.
 */

import type { SkillId } from '@/domain/types'
import type { LearningStage } from './estagio'

/**
 * Os tipos de atividade.
 *
 * O vocabulário é PEDAGÓGICO de propósito (plano §23): nada aqui se chama
 * "puzzle". O aluno precisa saber se está aprendendo, praticando, revisando ou
 * sendo calibrado — e chamar tudo de puzzle é justamente o que apagava a
 * diferença entre ensinar e cobrar.
 */
export const TIPOS_DE_ATIVIDADE = [
  'licao',
  'pratica-guiada',
  'pratica-independente',
  'revisao',
  'calculo',
  'revisao-de-partida',
  'diagnostico',
] as const

export type ActivityKind = (typeof TIPOS_DE_ATIVIDADE)[number]

/** Rótulo curto do tipo, para a etiqueta do card. */
export const ROTULO_DA_ATIVIDADE: Record<ActivityKind, string> = {
  licao: 'Aprender',
  'pratica-guiada': 'Praticar com apoio',
  'pratica-independente': 'Praticar',
  revisao: 'Revisar',
  calculo: 'Calcular',
  'revisao-de-partida': 'Analisar',
  diagnostico: 'Calibrar',
}

/**
 * O estágio MÍNIMO que a habilidade precisa ter para o tipo ser oferecido.
 *
 * ESTA TABELA É A REGRA R1 DO PLANO, escrita uma vez só. O planner não repete a
 * comparação; ele consulta. Um tipo novo entra aqui e a regra passa a valer
 * para ele sem ninguém lembrar de ir ao planner.
 *
 * `licao` e `diagnostico` começam em `unseen` porque são exatamente o que se
 * pode oferecer a quem nunca viu o tema — a lição ensina, e o diagnóstico é
 * rotulado como calibração e diz ao aluno que não saber é esperado.
 */
export const ESTAGIO_MINIMO_DO_TIPO: Record<ActivityKind, LearningStage> = {
  licao: 'unseen',
  diagnostico: 'unseen',
  'pratica-guiada': 'introduced',
  'revisao-de-partida': 'introduced',
  'pratica-independente': 'guided',
  calculo: 'guided',
  revisao: 'independent',
}

/**
 * Como se sabe que a atividade acabou.
 *
 * REPARE NO QUE NÃO EXISTE AQUI: nenhuma variante fala em acerto, nota ou
 * porcentagem. Não é esquecimento — é a regra. Ver o cabeçalho.
 */
export type CompletionRule =
  /** Percorreu as etapas centrais da lição. */
  | { tipo: 'etapas'; total: number }
  /** Respondeu os itens previstos, certo ou errado. */
  | { tipo: 'itens'; total: number }
  /** Examinou os momentos críticos e escreveu a conclusão. */
  | { tipo: 'momentos-criticos'; total: number }

/** Quantas unidades a regra exige. Um lugar só sabe ler as três variantes. */
export function totalExigido(regra: CompletionRule): number {
  return regra.total
}

/**
 * O que a atividade é. Conteúdo, não histórico.
 *
 * `contentVersion` existe para o dia em que uma lição for corrigida: o
 * progresso gravado sabe contra qual versão ele foi feito, e a tela pode
 * decidir se retoma o checkpoint ou recomeça. Sem ele, um checkpoint no passo 4
 * de uma lição que passou a ter 3 passos aponta para o vazio.
 */
export interface ActivityDefinition {
  id: string
  kind: ActivityKind
  title: string
  /** Uma frase. O que o aluno vai fazer. */
  description: string
  skillIds: SkillId[]
  /** O degrau que esta atividade pretende TRABALHAR. */
  pedagogicalStage: LearningStage
  estimatedMinutes: number
  contentVersion: number
  completionRule: CompletionRule
  /** Rota interna que abre a atividade. Deep link, refresh e E2E dependem dela. */
  href: string
}

export type ActivityStatus = 'pendente' | 'em-andamento' | 'concluida'

/**
 * Símbolo de status.
 *
 * TEXTO ACOMPANHA SEMPRE. O símbolo sozinho seria status por forma, que falha
 * do mesmo jeito que status por cor — a regra do CLAUDE.md vale aqui.
 */
export const SIMBOLO_DO_STATUS: Record<ActivityStatus, string> = {
  pendente: '○',
  'em-andamento': '◔',
  concluida: '✓',
}

export const ROTULO_DO_STATUS: Record<ActivityStatus, string> = {
  pendente: 'Pendente',
  'em-andamento': 'Em andamento',
  concluida: 'Concluída',
}

/**
 * Checkpoint. Gravado a cada etapa relevante (plano §38).
 *
 * `completedItemIds` e não um contador: com contador, reabrir a atividade e
 * refazer o item 2 aumentaria o número e a atividade terminaria sem o item 3.
 * Um conjunto de ids não tem esse defeito.
 */
export interface ActivityProgress {
  stepIndex: number
  completedItemIds: string[]
  updatedAt: string
}

export function progressoInicial(agora: Date): ActivityProgress {
  return { stepIndex: 0, completedItemIds: [], updatedAt: agora.toISOString() }
}

/**
 * A instância de um dia.
 *
 * `generatedReason` é OBRIGATÓRIO: é a regra R10 do plano. Um card sem motivo
 * explicável é um card que o aluno não tem como questionar, e um sistema
 * adaptativo que não se explica é indistinguível de um que sorteia.
 */
export interface DailyActivity {
  id: string
  /** `YYYY-MM-DD` no fuso do aluno. */
  dateKey: string
  definition: ActivityDefinition
  status: ActivityStatus
  generatedReason: string
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  progress: ActivityProgress
}

/**
 * A atividade terminou?
 *
 * PURA, e cega ao desempenho. Recebe o progresso, devolve sim ou não.
 */
export function concluiu(regra: CompletionRule, progresso: ActivityProgress): boolean {
  return progresso.completedItemIds.length >= totalExigido(regra)
}

/**
 * Registra que um item foi feito e devolve a atividade atualizada.
 *
 * NÃO MUTA. E não recebe `acertou`: a assinatura é o portão. Quem quisesse
 * fazer a conclusão depender de acerto teria de mudar o tipo, e mudar o tipo é
 * visível na revisão — diferente de um `if (acertou)` escondido no meio.
 *
 * MONOTÔNICA nos dois sentidos que importam: item já feito não entra duas
 * vezes, e atividade concluída NUNCA volta para `em-andamento`. É o que
 * sustenta a §21 do plano contra recarga, navegação e fusão de sync.
 */
export function registrarItem(
  atividade: DailyActivity,
  itemId: string,
  agora: Date,
): DailyActivity {
  if (atividade.status === 'concluida') return atividade

  const jaFeitos = atividade.progress.completedItemIds
  const completedItemIds = jaFeitos.includes(itemId) ? jaFeitos : [...jaFeitos, itemId]
  const progress: ActivityProgress = {
    // O passo acompanha o item, mas nunca ANDA PARA TRÁS: reabrir uma lição no
    // passo 1 não pode desfazer o avanço já registrado.
    stepIndex: Math.max(atividade.progress.stepIndex, completedItemIds.length),
    completedItemIds,
    updatedAt: agora.toISOString(),
  }

  const terminou = concluiu(atividade.definition.completionRule, progress)
  return {
    ...atividade,
    status: terminou ? 'concluida' : 'em-andamento',
    startedAt: atividade.startedAt ?? agora.toISOString(),
    completedAt: terminou ? agora.toISOString() : null,
    progress,
  }
}

/** Marca o início sem registrar item nenhum. Abrir o card já conta como abrir. */
export function marcarIniciada(atividade: DailyActivity, agora: Date): DailyActivity {
  if (atividade.status !== 'pendente') return atividade
  return { ...atividade, status: 'em-andamento', startedAt: agora.toISOString() }
}

/**
 * Avança o passo de uma atividade cuja regra é `etapas`, sem item.
 *
 * Existe porque uma lição avança por LEITURA — conceito, exemplo, contraste —
 * e não só por resposta. Usar `registrarItem` com um id sintético funcionaria e
 * seria pior: o id sintético apareceria no progresso como se fosse exercício.
 */
export function avancarEtapa(
  atividade: DailyActivity,
  etapaId: string,
  agora: Date,
): DailyActivity {
  return registrarItem(atividade, etapaId, agora)
}
