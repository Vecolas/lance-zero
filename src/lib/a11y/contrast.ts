/**
 * Cálculo de contraste WCAG 2.1. Puro TypeScript, sem dependência de DOM,
 * para poder ser usado em testes e futuramente em validação de temas.
 */

export interface Rgb {
  r: number
  g: number
  b: number
}

const HEX_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export function isHexColor(value: string): boolean {
  return HEX_PATTERN.test(value)
}

export function hexToRgb(hex: string): Rgb {
  if (!isHexColor(hex)) {
    throw new Error(`Cor hexadecimal inválida: ${hex}`)
  }

  const raw = hex.slice(1)
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw

  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  }
}

function channelLuminance(channel8bit: number): number {
  const c = channel8bit / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** Luminância relativa (WCAG 2.1), de 0 (preto) a 1 (branco). */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b)
}

/** Razão de contraste entre duas cores, de 1 a 21. */
export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground)
  const b = relativeLuminance(background)
  const lighter = Math.max(a, b)
  const darker = Math.min(a, b)
  return (lighter + 0.05) / (darker + 0.05)
}

export type TextSize = 'normal' | 'large'

/** WCAG AA: 4.5:1 para texto normal, 3:1 para texto grande. */
export function meetsWcagAA(
  foreground: string,
  background: string,
  size: TextSize = 'normal',
): boolean {
  const threshold = size === 'large' ? 3 : 4.5
  return contrastRatio(foreground, background) >= threshold
}
