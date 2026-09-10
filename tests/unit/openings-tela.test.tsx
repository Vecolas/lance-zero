/**
 * Portão da TELA de aberturas — a parte pura: os textos e o desenho da árvore.
 *
 * O que ele cobra, e por quê:
 *
 * 1. AUSÊNCIA DE ESTATÍSTICA NÃO É AUSÊNCIA DE PARTIDAS. É o defeito que o
 *    adapter foi desenhado para evitar e que só a tela ainda podia cometer. O
 *    portão morde dos dois lados: nenhuma frase de indisponibilidade pode
 *    afirmar que a posição não tem partidas, E a frase que legitimamente afirma
 *    isso TEM de casar com o mesmo detector — senão o detector estaria
 *    aprovando tudo por não saber reconhecer nada.
 *
 * 2. OS MOTIVOS PEDEM FRASES DIFERENTES. A varredura sai da FONTE: a união
 *    `MotivoDeIndisponibilidade` é lida do arquivo do adapter, não de uma lista
 *    escrita aqui. Motivo novo lá sem frase aqui reprova, e frase aqui sem
 *    motivo lá também.
 *
 * 3. LACUNA E DESVIO NÃO PODEM SER FUNDIDOS. Título, explicação, ação, tom e
 *    frase: os cinco têm de diferir. Achatá-los é uma mudança de uma linha que
 *    nenhuma revisão de código vê.
 *
 * 4. SEM PARTIDA, NENHUM NÚMERO. A frase do estado vazio não pode conter um
 *    dígito sequer. Um "0 lacunas" com zero partidas afirma que o repertório
 *    cobre tudo — a conclusão oposta à verdade.
 *
 * 5. TRANSPOSIÇÃO NÃO É DESENHADA DUAS VEZES. O domínio guarda um DAG; se a
 *    varredura da tela perder o conjunto de visitados, a subárvore inteira
 *    aparece duplicada e o aluno lê duas linhas onde há uma.
 *
 * O QUE ESTE PORTÃO NÃO PROVA: que a tela RENDERIZA o que ele mede. A ligação
 * entre estes módulos e o navegador é coberta por `repertoire-tela.test.tsx`
 * (React) e por `tests/e2e/aberturas.spec.ts` (navegador de verdade).
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import { construirRepertorio, frequenciaDoRepertorio } from '@/domain/repertoire'
import { INDICE_ECO, REPERTORIOS_INICIAIS, REPERTORIO_BRANCAS } from '@/content/openings'
import { FILTRO_PADRAO, type MotivoDeIndisponibilidade } from '@/lib/openings'
import type { ExplorerFilters, Game } from '@/domain/types'
import { arvoreLegivel, todosOsRamos, type RamoLegivel } from '@/components/openings/arvore-legivel'
import {
  APRESENTACAO_POR_INDISPONIBILIDADE,
  APRESENTACAO_POR_SAIDA,
  caminhoLegivel,
  contagemDePartidas,
  contagemDeVezes,
  descreverFiltro,
  fraseDaSituacao,
  MOTIVOS_PASSAGEIROS,
  numeroDoLance,
  participacaoLegivel,
  podeTentarDeNovo,
  SEM_PARTIDAS_NA_POSICAO,
  situacaoDaFrequencia,
  TIPOS_DE_SAIDA,
  TONS_DA_ABERTURA,
} from '@/components/openings/textos'

// ---------------------------------------------------------------- ajudantes

function pgnDe(sans: readonly string[]): string {
  const chess = new Chess()
  for (const san of sans) {
    chess.move(san)
  }
  return chess.pgn()
}

function partida(
  id: string,
  sans: readonly string[],
  userColor: 'w' | 'b' = 'w',
  pgn?: string,
): Game {
  return {
    id,
    source: 'pgn',
    pgn: pgn ?? pgnDe(sans),
    playedAt: '2026-02-01T12:00:00Z',
    white: 'aluno',
    black: 'adversario',
    userColor,
    result: '*',
    importedAt: '2026-02-02T00:00:00Z',
  }
}

const arvoreBrancas = construirRepertorio(REPERTORIO_BRANCAS, { indiceEco: INDICE_ECO })

/**
 * Os motivos declarados na FONTE do adapter.
 *
 * Lidos do arquivo porque a união não existe em tempo de execução. É o que
 * transforma "o `Record` está completo" (que o `tsc` já garante) em "o `Record`
 * está completo E ninguém escondeu um motivo com `as`".
 */
