/**
 * Temas de tabuleiro do LanceZero.
 *
 * O tabuleiro é conteúdo, não cromo: a paleta das casas é a mesma em modo
 * claro e escuro, para que a mesma posição não mude de aparência quando o
 * usuário troca o tema.
 */
import { boardColors, brandColors } from './tokens'

export type BoardThemeName = 'claro' | 'contraste'

export interface BoardTheme {
  name: BoardThemeName
  label: string
  light: string
  dark: string
}

export const boardThemes: Record<BoardThemeName, BoardTheme> = {
  claro: {
    name: 'claro',
    label: 'LanceZero Claro',
    light: boardColors['board-light'],
    dark: boardColors['board-dark'],
  },
  contraste: {
    name: 'contraste',
    label: 'LanceZero Contraste',
    light: boardColors['board-contrast-light'],
    dark: boardColors['board-contrast-dark'],
  },
}

export const DEFAULT_BOARD_THEME: BoardThemeName = 'claro'

/**
 * Destaques do tabuleiro.
 *
 * Cada papel tem cor própria: o lance do aluno nunca usa a mesma cor da
 * sugestão da engine. Captura possível é anel, nunca casa preenchida — e
 * ameaça nunca é vermelho agressivo.
 */
export const boardHighlights = {
  /** Último lance jogado. */
  lastMove: boardColors['board-last-move'],
  /** Casa selecionada pelo usuário. */
  selected: boardColors['board-selected'],
  /** Destino legal: círculo discreto em Zero Blue translúcido. */
  legalTarget: 'rgba(0, 169, 214, 0.45)',
  /** Captura possível: anel, nunca preenchimento. */
  captureTarget: 'rgba(0, 169, 214, 0.75)',
  /** Rei em xeque: contorno na cor de erro, não preenchimento. */
  check: 'rgba(217, 83, 79, 0.95)',
  /** Sugestão da engine: Zero Deep, deliberadamente diferente do destaque do aluno. */
  engine: brandColors['zero-deep'],
} as const
