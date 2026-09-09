'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRepository } from '@/components/providers/RepositoryProvider'
import {
  ERROS_RECENTES_CONFIG,
  errosRecentesDeAnalises,
  indexarPartidas,
  inicioDaJanela,
} from '@/domain/planning/erros-recentes'
import { buildDailyPlan, type RecentGameError } from '@/domain/planning/planner'
import {
  instantesDeTreinoPorHabilidade,
  verificarRetencaoDeTreinos,
} from '@/domain/planning/retencao'
import { aplicarRetencaoDePartida } from '@/domain/skills/retencao-de-partida'
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
        // Só partidas dentro da janela de recência interessam ao planner, e o
        // repositório já sabe filtrar por data: pedir tudo e descartar depois
        // custaria leitura à toa. A MESMA borda que o domínio usa — `since` é
        // comparado por instante do outro lado (ver `@/lib/storage/query`),
        // então uma partida importada com offset não é cortada aqui e aceita
        // lá. Trocar isto por um recorte próprio ressuscita a issue #53.
        const desde = inicioDaJanela(agora).toISOString()
        const [mastery, dueCards, partidas, todosOsCards] = await Promise.all([
          repo.getSkillMastery(),
          repo.getDueCards(agora),
          repo.listGames({ since: desde, limit: ERROS_RECENTES_CONFIG.maxPartidasVarridas }),
          // Todos os cards, não só os vencidos: quem decide quando a habilidade
          // "virou treino" é a data de CRIAÇÃO do card, e um card já revisado
          // não está vencido hoje mas continua marcando o início da janela.
          repo.listReviewCards(),
        ])
        // As análises são lidas por partida (é o que o repositório oferece),
        // então isto é N leituras — COM TETO: `listGames` já veio limitado por
        // `maxPartidasVarridas`, e as partidas vêm da mais recente para a mais
        // antiga. Sem esse teto, quem importou mil partidas pagaria mil
        // leituras para abrir o "Treino de hoje".
        const analisesPorPartida = await Promise.all(
          partidas.map((partida) => repo.listPositionAnalyses(partida.id)),
        )
        const recentGameErrors: RecentGameError[] = errosRecentesDeAnalises(
          analisesPorPartida.flat(),
          indexarPartidas(partidas),
          { agora },
        )
        // O ciclo fecha aqui: o erro virou treino, e agora perguntamos se a
        // habilidade VOLTOU A FALHAR depois disso. A maestria ajustada é uma
        // VISÃO — nada é gravado —, então o efeito se desfaz sozinho quando o
        // veredito muda, sem bônus guardado esperando alguém desfazer.
        //
        // LIMITE DECLARADO: a verificação só enxerga as partidas carregadas
        // acima, que são as da janela de recência e no máximo
        // `maxPartidasVarridas`. Uma habilidade treinada há mais tempo que essa
        // janela é julgada com menos partidas do que existem — o viés é para
        // MENOS evidência (`sem-evidencia` / `evidencia-insuficiente`), nunca
        // para afirmar melhora que não houve.
        const retencoes = verificarRetencaoDeTreinos(
          instantesDeTreinoPorHabilidade(todosOsCards),
          analisesPorPartida.flat(),
          indexarPartidas(partidas),
          { agora },
        )
        const masteryComRetencao = aplicarRetencaoDePartida(mastery, retencoes)

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
