/**
 * Portão da EDIÇÃO do repertório pelo aluno.
 *
 * O QUE ESTE ARQUIVO PROTEGE, e é a coisa cara de reverter: o agendamento FSRS
 * de quem já usa o app. O id de um card de repertório é
 * `repertorio:{repertório}:{identidade da posição}` — DERIVADO. Se editar uma
 * ideia mexesse em qualquer identidade, todo card daquele trecho viraria órfão e
 * o progresso do aluno sumiria em silêncio: nenhum erro, nenhum log, só uma fila
 * de revisão que um dia amanheceu vazia e outra cheia de cards novos em folha.
 * Por isso o portão central aqui não é "a ideia mudou" — é "NADA MAIS mudou".
 *
 * O QUE ELE VARRE: a FONTE. Os ids de card saem de `cardsDeRepertorio` sobre a
 * árvore inteira, não de uma lista escrita à mão — uma lista à mão continuaria
 * verde no dia em que um nó novo aparecesse sem card.
 *
 * O QUE ELE NÃO PROVA: que a gravação acontece (é
 * `repertoire-persistencia.test.ts`), que a tela chama isto (é
 * `repertoire-tela.test.tsx`) e que o texto editado sobrevive ao backup (é
 * `storage-backup.test.ts`).
 */

import { describe, expect, it } from 'vitest'
import { REPERTORIO_BRANCAS, REPERTORIO_PRETAS } from '@/content/openings'
import {
  cardsDeRepertorio,
  construirRepertorio,
  editarIdeiaDoRepertorio,
  primeiraOcorrenciaDoLance,
  type AlvoDaIdeia,
} from '@/domain/repertoire'
import { START_FEN } from '@/lib/chess'
import { identidadeDePosicao } from '@/lib/openings'
import type { DefinicaoDeRepertorio } from '@/domain/types'

const AGORA = new Date('2026-05-04T08:00:00.000Z')
const RAIZ = identidadeDePosicao(START_FEN)
const IDEIA_NOVA = 'A minha razão para este lance, escrita por mim.'

/** O primeiro lance do repertório de brancas, endereçado pelo par. */
const PRIMEIRO: AlvoDaIdeia = { origem: RAIZ, san: REPERTORIO_BRANCAS.linhas[0].lances[0].san }

/**
 * Uma cópia CONGELADA do conteúdo, feita no carregamento do módulo.
 *
 * Duas coisas de uma vez, e as duas nasceram de um portão frouxo que passou:
 *
 * 1. CADA CASO RECEBE A SUA. Testar contra a constante importada faz um caso
 *    contaminar o seguinte se a função sob teste mutar a entrada — e foi
 *    exatamente assim que a mutação "mutar a definição original" PASSOU: o caso
 *    de pureza lia um valor que o caso anterior já tinha estragado, e comparava
 *    estragado com estragado.
 * 2. MUTAR A ENTRADA VIRA ERRO ALTO. Módulo ES roda em modo estrito, então
 *    escrever num objeto congelado LANÇA. Uma função que mutasse a entrada não
 *    passaria calada por nenhum caso deste arquivo, e não só pelo de pureza.
 */
function congelar<T>(valor: T): T {
  if (valor !== null && typeof valor === 'object') {
    for (const filho of Object.values(valor as Record<string, unknown>)) {
      congelar(filho)
    }
    Object.freeze(valor)
  }
  return valor
}

const BRANCAS_ORIGINAL = congelar(structuredClone(REPERTORIO_BRANCAS))
const PRETAS_ORIGINAL = congelar(structuredClone(REPERTORIO_PRETAS))

/** Uma cópia congelada e independente do repertório de brancas. */
function brancas(): DefinicaoDeRepertorio {
  return congelar(structuredClone(BRANCAS_ORIGINAL))
}

/** Idem, para o de pretas. */
function pretas(): DefinicaoDeRepertorio {
  return congelar(structuredClone(PRETAS_ORIGINAL))
}

function ideiaDe(definicao: DefinicaoDeRepertorio, alvo: AlvoDaIdeia): string | undefined {
  const onde = primeiraOcorrenciaDoLance(definicao, alvo)
  if (onde === null) {
    return undefined
  }
  return definicao.linhas[onde.linha].lances[onde.lance].ideia
}

function idsDeCard(definicao: DefinicaoDeRepertorio): string[] {
  const arvore = construirRepertorio(definicao)
  return cardsDeRepertorio(arvore, AGORA)
    .map((card) => card.id)
    .sort()
}

function editar(definicao: DefinicaoDeRepertorio, alvo: AlvoDaIdeia, texto: string) {
  const resultado = editarIdeiaDoRepertorio(definicao, alvo, texto)
  if (!resultado.ok) {
    throw new Error(`a edição devia ter passado e recusou: ${resultado.mensagem}`)
  }
  return resultado.definicao
}

