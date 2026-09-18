/**
 * DAS SUAS PARTIDAS: a única parte do curso cujo material vem do tabuleiro real.
 *
 * TODO O RESTO DO REPERTÓRIO É AUTORADO por nós — a linha principal, os ramos, a
 * importância de cada um. Esta seção mede o que o aluno de fato enfrentou, e por
 * isso é a única contagem do módulo de aberturas que pode ser apresentada como
 * "aconteceu N vezes". O campo `frequency` do grafo NÃO pode: ele conta linhas
 * autoradas.
 *
 * O QUE ESTES TESTES GUARDAM, além do agrupamento: a recusa do §38.2 em
 * inventar um ramo porque o adversário jogou algo. Um lance que apareceu uma vez
 * não é teoria, e o app tem de admitir quando não tem resposta pronta.
 */

import { describe, expect, it } from 'vitest'
import { OPENING_COURSES } from '@/content/openings/course'
import { parsePgn } from '@/lib/chess'
import {
  acaoDoDesvio,
  desviosNasSuasPartidas,
  rotaDoDesvio,
} from '@/domain/openings/das-suas-partidas'
import { emptyOpeningProgress } from '@/domain/openings'

const ITALIANA = OPENING_COURSES.find((o) => o.slug === 'italiana')!

/** A abertura inteira já percorrida: é o que torna um desvio "esquecimento". */
const APRENDEU_TUDO = {
  ...emptyOpeningProgress(ITALIANA.id),
  learnedNodeIds: [...ITALIANA.graph.keys()],
}

function partida(movetext: string) {
  return { jogo: parsePgn(`[Event "?"]\n\n${movetext} *`), corDoAluno: 'w' as const }
}

/** A linha principal da Italiana, que o curso ensina: 1.e4 e5 2.Cf3 Cc6 3.Bc4 Bc5 4.d3 Cf6 5.O-O */
const SEGUIU_A_LINHA = '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d3 Nf6 5. O-O'

describe('o agregado das partidas', () => {
  it('partida que seguiu a linha NÃO vira item', () => {
    /*
      Uma lista que incluísse as partidas certas deixaria de responder a pergunta
      que ela existe para responder: "onde eu erro".
    */
    expect(desviosNasSuasPartidas(ITALIANA, [partida(SEGUIU_A_LINHA)], APRENDEU_TUDO)).toEqual([])
  })

  it('o desvio do ALUNO aparece, com o que ele jogou e o que o repertório previa', () => {
    // 3.Cc3 no lugar de 3.Bc4 — sai da linha na terceira decisão das brancas.
    const desvios = desviosNasSuasPartidas(
      ITALIANA,
      [partida('1. e4 e5 2. Nf3 Nc6 3. Nc3')],
      APRENDEU_TUDO,
    )

    expect(desvios).toHaveLength(1)
    const desvio = desvios[0]!
    expect(desvio.autor).toBe('aluno')
    expect(desvio.jogadoSan).toBe('Nc3')
    // O PAR É O PONTO DA TELA: sem o lance esperado, "você saiu do repertório"
    // não ensina nada — o aluno fica sabendo que errou e não o que era certo.
    expect(desvio.esperadoSan).toBe('Bc4')
    expect(desvio.partidas).toBe(1)
  })

  it('duas partidas com o mesmo desvio contam DUAS, e não duas linhas', () => {
    /*
      É a contagem que dá sentido à seção: um ponto que falhou duas vezes vale
      mais atenção que um que falhou uma. Sem a agregação, a tela viraria um
      histórico de partidas em vez de um diagnóstico.
    */
    const desvios = desviosNasSuasPartidas(
      ITALIANA,
      [partida('1. e4 e5 2. Nf3 Nc6 3. Nc3'), partida('1. e4 e5 2. Nf3 Nc6 3. Nc3 Nf6')],
      APRENDEU_TUDO,
    )
    expect(desvios).toHaveLength(1)
    expect(desvios[0]?.partidas).toBe(2)
  })

  it('desvios diferentes no MESMO nó ficam separados', () => {
    // Errar de dois jeitos na mesma posição são dois erros, e um deles pode ser
    // o que se repete. Somá-los esconderia qual.
    const desvios = desviosNasSuasPartidas(
      ITALIANA,
      [partida('1. e4 e5 2. Nf3 Nc6 3. Nc3'), partida('1. e4 e5 2. Nf3 Nc6 3. d4')],
      APRENDEU_TUDO,
    )
    expect(desvios).toHaveLength(2)
    expect(desvios.map((d) => d.jogadoSan).sort()).toEqual(['Nc3', 'd4'])
  })

  it('a lista vem ordenada pelo que mais aconteceu', () => {
    const desvios = desviosNasSuasPartidas(
      ITALIANA,
      [
        partida('1. e4 e5 2. Nf3 Nc6 3. d4'),
        partida('1. e4 e5 2. Nf3 Nc6 3. Nc3'),
        partida('1. e4 e5 2. Nf3 Nc6 3. Nc3'),
      ],
      APRENDEU_TUDO,
    )
    expect(desvios[0]?.jogadoSan).toBe('Nc3')
    expect(desvios[0]?.partidas).toBe(2)
  })

  it('o desvio do ADVERSÁRIO é atribuído a ele, e não ao aluno', () => {
    /*
      A distinção não é cosmética: culpar o aluno por um lance do adversário é o
      defeito que o `reviewOpeningGame` já evitava, e a tela nova não pode
      desfazê-lo. Aqui as pretas jogam 2...d6 no lugar de 2...Cc6.
    */
    const desvios = desviosNasSuasPartidas(ITALIANA, [partida('1. e4 e5 2. Nf3 d6')], APRENDEU_TUDO)
    expect(desvios).toHaveLength(1)
    expect(desvios[0]?.autor).toBe('adversario')
    expect(desvios[0]?.jogadoSan).toBe('d6')
  })

  it('partida que não começa na posição do curso é ignorada', () => {
    const outraAbertura = partida('1. d4 d5 2. c4')
    expect(desviosNasSuasPartidas(ITALIANA, [outraAbertura], APRENDEU_TUDO)).toEqual([])
  })

  it('sem partidas, nenhuma linha — e não uma seção vazia com números zerados', () => {
    expect(desviosNasSuasPartidas(ITALIANA, [], APRENDEU_TUDO)).toEqual([])
  })
})

