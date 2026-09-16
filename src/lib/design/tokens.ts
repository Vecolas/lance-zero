/**
 * Fonte única dos tokens de cor do LanceZero.
 *
 * Os mesmos valores viram custom properties em `src/app/tokens.css`. O teste
 * `tests/unit/tokens.test.ts` falha se os dois divergirem e verifica contraste
 * WCAG AA nos dois temas.
 *
 * Base: `identidade-visual/LanceZero_Guia_Identidade_Visual.md`. Onde o guia
 * define uma cor que reprova em AA como texto, esta lista traz uma variante
 * "-text" mais escura da mesma família — ver ADR-0007.
 */

/** Paleta da marca, exatamente como no guia. */
export const brandColors = {
  'bg-primary': '#F7F9FB',
  'bg-pure': '#FFFFFF',
  'bg-secondary': '#EEF3F7',
  'navy-950': '#071521',
  'navy-900': '#0B1D2C',
  'navy-800': '#112B40',
  'slate-600': '#596B78',
  'slate-400': '#91A0AA',
  'zero-blue': '#00A9D6',
  'zero-cyan': '#20C9E8',
  'zero-deep': '#087DA7',
  'zero-soft': '#D9F4FA',
} as const

/** Cores semânticas do guia. Usadas em preenchimento, ícone e borda. */
export const semanticColors = {
  success: '#18A572',
  attention: '#E5A82B',
  error: '#D9534F',
  info: '#3A8DDE',
} as const

/**
 * Variantes escurecidas para uso como TEXTO sobre fundo claro.
 *
 * As cores do guia foram pensadas para preenchimento; como texto sobre
 * `#F7F9FB` elas ficam entre 2.0:1 e 3.8:1 e reprovam em WCAG AA. Estas
 * variantes mantêm o matiz e passam em 4.5:1. No modo escuro as cores
 * originais já passam, então lá elas são usadas direto.
 */
export const lightTextColors = {
  'accent-text': '#007999',
  'success-text': '#138159',
  'attention-text': '#916A1B',
  'error-text': '#C04946',
  'info-text': '#3075B9',
  'muted-text': '#68727A',
} as const

/**
 * Variantes para uso como TEXTO SOBRE A TINTA DA PRÓPRIA COR.
 *
 * As de cima são calibradas contra `#F7F9FB`, e a margem delas é curta de
 * propósito: `attention-text` dá 4.64:1 sobre a página. Basta o texto pousar num
 * fundo levemente tingido — o selo de "Revisar" no Treinar é a cor dele a 13%
 * sobre a seção — para o contraste cair para 3.94:1 e REPROVAR.
 *
 * É a armadilha destas variantes: o nome diz "sobre fundo claro", e um selo
 * tingido ainda parece um fundo claro. Não é.
 *
 * Estas são as mesmas cores escurecidas em direção ao navy, mantendo o matiz, e
 * medidas contra o pior fundo plausível (a tinta sobre `--surface-sunken`): ficam
 * entre 4.7:1 e 5.2:1. No modo escuro a tinta é escura e as cores originais já
 * passam, então lá elas continuam valendo direto.
 */
export const tintedTextColors = {
  'success-on-tint': '#117151',
  'attention-on-tint': '#7C5D1C',
  'error-on-tint': '#A03B38',
} as const

/** Modo escuro. Nunca preto absoluto. */
export const darkColors = {
  'dark-background': '#07131C',
  'dark-surface': '#0C1C28',
  'dark-card': '#102331',
  'dark-border': '#1D3443',
  'dark-text': '#F1F5F7',
  'dark-text-muted': '#A2B2BC',
} as const

/** Tabuleiro e seus estados. Independente do tema da interface. */
export const boardColors = {
  'board-light': '#EDF3F6',
  'board-dark': '#AFC6D1',
  'board-contrast-light': '#E8EEF2',
  'board-contrast-dark': '#8FABB9',
  'board-last-move': '#C8EDF5',
  'board-selected': '#7FD7E8',
} as const

/** Barra de avaliação da engine. A engine não domina a tela. */
export const evaluationColors = {
  'eval-white': '#F4F6F8',
  'eval-black': '#102331',
} as const

export const designTokens = {
  ...brandColors,
  ...semanticColors,
  ...lightTextColors,
  ...tintedTextColors,
  ...darkColors,
  ...boardColors,
  ...evaluationColors,
} as const

export type DesignTokenName = keyof typeof designTokens

/**
 * Classificação de lance. Iconografia e nomes próprios — o guia pede
 * explicitamente para não copiar a linguagem visual dos concorrentes.
 */
export type MoveQuality = 'excelente' | 'bom' | 'imprecisao' | 'erro' | 'blunder'

export const moveQualityTokens: Record<MoveQuality, { label: string; token: DesignTokenName }> = {
  excelente: { label: 'Excelente', token: 'zero-blue' },
  bom: { label: 'Bom', token: 'success' },
  imprecisao: { label: 'Imprecisão', token: 'attention' },
  erro: { label: 'Erro', token: 'attention-text' },
  blunder: { label: 'Erro grave', token: 'error' },
}
