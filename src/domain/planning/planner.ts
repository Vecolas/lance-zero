/**
 * Planner do "Treino de hoje".
 *
 * `buildDailyPlan` é puro e determinístico: o mesmo contexto com a mesma seed
 * sempre produz exatamente o mesmo plano. Nenhuma chamada a `Date.now`,
 * `Math.random`, rede ou persistência acontece aqui.
 *
 * O plano é montado em duas etapas: primeiro escolhemos QUAIS blocos entram,
 * na ordem de prioridade do produto; depois repartimos o orçamento de minutos
 * entre os blocos escolhidos. Separar as etapas garante que a soma nunca
 * ultrapasse o orçamento sem precisar cortar blocos pela metade.
 */

import { SKILL_SCALE_MAX, getSkill, skillOrder } from '@/domain/skills/catalog'
import {
  SKILL_IDS,
  type DailyPlan,
  type MoveSeverity,
  type PlanBlock,
  type PlanBlockKind,
  type ReviewCard,
  type SkillArea,
  type SkillId,
  type SkillMastery,
  type UserProfile,
} from '@/domain/types'
import { ladoPorExtenso, type DesvioDeRepertorio } from './aberturas'
import { createRng } from './rng'

/** Erro cometido pelo usuário em partida real, já atribuído a uma habilidade. */
export interface RecentGameError {
  skillId: SkillId
  severity: MoveSeverity
  /** ISO 8601. */
  ocorridoEm: string
}

export interface PlannerContext {
  profile: UserProfile
  mastery: SkillMastery[]
  dueCards: ReviewCard[]
  recentGameErrors: RecentGameError[]
  /**
   * Vezes em que o usuário saiu do PRÓPRIO repertório em partida real, já
   * ordenadas por relevância (ver `./aberturas`).
   *
   * Opcional porque chegou depois, e obrigá-lo quebraria chamadas que não têm
   * repertório nenhum para oferecer. O preço de um campo opcional é ele ser
   * esquecido em silêncio pela tela; quem cobra isso é
   * `tests/unit/planning-aberturas-tela.test.tsx`, não o tipo.
   */
  desviosDeRepertorio?: readonly DesvioDeRepertorio[]
  now: Date
}

/** Tipos de bloco que disputam a alocação de tempo por área. */
type BlocoAlocavel = Exclude<PlanBlockKind, 'revisao'>

/**
 * Parâmetros do planner.
 *
 * ATENÇÃO: todos os percentuais e limiares abaixo são HEURÍSTICAS DE PRODUTO
 * pensadas para um jogador de ~1100. Não são constantes científicas nem saíram
 * de dados; devem ser recalibrados com telemetria real.
 */
