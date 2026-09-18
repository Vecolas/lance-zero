'use client'

/** Biblioteca visual de cursos. Mini-tabuleiros são posições pré-calculadas e
 * não inicializam engine, rede ou explorer por card. */
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChessBoardView } from '@/components/chess/ChessBoardView'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { FilterBar, StatePanel } from '@/components/ui/primitives'
import { FiltroSuspenso } from '@/components/ui/FiltroSuspenso'
import { OPENING_COURSES } from '@/content/openings/course'
import { progressoDaJornada, retomadaDaJornada, type StudyJourney } from '@/domain/jornada'
import { revisaoVencidaDaAbertura } from '@/domain/openings/revisao-agrupada'
import type { ReviewCard } from '@/domain/types'
import { useIdioma, useTraduzir } from '@/components/providers/LocaleProvider'
import { nomeDaAbertura } from '@/lib/i18n/nomes-de-conteudo'
import { CHAVE_DA_RETOMADA } from '@/lib/i18n/retomada'
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

/**
 * O filtro secundário das aberturas é SÓ O NÍVEL.
 *
 * Havia também "Primeiro lance" e "Status". Os dois saíram, e a razão é a mesma
 * dos dois: eles respondiam perguntas que o card já responde. O primeiro lance
 * está no mini-tabuleiro de cada card, e o status aparece escrito dentro dele.
 * Três seletores para um catálogo de seis aberturas é mais peneira que conteúdo.
 */
type DifficultyFilter = 'all' | 'beginner' | 'intermediate' | 'advanced'

