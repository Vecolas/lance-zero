/**
 * Testes da busca de mate forçado.
 *
 * O que importa aqui não é o "sim": é o "não". Uma busca que responde `true`
 * para tudo aprovaria qualquer objetivo de mate do currículo, e o portão do
 * currículo viraria carimbo. Por isso metade destes casos alimenta a função com
 * posições que ela DEVE recusar.
 */

import { describe, expect, it } from 'vitest'
import { existeMateForcadoEm } from '@/domain/endgames'

const DAMA_MATE_EM_1 = '7k/8/6K1/8/8/8/8/1Q6 w - - 0 1'
const TORRE_MATE_EM_2 = '7k/8/5K2/8/8/8/8/R7 w - - 0 1'
const TORRE_SEM_MATE = '7k/8/8/8/8/8/8/R6K w - - 0 1'
/** Rei branco em c3, torre em h2, rei preto em a1: 1.Kc2 afoga; 1.Kb3! mata em dois. */
const AFOGAMENTO_OU_MATE = '8/8/8/8/8/2K5/7R/k7 w - - 0 1'

describe('existeMateForcadoEm', () => {
  it('acha o mate em 1', () => {
    expect(existeMateForcadoEm(DAMA_MATE_EM_1, 'w', 1)).toBe(true)
  })

  it('acha o mate em 2', () => {
    expect(existeMateForcadoEm(TORRE_MATE_EM_2, 'w', 2)).toBe(true)
  })

  it('RECUSA o mate em 2 quando o prazo pedido é 1', () => {
    // A régua morde: a mesma posição aprovada acima reprova com um lance a menos.
    expect(existeMateForcadoEm(TORRE_MATE_EM_2, 'w', 1)).toBe(false)
  })

  it('RECUSA posição sem mate no prazo', () => {
    expect(existeMateForcadoEm(TORRE_SEM_MATE, 'w', 2)).toBe(false)
  })

  it('RECUSA o mate do adversário como se fosse do aluno', () => {
    // Prazo positivo, posição com mate — mas para o outro lado.
    expect(() => existeMateForcadoEm(DAMA_MATE_EM_1, 'b', 2)).toThrow(/vez de b/)
  })

  it('prazo zero não acha mate nenhum', () => {
    expect(existeMateForcadoEm(DAMA_MATE_EM_1, 'w', 0)).toBe(false)
  })

  it('lança em posição impossível em vez de estourar dentro do adapter', () => {
    expect(() => existeMateForcadoEm('7k/8/6K1/8/8/8/8/Q7 w - - 0 1', 'w', 1)).toThrow(
      /impossível|inválido/,
    )
  })

  it('não confunde afogamento com mate', () => {
    // Aqui 1.Kc2 deixa as pretas SEM lance legal e SEM xeque: é afogamento, não
    // mate. Se a busca contasse "partida terminada" como mate, este caso
    // devolveria `true` com prazo de um lance só.
    expect(existeMateForcadoEm(AFOGAMENTO_OU_MATE, 'w', 1)).toBe(false)
  })

  it('acha o mate de verdade na mesma posição, com um lance a mais', () => {
    // Controle do caso acima: o `false` de cima é sobre o afogamento, e não
    // sobre a busca ser incapaz de enxergar esta posição.
    expect(existeMateForcadoEm(AFOGAMENTO_OU_MATE, 'w', 2)).toBe(true)
  })
})
