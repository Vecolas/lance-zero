/**
 * Portão da entrada da retenção de PARTIDA no modelo de maestria.
 *
 * A decisão que esta suíte protege: **as duas origens da retenção continuam
 * separadas.** `retentionAccuracy` guarda revisão espaçada e nada mais; a
 * retenção medida em partida chega derivada, é usada no cálculo e nunca é
 * gravada em lugar nenhum. Um teste que só olhasse a maestria final aprovaria
 * uma implementação que somasse as duas no mesmo campo — e aí o projeto perde a
 * capacidade de explicar o número depois.
 *
 * A varredura de vereditos percorre a TABELA `AFIRMA_NUMERO` (um `Record` sobre
 * a união, que o compilador obriga a atualizar), nunca uma lista escrita à mão.
 */

import { describe, expect, it } from 'vitest'

import {
  MASTERY_CONFIG,
  createMastery,
  masteryComRetencaoDePartida,
  updateMastery,
  type MasteryEvent,
} from '@/domain/skills/mastery'
import {
  AFIRMA_NUMERO,
  acuraciaDeRetencaoEmPartida,
  aplicarRetencaoDePartida,
} from '@/domain/skills/retencao-de-partida'
import type {
  RetencaoDeHabilidade,
  SkillId,
  SkillMastery,
  VereditoDeRetencao,
} from '@/domain/types'

const ALVO: SkillId = 'tactics.fork'
const OUTRA: SkillId = 'tactics.pin'

function retencao(parcial: Partial<RetencaoDeHabilidade> = {}): RetencaoDeHabilidade {
  return {
    skillId: ALVO,
    veredito: 'nao-reincidiu',
    treinadaEm: '2026-09-01T12:00:00.000Z',
    partidasVerificadas: 3,
    partidasComFalha: 0,
    falhas: 0,
    ultimaFalhaEm: null,
    ...parcial,
  }
}

/** Estado com histórico de revisão, para `retentionAccuracy` não ser zero. */
function estadoTreinado(): SkillMastery {
  const acerto: MasteryEvent = {
    tipo: 'revisao',
    acertou: true,
    usouDica: false,
    primeiraTentativa: true,
    thinkTimeMs: 9_000,
  }
  let estado = createMastery(ALVO)
  for (let i = 0; i < 6; i += 1) estado = updateMastery(estado, acerto)
  return estado
}

// -------------------------------------------------- quem pode afirmar número

describe('só afirma um número quem tem base', () => {
  const vereditos = Object.keys(AFIRMA_NUMERO) as VereditoDeRetencao[]

  it('a varredura encontrou vereditos para checar', () => {
    // Tabela vazia não é aprovação.
    expect(vereditos.length).toBeGreaterThan(0)
  })

  it('cada veredito devolve número ou null exatamente conforme a tabela', () => {
    const divergentes: string[] = []
    for (const veredito of vereditos) {
      const valor = acuraciaDeRetencaoEmPartida(retencao({ veredito }))
      const afirmou = valor !== null
      if (afirmou !== AFIRMA_NUMERO[veredito]) {
        divergentes.push(`${veredito}: tabela diz ${AFIRMA_NUMERO[veredito]}, devolveu ${valor}`)
      }
    }
    expect(divergentes, divergentes.join('\n')).toEqual([])
  })

  it('sem evidência não vira zero nem um: vira null', () => {
    // Zero acusaria o aluno de piorar; um o elogiaria. Os dois inventam
    // evidência, e o otimista é o pior porque produz elogio sem base.
    const valor = acuraciaDeRetencaoEmPartida(
      retencao({ veredito: 'sem-evidencia', partidasVerificadas: 0 }),
    )

    expect(valor).toBeNull()
  })

  it('denominador zero não vira NaN mesmo com veredito incoerente', () => {
    const valor = acuraciaDeRetencaoEmPartida(
      retencao({ veredito: 'nao-reincidiu', partidasVerificadas: 0 }),
    )

    expect(valor).toBeNull()
  })
})

describe('o número derivado', () => {
  it('é 1 quando nenhuma partida verificada falhou', () => {
    expect(acuraciaDeRetencaoEmPartida(retencao())).toBe(1)
  })

  it('é 0 quando todas falharam', () => {
    expect(
      acuraciaDeRetencaoEmPartida(
        retencao({ veredito: 'voltou-a-falhar', partidasComFalha: 3, falhas: 4 }),
      ),
    ).toBe(0)
  })

  it('é a fração de partidas sem falha, não a de lances', () => {
    // O denominador é PARTIDA ANALISADA. Quatro lances errados em uma de duas
    // partidas continua sendo metade — o número de lances não é observável como
    // taxa porque não sabemos quantas oportunidades a habilidade teve.
    expect(
      acuraciaDeRetencaoEmPartida(
        retencao({
          veredito: 'voltou-a-falhar',
          partidasVerificadas: 2,
          partidasComFalha: 1,
          falhas: 4,
        }),
      ),
    ).toBe(0.5)
  })
})

