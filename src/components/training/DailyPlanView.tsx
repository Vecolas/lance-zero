'use client'

/**
 * O "Hoje".
 *
 * O QUE SAIU DAQUI, e é a mudança que o aluno vê: o botão **Começar o treino**.
 *
 * Ele não era um detalhe de interface. Ele era a afirmação de que o dia tinha
 * UMA sessão, linear, com começo e fim — e é essa afirmação que fazia o plano
 * ser uma lista de blocos de tempo em vez de uma lista de coisas para fazer.
 * Com o botão, a ordem era do app; sem ele, é do aluno. As atividades aqui são
 * independentes por construção: o planner tem proibição de pôr no mesmo dia
 * duas que dependam uma da outra (regra R2, em `podeEntrarCom`), e é
 * por isso que 4 → 1 → 5 → 2 → 3 não quebra nada.
 *
 * O ✓ É PERSISTENTE, e persistente de verdade: ele mora no plano gravado, não
 * no estado deste componente. Recarregar, navegar para fora e voltar, ou abrir
 * noutro aparelho depois do sync não desfazem conclusão nenhuma — ver
 * `@/domain/aprendizado/plano`, que é onde a fusão monotônica vive.
 *
 * CONCLUIR NÃO REGENERA O PLANO. A tela lê de `carregarPlanoDeHoje`, que gera
 * uma vez por dia e depois só lê. Se este componente chamasse o planner a cada
 * montagem, concluir uma atividade mudaria as entradas e os outros cards
 * mudariam de lugar sozinhos — ver o cabeçalho de `@/lib/training/plano-do-dia`.
 */

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { ERROS_RECENTES_CONFIG } from '@/domain/planning/erros-recentes'
import { aplicarRetencaoDePartida } from '@/domain/skills/retencao-de-partida'
import {
  ROTULO_DA_ATIVIDADE,
  ROTULO_DO_STATUS,
  SIMBOLO_DO_STATUS,
  progressoDoDia,
  type ActivityKind,
  type DailyActivity,
  type PlanoDoDia,
} from '@/domain/aprendizado'
import {
  carregarPlanoDeHoje,
  migrarHabilidadesSemEnsino,
  regerarPlanoDeHoje,
} from '@/lib/training/plano-do-dia'
import { semearCardsDeRepertorio } from '@/lib/training/repertorio-no-treino'
import { carregarSinaisDePartida } from '@/lib/training/sinais-de-partida'
import { BUDGET_OPTIONS } from '@/domain/profile'
import styles from './DailyPlanView.module.css'

/**
 * Cor por tipo — mas o RÓTULO em texto é que carrega o significado, e o símbolo
 * de status vem sempre com o texto ao lado. Status por cor sozinho é a regra
 * que o CLAUDE.md proíbe, e por forma sozinho falha do mesmo jeito.
 */
const COR_DA_ATIVIDADE: Record<ActivityKind, string> = {
  licao: 'var(--link)',
  'pratica-guiada': 'var(--link)',
  'pratica-independente': 'var(--note)',
  revisao: 'var(--note)',
  calculo: 'var(--link)',
  'revisao-de-partida': 'var(--warning)',
  diagnostico: 'var(--text-muted)',
}

