import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { positionStatus } from '@/lib/chess'
import {
  ATTEMPT_CONFIG,
  PuzzleParseError,
  buildHints,
  createAttemptState,
  giveUp,
  hintAt,
  isSupportedTheme,
  parsePuzzleCsv,
  parsePuzzleCsvLine,
  skillIdsForThemes,
  submitMove,
  themeLabelsPt,
  toPuzzleAttempt,
  toSolvable,
  useHint,
  validatePuzzle,
  validateSolution,
} from '@/domain/puzzles'
import {
  CSV_COMPLETO,
  CSV_CORREDOR,
  CSV_CRAVADA,
  CSV_ESCADA_LONGA,
  CSV_GARFO,
  CSV_INVALIDO_COLUNAS,
  CSV_INVALIDO_FEN,
  CSV_INVALIDO_RATING,
  CSV_MATE_EM_UM,
  CSV_MATE_EM_UM_PRETAS,
  CSV_PECA_PENDURADA,
  CSV_PECA_PENDURADA_PRETAS,
  CSV_PROMOCAO,
  CSV_PUZZLES_VALIDOS,
  CSV_SETUP_ILEGAL,
  CSV_SOMENTE_VALIDOS,
} from '../fixtures/puzzles'

// ---------------------------------------------------------------------------
// A regressão que justifica este arquivo existir.
// ---------------------------------------------------------------------------

describe('semântica do dump do Lichess: quem resolve joga DEPOIS de moves[0]', () => {
  it('resolve com as BRANCAS um puzzle cujo FEN cru diz que é a vez das pretas', () => {
    const puzzle = parsePuzzleCsvLine(CSV_MATE_EM_UM)

    // O FEN cru é a posição ANTES do lance preparatório do adversário.
    expect(positionStatus(puzzle.fen).turn).toBe('b')

    const solvable = toSolvable(puzzle)

    // E quem resolve é o lado oposto: o que joga depois de moves[0].
    expect(solvable.playerColor).toBe('w')
    expect(solvable.setupMoveUci).toBe('a8a7')
    expect(solvable.solutionUci).toEqual(['d1d8'])
    expect(positionStatus(solvable.startFen).turn).toBe('w')
  })

  it('resolve com as PRETAS um puzzle cujo FEN cru diz que é a vez das brancas', () => {
    const puzzle = parsePuzzleCsvLine(CSV_MATE_EM_UM_PRETAS)

    expect(positionStatus(puzzle.fen).turn).toBe('w')

    const solvable = toSolvable(puzzle)

    expect(solvable.playerColor).toBe('b')
    expect(solvable.setupMoveUci).toBe('a1a2')
    expect(solvable.solutionUci).toEqual(['d8d1'])
  })

  it('playerColor é SEMPRE o oposto do lado do FEN cru, em todo o fixture', () => {
    for (const linha of CSV_PUZZLES_VALIDOS) {
      const puzzle = parsePuzzleCsvLine(linha)
      const solvable = toSolvable(puzzle)
      const ladoDoFenCru = positionStatus(puzzle.fen).turn

      expect(
        solvable.playerColor,
        `puzzle ${puzzle.id}: o lado que resolve não pode ser o do FEN cru`,
      ).not.toBe(ladoDoFenCru)
      expect(solvable.playerColor).toBe(positionStatus(solvable.startFen).turn)
    }
  })

  it('startFen já tem o lance preparatório aplicado, e não é o FEN cru', () => {
    const solvable = toSolvable(parsePuzzleCsvLine(CSV_GARFO))
    expect(solvable.startFen).not.toBe(solvable.puzzle.fen)
    // A dama preta saiu de d7 e está em d5 na posição em que o jogador começa.
    expect(solvable.startFen.split(' ')[0]).toContain('3q')
  })

  it('a solução exclui o lance preparatório', () => {
    const puzzle = parsePuzzleCsvLine(CSV_ESCADA_LONGA)
    const solvable = toSolvable(puzzle)
    expect(puzzle.moves).toHaveLength(8)
    expect(solvable.solutionUci).toHaveLength(7)
    expect(solvable.solutionUci[0]).toBe(puzzle.moves[1])
    expect(solvable.solutionUci).not.toContain(puzzle.moves[0])
  })

  it('lança PuzzleParseError com o PuzzleId quando moves[0] é ilegal na FEN', () => {
    const puzzle = parsePuzzleCsvLine(CSV_SETUP_ILEGAL)
    expect(() => toSolvable(puzzle)).toThrowError(PuzzleParseError)
    expect(() => toSolvable(puzzle)).toThrowError(/LZbad4/)
  })
})

