/**
 * Portão do que a TELA de puzzles DIZ sobre um lance alternativo (issue #17).
 *
 * POR QUE ESTE ARQUIVO EXISTE. A metade de domínio já é conferida em
 * `puzzles-alternativa-na-tentativa.test.ts`: lá o veredito vira estado e vira
 * registro. Nada disso chega ao aluno sozinho. Duas falhas SILENCIOSAS moram
 * exatamente aqui, e nenhuma delas dá erro, quebra tela ou aparece em log:
 *
 * 1. DESCONTO MUDO. O veredito `pior` desconta a maestria. Se a tela não
 *    disser o que foi pior, o aluno vê o número andar devagar sem nunca saber
 *    por quê — punição sem causa aparente.
 * 2. SILÊNCIO QUE PARECE APROVAÇÃO. O veredito `indeterminado` não conta como
 *    erro. Se a tela ficar calada, o aluno conclui que o lance estava certo,
 *    quando o que houve foi a máquina não saber responder. E aqui só existe a
 *    engine, que dá ORDENAÇÃO e não verdade: `indeterminado` é caminho comum.
 *
 * O CRUZAMENTO que só este arquivo faz: o que está ESCRITO na tela e o que foi
 * GRAVADO no repositório saem do mesmo lance, e o desconto da maestria é
 * conferido contra a maestria de uma tentativa equivalente — não contra um
 * número escrito à mão aqui dentro.
 *
 * O QUE ESTE ARQUIVO NÃO PROVA: aparência, contraste e foco do bloco de
 * julgamento; e nada sobre a engine de verdade — `analyze` é duble, então a
 * suíte não diz com que frequência o veredito é `indeterminado` na prática.
 */

import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultProfile } from '@/domain/profile'
import {
  createAttemptState,
  parsePuzzleCsv,
  toSolvable,
  valeConsultarEngine,
  ALTERNATIVA_CONFIG,
} from '@/domain/puzzles'
import { MASTERY_CONFIG } from '@/domain/skills/mastery'
import { VEREDITOS_DE_ALTERNATIVA, type PuzzleAlternativaRegistro } from '@/domain/types'
import { applyMove, legalMoves, parseUci } from '@/lib/chess'
import { MemoryTrainingRepository } from '@/lib/storage/memory-repository'

/**
 * Conjunto de UM puzzle, no formato do dump do Lichess.
 *
 * O conjunto real não serve a este portão: qual puzzle a sessão mostra depende
 * da data (a semente do sorteio é o dia), e vários deles não têm NENHUM lance
 * alternativo que chegue ao juiz. Um portão que só funciona em alguns dias do
 * ano é pior que nenhum. Aqui a posição é escolhida: duas capturas vencedoras
 * da dama preta, Txd5 na linha do dataset e Dxd5 fora dela.
 */
const FIXTURE = vi.hoisted(() => ({
  csv: [
    'PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags',
    'LZ9001,4k3/8/3q4/8/8/8/Q7/3RK3 b - - 0 1,d6d5 d1d5,1100,75,90,500,hangingPiece,,',
  ].join('\n'),
}))

vi.mock('@/content/puzzles/starter', () => ({ STARTER_PUZZLES_CSV: FIXTURE.csv }))

const contexto = vi.hoisted(() => ({ valor: null as unknown }))

vi.mock('@/components/providers/RepositoryProvider', () => ({
  useRepository: () => contexto.valor,
}))

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

/**
 * Duble da engine.
 *
 * `respostas` é o que a engine "sabe". FEN fora do mapa devolve `null`, que é
 * exatamente o que `useEngine` devolve quando a análise falha ou fica obsoleta
 * — e é assim que o caminho `indeterminado` é encenado, sem nenhum atalho.
 */
const engine = vi.hoisted(() => ({
  respostas: new Map<string, number>(),
  chamadas: [] as string[],
}))

vi.mock('@/lib/engine/use-engine', () => ({
  useEngine: () => ({
    status: 'pronto' as const,
    analisando: false,
    erro: null,
    analyze: async (fen: string) => {
      engine.chamadas.push(fen)
      const cp = engine.respostas.get(fen)
      if (cp === undefined) return null
      return {
        fen,
        turn: fen.split(' ')[1] === 'b' ? ('b' as const) : ('w' as const),
        depth: 14,
        nodes: 1000,
        bestMoveUci: null,
        ponderUci: null,
        lines: [{ multiPv: 1, scoreCp: cp, mateIn: null, pv: [], depth: 14, nodes: 1000 }],
        elapsedMs: 1,
      }
    },
    stop: async () => {},
    restart: async () => {},
  }),
}))

