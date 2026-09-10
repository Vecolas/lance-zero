/**
 * Portão do banco de diagnóstico.
 *
 * Varre a FONTE (`BANCO_DE_DIAGNOSTICO`) inteira, nunca uma lista escrita à
 * mão: item novo entra no portão sozinho, e item que sair para de ser cobrado
 * sozinho.
 *
 * MORDE DOS DOIS LADOS. Não basta o lance certo cumprir o objetivo: toda
 * alternativa apresentada como errada tem de FALHAR. Sem esse segundo lado, o
 * dia em que eu escrever como distrator um lance que também ganha, o aluno
 * responde certo, o app diz que ele errou, e a primeira semana dele nasce de um
 * erro que não existiu.
 */

import { describe, expect, it } from 'vitest'
import { BANCO_DE_DIAGNOSTICO } from '@/content/diagnostic'
import { opcoesDe, verificarExercicio } from '@/domain/diagnostic'
import { TIPOS_DE_OBJETIVO_DIAGNOSTICO } from '@/domain/diagnostic'
import { DEFAULT_ESTIMATED_RATING } from '@/domain/profile'
import { SKILL_IDS } from '@/domain/types'

/**
 * Limites do banco.
 *
 * `minimoDeItens`/`maximoDeItens` são o intervalo da issue #11. `margemDaEscada`
 * é HEURÍSTICA: quanto um item precisa se afastar do público-alvo para contar
 * como "acima" ou "abaixo" dele.
 */
const PORTAO = {
  minimoDeItens: 12,
  maximoDeItens: 20,
  margemDaEscada: 150,
} as const

describe('banco de diagnóstico', () => {
  // Regra 3 dos portões: tabela vazia não é aprovação.
  it('o banco tem entre 12 e 20 posições', () => {
    expect(BANCO_DE_DIAGNOSTICO.length).toBeGreaterThanOrEqual(PORTAO.minimoDeItens)
    expect(BANCO_DE_DIAGNOSTICO.length).toBeLessThanOrEqual(PORTAO.maximoDeItens)
  })

  it('todo id é único', () => {
    const ids = BANCO_DE_DIAGNOSTICO.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('toda habilidade citada existe no catálogo', () => {
    for (const item of BANCO_DE_DIAGNOSTICO) {
      expect(SKILL_IDS, `${item.id} cita habilidade fora do catálogo`).toContain(item.skillId)
    }
  })

  /**
   * O CRITÉRIO DE ACEITE QUE MAIS DÓI: "quem informa 1100 não recebe apenas
   * conceitos elementares como única trilha". Um banco só de posições fáceis
   * mede todo mundo como iniciante. A regra é afirmada como DISPERSÃO em torno
   * do público-alvo, não como um número cravado de item difícil.
   */
  it('a escada de dificuldade cerca o público-alvo pelos dois lados', () => {
    const dificuldades = BANCO_DE_DIAGNOSTICO.map((item) => item.dificuldade)
    const abaixo = dificuldades.filter((d) => d <= DEFAULT_ESTIMATED_RATING - PORTAO.margemDaEscada)
    const acima = dificuldades.filter((d) => d >= DEFAULT_ESTIMATED_RATING + PORTAO.margemDaEscada)
    expect(abaixo.length, 'nenhum item abaixo do público-alvo').toBeGreaterThan(0)
    expect(acima.length, 'nenhum item acima do público-alvo').toBeGreaterThan(0)
  })

  it('todo tipo de objetivo declarado aparece no banco', () => {
    const usados = new Set(BANCO_DE_DIAGNOSTICO.map((item) => item.objetivo.tipo))
    for (const tipo of TIPOS_DE_OBJETIVO_DIAGNOSTICO) {
      expect([...usados], `nenhum item usa o objetivo ${tipo}`).toContain(tipo)
    }
  })

  it('a tela mostra todas as opções e não vaza a resposta pela ordem', () => {
    const primeirasSaoCertas: boolean[] = []
    for (const item of BANCO_DE_DIAGNOSTICO) {
      const opcoes = opcoesDe(item)
      expect(opcoes.length, `${item.id} perdeu opções`).toBe(
        item.lancesAceitos.length + item.alternativas.length,
      )
      expect(new Set(opcoes).size, `${item.id} repete opção`).toBe(opcoes.length)
      primeirasSaoCertas.push(item.lancesAceitos.includes(opcoes[0]))
    }
    // A resposta certa não pode estar sempre na primeira posição.
    expect(primeirasSaoCertas.every(Boolean)).toBe(false)
  })

  it('todo item é conferível: aceitos cumprem, alternativas falham', { timeout: 120_000 }, () => {
    const falhas = BANCO_DE_DIAGNOSTICO.flatMap(verificarExercicio)
    expect(falhas.map((f) => `${f.itemId}: ${f.problema}`)).toEqual([])
  })
})
