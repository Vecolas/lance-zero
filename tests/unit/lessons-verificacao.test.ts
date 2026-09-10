/**
 * Portão de `verificarLicao` — o lado que MORDE PARA DENTRO.
 *
 * POR QUE ESTE ARQUIVO EXISTE, pelo mesmo motivo de
 * `exercicios-verificacao.test.ts`: o portão do catálogo varre as lições REAIS
 * e exige lista de falhas vazia. Isso prova que o conteúdo escrito está certo,
 * e não prova nada sobre o VERIFICADOR. Uma `verificarLicao` que deixasse de
 * conferir a etapa de recuperação continuaria devolvendo `[]` para todo o
 * catálogo, e o CI continuaria verde enquanto uma lição nova entrasse com a
 * chave de correção errada.
 *
 * Descoberto por mutação ao mover o esquema para `@/domain/lessons` (issue
 * #74): apagar a conferência da recuperação não reprovava nenhum portão. Este
 * arquivo é o conserto, e NÃO muda comportamento nenhum — só afirma o que a
 * função já fazia.
 *
 * A lição aqui é sintética e serve só de andaime: o que está sob teste é o
 * verificador, não o conteúdo. Sobre os peões da posição, ver o cabeçalho de
 * `exercicios-verificacao.test.ts`.
 */

import { describe, expect, it } from 'vitest'
import { PIECE_VALUES } from '@/domain/games/board'
import type { ObjetivoGanhaMaterial } from '@/domain/exercicios'
import { definirLicao, verificarLicao, type EntradaDeLicao } from '@/domain/lessons'
import { SKILL_IDS } from '@/domain/types'

/** Bispo em e4 ataca a dama preta indefesa em d5. Brancas jogam. */
const DAMA_PENDURADA = '4k3/pp6/8/3q4/4B3/8/PP6/4K3 w - - 0 1'
const COME_A_DAMA = 'e4d5'
const ANDA_O_REI = 'e1e2'

/** Piso DERIVADO da tabela de valores, para não cravar um número que envelhece. */
const GANHA_A_DAMA: ObjetivoGanhaMaterial = {
  tipo: 'ganha-material',
  saldoMinimo: PIECE_VALUES.q,
}

function licao(campos: Partial<EntradaDeLicao> = {}) {
  return definirLicao({
    id: 'sintetica',
    titulo: 'Peça sem defesa',
    habilidade: SKILL_IDS[0],
    conceito: 'Antes de qualquer coisa, procure a peça que ninguém está defendendo.',
    exemploResolvido: {
      fen: DAMA_PENDURADA,
      ladoDoAluno: 'w',
      objetivo: GANHA_A_DAMA,
      linhaModelo: [COME_A_DAMA, 'a7a6'],
      comentario: 'A dama está sem defesa: o bispo a captura de graça.',
    },
    recuperacao: [
      {
        id: 'sintetica-1',
        fen: DAMA_PENDURADA,
        ladoDoAluno: 'w',
        objetivo: GANHA_A_DAMA,
        lancesAceitos: [COME_A_DAMA],
        alternativas: [ANDA_O_REI],
        enunciado: 'Brancas jogam. Qual é o lance?',
        explicacao: 'A dama preta não tinha defensor.',
      },
    ],
    ...campos,
  })
}

function problemas(entrada: Partial<EntradaDeLicao> = {}): string {
  return verificarLicao(licao(entrada))
    .map((falha) => `${falha.itemId}: ${falha.problema}`)
    .join(' | ')
}

describe('verificação de lição', () => {
  it('lição correta não gera falha nenhuma', () => {
    expect(verificarLicao(licao())).toEqual([])
  })

  it('acusa exemplo resolvido cujo primeiro lance não cumpre o objetivo', () => {
    const texto = problemas({
      exemploResolvido: { ...licao().exemploResolvido, linhaModelo: [ANDA_O_REI] },
    })
    expect(texto).toContain('o exemplo resolvido não cumpre o objetivo')
    expect(texto).toContain('sintetica/exemplo')
  })

  it('acusa linha modelo com lance ilegal no meio', () => {
    // Depois de Bxd5 é a vez das pretas: `e4e5` não existe ali.
    expect(
      problemas({
        exemploResolvido: { ...licao().exemploResolvido, linhaModelo: [COME_A_DAMA, 'e4e5'] },
      }),
    ).toContain('é ilegal em')
  })

  it('acusa exercício de recuperação com a chave de correção errada', () => {
    const [exercicio] = licao().recuperacao
    expect(problemas({ recuperacao: [{ ...exercicio, lancesAceitos: [ANDA_O_REI] }] })).toContain(
      'lance aceito não cumpre o objetivo',
    )
  })

  it('a falha da recuperação vem com o id do exercício, não com o da lição', () => {
    const [exercicio] = licao().recuperacao
    expect(problemas({ recuperacao: [{ ...exercicio, lancesAceitos: [ANDA_O_REI] }] })).toContain(
      'sintetica-1:',
    )
  })

  it('lição sem recuperação não chega a existir', () => {
    // A trava é de FORMA: o tipo já recusa a lista vazia, e `definirLicao`
    // recusa em tempo de execução o que um `as` conseguisse furar.
    expect(() => licao({ recuperacao: [] as unknown as EntradaDeLicao['recuperacao'] })).toThrow(
      /não termina em recuperação ativa/,
    )
  })

  it('lição com dois exercícios de mesmo id não chega a existir', () => {
    const [exercicio] = licao().recuperacao
    expect(() => licao({ recuperacao: [exercicio, exercicio] })).toThrow(/repete o id/)
  })
})
