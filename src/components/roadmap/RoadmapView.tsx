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
import { conteudoDoTarget } from '@/lib/training/jornadas-do-roadmap'
import { etapasDoConteudo } from '@/lib/training/etapas-do-conteudo'
import { learningTargetOf } from '@/domain/roadmap/learning-objects'
import type { ModoDeAprendizado } from '@/domain/roadmap/learning-target'
import { rotaDeAprendizado } from '@/lib/training/rota-de-aprendizado'
import styles from './RoadmapView.module.css'

type Filter = 'todos' | 'em-andamento' | 'disponiveis' | 'revisar' | 'concluidos'
const stateLabel: Record<RoadmapNodeView['state'], string> = {
  locked: 'Bloqueado',
  available: 'Disponível',
  learning: 'Em aprendizado',
  completed: 'Concluído',
  review: 'Revisar',
  needs_relearning: 'Reaprender recomendado',
}

export function RoadmapView() {
  const { status, repo, erro, revision } = useRepository()
  const [filter, setFilter] = useState<Filter>('todos')
  const [nodes, setNodes] = useState<RoadmapNodeView[]>([])
  const [jornadas, setJornadas] = useState<Record<string, StudyJourney>>({})
  const [failed, setFailed] = useState<string | null>(null)
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
  const filtered = useMemo(
    () =>
      nodes.filter(
        (node) =>
          filter === 'todos' ||
          (filter === 'em-andamento' && node.state === 'learning') ||
          (filter === 'disponiveis' && node.state === 'available') ||
          (filter === 'revisar' &&
            (node.state === 'review' || node.state === 'needs_relearning')) ||
          (filter === 'concluidos' && node.completed),
      ),
    [filter, nodes],
  )
  const progress = roadmapProgress(nodes)
  if (status === 'carregando')
    return (
      <StatePanel
        kind="loading"
        title="Abrindo seu roadmap"
        description="Lendo o currículo e seu estado de aprendizagem."
      />
    )
  if (status === 'erro' || failed)
    return (
      <StatePanel
        kind="error"
        title="Não consegui abrir seu roadmap"
        description={failed ?? erro ?? undefined}
      />
    )
  return (
    <div className={styles.root}>
      <div className={styles.summary}>
        <div>
          <p className={styles.kicker}>Trajetória de aprendizagem</p>
          <h2>O que existe para aprender e onde você está</h2>
          <p className={styles.muted}>
            A conclusão mostra o que já foi estudado. Revisar e reaprender mostram a retenção atual.
          </p>
        </div>
        <p className={styles.count}>
          <strong>{progress.completed}</strong> de {progress.total}
          <span> conteúdos estudados</span>
        </p>
      </div>
      <div className={styles.filters} aria-label="Filtrar roadmap">
        {(['todos', 'em-andamento', 'disponiveis', 'revisar', 'concluidos'] as Filter[]).map(
          (value) => (
            <button
              key={value}
              type="button"
              className={filter === value ? styles.activeFilter : styles.filter}
              onClick={() => setFilter(value)}
            >
              {
                {
                  todos: 'Todos',
                  'em-andamento': 'Em andamento',
                  disponiveis: 'Disponíveis',
                  revisar: 'Revisar',
                  concluidos: 'Concluídos',
                }[value]
              }
            </button>
          ),
        )}
      </div>
      <div className={styles.legend}>
        <span>✓ Concluído</span>
        <span>◔ Em aprendizado</span>
        <span>○ Disponível</span>
        <span>↻ Reaprender recomendado</span>
      </div>
      <aside className={styles.choice} aria-label="Escolhas de repertório">
        <strong>Escolha um repertório de Brancas</strong>
        <span>
          Você precisa estudar uma opção para avançar; as outras continuam disponíveis para
          explorar.
        </span>
      </aside>
      <div className={styles.areas}>
        {ROADMAP_AREAS.map((area) => {
          const areaNodes = filtered.filter((node) => node.area === area.id)
          return areaNodes.length ? (
            <RoadmapAreaSection
              key={area.id}
              area={area.id}
              title={area.title}
              description={area.description}
              nodes={areaNodes}
              jornadas={jornadas}
            />
          ) : null
        })}
      </div>
    </div>
  )
}

function RoadmapAreaSection({
  area,
  title,
  description,
  nodes,
  jornadas,
}: {
  area: RoadmapArea
  title: string
  description: string
  nodes: RoadmapNodeView[]
  jornadas: Record<string, StudyJourney>
}) {
  return (
    <section className={styles.area} aria-labelledby={`roadmap-${area}`}>
      <div className={styles.areaHeading}>
        <div>
          <h3 id={`roadmap-${area}`}>{title}</h3>
          <p>{description}</p>
        </div>
        <span>{nodes.length} conteúdos</span>
      </div>
      <div className={styles.nodes}>
        {[...nodes]
          .sort((a, b) => a.order - b.order)
          .map((node) => (
            <RoadmapNodeCard key={node.id} node={node} jornadas={jornadas} />
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
}: {
  node: RoadmapNodeView
  jornadas: Record<string, StudyJourney>
}) {
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
    ? resumo.rotulo
    : node.action === 'reaprender'
      ? 'Reaprender'
      : node.action === 'revisar'
        ? 'Revisar'
        : node.action === 'continuar'
          ? 'Continuar'
          : 'Aprender'

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
        <h4>{node.title}</h4>
        <p>{node.shortDescription}</p>
        <span className={styles.state}>
          {resumo
            ? `${resumo.concluida ? 'Concluído' : 'Em andamento'} · ${resumo.progresso}`
            : destino === null
              ? 'Sem lição ainda'
              : stateLabel[node.state]}
        </span>
      </div>
      {destino === null ? (
        /*
          SEM CONTEÚDO, SEM BOTÃO — e com a frase inteira, não só a ausência.

          O catálogo tem doze lições para um currículo de cinquenta e sete nós. A
          alternativa de manter o botão apontando para a biblioteca é o que
          existia antes, e ela transformava a falta de conteúdo numa caça ao
          tesouro. Dizer "ainda não há" é pior de ler e melhor de usar.
        */
        <span className={styles.locked} data-testid="sem-conteudo">
          Este conteúdo ainda não possui uma lição disponível.
        </span>
      ) : node.action !== 'bloqueado' || resumo ? (
        <Link className={styles.action} href={destino}>
          {rotulo}
        </Link>
      ) : (
        <span className={styles.locked}>Pré-requisitos</span>
      )}
    </article>
  )
}
