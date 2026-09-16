'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ChessBoardView } from '@/components/chess/ChessBoardView'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { ENDGAME_DEFINITIONS } from '@/content/endgames/biblioteca'
import { rotuloDeRetomada, type StudyJourney } from '@/domain/jornada'
import { idDaJornadaDeFinal } from '@/components/endgames/EndgameStudyJourney'
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
  'not-started': 'Não iniciado',
  learning: 'Aprendendo',
  practicing: 'Praticando',
  review: 'Revisar',
  consolidated: 'Consolidado',
}

export function EndgameLibrary() {
  const { repo } = useRepository()
  const [filter, setFilter] = useState('all')
  const [status, setStatus] = useState<EndgameStatus | 'all'>('all')
  const [jornadas, setJornadas] = useState<Record<string, StudyJourney>>({})

  useEffect(() => {
    if (!repo) return
    let cancelado = false
    void repo.listStudyJourneys().then((todas) => {
      if (cancelado) return
      setJornadas(
        Object.fromEntries(
          todas
            // Só as de FINAL. A store é compartilhada com as aberturas, e
            // misturar os dois catálogos é exatamente o que o produto recusa.
            .filter((jornada) => jornada.dominio === 'final')
            .map((jornada) => [jornada.id, jornada]),
        ),
      )
    })
    return () => {
      cancelado = true
    }
  }, [repo])
  const [statuses] = useState<Record<string, EndgameStatus>>(() => {
    if (typeof window === 'undefined') return {}
    try {
      return JSON.parse(
        window.localStorage.getItem('lancezero:endgame-statuses') ?? '{}',
      ) as Record<string, EndgameStatus>
    } catch {
      return {}
    }
  })
  const definitions = useMemo(() => {
    const predicate = FILTERS.find(([id]) => id === filter)?.[2] ?? (() => true)
    return ENDGAME_DEFINITIONS.filter(
      (definition) =>
        predicate(definition) &&
        (status === 'all' || (statuses[definition.id] ?? 'not-started') === status),
    )
  }, [filter, status, statuses])
  return (
    <section aria-labelledby="biblioteca-finais">
      <div className={styles.toolbar}>
        <div className={styles.filters} aria-label="Filtrar finais">
          {FILTERS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={filter === id ? styles.active : styles.filter}
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className={styles.statusFilter}>
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as EndgameStatus | 'all')}
          >
            <option value="all">Todos</option>
            {Object.entries(STATUS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <h2 id="biblioteca-finais" className="sr-only">
        Biblioteca de finais
      </h2>
      <div className={styles.grid}>
        {definitions.map((definition) => (
          <EndgameCard
            key={definition.id}
            definition={definition}
            status={statuses[definition.id] ?? 'not-started'}
            jornada={jornadas[idDaJornadaDeFinal(definition.id)]}
          />
        ))}
      </div>
    </section>
  )
}

function EndgameCard({
  definition,
  status,
  jornada,
}: {
  definition: EndgameDefinition
  status: EndgameStatus
  jornada?: StudyJourney
}) {
  /*
    O MESMO CTA das aberturas, vindo do MESMO lugar (`rotuloDeRetomada`). Os
    dois módulos são separados no currículo e na validação, mas o aluno tem de
    ler a mesma palavra no mesmo estado — uma escada de `if` copiada aqui
    divergiria da outra na primeira correção de texto.
  */
  const etapas = jornada
    ? `${jornada.completedStageIds.length} de ${jornada.stageIds.length} etapas`
    : null
  return (
    <Link
      href={`/finais/${definition.slug}`}
      className={styles.card}
      aria-label={`${rotuloDeRetomada(jornada ?? null)}: ${definition.name}`}
    >
      <div className={styles.preview}>
        <ChessBoardView fen={definition.previewFen} orientation="w" interactive={false} />
      </div>
      <div className={styles.body}>
        <div className={styles.meta}>
          <span>
            {definition.level === 'essential'
              ? 'Essencial'
              : definition.level === 'fundamental'
                ? 'Fundamental'
                : 'Avançado'}
          </span>
          <span>{definition.tags[1] ?? 'Princípios'}</span>
        </div>
        <h3>{definition.name}</h3>
        <p>{definition.description}</p>
        <span className={styles.status}>
          <span aria-hidden="true">
            {jornada?.status === 'concluida' ? '✓' : status === 'review' ? '↻' : '○'}
          </span>{' '}
          {STATUS[status]}
        </span>
        {etapas ? <span>{etapas}</span> : null}
        <span className={styles.cta}>{rotuloDeRetomada(jornada ?? null)} →</span>
      </div>
    </Link>
  )
}

export type { EndgameCategory }
