'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ChessBoardView } from '@/components/chess/ChessBoardView'
import { ENDGAME_DEFINITIONS } from '@/content/endgames/biblioteca'
import type { EndgameCategory, EndgameDefinition, EndgameStatus } from '@/domain/endgames'
import styles from './EndgameLibrary.module.css'

const FILTERS: Array<[string, string, (d: EndgameDefinition) => boolean]> = [
  ['all', 'Todos', () => true],
  ['essential', 'Essenciais', (d) => d.level === 'essential'],
  ['pawn', 'Peões', (d) => d.category === 'pawn'],
  ['rook', 'Torres', (d) => d.category === 'rook'],
  ['queen', 'Damas', (d) => d.category === 'queen'],
  ['bishop', 'Bispos', (d) => d.category === 'bishop'],
  ['knight', 'Cavalos', (d) => d.category === 'knight'],
  ['defense', 'Defesa', (d) => d.category === 'defense'],
  ['conversion', 'Conversão', (d) => d.category === 'conversion' || d.tags.includes('Conversão')],
]

const STATUS: Record<EndgameStatus, string> = {
  'not-started': 'Não iniciado', learning: 'Aprendendo', practicing: 'Praticando', review: 'Revisar', consolidated: 'Consolidado',
}

export function EndgameLibrary() {
  const [filter, setFilter] = useState('all')
  const [status, setStatus] = useState<EndgameStatus | 'all'>('all')
  const [statuses] = useState<Record<string, EndgameStatus>>(() => {
    if (typeof window === 'undefined') return {}
    try { return JSON.parse(window.localStorage.getItem('lancezero:endgame-statuses') ?? '{}') as Record<string, EndgameStatus> } catch { return {} }
  })
  const definitions = useMemo(() => {
    const predicate = FILTERS.find(([id]) => id === filter)?.[2] ?? (() => true)
    return ENDGAME_DEFINITIONS.filter((definition) => predicate(definition) && (status === 'all' || (statuses[definition.id] ?? 'not-started') === status))
  }, [filter, status, statuses])
  return (
    <section aria-labelledby="biblioteca-finais">
      <div className={styles.toolbar}>
        <div className={styles.filters} aria-label="Filtrar finais">
          {FILTERS.map(([id, label]) => <button key={id} type="button" className={filter === id ? styles.active : styles.filter} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}
        </div>
        <label className={styles.statusFilter}>Status
          <select value={status} onChange={(event) => setStatus(event.target.value as EndgameStatus | 'all')}>
            <option value="all">Todos</option>
            {Object.entries(STATUS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
      </div>
      <h2 id="biblioteca-finais" className="sr-only">Biblioteca de finais</h2>
      <div className={styles.grid}>
        {definitions.map((definition) => <EndgameCard key={definition.id} definition={definition} status={statuses[definition.id] ?? 'not-started'} />)}
      </div>
    </section>
  )
}

function EndgameCard({ definition, status }: { definition: EndgameDefinition; status: EndgameStatus }) {
  return (
    <Link href={`/finais/${definition.slug}`} className={styles.card} aria-label={`Abrir final ${definition.name}`}>
      <div className={styles.preview}><ChessBoardView fen={definition.previewFen} orientation="w" interactive={false} /></div>
      <div className={styles.body}>
        <div className={styles.meta}><span>{definition.level === 'essential' ? 'Essencial' : definition.level === 'fundamental' ? 'Fundamental' : 'Avançado'}</span><span>{definition.tags[1] ?? 'Princípios'}</span></div>
        <h3>{definition.name}</h3><p>{definition.description}</p>
        <span className={styles.status}><span aria-hidden="true">{status === 'consolidated' ? '✓' : status === 'review' ? '↻' : '○'}</span> {STATUS[status]}</span>
      </div>
    </Link>
  )
}

export type { EndgameCategory }
