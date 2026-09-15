/**
 * Portão do modelo de estágio de aprendizagem.
 *
 * O QUE ESTE ARQUIVO PROVA, e é a regra que o produto inteiro passou a depender:
 * **a escada nunca desce e `unseen` nunca autoriza cobrança.**
 *
 * Os dois testes que mais importam aqui são os que afirmam AUSÊNCIA — que
 * nenhum caminho leva de `independent` de volta para `guided`, e que nenhuma
 * combinação de evidência tira `precisaDeReensino` sem ensino. Ausência é o que
 * ninguém percebe faltando: um rebaixamento acidental apareceria como "o app
 * ficou mais fácil de repente" e ninguém abriria um bug para isso.
 */

import { describe, expect, it } from 'vitest'
import {
  ESTAGIOS_DE_APRENDIZADO,
  ESTAGIO_MINIMO_PARA_COBRAR,
  SKILL_STATE_CONFIG,
  aplicarEvidencia,
  criarSkillState,
  estagioAlcanca,
  estagioMaisAvancado,
  marcarParaReensino,
  ordemDoEstagio,
  podeCobrarSemApoio,
  visaoDaHabilidade,
  type EvidenciaDeAprendizado,
  type SkillState,
} from '@/domain/aprendizado'
import { createMastery } from '@/domain/skills/mastery'
import type { SkillMastery } from '@/domain/types'

const AGORA = new Date('2026-03-10T12:00:00.000Z')
const SKILL = 'tactics.fork' as const

function comEvidencias(
  evidencias: readonly EvidenciaDeAprendizado[],
  mastery?: SkillMastery,
): SkillState {
  let estado = criarSkillState(SKILL, AGORA)
  for (const evidencia of evidencias) {
    estado = aplicarEvidencia(estado, evidencia, { agora: AGORA, mastery })
  }
  return estado
}

describe('a escada de estágios', () => {
  it('tem ordem estrita e sem repetição', () => {
    const ordens = ESTAGIOS_DE_APRENDIZADO.map(ordemDoEstagio)
    expect(ordens).toEqual([...ordens].sort((a, b) => a - b))
    expect(new Set(ESTAGIOS_DE_APRENDIZADO).size).toBe(ESTAGIOS_DE_APRENDIZADO.length)
  })

  it('começa em unseen e termina em transfer', () => {
    expect(ESTAGIOS_DE_APRENDIZADO[0]).toBe('unseen')
    expect(ESTAGIOS_DE_APRENDIZADO[ESTAGIOS_DE_APRENDIZADO.length - 1]).toBe('transfer')
  })

  it('unseen e introduced NUNCA autorizam cobrança sem apoio', () => {
    expect(podeCobrarSemApoio('unseen')).toBe(false)
    expect(podeCobrarSemApoio('introduced')).toBe(false)
    // E do mínimo para cima, todos autorizam. Afirmado sobre a LISTA, e não
    // repetindo os nomes: um degrau novo entre `guided` e `independent` entra
    // neste teste sozinho.
    const daqui = ordemDoEstagio(ESTAGIO_MINIMO_PARA_COBRAR)
    for (const estagio of ESTAGIOS_DE_APRENDIZADO) {
      expect(podeCobrarSemApoio(estagio)).toBe(ordemDoEstagio(estagio) >= daqui)
    }
  })

  it('estagioMaisAvancado devolve sempre o maior dos dois', () => {
    expect(estagioMaisAvancado('guided', 'unseen')).toBe('guided')
    expect(estagioMaisAvancado('unseen', 'review')).toBe('review')
    expect(estagioMaisAvancado('transfer', 'transfer')).toBe('transfer')
  })
})

