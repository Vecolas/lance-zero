import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrastRatio, meetsWcagAA } from '@/lib/a11y/contrast'
import {
  boardColors,
  brandColors,
  darkColors,
  designTokens,
  lightTextColors,
  semanticColors,
} from '@/lib/design/tokens'

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

const CLARO = brandColors['bg-primary']
const CARTAO_CLARO = brandColors['bg-pure']
const ESCURO = darkColors['dark-background']
const CARTAO_ESCURO = darkColors['dark-card']

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

  it('o tema escuro não é preto absoluto', () => {
    expect(darkColors['dark-background']).not.toBe('#000000')
    expect(contrastRatio(darkColors['dark-background'], '#000000')).toBeGreaterThan(1)
  })
})

describe('contraste no tema claro', () => {
  it('texto principal e secundário passam em AA', () => {
    expect(meetsWcagAA(brandColors['navy-950'], CLARO)).toBe(true)
    expect(meetsWcagAA(brandColors['navy-900'], CLARO)).toBe(true)
    expect(meetsWcagAA(brandColors['slate-600'], CLARO)).toBe(true)
    expect(meetsWcagAA(brandColors['navy-950'], CARTAO_CLARO)).toBe(true)
  })

  it('as variantes de texto das cores semânticas passam em AA', () => {
    for (const [nome, cor] of Object.entries(lightTextColors)) {
      expect(meetsWcagAA(cor, CLARO), `${nome} sobre bg-primary`).toBe(true)
      expect(meetsWcagAA(cor, CARTAO_CLARO), `${nome} sobre bg-pure`).toBe(true)
    }
  })

  it('o botão primário usa Zero Deep porque Zero Blue reprovaria', () => {
    // Documenta a razão do desvio em relação ao guia: branco sobre Zero Blue
    // fica em 2.75:1. Zero Deep mantém a família e passa.
    expect(contrastRatio('#FFFFFF', brandColors['zero-blue'])).toBeLessThan(4.5)
    expect(meetsWcagAA('#FFFFFF', brandColors['zero-deep'])).toBe(true)
  })

  it('as cores semânticas cruas continuam reprovando como texto — por isso existem as variantes', () => {
    for (const [nome, cor] of Object.entries(semanticColors)) {
      const razao = contrastRatio(cor, CLARO)
      expect(razao, `${nome} crua sobre fundo claro`).toBeLessThan(4.5)
    }
  })
})

describe('contraste no tema escuro', () => {
  it('texto principal e secundário passam em AA', () => {
    expect(meetsWcagAA(darkColors['dark-text'], ESCURO)).toBe(true)
    expect(meetsWcagAA(darkColors['dark-text-muted'], ESCURO)).toBe(true)
    expect(meetsWcagAA(darkColors['dark-text'], CARTAO_ESCURO)).toBe(true)
    expect(meetsWcagAA(darkColors['dark-text-muted'], CARTAO_ESCURO)).toBe(true)
  })

  it('destaque e cores semânticas passam em AA sem precisar de variante', () => {
    expect(meetsWcagAA(brandColors['zero-cyan'], ESCURO)).toBe(true)
    for (const [nome, cor] of Object.entries(semanticColors)) {
      expect(meetsWcagAA(cor, ESCURO), `${nome} sobre fundo escuro`).toBe(true)
    }
  })
})

describe('tabuleiro', () => {
  it('as casas claras e escuras são distinguíveis', () => {
    // Casas não são texto: o piso adotado pelo projeto é 1.3:1.
    const pares: Array<[string, [string, string]]> = [
      ['claro', [boardColors['board-light'], boardColors['board-dark']]],
      ['contraste', [boardColors['board-contrast-light'], boardColors['board-contrast-dark']]],
    ]
    for (const [tema, [clara, escura]] of pares) {
      expect(contrastRatio(clara, escura), tema).toBeGreaterThanOrEqual(1.3)
    }
  })

  it('o tema de contraste separa mais as casas que o tema padrão', () => {
    const padrao = contrastRatio(boardColors['board-light'], boardColors['board-dark'])
    const contraste = contrastRatio(
      boardColors['board-contrast-light'],
      boardColors['board-contrast-dark'],
    )
    expect(contraste).toBeGreaterThan(padrao)
  })

  it('os destaques de último lance e seleção são distinguíveis entre si', () => {
    expect(
      contrastRatio(boardColors['board-last-move'], boardColors['board-selected']),
    ).toBeGreaterThan(1.1)
  })
})
