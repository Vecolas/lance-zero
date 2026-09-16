'use client'

/**
 * Tabuleiro grande à esquerda, instrução ao lado.
 *
 * POR QUE UM COMPONENTE E NÃO UMA CLASSE SOLTA: a regra vale para Aberturas e
 * para Finais, e as duas jornadas desenham o tabuleiro dentro do conteúdo da
 * etapa. Uma classe copiada nos dois arquivos divergiria na primeira correção de
 * layout — e aí um dos módulos passaria a ter o tabuleiro menor que o outro, sem
 * ninguém decidir isso.
 *
 * ELA NÃO SUBSTITUI O SLOT DA CASCA. `StudyJourneyShell` tem um slot `tabuleiro`
 * que monta duas colunas; ele é para quem consegue separar o tabuleiro do resto
 * do conteúdo. Estas duas jornadas não conseguem hoje — o tabuleiro é tecido no
 * meio da etapa, com seleção, clique e resultado — e a mesa é a forma de aplicar
 * a mesma regra sem reescrever as duas telas por dentro.
 */

import type { ReactNode } from 'react'
import styles from './MesaDeEstudo.module.css'

export interface MesaDeEstudoProps {
  /** O tabuleiro. Vem primeiro no DOM: é ele que manda, em qualquer largura. */
  tabuleiro: ReactNode
  /** A instrução, o feedback, os controles — tudo o que se lê ao lado. */
  children: ReactNode
}

export function MesaDeEstudo({ tabuleiro, children }: MesaDeEstudoProps) {
  return (
    <div className={styles.mesa}>
      <div className={styles.tabuleiro}>{tabuleiro}</div>
      {/*
        `data-testid` porque a regra "instrução AO LADO do tabuleiro" só existe
        se for medida. Sem um alvo estável, o portão visual teria de adivinhar
        qual bloco de texto é o painel — e passaria a reprovar na primeira
        mudança de classe.
      */}
      <div className={styles.instrucao} data-testid="instrucao-do-estudo">
        {children}
      </div>
    </div>
  )
}
