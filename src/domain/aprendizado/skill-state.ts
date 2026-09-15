/**
 * Estado de aprendizagem de uma habilidade: em que degrau ela está e com que
 * evidência.
 *
 * A DECISÃO MAIS IMPORTANTE DESTE ARQUIVO é o que ele NÃO guarda.
 *
 * O plano definitivo desenha um `SkillState` com `recentAccuracy`,
 * `hintUsageRate` e `masteryEstimate` dentro. Aqui esses três campos NÃO
 * existem, e a ausência é deliberada: `SkillMastery` (em `@/domain/skills`) já
 * é a fonte deles, viva e alimentada por evento. Copiá-los para cá criaria duas
 * fontes para a mesma verdade — e a segunda divergiria na primeira tentativa
 * gravada por um caminho que só atualiza uma das duas. O que este módulo
 * oferece no lugar é `visaoDaHabilidade`, que JUNTA os dois na leitura.
 *
 * O que só existe aqui, e por isso é persistido aqui:
 *
 * - o ESTÁGIO, que `SkillMastery` não tem como derivar: acertar muito não
 *   prova que alguém ensinou, e é precisamente essa distinção que o produto
 *   estava perdendo;
 * - a separação GUIADO vs INDEPENDENTE. `SkillMastery.attempts` conta as duas
 *   juntas, e somar tentativa com apoio a tentativa sem apoio apaga a única
 *   medida que diz se a assistência já pode ser retirada;
 * - `precisaDeReensino`, a marca que o plano chama de `needs_instruction`.
 *
 * OUTRA COISA QUE NÃO MORA AQUI: conclusão de atividade. Ver `./atividade`.
 * Terminar não é dominar, e este arquivo nunca é escrito por "o aluno terminou
 * o card" — só por "o aluno demonstrou alguma coisa".
 */

import type { SkillId, SkillMastery } from '@/domain/types'
import {
  ROTULO_DO_ESTAGIO,
  estagioAlcanca,
  estagioMaisAvancado,
  podeCobrarSemApoio,
  type LearningStage,
} from './estagio'

/**
 * O que fica gravado por habilidade.
 *
 * Só sinais que NENHUMA outra tabela tem. Ver o cabeçalho.
 */
export interface SkillState {
  skillId: SkillId
  stage: LearningStage
  /** Vezes que o conceito foi APRESENTADO (lição, exemplo resolvido). */
  exposureCount: number
  /** Tentativas COM apoio disponível (dica, pergunta intermediária, completion). */
  guidedAttempts: number
  guidedSuccesses: number
  /** Tentativas SEM apoio. É o que autoriza subir para `independent`. */
  independentAttempts: number
  independentSuccesses: number
  /** ISO-8601 em UTC. Quando o conceito foi ensinado pela última vez. */
  lastTaughtAt: string | null
  /** ISO-8601 em UTC. Última tentativa de qualquer tipo. */
  lastPracticedAt: string | null
  /**
   * O conhecimento entrou em revisão sem nunca ter sido ENSINADO por aqui —
   * cards herdados da V1, ou tema que o aluno acertou no diagnóstico e o app
   * nunca explicou.
   *
   * Enquanto isto for verdadeiro o planner deve reensinar ANTES de mandar
   * recuperar sozinho (plano §42 e teste 7). É o remendo honesto da migração:
   * a alternativa era presumir domínio, e presumir domínio é o defeito.
   */
  precisaDeReensino: boolean
  updatedAt: string
}

/**
 * Pesos da subida de degrau.
 *
 * ATENÇÃO: HEURÍSTICAS DE PRODUTO. Nenhum destes números saiu de dado nenhum —
 * são o mínimo de evidência que pareceu honesto exigir antes de retirar apoio
 * de um aluno de ~1100. Recalibrar com telemetria, não com opinião.
 */
export const SKILL_STATE_CONFIG = {
  /** Acertos COM apoio para a habilidade passar de `introduced` a `guided`. */
  acertosGuiadosParaGuided: 2,
  /** Acertos SEM apoio para passar de `guided` a `independent`. */
  acertosIndependentesParaIndependent: 2,
  /**
   * Acertos em REVISÃO ESPAÇADA para passar de `independent` a `review`.
   *
   * Um só. Entrar em revisão não é uma promoção por mérito: é a constatação de
   * que já existe item agendado. Exigir mais seria manter fora do ciclo um
   * conhecimento que o ciclo já está tratando.
   */
  acertosDeRevisaoParaReview: 1,
  /**
   * Ocorrências em PARTIDA REAL, sem falha, para chegar a `transfer`.
   *
   * Três, e não uma: `transfer` é a afirmação mais forte que o produto faz
   * sobre um aluno, e uma partida é ruído.
   */
  ocorrenciasLimpasParaTransfer: 3,
} as const