// ---------------------------------------------------------------------------
// Parser de CSV
// ---------------------------------------------------------------------------

describe('parsePuzzleCsvLine', () => {
  it('lê todas as colunas do formato oficial', () => {
    const puzzle = parsePuzzleCsvLine(CSV_GARFO)
    expect(puzzle).toMatchObject({
      id: 'LZfrk',
      rating: 1120,
      ratingDeviation: 80,
      popularity: 93,
      nbPlays: 2410,
      gameUrl: 'https://lichess.org/lz000002#31',
    })
    expect(puzzle.moves).toEqual(['d7d5', 'e4f6', 'g8h8', 'f6d5'])
    expect(puzzle.themes).toEqual(['fork', 'advantage', 'middlegame', 'short'])
    expect(puzzle.skillIds).toEqual(['tactics.fork'])
  })

  it('tolera espaços em volta dos campos', () => {
    const comEspacos = CSV_PECA_PENDURADA.split(',')
      .map((campo) => `  ${campo}  `)
      .join(',')
    const puzzle = parsePuzzleCsvLine(`  ${comEspacos}  `)
    expect(puzzle.id).toBe('LZhng')
    expect(puzzle.moves).toEqual(['e6d5', 'd1d5'])
  })

  it('tolera fim de linha do Windows', () => {
    expect(parsePuzzleCsvLine(`${CSV_PROMOCAO}\r`).id).toBe('LZprm')
  })

  it('recusa número errado de colunas citando o PuzzleId', () => {
    expect(() => parsePuzzleCsvLine(CSV_INVALIDO_COLUNAS)).toThrowError(/LZbad1/)
    expect(() => parsePuzzleCsvLine(CSV_INVALIDO_COLUNAS)).toThrowError(/10 colunas/)
  })

  it('recusa FEN inválido citando o PuzzleId', () => {
    expect(() => parsePuzzleCsvLine(CSV_INVALIDO_FEN)).toThrowError(/LZbad2/)
    expect(() => parsePuzzleCsvLine(CSV_INVALIDO_FEN)).toThrowError(/FEN inválido/)
  })

  it('recusa rating não numérico citando o PuzzleId', () => {
    expect(() => parsePuzzleCsvLine(CSV_INVALIDO_RATING)).toThrowError(/LZbad3/)
    expect(() => parsePuzzleCsvLine(CSV_INVALIDO_RATING)).toThrowError(/Rating/)
  })

  it('todo erro é um PuzzleParseError com o id acessível', () => {
    try {
      parsePuzzleCsvLine(CSV_INVALIDO_FEN, 7)
      expect.unreachable('deveria ter lançado')
    } catch (error) {
      expect(error).toBeInstanceOf(PuzzleParseError)
      const parse = error as PuzzleParseError
      expect(parse.puzzleId).toBe('LZbad2')
      expect(parse.linha).toBe(7)
    }
  })
})

