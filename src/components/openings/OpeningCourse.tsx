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
  chooseOpponentResponse,
  classifyOpeningAttempt,
  completeOpeningActivity,
  emptyOpeningProgress,
  markOpeningAttempt,
  markOpeningLearned,
  trainingNode,
  type OpeningDefinition,
  type OpeningMoveLesson,
  type OpeningProgress,
} from '@/domain/openings'
import { openingReviewCards } from '@/domain/openings/review'
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
  const [progress, setProgress] = useState<OpeningProgress>(() => emptyOpeningProgress(opening.id))
  const [progressLoaded, setProgressLoaded] = useState(false)
  useEffect(() => {
    const mode = new URLSearchParams(window.location.search).get('mode')
    if (mode !== 'learn' && mode !== 'train') return
    window.setTimeout(() => setTab(mode), 0)
  }, [])
  useEffect(() => {
    let cancelled = false
    if (!repo) return () => { cancelled = true }
    void repo.getOpeningProgress(opening.id).then((saved) => {
      if (cancelled) return
      window.setTimeout(() => {
        if (cancelled) return
        setProgress(saved ?? emptyOpeningProgress(opening.id))
        setProgressLoaded(true)
      }, 0)
    })
    return () => { cancelled = true }
  }, [opening.id, repo])
  useEffect(() => {
    if (!repo || !progressLoaded) return
    void repo.saveOpeningProgress(progress)
    for (const card of openingReviewCards(opening, progress, new Date())) void repo.saveReviewCard(card)
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
      {tab === 'learn' && <LearnMode opening={opening} onProgress={setProgress} />}
      {tab === 'train' && (
        <TrainMode opening={opening} progress={progress} onProgress={setProgress} />
      )}
      {tab === 'variations' && <Variations opening={opening} />}
      {tab === 'plans' && <Plans opening={opening} />}
      {tab === 'mistakes' && <Mistakes opening={opening} />}
      {tab === 'progress' && <Progress opening={opening} progress={progress} />}
    </div>
  )
}

function Overview({ opening, onLearn }: { opening: OpeningDefinition; onLearn: () => void }) {
  const explorerPositions = [
    { identidade: identidadeDePosicao(opening.previewFen), fen: opening.previewFen, rotulo: 'Posição inicial' },
    ...opening.mainline.slice(0, 8).map((move, index) => {
      const fen = fenAtLessons(opening.mainline, index + 1)
      return { identidade: identidadeDePosicao(fen), fen, rotulo: `${index + 1}. ${move.san}` }
    }),
  ].filter((position, index, all) => all.findIndex((item) => item.identidade === position.identidade) === index)
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
  onProgress,
}: {
  opening: OpeningDefinition
  onProgress: (fn: (current: OpeningProgress) => OpeningProgress) => void
}) {
  const [ply, setPly] = useState(0)
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
                  markOpeningLearned(
                    current,
                    nodeAt(opening.mainline, ply + 1),
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
              onClick={() => setPly(index + 1)}
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
  const [ply, setPly] = useState(0)
  const [fen, setFen] = useState(opening.previewFen)
  const [nodeId, setNodeId] = useState(opening.rootNodeId)
  const [selected, setSelected] = useState<SquareName | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const userColor = opening.side === 'white' ? 'w' : 'b'
  const targets = selected ? legalMoves(fen, selected).map((move) => move.to) : []
  useEffect(() => {
    if (done || (fen.split(' ')[1] ?? 'w') === userColor) return
    const timer = window.setTimeout(() => {
      const response = chooseOpponentResponse(
        trainingNode(opening, nodeId) ?? {
          fen,
          preferredMoves: [],
          acceptableMoves: [],
          opponentResponses: [],
          explanationAfterAttempt: '',
        },
      )
      if (!response) return
      const applied = applyUci(fen, response.uci)
      if (!applied) return
      setFen(applied.fenAfter)
      setNodeId(response.nextNodeId)
      setPly((current) => current + 1)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [done, fen, nodeId, opening, userColor])
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
            setFen(opening.previewFen)
            setNodeId(opening.rootNodeId)
            setFeedback(null)
            setDone(false)
          }}
        >
          Recomeçar
        </button>
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
