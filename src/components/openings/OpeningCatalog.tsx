'use client'

/** Biblioteca visual de cursos. Mini-tabuleiros são posições pré-calculadas e
 * não inicializam engine, rede ou explorer por card. */
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChessBoardView } from '@/components/chess/ChessBoardView'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { OPENING_COURSES } from '@/content/openings/course'
import type { OpeningDefinition, OpeningProgress, OpeningSide } from '@/domain/openings'
import styles from './OpeningCatalog.module.css'

type Filter = 'all' | OpeningSide

export function OpeningCatalog() {
  const { repo } = useRepository()
  const [filter, setFilter] = useState<Filter>('all')
  const [progress, setProgress] = useState<Record<string, OpeningProgress>>({})
  useEffect(() => {
    let cancelled = false
    if (!repo) return () => { cancelled = true }
    void repo.listOpeningProgress().then((items) => {
      window.setTimeout(() => {
        if (cancelled) return
        setProgress(Object.fromEntries(items.map((item) => [item.openingId, item])))
      }, 0)
    })
    return () => { cancelled = true }
  }, [repo])
  const courses = OPENING_COURSES.filter((opening) => filter === 'all' || opening.side === filter)
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
      <h2 id="catalogo-aberturas" className="sr-only">
        Cursos de abertura
      </h2>
      <div className={styles.grid}>
        {courses.map((opening) => (
          <OpeningCard key={opening.id} opening={opening} progress={progress[opening.id]} />
        ))}
      </div>
    </section>
  )
}

function OpeningCard({ opening, progress }: { opening: OpeningDefinition; progress?: OpeningProgress }) {
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