const { MENSAGEM_DO_DESFECHO, PuzzleTrainer } = await import('@/components/puzzles/PuzzleTrainer')
const { APRESENTACAO_DA_ALTERNATIVA, descreverAlternativa } =
  await import('@/components/puzzles/textos-alternativa')

// ------------------------------------------------------------------ fixtures

function fenDepoisDe(fen: string, uci: string): string {
  const entrada = parseUci(uci)
  if (entrada === null) throw new Error(`fixture com UCI inválido: ${uci}`)
  const aplicado = applyMove(fen, entrada)
  if (aplicado === null) throw new Error(`fixture com lance ilegal: ${uci} em ${fen}`)
  return aplicado.fenAfter
}

/**
 * O lance alternativo sai da POSIÇÃO, não de uma constante escrita aqui: é
 * varrido dos lances legais e filtrado pelo MESMO critério que o produto usa
 * (`valeConsultarEngine`). Mate fora da linha é descartado porque ele já é
 * aceito antes do juiz, por `ATTEMPT_CONFIG.aceitarMateAlternativo`.
 */
function fixture() {
  const puzzle = parsePuzzleCsv(FIXTURE.csv, { pularCabecalho: true }).puzzles[0]
  if (puzzle === undefined) throw new Error('o CSV do fixture não produziu nenhum puzzle')
  const solvable = toSolvable(puzzle)
  const estado = createAttemptState(solvable)
  const uciEsperado = solvable.solutionUci[0] ?? ''
  const alternativa = legalMoves(estado.currentFen).find(
    (lance) =>
      lance.uci !== uciEsperado &&
      !lance.isCheckmate &&
      valeConsultarEngine(estado, lance.uci).vale,
  )
  if (alternativa === undefined) {
    throw new Error('nenhum lance legal do fixture chega ao juiz: a posição desalinhou')
  }
  return {
    puzzle,
    startFen: solvable.startFen,
    uciEsperado,
    uciAlternativo: alternativa.uci,
    fenDoAlternativo: fenDepoisDe(solvable.startFen, alternativa.uci),
    fenDoEsperado: fenDepoisDe(solvable.startFen, uciEsperado),
  }
}

const F = fixture()

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
  // Uma árvore por vez. O portão do desconto monta DUAS sessões no mesmo teste
  // (a com desconto e a limpa), e duas árvores vivas fariam `getByTestId`
  // encontrar dois tabuleiros e medir o da sessão errada.
  cleanup()
  const repo = new MemoryTrainingRepository()
  contexto.valor = contextoCom(repo)
  render(<PuzzleTrainer />)
  await screen.findByText(/Puzzle 1 de \d+/)
  // O fixture tem de ser o que está na tela: sem isto, o portão mediria outro
  // puzzle e passaria dizendo nada.
  expect(screen.getByTestId('tabuleiro')).toHaveAttribute('data-fen', F.startFen)
  return repo
}

async function jogar(uci: string): Promise<void> {
  const promocao = uci.length > 4 ? uci.slice(4) : undefined
  await act(async () => {
    tabuleiro.onMove?.(uci.slice(0, 2), uci.slice(2, 4), promocao)
  })
}

/** As duas posições valem o mesmo. */
function engineEquivalente(): void {
  engine.respostas.set(F.fenDoAlternativo, -900)
  engine.respostas.set(F.fenDoEsperado, -900)
}

/** A alternativa ganha bem menos: vencedora, porém pior. */
function enginePior(): void {
  engine.respostas.set(F.fenDoAlternativo, -300)
  engine.respostas.set(F.fenDoEsperado, -900)
}

function blocoDoJulgamento(): HTMLElement {
  return screen.getByTestId('julgamento-da-alternativa')
}

beforeEach(() => {
  tabuleiro.onMove = null
  engine.respostas.clear()
  engine.chamadas.length = 0
})

afterEach(() => {
  contexto.valor = null
})

// ------------------------------------------------------ os três, na tela

