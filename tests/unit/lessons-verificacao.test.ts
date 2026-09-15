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

/**
 * A MESMA posição com a dama DEFENDIDA pelo peão de c6.
 *
 * É o andaime do contraste: `COME_A_DAMA` continua legal aqui e deixa de
 * ganhar, que é exatamente o que o portão do contraste tem de exigir.
 */
const DAMA_DEFENDIDA = '4k3/pp6/2p5/3q4/4B3/8/PP6/4K3 w - - 0 1'

function licao(campos: Partial<EntradaDeLicao> = {}) {
  return definirLicao({
    id: 'sintetica',
    titulo: 'Peça sem defesa',
    habilidade: SKILL_IDS[0],
    versao: 1,
    objetivo: 'Reconhecer a peça sem defensor antes de procurar qualquer outra coisa.',
    conceito: 'Antes de qualquer coisa, procure a peça que ninguém está defendendo.',
    processoMental: ['Quem eu alcanço?', 'Quem defende?', 'Se ninguém defende, é de graça.'],
    exemploResolvido: {
      fen: DAMA_PENDURADA,
      ladoDoAluno: 'w',
      objetivo: GANHA_A_DAMA,
      linhaModelo: [COME_A_DAMA, 'a7a6'],
      raciocinio: ['O bispo alcança d5.', 'Nada defende d5.'],
      comentario: 'A dama está sem defesa: o bispo a captura de graça.',
    },
    contraste: {
      fen: DAMA_DEFENDIDA,
      ladoDoAluno: 'w',
      objetivo: GANHA_A_DAMA,
      lanceQueFalha: COME_A_DAMA,
      oQueMudou: 'Agora o peão de c6 defende d5, e a captura devolve a dama por um bispo.',
    },
    completion: {
      id: 'sintetica-c',
      fen: DAMA_PENDURADA,
      ladoDoAluno: 'w',
      objetivo: GANHA_A_DAMA,
      lancesAceitos: [COME_A_DAMA],
      alternativas: [ANDA_O_REI],
      raciocinioJaFeito: ['O bispo de e4 alcança d5.', 'Nenhuma peça preta defende d5.'],
      enunciado: 'Qual é o lance?',
      explicacao: 'A captura não devolve nada.',
    },
    guiada: [
      {
        id: 'sintetica-g',
        fen: DAMA_PENDURADA,
        ladoDoAluno: 'w',
        objetivo: GANHA_A_DAMA,
        lancesAceitos: [COME_A_DAMA],
        alternativas: [ANDA_O_REI],
        enunciado: 'Brancas jogam. Procure material de graça.',
        dicas: [{ degrau: 'direcao', texto: 'Comece pelas capturas disponíveis.' }],
        explicacao: 'A dama preta não tinha defensor.',
      },
    ],
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
    resumo: ['Antes de jogar: alguma peça dele está sem defensor?'],
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

  it('id repetido ATRAVÉS das etapas também é recusado', () => {
    // O progresso da atividade guarda `completedItemIds` numa lista só: um id
    // repetido entre a guiada e a recuperação faria um marcar o outro como
    // feito, e a atividade terminaria sem o aluno ter visto um dos dois.
    const [guiado] = licao().guiada
    expect(() => licao({ guiada: [{ ...guiado, id: 'sintetica-1' }] })).toThrow(/repete o id/)
  })

  it('lição sem prática guiada não chega a existir', () => {
    // A guiada é o degrau entre ver a solução e resolver sem apoio. Sem ela a
    // lição volta a ter o salto que produziu a dívida pedagógica.
    expect(() => licao({ guiada: [] as unknown as EntradaDeLicao['guiada'] })).toThrow(
      /prática guiada/,
    )
  })

  it('lição sem processo mental não chega a existir', () => {
    expect(() =>
      licao({ processoMental: [] as unknown as EntradaDeLicao['processoMental'] }),
    ).toThrow(/pergunta reutilizável/)
  })
})

/**
 * O contraste, e o lado do portão que morde para DENTRO.
 *
 * ESTE É O DEFEITO MAIS DIFÍCIL DE PERCEBER DE TODO O CONTEÚDO. Um contraste
 * em que o lance análogo TAMBÉM ganha não quebra nada: a tela mostra as duas
 * posições lado a lado, afirma que uma é diferente da outra, e o aluno aprende
 * uma distinção que não existe. Nenhum erro aparece em lugar nenhum — e o aluno
 * sai pior do que entrou, tendo passado por uma lição inteira.
 */
describe('verificação do contraste', () => {
  it('acusa contraste em que o lance análogo também cumpre o objetivo', () => {
    const texto = problemas({
      // A posição do EXEMPLO como contraste: ali a captura ganha, então não há
      // contraste nenhum.
      contraste: { ...licao().contraste, fen: DAMA_PENDURADA },
    })
    expect(texto).toContain('TAMBÉM cumpre o objetivo')
    expect(texto).toContain('sintetica/contraste')
  })

  it('acusa contraste com FEN impossível', () => {
    expect(problemas({ contraste: { ...licao().contraste, fen: 'nao-e-um-fen' } })).toContain(
      'FEN inválido',
    )
  })

  it('acusa contraste na vez do lado errado', () => {
    expect(
      problemas({
        contraste: { ...licao().contraste, ladoDoAluno: 'b' },
      }),
    ).toContain('não está na vez de b')
  })

  it('acusa contraste cujo lance análogo é ILEGAL ali', () => {
    // Ilegal também reprova: o aluno veria uma posição com um lance que não
    // existe, apresentado como "o mesmo lance do exemplo".
    const texto = problemas({
      contraste: { ...licao().contraste, lanceQueFalha: 'h1h8' },
    })
    expect(texto).toContain('sintetica/contraste')
  })

  it('contraste correto não gera falha', () => {
    expect(verificarLicao(licao())).toEqual([])
  })
})