export const PLANNER_CONFIG = {
  /** Fatia alvo do orçamento por tipo de bloco, quando todos estão no plano. */
  alocacaoAlvo: {
    tatica: 0.35,
    calculo: 0.2,
    'erro-de-partida': 0.2,
    final: 0.15,
    abertura: 0.1,
  } satisfies Record<BlocoAlocavel, number>,
  /** Peso das revisões vencidas na repartição do orçamento. */
  pesoRevisao: 0.35,
  /** Abaixo disso um bloco não vale a troca de contexto. */
  minutosMinimosPorBloco: 4,
  /** Quantos blocos a sessão comporta, por orçamento. Menos blocos, menos troca de contexto. */
  blocosPorOrcamento: { 20: 3, 40: 4, 60: 5 } satisfies Record<20 | 40 | 60, number>,
  /** Minutos estimados por item, por tipo de bloco. */
  minutosPorItem: {
    revisao: 1.5,
    'erro-de-partida': 3,
    tatica: 2,
    calculo: 4,
    final: 3,
    abertura: 2,
  } satisfies Record<PlanBlockKind, number>,
  /** Quantos blocos podem nascer de "habilidade fraca de alto valor". */
  maxBlocosDeFraqueza: 2,
  /** Peso da incerteza (habilidade pouco medida) na priorização. */
  pesoIncerteza: 0.15,
  /** Peso dos erros de partida real na priorização de habilidades. */
  pesoErroDePartida: 0.5,
  /** Ruído determinístico por seed, para o plano variar entre dias. */
  jitterPorSeed: 0.02,
  /** Base somada à fatia da área ao ordenar de qual área virá o bloco de fraqueza. */
  baseDeOrdemPorArea: 0.5,
  /** Peso de cada severidade ao medir a fraqueza vinda de partidas. */
  pesoSeveridade: {
    ok: 0,
    imprecisao: 0.5,
    erro: 1,
    'erro-grave': 1.5,
  } satisfies Record<MoveSeverity, number>,
  /** Janela, em dias, para um erro de partida ainda contar como recente. */
  janelaErrosRecentesDias: 14,
  /**
   * Quantas partidas com o mesmo desvio bastam para virar bloco de abertura.
   *
   * HEURÍSTICA DE PRODUTO, e o valor 1 é uma escolha, não um mínimo técnico:
   * uma única vez em que o aluno não jogou o próprio lance já é falha de
   * recuperação, e o repertório existe para ser recuperado. Subir isto é
   * decidir que o produto espera o erro se repetir antes de tratá-lo.
   */
  minPartidasDeDesvio: 1,
  /** Abaixo desta confiança tratamos a habilidade como "pouco medida". */
  limiarConfiancaBaixa: 0.25,
} as const

export type PlannerConfig = typeof PLANNER_CONFIG

const KIND_POR_AREA: Record<SkillArea, BlocoAlocavel> = {
  tactics: 'tatica',
  calculation: 'calculo',
  endgame: 'final',
  opening: 'abertura',
}

const TITULO_POR_KIND: Record<BlocoAlocavel, string> = {
  tatica: 'Tática',
  calculo: 'Cálculo',
  final: 'Final',
  abertura: 'Abertura',
  'erro-de-partida': 'Erros das suas partidas',
}

const AREAS_ROTATIVAS: readonly SkillArea[] = ['tactics', 'calculation', 'endgame', 'opening']

const MS_POR_DIA = 86_400_000

function clamp01(valor: number): number {
  if (Number.isNaN(valor)) return 0
  if (valor < 0) return 0
  if (valor > 1) return 1
  return valor
}

function diaDoAno(now: Date): number {
  const inicioDoAno = Date.UTC(now.getUTCFullYear(), 0, 1)
  const hoje = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.floor((hoje - inicioDoAno) / MS_POR_DIA)
}

function plural(quantidade: number, singular: string, plural_: string): string {
  return quantidade === 1 ? singular : plural_
}

function rotuloDe(skillId: SkillId): string {
  return getSkill(skillId).label
}

function rotuloMinusculo(skillId: SkillId): string {
  return rotuloDe(skillId).toLocaleLowerCase('pt-BR')
}

interface SkillPrioridade {
  skillId: SkillId
  area: SkillArea
  score: number
  mastery: number
  confidence: number
}

interface ErroAgregado {
  peso: number
  ocorrencias: number
  graves: number
}

/** Bloco já escolhido, ainda sem minutos atribuídos. */
interface BlocoSelecionado {
  kind: PlanBlockKind
  title: string
  rationale: string
  skillIds: SkillId[]
  /** Peso relativo na repartição do orçamento. */
  peso: number
  /** Teto de minutos úteis, quando o bloco tem material finito (revisões). */
  tetoMinutos?: number
  cards?: ReviewCard[]
}

/** Soma o peso de severidade dos erros recentes, por habilidade. */
function pesarErrosRecentes(
  erros: readonly RecentGameError[],
  now: Date,
  config: PlannerConfig,
): Map<SkillId, ErroAgregado> {
  const limite = now.getTime() - config.janelaErrosRecentesDias * MS_POR_DIA
  const resultado = new Map<SkillId, ErroAgregado>()

  for (const erro of erros) {
    const quando = Date.parse(erro.ocorridoEm)
    if (Number.isNaN(quando) || quando < limite) continue
    const peso = config.pesoSeveridade[erro.severity]
    if (peso <= 0) continue
    const atual = resultado.get(erro.skillId) ?? { peso: 0, ocorrencias: 0, graves: 0 }
    atual.peso += peso
    atual.ocorrencias += 1
    if (erro.severity === 'erro-grave') atual.graves += 1
    resultado.set(erro.skillId, atual)
  }

  return resultado
}