export type SkillStateConfig = Record<keyof typeof SKILL_STATE_CONFIG, number>

/**
 * Estado inicial: nada ensinado, nada medido.
 *
 * `precisaDeReensino` nasce `false` porque `unseen` já diz tudo o que há para
 * dizer — a marca serve a quem está ADIANTE na escada sem ter passado pelo
 * ensino, e quem está em `unseen` não está adiante de nada.
 */
export function criarSkillState(skillId: SkillId, agora: Date): SkillState {
  return {
    skillId,
    stage: 'unseen',
    exposureCount: 0,
    guidedAttempts: 0,
    guidedSuccesses: 0,
    independentAttempts: 0,
    independentSuccesses: 0,
    lastTaughtAt: null,
    lastPracticedAt: null,
    precisaDeReensino: false,
    updatedAt: agora.toISOString(),
  }
}

/** De onde veio a evidência. É o que decide QUAL contador se move. */
export type EvidenciaDeAprendizado =
  /** O conceito foi apresentado: lição, exemplo resolvido, contraste. */
  | { tipo: 'ensino' }
  /** Tentativa com apoio na tela: dica disponível, completion, pergunta guiada. */
  | { tipo: 'guiada'; acertou: boolean }
  /** Tentativa sem apoio nenhum. */
  | { tipo: 'independente'; acertou: boolean }
  /** Revisão espaçada vencida. */
  | { tipo: 'revisao'; acertou: boolean }
  /** Observação em partida real já analisada. */
  | { tipo: 'partida'; falhou: boolean }

/**
 * O degrau que a evidência acumulada sustenta.
 *
 * PURA E SÓ DE SUBIDA. A escada nunca desce sozinha: um erro isolado não
 * desfaz o ensino que aconteceu, e rebaixar por desempenho recriaria, pela
 * porta dos fundos, o "erre até acertar" que este trabalho veio remover. O que
 * o erro faz é mexer na MAESTRIA (que cai) e no agendamento (que encurta) —
 * dois números que já existem, em dois lugares que já são deles.
 *
 * `precisaDeReensino` é o único freio: enquanto ele estiver de pé, a escada
 * para em `introduced`, por mais evidência que chegue. É o que impede um card
 * herdado de saltar direto para recuperação independente.
 */
function estagioSustentado(
  estado: SkillState,
  mastery: SkillMastery | undefined,
  config: SkillStateConfig,
): LearningStage {
  if (estado.exposureCount === 0 && estado.guidedAttempts === 0 && estado.independentAttempts === 0)
    return 'unseen'

  if (estado.precisaDeReensino) {
    return estado.exposureCount > 0 ? 'introduced' : 'unseen'
  }

  const ocorrenciasLimpas = mastery ? mastery.realGameOccurrences - mastery.realGameErrors : 0
  if (
    estado.independentSuccesses >= config.acertosIndependentesParaIndependent &&
    ocorrenciasLimpas >= config.ocorrenciasLimpasParaTransfer
  ) {
    return 'transfer'
  }
  if (estado.independentSuccesses >= config.acertosIndependentesParaIndependent) {
    return 'independent'
  }
  if (estado.guidedSuccesses >= config.acertosGuiadosParaGuided) return 'guided'
  return 'introduced'
}

/**
 * Aplica uma evidência. NÃO muta `atual`.
 *
 * `emRevisao` chega por fora, do agendador, em vez de ser inferido de um
 * acerto com `tipo: 'revisao'`: quem sabe se existe card agendado é o FSRS, e
 * este módulo não é o modelo de domínio do FSRS (plano §5).
 */
