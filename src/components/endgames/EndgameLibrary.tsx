'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ChessBoardView } from '@/components/chess/ChessBoardView'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { ENDGAME_DEFINITIONS } from '@/content/endgames/biblioteca'
import { retomadaDaJornada, type StudyJourney } from '@/domain/jornada'
import { useIdioma, useTraduzir } from '@/components/providers/LocaleProvider'
import { FiltroSuspenso } from '@/components/ui/FiltroSuspenso'
import type { ChaveDeMensagem } from '@/lib/i18n/mensagens'
import { nomeDoFinal } from '@/lib/i18n/nomes-de-conteudo'
import { CHAVE_DA_RETOMADA } from '@/lib/i18n/retomada'
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

/**
 * A CHAVE de cada status, e não a palavra.
 *
 * O status é um valor do domínio; o texto é apresentação. Guardar a palavra aqui
 * amarraria a lista de status a um idioma — e o `select` passaria a mostrar
 * português dentro de uma tela em inglês.
 */
const CHAVE_DO_STATUS: Record<EndgameStatus, ChaveDeMensagem> = {
  'not-started': 'endgames.status.not-started',
  learning: 'endgames.status.learning',
  practicing: 'endgames.status.practicing',
  review: 'endgames.status.review',
  consolidated: 'endgames.status.consolidated',
}

export function EndgameLibrary() {
  const t = useTraduzir()
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
      {/*
        O FILTRO DE STATUS ENTROU NA FILEIRA, depois do último botão.

        Ele era um `<select>` rotulado numa SEGUNDA linha, abaixo das categorias
        — o que empurrava a grade para baixo e, quando os botões quebravam,
        colidia com eles. Como ícone no fim da mesma fileira, ele fica onde o olho
        já está ao terminar de ler as categorias, e a tela volta a ter uma linha
        de filtro em vez de duas.
      */}
      <div className={styles.toolbar}>
        <div className={styles.filters} aria-label={t('endgames.filterLabel')}>
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
          <FiltroSuspenso
            titulo={t('endgames.statusLabel')}
            rotuloDoBotao={t('endgames.filterByStatus')}
            valor={status}
            valorNeutro="all"
            aoEscolher={setStatus}
            opcoes={[
              { valor: 'all' as const, rotulo: t('endgames.all') },
              ...Object.entries(CHAVE_DO_STATUS).map(([id, chave]) => ({
                valor: id as EndgameStatus,
                rotulo: t(chave),
              })),
            ]}
          />
        </div>
      </div>
      <h2 id="biblioteca-finais" className="sr-only">
        {t('endgames.libraryHeading')}
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
  const { locale, t } = useIdioma()
  /*
    O MESMO CTA das aberturas, e QUAL rótulo usar vem do MESMO lugar
    (`retomadaDaJornada`). Os dois módulos são separados no currículo e na
    validação, mas o aluno tem de ler a mesma palavra no mesmo estado — uma
    escada de `if` copiada aqui divergiria da outra na primeira correção.

    O NOME DO FINAL é traduzido; o id (`opposition`) não muda nunca: ele indexa o
    progresso do aluno e o endereço da jornada.
  */
  const nome = nomeDoFinal(definition.id, locale)
  const etapas = jornada
    ? t('journey.stagesProgress', {
        done: jornada.completedStageIds.length,
        total: jornada.stageIds.length,
      })
    : null
  return (
    <Link
      href={`/finais/${definition.slug}`}
      className={styles.card}
      aria-label={`${t(CHAVE_DA_RETOMADA[retomadaDaJornada(jornada ?? null)])}: ${nome}`}
    >
      <div className={styles.preview}>
        <ChessBoardView fen={definition.previewFen} orientation="w" interactive={false} />
      </div>
      <div className={styles.body}>
        <div className={styles.meta}>
          <span>
            {definition.level === 'essential'
              ? t('endgames.level.essential')
              : definition.level === 'fundamental'
                ? t('endgames.level.fundamental')
                : t('endgames.level.advanced')}
          </span>
          <span>{definition.tags[1] ?? t('endgames.principles')}</span>
        </div>
        <h3>{nome}</h3>
        <p>{definition.description}</p>
        {/*
          O ✓ E O TEXTO VÊM DA MESMA FONTE — ver a nota equivalente no catálogo
          de Aberturas. O símbolo lia a jornada e o rótulo lia o estado de
          treino, e quem terminava de estudar via um ✓ ao lado de "Não iniciado".
        */}
        <span className={styles.status}>
          <span aria-hidden="true">
            {jornada?.status === 'concluida' ? '✓' : status === 'review' ? '↻' : '○'}
          </span>{' '}
          {jornada?.status === 'concluida' && status === 'not-started'
            ? t('endgames.status.completed')
            : t(CHAVE_DO_STATUS[status])}
        </span>
        {etapas ? <span>{etapas}</span> : null}
        <span className={styles.cta}>
          {t(CHAVE_DA_RETOMADA[retomadaDaJornada(jornada ?? null)])} →
        </span>
      </div>
    </Link>
  )
}

export type { EndgameCategory }