// ------------------------------------------------ as duas origens separadas

describe('as duas origens da retenção continuam separadas', () => {
  it('a retenção de partida NÃO é escrita em retentionAccuracy', () => {
    // O campo persistido tem de continuar respondendo uma pergunta só. Se ele
    // passar a misturar revisão e partida, ninguém consegue explicar o valor
    // depois — e é o que este teste existe para impedir.
    const antes = estadoTreinado()
    const depois = masteryComRetencaoDePartida(antes, 0)

    expect(depois.retentionAccuracy).toBe(antes.retentionAccuracy)
  })

  it('retenção de partida igual à de revisão não muda a maestria', () => {
    // Propriedade, não número cravado: as duas origens entram no MESMO
    // componente, então concordar não pode mover nada.
    const estado = estadoTreinado()
    const depois = masteryComRetencaoDePartida(estado, estado.retentionAccuracy)

    expect(depois.mastery).toBeCloseTo(estado.mastery, 12)
  })

  it('retenção de partida boa sobe a maestria; ruim desce', () => {
    const estado = estadoTreinado()

    expect(masteryComRetencaoDePartida(estado, 1).mastery).toBeGreaterThan(estado.mastery)
    expect(masteryComRetencaoDePartida(estado, 0).mastery).toBeLessThan(estado.mastery)
  })

  it('sem revisão nenhuma, a partida sustenta sozinha o componente de retenção', () => {
    const zerado = createMastery(ALVO)

    expect(masteryComRetencaoDePartida(zerado, 1).mastery).toBeGreaterThan(zerado.mastery)
  })

  it('o peso da partida na retenção é configuração, não número cravado', () => {
    const estado = estadoTreinado()
    const soRevisao = { ...MASTERY_CONFIG, pesoRetencaoDePartidaNaRetencao: 0 }

    // Com peso zero a partida não pode mover nada: afirma a regra, não o 0,5.
    expect(masteryComRetencaoDePartida(estado, 1, soRevisao).mastery).toBeCloseTo(
      estado.mastery,
      12,
    )
  })

  it('updateMastery continua sem conhecer retenção de partida', () => {
    // A retenção de partida entra na LEITURA, não no evento. Se algum dia ela
    // virar um acumulador dentro de `updateMastery`, este caso muda de valor.
    const estado = updateMastery(createMastery(ALVO), {
      tipo: 'partida',
      acertou: false,
      usouDica: false,
      primeiraTentativa: true,
      thinkTimeMs: 30_000,
    })

    expect(estado.retentionAccuracy).toBe(0)
  })
})

// ------------------------------------------------------ aplicação em lote

describe('aplicarRetencaoDePartida', () => {
  function lista(): SkillMastery[] {
    return [
      { ...createMastery(ALVO), recentAccuracy: 0.5, retentionAccuracy: 0.5, mastery: 0.5 },
      { ...createMastery(OUTRA), recentAccuracy: 0.5, retentionAccuracy: 0.5, mastery: 0.5 },
    ]
  }

  it('não muta a entrada', () => {
    const base = lista()
    const copia = base.map((item) => ({ ...item }))

    aplicarRetencaoDePartida(base, new Map([[ALVO, retencao()]]))

    expect(base).toEqual(copia)
  })

  it('habilidade sem verificação atravessa como o MESMO objeto', () => {
    const base = lista()
    const saida = aplicarRetencaoDePartida(base, new Map([[ALVO, retencao()]]))

    expect(saida[1]).toBe(base[1])
    expect(saida[0]).not.toBe(base[0])
  })

  it('habilidade com verificação sem base atravessa intacta', () => {
    // O controle que separa "melhorou" de "não sei": verificação que não
    // verificou nada não pode mexer em prioridade nenhuma.
    const base = lista()
    const semBase = retencao({ veredito: 'sem-evidencia', partidasVerificadas: 0 })
    const saida = aplicarRetencaoDePartida(base, new Map([[ALVO, semBase]]))

    expect(saida[0]).toBe(base[0])
  })

  it('preserva a ordem e o tamanho da lista', () => {
    const base = lista()
    const saida = aplicarRetencaoDePartida(base, new Map([[ALVO, retencao()]]))

    expect(saida.map((item) => item.skillId)).toEqual([ALVO, OUTRA])
  })
})
