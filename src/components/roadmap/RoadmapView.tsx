'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { StatePanel } from '@/components/ui/primitives'
import {
  ROADMAP_AREAS,
  ROADMAP_DEFINITION,
  deriveRoadmapNode,
  roadmapProgress,
  userLearningStateFromSkill,
  type RoadmapArea,
  type RoadmapNodeView,
} from '@/domain/roadmap'
import { resumoDaJornada, type StudyJourney } from '@/domain/jornada'
import { visaoDaHabilidade } from '@/domain/aprendizado/skill-state'
import type { SkillId } from '@/domain/types'
import { traduzirRota } from '@/lib/i18n/rotas'
import { conteudoDoTarget } from '@/lib/training/jornadas-do-roadmap'
import { etapasDoConteudo } from '@/lib/training/etapas-do-conteudo'
import { learningTargetOf } from '@/domain/roadmap/learning-objects'
import type { ModoDeAprendizado } from '@/domain/roadmap/learning-target'
import { rotaDeAprendizado } from '@/lib/training/rota-de-aprendizado'
import { useIdioma, useTraduzir } from '@/components/providers/LocaleProvider'
import type { ChaveDeMensagem } from '@/lib/i18n/mensagens'
import { textoDoNo } from '@/lib/i18n/nos-do-roadmap'
import { CHAVE_DA_RETOMADA } from '@/lib/i18n/retomada'
import styles from './RoadmapView.module.css'

/**
 * A ORDEM DENTRO DE CADA ÁREA: o que falta fazer primeiro, o concluído por
 * último.
 *
 * ELA SUBSTITUI A BARRA DE FILTROS. Havia cinco botões — Todos, Em andamento,
 * Disponíveis, Revisar, Concluídos — e eles pediam ao aluno que dissesse o que
 * queria ver antes de ver qualquer coisa. Num mapa de currículo a resposta é
 * sempre a mesma: o que ainda não foi feito. Ordenar responde isso sem perguntar,
 * e sem esconder o resto: o concluído continua na tela, no fim, onde serve de
 * histórico em vez de ocupar o topo.
 *
 * Dentro de cada grupo a ordem do currículo é preservada — ela é a sequência
 * pedagógica, e embaralhá-la por estado desfaria o que o roadmap ensina.
 */
function pesoNaLista(node: RoadmapNodeView): number {
  if (node.completed) return 2
  if (node.state === 'locked') return 1
  return 0
}

const CHAVE_DO_ESTADO: Record<RoadmapNodeView['state'], ChaveDeMensagem> = {
  locked: 'roadmap.stages.locked',
  available: 'roadmap.stages.available',
  learning: 'roadmap.stages.learning',
  completed: 'roadmap.stages.completed',
  review: 'roadmap.stages.review',
  needs_relearning: 'roadmap.stages.needs_relearning',
}

const CHAVE_DA_ACAO: Record<Exclude<RoadmapNodeView['action'], 'bloqueado'>, ChaveDeMensagem> = {
  aprender: 'common.actions.learn',
  continuar: 'common.actions.continue',
  revisar: 'common.actions.review',
  reaprender: 'common.actions.relearn',
}

