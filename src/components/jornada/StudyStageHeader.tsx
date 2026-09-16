'use client'

/**
 * O CABEÇALHO DA ETAPA: uma etapa por vez, e o Mapa do estudo ao lado.
 *
 * O QUE ELE SUBSTITUI. O trilho anterior imprimia os DEZ rótulos de uma jornada
 * de final lado a lado — "Visão | Reconhecer | Princípio | Demonstrar |
 * Progredir | Defender | Posições típicas | Dois lados | Guiada | Treino". Três
 * problemas, e o terceiro é o que decide:
 *
 * 1. a faixa come a largura que o tabuleiro deveria ter, numa tela em que o
 *    tabuleiro É o conteúdo;
 * 2. dez nomes competindo transformam uma jornada numa coleção de abas — o
 *    aluno passa a escolher entre rótulos em vez de seguir um curso;
 * 3. as etapas não alcançadas eram anunciadas como **"ainda não aberta"**, o que
 *    era literalmente verdade e pedagogicamente errado. O sistema deve orientar,
 *    não aprisionar.
 *
 * O QUE ENTRA NO LUGAR. Só a etapa atual, com posição e total: `Reconhecer —
 * 2/10`. Avançar troca o texto DESTE componente e nada mais na moldura da
 * página — é o que dá a sensação de curso contínuo em vez de troca de tela.
 *
 * A EXPLORAÇÃO NÃO SOME, ela muda de lugar: `StudyContentIndex` lista todas as
 * etapas com o estado de cada uma, e qualquer uma abre. O índice é o lugar certo
 * para ver tudo ao mesmo tempo; a faixa principal não era.
 */

import { progressoDaJornada, type StudyJourney, type StudyStage } from '@/domain/jornada'
import { useTraduzir } from '@/components/providers/LocaleProvider'
import styles from './StudyStageHeader.module.css'

export interface StudyStageHeaderProps {
  jornada: StudyJourney
  stages: readonly StudyStage[]
  /** A etapa que está aberta. */
  stage: StudyStage
  /** Abre o Mapa do estudo. Ausente esconde o botão. */
  aoAbrirMapa?: () => void
}

export function StudyStageHeader({ jornada, stages, stage, aoAbrirMapa }: StudyStageHeaderProps) {
  const t = useTraduzir()
  const progresso = progressoDaJornada(jornada, stages)
  const indice = stages.findIndex((item) => item.id === stage.id) + 1
  const total = stages.length
  const porcento = total === 0 ? 0 : Math.round((progresso.concluidas / total) * 100)

  return (
    <div className={styles.cabecalho}>
      <div className={styles.identidade}>
        {/*
          NOME + POSIÇÃO NA MESMA LINHA, e a posição não é decoração: sem ela o
          aluno sabe o que está fazendo e não sabe quanto falta — que é a
          diferença entre um curso e uma sequência de telas sem fim.
        */}
        <h2 className={styles.nome}>
          {stage.titulo}
          <span className={styles.contador}> — {t('journey.stageCounter', { indice, total })}</span>
        </h2>
        <p className={styles.objetivo}>{stage.objetivo}</p>
      </div>

      <div className={styles.direita}>
        {/*
          A BARRA MEDE CONCLUSÃO, não posição. São coisas diferentes: o aluno
          pode estar visitando a etapa 7 pelo Mapa com três concluídas, e uma
          barra que seguisse o cursor diria que ele completou 70%.

          `aria-hidden` porque a mesma informação já está escrita ao lado, em
          texto. Duas fontes para leitor de tela seria repetição, não reforço.
        */}
        <div
          className={styles.barra}
          role="presentation"
          aria-hidden="true"
          data-testid="progresso-da-jornada"
        >
          <span style={{ width: `${porcento}%` }} />
        </div>
        <span className={styles.concluidas}>
          {t('journey.stagesProgress', { done: progresso.concluidas, total })}
        </span>
        {aoAbrirMapa ? (
          <button type="button" className={styles.mapa} onClick={aoAbrirMapa}>
            <span aria-hidden="true">☰</span> {t('journey.studyMap')}
          </button>
        ) : null}
      </div>
    </div>
  )
}
