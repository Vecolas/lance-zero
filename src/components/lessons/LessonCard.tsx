'use client'

/**
 * O card de uma lição na biblioteca.
 *
 * O QUE MUDOU, e é a razão deste arquivo existir: a biblioteca era uma lista de
 * títulos. O aluno lia "A peça que ninguém está defendendo" e só descobria do que
 * se tratava depois de abrir — numa biblioteca de XADREZ, onde o assunto é uma
 * posição e a posição existe no conteúdo desde sempre.
 *
 * O MINI TABULEIRO É A PEÇA PRINCIPAL, e não um enfeite. Ele mostra a posição do
 * exemplo resolvido, que é a mais representativa que a lição tem por construção.
 * É ele que faz o aluno RECONHECER o tema antes de clicar — garfo se vê, cravada
 * se vê, oposição se vê. Nenhuma frase faz isso tão rápido quanto o desenho.
 *
 * O TABULEIRO NÃO É INTERATIVO. Na biblioteca ele é prévia: arrastar peça aqui
 * não significa nada, e um tabuleiro que aceita lance sem julgá-los ensina que o
 * app às vezes ignora o que você faz. A interação do card é uma só — abrir.
 *
 * O CARD INTEIRO É O LINK, e o botão é um reforço visual dentro dele. Dois alvos
 * separados no mesmo card obrigariam o aluno a mirar, e quem usa teclado ouviria
 * o mesmo destino duas vezes.
 *
 * NENHUM TEXTO FIXO AQUI. Rótulo de estado e verbo do botão vêm do dicionário; o
 * card recebe a ESCOLHA do domínio. É o que o faz existir em português e em
 * inglês sem virar dois componentes.
 */

import Link from 'next/link'
import { ChessBoardView } from '@/components/chess/ChessBoardView'
import { useIdioma } from '@/components/providers/LocaleProvider'
import type { AcaoDaLicao, CardDeLicao, EstadoDaLicao } from '@/domain/lessons'
import { getSkill } from '@/domain/skills/catalog'
import type { ChaveDeMensagem } from '@/lib/i18n/mensagens'
import { nomeDaHabilidade } from '@/lib/i18n/nomes-de-conteudo'
import styles from './LessonCard.module.css'

const CHAVE_DO_ESTADO: Record<EstadoDaLicao, ChaveDeMensagem> = {
  disponivel: 'lessons.states.available',
  'em-andamento': 'lessons.states.inProgress',
  concluida: 'lessons.states.completed',
  revisar: 'lessons.states.review',
  reaprender: 'lessons.states.relearn',
}

const CHAVE_DA_ACAO: Record<AcaoDaLicao, ChaveDeMensagem> = {
  aprender: 'common.actions.learn',
  continuar: 'common.actions.continue',
  rever: 'lessons.actions.reviewLesson',
  revisar: 'common.actions.review',
  reaprender: 'common.actions.relearn',
}

/** Símbolo por estado. Estado nunca depende só de cor — ver o CLAUDE.md. */
const SIMBOLO_DO_ESTADO: Record<EstadoDaLicao, string> = {
  disponivel: '○',
  'em-andamento': '◔',
  concluida: '✓',
  revisar: '↻',
  reaprender: '↻',
}

export interface LessonCardProps {
  card: CardDeLicao
  href: string
}

export function LessonCard({ card, href }: LessonCardProps) {
  const { locale, t } = useIdioma()
  const area = getSkill(card.habilidade).area
  const estado = t(CHAVE_DO_ESTADO[card.estado])

  return (
    <Link
      href={href}
      className={`${styles.card} ${styles[`estado-${card.estado}`]}`}
      /*
        O NOME ACESSÍVEL DIZ AS TRÊS COISAS: o que é, em que estado está e o que o
        clique faz. Só o título deixaria quem usa leitor de tela sem o estado, que
        é metade da razão de um card existir numa biblioteca com progresso.
      */
      aria-label={`${t('lessons.cardLabel', { titulo: card.titulo, estado })} ${t(
        CHAVE_DA_ACAO[card.acao],
      )}`}
    >
      <span className={styles.categoria}>{t(`lessons.areas.${area}` as ChaveDeMensagem)}</span>

      <span className={styles.previa}>
        {card.previa.tipo === 'mini-tabuleiro' ? (
          /*
            `aria-hidden`: o tabuleiro é PRÉVIA. Anunciar casa por casa daria a
            quem usa leitor de tela um despejo de coordenadas em vez de uma
            escolha — e o que identifica a lição, para essa pessoa, é o título e a
            descrição, que estão logo abaixo e são lidos.
          */
          <span className={styles.tabuleiro} aria-hidden="true">
            <ChessBoardView
              fen={card.previa.fen}
              orientation={card.previa.orientacao}
              interactive={false}
            />
          </span>
        ) : (
          <span className={styles.semPosicao} aria-hidden="true">
            ♟
          </span>
        )}
      </span>

      <span className={styles.titulo}>{card.titulo}</span>
      <span className={styles.descricao}>{card.descricao}</span>

      <span className={styles.meta}>
        {t('lessons.stepsAndTime', {
          etapas: card.totalDeEtapas,
          minutos: card.minutos,
        })}
        {' · '}
        {nomeDaHabilidade(card.habilidade, locale)}
      </span>

      <span className={styles.rodape}>
        <span className={styles.estado}>
          <span aria-hidden="true">{SIMBOLO_DO_ESTADO[card.estado]}</span> {estado}
        </span>
        {/*
          O "botão" é um SPAN, não um botão de verdade: o card inteiro já é o
          link. Um `<button>` aqui dentro seria um controle dentro de um link —
          HTML inválido, e um segundo alvo anunciado para a mesma ação.
        */}
        <span className={styles.cta}>{t(CHAVE_DA_ACAO[card.acao])} →</span>
      </span>
    </Link>
  )
}