describe('editar a ideia troca o texto e mais nada', () => {
  it('a ideia nova entra no lugar da de fabrica', () => {
    const antes = ideiaDe(BRANCAS_ORIGINAL, PRIMEIRO)
    expect(antes, 'o conteúdo perdeu a ideia do primeiro lance').toBeTruthy()

    const depois = editar(brancas(), PRIMEIRO, IDEIA_NOVA)
    expect(ideiaDe(depois, PRIMEIRO)).toBe(IDEIA_NOVA)
    expect(ideiaDe(depois, PRIMEIRO)).not.toBe(antes)
  })

  it('a definicao ORIGINAL nao e tocada', () => {
    // A comparação é entre um retrato tirado ANTES desta chamada e o objeto
    // depois dela — não entre o conteúdo e uma expectativa escrita à mão. Assim
    // ela mede o que interessa (esta chamada não muta) mesmo que outro caso já
    // tivesse estragado a entrada, que foi como a versão anterior deste portão
    // deixou passar uma função que mutava.
    const entrada = structuredClone(BRANCAS_ORIGINAL) as DefinicaoDeRepertorio
    const retrato = structuredClone(entrada)
    editar(entrada, PRIMEIRO, 'um texto que não pode vazar para a semente')
    expect(entrada).toEqual(retrato)

    // E a semente continua sendo a semente para quem ainda não editou.
    expect(ideiaDe(REPERTORIO_BRANCAS, PRIMEIRO)).toBe(ideiaDe(BRANCAS_ORIGINAL, PRIMEIRO))
  })

  it('a arvore editada continua sem conflito', () => {
    const depois = editar(brancas(), PRIMEIRO, IDEIA_NOVA)
    expect(construirRepertorio(depois).conflitos).toEqual([])
  })

  it('o texto e gravado com as pontas aparadas', () => {
    const depois = editar(brancas(), PRIMEIRO, `   ${IDEIA_NOVA}\n\n`)
    expect(ideiaDe(depois, PRIMEIRO)).toBe(IDEIA_NOVA)
  })
})

describe('migracao: o id do card e derivado e nao pode se mexer', () => {
  it('a varredura encontrou cards para comparar', () => {
    // Lista vazia é aprovação de graça: sem isto, um dia em que
    // `cardsDeRepertorio` devolvesse nada os testes abaixo passariam sem olhar.
    expect(idsDeCard(brancas()).length).toBeGreaterThan(3)
  })

  it('editar a ideia deixa TODOS os ids de card intactos', () => {
    const antes = idsDeCard(brancas())
    const depois = idsDeCard(editar(brancas(), PRIMEIRO, IDEIA_NOVA))
    expect(depois).toEqual(antes)
  })

  it('editar a ideia deixa as SOLUCOES intactas', () => {
    // Id igual com solução diferente seria pior que órfão: o card continuaria na
    // fila e passaria a cobrar outro lance, sem nada acusar.
    const solucoes = (definicao: DefinicaoDeRepertorio) =>
      cardsDeRepertorio(construirRepertorio(definicao), AGORA)
        .map((card) => `${card.id}=>${card.solutionUci.join(',')}`)
        .sort()

    expect(solucoes(editar(brancas(), PRIMEIRO, IDEIA_NOVA))).toEqual(solucoes(brancas()))
  })

  it('o id do card carrega o id do repertorio, que a edicao nao muda', () => {
    const depois = editar(brancas(), PRIMEIRO, IDEIA_NOVA)
    expect(depois.id).toBe(REPERTORIO_BRANCAS.id)
    for (const id of idsDeCard(depois)) {
      expect(id.startsWith(`repertorio:${REPERTORIO_BRANCAS.id}:`)).toBe(true)
    }
  })
})

describe('a ideia e endereçada pelo par posicao + lance', () => {
  it('encontra a PRIMEIRA declaracao, que e onde a ideia mora', () => {
    // `italiana-dois-cavalos` repete 1.e4 sem ideia (DECISÃO 2 de arvore.ts).
    // Editar tem de cair na primeira linha, e não na repetição — que é proibida
    // de carregar texto.
    const onde = primeiraOcorrenciaDoLance(brancas(), PRIMEIRO)
    expect(onde).toEqual({ linha: 0, lance: 0 })
  })

  it('a repeticao continua SEM ideia depois da edicao', () => {
    const depois = editar(brancas(), PRIMEIRO, IDEIA_NOVA)
    const repetida = depois.linhas[1].lances[0]
    expect(repetida.san).toBe(PRIMEIRO.san)
    expect(repetida.ideia).toBeUndefined()
  })

  it('lance que nao existe naquela posicao e recusado com motivo', () => {
    const resultado = editarIdeiaDoRepertorio(brancas(), { origem: RAIZ, san: 'Na3' }, IDEIA_NOVA)
    expect(resultado).toMatchObject({ ok: false, motivo: 'lance-nao-encontrado' })
  })

  it('lance certo na posicao ERRADA e recusado', () => {
    // O par é o endereço inteiro: só o SAN bater não basta, senão editar "Nf3"
    // acertaria a primeira ocorrência de `Nf3` em qualquer lugar da árvore.
    const outraPosicao = identidadeDePosicao(
      'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    )
    const resultado = editarIdeiaDoRepertorio(
      brancas(),
      { origem: outraPosicao, san: PRIMEIRO.san },
      IDEIA_NOVA,
    )
    expect(resultado).toMatchObject({ ok: false, motivo: 'lance-nao-encontrado' })
  })

  it('ideia em branco e recusada, e espaco em branco tambem', () => {
    // Lance sem ideia é memorização — o que o repertório recusa a ser. Um texto
    // só de espaço passaria por "escrito" no armazenamento e reprovaria depois
    // no portão do conteúdo, longe de onde o aluno digitou.
    for (const texto of ['', '   ', '\n\t ']) {
      expect(editarIdeiaDoRepertorio(brancas(), PRIMEIRO, texto)).toMatchObject({
        ok: false,
        motivo: 'ideia-vazia',
      })
    }
  })
})

describe('vale para os dois repertorios de fabrica, nao so para o primeiro', () => {
  it('o de pretas tambem edita sem mexer em id de card', () => {
    const alvo: AlvoDaIdeia = {
      origem: RAIZ,
      san: REPERTORIO_PRETAS.linhas[0].lances[0].san,
    }
    const antes = idsDeCard(pretas())
    const depois = editar(pretas(), alvo, IDEIA_NOVA)
    expect(idsDeCard(depois)).toEqual(antes)
    expect(ideiaDe(depois, alvo)).toBe(IDEIA_NOVA)
  })
})