function motivosDeclarados(): string[] {
  const fonte = readFileSync(join(process.cwd(), 'src/lib/openings/explorer.ts'), 'utf8')
  const bloco = /export type MotivoDeIndisponibilidade =([\s\S]*?)\n\n/.exec(fonte)
  if (bloco === null) {
    throw new Error('Não achei a união MotivoDeIndisponibilidade em src/lib/openings/explorer.ts')
  }
  return [...bloco[1].matchAll(/'([^']+)'/g)].map((achado) => achado[1])
}

/** Toda lista desenhada: a de cima e a de cada ponto de escolha. */
function todasAsListas(ramos: readonly RamoLegivel[]): RamoLegivel[][] {
  const listas: RamoLegivel[][] = [[...ramos]]
  for (const ramo of ramos) {
    if (ramo.filhos.length > 0) {
      listas.push(...todasAsListas(ramo.filhos))
    }
  }
  return listas
}

/**
 * O detector da afirmação proibida.
 *
 * Ele existe porque a frase errada é PLAUSÍVEL: "esta posição não tem partidas"
 * é o que qualquer pessoa escreveria ao ver `estatisticas === null`. O teste que
 * usa este detector também prova que ele MORDE (ver `SEM_PARTIDAS_NA_POSICAO`).
 */
const AFIRMA_AUSENCIA_DE_PARTIDAS =
  /(n[ãa]o t[eê]m partidas|sem partidas|nenhuma partida|n[ãa]o h[áa] partidas|zero partidas)/i

// ---------------------------------------------------------- indisponibilidade

describe('motivos de indisponibilidade do explorer', () => {
  const motivos = motivosDeclarados()

  it('a varredura encontrou motivos para checar', () => {
    // Portão com zero verificações tem de reprovar.
    expect(motivos.length).toBeGreaterThan(3)
  })

  it('a fonte e a tela declaram exatamente os mesmos motivos', () => {
    expect(new Set(motivos)).toEqual(new Set(Object.keys(APRESENTACAO_POR_INDISPONIBILIDADE)))
  })

  it('todo motivo tem rótulo, frase, ícone e tom conhecido', () => {
    for (const motivo of motivos as MotivoDeIndisponibilidade[]) {
      const apresentacao = APRESENTACAO_POR_INDISPONIBILIDADE[motivo]
      expect(apresentacao.rotulo.trim().length, motivo).toBeGreaterThan(0)
      expect(apresentacao.frase.trim().length, motivo).toBeGreaterThan(0)
      expect(apresentacao.icone.trim().length, motivo).toBeGreaterThan(0)
      expect(TONS_DA_ABERTURA, motivo).toContain(apresentacao.tom)
    }
  })

  it('cada motivo tem frase PRÓPRIA: nenhuma se repete', () => {
    const frases = Object.values(APRESENTACAO_POR_INDISPONIBILIDADE).map((a) => a.frase)
    expect(new Set(frases).size).toBe(frases.length)
    const rotulos = Object.values(APRESENTACAO_POR_INDISPONIBILIDADE).map((a) => a.rotulo)
    expect(new Set(rotulos).size).toBe(rotulos.length)
  })

  it('NENHUMA frase apresenta a falta de estatística como falta de partidas', () => {
    for (const [motivo, apresentacao] of Object.entries(APRESENTACAO_POR_INDISPONIBILIDADE)) {
      expect(`${apresentacao.rotulo} ${apresentacao.frase}`, motivo).not.toMatch(
        AFIRMA_AUSENCIA_DE_PARTIDAS,
      )
    }
  })

  it('o detector da afirmação proibida realmente morde', () => {
    // Sem isto, o teste acima aprovaria qualquer coisa: um detector que não
    // reconhece nada nunca acusa nada. A frase LEGÍTIMA — a que só é alcançável
    // quando o serviço respondeu — é o canário.
    expect(SEM_PARTIDAS_NA_POSICAO).toMatch(AFIRMA_AUSENCIA_DE_PARTIDAS)
  })

  it('insistir só é oferecido onde insistir pode resolver', () => {
    // A regra, não a lista: existem os dois comportamentos, e o motivo MEDIDO
    // na issue #71 está do lado que não convida a repetir.
    expect(MOTIVOS_PASSAGEIROS.length).toBeGreaterThan(0)
    expect(MOTIVOS_PASSAGEIROS.length).toBeLessThan(motivos.length)
    expect(podeTentarDeNovo('sem-autorizacao')).toBe(false)
    expect(podeTentarDeNovo('timeout')).toBe(true)
    for (const motivo of motivos as MotivoDeIndisponibilidade[]) {
      expect(podeTentarDeNovo(motivo), motivo).toBe(MOTIVOS_PASSAGEIROS.includes(motivo))
    }
  })
})

