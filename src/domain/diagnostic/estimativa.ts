/**
 * Do que o aluno respondeu para um ponto de partida: faixa de rating e
 * maestria inicial por habilidade.
 *
 * PURO E DETERMINÍSTICO. As mesmas respostas produzem exatamente o mesmo
 * perfil, sempre. Nada aqui chama `Date.now`, `Math.random`, rede ou disco; o
 * relógio entra por parâmetro.
 *
 * DUAS DECISÕES QUE ESTE ARQUIVO CARREGA:
 *
 * 1. **O resultado é uma FAIXA, não um número.** Doze a vinte posições não
 *    sustentam dizer "seu rating é 1147". `ratingEstimado` existe porque o
 *    perfil precisa de um número para o planner, mas a tela mostra a FAIXA, e
 *    `faixaDeRating` sai da própria verossimilhança — não é o estimado ± um
 *    valor fixo escolhido para parecer modesto.
 *
 * 2. **A maestria inicial entra pelo modelo que já existe** (`updateMastery`),
 *    uma tentativa por resposta. Escrever aqui um segundo cálculo de maestria
 *    seria a segunda fonte da mesma verdade, e as duas divergiriam no dia em
 *    que alguém recalibrasse uma delas. O preço é conhecido e aceito: o EWMA
 *    parte de zero, então quem acerta tudo termina com domínio estimado bem
 *    abaixo de 1. É conservador de propósito — dezesseis posições não provam
 *    domínio, provam ausência de alarme.
 *
 * O QUE ESTE MÓDULO NÃO FAZ: medir habilidade que o banco não pergunta. As
 * habilidades sem item ficam com maestria zero e confiança zero, e é o planner
 * que trata isso — ele já sabe dizer "ainda há pouco dado sobre isto". Inventar
 * uma estimativa para elas seria falsa precisão logo na primeira tela.
 */

import { DEFAULT_ESTIMATED_RATING, type BudgetMinutes } from '@/domain/profile'
import { createMastery, updateMastery } from '@/domain/skills/mastery'
import { SKILL_IDS, type SkillId, type SkillMastery, type UserProfile } from '@/domain/types'
import { acertou, type ItemDeDiagnostico } from './item'

/**
 * Números do estimador.
 *
 * HEURÍSTICAS DE PRODUTO, exceto onde escrito. Nenhuma saiu de calibração com
 * jogadores reais: são escolhas para o comportamento inicial ser razoável, e
 * devem ser recalibradas com telemetria.
 */
export const ESTIMATIVA_CONFIG = {
  /** Menor rating que a grade considera. */
  gradeMinima: 600,
  /** Maior rating que a grade considera. */
  gradeMaxima: 2000,
  /** Passo da grade, em pontos. LIMITE DE DESIGN: define a resolução do busca. */
  gradePasso: 10,
  /**
   * Constante da curva logística, em pontos de rating.
   *
   * É a mesma do Elo (400): a chance de acerto cai pela metade a cada 400
   * pontos de diferença entre o aluno e a posição. Não é constante científica,
   * é a convenção que o público-alvo já conhece de outros sites de xadrez.
   */
  escalaLogistica: 400,
  /**
   * Quanto o rating informado pelo aluno pesa, em pontos de rating.
   *
   * Funciona como o desvio de uma crença anterior: quanto MENOR o número, mais
   * o resultado gruda no que o aluno disse. 250 deixa o desempenho nas posições
   * mandar quando ele contradiz o autorrelato, sem ignorá-lo.
   */
  desvioDoRatingInformado: 250,
  /**
   * Quanto a verossimilhança pode cair para um rating ainda entrar na faixa.
   *
   * HEURÍSTICA: não é um intervalo de confiança estatístico e não deve ser
   * apresentado como tal. É a largura do platô do topo.
   */
  quedaAceitaNaFaixa: 1,
  /** Piso e teto da probabilidade, para o logaritmo nunca ver zero. */
  probabilidadeMinima: 0.01,
} as const

export type EstimativaConfig = Record<keyof typeof ESTIMATIVA_CONFIG, number>

