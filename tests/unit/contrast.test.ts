import { describe, expect, it } from 'vitest'
import { contrastRatio, hexToRgb, isHexColor, meetsWcagAA } from '@/lib/a11y/contrast'

describe('contraste WCAG', () => {
  it('reconhece hex válido e inválido', () => {
    expect(isHexColor('#FFF')).toBe(true)
    expect(isHexColor('#101318')).toBe(true)
    expect(isHexColor('101318')).toBe(false)
    expect(isHexColor('#12345')).toBe(false)
  })

  it('expande hex de 3 dígitos', () => {
    expect(hexToRgb('#F0A')).toEqual({ r: 255, g: 0, b: 170 })
  })

  it('rejeita cor inválida', () => {
    expect(() => hexToRgb('roxo')).toThrow()
  })

  it('preto sobre branco dá o contraste máximo de 21:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
  })

  it('é simétrico e vale 1 para cores iguais', () => {
    expect(contrastRatio('#FF6B4A', '#101318')).toBeCloseTo(contrastRatio('#101318', '#FF6B4A'), 10)
    expect(contrastRatio('#7FA68A', '#7FA68A')).toBeCloseTo(1, 10)
  })

  it('aplica o limiar menor para texto grande', () => {
    // #8C8C8C sobre branco fica entre 3:1 e 4.5:1.
    const ratio = contrastRatio('#8C8C8C', '#FFFFFF')
    expect(ratio).toBeGreaterThan(3)
    expect(ratio).toBeLessThan(4.5)
    expect(meetsWcagAA('#8C8C8C', '#FFFFFF', 'normal')).toBe(false)
    expect(meetsWcagAA('#8C8C8C', '#FFFFFF', 'large')).toBe(true)
  })
})