describe('a evidência move o estágio', () => {
  it('sem evidência nenhuma a habilidade fica em unseen', () => {
    expect(criarSkillState(SKILL, AGORA).stage).toBe('unseen')
  })

  it('ensinar leva a introduced, e não além', () => {
    const estado = comEvidencias([{ tipo: 'ensino' }])
    expect(estado.stage).toBe('introduced')
    expect(estado.exposureCount).toBe(1)
    // Ler um texto não é praticar: os contadores de tentativa continuam zerados.
    expect(estado.guidedAttempts).toBe(0)
    expect(estado.independentAttempts).toBe(0)
  })

  it('acertos COM apoio levam a guided', () => {
    const acertosGuiados = Array.from(
      { length: SKILL_STATE_CONFIG.acertosGuiadosParaGuided },
      () => ({ tipo: 'guiada', acertou: true }) as const,
    )
    const estado = comEvidencias([{ tipo: 'ensino' }, ...acertosGuiados])
    expect(estado.stage).toBe('guided')
  })

  it('acerto com apoio NÃO leva a independent, por mais que se repita', () => {
    const muitos = Array.from({ length: 20 }, () => ({ tipo: 'guiada', acertou: true }) as const)
    const estado = comEvidencias([{ tipo: 'ensino' }, ...muitos])
    // É a distinção que `SkillMastery.attempts` não conseguia fazer: vinte
    // acertos com dica não são evidência de autonomia nenhuma.
    expect(estado.stage).toBe('guided')
  })

  it('acertos SEM apoio levam a independent', () => {
    const semApoio = Array.from(
      { length: SKILL_STATE_CONFIG.acertosIndependentesParaIndependent },
      () => ({ tipo: 'independente', acertou: true }) as const,
    )
    const estado = comEvidencias([{ tipo: 'ensino' }, ...semApoio])
    expect(estado.stage).toBe('independent')
  })

  it('só chega a transfer com evidência de PARTIDA REAL limpa', () => {
    const semApoio = Array.from(
      { length: SKILL_STATE_CONFIG.acertosIndependentesParaIndependent },
      () => ({ tipo: 'independente', acertou: true }) as const,
    )

    const semPartida = comEvidencias([{ tipo: 'ensino' }, ...semApoio])
    expect(semPartida.stage).toBe('independent')

    const mastery: SkillMastery = {
      ...createMastery(SKILL),
      realGameOccurrences: SKILL_STATE_CONFIG.ocorrenciasLimpasParaTransfer,
      realGameErrors: 0,
    }
    const comPartida = comEvidencias([{ tipo: 'ensino' }, ...semApoio], mastery)
    expect(comPartida.stage).toBe('transfer')
  })

  it('errar NÃO derruba o estágio — a escada não desce', () => {
    const semApoio = Array.from(
      { length: SKILL_STATE_CONFIG.acertosIndependentesParaIndependent },
      () => ({ tipo: 'independente', acertou: true }) as const,
    )
    let estado = comEvidencias([{ tipo: 'ensino' }, ...semApoio])
    expect(estado.stage).toBe('independent')

    for (let i = 0; i < 10; i += 1) {
      estado = aplicarEvidencia(estado, { tipo: 'independente', acertou: false }, { agora: AGORA })
    }

    // Continua em `independent`: quem errou dez vezes seguidas não desaprendeu
    // o conceito, e rebaixar recriaria o "erre até acertar" por outra porta. O
    // que cai é a MAESTRIA, que é outro número em outro arquivo.
    expect(estado.stage).toBe('independent')
    expect(estado.independentAttempts).toBe(12)
    expect(estado.independentSuccesses).toBe(2)
  })

  it('tentativa não muta o estado anterior', () => {
    const antes = criarSkillState(SKILL, AGORA)
    const copia = structuredClone(antes)
    aplicarEvidencia(antes, { tipo: 'guiada', acertou: true }, { agora: AGORA })
    expect(antes).toEqual(copia)
  })
})

