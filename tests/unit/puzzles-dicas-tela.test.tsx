/**
 * Portão do CONTADOR DE DICAS do `PuzzleTrainer` (issue #66).
 *
 * POR QUE ESTE ARQUIVO EXISTE. A tela guardava o nível de dica em estado
 * próprio (`nivelDeDica`) e nunca chamava `useHint`. Duas fontes para a mesma
 * verdade dentro do mesmo componente: o número que o aluno via e o
 * `hintsUsed` que o domínio gravava. Elas divergiam em silêncio — a tela dizia
 * três dicas, o registro dizia zero — e nada disso dava erro, aparecia na tela
 * ou reprovava em teste. O e2e da época confirmava o número da TELA, e por isso
 * passava defendendo o defeito.
 *
 * O QUE ESTE ARQUIVO AFIRMA, e nenhum teste de metade sozinha afirmaria:
 *
 * 1. CRUZAMENTO DAS DUAS METADES: depois de N dicas na tela, a tentativa
 *    GRAVADA no repositório diz `hintsUsed: N`. As duas pontas são conferidas
 *    contra o MESMO N — o número de cliques —, nunca uma contra a outra;
 * 2. o botão desabilita no último nível e DIZ isso em palavras, porque
 *    `disabled` sozinho é estado só por aparência;
 * 3. quem resolveu com dica não é `firstTry` e GERA card de revisão. Esse ramo
 *    do código era inalcançável enquanto `hintsUsed` fosse 0 para sempre;
 * 4. a mensagem de acerto acompanha o registro: com apoio diz apoio;
 * 5. o contador zera no puzzle seguinte por DERIVAÇÃO, sem reset manual;
 * 6. a tela não voltou a declarar estado local de dica (varredura da FONTE).
 *
 * O QUE ESTE ARQUIVO NÃO PROVA: aparência, contraste, foco visível e alvo de
 * toque do botão de dica; nem o comportamento em IndexedDB real — aqui o
 * repositório é o de memória. O e2e `tests/e2e/puzzles.spec.ts` cobre a ponta
 * do navegador, lendo o registro gravado de verdade.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STARTER_PUZZLES_CSV } from '@/content/puzzles/starter'
import { MAX_HINT_LEVEL, parsePuzzleCsv, toSolvable } from '@/domain/puzzles'
import { createDefaultProfile } from '@/domain/profile'
import type { SolvablePuzzle } from '@/domain/types'
import { MemoryTrainingRepository } from '@/lib/storage/memory-repository'

const contexto = vi.hoisted(() => ({ valor: null as unknown }))

vi.mock('@/components/providers/RepositoryProvider', () => ({
  useRepository: () => contexto.valor,
}))

/**
 * O tabuleiro é dependência de terceiros com arraste. O duble EXPÕE a posição
 * e o `onMove`: é o único jeito de chegar ao desfecho de acerto sem simular
 * arrastar peça, e o lance jogado continua saindo da posição que a tela mostra.
 */
const tabuleiro = vi.hoisted(() => ({
  onMove: null as null | ((from: string, to: string, promotion?: string) => boolean),
}))

vi.mock('@/components/chess/ChessBoardView', () => ({
  ChessBoardView: (props: {
    fen: string
    onMove?: (from: string, to: string, promotion?: string) => boolean
  }) => {
    tabuleiro.onMove = props.onMove ?? null
    return <div data-testid="tabuleiro" data-fen={props.fen} />
  },
}))

const { MENSAGEM_DO_DESFECHO, PuzzleTrainer } = await import('@/components/puzzles/PuzzleTrainer')

/** Mesmo conjunto que a tela usa. Serve para descobrir a solução da posição exibida. */
const SOLUVEIS: readonly SolvablePuzzle[] = parsePuzzleCsv(STARTER_PUZZLES_CSV, {
  pularCabecalho: true,
}).puzzles.map((puzzle) => toSolvable(puzzle))

function contextoCom(repo: MemoryTrainingRepository) {
  return {
    status: 'pronto' as const,
    repo,
    profile: createDefaultProfile('teste', new Date('2026-01-01T00:00:00.000Z')),
    erro: null,
    saveProfile: async () => {},
    refresh: () => {},
    revision: 0,
  }
}

async function montar(): Promise<MemoryTrainingRepository> {
  const repo = new MemoryTrainingRepository()
  contexto.valor = contextoCom(repo)
  render(<PuzzleTrainer />)
  await screen.findByText(/Puzzle 1 de \d+/)
  return repo
}

