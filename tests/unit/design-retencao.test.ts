/**
 * Portão da REDAÇÃO do veredito de retenção.
 *
 * Este arquivo existe porque a frase é o produto aqui. O cálculo pode estar
 * certo e a tela mentir mesmo assim: basta `nao-reincidiu` virar "você domina
 * esse padrão". O modelo não sabe quantas OPORTUNIDADES a habilidade teve —
 * `PositionAnalysis.skillIds` só é preenchido nos lances que o pipeline
 * aprofundou, que são os candidatos a erro, então um lance CERTO com garfo
 * disponível não deixa rastro. "Você domina" seria afirmar o que o dado não
 * sustenta, e o aluno pararia de treinar um padrão que talvez nunca tenha
 * aparecido.
 *
 * O portão varre a FONTE (`VEREDITOS_DE_RETENCAO`), não uma lista escrita à
 * mão: veredito novo no domínio precisa de rótulo, cor, ícone e frase, ou
 * reprova aqui.
 *
 * O QUE ELE NÃO PROVA: que a frase está bem escrita. Nenhuma máquina pega isso.
 * Ele prova que a ressalva não sumiu e que os números conferíveis estão lá.
 */

import { describe, expect, it } from 'vitest'
import { catalogoDeRetencao, fraseDeRetencao, VEREDITOS_DE_RETENCAO } from '@/lib/design/retencao'
import type { RetencaoDeHabilidade, VereditoDeRetencao } from '@/domain/types'

function retencao(
  veredito: VereditoDeRetencao,
  partidasVerificadas: number,
  partidasComFalha = 0,
): RetencaoDeHabilidade {
  return {
    skillId: 'tactics.fork',
    veredito,
    treinadaEm: '2026-09-01T12:00:00.000Z',
    partidasVerificadas,
    partidasComFalha,
    falhas: partidasComFalha,
    ultimaFalhaEm: partidasComFalha > 0 ? '2026-09-05T12:00:00.000Z' : null,
  }
}

describe('catálogo de veredito de retenção', () => {
  it('cobre exatamente os vereditos do domínio', () => {
    // Varre a FONTE nos dois sentidos: veredito sem descritor reprova, e
    // descritor órfão também — senão a lista acumula entradas mortas.
    expect(VEREDITOS_DE_RETENCAO.length).toBeGreaterThan(0)
    expect([...VEREDITOS_DE_RETENCAO].sort()).toEqual(Object.keys(catalogoDeRetencao).sort())
  })

  it('todo veredito sai como cor, ícone e rótulo juntos', () => {
    let verificados = 0
    for (const veredito of VEREDITOS_DE_RETENCAO) {
      const d = catalogoDeRetencao[veredito]
      expect(d.label.length, `${veredito} sem rótulo`).toBeGreaterThan(0)
      expect(d.colorVar, `${veredito} sem cor`).toMatch(/^var\(--/)
      expect(d.icon.path.length, `${veredito} sem ícone`).toBeGreaterThan(0)
      verificados += 1
    }
    expect(verificados).toBe(VEREDITOS_DE_RETENCAO.length)
  })

  it('só os dois vereditos que afirmam algo estão marcados como tal', () => {
    // CONTROLE: sem isto, marcar tudo como `afirma: true` passaria — e a tela
    // poderia dar peso de conclusão a "o aluno não jogou nada".
    const afirmam = VEREDITOS_DE_RETENCAO.filter((v) => catalogoDeRetencao[v].afirma)
    expect([...afirmam].sort()).toEqual(['nao-reincidiu', 'voltou-a-falhar'])
  })

  it('toda frase existe e nenhuma é igual à outra', () => {
    const frases = VEREDITOS_DE_RETENCAO.map((v) =>
      fraseDeRetencao(retencao(v, 3, v === 'voltou-a-falhar' ? 1 : 0)),
    )
    for (const [i, frase] of frases.entries()) {
      expect(frase.length, `${VEREDITOS_DE_RETENCAO[i]} sem frase`).toBeGreaterThan(20)
    }
    expect(new Set(frases).size, 'duas frases iguais para vereditos diferentes').toBe(frases.length)
  })

  it('"não reincidiu" NUNCA é apresentado como domínio do padrão', () => {
    // A asserção é sobre a RESSALVA continuar existindo, não sobre a ausência
    // de uma palavra: a frase atual contém "dominado" dentro de uma negação, e
    // um portão que proibisse a palavra reprovaria o texto certo.
    const frase = fraseDeRetencao(retencao('nao-reincidiu', 4))
    expect(frase).toContain('não quer dizer')
    expect(frase).toContain('4 partidas analisadas')
  })

  it('as frases trazem os números que as sustentam, e concordam em número', () => {
    // Veredito sozinho não é explicável depois. "Em 3 partidas analisadas,
    // nenhuma falhou" é conferível pelo aluno; "melhorou" não é.
    expect(fraseDeRetencao(retencao('nao-reincidiu', 1))).toContain('1 partida analisada')
    expect(fraseDeRetencao(retencao('nao-reincidiu', 2))).toContain('2 partidas analisadas')
    expect(fraseDeRetencao(retencao('voltou-a-falhar', 3, 1))).toContain('1 partida')
    expect(fraseDeRetencao(retencao('evidencia-insuficiente', 1))).toContain('1 partida analisada')
  })

  it('"sem evidência" pede uma ação, em vez de só dizer que não sabe', () => {
    // É a única parte acionável da mensagem: sem ela, os dois vereditos que não
    // afirmam nada viram a mesma frase inútil para o aluno.
    expect(fraseDeRetencao(retencao('sem-evidencia', 0))).toContain('Importe uma partida')
    expect(fraseDeRetencao(retencao('evidencia-insuficiente', 1))).toContain(
      'analise mais partidas',
    )
  })
})
