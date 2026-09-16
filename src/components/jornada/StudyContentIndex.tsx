'use client'

/**
 * O MAPA DO ESTUDO: todas as etapas, e todas alcançáveis.
 *
 * ELE É A OUTRA METADE DA DECISÃO. Tirar os dez rótulos da faixa principal
 * resolveria a largura e criaria um problema pior — o aluno deixaria de saber o
 * que existe na jornada. O índice é onde ver tudo ao mesmo tempo faz sentido:
 * ele é pedido, ocupa a tela por um momento e sai.
 *
 * NENHUMA ETAPA É BLOQUEADA. A palavra "ainda não aberta" saiu do produto. O que
 * o índice mostra é o estado no CAMINHO RECOMENDADO — concluída, atual,
 * disponível — e uma sugestão quando o aluno se adianta. Ele pode abrir assim
 * mesmo, e é isso que distingue orientar de aprisionar.
 *
 * ADIANTAR-SE NÃO CONCLUI NADA. Quem decide se a jornada terminou continua sendo
 * `jornadaConcluida`, que exige a regra de cada etapa cumprida — inclusive a
 * cobertura do treino. Espiar o treino cedo mostra o conteúdo e não marca ✓.
 */

import { useEffect, useRef } from 'react'
import {
  estadoNoTrilho,
  type EstadoNoTrilho,
  type StudyJourney,
  type StudyStage,
} from '@/domain/jornada'
import { useTraduzir } from '@/components/providers/LocaleProvider'
import type { ChaveDeMensagem } from '@/lib/i18n/mensagens'
import styles from './StudyContentIndex.module.css'

/** Símbolo por estado. Estado nunca depende só de cor — regra do CLAUDE.md. */
const SIMBOLO: Record<EstadoNoTrilho, string> = {
  concluida: '✓',
  atual: '◉',
  disponivel: '○',
}

const CHAVE_DO_ESTADO: Record<EstadoNoTrilho, ChaveDeMensagem> = {
  concluida: 'journey.stageStates.completed',
  atual: 'journey.stageStates.current',
  disponivel: 'journey.stageStates.available',
}

export interface StudyContentIndexProps {
  jornada: StudyJourney
  stages: readonly StudyStage[]
  aoEscolher: (stageId: string) => void
  aoFechar: () => void
}

export function StudyContentIndex({
  jornada,
  stages,
  aoEscolher,
  aoFechar,
}: StudyContentIndexProps) {
  const t = useTraduzir()
  const painel = useRef<HTMLDivElement>(null)
  const primeiro = useRef<HTMLButtonElement>(null)

  /*
    ESCAPE FECHA E O FOCO ENTRA NO PAINEL.

    Sem isso o índice é uma armadilha de teclado: ele cobre a tela, o foco
    continua atrás dele, e quem navega por teclado tabula por uma página que não
    está mais visível. É o mesmo contrato do `FiltroSuspenso`.
  */
  useEffect(() => {
    primeiro.current?.focus()
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [aoFechar])

  return (
    <div className={styles.fundo} onClick={aoFechar} role="presentation">
      <div
        ref={painel}
        className={styles.painel}
        role="dialog"
        aria-modal="true"
        aria-label={t('journey.studyMap')}
        onClick={(evento) => evento.stopPropagation()}
      >
        <div className={styles.topo}>
          <h2 className={styles.titulo}>{t('journey.studyMap')}</h2>
          <button type="button" className={styles.fechar} onClick={aoFechar}>
            {t('common.actions.close')}
          </button>
        </div>

        <p className={styles.ajuda}>{t('journey.studyMapHelp')}</p>

        <ol className={styles.lista}>
          {stages.map((stage, indice) => {
            const estado = estadoNoTrilho(jornada, stage)
            /*
              RECOMENDAÇÃO, NÃO BLOQUEIO. Uma etapa disponível que vem depois da
              atual ganha uma linha dizendo que o caminho sugerido passa antes
              por outra — e o botão continua clicável.
            */
            const adiantada =
              estado === 'disponivel' &&
              indice > stages.findIndex((item) => item.id === jornada.currentStageId)

            return (
              <li key={stage.id} className={styles.item} data-estado={estado}>
                <button
                  ref={indice === 0 ? primeiro : undefined}
                  type="button"
                  className={styles.etapa}
                  aria-current={estado === 'atual' ? 'step' : undefined}
                  onClick={() => aoEscolher(stage.id)}
                >
                  <span className={styles.marca} aria-hidden="true">
                    {SIMBOLO[estado]}
                  </span>
                  <span className={styles.texto}>
                    <span className={styles.nome}>
                      {indice + 1}. {stage.titulo}
                    </span>
                    <span className={styles.estado}>{t(CHAVE_DO_ESTADO[estado])}</span>
                    {adiantada ? (
                      <span className={styles.sugestao}>{t('journey.recommendedLater')}</span>
                    ) : null}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
