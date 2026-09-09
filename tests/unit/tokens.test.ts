import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrastRatio, meetsWcagAA } from '@/lib/a11y/contrast'
import { boardColors, brandColors, designTokens } from '@/lib/design/tokens'

const tokensCss = readFileSync(join(process.cwd(), 'src/app/tokens.css'), 'utf8')

const cssDeclarations = new Map(
  tokensCss
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('--') && line.includes(':'))
    .map((line) => {
      const separator = line.indexOf(':')
      const name = line.slice(2, separator).trim()
      const value = line
        .slice(separator + 1)
        .replace(';', '')
        .trim()
      return [name, value] as const
    }),
)

describe('tokens da marca', () => {
  it('todo token é hex válido', () => {
    for (const [name, value] of Object.entries(designTokens)) {
      expect(value, name).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('tokens.css e tokens.ts não divergem', () => {
    for (const [name, value] of Object.entries(designTokens)) {
      expect(cssDeclarations.get(name)?.toLowerCase(), `--${name} em tokens.css`).toBe(
        value.toLowerCase(),
      )
    }
  })

  it('texto principal passa em WCAG AA nos dois temas', () => {
    expect(meetsWcagAA(brandColors['ink-950'], brandColors['paper-50'])).toBe(true)
    expect(meetsWcagAA(brandColors['paper-50'], brandColors['ink-950'])).toBe(true)
    expect(meetsWcagAA(brandColors['ink-950'], brandColors['paper-200'])).toBe(true)
  })

  it('as casas claras e escuras do tabuleiro são distinguíveis', () => {
    // Casas de tabuleiro não são texto: o piso adotado pelo projeto é 1.3:1,
    // suficiente para separar as casas sem estourar o brilho da tela.
    const pairs: Array<[string, [string, string]]> = [
      ['paper', [boardColors['board-paper-light'], boardColors['board-paper-dark']]],
      ['graphite', [boardColors['board-graphite-light'], boardColors['board-graphite-dark']]],
    ]
    for (const [theme, [light, dark]] of pairs) {
      expect(contrastRatio(light, dark), theme).toBeGreaterThanOrEqual(1.3)
    }
  })
})
