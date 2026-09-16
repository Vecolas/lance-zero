'use client'

/**
 * O desfecho de uma rodada.
 *
 * ESTE COMPONENTE É O LUGAR ONDE O BUG SERIA REINTRODUZIDO, e por isso ele não
 * aceita um título vindo de fora: o texto é DERIVADO do desfecho, por
 * `TITULO_DA_RODADA`, no domínio. Uma prop `titulo` faria a proibição depender
 * de cada chamador lembrar dela — que é exatamente como "Atividade concluída ✓"
 * acabou aparecendo depois de um erro.
 *
 * As duas identidades visuais são DIFERENTES e não compartilham nada (plano
 * §204): sucesso e falha nunca podem ser confundidos de relance. E a falha
 * nunca usa vermelho de blunder nem linguagem punitiva — ver
 * `RepertoireDeviationFeedback`, que trata o caso mais delicado.
 */

import type { ReactNode } from 'react'
import { TITULO_DA_RODADA, type DesfechoDaRodada } from '@/domain/jornada'
import styles from './RoundResultPanel.module.css'

export interface RoundResultPanelProps {
  desfecho: Exclude<DesfechoDaRodada, 'ativa'>
  /** Uma frase sobre o que aconteceu nesta rodada. */
  resumo: string
  /** Conteúdo específico do domínio — por exemplo, o painel de desvio. */
  children?: ReactNode
  /** Cobertura desta etapa, para o aluno ver o que ainda falta. */
  cobertura?: { cobertos: number; exigidos: number }
  aoProximaRodada: () => void
  aoSair?: () => void
}

export function RoundResultPanel({
  desfecho,
  resumo,
  children,
  cobertura,
  aoProximaRodada,
  aoSair,
}: RoundResultPanelProps) {
  return (
    <section className={styles.painel} data-desfecho={desfecho} role="status">
      <p className={styles.titulo}>
        {/* Símbolo + texto: nunca só o símbolo, nunca só a cor. */}
        <span className={styles.marca} aria-hidden="true">
          {desfecho === 'sucesso' ? '✓' : '↗'}
        </span>
        {TITULO_DA_RODADA[desfecho]}
      </p>

      <p className={styles.resumo}>{resumo}</p>

      {children}

      {cobertura ? (
        <p className={styles.cobertura}>
          {/*
            O aluno precisa ver que ERRAR NÃO APAGOU o que ele já cobriu. Sem
            este número, uma rodada falha parece ter zerado o treino — e o medo
            de perder progresso é o que faz alguém parar de tentar o difícil.
          */}
          {cobertura.cobertos} de {cobertura.exigidos}{' '}
          {cobertura.exigidos === 1 ? 'linha coberta' : 'linhas cobertas'} neste treino.
          {desfecho === 'falhou' && cobertura.cobertos > 0
            ? ' O que você já demonstrou continua valendo.'
            : null}
        </p>
      ) : null}

      <div className={styles.acoes}>
        <button type="button" className={styles.primario} onClick={aoProximaRodada}>
          Próxima rodada
        </button>
        {aoSair ? (
          <button type="button" className={styles.secundario} onClick={aoSair}>
            Encerrar por agora
          </button>
        ) : null}
      </div>
    </section>
  )
}
