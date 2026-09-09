'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { ERROS_RECENTES_CONFIG } from '@/domain/planning/erros-recentes'
import { buildDailyPlan, type RecentGameError } from '@/domain/planning/planner'
import { aplicarRetencaoDePartida } from '@/domain/skills/retencao-de-partida'
import { carregarSinaisDePartida } from '@/lib/training/sinais-de-partida'
import { BUDGET_OPTIONS } from '@/domain/profile'
import type { DailyPlan, PlanBlockKind, ReviewCard, SkillMastery } from '@/domain/types'
import styles from './DailyPlanView.module.css'

const KIND_LABEL: Record<PlanBlockKind, string> = {
  revisao: 'Revisão',
  'erro-de-partida': 'Seu erro',
  tatica: 'Tática',
  calculo: 'Cálculo',
  final: 'Final',
  abertura: 'Abertura',
}

/** Cada tipo tem cor própria — mas o rótulo em texto é que carrega o significado. */
const KIND_COLOR: Record<PlanBlockKind, string> = {
  revisao: 'var(--note)',
  'erro-de-partida': 'var(--warning)',
  tatica: 'var(--link)',
  calculo: 'var(--link)',
  final: 'var(--positive)',
  abertura: 'var(--text-muted)',
}

/** Seed estável por dia: o plano de hoje não muda a cada renderização. */
function seedForDay(now: Date): string {
  return now.toISOString().slice(0, 10)
}

interface Carregado {
  mastery: SkillMastery[]
  dueCards: ReviewCard[]
  recentGameErrors: RecentGameError[]
}

export function DailyPlanView() {
  const { status, repo, profile, erro, saveProfile, revision } = useRepository()
  const [dados, setDados] = useState<Carregado | null>(null)
  const [falha, setFalha] = useState<string | null>(null)

  useEffect(() => {
    if (!repo) return
    let cancelado = false

    async function carregar() {
      if (!repo) return
      try {
        const agora = new Date()
        // As duas leituras de partida moram num lugar só: a tela de progresso
        // usa a MESMA função. Duplicar a sequência aqui criaria duas janelas de
        // recência e duas bordas de data, divergindo sem nada acusar.
        const [mastery, dueCards, sinais] = await Promise.all([
          repo.getSkillMastery(),
          repo.getDueCards(agora),
          carregarSinaisDePartida(repo, { agora }),
        ])

        // O ciclo fecha aqui: o erro virou treino, e agora perguntamos se a
        // habilidade VOLTOU A FALHAR depois disso. A maestria ajustada é uma
        // VISÃO — nada é gravado —, então o efeito se desfaz sozinho quando o
        // veredito muda, sem bônus guardado esperando alguém desfazer.
        const masteryComRetencao = aplicarRetencaoDePartida(mastery, sinais.retencoes)
        const recentGameErrors: RecentGameError[] = sinais.recentGameErrors

        if (!cancelado) setDados({ mastery: masteryComRetencao, dueCards, recentGameErrors })
      } catch (e) {
        if (!cancelado) {
          setFalha(e instanceof Error ? e.message : 'Não consegui ler seus dados locais.')
        }
      }
    }

    void carregar()
    return () => {
      cancelado = true
    }
  }, [repo, revision])

  if (status === 'carregando') {
    return <p className={styles.state}>Abrindo seus dados locais…</p>
  }

  if (status === 'erro') {
    return (
      <p className={`${styles.state} ${styles.error}`} role="alert">
        {erro}
      </p>
    )
  }

  if (falha) {
    return (
      <p className={`${styles.state} ${styles.error}`} role="alert">
        {falha}
      </p>
    )
  }

  if (!dados || !profile) {
    return <p className={styles.state}>Montando seu treino…</p>
  }

  const agora = new Date()
  const plan: DailyPlan = buildDailyPlan(
    {
      profile,
      mastery: dados.mastery,
      dueCards: dados.dueCards,
      recentGameErrors: dados.recentGameErrors,
      now: agora,
    },
    seedForDay(agora),
  )

  return (
    <>
      <div className={styles.header}>
        <p className={styles.summary}>
          <span className={styles.total}>{plan.totalMinutes} min</span> em {plan.blocks.length}{' '}
          {plan.blocks.length === 1 ? 'bloco' : 'blocos'}, dentro do seu orçamento de{' '}
          {plan.budgetMinutes} min.
        </p>
        <div className={styles.budget}>
          <span className={styles.budgetLabel} id="orcamento">
            Tempo de hoje
          </span>
          <div className={styles.budgetGroup} role="group" aria-labelledby="orcamento">
            {BUDGET_OPTIONS.map((minutos) => (
              <button
                key={minutos}
                type="button"
                className={styles.budgetOption}
                aria-pressed={profile.dailyBudgetMinutes === minutos}
                onClick={() => void saveProfile({ ...profile, dailyBudgetMinutes: minutos })}
              >
                {minutos} min
              </button>
            ))}
          </div>
        </div>
      </div>

      {plan.blocks.length === 0 ? (
        <p className={styles.empty}>
          Nada para hoje. Aumente o tempo disponível ou importe uma partida para o LanceZero ter o
          que analisar.
        </p>
      ) : (
        <ol className={styles.blocks}>
          {plan.blocks.map((block) => (
            <li key={block.id} className={styles.block}>
              <h2 className={styles.blockTitle}>
                <span className={styles.kind} style={{ color: KIND_COLOR[block.kind] }}>
                  {KIND_LABEL[block.kind]}
                </span>
                {block.title}
              </h2>
              <span className={styles.minutes}>
                {block.estimatedMinutes} min · {block.itemCount}{' '}
                {block.itemCount === 1 ? 'item' : 'itens'}
              </span>
              <p className={styles.rationale}>{block.rationale}</p>
            </li>
          ))}
        </ol>
      )}

      <Link href="/train" className={styles.cta}>
        Começar o treino
      </Link>

      <p className={styles.note}>
        O plano é montado a partir das suas habilidades, das revisões vencidas e dos erros das
        partidas que você analisou nos últimos {ERROS_RECENTES_CONFIG.janelaDias} dias. Enquanto
        você não importar partidas, ele usa o currículo rotativo para quem está por volta de 1100.
      </p>
    </>
  )
}