/** Uma resposta do aluno a um item. */
export interface RespostaDeDiagnostico {
  itemId: string
  /** Lance escolhido, em UCI. O acerto é DERIVADO daqui, nunca gravado junto. */
  lanceEscolhido: string
  /** Tempo de reflexão medido pela tela. */
  thinkTimeMs: number
}

/** O que o diagnóstico viu de uma habilidade. */
export interface EvidenciaDeHabilidade {
  skillId: SkillId
  itens: number
  acertos: number
  /** Maior dificuldade acertada, ou `null` se não acertou nenhum. */
  maiorDificuldadeAcertada: number | null
}

export interface EstimativaDeDiagnostico {
  /** Número para o planner. A TELA mostra a faixa. */
  ratingEstimado: number
  /** Intervalo de ratings compatíveis com as respostas. */
  faixaDeRating: { minimo: number; maximo: number }
  respondidos: number
  acertos: number
  porHabilidade: readonly EvidenciaDeHabilidade[]
  /**
   * Habilidades que o banco não pergunta. DERIVADO do banco, nunca escrito à
   * mão: uma lista à mão nunca acusaria a habilidade que saiu do banco depois.
   */
  naoMedidas: readonly SkillId[]
}

/** Item + resposta, já pareados. Resposta órfã é erro de quem chama. */
interface Respondido {
  item: ItemDeDiagnostico
  resposta: RespostaDeDiagnostico
  acertou: boolean
}

function parear(
  itens: readonly ItemDeDiagnostico[],
  respostas: readonly RespostaDeDiagnostico[],
): Respondido[] {
  const porId = new Map(itens.map((item) => [item.id, item]))
  return respostas.map((resposta) => {
    const item = porId.get(resposta.itemId)
    if (!item) {
      throw new Error(`Resposta para item inexistente no banco: ${resposta.itemId}`)
    }
    return { item, resposta, acertou: acertou(item, resposta.lanceEscolhido) }
  })
}

/** Chance de acerto de um aluno de `rating` num item de dificuldade `dificuldade`. */
function chanceDeAcerto(rating: number, dificuldade: number, config: EstimativaConfig): number {
  const p = 1 / (1 + 10 ** ((dificuldade - rating) / config.escalaLogistica))
  const piso = config.probabilidadeMinima
  return Math.min(1 - piso, Math.max(piso, p))
}

function verossimilhanca(
  rating: number,
  respondidos: readonly Respondido[],
  ratingInformado: number | null,
  config: EstimativaConfig,
): number {
  let total = 0
  for (const { item, acertou: certo } of respondidos) {
    const p = chanceDeAcerto(rating, item.dificuldade, config)
    total += Math.log(certo ? p : 1 - p)
  }
  if (ratingInformado !== null) {
    const desvio = (rating - ratingInformado) / config.desvioDoRatingInformado
    total -= (desvio * desvio) / 2
  }
  return total
}

/**
 * Estimativa completa a partir das respostas.
 *
 * `ratingInformado` é opcional porque o aluno pode não saber o próprio rating —
 * e obrigar um chute nesse caso encheria a estimativa de ruído apresentado como
 * dado.
 */
export function estimarDiagnostico(
  itens: readonly ItemDeDiagnostico[],
  respostas: readonly RespostaDeDiagnostico[],
  opcoes: { ratingInformado?: number | null } = {},
  config: EstimativaConfig = ESTIMATIVA_CONFIG,
): EstimativaDeDiagnostico {
  const respondidos = parear(itens, respostas)
  const ratingInformado = opcoes.ratingInformado ?? null
  const medidas = new Set(itens.map((item) => item.skillId))

  const base = {
    respondidos: respondidos.length,
    acertos: respondidos.filter((r) => r.acertou).length,
    porHabilidade: evidenciaPorHabilidade(respondidos),
    naoMedidas: SKILL_IDS.filter((id) => !medidas.has(id)),
  }

  // Sem resposta e sem autorrelato não há de onde tirar rating nenhum. Devolver
  // o piso da grade seria afirmar que o aluno é iniciante sem ter perguntado
  // nada; o padrão do produto é honesto sobre ser um chute.
  if (respondidos.length === 0 && ratingInformado === null) {
    return {
      ...base,
      ratingEstimado: DEFAULT_ESTIMATED_RATING,
      faixaDeRating: { minimo: config.gradeMinima, maximo: config.gradeMaxima },
    }
  }

  let melhorRating = config.gradeMinima
  let melhorValor = Number.NEGATIVE_INFINITY
  const valores: { rating: number; valor: number }[] = []

  for (let r = config.gradeMinima; r <= config.gradeMaxima; r += config.gradePasso) {
    const valor = verossimilhanca(r, respondidos, ratingInformado, config)
    valores.push({ rating: r, valor })
    if (valor > melhorValor) {
      melhorValor = valor
      melhorRating = r
    }
  }

  const corte = melhorValor - config.quedaAceitaNaFaixa
  const naFaixa = valores.filter((item) => item.valor >= corte).map((item) => item.rating)

  return {
    ...base,
    ratingEstimado: melhorRating,
    faixaDeRating: { minimo: Math.min(...naFaixa), maximo: Math.max(...naFaixa) },
  }
}