describe('a marca de reensino', () => {
  it('trava a escada em introduced por mais evidência que chegue', () => {
    const semApoio = Array.from(
      { length: 10 },
      () => ({ tipo: 'independente', acertou: true }) as const,
    )
    let estado = marcarParaReensino(comEvidencias([{ tipo: 'ensino' }]), AGORA)
    for (const evidencia of semApoio) {
      estado = aplicarEvidencia(estado, evidencia, { agora: AGORA })
    }

    // É o teste 7 do plano: card vencido de tema nunca ensinado não pode virar
    // recuperação independente só porque o aluno vem acertando.
    expect(estado.stage).toBe('introduced')
    expect(visaoDaHabilidade(estado, undefined).podeCobrarSemApoio).toBe(false)
  })

  it('só o ENSINO a apaga — acertar não apaga', () => {
    const marcado = marcarParaReensino(comEvidencias([{ tipo: 'ensino' }]), AGORA)

    const depoisDeAcertar = aplicarEvidencia(
      marcado,
      { tipo: 'independente', acertou: true },
      { agora: AGORA },
    )
    expect(depoisDeAcertar.precisaDeReensino).toBe(true)

    const depoisDeEnsinar = aplicarEvidencia(marcado, { tipo: 'ensino' }, { agora: AGORA })
    expect(depoisDeEnsinar.precisaDeReensino).toBe(false)
  })

  it('não apaga a evidência já acumulada', () => {
    const antes = comEvidencias([
      { tipo: 'ensino' },
      { tipo: 'independente', acertou: true },
      { tipo: 'independente', acertou: true },
    ])
    const marcado = marcarParaReensino(antes, AGORA)
    expect(marcado.independentSuccesses).toBe(antes.independentSuccesses)
    expect(marcado.exposureCount).toBe(antes.exposureCount)
  })
})

describe('a visão junta estágio e maestria SEM duplicar', () => {
  it('não existe campo de maestria dentro do estado gravado', () => {
    const estado = criarSkillState(SKILL, AGORA)
    // A prova de que não há segunda fonte: os nomes da maestria não existem
    // aqui. Se alguém os acrescentar, este teste cai — que é o ponto.
    expect(Object.keys(estado)).not.toContain('masteryEstimate')
    expect(Object.keys(estado)).not.toContain('recentAccuracy')
    expect(Object.keys(estado)).not.toContain('hintUsageRate')
  })

  it('deriva os números da maestria na leitura', () => {
    const mastery: SkillMastery = {
      ...createMastery(SKILL),
      attempts: 10,
      hintedAttempts: 4,
      mastery: 0.62,
      confidence: 0.5,
    }
    const visao = visaoDaHabilidade(criarSkillState(SKILL, AGORA), mastery)
    expect(visao.mastery).toBe(0.62)
    expect(visao.taxaDeDica).toBeCloseTo(0.4)
  })

  it('sem maestria nenhuma devolve zeros, e não NaN', () => {
    const visao = visaoDaHabilidade(criarSkillState(SKILL, AGORA), undefined)
    expect(visao.mastery).toBe(0)
    expect(visao.taxaDeDica).toBe(0)
    // `null` e não 0: nunca ter tentado sozinho é diferente de ter errado tudo.
    expect(visao.acuraciaIndependente).toBeNull()
  })

  it('o rótulo é texto, e nunca um número com casa decimal', () => {
    for (const estagio of ESTAGIOS_DE_APRENDIZADO) {
      let estado = criarSkillState(SKILL, AGORA)
      estado = { ...estado, stage: estagio }
      const visao = visaoDaHabilidade(estado, undefined)
      expect(visao.rotulo).toMatch(/[A-Za-zÀ-ÿ]/)
      expect(visao.rotulo).not.toMatch(/\d/)
    }
  })
})

describe('estagioAlcanca', () => {
  it('é reflexiva, e ordena conforme a escada', () => {
    for (const estagio of ESTAGIOS_DE_APRENDIZADO) {
      expect(estagioAlcanca(estagio, estagio)).toBe(true)
    }
    expect(estagioAlcanca('review', 'guided')).toBe(true)
    expect(estagioAlcanca('guided', 'review')).toBe(false)
  })
})