/** Ranking determinístico de habilidades por necessidade de treino. */
function ranquearHabilidades(
  context: PlannerContext,
  jitterPorSkill: ReadonlyMap<SkillId, number>,
  pesoErros: ReadonlyMap<SkillId, ErroAgregado>,
  config: PlannerConfig,
): SkillPrioridade[] {
  const porId = new Map(context.mastery.map((item) => [item.skillId, item]))
  const maiorPesoErro = Math.max(0, ...[...pesoErros.values()].map((item) => item.peso))

  return SKILL_IDS.map((id) => {
    const definicao = getSkill(id)
    const estado = porId.get(id)
    const mastery = estado ? clamp01(estado.mastery) : 0
    const confidence = estado ? clamp01(estado.confidence) : 0
    const valor = definicao.pedagogicalValue / SKILL_SCALE_MAX
    const erroNormalizado = maiorPesoErro > 0 ? (pesoErros.get(id)?.peso ?? 0) / maiorPesoErro : 0

    const score =
      (1 - mastery) * valor +
      config.pesoIncerteza * (1 - confidence) +
      config.pesoErroDePartida * erroNormalizado +
      config.jitterPorSeed * (jitterPorSkill.get(id) ?? 0)

    return { skillId: id, area: definicao.area, score, mastery, confidence }
  }).sort((a, b) => b.score - a.score || skillOrder(a.skillId) - skillOrder(b.skillId))
}

/**
 * Reparte o orçamento entre os blocos escolhidos.
 *
 * Todo bloco recebe pelo menos o mínimo; o que sobra é dividido conforme os
 * pesos. Blocos com teto (revisões, que têm material finito) devolvem o
 * excedente para os demais. A soma nunca ultrapassa o orçamento.
 */
function repartirMinutos(
  selecionados: readonly BlocoSelecionado[],
  orcamento: number,
  config: PlannerConfig,
): number[] {
  const quantidade = selecionados.length
  if (quantidade === 0) return []

  const minutos = selecionados.map<number>(() => config.minutosMinimosPorBloco)
  const somaPesos = selecionados.reduce((soma, bloco) => soma + bloco.peso, 0)
  const sobra = orcamento - config.minutosMinimosPorBloco * quantidade

  if (sobra > 0 && somaPesos > 0) {
    for (let i = 0; i < quantidade; i += 1) {
      minutos[i] += Math.floor((sobra * selecionados[i].peso) / somaPesos)
    }
  }

  // Ordem determinística para distribuir o resto e o excedente dos tetos.
  const ordem = selecionados
    .map((bloco, indice) => ({ indice, peso: bloco.peso }))
    .sort((a, b) => b.peso - a.peso || a.indice - b.indice)
    .map((item) => item.indice)

  // Aplica os tetos antes de redistribuir o excedente.
  for (let i = 0; i < quantidade; i += 1) {
    const teto = selecionados[i].tetoMinutos
    if (teto !== undefined && minutos[i] > teto) {
      minutos[i] = Math.max(config.minutosMinimosPorBloco, teto)
    }
  }

  // O que sobrou (arredondamento e excedente de teto) vai um minuto por vez,
  // dos blocos de maior peso para os de menor. Se todos estiverem no teto, o
  // laço termina e o plano fica menor que o orçamento — o que é honesto.
  let resto = orcamento - minutos.reduce((soma, valor) => soma + valor, 0)
  const maxVoltas = quantidade * (Math.max(0, resto) + 1)
  for (let voltas = 0; resto > 0 && voltas < maxVoltas; voltas += 1) {
    const indice = ordem[voltas % quantidade]
    const teto = selecionados[indice].tetoMinutos
    if (teto === undefined || minutos[indice] < teto) {
      minutos[indice] += 1
      resto -= 1
    }
  }

  return minutos
}