function evidenciaPorHabilidade(respondidos: readonly Respondido[]): EvidenciaDeHabilidade[] {
  const porSkill = new Map<SkillId, EvidenciaDeHabilidade>()
  for (const { item, acertou: certo } of respondidos) {
    const atual = porSkill.get(item.skillId) ?? {
      skillId: item.skillId,
      itens: 0,
      acertos: 0,
      maiorDificuldadeAcertada: null,
    }
    atual.itens += 1
    if (certo) {
      atual.acertos += 1
      atual.maiorDificuldadeAcertada = Math.max(
        atual.maiorDificuldadeAcertada ?? Number.NEGATIVE_INFINITY,
        item.dificuldade,
      )
    }
    porSkill.set(item.skillId, atual)
  }
  // Ordem canônica de `SKILL_IDS`: a saída não pode depender da ordem em que o
  // aluno respondeu, senão duas sessões idênticas produzem objetos diferentes.
  return SKILL_IDS.map((id) => porSkill.get(id)).filter((item) => item !== undefined)
}

/**
 * Maestria inicial das habilidades que o diagnóstico mediu.
 *
 * Habilidade sem item NÃO entra na lista: um registro com zero tentativas diz
 * ao planner exatamente o mesmo que a ausência dele, e ocuparia espaço no disco
 * fingindo evidência.
 *
 * `agora` é parâmetro. Relógio em lógica de domínio é sempre parâmetro.
 */
export function masteryInicial(
  itens: readonly ItemDeDiagnostico[],
  respostas: readonly RespostaDeDiagnostico[],
  agora: Date,
): SkillMastery[] {
  const respondidos = parear(itens, respostas)
  const porSkill = new Map<SkillId, SkillMastery>()

  // Ordem canônica: a maestria final não pode depender da ordem de resposta.
  const ordenados = [...respondidos].sort(
    (a, b) => SKILL_IDS.indexOf(a.item.skillId) - SKILL_IDS.indexOf(b.item.skillId),
  )

  for (const { item, resposta, acertou: certo } of ordenados) {
    const atual = porSkill.get(item.skillId) ?? createMastery(item.skillId)
    porSkill.set(
      item.skillId,
      updateMastery(atual, {
        tipo: 'puzzle',
        acertou: certo,
        usouDica: false,
        primeiraTentativa: true,
        thinkTimeMs: Math.max(0, resposta.thinkTimeMs),
        ocorridoEm: agora.toISOString(),
      }),
    )
  }

  return SKILL_IDS.map((id) => porSkill.get(id)).filter((item) => item !== undefined)
}

/**
 * Perfil inicial de quem terminou o diagnóstico, ainda sem conta.
 *
 * Parte de `createDefaultProfile` e sobrescreve só o que o diagnóstico
 * descobriu. Montar o objeto do zero aqui duplicaria os padrões de preferência
 * — e a cópia divergiria da original no dia em que uma preferência nova
 * nascesse com padrão diferente.
 */
export function perfilDoDiagnostico(
  base: UserProfile,
  entrada: { estimativa: EstimativaDeDiagnostico; orcamento: BudgetMinutes },
): UserProfile {
  return {
    ...base,
    estimatedRating: entrada.estimativa.ratingEstimado,
    dailyBudgetMinutes: entrada.orcamento,
  }
}