describe('a ação oferecida', () => {
  const doAluno = {
    nodeId: 'x',
    fen: ITALIANA.rootFen,
    partidas: 1,
    jogadoSan: 'Nc3',
    esperadoSan: 'Bc4',
    autor: 'aluno' as const,
    ramoId: null,
    temRespostaAutorada: false,
    rota: '',
  }

  it('desvio do aluno oferece REAPRENDER', () => {
    expect(acaoDoDesvio(doAluno)).toBe('reaprender')
  })

  it('desvio do adversário COM ramo autorado oferece treinar a resposta', () => {
    expect(acaoDoDesvio({ ...doAluno, autor: 'adversario', temRespostaAutorada: true })).toBe(
      'treinar',
    )
  })

  it('desvio do adversário SEM ramo autorado oferece analisar — e não inventa um ramo', () => {
    /*
      §38.2, e é a recusa mais importante deste módulo. Um lance que apareceu uma
      vez não é teoria. Promovê-lo a conteúdo autorado misturaria o que foi
      revisado com o que foi apenas encontrado — e o curso passaria a ensinar o
      que ninguém escreveu.
    */
    expect(acaoDoDesvio({ ...doAluno, autor: 'adversario', temRespostaAutorada: false })).toBe(
      'analisar',
    )
  })
})

describe('a rota do desvio', () => {
  it('leva ao conteúdo daquele ponto, e nunca à biblioteca genérica', () => {
    const daPrincipal = rotaDoDesvio(ITALIANA, null)
    expect(daPrincipal).toContain('/aberturas/italiana')
    expect(daPrincipal).toContain('etapa=linha-principal')

    const doRamo = rotaDoDesvio(ITALIANA, 'italiana-dois-cavalos')
    expect(doRamo).toContain('etapa=variacoes')
    expect(doRamo).toContain('ramo=italiana-dois-cavalos')
  })

  it('escapa o id do ramo na URL', () => {
    // Um id com caractere especial montaria uma query quebrada, e o deep-link
    // levaria à etapa certa com o ramo errado — ou a ramo nenhum.
    expect(rotaDoDesvio(ITALIANA, 'a b&c')).toContain('ramo=a%20b%26c')
  })
})
