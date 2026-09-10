/**
 * A MEDIÇÃO TAMBÉM PRECISA DE PORTÃO.
 *
 * O contraste renderizado é medido por `tests/e2e/util/a11y-medicao.ts`, que
 * roda no Playwright. Só que a conta que ele faz — ler a cor computada, achatar
 * as camadas de fundo, escolher o limiar pelo tamanho da fonte — é pura, e um
 * erro nela é SILENCIOSO: erra sempre para o mesmo lado e a suíte fica verde.
 *
 * Foi o que aconteceu na primeira versão, e o caso `rgb(0, 0, 0)` abaixo é a
 * lápide: o alfa era lido como "o último número entre parênteses", então preto
 * opaco virava "alfa 0", a camada era descartada e o texto passava a ser medido
 * contra o fundo mais claro que estava atrás — erro para o lado que APROVA.
 *
 * O QUE ESTE ARQUIVO NÃO PROVA: nada sobre as telas. Ele prova a aritmética.
 * Quem prova a tela é a varredura no navegador.
 */

import { describe, expect, it } from 'vitest'
import {
  LIMIARES_AA,
  achatarFundo,
  compor,
  lerRgb,
  limiarDe,
  paraHex,
} from '../e2e/util/a11y-medicao'

describe('leitura da cor computada', () => {
  it('lê rgb() com canais de 0 a 255', () => {
    expect(lerRgb('rgb(0, 169, 214)')).toEqual({ r: 0, g: 169, b: 214, a: 1 })
  })

  it('preto opaco tem alfa 1, não alfa 0', () => {
    // O defeito original. `rgb(0, 0, 0)` tem TRÊS componentes; quem pega o
    // último número como alfa conclui "transparente" e joga a camada fora.
    expect(lerRgb('rgb(0, 0, 0)').a).toBe(1)
  })

  it('lê rgba() com alfa', () => {
    expect(lerRgb('rgba(255, 255, 255, 0.1)')).toEqual({ r: 255, g: 255, b: 255, a: 0.1 })
  })

  it('lê color(srgb ...), que é o que color-mix() devolve', () => {
    // O cabeçalho do app usa `color-mix()`; o Chromium serializa a computada
    // neste formato, com canais de 0 a 1. Ignorar o formato faria a medição
    // pular o cabeçalho de TODA página sem dizer nada.
    const cor = lerRgb('color(srgb 0.968627 0.976471 0.984314 / 0.92)')
    expect(cor.r).toBeCloseTo(247, 0)
    expect(cor.g).toBeCloseTo(249, 0)
    expect(cor.b).toBeCloseTo(251, 0)
    expect(cor.a).toBeCloseTo(0.92, 5)
  })

  it('formato desconhecido LANÇA em vez de virar amostra aprovada', () => {
    expect(() => lerRgb('lab(50% 40 59.5)')).toThrow(/formato inesperado/)
    expect(() => lerRgb('transparent')).toThrow(/formato inesperado/)
  })
})

describe('achatamento das camadas de fundo', () => {
  it('camada opaca vence sozinha', () => {
    expect(paraHex(achatarFundo(['rgb(16, 35, 49)']))).toBe('#102331')
  })

  it('compõe da mais distante para a mais próxima', () => {
    // Branco a 10% sobre preto dá cinza bem escuro. Quem lê só a camada de
    // cima concluiria "quase branco" — e aprovaria texto branco por cima.
    expect(paraHex(achatarFundo(['rgba(255, 255, 255, 0.1)', 'rgb(0, 0, 0)']))).toBe('#1a1a1a')
  })

  it('sem camada nenhuma, a base é branco', () => {
    // Suposição declarada, e ela erra para o lado SEGURO: sobre branco o texto
    // claro fica com contraste pior, então o portão acusa em vez de liberar.
    expect(paraHex(achatarFundo([]))).toBe('#ffffff')
  })

  it('a ordem das camadas importa', () => {
    const claroSobreEscuro = paraHex(achatarFundo(['rgba(255, 255, 255, 0.5)', 'rgb(0, 0, 0)']))
    const escuroSobreClaro = paraHex(achatarFundo(['rgba(0, 0, 0, 0.5)', 'rgb(255, 255, 255)']))
    expect(claroSobreEscuro).toBe('#808080')
    expect(escuroSobreClaro).toBe('#808080')
    // As duas dão o mesmo cinza por simetria; o que o caso guarda é que a
    // composição usa o alfa da camada de CIMA sobre a de baixo, e não o
    // contrário — trocar a ordem em `compor` daria 0 e 255 aqui.
    expect(paraHex(compor({ r: 255, g: 255, b: 255, a: 0.25 }, { r: 0, g: 0, b: 0 }))).toBe(
      '#404040',
    )
  })
})

describe('limiar por tamanho e peso da fonte', () => {
  it('texto comum exige 4.5:1', () => {
    expect(limiarDe({ fontSizePx: 16, fontWeight: 400 })).toBe(LIMIARES_AA.normal)
  })

  it('a partir de 24px basta 3:1 em qualquer peso', () => {
    expect(limiarDe({ fontSizePx: 24, fontWeight: 400 })).toBe(LIMIARES_AA.grande)
    expect(limiarDe({ fontSizePx: 23.9, fontWeight: 400 })).toBe(LIMIARES_AA.normal)
  })

  it('em negrito o limite desce para 18.66px', () => {
    expect(limiarDe({ fontSizePx: 18.66, fontWeight: 700 })).toBe(LIMIARES_AA.grande)
    // Mesmo tamanho, peso 600: continua sendo texto comum. É a regra da norma,
    // e é o par que separa "grande" de "grandinho e seminegrito".
    expect(limiarDe({ fontSizePx: 18.66, fontWeight: 600 })).toBe(LIMIARES_AA.normal)
  })
})
