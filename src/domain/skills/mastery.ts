/**
 * Modelo de domínio de maestria por habilidade.
 *
 * Puro: recebe o estado atual e um evento, devolve um estado novo. Nenhuma
 * dependência de React, DOM ou persistência.
 */

import type { SkillId, SkillMastery } from '@/domain/types'

/** Origem do evento que atualiza a maestria. */
export type MasteryEventKind = 'puzzle' | 'revisao' | 'partida'

export interface MasteryEvent {
  tipo: MasteryEventKind
  acertou: boolean
  usouDica: boolean
  primeiraTentativa: boolean
  /**
   * O aluno chegou ao objetivo por um caminho que GANHA, mas não é o melhor
   * (issue #62). Não é erro — o objetivo foi cumprido — e por isso desconta em
   * vez de zerar.
   *
   * A DECISÃO DE PRODUTO POR TRÁS DISSO: acerto com desconto, para incentivar
   * procurar o melhor lance. Só "acerto" apagaria a distinção; só "desconto",
   * sem o aluno saber por quê, seria punição sem causa aparente — por isso a
   * tela é obrigada a dizer o que foi pior, com número conferível.
   *
   * Ausente vale `false`: campo novo nasce NEUTRO, senão toda tentativa antiga
   * passaria a ser lida como caminho torto.
   */
  porCaminhoMaisLongo?: boolean
  thinkTimeMs: number
  /** ISO 8601. Quando ausente, `lastSeenAt` não é alterado. */
  ocorridoEm?: string
}

/**
 * Pesos do modelo de maestria.
 *
 * ATENÇÃO: todos os números abaixo são HEURÍSTICAS DE PRODUTO, escolhidas para
 * o comportamento inicial parecer razoável a ~1100. Nenhum deles é derivado de
 * dados nem tem validação empírica. Devem ser recalibrados assim que houver
 * telemetria real de tentativas e partidas.
 */
export const MASTERY_CONFIG = {
  /** Peso da amostra nova na média móvel de acerto recente. */
  alphaRecente: 0.3,
  /** Peso da amostra nova na média móvel de retenção (eventos de revisão). */
  alphaRetencao: 0.35,
  /**
   * Fatia da RETENÇÃO que vem de partida real, quando as duas origens existem.
   *
   * A retenção tem duas origens que NÃO se somam num campo só (ver
   * `masteryComRetencaoDePartida`): `retentionAccuracy` guarda a revisão
   * espaçada, e a retenção de partida chega derivada, por parâmetro. Aqui elas
   * se encontram — no cálculo, não no armazenamento.
   *
   * HEURÍSTICA DE PRODUTO nunca calibrada. 0,5 é o empate declarado: não há
   * dado neste projeto que diga que acertar numa revisão vale mais ou menos que
   * não errar numa partida. Escolher um lado sem dado seria fingir precisão.
   */
  pesoRetencaoDePartidaNaRetencao: 0.5,
  /** Quanto uma dica reduz o crédito da amostra daquele acerto. */
  penalidadeDicaNaAmostra: 0.4,
  /** Quanto acertar fora da primeira tentativa reduz o crédito da amostra. */
  penalidadeSegundaTentativa: 0.25,
  /**
   * Desconto de quem cumpriu o objetivo por um caminho que ganha, mas é mais
   * longo que o melhor. NUNCA FOI CALIBRADO: não há telemetria dizendo quanto
   * vale ganhar por caminho torto, e o único argumento por trás do valor é que
   * ele precisa ser menor que o de errar (que zera) e maior que zero (senão o
   * incentivo não existe).
   */
  penalidadeLanceVencedorPior: 0.2,
  /** Redução máxima da maestria quando o usuário depende sempre de dica. */
  penalidadeDicaAcumulada: 0.25,
  /** Composição da maestria: acerto recente. */
  pesoRecente: 0.55,
  /** Composição da maestria: retenção em revisões espaçadas. */
  pesoRetencao: 0.2,
  /** Composição da maestria: desempenho em partida real. */
  pesoPartida: 0.25,
  /** Tentativas necessárias para a confiança chegar a 0,5. */
  meiaVidaConfiancaTentativas: 8,
  /** Ocorrências em partida real para o termo de confiança chegar a 0,5. */
  meiaVidaConfiancaPartidas: 3,
  /** Composição da confiança: volume de tentativas. */
  pesoConfiancaTentativas: 0.8,
  /** Composição da confiança: evidência vinda de partidas reais. */
  pesoConfiancaPartidas: 0.2,
  /** Passo do estimador incremental de mediana de tempo de reflexão, em ms. */
  passoMedianaMs: 400,
} as const

