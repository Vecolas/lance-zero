'use client'

/** Curso interativo: Aprender revela o raciocínio; Treinar só revela feedback
 * depois da tentativa. O componente não chama Stockfish nem Opening Explorer. */
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { ChessBoardView } from '@/components/chess/ChessBoardView'
import { ExplorerPanel } from '@/components/openings/ExplorerPanel'
import { applyMove, identidadeDePosicao, legalMoves, type SquareName } from '@/lib/chess'
import {
  chooseOpeningTrainingOpponent,
  classifyOpeningAttempt,
  completeOpeningActivity,
  emptyOpeningProgress,
  markOpeningAttempt,
  markOpeningLearned,
  markOpeningLessonProgress,
  openingDiagnosticQuestions,
  openingHint,
  type OpeningDefinition,
  type OpeningMoveLesson,
  type OpeningProgress,
} from '@/domain/openings'
import { seedOpeningReviewCards } from '@/lib/training/opening-reviews'
import styles from './OpeningCourse.module.css'

type Tab = 'overview' | 'learn' | 'train' | 'variations' | 'plans' | 'mistakes' | 'progress'
const tabs: readonly [Tab, string][] = [
  ['overview', 'Visão geral'],
  ['learn', 'Aprender'],
  ['train', 'Treinar'],
  ['variations', 'Variações'],
  ['plans', 'Planos'],
  ['mistakes', 'Erros comuns'],
  ['progress', 'Progresso'],
]

export function OpeningCourse({ opening }: { opening: OpeningDefinition }) {
  const { repo } = useRepository()
  const [tab, setTab] = useState<Tab>('overview')
  const [diagnosticOpen, setDiagnosticOpen] = useState(false)
  const [progress, setProgress] = useState<OpeningProgress>(() => emptyOpeningProgress(opening.id))
  const [progressLoaded, setProgressLoaded] = useState(false)
  useEffect(() => {
    const mode = new URLSearchParams(window.location.search).get('mode')
    if (mode !== 'learn' && mode !== 'train') return
    window.setTimeout(() => setTab(mode), 0)
  }, [])
  useEffect(() => {
    let cancelled = false
    if (!repo)
      return () => {
        cancelled = true
      }
    void repo.getOpeningProgress(opening.id).then((saved) => {
      if (cancelled) return
      window.setTimeout(() => {
        if (cancelled) return
        setProgress(
          saved
            ? { ...emptyOpeningProgress(opening.id), ...saved }
            : emptyOpeningProgress(opening.id),
        )
        setProgressLoaded(true)
      }, 0)
    })
    return () => {
      cancelled = true
    }
  }, [opening.id, repo])
  useEffect(() => {
    if (!repo || !progressLoaded) return
    void repo.saveOpeningProgress(progress)
    void seedOpeningReviewCards(repo, opening, progress, new Date())
  }, [opening, progress, progressLoaded, repo])
  return (
    <div className={styles.page}>
      <Link href="/aberturas" className={styles.back}>
        ← Todas as aberturas
      </Link>
      <header className={styles.hero}>
        <div>
          <p className={styles.kicker}>
            {opening.side === 'white' ? 'Brancas' : 'Pretas'} · {opening.ecoCodes.join(' / ')}
          </p>
          <h1>{opening.name}</h1>
          <p>{opening.description}</p>
        </div>
        <div className={styles.heroActions}>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => setDiagnosticOpen(true)}
          >
            Já conheço
          </button>
          <button type="button" className={styles.primary} onClick={() => setTab('learn')}>
            Aprender
          </button>
          <button type="button" className={styles.secondary} onClick={() => setTab('train')}>
            Treinar
          </button>
        </div>
      </header>
      <nav className={styles.tabs} aria-label="Seções da abertura">
        {tabs.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={tab === value ? styles.tabActive : styles.tab}
            aria-current={tab === value ? 'page' : undefined}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === 'overview' && <Overview opening={opening} onLearn={() => setTab('learn')} />}
      {tab === 'learn' && (
        <LearnMode opening={opening} initialPly={progress.lessonPly} onProgress={setProgress} />
      )}
      {tab === 'train' && (
        <TrainMode opening={opening} progress={progress} onProgress={setProgress} />
      )}
      {tab === 'variations' && <Variations opening={opening} />}
      {tab === 'plans' && <Plans opening={opening} />}
      {tab === 'mistakes' && <Mistakes opening={opening} />}
      {tab === 'progress' && !diagnosticOpen && <Progress opening={opening} progress={progress} />}
      {diagnosticOpen && (
        <DiagnosticMode
          opening={opening}
          onProgress={setProgress}
          onLearn={() => {
            setDiagnosticOpen(false)
            setTab('learn')
          }}
          onClose={() => setDiagnosticOpen(false)}
        />
      )}
    </div>
  )
}

