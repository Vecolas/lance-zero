/**
 * Temas de tabuleiro do LanceZero.
 *
 * Decisão de marca: nada de verde Lichess nem marrom Chess.com. As cores vêm
 * dos tokens em `tokens.ts` e são validadas pelo teste de contraste.
 */
import { boardColors } from './tokens'

export type BoardThemeName = 'paper' | 'graphite'

export interface BoardTheme {
  name: BoardThemeName
  label: string
  light: string
  dark: string
}

export const boardThemes: Record<BoardThemeName, BoardTheme> = {
  paper: {
    name: 'paper',
    label: 'LanceZero Paper',
    light: boardColors['board-paper-light'],
    dark: boardColors['board-paper-dark'],
  },
  graphite: {
    name: 'graphite',
    label: 'LanceZero Graphite',
    light: boardColors['board-graphite-light'],
    dark: boardColors['board-graphite-dark'],
  },
}

/**
 * Destaques. Cada papel tem cor própria: o lance do aluno nunca usa a mesma cor
 * do lance sugerido pela engine, e ameaça é contorno, não preenchimento
 * vermelho agressivo.
 */
export const boardHighlights = {
  /** Último lance jogado: âmbar suave. */
  lastMove: 'rgba(217, 164, 65, 0.45)',
  /** Casa selecionada pelo usuário: coral da marca. */
  selected: 'rgba(255, 107, 74, 0.40)',
  /** Destino legal a partir da casa selecionada. */
  legalTarget: 'rgba(255, 107, 74, 0.85)',
  /** Rei em xeque: contorno, não preenchimento. */
  check: 'rgba(255, 107, 74, 0.95)',
  /** Sugestão da engine: azul-cinza neutro, deliberadamente diferente do coral. */
  engine: 'rgba(90, 122, 158, 0.85)',
} as const
