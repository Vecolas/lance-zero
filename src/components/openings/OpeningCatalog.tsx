'use client'

/** Biblioteca visual de cursos. Mini-tabuleiros são posições pré-calculadas e
 * não inicializam engine, rede ou explorer por card. */
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChessBoardView } from '@/components/chess/ChessBoardView'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { FilterBar, StatePanel } from '@/components/ui/primitives'
import { OPENING_COURSES } from '@/content/openings/course'
import { progressoDaJornada, rotuloDeRetomada, type StudyJourney } from '@/domain/jornada'
import { construirJornadaDeAbertura } from '@/domain/openings/jornada'
import { idDaJornadaDeAbertura } from '@/components/openings/OpeningStudyJourney'
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
  const [jornadas, setJornadas] = useState<Record<string, StudyJourney>>({})
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    if (!repo)
      return () => {
        cancelled = true
      }
    // As duas leituras juntas: o card mostra progresso E estado da jornada, e
    // carregá-las em momentos diferentes faria o CTA piscar de "Estudar" para
    // "Continuar estudo" depois que a tela já apareceu.
    void Promise.all([repo.listOpeningProgress(), repo.listStudyJourneys()])
      .then(([items, todasAsJornadas]) => {
        if (cancelled) return
        setProgress(Object.fromEntries(items.map((item) => [item.openingId, item])))
        setJornadas(
          Object.fromEntries(
            todasAsJornadas
              // Só as de ABERTURA. A store é compartilhada com os finais, e
              // misturar os dois aqui é exatamente o que o produto não quer.
              .filter((jornada) => jornada.dominio === 'abertura')
              .map((jornada) => [jornada.id, jornada]),
          ),
        )
        setState('ready')
      })
      .catch((reason: unknown) => {
        if (cancelled) return
        setError(reason instanceof Error ? reason.message : 'Não consegui carregar seu progresso.')
        setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [repo])
  if (state === 'loading') {
    return (
      <StatePanel
        kind="loading"
        title="Carregando aberturas"
        description="Preparando a biblioteca e seu progresso."
      />
    )
  }
  if (state === 'error') {
    return (
      <StatePanel
        kind="error"
        title="Não consegui carregar as aberturas"
        description={error ?? undefined}
      />
    )
  }
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
      <FilterBar label="Filtrar aberturas">
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
      </FilterBar>
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
          <OpeningCard
            key={opening.id}
            opening={opening}
            progress={progress[opening.id]}
            jornada={jornadas[idDaJornadaDeAbertura(opening.id)]}
          />
        ))}
      </div>
      {courses.length === 0 ? (
        <StatePanel
          kind="empty"
          title="Nenhuma abertura corresponde aos filtros"
          description="Tente remover um filtro para ver mais cursos."
        />
      ) : null}
    </section>
  )
}

function OpeningCard({
  opening,
  progress,
  jornada,
}: {
  opening: OpeningDefinition
  progress?: OpeningProgress
  jornada?: StudyJourney
}) {
  const status = progress?.status ?? 'not_started'
  const labels = {
    not_started: 'Não iniciada',
    learning: 'Aprendendo',
    training: 'Treinando',
    consolidating: 'Consolidando',
    active_repertoire: 'Repertório ativo',
  } as const

  /*
    O PROGRESSO QUE O CARD MOSTRA É O DA JORNADA, e não mais "N de M posições
    ensinadas". A contagem antiga media o que o aluno tinha clicado na aba
    Aprender — um número que subia sem ele ter treinado nada, e que por isso
    dizia muito pouco sobre onde ele parou. "5 de 9 etapas" responde a pergunta
    que o aluno de fato tem ao voltar: quanto falta para terminar isto.

    As etapas são derivadas da abertura, e não de uma contagem escrita à mão —
    uma variação nova muda a jornada e o card acompanha sozinho.
  */
  const stages = construirJornadaDeAbertura(opening)
  const etapas = jornada ? progressoDaJornada(jornada, stages) : null

  return (
    <Link
      href={`/aberturas/${opening.slug}`}
      className={styles.card}
      aria-label={`${rotuloDeRetomada(jornada ?? null)}: ${opening.name}`}
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
          {/* Símbolo + texto: o estado nunca depende só da forma nem só da cor. */}
          <span aria-hidden="true">{jornada?.status === 'concluida' ? '✓' : '○'}</span>{' '}
          {labels[status]}
        </span>
        <span>
          {etapas === null
            ? `${stages.length} etapas`
            : `${etapas.concluidas} de ${etapas.total} etapas`}
        </span>
        {/*
          O CTA é a única ação do card, e o rótulo vem do domínio
          (`rotuloDeRetomada`): Aberturas e Finais precisam dizer a mesma coisa
          nos mesmos estados, e uma escada de `if` copiada nos dois catálogos
          divergiria na primeira correção.
        */}
        <span className={styles.cta}>{rotuloDeRetomada(jornada ?? null)} →</span>
      </div>
    </Link>
  )
}