/** O único botão de dica da tela, seja qual for o rótulo do momento. */
function botaoDeDica(): HTMLButtonElement {
  return screen.getByRole('button', { name: /dica/i }) as HTMLButtonElement
}

/** A posição na tela é a fonte: a solução é procurada a partir dela. */
function solucaoDaPosicaoExibida(): readonly string[] {
  const fen = screen.getByTestId('tabuleiro').getAttribute('data-fen')
  const alvo = SOLUVEIS.find((s) => s.startFen === fen)
  if (!alvo) {
    throw new Error(`Nenhum puzzle do conjunto inicial começa em ${fen}: o duble desalinhou.`)
  }
  return alvo.solutionUci
}

/** Joga um lance da solução pelo duble do tabuleiro. */
async function jogar(uci: string): Promise<void> {
  const promocao = uci.length > 4 ? uci.slice(4) : undefined
  await act(async () => {
    tabuleiro.onMove?.(uci.slice(0, 2), uci.slice(2, 4), promocao)
  })
}

/** Resolve o puzzle exibido: índices pares são do aluno, ímpares a tela responde. */
async function resolverOPuzzleExibido(): Promise<void> {
  const solucao = solucaoDaPosicaoExibida()
  for (let i = 0; i < solucao.length; i += 2) {
    await jogar(solucao[i])
  }
}

beforeEach(() => {
  tabuleiro.onMove = null
})

afterEach(() => {
  contexto.valor = null
})

/**
 * O cruzamento. Varre TODOS os níveis possíveis, derivados de
 * `MAX_HINT_LEVEL` — não uma lista escrita à mão que esqueceria o nível novo
 * no dia em que a escada de dicas crescer.
 */
describe('o número de dicas na tela é o mesmo que a tentativa grava', () => {
  const NIVEIS = Array.from({ length: MAX_HINT_LEVEL + 1 }, (_, n) => n)

  it('a varredura tem níveis para varrer', () => {
    // Portão com zero verificações não é aprovação.
    expect(NIVEIS.length).toBeGreaterThan(1)
    expect(Math.max(...NIVEIS)).toBe(MAX_HINT_LEVEL)
  })

  for (const dicas of NIVEIS) {
    it(`${dicas} dica(s) pedida(s) viram hintsUsed ${dicas} no registro`, async () => {
      const repo = await montar()

      for (let i = 0; i < dicas; i += 1) {
        await userEvent.click(botaoDeDica())
      }

      // Metade da TELA: o rótulo do botão conta o que já foi pedido. Parênteses
      // delimitam o número, então "1" não casa dentro de "13".
      if (dicas > 0) {
        expect(botaoDeDica()).toHaveAccessibleName(new RegExp(`\\(${dicas}/${MAX_HINT_LEVEL}\\)`))
      }

      await userEvent.click(screen.getByRole('button', { name: 'Desistir' }))
      await screen.findByText('O que era')

      // Metade do DOMÍNIO: o que ficou gravado.
      const [registro] = await waitFor(async () => {
        const lista = await repo.listPuzzleAttempts()
        expect(lista.length, 'a tentativa não foi gravada').toBe(1)
        return lista
      })
      expect(registro.hintsUsed, 'a tela e o registro discordam sobre as dicas').toBe(dicas)
    })
  }
})

describe('o botão de dica termina a escada', () => {
  it('desabilita no último nível e diz em palavras que acabou', async () => {
    await montar()

    for (let i = 0; i < MAX_HINT_LEVEL; i += 1) {
      const botao = botaoDeDica()
      expect(botao, `a dica ${i + 1} deveria estar disponível`).toBeEnabled()
      await userEvent.click(botao)
    }

    const botao = botaoDeDica()
    expect(botao, 'ainda dá para pedir uma quarta dica').toBeDisabled()
    // Estado nunca só por aparência: `disabled` sem palavra não chega ao
    // leitor de tela nem a quem não distingue o cinza do botão.
    expect(botao).toHaveAccessibleName(new RegExp(`\\(${MAX_HINT_LEVEL}/${MAX_HINT_LEVEL}\\)`))
    expect(botao.textContent ?? '').not.toMatch(/^Mais uma dica/)
  })

  it('o contador zera no puzzle seguinte sem ninguém zerar nada', async () => {
    await montar()

    await userEvent.click(botaoDeDica())
    const dicaVisivel = screen.getByRole('button', { name: /Mais uma dica/ })
    expect(dicaVisivel).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Desistir' }))
    await userEvent.click(screen.getByRole('button', { name: /Próximo puzzle|Encerrar sessão/ }))

    await screen.findByText(/Puzzle 2 de \d+/)
    expect(botaoDeDica()).toHaveAccessibleName('Dica')
  })
})