function DiagnosticMode({
  opening,
  onProgress,
  onLearn,
  onClose,
}: {
  opening: OpeningDefinition
  onProgress: (fn: (current: OpeningProgress) => OpeningProgress) => void
  onLearn: () => void
  onClose: () => void
}) {
  const questions = openingDiagnosticQuestions(opening)
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const question = questions[index]

  if (!question) {
    return (
      <section className={styles.section} aria-labelledby="diagnostic-title">
        <div className={styles.infoCard}>
          <p className={styles.kicker}>DIAGNÓSTICO</p>
          <h2 id="diagnostic-title">Não há posições suficientes para testar ainda.</h2>
          <p>Comece pelo modo Aprender para construir as primeiras posições do repertório.</p>
          <button type="button" className={styles.primary} onClick={onLearn}>
            Começar a aprender
          </button>
        </div>
      </section>
    )
  }

  const choose = (uci: string) => {
    if (answer) return
    const result = classifyOpeningAttempt(opening, question.nodeId, uci)
    setAnswer(uci)
    if (result.classification === 'preferred' || result.classification === 'acceptable') {
      const now = new Date().toISOString()
      onProgress((current) =>
        markOpeningLessonProgress(
          markOpeningLearned(current, question.nodeId, now),
          question.ply,
          now,
        ),
      )
      setMessage(
        result.classification === 'preferred'
          ? 'Você reconheceu a decisão do repertório.'
          : 'Boa decisão: este lance é jogável e pertence a uma variação estudada.',
      )
    } else {
      setMessage(
        'Ainda não vamos chamar isso de esquecimento. Esta posição será melhor entendida no modo Aprender.',
      )
    }
  }

  const next = () => {
    if (index + 1 >= questions.length) {
      setMessage(
        'Diagnóstico concluído. Você pode pular direto para o treino ou revisar as posições não reconhecidas.',
      )
      return
    }
    setIndex((current) => current + 1)
    setAnswer(null)
    setMessage(null)
  }

  return (
    <section className={styles.learning} aria-labelledby="diagnostic-title">
      <div className={styles.boardPanel}>
        <ChessBoardView
          fen={question.fen}
          orientation={opening.side === 'white' ? 'w' : 'b'}
          interactive={false}
        />
      </div>
      <aside className={styles.commentary}>
        <p className={styles.kicker}>
          DIAGNÓSTICO · {index + 1} DE {questions.length}
        </p>
        <h2 id="diagnostic-title">Já conhece esta abertura?</h2>
        <p>{question.prompt}</p>
        <div className={styles.cards}>
          {question.moves.map((move) => (
            <button
              key={move.uci}
              type="button"
              className={styles.secondary}
              onClick={() => choose(move.uci)}
              disabled={answer !== null}
            >
              {move.san}
            </button>
          ))}
        </div>
        {message && (
          <p className={styles.feedback} role="status">
            {message}
          </p>
        )}
        <div className={styles.controls}>
          <button type="button" className={styles.secondary} onClick={onClose}>
            Voltar ao progresso
          </button>
          {answer && index + 1 < questions.length && (
            <button type="button" className={styles.primary} onClick={next}>
              Próxima posição
            </button>
          )}
          {answer && index + 1 >= questions.length && (
            <button type="button" className={styles.primary} onClick={onLearn}>
              Ir para Aprender
            </button>
          )}
        </div>
      </aside>
    </section>
  )
}