export function aplicarEvidencia(
  atual: SkillState,
  evidencia: EvidenciaDeAprendizado,
  contexto: { agora: Date; mastery?: SkillMastery; emRevisao?: boolean },
  config: SkillStateConfig = SKILL_STATE_CONFIG,
): SkillState {
  const quando = contexto.agora.toISOString()
  const proximo: SkillState = { ...atual, updatedAt: quando }

  switch (evidencia.tipo) {
    case 'ensino':
      proximo.exposureCount += 1
      proximo.lastTaughtAt = quando
      // Ensinar é exatamente o que a marca esperava. Ela cai AQUI e em nenhum
      // outro lugar: acertar não apaga a dívida de nunca ter recebido a aula.
      proximo.precisaDeReensino = false
      break
    case 'guiada':
      proximo.guidedAttempts += 1
      if (evidencia.acertou) proximo.guidedSuccesses += 1
      proximo.lastPracticedAt = quando
      break
    case 'independente':
    case 'revisao':
      proximo.independentAttempts += 1
      if (evidencia.acertou) proximo.independentSuccesses += 1
      proximo.lastPracticedAt = quando
      break
    case 'partida':
      // Partida real não conta como tentativa de treino: ela não foi
      // provocada pelo app, e misturá-la com as outras inflaria a evidência
      // de autonomia com lances que o aluno jogou por outro motivo. O peso
      // dela entra pela maestria, e no salto para `transfer`.
      proximo.lastPracticedAt = quando
      break
  }

  const sustentado = estagioSustentado(proximo, contexto.mastery, config)
  const comRevisao =
    contexto.emRevisao === true && estagioAlcanca(sustentado, 'independent')
      ? estagioMaisAvancado(sustentado, 'review')
      : sustentado

  // `estagioMaisAvancado` e não atribuição direta: a escada não desce.
  proximo.stage = estagioMaisAvancado(atual.stage, comRevisao)
  return proximo
}

/**
 * Marca a habilidade como devendo reensino, sem apagar evidência.
 *
 * Usada pela migração da V1 (plano §42) e por quem descobre que um card antigo
 * cobra um tema que o app nunca explicou. Rebaixa o estágio para `introduced`
 * no máximo — e não para `unseen` — porque a evidência de que o aluno já
 * acertou continua existindo e continua valendo; o que não existe é a aula.
 */
export function marcarParaReensino(atual: SkillState, agora: Date): SkillState {
  return {
    ...atual,
    precisaDeReensino: true,
    stage: atual.exposureCount > 0 ? 'introduced' : 'unseen',
    updatedAt: agora.toISOString(),
  }
}

/**
 * A visão que as telas e o planner consomem: estágio + os números que já moram
 * em `SkillMastery`, JUNTADOS NA LEITURA.
 *
 * Existe para que ninguém precise carregar as duas tabelas e combiná-las na
 * mão — que é como as duas cópias nasceriam.
 */
export interface VisaoDaHabilidade {
  skillId: SkillId
  stage: LearningStage
  /** O rótulo que o aluno lê. Nunca um número com casa decimal. */
  rotulo: string
  /** 0..1, de `SkillMastery`. Derivado, nunca gravado aqui. */
  mastery: number
  confidence: number
  /** Fração de tentativas em que houve dica, de `SkillMastery`. */
  taxaDeDica: number
  /** Acerto sem apoio, medido só sobre as tentativas SEM apoio. */
  acuraciaIndependente: number | null
  podeCobrarSemApoio: boolean
  precisaDeReensino: boolean
}

export function visaoDaHabilidade(
  estado: SkillState,
  mastery: SkillMastery | undefined,
): VisaoDaHabilidade {
  return {
    skillId: estado.skillId,
    stage: estado.stage,
    rotulo: ROTULO_DO_ESTAGIO[estado.stage],
    mastery: mastery?.mastery ?? 0,
    confidence: mastery?.confidence ?? 0,
    taxaDeDica: mastery && mastery.attempts > 0 ? mastery.hintedAttempts / mastery.attempts : 0,
    acuraciaIndependente:
      estado.independentAttempts > 0
        ? estado.independentSuccesses / estado.independentAttempts
        : null,
    // A pergunta atravessa a marca de reensino: uma habilidade em `review` com
    // reensino pendente NÃO pode ser cobrada, por mais alto que esteja o
    // degrau. É o teste 7 do plano.
    podeCobrarSemApoio: podeCobrarSemApoio(estado.stage) && !estado.precisaDeReensino,
    precisaDeReensino: estado.precisaDeReensino,
  }
}