/**
 * Tipo dos pesos, com os valores ALARGADOS para `number`.
 *
 * `typeof MASTERY_CONFIG` congelaria cada peso no literal que ele tem hoje
 * (`0.5`, `0.35`, …) e nenhum chamador conseguiria passar um valor diferente —
 * o parâmetro `config` existiria sem poder ser usado, e o número estaria de
 * fato cravado no código apesar de morar numa constante. As chaves continuam
 * derivadas da constante: acrescentar um peso lá não exige tocar aqui.
 */
export type MasteryConfig = Record<keyof typeof MASTERY_CONFIG, number>

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

/** Estado inicial: nenhuma evidência, maestria e confiança zeradas. */
export function createMastery(skillId: SkillId): SkillMastery {
  return {
    skillId,
    exposures: 0,
    attempts: 0,
    firstTryCorrect: 0,
    recentAccuracy: 0,
    retentionAccuracy: 0,
    hintedAttempts: 0,
    medianThinkTimeMs: 0,
    realGameOccurrences: 0,
    realGameErrors: 0,
    mastery: 0,
    confidence: 0,
    lastSeenAt: null,
  }
}

/**
 * Crédito da tentativa, de 0 a 1.
 *
 * Errar vale 0. Acertar de primeira e sem dica vale 1. Dica e tentativas
 * extras descontam do crédito — o usuário resolveu, mas com apoio.
 */
function creditoDaAmostra(evento: MasteryEvent, config: MasteryConfig): number {
  if (!evento.acertou) return 0
  let credito = 1
  if (!evento.primeiraTentativa) credito *= 1 - config.penalidadeSegundaTentativa
  if (evento.usouDica) credito *= 1 - config.penalidadeDicaNaAmostra
  // Entra na MESMA família multiplicativa dos outros descontos, de propósito:
  // um mecanismo paralelo para "acerto com desconto" seria a quinta cópia da
  // mesma lógica com outro nome, e cópias divergem.
  //
  // OS DESCONTOS SE ACUMULAM. Quem usa dica E ganha por caminho torto leva os
  // dois. É coerente com o modelo, mas vale medir: multiplicar descontos pode
  // esvaziar o crédito de uma tentativa que, afinal, ganhou. Se isso aparecer
  // na prática, o conserto é um PISO no crédito — não remover o desconto, que
  // é justamente o incentivo.
  if (evento.porCaminhoMaisLongo === true) {
    credito *= 1 - config.penalidadeLanceVencedorPior
  }
  return clamp01(credito)
}

/**
 * Estimador incremental de mediana (Frugal-1U): sem histórico armazenado, o
 * valor caminha em passos fixos na direção da amostra. É aproximado por
 * construção — serve para tendência, não para estatística fina.
 */
function proximaMediana(atual: number, amostraMs: number, config: MasteryConfig): number {
  if (atual <= 0) return Math.max(0, amostraMs)
  if (amostraMs > atual) return atual + config.passoMedianaMs
  if (amostraMs < atual) return Math.max(0, atual - config.passoMedianaMs)
  return atual
}

/**
 * Componente de RETENÇÃO da maestria, com as duas origens.
 *
 * A DECISÃO: **campos separados, combinados na leitura.** `retentionAccuracy`
 * continua sendo só revisão espaçada — nada aqui escreve nele. A retenção
 * medida em PARTIDA chega por parâmetro, derivada na hora de
 * `RetencaoDeHabilidade`, e nunca vira um segundo acumulador persistido.
 *
 * Por que não somar as duas no mesmo número: um EWMA alimentado por duas
 * origens fica impossível de explicar depois. Diante de `retentionAccuracy =
 * 0,62` ninguém consegue dizer se o aluno vai bem nas revisões, bem nas
 * partidas, ou mediano nas duas — e a diferença entre esses três casos é
 * exatamente o que o produto promete saber responder. Separado, cada número
 * continua tendo uma pergunta só.
 *
 * Sem NENHUMA das duas origens, o componente cai de volta para o acerto recente
 * em vez de punir o usuário por algo que ele ainda não teve chance de fazer.
 */
function componenteDeRetencao(
  estado: SkillMastery,
  retencaoDePartida: number | null,
  config: MasteryConfig,
): number {
  const daRevisao = estado.retentionAccuracy > 0 ? clamp01(estado.retentionAccuracy) : null
  const daPartida = retencaoDePartida === null ? null : clamp01(retencaoDePartida)

  if (daRevisao !== null && daPartida !== null) {
    const peso = config.pesoRetencaoDePartidaNaRetencao
    return (1 - peso) * daRevisao + peso * daPartida
  }
  if (daRevisao !== null) return daRevisao
  if (daPartida !== null) return daPartida
  return clamp01(estado.recentAccuracy)
}

