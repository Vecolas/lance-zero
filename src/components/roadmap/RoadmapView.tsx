'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { StatePanel } from '@/components/ui/primitives'
import { ROADMAP_AREAS, ROADMAP_DEFINITION, deriveRoadmapNode, roadmapProgress, userLearningStateFromSkill, type RoadmapArea, type RoadmapNodeView } from '@/domain/roadmap'
import styles from './RoadmapView.module.css'

type Filter = 'todos' | 'em-andamento' | 'disponiveis' | 'revisar' | 'concluidos'
const stateLabel: Record<RoadmapNodeView['state'], string> = { locked: 'Bloqueado', available: 'Disponível', learning: 'Em aprendizado', completed: 'Concluído', review: 'Revisar', needs_relearning: 'Reaprender recomendado' }

export function RoadmapView() {
  const { status, repo, erro, revision } = useRepository()
  const [filter, setFilter] = useState<Filter>('todos')
  const [nodes, setNodes] = useState<RoadmapNodeView[]>([])
  const [failed, setFailed] = useState<string | null>(null)
  useEffect(() => {
    if (!repo) return
    const repository = repo
    let cancelled = false
    async function load() {
      try {
        const [skillStates, dueCards] = await Promise.all([repository.getSkillStates(), repository.getDueCards(new Date())])
        const bySkill = new Map(skillStates.map((state) => [state.skillId, state]))
        const dueSkills = new Set(dueCards.flatMap((card) => card.skillIds))
        const next = ROADMAP_DEFINITION.nodes.map((node) => {
          const state = node.skillId ? userLearningStateFromSkill(bySkill.get(node.skillId), node.learningObjectId) : undefined
          const view = deriveRoadmapNode(node, state)
          return view.completed && view.reviewEligible && node.skillId && dueSkills.has(node.skillId) && view.state === 'completed' ? { ...view, state: 'review' as const, action: 'revisar' as const } : view
        })
        if (!cancelled) setNodes(next)
      } catch (error) { if (!cancelled) setFailed(error instanceof Error ? error.message : 'Não consegui ler seu roadmap.') }
    }
    void load()
    return () => { cancelled = true }
  }, [repo, revision])
  const filtered = useMemo(() => nodes.filter((node) => filter === 'todos' || (filter === 'em-andamento' && node.state === 'learning') || (filter === 'disponiveis' && node.state === 'available') || (filter === 'revisar' && (node.state === 'review' || node.state === 'needs_relearning')) || (filter === 'concluidos' && node.completed)), [filter, nodes])
  const progress = roadmapProgress(nodes)
  if (status === 'carregando') return <StatePanel kind="loading" title="Abrindo seu roadmap" description="Lendo o currículo e seu estado de aprendizagem." />
  if (status === 'erro' || failed) return <StatePanel kind="error" title="Não consegui abrir seu roadmap" description={failed ?? erro ?? undefined} />
  return <div className={styles.root}>
    <div className={styles.summary}><div><p className={styles.kicker}>Trajetória de aprendizagem</p><h2>O que existe para aprender e onde você está</h2><p className={styles.muted}>A conclusão mostra o que já foi estudado. Revisar e reaprender mostram a retenção atual.</p></div><p className={styles.count}><strong>{progress.completed}</strong> de {progress.total}<span> conteúdos estudados</span></p></div>
    <div className={styles.filters} aria-label="Filtrar roadmap">{(['todos', 'em-andamento', 'disponiveis', 'revisar', 'concluidos'] as Filter[]).map((value) => <button key={value} type="button" className={filter === value ? styles.activeFilter : styles.filter} onClick={() => setFilter(value)}>{{ todos: 'Todos', 'em-andamento': 'Em andamento', disponiveis: 'Disponíveis', revisar: 'Revisar', concluidos: 'Concluídos' }[value]}</button>)}</div>
    <div className={styles.legend}><span>✓ Concluído</span><span>◔ Em aprendizado</span><span>○ Disponível</span><span>↻ Reaprender recomendado</span></div>
    <aside className={styles.choice} aria-label="Escolhas de repertório">
      <strong>Escolha um repertório de Brancas</strong>
      <span>Você precisa estudar uma opção para avançar; as outras continuam disponíveis para explorar.</span>
    </aside>
    <div className={styles.areas}>{ROADMAP_AREAS.map((area) => { const areaNodes = filtered.filter((node) => node.area === area.id); return areaNodes.length ? <RoadmapAreaSection key={area.id} area={area.id} title={area.title} description={area.description} nodes={areaNodes} /> : null })}</div>
  </div>
}

function RoadmapAreaSection({ area, title, description, nodes }: { area: RoadmapArea; title: string; description: string; nodes: RoadmapNodeView[] }) {
  return <section className={styles.area} aria-labelledby={`roadmap-${area}`}><div className={styles.areaHeading}><div><h3 id={`roadmap-${area}`}>{title}</h3><p>{description}</p></div><span>{nodes.length} conteúdos</span></div><div className={styles.nodes}>{[...nodes].sort((a, b) => a.order - b.order).map((node) => <article key={node.id} className={`${styles.node} ${styles[`state-${node.state}`]}`}><div className={styles.nodeIcon} aria-hidden="true">{node.completed ? '✓' : node.state === 'learning' ? '◔' : node.state === 'locked' ? '·' : '○'}</div><div className={styles.nodeBody}><h4>{node.title}</h4><p>{node.shortDescription}</p><span className={styles.state}>{stateLabel[node.state]}</span></div>{node.action !== 'bloqueado' ? <Link className={styles.action} href={node.skillId ? `/lessons/${node.skillId}` : '/lessons'}>{node.action === 'reaprender' ? 'Reaprender' : node.action === 'revisar' ? 'Revisar' : node.action === 'continuar' ? 'Continuar' : 'Aprender'}</Link> : <span className={styles.locked}>Pré-requisitos</span>}</article>)}</div></section>
}
