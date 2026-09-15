'use client'

/** Biblioteca visual de cursos. Mini-tabuleiros são posições pré-calculadas e
 * não inicializam engine, rede ou explorer por card. */
import Link from 'next/link'
import { useState } from 'react'
import { ChessBoardView } from '@/components/chess/ChessBoardView'
import { OPENING_COURSES } from '@/content/openings/course'
import type { OpeningDefinition, OpeningSide } from '@/domain/openings'
import styles from './OpeningCatalog.module.css'

type Filter = 'all' | OpeningSide

export function OpeningCatalog() {
  const [filter, setFilter] = useState<Filter>('all')
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
          <OpeningCard key={opening.id} opening={opening} />
        ))}
      </div>
    </section>
  )
}

function OpeningCard({ opening }: { opening: OpeningDefinition }) {
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
          <span aria-hidden="true">○</span> Não iniciada
        </span>
      </div>
    </Link>
  )
}