export function DailyPlanView() {
  const { status, repo, profile, erro, saveProfile, revision } = useRepository()
  const [plano, setPlano] = useState<PlanoDoDia | null>(null)
  const [falha, setFalha] = useState<string | null>(null)

  /**
   * Monta o contexto do planner. UM lugar só.
   *
   * Carregar e regerar precisam do MESMO contexto; montá-lo duas vezes faria o
   * plano depois de trocar o tempo ser calculado a partir de entradas
   * ligeiramente diferentes das que geraram o primeiro — e a diferença
   * apareceria como um plano estranho, sem nada indicando a causa.
   */
  const montarContexto = useCallback(
    async (agora: Date) => {
      if (!repo || !profile) return null

      // Os nós de estudo do repertório precisam existir como card para poderem
      // vencer. Idempotente, e nunca sobrescreve agendamento.
      await semearCardsDeRepertorio(repo, { agora })

      // A migração dos usuários que já existem (plano §42): habilidade com card
      // agendado e sem nenhuma exposição registrada volta a ser ensinada antes
      // de voltar a ser cobrada. Roda na leitura porque não há como rodar
      // script no banco local de alguém.
      await migrarHabilidadesSemEnsino(repo, agora)

      const [sinais, partidas, dueCards, mastery] = await Promise.all([
        carregarSinaisDePartida(repo, { agora }),
        repo.listGames({ limit: 5 }),
        repo.getDueCards(agora),
        repo.getSkillMastery(),
      ])

      return {
        profile,
        dueCards,
        // O CICLO DO PRODUTO FECHA NESTA LINHA: o erro virou treino, e agora
        // perguntamos se a habilidade VOLTOU A FALHAR depois disso. A maestria
        // ajustada é uma VISÃO — nada é gravado —, então o efeito se desfaz
        // sozinho quando o veredito muda, sem bônus guardado no disco esperando
        // alguém lembrar de desfazê-lo.
        mastery: aplicarRetencaoDePartida(mastery, sinais.retencoes),
        recentGameErrors: sinais.recentGameErrors,
        // O ramo que apareceu em partida real: o aluno saiu do próprio
        // repertório, e o planner trata isso como evidência, não currículo.
        desviosDeRepertorio: sinais.desviosDeRepertorio,
        // "Por revisar" é a ausência do PASSE HUMANO, e não da análise da
        // engine: a revisão do LanceZero começa pelo aluno, e uma partida que a
        // engine já varreu mas o aluno nunca olhou continua por revisar.
        partidasPorRevisar: partidas
          .filter((partida) => partida.humanReview === undefined)
          .map((partida) => ({ id: partida.id, rotulo: `${partida.white} x ${partida.black}` })),
        now: agora,
      }
    },
    [repo, profile],
  )

  useEffect(() => {
    if (!repo || !profile) return
    let cancelado = false

    async function carregar() {
      if (!repo) return
      try {
        const agora = new Date()
        const contexto = await montarContexto(agora)
        if (contexto === null) return
        const doDia = await carregarPlanoDeHoje({ repo, contexto })
        if (!cancelado) setPlano(doDia)
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
  }, [repo, profile, revision, montarContexto])

  /**
   * Trocar o tempo disponível REGERA o plano de hoje.
   *
   * Não contradiz a §9 ("o plano não muda durante o dia"): a regra é contra
   * mudança silenciosa, e isto é o aluno pedindo em voz alta. O que já foi
   * concluído é preservado — ver `regerarPlanoDeHoje`.
   */
  async function trocarOrcamento(minutos: (typeof BUDGET_OPTIONS)[number]) {
    if (!repo || !profile) return
    const novoPerfil = { ...profile, dailyBudgetMinutes: minutos }
    await saveProfile(novoPerfil)
    try {
      const agora = new Date()
      const contexto = await montarContexto(agora)
      if (contexto === null) return
      setPlano(await regerarPlanoDeHoje({ repo, contexto: { ...contexto, profile: novoPerfil } }))
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'Não consegui remontar o seu plano.')
    }
  }

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

  if (!plano || !profile) {
    return <p className={styles.state}>Montando seu treino…</p>
  }

  const progresso = progressoDoDia(plano)

  return (
    <>
      <div className={styles.header}>
        <div>
          <p className={styles.summary}>
            <span className={styles.total}>
              {progresso.concluidas} de {progresso.total}
            </span>{' '}
            {progresso.total === 1 ? 'concluída' : 'concluídas'}
            {progresso.minutosRestantes > 0 ? (
              <> · cerca de {progresso.minutosRestantes} min restantes</>
            ) : null}
          </p>
          {/*
            A barra é decorativa: `aria-hidden`, com o número já dito no texto
            acima. Uma barra anunciada por leitor de tela repetiria a mesma
            informação numa forma pior.
          */}
          <div className={styles.progressTrack} aria-hidden="true" data-testid="progresso-do-dia">
            <div
              className={styles.progressFill}
              style={{
                width:
                  progresso.total === 0
                    ? '0%'
                    : `${Math.round((progresso.concluidas / progresso.total) * 100)}%`,
              }}
            />
          </div>
        </div>

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
                onClick={() => void trocarOrcamento(minutos)}
              >
                {minutos} min
              </button>
            ))}
          </div>
        </div>
      </div>

      {progresso.tudoConcluido ? (
        <p className={styles.concluido} role="status">
          <span aria-hidden="true">{SIMBOLO_DO_STATUS.concluida}</span> Plano de hoje concluído. O
          que vier agora é extra — e extra é escolha, não obrigação.
        </p>
      ) : null}

      {plano.activities.length === 0 ? (
        <p className={styles.empty}>
          Nada para hoje. Aumente o tempo disponível ou importe uma partida para o LanceZero ter o
          que analisar.
        </p>
      ) : (
        /*
          `ul` e não `ol`: numerar a lista afirmaria uma ordem, e a ordem é do
          aluno. A lista tem ordem de APRESENTAÇÃO — por prioridade — mas
          nenhuma ordem de execução.
        */
        <ul className={styles.blocks}>
          {plano.activities.map((atividade) => (
            <CardDeAtividade key={atividade.id} atividade={atividade} />
          ))}
        </ul>
      )}

      <p className={styles.note}>
        Cada atividade é independente: faça na ordem que você quiser, pare no meio e volte depois. O
        que você concluir fica marcado. O plano é montado a partir do que o LanceZero já te ensinou,
        das revisões vencidas e dos erros das partidas que você analisou nos últimos{' '}
        {ERROS_RECENTES_CONFIG.janelaDias} dias.
      </p>
    </>
  )
}

/**
 * Um card.
 *
 * O CARD INTEIRO É O LINK. O plano §7 pede isso e a razão é de acessibilidade
 * tanto quanto de toque: um botão "iniciar" dentro de um card exige mira, e o
 * alvo de toque passa a ser menor que o card que o aluno vê. Aqui o alvo é o
 * card.
 */
function CardDeAtividade({ atividade }: { atividade: DailyActivity }) {
  const { definition: definicao, status } = atividade
  const concluida = status === 'concluida'

  return (
    <li className={styles.block} data-status={status}>
      <Link href={definicao.href} className={styles.blockLink}>
        <span className={styles.statusCell}>
          {/*
            Símbolo e texto juntos: o símbolo é `aria-hidden` e o rótulo é lido.
            Sem o texto, "✓" seria status por forma — o mesmo defeito de status
            por cor, com outra roupa.
          */}
          <span className={styles.statusSymbol} aria-hidden="true">
            {SIMBOLO_DO_STATUS[status]}
          </span>
          <span className={styles.statusLabel}>{ROTULO_DO_STATUS[status]}</span>
        </span>

        <span className={styles.blockBody}>
          <span className={styles.blockTitle}>
            <span className={styles.kind} style={{ color: COR_DA_ATIVIDADE[definicao.kind] }}>
              {ROTULO_DA_ATIVIDADE[definicao.kind]}
            </span>
            {definicao.title}
          </span>
          <span className={styles.rationale}>{atividade.generatedReason}</span>
        </span>

        <span className={styles.minutes}>
          {concluida ? 'Rever' : `${definicao.estimatedMinutes} min`}
        </span>
      </Link>
    </li>
  )
}