// -------------------------------------------------------------- lacuna/desvio

describe('lacuna e desvio são coisas diferentes', () => {
  it('a apresentação cobre exatamente os dois tipos', () => {
    expect(new Set(Object.keys(APRESENTACAO_POR_SAIDA))).toEqual(new Set(TIPOS_DE_SAIDA))
  })

  it('título, explicação, ação, tom e frase diferem entre os dois', () => {
    const lacuna = APRESENTACAO_POR_SAIDA.lacuna
    const desvio = APRESENTACAO_POR_SAIDA.desvio
    expect(lacuna.titulo).not.toBe(desvio.titulo)
    expect(lacuna.explicacao).not.toBe(desvio.explicacao)
    expect(lacuna.acao).not.toBe(desvio.acao)
    expect(lacuna.tom).not.toBe(desvio.tom)
    expect(lacuna.frase(3)).not.toBe(desvio.frase(3))
    expect(lacuna.icone).not.toBe(desvio.icone)
    expect(lacuna.vazio).not.toBe(desvio.vazio)
  })

  it('a lacuna diz quantas vezes o aluno ENFRENTOU aquilo', () => {
    // O texto do enunciado da entrega, cobrado literalmente.
    expect(APRESENTACAO_POR_SAIDA.lacuna.frase(4)).toContain('Você enfrentou isto 4 vezes')
    expect(APRESENTACAO_POR_SAIDA.lacuna.frase(4)).toContain('repertório não cobre')
  })

  it('o desvio diz que quem saiu do livro foi o aluno', () => {
    expect(APRESENTACAO_POR_SAIDA.desvio.frase(2)).toContain('Você saiu do próprio repertório')
  })

  it('as duas contagens respeitam o singular', () => {
    expect(contagemDeVezes(1)).toBe('1 vez')
    expect(contagemDeVezes(2)).toBe('2 vezes')
    expect(contagemDePartidas(1)).toBe('1 partida')
    expect(contagemDePartidas(5)).toBe('5 partidas')
  })
})

// ------------------------------------------------------ situação da frequência

describe('situação das partidas importadas', () => {
  it('sem partida nenhuma, a frase não tem NÚMERO nenhum', () => {
    const frequencia = frequenciaDoRepertorio(arvoreBrancas, [])
    const situacao = situacaoDaFrequencia(frequencia)
    expect(situacao.tipo).toBe('sem-partidas')
    expect(fraseDaSituacao(situacao, 'w')).not.toMatch(/\d/)
  })

  it('partidas só do outro lado não viram "nenhuma partida"', () => {
    const frequencia = frequenciaDoRepertorio(arvoreBrancas, [
      partida('p1', ['e4', 'e5'], 'b'),
      partida('p2', ['e4', 'c5'], 'b'),
    ])
    const situacao = situacaoDaFrequencia(frequencia)
    expect(situacao).toEqual({ tipo: 'so-do-outro-lado', recebidas: 2 })
    const frase = fraseDaSituacao(situacao, 'w')
    expect(frase).toContain('2 partidas')
    expect(frase).toContain('de brancas')
  })

  it('PGN ilegível tem situação PRÓPRIA e não some no denominador', () => {
    const frequencia = frequenciaDoRepertorio(arvoreBrancas, [
      partida('quebrada', [], 'w', '1. Zz9 lixo'),
    ])
    const situacao = situacaoDaFrequencia(frequencia)
    expect(situacao).toEqual({ tipo: 'nada-legivel', ilegiveis: 1 })
    expect(fraseDaSituacao(situacao, 'w')).toContain('Não consegui ler')
  })

  it('com partidas lidas, a frase carrega quantas entraram e quantas ficaram no livro', () => {
    const frequencia = frequenciaDoRepertorio(arvoreBrancas, [
      partida('a', ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'Nf6', 'O-O']),
      partida('b', ['e4', 'c5', 'Nf3']),
    ])
    const situacao = situacaoDaFrequencia(frequencia)
    expect(situacao).toMatchObject({ tipo: 'com-partidas', consideradas: 2, noLivro: 1 })
    const frase = fraseDaSituacao(situacao, 'w')
    expect(frase).toContain('2 partidas')
    expect(frase).toContain('1 ficou inteira')
  })
})