function Overview({ opening, onLearn }: { opening: OpeningDefinition; onLearn: () => void }) {
  const explorerPositions = [
    {
      identidade: identidadeDePosicao(opening.rootFen),
      fen: opening.rootFen,
      rotulo: 'Posição inicial',
    },
    ...opening.mainline.slice(0, 8).map((move, index) => {
      const fen = fenAtLessons(opening.mainline, index + 1)
      return { identidade: identidadeDePosicao(fen), fen, rotulo: `${index + 1}. ${move.san}` }
    }),
  ].filter(
    (position, index, all) =>
      all.findIndex((item) => item.identidade === position.identidade) === index,
  )
  return (
    <section className={styles.section}>
      <div className={styles.overviewGrid}>
        <div>
          <h2>Antes de decorar</h2>
          <p>{opening.philosophy}</p>
          <h3>O que você vai reconhecer</h3>
          <ul>
            {opening.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
          <button type="button" className={styles.primary} onClick={onLearn}>
            Começar a entender
          </button>
        </div>
        <div className={styles.infoCard}>
          <h3>Transição para o meio-jogo</h3>
          <p>{opening.transitionToMiddlegame}</p>
          <p className={styles.note}>
            Engine é validação. Aqui, o professor é a posição e o motivo de cada decisão.
          </p>
        </div>
      </div>
      <div className={styles.structureGrid}>
        {opening.structures.map((structure) => (
          <article key={structure.name} className={styles.infoCard}>
            <h3>{structure.name}</h3>
            <p>{structure.description}</p>
            <strong>Rupturas</strong>
            <p>{structure.pawnBreaks.join(' · ')}</p>
            <strong>Casas de atenção</strong>
            <p>{structure.weakSquares.join(' · ')}</p>
          </article>
        ))}
      </div>
      <ExplorerPanel posicoes={explorerPositions} />
    </section>
  )
}

function LearnMode({
  opening,
  initialPly,
  onProgress,
}: {
  opening: OpeningDefinition
  initialPly: number
  onProgress: (fn: (current: OpeningProgress) => OpeningProgress) => void
}) {
  const [ply, setPly] = useState(initialPly)
  const lesson = opening.mainline[ply - 1]
  const fen = fenAtLessons(opening.mainline, ply)
  const lastMove = lesson ? moveSquares(opening.mainline, ply) : []
  return (
    <section className={styles.learning}>
      <div className={styles.boardPanel}>
        <ChessBoardView
          fen={fen}
          orientation={opening.side === 'white' ? 'w' : 'b'}
          interactive={false}
          lastMove={lastMove}
        />
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => setPly(Math.max(0, ply - 1))}
            disabled={ply === 0}
          >
            ← Anterior
          </button>
          <span>
            Lance {ply} de {opening.mainline.length}
          </span>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => {
              if (ply < opening.mainline.length)
                onProgress((current) =>
                  markOpeningLessonProgress(
                    markOpeningLearned(
                      current,
                      nodeAt(opening.mainline, ply + 1),
                      new Date().toISOString(),
                    ),
                    ply + 1,
                    new Date().toISOString(),
                  ),
                )
              if (ply + 1 === opening.mainline.length) {
                onProgress((current) =>
                  completeOpeningActivity(current, `${opening.id}:learn`, new Date().toISOString()),
                )
              }
              setPly(Math.min(opening.mainline.length, ply + 1))
            }}
            disabled={ply === opening.mainline.length}
          >
            Próximo →
          </button>
        </div>
      </div>
      <aside className={styles.commentary}>
        <p className={styles.kicker}>MODO APRENDER</p>
        <h2>{lesson ? lesson.san : 'Posição inicial'}</h2>
        <p className={styles.question}>{lesson ? 'POR QUÊ?' : 'O QUE VAMOS OBSERVAR?'}</p>
        <p>{lesson?.comment ?? opening.philosophy}</p>
        {lesson?.strategicIdea && (
          <>
            <p className={styles.question}>O QUE ISSO PREPARA?</p>
            <p>{lesson.strategicIdea}</p>
          </>
        )}
        {lesson?.resultingPlan && (
          <>
            <p className={styles.question}>PLANO</p>
            <p>{lesson.resultingPlan}</p>
          </>
        )}
        {lesson?.warning && (
          <>
            <p className={styles.question}>CUIDADO</p>
            <p className={styles.warning}>{lesson.warning}</p>
          </>
        )}
        {lesson?.alternatives?.length ? (
          <>
            <p className={styles.question}>ALTERNATIVAS</p>
            <ul>
              {lesson.alternatives.map((alternative) => (
                <li key={alternative.san}>
                  <strong>{alternative.san}</strong> — {alternative.explanation}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <div className={styles.moveStrip} aria-label="Lista de lances">
          {opening.mainline.map((move, index) => (
            <button
              key={`${move.san}-${index}`}
              type="button"
              className={
                index < ply ? styles.moveDone : index === ply ? styles.moveCurrent : styles.move
              }
              onClick={() => {
                setPly(index + 1)
                onProgress((current) =>
                  markOpeningLessonProgress(current, index + 1, new Date().toISOString()),
                )
              }}
            >
              {formatPly(index, move.san)}
            </button>
          ))}
        </div>
        {ply === opening.mainline.length && (
          <p className={styles.transition}>
            <strong>Daqui em diante:</strong> {opening.transitionToMiddlegame}
          </p>
        )}
      </aside>
    </section>
  )
}

function TrainMode({
  opening,
  progress,
  onProgress,
}: {
  opening: OpeningDefinition
  progress: OpeningProgress
  onProgress: (fn: (current: OpeningProgress) => OpeningProgress) => void
}) {
  const rootFen = opening.rootFen
  const [ply, setPly] = useState(0)
  const [fen, setFen] = useState(rootFen)
  const [nodeId, setNodeId] = useState(opening.rootNodeId)
  const [selected, setSelected] = useState<SquareName | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [hintLevel, setHintLevel] = useState(0)
  const userColor = opening.side === 'white' ? 'w' : 'b'
  const targets = selected ? legalMoves(fen, selected).map((move) => move.to) : []
  useEffect(() => {
    if (done || (fen.split(' ')[1] ?? 'w') === userColor) return
    const timer = window.setTimeout(() => {
      const response = chooseOpeningTrainingOpponent(opening, nodeId, progress)
      if (!response) return
      const applied = applyUci(fen, response.uci)
      if (!applied) return
      setFen(applied.fenAfter)
      setNodeId(response.nextNodeId)
      setPly((current) => current + 1)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [done, fen, nodeId, opening, progress, userColor])
  const tryMove = (from: SquareName, to: SquareName) => {
    if ((fen.split(' ')[1] ?? 'w') !== userColor || done) return false
    const applied = applyMove(fen, { from, to, promotion: 'q' })
    if (!applied) return false
    const result = classifyOpeningAttempt(opening, nodeId, applied.move.uci)
    setFeedback(result.message)
    onProgress((current) =>
      markOpeningAttempt(current, nodeId, result.classification, new Date().toISOString()),
    )
    setFen(applied.fenAfter)
    if (result.nextNodeId) setNodeId(result.nextNodeId)
    setPly((current) => current + 1)
    setSelected(null)
    if (!result.nextNodeId || ply + 1 >= opening.mainline.length) {
      setDone(true)
      onProgress((current) =>
        completeOpeningActivity(current, `${opening.id}:training`, new Date().toISOString()),
      )
    }
    return true
  }
  const handleSquare = (square: SquareName) => {
    if (selected && selected !== square && tryMove(selected, square)) return
    setSelected(legalMoves(fen, square).length > 0 ? square : null)
  }
  return (
    <section className={styles.learning}>
      <div className={styles.boardPanel}>
        <div className={styles.trainingBadge}>TREINO · sem dicas</div>
        <ChessBoardView
          fen={fen}
          orientation={opening.side === 'white' ? 'w' : 'b'}
          selected={selected}
          targets={targets}
          onMove={tryMove}
          onSquareClick={handleSquare}
        />
        <p className={styles.note}>
          Nenhuma seta, engine bar ou próximo lance aparece antes da sua tentativa.
        </p>
      </div>
      <aside className={styles.commentary}>
        <p className={styles.kicker}>MODO TREINAR</p>
        <h2>Qual é sua decisão?</h2>
        <p>Recupere o plano antes de mover. O feedback só aparece depois da tentativa.</p>
        {feedback && (
          <p className={styles.feedback} role="status">
            {feedback}
          </p>
        )}
        {done && (
          <div className={styles.result}>
            <h3>Atividade concluída ✓</h3>
            <p>
              Concluir o treino não significa dominar a abertura.{' '}
              {progress.weakNodeIds.length
                ? 'As posições difíceis entraram em reforço.'
                : 'Continue para consolidar em revisões futuras.'}
            </p>
          </div>
        )}
        <button
          type="button"
          className={styles.secondary}
          onClick={() => {
            setPly(0)
            setFen(rootFen)
            setNodeId(opening.rootNodeId)
            setFeedback(null)
            setDone(false)
            setHintLevel(0)
          }}
        >
          Recomeçar
        </button>
        {!done ? (
          <button
            type="button"
            className={styles.secondary}
            onClick={() => setHintLevel((current) => Math.min(4, current + 1))}
          >
            {hintLevel === 0 ? 'Pedir uma dica' : 'Pedir próxima dica'}
          </button>
        ) : null}
        {hintLevel > 0 ? (
          <p className={styles.note} role="status">
            Dica {hintLevel}: {openingHint(opening, nodeId, hintLevel)}
          </p>
        ) : null}
      </aside>
    </section>
  )
}

function Variations({ opening }: { opening: OpeningDefinition }) {
  return (
    <section className={styles.section}>
      <h2>Variações ensinadas</h2>
      <div className={styles.cards}>
        {opening.variations.map((variation) => (
          <article key={variation.id} className={styles.infoCard}>
            <h3>{variation.name}</h3>
            <ChessBoardView
              fen={opening.graph.get(variation.rootNodeId)?.fen ?? opening.rootFen}
              orientation={opening.side === 'white' ? 'w' : 'b'}
              interactive={false}
            />
            <p>{variation.description}</p>
            <p className={styles.mono}>{variation.line.map((move) => move.san).join(' ')}</p>
          </article>
        ))}
      </div>
      {opening.variations.length === 0 && (
        <p className={styles.note}>
          Este curso começa pela linha principal. Novos branches entram quando houver valor
          pedagógico.
        </p>
      )}
    </section>
  )
}
function Plans({ opening }: { opening: OpeningDefinition }) {
  return (
    <section className={styles.section}>
      <h2>Planos e estruturas</h2>
      <div className={styles.cards}>
        {opening.plans.map((plan) => (
          <article key={plan.id} className={styles.infoCard}>
            <h3>{plan.name}</h3>
            <ChessBoardView
              fen={opening.graph.get(plan.positionNodeId)?.fen ?? opening.rootFen}
              orientation={opening.side === 'white' ? 'w' : 'b'}
              interactive={false}
            />
            <p>
              <strong>Objetivo:</strong> {plan.objective}
            </p>
            <p>
              <strong>Quando:</strong> {plan.when}
            </p>
            <p className={styles.warning}>
              <strong>Cuidado:</strong> {plan.risk}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
function Mistakes({ opening }: { opening: OpeningDefinition }) {
  return (
    <section className={styles.section}>
      <h2>Erros comuns</h2>
      <div className={styles.cards}>
        {opening.mistakes.map((mistake) => (
          <article key={mistake.id} className={styles.infoCard}>
            <h3>{mistake.moveSan}</h3>
            <ChessBoardView
              fen={opening.graph.get(mistake.nodeId)?.fen ?? opening.rootFen}
              orientation={opening.side === 'white' ? 'w' : 'b'}
              interactive={false}
            />
            <p>{mistake.explanation}</p>
            <p>
              <strong>Princípio:</strong> {mistake.principle}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
function Progress({
  opening,
  progress,
}: {
  opening: OpeningDefinition
  progress: OpeningProgress
}) {
  return (
    <section className={styles.section}>
      <h2>Progresso por posição</h2>
      <div className={styles.progress}>
        <strong>
          {progress.confidence === 0
            ? 'Comece pelo entendimento'
            : `${Math.round(progress.confidence * 100)}% de confiança provisória`}
        </strong>
        <p>
          {progress.learnedNodeIds.length} posições vistas · {progress.trainedNodeIds.length}{' '}
          treinadas · {progress.weakNodeIds.length} em reforço
        </p>
        <p className={styles.note}>
          A atividade pode estar concluída sem a abertura estar dominada. O que importa é o retorno
          das posições em partidas e revisões.
        </p>
      </div>
      <p>{opening.transitionToMiddlegame}</p>
    </section>
  )
}

function fenAtLessons(lessons: readonly OpeningMoveLesson[], ply: number): string {
  let fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  for (let index = 0; index < ply; index += 1) {
    const applied = applyMove(fen, lessons[index].san)
    if (!applied) break
    fen = applied.fenAfter
  }
  return fen
}
function nodeAt(lessons: readonly OpeningMoveLesson[], ply: number): string {
  return fenAtLessons(lessons, ply).split(' ').slice(0, 4).join(' ')
}
function moveSquares(lessons: readonly OpeningMoveLesson[], ply: number): SquareName[] {
  const fen = fenAtLessons(lessons, ply - 1)
  const applied = applyMove(fen, lessons[ply - 1].san)
  return applied ? [applied.move.from, applied.move.to] : []
}

function applyUci(fen: string, uci: string) {
  if (uci.length < 4) return null
  return applyMove(fen, {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: (uci.slice(4, 5) || 'q') as 'q' | 'r' | 'b' | 'n',
  })
}
function formatPly(ply: number, san: string): string {
  return ply % 2 === 0
    ? `${Math.floor(ply / 2) + 1}. ${san}`
    : `${Math.floor(ply / 2) + 1}... ${san}`
}
