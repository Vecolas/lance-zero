import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { STORES } from '@/lib/storage/indexeddb-repository'

/**
 * O data map tem de acompanhar o que o app realmente guarda.
 *
 * Documento de privacidade envelhece em silêncio: alguém acrescenta uma coleção
 * nova, ninguém lembra do documento, e o data map passa a mentir — o que é pior
 * que não existir, porque cria confiança falsa.
 *
 * A varredura lê a FONTE (as coleções declaradas no repositório), nunca uma
 * lista escrita à mão neste teste.
 */
const DOC = readFileSync(join(process.cwd(), 'docs/PRIVACIDADE.md'), 'utf8')

/** Coleções que existem no banco e de propósito NÃO aparecem no data map. */
const FORA_DO_DATA_MAP: Record<string, string> = {}

describe('data map de privacidade', () => {
  const colecoes = Object.values(STORES)

  it('a varredura encontrou coleções para checar', () => {
    // Tabela vazia não é aprovação: sem isto, um dia em que STORES ficasse
    // vazio o teste passaria sem ter olhado nada.
    expect(colecoes.length).toBeGreaterThan(3)
  })

  it('toda coleção do IndexedDB aparece no data map', () => {
    const faltando = colecoes.filter((nome) => !(nome in FORA_DO_DATA_MAP) && !DOC.includes(nome))
    expect(
      faltando,
      `estas coleções guardam dado do usuário e não estão em docs/PRIVACIDADE.md:\n${faltando.join('\n')}`,
    ).toEqual([])
  })

  it('toda exceção declarada aponta para uma coleção que existe', () => {
    for (const nome of Object.keys(FORA_DO_DATA_MAP)) {
      expect(colecoes, `${nome} está na lista de exceções mas não existe`).toContain(nome)
    }
  })

  it('o documento diz o que NÃO promete', () => {
    // A frase importa: prometer que dado nunca vaza seria mentira, e o
    // documento existe para ser honesto sobre o limite.
    expect(DOC).toMatch(/não promete|NÃO promete/)
    expect(DOC).toMatch(/um erro isolado não basta/i)
  })

  it('o documento registra o backup cifrado no GitHub', () => {
    // Data map que omite uma cópia dos dados não é data map. Esta cópia nasceu
    // do plano gratuito não ter backup automático.
    expect(DOC).toMatch(/GitHub/)
    expect(DOC).toMatch(/cifrad/i)
    expect(DOC).toMatch(/90 dias/)
  })

  it('o documento afirma que o Stockfish não envia posição', () => {
    expect(DOC).toMatch(/Stockfish.*não.*envia|roda no seu navegador/i)
  })
})