export function RoadmapView() {
  const t = useTraduzir()
  const { status, repo, erro, revision } = useRepository()
  const [nodes, setNodes] = useState<RoadmapNodeView[]>([])
  const [jornadas, setJornadas] = useState<Record<string, StudyJourney>>({})
  const [failed, setFailed] = useState<string | null>(null)
  /** As habilidades que já podem ser cobradas sem apoio. Ver a leitura abaixo. */
  const [praticaveis, setPraticaveis] = useState<ReadonlySet<SkillId>>(new Set())
  useEffect(() => {
    if (!repo) return
    const repository = repo
    let cancelled = false
    async function load() {
      try {
        // As três leituras juntas: o card mostra estado de habilidade E estado
        // de jornada, e carregá-las em momentos diferentes faria "Estudar"
        // piscar para "Continuar estudo" depois de a tela já ter aparecido.
        const [skillStates, dueCards, todasAsJornadas] = await Promise.all([
          repository.getSkillStates(),
          repository.getDueCards(new Date()),
          repository.listStudyJourneys(),
        ])
        if (!cancelled)
          setJornadas(Object.fromEntries(todasAsJornadas.map((jornada) => [jornada.id, jornada])))
        const bySkill = new Map(skillStates.map((state) => [state.skillId, state]))
        const dueSkills = new Set(dueCards.flatMap((card) => card.skillIds))
        /*
          QUEM JÁ PODE SER COBRADO SEM APOIO.

          Esta porta veio do hub "Treinar", que deixou de existir: era o único
          lugar navegável que oferecia prática independente por habilidade. Ela
          foi para cá e não para outra aba porque o Roadmap é onde o aluno vê o
          currículo — mas a REGRA veio junto, intacta.

          `podeCobrarSemApoio` já atravessa a marca de reensino: uma habilidade
          em `review` com reaprendizado pendente não aparece, por mais alto que
          esteja o degrau. É a regra acima de todas as outras do PEDAGOGY.md, e
          é o motivo de este conjunto ser derivado de `visaoDaHabilidade` em vez
          de um `stage !== 'unseen'` escrito aqui.
        */
        const praticaveis = new Set(
          skillStates
            .map((state) => visaoDaHabilidade(state, undefined))
            .filter((visao) => visao.podeCobrarSemApoio)
            .map((visao) => visao.skillId),
        )
        if (!cancelled) setPraticaveis(praticaveis)
        const completedLearningObjects = new Set(
          skillStates
            .filter((state) => state.exposureCount > 0)
            .map((state) => `skill:${state.skillId}`),
        )
        const next = ROADMAP_DEFINITION.nodes.map((node) => {
          const state = node.skillId
            ? userLearningStateFromSkill(bySkill.get(node.skillId), node.learningObjectId)
            : undefined
          const unmet = node.prerequisiteIds
            .map((id) => ROADMAP_DEFINITION.nodes.find((candidate) => candidate.id === id))
            .filter(
              (candidate) => candidate && !completedLearningObjects.has(candidate.learningObjectId),
            )
            .filter((candidate): candidate is (typeof ROADMAP_DEFINITION.nodes)[number] =>
              Boolean(candidate),
            )
          const view = deriveRoadmapNode(node, state, unmet)
          return view.completed &&
            view.reviewEligible &&
            node.skillId &&
            dueSkills.has(node.skillId) &&
            view.state === 'completed'
            ? { ...view, state: 'review' as const, action: 'revisar' as const }
            : view
        })
        if (!cancelled) setNodes(next)
      } catch (error) {
        if (!cancelled)
          setFailed(error instanceof Error ? error.message : 'Não consegui ler seu roadmap.')
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [repo, revision])
  /*
    ORDENAR, E NÃO FILTRAR. Concluir qualquer coisa manda o card para o fim da
    lista da área dele — o topo fica com o que ainda pede trabalho.

    `sort` sobre uma CÓPIA: `nodes` é estado, e ordenar no lugar mutaria o array
    que o React guarda. A ordem do currículo (`order`) é o desempate, então
    dentro de cada grupo a sequência pedagógica continua de pé.
  */
  const ordenados = useMemo(
    () => [...nodes].sort((a, b) => pesoNaLista(a) - pesoNaLista(b) || a.order - b.order),
    [nodes],
  )
  const progress = roadmapProgress(nodes)
  if (status === 'carregando')
    return <StatePanel kind="loading" title={t('roadmap.loadingTitle')} />
  if (status === 'erro' || failed)
    return (
      <StatePanel
        kind="error"
        title={t('roadmap.errorTitle')}
        description={failed ?? erro ?? undefined}
      />
    )
  return (
    <div className={styles.root}>
      <div className={styles.summary}>
        <div>
          <p className={styles.kicker}>{t('roadmap.kicker')}</p>
          <h2>{t('roadmap.summaryHeading')}</h2>
          <p className={styles.muted}>{t('roadmap.summaryHelp')}</p>
        </div>
        <p className={styles.count}>
          <strong>{progress.completed}</strong> {t('roadmap.of')} {progress.total}
          <span> {t('roadmap.studiedCount')}</span>
        </p>
      </div>
      <div className={styles.legend}>
        <span>{t('roadmap.legend.completed')}</span>
        <span>{t('roadmap.legend.learning')}</span>
        <span>{t('roadmap.legend.available')}</span>
        <span>{t('roadmap.legend.relearn')}</span>
      </div>
      <aside className={styles.choice} aria-label={t('roadmap.choiceTitle')}>
        <strong>{t('roadmap.choiceTitle')}</strong>
        <span>{t('roadmap.choiceHelp')}</span>
      </aside>
      <div className={styles.areas}>
        {ROADMAP_AREAS.map((area) => {
          const areaNodes = ordenados.filter((node) => node.area === area.id)
          return areaNodes.length ? (
            <RoadmapAreaSection
              key={area.id}
              area={area.id}
              nodes={areaNodes}
              jornadas={jornadas}
              praticaveis={praticaveis}
            />
          ) : null
        })}
      </div>
    </div>
  )
}

function RoadmapAreaSection({
  area,
  nodes,
  jornadas,
  praticaveis,
}: {
  area: RoadmapArea
  nodes: RoadmapNodeView[]
  jornadas: Record<string, StudyJourney>
  praticaveis: ReadonlySet<SkillId>
}) {
  const t = useTraduzir()
  return (
    <section className={styles.area} aria-labelledby={`roadmap-${area}`}>
      <div className={styles.areaHeading}>
        <div>
          {/* O nome da área vem do dicionário e não do currículo: `area.id` é o
              identificador, e é ele que indexa a tradução. */}
          <h3 id={`roadmap-${area}`}>{t(`roadmap.areas.${area}.title` as ChaveDeMensagem)}</h3>
          <p>{t(`roadmap.areas.${area}.description` as ChaveDeMensagem)}</p>
        </div>
        <span>{t('roadmap.contentCount', { count: nodes.length })}</span>
      </div>
      {/* A ordem JÁ VEM PRONTA de cima (ver `pesoNaLista`). Reordenar por
          `order` aqui desfaria a conclusão que manda o card para o fim. */}
      <div className={styles.nodes}>
        {nodes.map((node) => (
          <RoadmapNodeCard
            key={node.id}
            node={node}
            jornadas={jornadas}
            praticaveis={praticaveis}
          />
        ))}
      </div>
    </section>
  )
}

/**
 * O MODO em que o conteúdo abre, derivado da ação do nó.
 *
 * O destino é o mesmo nos quatro casos; o que muda é o que a tela diz ao chegar.
 * "Reaprender" que abrisse igual a "Aprender" seria uma promessa quebrada em
 * silêncio — o aluno pediu para rever o que esqueceu e recebeu a aula de
 * estreia, sem nada indicando que o app entendeu o pedido.
 */
const MODO_DA_ACAO: Record<RoadmapNodeView['action'], ModoDeAprendizado> = {
  aprender: 'aprender',
  continuar: 'continuar',
  revisar: 'revisar',
  reaprender: 'reaprender',
  bloqueado: 'aprender',
}

/**
 * Um nó do roadmap.
 *
 * O DEFEITO QUE ESTE CARD CARREGAVA, e que é a razão deste trabalho: o destino
 * era decidido aqui, em uma linha, e a última alternativa dela era `'/lessons'`.
 * Todo nó sem jornada e sem habilidade — vinte e nove deles — oferecia
 * "Aprender" e despejava o aluno na biblioteca inteira. O Roadmap SABE o que o
 * aluno quer aprender; responder com o catálogo é dizer "procure você mesmo", e
 * é um caminho que parece funcionar, porque abre uma página de verdade.
 *
 * Agora o destino vem de `rotaDeAprendizado`, e ele é EXPLÍCITO por nó. Quando
 * não existe conteúdo, o botão não vira link genérico: ele some, e a tela diz a
 * verdade. Ver `LEARNING_OBJECTS`.
 *
 * ABERTURAS E FINAIS continuam mostrando o progresso da jornada ("5 de 9
 * etapas"), e é de lá que sai a etapa exata em que "Continuar" retoma.
 */
function RoadmapNodeCard({
  node,
  jornadas,
  praticaveis,
}: {
  node: RoadmapNodeView
  jornadas: Record<string, StudyJourney>
  /** Habilidades que já podem ser cobradas sem apoio. Ver a leitura no pai. */
  praticaveis: ReadonlySet<SkillId>
}) {
  const { locale, t } = useIdioma()
  const texto = textoDoNo(node, locale)
  const target = learningTargetOf(node)
  const conteudo = conteudoDoTarget(target)
  const jornada = conteudo ? (jornadas[conteudo.jornadaId] ?? null) : null

  // As etapas são derivadas do CONTEÚDO, e o resumo delas + da jornada. Uma
  // contagem escrita à mão aqui envelheceria na primeira etapa nova.
  const stages = conteudo ? etapasDoConteudo(conteudo) : null
  const resumo = stages ? resumoDaJornada(jornada, stages) : null

  const modo = MODO_DA_ACAO[node.action]
  /*
    A ETAPA EXATA É O QUE FAZ "CONTINUAR" CONTINUAR.

    Sem ela o deep link abriria a porta de entrada da jornada, e quem parou na
    etapa 5 recomeçaria da 1 — perdendo exatamente o que já tinha feito. Ela só
    entra quando há progresso: mandar `etapa` na primeira visita seria pedir à
    jornada que pulasse para um lugar onde o aluno nunca esteve.
  */
  const etapa = modo === 'continuar' ? (resumo?.etapaAtual ?? undefined) : undefined
  const destino = target ? rotaDeAprendizado(target, { modo, etapa }) : null

  const rotulo = resumo
    ? t(CHAVE_DA_RETOMADA[resumo.rotulo])
    : node.action === 'bloqueado'
      ? t('common.actions.learn')
      : t(CHAVE_DA_ACAO[node.action])

  return (
    <article className={`${styles.node} ${styles[`state-${node.state}`]}`}>
      <div className={styles.nodeIcon} aria-hidden="true">
        {resumo?.concluida || node.completed
          ? '✓'
          : node.state === 'learning'
            ? '◔'
            : node.state === 'locked'
              ? '·'
              : '○'}
      </div>
      <div className={styles.nodeBody}>
        <h4>{texto.title}</h4>
        <p>{texto.shortDescription}</p>
        {/*
          SEM CONTEÚDO, SEM BOTÃO — e a frase ocupa a LINHA DE ESTADO, não uma
          coluna ao lado.

          Ela morava fora do corpo do card, como irmã do link de ação. Numa
          coluna estreita as duas disputavam a largura, e o título do nó passou a
          quebrar em uma palavra por linha: "Como / ler / o / tabuleiro". Texto
          explicativo não compete por largura com um rótulo de botão — ele é
          texto, e texto ocupa a linha inteira.

          A frase também SUBSTITUI o estado em vez de se somar a ele. Antes o card
          dizia "Sem lição ainda" e, ao lado, "Este conteúdo ainda não possui uma
          lição disponível" — a mesma informação duas vezes, em dois lugares.
        */}
        <span className={styles.state} data-testid={destino === null ? 'sem-conteudo' : undefined}>
          {resumo
            ? `${t(resumo.concluida ? 'common.states.completed' : 'common.states.inProgress')} · ${t(
                'journey.stagesProgress',
                { done: resumo.concluidas, total: resumo.total },
              )}`
            : destino === null
              ? t('roadmap.noContentMessage')
              : t(CHAVE_DO_ESTADO[node.state])}
        </span>
      </div>
      <div className={styles.actions}>
        {destino !== null && (node.action !== 'bloqueado' || resumo) ? (
          <Link className={styles.action} href={destino}>
            {rotulo}
          </Link>
        ) : destino !== null ? (
          <span className={styles.locked}>{t('common.states.locked')}</span>
        ) : null}

        {/*
          PRATICAR: a porta que veio do hub "Treinar" quando ele deixou de
          existir. Ele era o único lugar navegável que oferecia prática
          independente por habilidade — sem isto ela passaria a existir só
          dentro do plano do dia.

          ELA SÓ APARECE PARA QUEM JÁ PODE SER COBRADO SEM APOIO, e a condição é
          a mesma que o hub usava. Oferecer prática independente de um conceito
          que o app nunca ensinou é exatamente o que a regra acima de todas as
          outras do PEDAGOGY.md proíbe — e é o defeito que o ADR-0011 corrigiu.
        */}
        {node.skillId && praticaveis.has(node.skillId) ? (
          <Link
            className={styles.actionSecondary}
            href={traduzirRota(`/pratica/${node.skillId}`, locale)}
          >
            {t('common.actions.practice')}
          </Link>
        ) : null}
      </div>
    </article>
  )
}
