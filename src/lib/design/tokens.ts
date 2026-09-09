/**
 * Fonte única dos tokens de cor da marca LanceZero.
 *
 * Os mesmos valores são expostos como custom properties CSS em
 * `src/app/tokens.css`. O teste `tests/unit/tokens.test.ts` garante que os dois
 * arquivos não divergem e que os pares de texto/fundo passam em WCAG AA.
 */
export const brandColors = {
  'ink-950': '#101318',
  'ink-800': '#20252C',
  'paper-50': '#F6F1E8',
  'paper-200': '#E5DED2',
  'signal-500': '#FF6B4A',
  'sage-500': '#7FA68A',
  'slate-500': '#68707D',
} as const

export const boardColors = {
  'board-paper-light': '#E8E0D3',
  'board-paper-dark': '#778276',
  'board-graphite-light': '#C9C9C2',
  'board-graphite-dark': '#555F64',
} as const

export const designTokens = { ...brandColors, ...boardColors } as const

export type DesignTokenName = keyof typeof designTokens