export function OpeningCatalog() {
  const t = useTraduzir()
  const { repo } = useRepository()
  const [filter, setFilter] = useState<Filter>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all')
  const [progress, setProgress] = useState<Record<string, OpeningProgress>>({})
  const [jornadas, setJornadas] = useState<Record<string, StudyJourney>>({})
  /**
   * Cards vencidos, por abertura.
   *
   * Sem eles o card mostra "Concluída" para quem tem doze posições esquecidas —
   * verdade, e a informação errada para quem abriu a biblioteca procurando o
   * que fazer hoje. Ver `revisaoVencidaDaAbertura`.
   */
  const [vencidos, setVencidos] = useState<ReviewCard[]>([])
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
    void Promise.all([
      repo.listOpeningProgress(),
      repo.listStudyJourneys(),
      /*
        A TERCEIRA LEITURA ENTRA NO MESMO `Promise.all` de propósito: carregá-la
        depois faria o card aparecer sem o aviso de revisão e ganhá-lo um quadro
        adiante, que é a piscada que o comentário abaixo já evitava para o CTA.
      */
      repo.getDueCards(new Date()),
    ])
      .then(([items, todasAsJornadas, cardsVencidos]) => {
        if (cancelled) return
        setVencidos(cardsVencidos)
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
        title={t('openings.loadingTitle')}
        description={t('openings.loadingDescription')}
      />
    )
  }
  if (state === 'error') {
    return (
      <StatePanel kind="error" title={t('openings.errorTitle')} description={error ?? undefined} />
    )
  }
  const courses = OPENING_COURSES.filter((opening) => {
    const difficulty =
      opening.difficulty <= 1 ? 'beginner' : opening.difficulty === 2 ? 'intermediate' : 'advanced'
    return (
      (filter === 'all' || opening.side === filter) &&
      (difficultyFilter === 'all' || difficulty === difficultyFilter)
    )
  })
  return (
    <section aria-labelledby="catalogo-aberturas">
      {/*
        OS BOTÕES E O FILTRO NA MESMA FILEIRA.

        Havia aqui uma segunda fileira de seletores, puxada para cima por uma
        margem negativa para fingir que era a mesma linha. Quando os botões
        quebravam, as duas se sobrepunham — texto por cima de texto. O filtro
        secundário passou a morar DENTRO desta fileira, depois do último botão,
        que é onde o olho já está quando termina de ler as opções.
      */}
      <FilterBar label={t('openings.filterLabel')}>
        {(
          [
            ['all', t('openings.all')],
            ['white', t('openings.white')],
            ['black', t('openings.black')],
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
        <FiltroSuspenso
          titulo={t('openings.level')}
          rotuloDoBotao={t('openings.filterByLevel')}
          valor={difficultyFilter}
          valorNeutro="all"
          aoEscolher={setDifficultyFilter}
          opcoes={[
            { valor: 'all', rotulo: t('openings.allMasculine') },
            { valor: 'beginner', rotulo: t('openings.beginner') },
            { valor: 'intermediate', rotulo: t('openings.intermediate') },
            { valor: 'advanced', rotulo: t('openings.advanced') },
          ]}
        />
      </FilterBar>
      <h2 id="catalogo-aberturas" className="sr-only">
        {t('openings.catalogHeading')}
      </h2>
      <div className={styles.grid}>
        {courses.map((opening) => (
          <OpeningCard
            key={opening.id}
            opening={opening}
            progress={progress[opening.id]}
            jornada={jornadas[idDaJornadaDeAbertura(opening.id)]}
            vencidos={vencidos}
          />
        ))}
      </div>
      {courses.length === 0 ? (
        <StatePanel
          kind="empty"
          title={t('openings.emptyTitle')}
          description={t('openings.emptyDescription')}
        />
      ) : null}
    </section>
  )
}

function OpeningCard({
  opening,
  progress,
  jornada,
  vencidos,
}: {
  opening: OpeningDefinition
  progress?: OpeningProgress
  jornada?: StudyJourney
  /** TODOS os cards vencidos; o card filtra os desta abertura. */
  vencidos: readonly ReviewCard[]
}) {
  const { locale, t } = useIdioma()
  /*
    O NOME DA ABERTURA É TRADUZIDO; O ID, NÃO. `italiana` continua `italiana` no
    endereço e no progresso gravado — o que muda é "Abertura Italiana" virar
    "Italian Game". Traduzir o id quebraria o link e o histórico do aluno junto.
  */
  const nome = nomeDaAbertura(opening.id, locale)
  const status = progress?.status ?? 'not_started'
  const concluida = jornada?.status === 'concluida'
  const labels = {
    not_started: t('openings.status.notStarted'),
    learning: t('openings.status.learning'),
    training: t('openings.status.training'),
    consolidating: t('openings.status.consolidating'),
    active_repertoire: t('openings.status.activeRepertoire'),
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

  /*
    A REVISÃO VENCIDA É A INFORMAÇÃO MAIS NOVA SOBRE ESTA ABERTURA.

    O card sabia o estado do REPERTÓRIO e o progresso da JORNADA — nenhum dos
    dois sabe de revisão. Quem tinha doze posições esquecidas na Italiana via
    "Concluída" e nenhum sinal de que havia o que refazer. É verdade, e é a
    informação errada para quem abriu a biblioteca procurando o que fazer hoje:
    concluir o estudo não é dominar para sempre (plano §39).
  */
  const revisao = revisaoVencidaDaAbertura(opening, vencidos)

  return (
    <Link
      href={`/aberturas/${opening.slug}`}
      className={styles.card}
      aria-label={`${t(CHAVE_DA_RETOMADA[retomadaDaJornada(jornada ?? null)])}: ${nome}`}
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
          <span>{opening.side === 'white' ? t('openings.white') : t('openings.black')}</span>
          <span>{t('openings.essential')}</span>
        </div>
        <h3>{nome}</h3>
        <p>{opening.description}</p>
        {/*
          O ✓ E O TEXTO VÊM DA MESMA FONTE, e antes não vinham.

          O símbolo lia a JORNADA e o rótulo lia o `OpeningProgress` — duas
          verdades sobre perguntas diferentes. Quem terminava de estudar via um
          ✓ ao lado de "Não iniciada", porque o progresso de repertório só muda
          quando o aluno ADOTA a abertura, e estudar não é adotar.

          Concluir o estudo passa a mandar no rótulo. O estado de repertório
          continua existindo e continua aparecendo — mas depois, quando ele for a
          informação mais nova sobre esta abertura.
        */}
        <span className={styles.status}>
          {/* Símbolo + texto: o estado nunca depende só da forma nem só da cor. */}
          <span aria-hidden="true">{concluida ? '✓' : '○'}</span>{' '}
          {concluida && status === 'not_started' ? t('openings.status.completed') : labels[status]}
        </span>
        {/*
          O AVISO DE REVISÃO É ADICIONAL, e não substitui o estado: "Concluída"
          continua verdade. Ele só aparece quando há algo vencido — um contador
          zerado numa biblioteca ensina o aluno a ignorar a linha inteira.
        */}
        {revisao.cards > 0 ? (
          <span className={styles.revisar}>
            <span aria-hidden="true">↻</span>{' '}
            {revisao.ramos === 1
              ? t('openings.reviewDueOne', { n: revisao.cards })
              : t('openings.reviewDueMany', { n: revisao.cards, ramos: revisao.ramos })}
          </span>
        ) : null}
        <span>
          {etapas === null
            ? t('journey.stagesTotal', { count: stages.length })
            : t('journey.stagesProgress', { done: etapas.concluidas, total: etapas.total })}
        </span>
        {/*
          O CTA é a única ação do card, e QUAL rótulo usar vem do domínio
          (`retomadaDaJornada`): Aberturas e Finais precisam dizer a mesma coisa
          nos mesmos estados, e uma escada de `if` copiada nos dois catálogos
          divergiria na primeira correção. A PALAVRA vem do dicionário, porque
          domínio não fala idioma.
        */}
        <span className={styles.cta}>
          {t(CHAVE_DA_RETOMADA[retomadaDaJornada(jornada ?? null)])} →
        </span>
      </div>
    </Link>
  )
}
