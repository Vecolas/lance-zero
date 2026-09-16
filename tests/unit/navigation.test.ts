import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { allNav, HOME_ROUTE, mainNav, mobilePrimaryNav } from '@/lib/navigation'

describe('mapa de rotas', () => {
  it('não tem href duplicado', () => {
    const hrefs = allNav.map((item) => item.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it('todo href é uma rota absoluta', () => {
    for (const item of allNav) {
      expect(item.href, item.label).toMatch(/^\/[a-z-]+$/)
    }
  })

  /**
   * A ÁRVORE DE ROTAS GANHOU UM SEGMENTO DE IDIOMA.
   *
   * `src/app/[lang]/...` é o que permite o inglês existir com URL própria e o
   * `<html lang>` sair certo do servidor. O `href` do catálogo continua sendo o
   * português sem prefixo — que é o endereço real — e a página correspondente
   * mora um nível abaixo.
   */
  it('todo href tem uma página correspondente no disco', () => {
    for (const item of allNav) {
      const page = join(process.cwd(), 'src/app/[lang]', item.href.slice(1), 'page.tsx')
      expect(existsSync(page), `${item.href} → ${page}`).toBe(true)
    }
  })

  it('a home autenticada é o treino de hoje, não uma caixa de ferramentas', () => {
    expect(HOME_ROUTE).toBe('/dashboard')
    expect(mainNav[0].href).toBe(HOME_ROUTE)
  })

  it('a bottom navigation do mobile cabe em quatro itens com "Mais"', () => {
    expect(mobilePrimaryNav.length).toBeLessThanOrEqual(3)
    expect(mobilePrimaryNav.every((item) => mainNav.includes(item))).toBe(true)
  })

  it('toda rota declara a fase do roadmap que a entrega', () => {
    for (const item of allNav) {
      expect(item.phase, item.label).toBeGreaterThanOrEqual(1)
      expect(item.description.length, item.label).toBeGreaterThan(20)
    }
  })
})