/**
 * Monta o plano do dia.
 *
 * Ordem de prioridade: revisões vencidas, fraqueza vinda de partida real,
 * habilidade fraca de alto valor, cálculo e, por fim, currículo rotativo.
 * A soma de `estimatedMinutes` nunca ultrapassa o orçamento do perfil.
 */
export function buildDailyPlan(
  context: PlannerContext,
  seed: number | string,
  config: PlannerConfig = PLANNER_CONFIG,
): DailyPlan {
  const rng = createRng(seed)
  const orcamento = context.profile.dailyBudgetMinutes
  const minimo = config.minutosMinimosPorBloco

  // Consumido em ordem fixa: o jitter depende só da seed, não do contexto.
  const jitterPorSkill = new Map<SkillId, number>(SKILL_IDS.map((id) => [id, rng.next()]))

  const pesoErros = pesarErrosRecentes(context.recentGameErrors, context.now, config)
  const ranking = ranquearHabilidades(context, jitterPorSkill, pesoErros, config)

  const vagas = Math.max(
    1,
    Math.min(config.blocosPorOrcamento[orcamento], Math.floor(orcamento / minimo)),
  )

  const selecionados: BlocoSelecionado[] = []
  const usados = new Set<SkillId>()
  const areasSelecionadas = new Set<SkillArea>()

  function selecionar(bloco: BlocoSelecionado): boolean {
    if (selecionados.length >= vagas) return false
    selecionados.push(bloco)
    for (const skillId of bloco.skillIds) usados.add(skillId)
    return true
  }

  // 1. Revisões vencidas vêm antes de qualquer conteúdo novo.
  const vencidos = context.dueCards
    .filter((card) => {
      const quando = Date.parse(card.dueAt)
      return !Number.isNaN(quando) && quando <= context.now.getTime()
    })
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.id.localeCompare(b.id))

  if (vencidos.length > 0) {
    const habilidades: SkillId[] = []
    for (const card of vencidos) {
      for (const skillId of card.skillIds) {
        if (!habilidades.includes(skillId)) habilidades.push(skillId)
      }
    }
    selecionar({
      kind: 'revisao',
      title: 'Revisões vencidas',
      rationale:
        `${vencidos.length} ${plural(vencidos.length, 'revisão vencida', 'revisões vencidas')} ` +
        'esperando: retomar o que já foi treinado vem antes de conteúdo novo.',
      skillIds: habilidades.length > 0 ? habilidades : [ranking[0].skillId],
      peso: config.pesoRevisao,
      tetoMinutos: Math.ceil(vencidos.length * config.minutosPorItem.revisao),
      cards: vencidos,
    })
  }

  // 2. Fraqueza concreta vinda das partidas reais do usuário.
  const errosOrdenados = [...pesoErros.entries()].sort(
    (a, b) => b[1].peso - a[1].peso || skillOrder(a[0]) - skillOrder(b[0]),
  )
  const principalErro = errosOrdenados[0]
  if (principalErro) {
    const [skillId, dados] = principalErro
    const secundario = errosOrdenados[1]?.[0]
    const partes = [
      `${dados.ocorrencias} ${plural(dados.ocorrencias, 'lance', 'lances')} das suas partidas ` +
        `recentes ${plural(dados.ocorrencias, 'falhou', 'falharam')} em ` +
        rotuloMinusculo(skillId),
    ]
    if (dados.graves > 0) {
      partes.push(`${dados.graves} ${plural(dados.graves, 'foi erro grave', 'foram erros graves')}`)
    }
    selecionar({
      kind: 'erro-de-partida',
      title: TITULO_POR_KIND['erro-de-partida'],
      rationale: `${partes.join('; ')}.`,
      skillIds: secundario ? [skillId, secundario] : [skillId],
      peso: config.alocacaoAlvo['erro-de-partida'],
    })
  }

  // 2b. Abertura vinda do repertório: o aluno saiu da linha que ele mesmo
  //     escreveu, numa partida real. Fica ao lado do bloco de erro de partida,
  //     e não no rodízio, porque é a mesma classe de evidência — algo que
  //     aconteceu no tabuleiro, e não uma fatia de currículo. Só DESVIO entra;
  //     lacuna é conteúdo a escrever, não treino a fazer (ver `./aberturas`).
  const desvio = (context.desviosDeRepertorio ?? []).find(
    (item) => item.partidas >= config.minPartidasDeDesvio,
  )
  if (desvio) {
    const lado = ladoPorExtenso(desvio.lado)
    // As habilidades saem do repertório. Se ele não declarar nenhuma, o bloco
    // pega a melhor candidata da área em vez de nascer sem habilidade alguma —
    // um bloco com `skillIds` vazio não alimenta maestria de nada.
    const habilidades =
      desvio.habilidades.length > 0
        ? [...desvio.habilidades]
        : ranking
            .filter((item) => item.area === 'opening')
            .slice(0, 1)
            .map((item) => item.skillId)
    selecionar({
      kind: 'abertura',
      title: `${TITULO_POR_KIND.abertura}: seu repertório de ${lado}`,
      // O lance PRESCRITO não aparece aqui de propósito: a mesma posição vira
      // card de repertório, e dizer a resposta no plano responderia o card
      // antes da pergunta.
      rationale:
        `Em ${desvio.partidas} ${plural(desvio.partidas, 'partida recente', 'partidas recentes')} ` +
        `você jogou ${desvio.sanJogado} numa posição do seu repertório de ${lado}, que prevê ` +
        'outro lance ali. A linha já está escrita: isto é treino, não conteúdo novo.',
      skillIds: habilidades,
      peso: config.alocacaoAlvo.abertura,
    })
    // A área fica marcada mesmo quando não coube: o bloco de fraqueza de
    // abertura seria uma segunda tentativa de tratar a mesma área com evidência
    // pior, e quem perdeu a vaga aqui a perdeu para algo mais urgente.
    areasSelecionadas.add('opening')
  }

  // 3. Habilidades fracas e de alto valor pedagógico, no máximo uma por área.
  //    A área é escolhida pelo score da sua melhor candidata ponderado pela
  //    fatia alvo: uma tática fraca vale mais tempo que uma abertura fraca.
  const areasDeFraqueza = (['tactics', 'endgame', 'opening'] as const)
    // Área já tratada por evidência concreta não volta pela porta da estimativa.
    .filter((area) => !areasSelecionadas.has(area))
    .map((area) => {
      const candidato = ranking.find((item) => item.area === area && !usados.has(item.skillId))
      const kind = KIND_POR_AREA[area]
      return {
        area,
        candidato,
        ordem: candidato
          ? candidato.score * (config.baseDeOrdemPorArea + config.alocacaoAlvo[kind])
          : -1,
      }
    })
    .filter((item) => item.candidato !== undefined)
    .sort((a, b) => b.ordem - a.ordem)

  let blocosDeFraqueza = 0
  for (const { area, candidato } of areasDeFraqueza) {
    if (blocosDeFraqueza >= config.maxBlocosDeFraqueza) break
    if (selecionados.length >= vagas) break
    if (!candidato || usados.has(candidato.skillId)) continue
    const kind = KIND_POR_AREA[area]
    const companheiras = ranking
      .filter((item) => item.area === area && !usados.has(item.skillId))
      .slice(0, 2)
      .map((item) => item.skillId)
    const poucoMedida = candidato.confidence < config.limiarConfiancaBaixa
    const rationale = poucoMedida
      ? `Ainda há pouco dado sobre ${rotuloMinusculo(candidato.skillId)}: vale medir antes de ` +
        'assumir que está resolvido.'
      : `Domínio estimado de ${Math.round(candidato.mastery * 100)}% em ` +
        `${rotuloMinusculo(candidato.skillId)}, e essa habilidade rende muito no seu nível.`
    selecionar({
      kind,
      title: `${TITULO_POR_KIND[kind]}: ${rotuloDe(candidato.skillId)}`,
      rationale,
      skillIds: companheiras,
      peso: config.alocacaoAlvo[kind],
    })
    areasSelecionadas.add(area)
    blocosDeFraqueza += 1
  }

  // 4. Cálculo entra mesmo sem alerta: é o hábito que sustenta o resto.
  const calculoCandidato = ranking.find(
    (item) => item.area === 'calculation' && !usados.has(item.skillId),
  )
  if (calculoCandidato) {
    const skillIds = ranking
      .filter((item) => item.area === 'calculation' && !usados.has(item.skillId))
      .slice(0, 2)
      .map((item) => item.skillId)
    const rationale =
      context.mastery.length === 0
        ? 'Sem histórico ainda: cálculo entra por padrão para calibrar o seu nível.'
        : `Cálculo sustenta o resto do jogo e ${rotuloMinusculo(calculoCandidato.skillId)} é o ` +
          'seu ponto mais frágil da área.'
    selecionar({
      kind: 'calculo',
      title: `${TITULO_POR_KIND.calculo}: ${rotuloDe(calculoCandidato.skillId)}`,
      rationale,
      skillIds,
      peso: config.alocacaoAlvo.calculo,
    })
    areasSelecionadas.add('calculation')
  }

  // 5. Currículo rotativo: preenche as vagas que sobraram girando entre as
  //    áreas. Na primeira volta só entram áreas ainda ausentes do plano, para
  //    não repetir a mesma área enquanto outra ficou de fora.
  const giro = AREAS_ROTATIVAS.length
  const deslocamento = (diaDoAno(context.now) + rng.int(giro)) % giro
  for (let i = 0; i < giro * 2 && selecionados.length < vagas; i += 1) {
    const area = AREAS_ROTATIVAS[(deslocamento + i) % giro]
    if (i < giro && areasSelecionadas.has(area)) continue
    const candidato =
      ranking.find((item) => item.area === area && !usados.has(item.skillId)) ??
      ranking.find((item) => !usados.has(item.skillId))
    if (!candidato) break
    const kind = KIND_POR_AREA[candidato.area]
    selecionar({
      kind,
      title: `${TITULO_POR_KIND[kind]}: ${rotuloDe(candidato.skillId)}`,
      rationale:
        `Rodízio do currículo: ${rotuloMinusculo(candidato.skillId)} continua em circulação ` +
        'mesmo sem alerta recente.',
      skillIds: [candidato.skillId],
      peso: config.alocacaoAlvo[kind],
    })
    areasSelecionadas.add(candidato.area)
  }

  const minutosPorBloco = repartirMinutos(selecionados, orcamento, config)

  const blocks: PlanBlock[] = selecionados.map((bloco, indice) => {
    const estimatedMinutes = minutosPorBloco[indice]
    const teto = bloco.cards ? bloco.cards.length : Number.POSITIVE_INFINITY
    const itemCount = Math.max(
      1,
      Math.min(teto, Math.floor(estimatedMinutes / config.minutosPorItem[bloco.kind])),
    )
    const plano: PlanBlock = {
      id: `bloco-${indice + 1}-${bloco.kind}`,
      kind: bloco.kind,
      title: bloco.title,
      rationale: bloco.rationale,
      skillIds: bloco.skillIds,
      estimatedMinutes,
      itemCount,
    }
    if (bloco.cards) {
      plano.reviewCardIds = bloco.cards.slice(0, itemCount).map((card) => card.id)
    }
    return plano
  })

  const totalMinutes = blocks.reduce((soma, bloco) => soma + bloco.estimatedMinutes, 0)

  return {
    generatedFor: context.now.toISOString().slice(0, 10),
    budgetMinutes: orcamento,
    totalMinutes,
    blocks,
  }
}
