'use client'

/**
 * MODO REFERÊNCIA — consulta sem percorrer a jornada (plano §139–143).
 *
 * POR QUE ELE EXISTE. A jornada resolve o problema de APRENDER: o produto
 * decide a sequência, e o aluno não precisa entender a interface antes de
 * entender xadrez. Mas depois de aprender, o aluno tem outra necessidade, e ela
 * é oposta: "qual era mesmo o lance na Two Knights?". Obrigá-lo a atravessar
 * nove etapas para reler uma linha transformaria a sequência — que é uma ajuda
 * — numa gaiola.
 *
 * A REGRA QUE O SEPARA DA JORNADA, e é a razão de ser um componente e não uma
 * etapa: **consultar não altera progresso**. Este arquivo NÃO recebe
 * `aoAvancar`, NÃO recebe a jornada para gravar, e não tem como escrever nada.
 * A trava é a assinatura: não existe caminho daqui até `saveStudyJourney`.
 *
 * Se um dia a consulta precisar mover o progresso — por exemplo, um "marcar
 * como revisado" —, isso é uma AÇÃO PEDAGÓGICA EXPLÍCITA e entra como tal, com
 * o aluno pedindo. Nunca como efeito colateral de ter lido.
 */

import type { ReactNode } from 'react'
import type { StudyStage } from '@/domain/jornada'
import styles from './ModoReferencia.module.css'

export interface ModoReferenciaProps {
  titulo: string
  stages: readonly StudyStage[]
  /**
   * O conteúdo de cada etapa, renderizado por quem conhece o domínio.
   *
   * A casca não sabe o que é repertório nem tablebase — mesma fronteira do
   * `StudyJourneyShell`.
   */
  conteudoDaEtapa: (stage: StudyStage) => ReactNode
  aoSair: () => void
}

export function ModoReferencia({ titulo, stages, conteudoDaEtapa, aoSair }: ModoReferenciaProps) {
  /*
    O TREINO FICA DE FORA da consulta. Ele não é conteúdo para reler: é uma
    demonstração com rodadas, e abri-lo aqui criaria um segundo caminho para o
    treino — um que não passa pela cobertura e não registra desfecho. Duas
    portas para a mesma sala, e só uma delas contando.
  */
  const consultaveis = stages.filter((stage) => stage.ehTreinoFinal !== true)

  return (
    <div className={styles.pagina}>
      <div className={styles.cabecalho}>
        <div>
          <p className={styles.modo}>MODO REFERÊNCIA</p>
          <p className={styles.nota}>
            Tudo o que você estudou de {titulo}, em uma página só e na ordem que você quiser.
            Consultar aqui <strong>não altera o seu progresso</strong>.
          </p>
        </div>
        <button type="button" className={styles.voltar} onClick={aoSair}>
          Voltar ao estudo
        </button>
      </div>

      {/* Índice: consulta é ir direto ao ponto, e rolar nove seções não é isso. */}
      <nav className={styles.indice} aria-label="Seções da referência">
        <ul>
          {consultaveis.map((stage) => (
            <li key={stage.id}>
              <a href={`#ref-${stage.id}`}>{stage.titulo}</a>
            </li>
          ))}
        </ul>
      </nav>

      {consultaveis.map((stage) => (
        <section
          key={stage.id}
          id={`ref-${stage.id}`}
          className={styles.secao}
          aria-labelledby={`ref-titulo-${stage.id}`}
        >
          <h2 id={`ref-titulo-${stage.id}`} className={styles.secaoTitulo}>
            {stage.titulo}
          </h2>
          <div className={styles.conteudo}>{conteudoDaEtapa(stage)}</div>
        </section>
      ))}
    </div>
  )
}
