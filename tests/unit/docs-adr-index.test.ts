import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * O índice de ADRs precisa listar todo ADR do disco.
 *
 * Este teste existe porque a falha já aconteceu: dois ADRs ficaram fora do
 * índice sem ninguém notar. Índice de decisões que não lista uma decisão é pior
 * que não ter índice — quem confia nele conclui que a decisão não existe.
 */
const DIR = join(process.cwd(), 'docs/adr')

const arquivos = readdirSync(DIR)
  .filter((n) => /^\d{4}-.+\.md$/.test(n))
  .sort()

const indice = readFileSync(join(DIR, 'README.md'), 'utf8')

describe('índice de ADRs', () => {
  it('há pelo menos um ADR', () => {
    expect(arquivos.length).toBeGreaterThan(0)
  })

  it('todo ADR do disco está listado, com link que aponta para o arquivo certo', () => {
    for (const arquivo of arquivos) {
      expect(indice, `${arquivo} não aparece em docs/adr/README.md`).toContain(`(./${arquivo})`)
    }
  })

  it('a numeração não tem buraco nem repetição', () => {
    const numeros = arquivos.map((n) => Number(n.slice(0, 4)))
    expect(new Set(numeros).size, 'número de ADR repetido').toBe(numeros.length)
    for (let i = 0; i < numeros.length; i += 1) {
      expect(numeros[i], `esperava ADR ${i + 1}`).toBe(i + 1)
    }
  })

  it('o índice não lista ADR que não existe', () => {
    const listados = [...indice.matchAll(/\(\.\/(\d{4}-[^)]+\.md)\)/g)].map((m) => m[1])
    for (const listado of listados) {
      expect(arquivos, `${listado} está no índice mas não no disco`).toContain(listado)
    }
  })

  it('todo ADR declara um estado', () => {
    for (const arquivo of arquivos) {
      const texto = readFileSync(join(DIR, arquivo), 'utf8')
      expect(texto, `${arquivo} sem "**Estado:**"`).toMatch(/\*\*Estado:\*\*/)
    }
  })
})