// ------------------------------------------------------------------ notação

describe('notação legível', () => {
  it('a paridade do nível decide se o lance é das brancas ou das pretas', () => {
    expect(numeroDoLance(0)).toBe('1.')
    expect(numeroDoLance(1)).toBe('1...')
    expect(numeroDoLance(2)).toBe('2.')
    expect(numeroDoLance(9)).toBe('5...')
  })

  it('o caminho vazio é dito com todas as letras', () => {
    expect(caminhoLegivel([])).toBe('a posição inicial')
  })

  it('o caminho sai numerado como numa partida', () => {
    expect(caminhoLegivel(['e4', 'e5', 'Nf3'])).toBe('1. e4 e5 2. Nf3')
  })
})

describe('participação sem falsa precisão', () => {
  it('amostra pequena vira frase, nunca porcentagem', () => {
    const texto = participacaoLegivel(null, 7)
    expect(texto).toContain('Amostra pequena')
    expect(texto).not.toMatch(/%/)
  })

  it('participação conhecida vira porcentagem inteira', () => {
    expect(participacaoLegivel(0.4211, 900)).toBe('42% das partidas')
  })
})

describe('descrição do filtro do explorer', () => {
  it('é DERIVADA do filtro que a consulta usa de verdade', () => {
    const texto = descreverFiltro(FILTRO_PADRAO)
    if (FILTRO_PADRAO.base !== 'lichess') {
      throw new Error('O filtro padrão deixou de ser da base lichess: reescreva este portão.')
    }
    for (const rating of FILTRO_PADRAO.ratings) {
      expect(texto, `faixa ${rating}`).toMatch(new RegExp(`\\b${rating}\\b`))
    }
    expect(texto).toContain('blitz')
  })

  it('muda quando o filtro muda — não é uma frase congelada ao lado dele', () => {
    const outro: ExplorerFilters = { base: 'masters', maxLances: 5 }
    expect(descreverFiltro(outro)).not.toBe(descreverFiltro(FILTRO_PADRAO))
    expect(descreverFiltro(outro)).toContain('grandes mestres')
  })
})

// ------------------------------------------------------------ árvore legível