/**
 * Combina os sinais em uma maestria 0..1.
 *
 * `retencaoDePartida` é `null` por padrão: sem verificação de retenção, o
 * cálculo é exatamente o que sempre foi. Quem tem a verificação passa o número
 * e recebe uma maestria DERIVADA — ver `masteryComRetencaoDePartida`.
 */
function calcularMastery(
  estado: SkillMastery,
  config: MasteryConfig,
  retencaoDePartida: number | null = null,
): number {
  const recente = clamp01(estado.recentAccuracy)
  const retencao = componenteDeRetencao(estado, retencaoDePartida, config)
  const partida =
    estado.realGameOccurrences > 0
      ? clamp01(1 - estado.realGameErrors / estado.realGameOccurrences)
      : recente

  const base =
    config.pesoRecente * recente + config.pesoRetencao * retencao + config.pesoPartida * partida

  const taxaDeDica = estado.attempts > 0 ? estado.hintedAttempts / estado.attempts : 0
  const penalidade = 1 - config.penalidadeDicaAcumulada * clamp01(taxaDeDica)

  // O tempo de reflexão é registrado, mas deliberadamente não entra na
  // maestria: não temos calibração para dizer que rápido é melhor.
  return clamp01(base * penalidade)
}

/** Confiança cresce com o volume de evidência, nunca com o resultado dela. */
function calcularConfianca(estado: SkillMastery, config: MasteryConfig): number {
  const porTentativas = estado.attempts / (estado.attempts + config.meiaVidaConfiancaTentativas)
  const porPartidas =
    estado.realGameOccurrences / (estado.realGameOccurrences + config.meiaVidaConfiancaPartidas)

  return clamp01(
    config.pesoConfiancaTentativas * porTentativas + config.pesoConfiancaPartidas * porPartidas,
  )
}

/**
 * Aplica um evento de treino ou de partida sobre a maestria atual.
 * Não muta `current`.
 */
export function updateMastery(
  current: SkillMastery,
  evento: MasteryEvent,
  config: MasteryConfig = MASTERY_CONFIG,
): SkillMastery {
  const credito = creditoDaAmostra(evento, config)
  const attempts = current.attempts + 1

  const recentAccuracy = clamp01(
    current.recentAccuracy + config.alphaRecente * (credito - current.recentAccuracy),
  )

  const retentionAccuracy =
    evento.tipo === 'revisao'
      ? clamp01(
          current.retentionAccuracy + config.alphaRetencao * (credito - current.retentionAccuracy),
        )
      : current.retentionAccuracy

  const ehPartida = evento.tipo === 'partida'

  const proximo: SkillMastery = {
    ...current,
    exposures: current.exposures + 1,
    attempts,
    firstTryCorrect:
      current.firstTryCorrect +
      (evento.acertou && evento.primeiraTentativa && !evento.usouDica ? 1 : 0),
    recentAccuracy,
    retentionAccuracy,
    hintedAttempts: current.hintedAttempts + (evento.usouDica ? 1 : 0),
    medianThinkTimeMs:
      attempts === 1
        ? Math.max(0, evento.thinkTimeMs)
        : proximaMediana(current.medianThinkTimeMs, evento.thinkTimeMs, config),
    realGameOccurrences: current.realGameOccurrences + (ehPartida ? 1 : 0),
    realGameErrors: current.realGameErrors + (ehPartida && !evento.acertou ? 1 : 0),
    mastery: current.mastery,
    confidence: current.confidence,
    lastSeenAt: evento.ocorridoEm ?? current.lastSeenAt,
  }

  proximo.mastery = calcularMastery(proximo, config)
  proximo.confidence = calcularConfianca(proximo, config)

  return proximo
}

/**
 * Maestria recalculada com a retenção medida em PARTIDA REAL embutida.
 *
 * DERIVADA E LIDA NA HORA. Nada aqui é persistido, e é isso que torna o efeito
 * **temporário e reversível**: a verificação é recalculada das análises a cada
 * leitura, então basta a habilidade falhar de novo — ou um card novo reiniciar
 * a janela — para o ajuste desaparecer sozinho, sem ninguém precisar desfazer
 * nada. Um bônus gravado no disco seria permanente até alguém lembrar dele.
 *
 * `acuracia === null` significa que não há base para afirmar nada, e aí o
 * estado volta INTACTO — o mesmo objeto, não uma cópia. Habilidade sem
 * evidência não pode ganhar nem perder prioridade por causa de uma verificação
 * que não verificou nada.
 *
 * `retentionAccuracy` NÃO é tocado de propósito. Ver `componenteDeRetencao`.
 */
export function masteryComRetencaoDePartida(
  estado: SkillMastery,
  acuracia: number | null,
  config: MasteryConfig = MASTERY_CONFIG,
): SkillMastery {
  if (acuracia === null) return estado
  return { ...estado, mastery: calcularMastery(estado, config, acuracia) }
}