describe('a tela fala nos três vereditos', () => {
  it('VARRE A FONTE: todo veredito tem rótulo e frase, e a frase nomeia o lance', () => {
    let conferidos = 0
    for (const veredito of VEREDITOS_DE_ALTERNATIVA) {
      const apresentacao = APRESENTACAO_DA_ALTERNATIVA[veredito]
      expect(apresentacao, `veredito sem apresentação: ${veredito}`).toBeDefined()
      // Ícone + rótulo: status nunca depende só de cor.
      expect(apresentacao.icone.trim().length).toBeGreaterThan(0)
      expect(apresentacao.rotulo.trim().length).toBeGreaterThan(0)

      const registro: PuzzleAlternativaRegistro =
        veredito === 'indeterminado'
          ? { uci: F.uciAlternativo, veredito, motivo: 'avaliacao-ausente' }
          : { uci: F.uciAlternativo, veredito, margemPp: 7.25 }
      const frase = descreverAlternativa(registro, F.uciEsperado)
      // Frase que não nomeia o lance julgado não é conferível pelo aluno.
      expect(frase).toContain(F.uciAlternativo)
      expect(frase.length).toBeGreaterThan(apresentacao.rotulo.length)

      if (registro.veredito === 'indeterminado') {
        // Dizer só "não deu para confirmar" esconde o que falhou. A frase muda
        // com o MOTIVO gravado — é ele que depois diz se o limiar está
        // calibrado ou se a engine é que não respondeu.
        expect(frase).not.toBe(
          descreverAlternativa({ ...registro, motivo: 'avaliacao-falhou' }, F.uciEsperado),
        )
      } else {
        // A frase carrega os NÚMEROS, e a prova disso é que ela MUDA quando
        // eles mudam. Comparar com o texto formatado aqui dentro duplicaria o
        // formatador; comparar duas frases não duplica nada — e continua
        // reprovando quem trocar o número por um rótulo fixo.
        expect(frase).not.toBe(descreverAlternativa({ ...registro, margemPp: 11.5 }, F.uciEsperado))
        expect(frase).not.toBe(
          descreverAlternativa(registro, F.uciEsperado, {
            ...ALTERNATIVA_CONFIG,
            toleranciaPp: ALTERNATIVA_CONFIG.toleranciaPp + 5,
          }),
        )
        // E o lance da linha do dataset é nomeado: sem ele, "é pior" não diz
        // pior do que o quê.
        expect(frase).toContain(F.uciEsperado)
      }
      conferidos += 1
    }
    // Portão com zero verificações REPROVA.
    expect(conferidos).toBe(VEREDITOS_DE_ALTERNATIVA.length)
    expect(conferidos).toBeGreaterThan(0)
  })
})

describe('alternativa equivalente', () => {
  it('é acerto limpo na tela e no registro, e não desconta nada', async () => {
    engineEquivalente()
    const repo = await montar()

    await jogar(F.uciAlternativo)

    const bloco = await waitFor(() => blocoDoJulgamento())
    expect(bloco).toHaveAttribute('data-veredito', 'equivalente')
    expect(bloco).toHaveTextContent(APRESENTACAO_DA_ALTERNATIVA.equivalente.rotulo)
    expect(bloco).toHaveTextContent(F.uciAlternativo)
    // O desfecho não pode dizer "a linha que ganha": o aluno achou outra.
    expect(screen.getByText(MENSAGEM_DO_DESFECHO.resolvidoPorAlternativa)).toBeInTheDocument()

    // Duas posições analisadas, uma vez cada: o preço do julgamento é conhecido.
    expect(engine.chamadas).toEqual([F.fenDoAlternativo, F.fenDoEsperado])

    const [registro] = await waitFor(async () => {
      const lista = await repo.listPuzzleAttempts()
      expect(lista.length).toBe(1)
      return lista
    })
    expect(registro.solved).toBe(true)
    expect(registro.firstTry).toBe(true)
    expect(registro.alternativas?.[0]?.veredito).toBe('equivalente')
    // Acerto não vira dever de casa.
    expect(await repo.listReviewCards()).toEqual([])
  })
})