describe('parsePuzzleCsv', () => {
  it('acumula os erros e segue: uma linha ruim não derruba o lote', () => {
    const { puzzles, erros } = parsePuzzleCsv(CSV_COMPLETO)

    expect(puzzles).toHaveLength(CSV_PUZZLES_VALIDOS.length)
    expect(erros).toHaveLength(3)
    expect(erros.map((erro) => erro.puzzleId)).toEqual(['LZbad1', 'LZbad2', 'LZbad3'])
    for (const erro of erros) {
      expect(erro).toBeInstanceOf(PuzzleParseError)
      expect(erro.linha).toBeGreaterThan(0)
    }

    // Os puzzles bons vieram inteiros, inclusive os que vinham depois do erro.
    expect(puzzles.at(-1)?.id).toBe('LZmtb')
  })

  it('pula o cabeçalho automaticamente', () => {
    const { puzzles, erros } = parsePuzzleCsv(CSV_SOMENTE_VALIDOS)
    expect(erros).toEqual([])
    expect(puzzles).toHaveLength(CSV_PUZZLES_VALIDOS.length)
  })

  it('respeita pularCabecalho: false e reporta o cabeçalho como erro', () => {
    const { puzzles, erros } = parsePuzzleCsv(CSV_SOMENTE_VALIDOS, { pularCabecalho: false })
    expect(puzzles).toHaveLength(CSV_PUZZLES_VALIDOS.length)
    expect(erros).toHaveLength(1)
  })

  it('lê CSV sem cabeçalho', () => {
    const { puzzles, erros } = parsePuzzleCsv(CSV_PUZZLES_VALIDOS.join('\n'))
    expect(erros).toEqual([])
    expect(puzzles).toHaveLength(CSV_PUZZLES_VALIDOS.length)
  })

  it('ignora linhas em branco', () => {
    const { puzzles, erros } = parsePuzzleCsv(`${CSV_MATE_EM_UM}\n\n   \n${CSV_GARFO}\n`)
    expect(erros).toEqual([])
    expect(puzzles).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// Temas
// ---------------------------------------------------------------------------

describe('skillIdsForThemes', () => {
  it('mapeia os motivos táticos conhecidos', () => {
    expect(skillIdsForThemes(['fork'])).toEqual(['tactics.fork'])
    expect(skillIdsForThemes(['hangingPiece'])).toEqual(['tactics.hanging-piece'])
    expect(skillIdsForThemes(['pin'])).toEqual(['tactics.pin'])
    expect(skillIdsForThemes(['skewer'])).toEqual(['tactics.skewer'])
    expect(skillIdsForThemes(['discoveredAttack'])).toEqual(['tactics.discovered-attack'])
    expect(skillIdsForThemes(['deflection'])).toEqual(['tactics.deflection'])
    expect(skillIdsForThemes(['capturingDefender'])).toEqual(['tactics.removal-of-defender'])
    expect(skillIdsForThemes(['backRankMate'])).toEqual(['tactics.back-rank'])
    expect(skillIdsForThemes(['mateIn1'])).toEqual(['tactics.mating-net'])
    expect(skillIdsForThemes(['mateIn2'])).toEqual(['tactics.mating-net'])
  })

  it('ignora tema sem correspondência em vez de chutar habilidade', () => {
    expect(skillIdsForThemes(['zugzwang', 'quietMove', 'crushing', 'opening'])).toEqual([])
    expect(isSupportedTheme('zugzwang')).toBe(false)
  })

  it('não duplica e mantém ordem estável', () => {
    const skills = skillIdsForThemes(['mateIn2', 'backRankMate', 'mate', 'mateIn2'])
    expect(skills).toEqual(['tactics.mating-net', 'tactics.back-rank'])
  })

  it('traduz para PT-BR só os temas que sabemos nomear', () => {
    expect(themeLabelsPt(['backRankMate', 'mateIn2', 'zugzwang'])).toEqual([
      'mate do corredor',
      'mate em 2',
    ])
  })
})

// ---------------------------------------------------------------------------
// Validação da solução inteira
// ---------------------------------------------------------------------------

describe('validateSolution', () => {
  it('valida a linha INTEIRA, não só o primeiro lance', () => {
    const solvable = toSolvable(parsePuzzleCsvLine(CSV_ESCADA_LONGA))
    const resultado = validateSolution(solvable)
    expect(resultado.valido).toBe(true)
    expect(solvable.solutionUci).toHaveLength(7)
    expect(resultado.terminaEmMate).toBe(true)
  })

  it('aprova todos os puzzles válidos do fixture', () => {
    for (const linha of CSV_PUZZLES_VALIDOS) {
      const resultado = validatePuzzle(parsePuzzleCsvLine(linha))
      expect(resultado.valido, `${linha.split(',')[0]}: ${resultado.motivo ?? ''}`).toBe(true)
    }
  })

  it('reprova quando um lance do MEIO da solução é ilegal', () => {
    const solvable = toSolvable(parsePuzzleCsvLine(CSV_ESCADA_LONGA))
    const quebrado = {
      ...solvable,
      // Troca o quarto lance da linha por um lance ilegal na posição.
      solutionUci: solvable.solutionUci.map((uci, i) => (i === 3 ? 'h1h8' : uci)),
    }
    const resultado = validateSolution(quebrado)
    expect(resultado.valido).toBe(false)
    expect(resultado.indiceDoLanceInvalido).toBe(3)
    expect(resultado.motivo).toMatch(/ilegal/)
  })

  it('reprova solução de tamanho par, que terminaria no adversário', () => {
    const solvable = toSolvable(parsePuzzleCsvLine(CSV_CORREDOR))
    const resultado = validateSolution({
      ...solvable,
      solutionUci: solvable.solutionUci.slice(0, 2),
    })
    expect(resultado.valido).toBe(false)
  })

  it('reprova puzzle cujo lance preparatório é ilegal, sem lançar', () => {
    const resultado = validatePuzzle(parsePuzzleCsvLine(CSV_SETUP_ILEGAL))
    expect(resultado.valido).toBe(false)
    expect(resultado.motivo).toMatch(/LZbad4/)
  })
})

// ---------------------------------------------------------------------------
// Máquina de estado da tentativa
// ---------------------------------------------------------------------------

describe('tentativa', () => {
  const cravada = () => toSolvable(parsePuzzleCsvLine(CSV_CRAVADA))

  it('aplica a resposta do adversário automaticamente entre os lances do jogador', () => {
    const solvable = cravada()
    // solutionUci = [c1g5, g7g6, g5f6]: pares do jogador, ímpares do adversário.
    const inicial = createAttemptState(solvable)
    expect(inicial.status).toBe('em-andamento')
    expect(inicial.currentFen).toBe(solvable.startFen)

    const primeiro = submitMove(inicial, 'c1g5')
    expect(primeiro.correto).toBe(true)
    expect(primeiro.respostaDoAdversarioUci).toBe('g7g6')
    expect(primeiro.state.solutionIndex).toBe(2)
    expect(primeiro.state.playedUci).toEqual(['c1g5', 'g7g6'])
    expect(primeiro.state.status).toBe('em-andamento')

    const segundo = submitMove(primeiro.state, 'g5f6')
    expect(segundo.correto).toBe(true)
    expect(segundo.state.status).toBe('resolvido')
    expect(segundo.respostaDoAdversarioUci).toBeNull()
  })

  it('resolve puzzle de lance único', () => {
    const solvable = toSolvable(parsePuzzleCsvLine(CSV_PECA_PENDURADA))
    const resultado = submitMove(createAttemptState(solvable), 'd1d5')
    expect(resultado.correto).toBe(true)
    expect(resultado.state.status).toBe('resolvido')
  })

  it('normaliza maiúsculas e promoção', () => {
    const solvable = toSolvable(parsePuzzleCsvLine(CSV_PROMOCAO))
    const resultado = submitMove(createAttemptState(solvable), ' B7B8Q ')
    expect(resultado.correto).toBe(true)
    expect(resultado.state.status).toBe('resolvido')
  })

  it('registra lance errado, marca firstTry falso e falha depois do limite', () => {
    const solvable = cravada()
    let estado = createAttemptState(solvable)

    const erro1 = submitMove(estado, 'f1e1')
    expect(erro1.correto).toBe(false)
    expect(erro1.motivo).toBe('lance-errado')
    expect(erro1.state.firstTry).toBe(false)
    expect(erro1.state.status).toBe('em-andamento')
    estado = erro1.state

    const erro2 = submitMove(estado, 'f1d1')
    expect(erro2.state.wrongMoves).toEqual(['f1e1', 'f1d1'])
    expect(erro2.state.status).toBe('falhou')
    expect(ATTEMPT_CONFIG.maxErrosAntesDeFalhar).toBe(2)

    // Depois de falhar, a máquina não aceita mais nada.
    const depois = submitMove(erro2.state, 'c1g5')
    expect(depois.correto).toBe(false)
    expect(depois.motivo).toBe('tentativa-encerrada')
    expect(depois.state.status).toBe('falhou')
  })

  it('distingue lance ilegal de lance apenas errado', () => {
    const resultado = submitMove(createAttemptState(cravada()), 'a1a8')
    expect(resultado.correto).toBe(false)
    expect(resultado.motivo).toBe('lance-ilegal')
  })

  it('aceita um mate alternativo fora da linha do dataset', () => {
    // Duas torres brancas, dois mates igualmente corretos: Rd8# (a linha do
    // dump) e Ra8#. Recusar o segundo seria mentir para o jogador.
    const puzzle = {
      id: 'LZalt',
      fen: '6k1/5ppp/8/8/8/8/8/R2R2K1 b - - 0 1',
      moves: ['g8h8', 'd1d8'],
      rating: 700,
      themes: ['backRankMate', 'mateIn1'],
      skillIds: ['tactics.back-rank' as const],
    }
    const solvable = toSolvable(puzzle)
    expect(solvable.solutionUci).toEqual(['d1d8'])

    const resultado = submitMove(createAttemptState(solvable), 'a1a8')
    expect(ATTEMPT_CONFIG.aceitarMateAlternativo).toBe(true)
    expect(resultado.correto).toBe(true)
    expect(resultado.state.status).toBe('resolvido')
  })

  it('useHint sobe um nível por vez e trava no três', () => {
    let estado = createAttemptState(cravada())
    estado = useHint(estado)
    expect(estado.hintsUsed).toBe(1)
    expect(estado.firstTry).toBe(false)
    estado = useHint(useHint(useHint(estado)))
    expect(estado.hintsUsed).toBe(3)
  })

  it('giveUp encerra como falhou', () => {
    const estado = giveUp(createAttemptState(cravada()))
    expect(estado.status).toBe('falhou')
    expect(estado.gaveUp).toBe(true)
    expect(submitMove(estado, 'c1g5').correto).toBe(false)
  })

  it('toPuzzleAttempt usa o relógio injetado e nunca new Date()', () => {
    const solvable = toSolvable(parsePuzzleCsvLine(CSV_PECA_PENDURADA))
    const resolvido = submitMove(createAttemptState(solvable), 'd1d5').state
    const agora = new Date('2026-03-14T10:00:00.000Z')

    const attempt = toPuzzleAttempt(resolvido, { agora, thinkTimeMs: 8321.7 })
    expect(attempt).toMatchObject({
      puzzleId: 'LZhng',
      attemptedAt: '2026-03-14T10:00:00.000Z',
      solved: true,
      firstTry: true,
      hintsUsed: 0,
      thinkTimeMs: 8322,
      puzzleRating: 620,
      skillIds: ['tactics.hanging-piece'],
    })
    expect(attempt.id).toContain('LZhng')
  })

  it('firstTry é falso quando houve dica, mesmo resolvendo', () => {
    const solvable = toSolvable(parsePuzzleCsvLine(CSV_PECA_PENDURADA))
    const comDica = useHint(createAttemptState(solvable))
    const resolvido = submitMove(comDica, 'd1d5').state
    const attempt = toPuzzleAttempt(resolvido, {
      agora: new Date('2026-03-14T10:00:00.000Z'),
      thinkTimeMs: 1000,
    })
    expect(attempt.solved).toBe(true)
    expect(attempt.firstTry).toBe(false)
    expect(attempt.hintsUsed).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Dicas
// ---------------------------------------------------------------------------

describe('dicas', () => {
  /** Casa algébrica (`e4`) ou lance em SAN (`Nf6`, `exd5`). */
  const NOTACAO_ALGEBRICA = /[a-h][1-8]/

  it('a dica de nível 1 NUNCA contém notação algébrica', () => {
    for (const linha of CSV_PUZZLES_VALIDOS) {
      const solvable = toSolvable(parsePuzzleCsvLine(linha))
      const dica = hintAt(solvable, 1)
      expect(dica.level).toBe(1)
      expect(
        NOTACAO_ALGEBRICA.test(dica.text),
        `puzzle ${solvable.puzzle.id}: dica 1 vazou notação — "${dica.text}"`,
      ).toBe(false)
    }
  })

  it('a dica de nível 2 aponta a peça e a casa de origem', () => {
    const solvable = toSolvable(parsePuzzleCsvLine(CSV_CRAVADA))
    const dica = hintAt(solvable, 2)
    expect(dica.text).toContain('bispo')
    expect(dica.text).toContain('c1')
    // Ainda não entrega o destino.
    expect(dica.text).not.toContain('g5')
  })

  it('a dica de nível 3 entrega o primeiro lance', () => {
    const solvable = toSolvable(parsePuzzleCsvLine(CSV_CRAVADA))
    const dica = hintAt(solvable, 3)
    expect(dica.text).toContain('Bg5')
    expect(dica.text).toContain('c1g5')
  })

  it('buildHints devolve os três níveis em ordem', () => {
    const dicas = buildHints(toSolvable(parsePuzzleCsvLine(CSV_GARFO)))
    expect(dicas.map((dica) => dica.level)).toEqual([1, 2, 3])
    expect(dicas[0].text).toContain('duas coisas')
  })

  it('escolhe a categoria a partir da habilidade, não do rating', () => {
    const corredor = hintAt(toSolvable(parsePuzzleCsvLine(CSV_CORREDOR)), 1)
    expect(corredor.text).toMatch(/última fileira/)
    const pendurada = hintAt(toSolvable(parsePuzzleCsvLine(CSV_PECA_PENDURADA_PRETAS)), 1)
    expect(pendurada.text).toMatch(/sem defensor/)
  })
})

// ---------------------------------------------------------------------------
// Pipeline de ingestão (scripts/puzzles/build-dataset.mjs)
//
// O script é `.mjs` e não consegue importar o domínio em TypeScript, então ele
// espelha as regras. Este teste roda o script de verdade sobre o fixture e
// compara o resultado com o do domínio — é o que pega divergência entre os dois.
// ---------------------------------------------------------------------------

describe('build-dataset.mjs', () => {
  const raiz = process.cwd()
  const script = join(raiz, 'scripts', 'puzzles', 'build-dataset.mjs')

  interface Artefato {
    meta: {
      fonte: { sha256: string; bytes: number; dataInformada: string; licenca: string }
      contagens: Record<string, number>
      estratificacao: {
        porFaixaDeRating: Record<string, number>
        porHabilidade: Record<string, number>
        porTema: Record<string, number>
      }
    }
    puzzles: { id: string; skillIds: string[]; rating: number }[]
  }

  function rodar(): Artefato {
    const pasta = mkdtempSync(join(tmpdir(), 'lancezero-puzzles-'))
    const csv = join(pasta, 'fixture.csv')
    const saida = join(pasta, 'puzzles.json')
    writeFileSync(csv, `${CSV_COMPLETO}\n${CSV_SETUP_ILEGAL}\n`, 'utf8')

    execFileSync(
      process.execPath,
      [script, csv, '--out', saida, '--source-date', '2026-09-01', '--quiet', '--pretty'],
      { cwd: raiz, encoding: 'utf8' },
    )

    return JSON.parse(readFileSync(saida, 'utf8')) as Artefato
  }

  it('filtra, valida e estratifica o fixture com metadados de origem', () => {
    const artefato = rodar()
    const { meta } = artefato

    expect(meta.fonte.licenca).toBe('CC0-1.0')
    expect(meta.fonte.dataInformada).toBe('2026-09-01')
    expect(meta.fonte.sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(meta.fonte.bytes).toBeGreaterThan(0)

    // As três linhas quebradas viram contagem, não exceção.
    expect(meta.contagens.linhasInvalidas).toBe(3)
    // O puzzle com lance preparatório ilegal é reprovado na validação.
    expect(meta.contagens.reprovadasNaValidacao).toBe(1)
    // A promoção não tem nenhum tema que vire habilidade nossa.
    expect(meta.contagens.semTemaSuportado).toBe(1)

    expect(Object.keys(meta.estratificacao.porFaixaDeRating).length).toBeGreaterThan(1)
    expect(meta.estratificacao.porHabilidade['tactics.fork']).toBe(2)
    expect(meta.estratificacao.porTema.backRankMate).toBe(3)
  })

  it('concorda com o domínio sobre habilidades e sobre o que é válido', () => {
    const artefato = rodar()
    const doDominio = parsePuzzleCsv(CSV_COMPLETO).puzzles.filter(
      (puzzle) => puzzle.skillIds.length > 0,
    )

    expect(artefato.puzzles.map((p) => p.id).sort()).toEqual(doDominio.map((p) => p.id).sort())

    for (const doScript of artefato.puzzles) {
      const par = doDominio.find((puzzle) => puzzle.id === doScript.id)
      if (par === undefined) {
        expect.unreachable(`${doScript.id} saiu do script mas não do domínio`)
        return
      }
      expect(doScript.skillIds).toEqual(par.skillIds)
      expect(validatePuzzle(par).valido).toBe(true)
    }
  })

  it('é determinístico: duas execuções produzem os mesmos puzzles na mesma ordem', () => {
    const a = rodar()
    const b = rodar()
    expect(a.puzzles.map((p) => p.id)).toEqual(b.puzzles.map((p) => p.id))
  })

  it('respeita o filtro de rating', () => {
    const pasta = mkdtempSync(join(tmpdir(), 'lancezero-puzzles-'))
    const csv = join(pasta, 'fixture.csv')
    const saida = join(pasta, 'puzzles.json')
    writeFileSync(csv, `${CSV_SOMENTE_VALIDOS}\n`, 'utf8')

    execFileSync(
      process.execPath,
      [script, csv, '--out', saida, '--min-rating', '1300', '--quiet'],
      { cwd: raiz, encoding: 'utf8' },
    )

    const artefato = JSON.parse(readFileSync(saida, 'utf8')) as Artefato
    expect(artefato.puzzles.length).toBeGreaterThan(0)
    for (const puzzle of artefato.puzzles) {
      expect(puzzle.rating).toBeGreaterThanOrEqual(1300)
    }
  })
})