describe('a árvore desenhável', () => {
  const desenhos = REPERTORIOS_INICIAIS.map((definicao) =>
    arvoreLegivel(construirRepertorio(definicao, { indiceEco: INDICE_ECO })),
  )

  it('a varredura encontrou repertórios e ramos para checar', () => {
    expect(desenhos.length).toBeGreaterThan(1)
    for (const desenho of desenhos) {
      expect(todosOsRamos(desenho).length).toBeGreaterThan(4)
    }
  })

  it('TODO ramo desenhado carrega uma ideia escrita', () => {
    // É a promessa do produto virada portão: repertório sem ideia é
    // memorização, que a issue #10 proíbe explicitamente para este público.
    for (const desenho of desenhos) {
      for (const ramo of todosOsRamos(desenho)) {
        expect(ramo.ideia.trim().length, `${ramo.san} sem ideia`).toBeGreaterThan(0)
      }
    }
  })

  it('nenhuma posição é desenhada duas vezes', () => {
    for (const desenho of desenhos) {
      const primeirasVisitas = todosOsRamos(desenho)
        .filter((ramo) => ramo.transposicaoDe === null)
        .map((ramo) => ramo.destino)
      expect(new Set(primeirasVisitas).size).toBe(primeirasVisitas.length)
    }
  })

  it('a transposição do conteúdo real aparece MARCADA, e não repetida', () => {
    // Se este teste ficar sem caso, a asserção acima passa a não provar nada:
    // um desenho sem transposição nenhuma nunca duplicaria posição.
    const marcados = desenhos.flatMap((desenho) =>
      todosOsRamos(desenho).filter((ramo) => ramo.transposicaoDe !== null),
    )
    expect(marcados.length).toBeGreaterThan(0)
    for (const ramo of marcados) {
      expect(ramo.transposicaoDe?.length ?? 0).toBeGreaterThan(0)
      expect(ramo.filhos).toEqual([])
    }
  })

  it('degrau significa ESCOLHA, não profundidade', () => {
    /**
     * A propriedade observável: uma lista que contém níveis consecutivos é uma
     * corrente de lance único achatada (`1.e4 e5 2.Nf3` no MESMO degrau), e uma
     * lista cujas entradas dividem o mesmo nível é um ponto de escolha. As duas
     * têm de existir. Só a primeira provaria que nada indenta; só a segunda,
     * que tudo indenta — e cada uma sozinha passaria com o desenho errado.
     */
    for (const desenho of desenhos) {
      const listas = todasAsListas(desenho)
      expect(listas.length).toBeGreaterThan(1)

      let comIrmaoDoMesmoNivel = 0
      let semIrmaoDoMesmoNivel = 0

      for (const lista of listas) {
        for (const ramo of lista) {
          const temIrmao = lista.some((outro) => outro !== ramo && outro.nivel === ramo.nivel)
          if (temIrmao) {
            comIrmaoDoMesmoNivel += 1
          } else {
            semIrmaoDoMesmoNivel += 1
            expect(
              ramo.filhos,
              `${ramo.san} indentou a continuação sem ter havido escolha nenhuma`,
            ).toEqual([])
          }
        }
      }

      // Os dois casos existem: só o primeiro provaria que tudo indenta, só o
      // segundo que nada indenta, e cada um sozinho passa com o desenho errado.
      expect(comIrmaoDoMesmoNivel, 'nenhum ponto de escolha no desenho').toBeGreaterThan(0)
      expect(semIrmaoDoMesmoNivel, 'nenhuma corrente achatada no desenho').toBeGreaterThan(0)
    }
  })

  it('a raiz de um repertório de brancas não indenta o primeiro lance', () => {
    // Caso concreto, derivado da FONTE: quando a raiz tem um ramo só, o
    // primeiro lance sai no topo e sem filhos aninhados.
    const comRaizUnica = REPERTORIOS_INICIAIS.map((definicao) =>
      construirRepertorio(definicao, { indiceEco: INDICE_ECO }),
    ).filter((arvore) => (arvore.nos.get(arvore.raiz)?.ramos.length ?? 0) === 1)

    expect(comRaizUnica.length, 'nenhum repertório com raiz de lance único').toBeGreaterThan(0)
    for (const arvore of comRaizUnica) {
      const desenho = arvoreLegivel(arvore)
      expect(desenho[0].nivel).toBe(0)
      expect(desenho[0].filhos).toEqual([])
      expect(desenho[1].nivel).toBe(1)
    }
  })

  it('o nível cresce um meio-lance por vez ao longo da corrente', () => {
    const primeiro = desenhos[0]
    expect(primeiro[0].nivel).toBe(0)
    expect(primeiro[1].nivel).toBe(1)
    expect(primeiro[0].doUsuario).not.toBe(primeiro[1].doUsuario)
  })

  it('o nome da abertura só aparece quando MUDA', () => {
    const todos = desenhos.flatMap(todosOsRamos)
    const comNome = todos.filter((ramo) => ramo.aberturaNova !== null)
    expect(comNome.length, 'nenhuma abertura reconhecida: o índice ECO não chegou').toBeGreaterThan(
      0,
    )
    expect(comNome.length, 'toda posição repetiu o nome da anterior').toBeLessThan(todos.length)
  })
})

// ---------------------------------------------------------------------- CSS

describe('status nunca depende só de cor', () => {
  it('todo tom tem classe nas folhas de estilo da tela', () => {
    // Tom novo sem classe apareceria SEM COR nenhuma: o ícone e o texto
    // continuariam lá, e a revisão de código não veria a diferença.
    const folhas = [
      'src/components/openings/RepertorioCard.module.css',
      'src/components/openings/ExplorerPanel.module.css',
    ]
    for (const folha of folhas) {
      const css = readFileSync(join(process.cwd(), folha), 'utf8')
      for (const tom of TONS_DA_ABERTURA) {
        expect(css, `falta a classe .${tom} em ${folha}`).toContain(`.${tom} {`)
      }
    }
  })
})