describe('quem resolveu com apoio não passa por acerto limpo', () => {
  it('resolver com dica grava a dica, tira o firstTry e gera card de revisão', async () => {
    const repo = await montar()

    await userEvent.click(botaoDeDica())
    await resolverOPuzzleExibido()

    const [registro] = await waitFor(async () => {
      const lista = await repo.listPuzzleAttempts()
      expect(lista.length).toBe(1)
      return lista
    })
    expect(registro.solved).toBe(true)
    expect(registro.hintsUsed).toBe(1)
    expect(registro.firstTry, 'acerto com dica registrado como acerto de primeira').toBe(false)

    // O princípio do produto: o padrão que só saiu com ajuda volta.
    const cards = await waitFor(async () => {
      const lista = await repo.listReviewCards()
      expect(lista.length, 'resolver com dica não gerou card de revisão').toBe(1)
      return lista
    })
    // E o card não pode acusar erro de quem acertou.
    expect(cards[0].prompt).not.toMatch(/errou/i)
    expect(cards[0].prompt).toMatch(/dica/i)

    // A mensagem de acerto acompanha o registro, em vez de contar outra história.
    expect(screen.getByText(MENSAGEM_DO_DESFECHO.resolvidoComApoio)).toBeInTheDocument()
  })

  it('resolver sem dica continua sendo acerto limpo e não vira dever de casa', async () => {
    const repo = await montar()

    await resolverOPuzzleExibido()

    const [registro] = await waitFor(async () => {
      const lista = await repo.listPuzzleAttempts()
      expect(lista.length).toBe(1)
      return lista
    })
    expect(registro.solved).toBe(true)
    expect(registro.hintsUsed).toBe(0)
    expect(registro.firstTry).toBe(true)
    expect(await repo.listReviewCards()).toEqual([])
    expect(screen.getByText(MENSAGEM_DO_DESFECHO.resolvidoSemApoio)).toBeInTheDocument()
  })
})

/**
 * A segunda fonte não pode voltar pela porta dos fundos.
 *
 * A varredura lê a FONTE da tela e reprova se o nível de dica voltar a morar
 * em estado local do componente. Sem esta parte, um `useState` novo com outro
 * nome recria o defeito da #66 e os testes de comportamento acima continuariam
 * verdes enquanto o registro voltasse a mentir — foi assim que ele durou.
 */
describe('o nível de dica não voltou a morar na tela', () => {
  const FONTE_DA_TELA = 'src/components/puzzles/PuzzleTrainer.tsx'

  function semComentarios(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
  }

  const codigo = semComentarios(readFileSync(join(process.cwd(), FONTE_DA_TELA), 'utf8'))

  /**
   * Tudo que a tela guarda entre renders: `useState`, `useReducer` e `useRef`,
   * na forma desestruturada e na forma simples.
   *
   * A primeira versão desta varredura exigia a vírgula do par
   * `[valor, setValor]` — e por isso um `const [nivelDeDica] = useState(0)`
   * passava batido. A mutação que reintroduzia o defeito ficou VERDE. Portão
   * frouxo consertado: o que é lido é o miolo inteiro da declaração.
   */
  const HOOKS_DE_ESTADO =
    /const\s*(\[[^\]]*\]|[A-Za-z0-9_$]+)\s*=\s*use(?:State|Reducer|Ref)\s*[<(]/g
  const estadosLocais = [...codigo.matchAll(HOOKS_DE_ESTADO)].map((m) => m[1])

  it('a varredura achou a fonte e tem estado para varrer', () => {
    expect(codigo.length).toBeGreaterThan(0)
    expect(estadosLocais.length, 'nenhum estado encontrado: a varredura cegou').toBeGreaterThan(0)
  })

  it('nenhum estado local guarda dica', () => {
    const suspeitos = estadosLocais.filter((nome) => /dica|hint/i.test(nome))
    expect(suspeitos, `nível de dica de novo em estado da tela: ${suspeitos.join(', ')}`).toEqual(
      [],
    )
  })

  it('a tela pede a dica ao domínio', () => {
    // Sem esta chamada, `hintsUsed` fica 0 e todo o resto acima é decorativo.
    expect(codigo).toMatch(/useHint\b/)
  })
})