describe('alternativa vencedora porém pior', () => {
  it('é acerto COM DESCONTO, e a tela diz o que foi pior com número conferível', async () => {
    enginePior()
    const repo = await montar()

    await jogar(F.uciAlternativo)

    const bloco = await waitFor(() => blocoDoJulgamento())
    expect(bloco).toHaveAttribute('data-veredito', 'pior')
    expect(bloco).toHaveTextContent(APRESENTACAO_DA_ALTERNATIVA.pior.rotulo)

    const [registro] = await waitFor(async () => {
      const lista = await repo.listPuzzleAttempts()
      expect(lista.length).toBe(1)
      return lista
    })
    const gravado = registro.alternativas?.[0]
    expect(gravado?.veredito).toBe('pior')
    expect(gravado?.margemPp).toBeGreaterThan(ALTERNATIVA_CONFIG.toleranciaPp)

    // O CRUZAMENTO: o número escrito na tela é o número GRAVADO, não um texto
    // parecido. `descreverAlternativa` é a mesma função que a tela usa, e ela
    // recebe aqui o registro que veio do repositório.
    expect(bloco).toHaveTextContent(descreverAlternativa(gravado!, F.uciEsperado))

    // Acerto: nada de card de revisão. O que empurra para o melhor lance é o
    // desconto, não dever de casa.
    expect(await repo.listReviewCards()).toEqual([])
    expect(registro.solved).toBe(true)
  })

  it('o desconto CHEGA à maestria, e é o da família que já existe', async () => {
    enginePior()
    const repoPior = await montar()
    await jogar(F.uciAlternativo)
    const maestriaPior = await waitFor(async () => {
      const lista = await repoPior.getSkillMastery()
      expect(lista.length).toBeGreaterThan(0)
      return lista
    })

    contexto.valor = null
    engine.respostas.clear()
    engine.chamadas.length = 0
    engineEquivalente()
    const repoLimpo = await montar()
    await jogar(F.uciAlternativo)
    const maestriaLimpa = await waitFor(async () => {
      const lista = await repoLimpo.getSkillMastery()
      expect(lista.length).toBeGreaterThan(0)
      return lista
    })

    let conferidos = 0
    for (const limpa of maestriaLimpa) {
      const comDesconto = maestriaPior.find((item) => item.skillId === limpa.skillId)
      expect(comDesconto, `habilidade sumiu no caminho: ${limpa.skillId}`).toBeDefined()
      // A REGRA, não um número cravado: o crédito da amostra do lance pior é o
      // do acerto limpo multiplicado por `1 - penalidadeLanceVencedorPior`.
      expect(comDesconto!.recentAccuracy).toBeCloseTo(
        limpa.recentAccuracy * (1 - MASTERY_CONFIG.penalidadeLanceVencedorPior),
        10,
      )
      expect(comDesconto!.recentAccuracy).toBeLessThan(limpa.recentAccuracy)
      conferidos += 1
    }
    expect(conferidos).toBe(maestriaLimpa.length)
    expect(conferidos).toBeGreaterThan(0)
  })
})

describe('alternativa que não deu para confirmar', () => {
  it('não é erro, a tentativa continua e a tela DIZ que não deu para conferir', async () => {
    // Mapa vazio de propósito: a engine não respondeu.
    const repo = await montar()

    await jogar(F.uciAlternativo)

    const bloco = await waitFor(() => blocoDoJulgamento())
    expect(bloco).toHaveAttribute('data-veredito', 'indeterminado')
    expect(bloco).toHaveTextContent(APRESENTACAO_DA_ALTERNATIVA.indeterminado.rotulo)
    // A frase precisa dizer as DUAS metades: não é erro E não é acerto.
    expect(bloco.textContent ?? '').toMatch(/não conta como erro/i)

    // A tentativa continua: mesma posição, sem tentativa errada contada.
    expect(screen.getByTestId('tabuleiro')).toHaveAttribute('data-fen', F.startFen)
    expect(screen.queryByText(/tentativas? errada/i)).not.toBeInTheDocument()
    // E nada foi gravado, porque a tentativa não terminou.
    expect(await repo.listPuzzleAttempts()).toEqual([])
    expect(await repo.listReviewCards()).toEqual([])
  })

  it('o lance não confirmado fica registrado quando a tentativa termina', async () => {
    const repo = await montar()

    await jogar(F.uciAlternativo)
    await waitFor(() => blocoDoJulgamento())
    // Agora o jogador acha a linha do dataset: acerto limpo.
    await jogar(F.uciEsperado)

    const [registro] = await waitFor(async () => {
      const lista = await repo.listPuzzleAttempts()
      expect(lista.length).toBe(1)
      return lista
    })
    expect(registro.solved).toBe(true)
    // NÃO FOI ERRO: o acerto continua sendo de primeira.
    expect(registro.firstTry).toBe(true)
    // E MESMO ASSIM ficou a marca. Sem ela, este registro seria idêntico ao de
    // quem nunca tentou nada fora da linha, e a taxa de "a engine não
    // respondeu" seria impossível de medir depois.
    expect(registro.alternativas?.map((item) => item.veredito)).toEqual(['indeterminado'])
    expect(registro.alternativas?.[0]?.motivo).toBe('avaliacao-ausente')

    // E a tela não esconde o que aconteceu depois que a tentativa encerra.
    expect(screen.getByTestId('nao-confirmados')).toHaveTextContent(F.uciAlternativo)
  })
})

describe('o caminho barato continua barato', () => {
  it('o lance da linha do dataset não paga análise nenhuma', async () => {
    const repo = await montar()

    await jogar(F.uciEsperado)

    expect(engine.chamadas).toEqual([])
    expect(screen.queryByTestId('julgamento-da-alternativa')).not.toBeInTheDocument()
    const [registro] = await waitFor(async () => {
      const lista = await repo.listPuzzleAttempts()
      expect(lista.length).toBe(1)
      return lista
    })
    expect(registro.solved).toBe(true)
    expect(registro.alternativas).toBeUndefined()
  })
})
