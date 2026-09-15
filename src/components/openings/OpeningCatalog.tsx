'use client'

/** Biblioteca visual de cursos. Mini-tabuleiros são posições pré-calculadas e
 * não inicializam engine, rede ou explorer por card. */
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChessBoardView } from '@/components/chess/ChessBoardView'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { OPENING_COURSES } from '@/content/openings/course'
import type {
  OpeningDefinition,
  OpeningProgress,
  OpeningSide,
  OpeningStatus,
} from '@/domain/openings'
import styles from './OpeningCatalog.module.css'

type Filter = 'all' | OpeningSide
type StatusFilter = 'all' | OpeningStatus
type DifficultyFilter = 'all' | 'beginner' | 'intermediate' | 'advanced'
type FirstMoveFilter = 'all' | 'e4' | 'd4' | 'c4' | 'Nf3'

export function OpeningCatalog() {
  const { repo } = useRepository()
  const [filter, setFilter] = useState<Filter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all')
  const [firstMoveFilter, setFirstMoveFilter] = useState<FirstMoveFilter>('all')
  const [progress, setProgress] = useState<Record<string, OpeningProgress>>({})
  useEffect(() => {
    let cancelled = false
    if (!repo)
      return () => {
        cancelled = true
      }
    void repo.listOpeningProgress().then((items) => {
      window.setTimeout(() => {
        if (cancelled) return
        setProgress(Object.fromEntries(items.map((item) => [item.openingId, item])))
      }, 0)
    })
    return () => {
      cancelled = true
    }
  }, [repo])
  const courses = OPENING_COURSES.filter((opening) => {
    const current = progress[opening.id]
    const status = current?.status ?? 'not_started'
    const difficulty =
      opening.difficulty <= 1 ? 'beginner' : opening.difficulty === 2 ? 'intermediate' : 'advanced'
    const firstMove = opening.mainline[0]?.san
    return (
      (filter === 'all' || opening.side === filter) &&
      (statusFilter === 'all' || status === statusFilter) &&
      (difficultyFilter === 'all' || difficulty === difficultyFilter) &&
      (firstMoveFilter === 'all' || firstMove === firstMoveFilter)
    )
  })
  return (
    <section aria-labelledby="catalogo-aberturas">
      <div className={styles.filters} aria-label="Filtrar aberturas">
        {(
          [
            ['all', 'Todas'],
            ['white', 'Brancas'],
            ['black', 'Pretas'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={filter === value ? styles.filterActive : styles.filter}
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={styles.selectFilters} aria-label="Filtros detalhados">
        <label>
          Primeiro lance
          <select
            value={firstMoveFilter}
            onChange={(event) => setFirstMoveFilter(event.target.value as FirstMoveFilter)}
          >
            <option value="all">Todos</option>
            <option value="e4">1.e4</option>
            <option value="d4">1.d4</option>
            <option value="c4">1.c4</option>
            <option value="Nf3">1.Cf3</option>
          </select>
        </label>
        <label>
          Nível
          <select
            value={difficultyFilter}
            onChange={(event) => setDifficultyFilter(event.target.value as DifficultyFilter)}
          >
            <option value="all">Todos</option>
            <option value="beginner">Iniciante</option>
            <option value="intermediate">Intermediária</option>
            <option value="advanced">Avançada</option>
          </select>
        </label>
        <label>
          Status
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          >
            <option value="all">Todos</option>
            <option value="not_started">Não iniciadas</option>
            <option value="learning">Aprendendo</option>
            <option value="training">Treinando</option>
            <option value="consolidating">Consolidando</option>
            <option value="active_repertoire">Repertório ativo</option>
          </select>
        </label>
      </div>
      <h2 id="catalogo-aberturas" className="sr-only">
        Cursos de abertura
      </h2>
      <div className={styles.grid}>
        {courses.map((opening) => (
          <OpeningCard key={opening.id} opening={opening} progress={progress[opening.id]} />
        ))}
      </div>
      {courses.length === 0 ? <p role="status">Nenhuma abertura corresponde aos filtros.</p> : null}
    </section>
  )
}

function OpeningCard({
  opening,
  progress,
}: {
  opening: OpeningDefinition
  progress?: OpeningProgress
}) {
  const learned = progress?.learnedNodeIds.length ?? 0
  const total = opening.mainline.length
  const status = progress?.status ?? 'not_started'
  const labels = {
    not_started: 'Não iniciada',
    learning: 'Aprendendo',
    training: 'Treinando',
    consolidating: 'Consolidando',
    active_repertoire: 'Repertório ativo',
  } as const
  return (
    <Link
      href={`/aberturas/${opening.slug}`}
      className={styles.card}
      aria-label={`Abrir curso ${opening.name}`}
    >
      <div className={styles.preview}>
        <ChessBoardView
          fen={opening.previewFen}
          orientation={opening.side === 'white' ? 'w' : 'b'}
          interactive={false}
        />
      </div>
      <div className={styles.body}>
        <div className={styles.meta}>
          <span>{opening.side === 'white' ? 'Brancas' : 'Pretas'}</span>
          <span>Essencial</span>
        </div>
        <h3>{opening.name}</h3>
        <p>{opening.description}</p>
        <span className={styles.status}>
          <span aria-hidden="true">{learned > 0 ? '✓' : '○'}</span> {labels[status]}
        </span>
        <span aria-label={`${learned} de ${total} posições ensinadas`}>
          {learned} de {total} posições
        </span>
      </div>
    </Link>
  )
}
