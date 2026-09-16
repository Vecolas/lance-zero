'use client'

/**
 * O trilho de progresso da jornada.
 *
 * NÃO É UMA TAB BAR, e a diferença é a razão de ele existir (plano §14). A tab
 * bar antiga — "Visão geral | Aprender | Variações | Planos | Treinar" — pedia
 * ao aluno que ESCOLHESSE a próxima etapa pedagógica, o que exige entender a
 * arquitetura da interface antes de aprender xadrez. O trilho faz o contrário:
 * ele INFORMA onde o aluno está e deixa voltar ao que já foi visto.
 *
 * O que ele deliberadamente NÃO deixa fazer é pular adiante — ir direto ao
 * treino sem ter recebido a linha principal seria recriar o problema com outro
 * componente. Quem recusa é o domínio (`voltarParaEtapa`), não este arquivo; a
 * tela só não oferece o botão.
 *
 * NO CELULAR ele vira indicador compacto em vez de espremer nove rótulos numa
 * linha (plano §200): abaixo de 40rem some o texto de cada passo e fica a
 * contagem — que o cabeçalho já escreve por extenso, então nada se perde.
 */

import { estadoNoTrilho, type StudyJourney, type StudyStage } from '@/domain/jornada'
import styles from './StudyProgressRail.module.css'

const SIMBOLO = {
  concluida: '●',
  atual: '◉',
  futura: '○',
} as const

const ROTULO_DO_ESTADO = {
  concluida: 'concluída',
  atual: 'etapa atual',
  futura: 'ainda não aberta',
} as const

export interface StudyProgressRailProps {
  jornada: StudyJourney
  stages: readonly StudyStage[]
  /** Voltar para uma etapa já concluída. Ausente desabilita a navegação. */
  aoEscolher?: (stageId: string) => void
}

export function StudyProgressRail({ jornada, stages, aoEscolher }: StudyProgressRailProps) {
  return (
    <nav className={styles.rail} aria-label="Progresso da jornada">
      <ol className={styles.lista}>
        {stages.map((stage, indice) => {
          const estado = estadoNoTrilho(jornada, stage)
          const navegavel = estado === 'concluida' && aoEscolher !== undefined

          return (
            <li key={stage.id} className={styles.passo} data-estado={estado}>
              {navegavel ? (
                <button
                  type="button"
                  className={styles.botao}
                  onClick={() => aoEscolher?.(stage.id)}
                  aria-current={undefined}
                >
                  <Conteudo estado={estado} stage={stage} indice={indice} />
                </button>
              ) : (
                <span
                  className={styles.estatico}
                  aria-current={estado === 'atual' ? 'step' : undefined}
                >
                  <Conteudo estado={estado} stage={stage} indice={indice} />
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function Conteudo({
  estado,
  stage,
  indice,
}: {
  estado: keyof typeof SIMBOLO
  stage: StudyStage
  indice: number
}) {
  return (
    <>
      {/*
        Símbolo + rótulo + estado por extenso. Os três, porque status por forma
        sozinho falha para leitor de tela do mesmo jeito que status por cor
        falha para quem não a distingue.
      */}
      <span className={styles.marca} aria-hidden="true">
        {SIMBOLO[estado]}
      </span>
      <span className={styles.rotulo}>{stage.rotuloCurto}</span>
      <span className={styles.leitorDeTela}>
        Etapa {indice + 1}: {stage.titulo}, {ROTULO_DO_ESTADO[estado]}
      </span>
    </>
  )
}
