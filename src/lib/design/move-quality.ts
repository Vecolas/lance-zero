/**
 * Iconografia e leitura das classificações de lance — seção 28 do guia.
 *
 * DECISÃO QUE ESTE ARQUIVO CARREGA: a classificação é uma unidade indivisível.
 * Cor, ícone e texto saem juntos ou não saem. Não existe, e não deve passar a
 * existir, uma função que devolva só a cor: se existisse, mais cedo ou mais
 * tarde alguém pintaria o selo e esqueceria o resto, e o status passaria a
 * depender só de cor — proibido pelo CLAUDE.md e pela seção 55 do guia.
 *
 * A cor não é recopiada aqui. O nome do token de preenchimento nasce de
 * `moveQualityTokens` (tokens.ts) e a cor legível vem de um papel semântico do
 * `tokens.css`, que já troca sozinho entre tema claro e escuro. As cores cruas
 * do guia reprovam em WCAG AA sobre fundo claro; ver ADR-0007.
 *
 * SOBRE IMPRECISÃO E ERRO TEREM A MESMA COR: o guia pede "Attention" para
 * imprecisão e "Orange / Attention dark" para erro. Sobre fundo claro a única
 * das duas que passa em AA é a escura, então as duas convergem para o mesmo
 * papel. Isso não perde informação porque a cor nunca é o único sinal: as
 * silhuetas (triângulo e losango) e os rótulos continuam distintos. É
 * exatamente o caso que a regra "nunca só por cor" existe para cobrir.
 *
 * Os símbolos são próprios de propósito — o guia proíbe copiar a linguagem
 * visual dos concorrentes. São cinco silhuetas francamente diferentes para que
 * a distinção sobreviva a 16 px, em preto e branco, e para quem não separa
 * matizes.
 */

import { moveQualityTokens, type DesignTokenName, type MoveQuality } from '@/lib/design/tokens'
import type { MoveSeverity } from '@/domain/types'

export interface MoveQualityIcon {
  readonly viewBox: string
  /** Um único `d`; subcaminhos viram vazado porque o traçado usa `evenodd`. */
  readonly path: string
}

export interface MoveQualityDescriptor {
  readonly quality: MoveQuality
  readonly label: string
  /** Token de PREENCHIMENTO do guia. Guardado para rastreabilidade. */
  readonly fillToken: DesignTokenName
  /** Papel semântico legível nos dois temas. Ver o cabeçalho. */
  readonly colorVar: string
  readonly icon: MoveQualityIcon
  /** Frase curta, analítica, sem julgar quem jogou. */
  readonly resumo: string
}

/**
 * Silhuetas próprias. `Record` fechado: acrescentar uma classificação em
 * `MoveQuality` quebra a compilação aqui até que ela ganhe ícone.
 */
const ICONES: Record<MoveQuality, MoveQualityIcon> = {
  excelente: {
    viewBox: '0 0 16 16',
    path: 'M8 0.8 9.75 6.25 15.2 8 9.75 9.75 8 15.2 6.25 9.75 0.8 8 6.25 6.25Z',
  },
  bom: {
    viewBox: '0 0 16 16',
    path: 'M14.2 8A6.2 6.2 0 1 1 1.8 8a6.2 6.2 0 0 1 12.4 0Z',
  },
  imprecisao: {
    viewBox: '0 0 16 16',
    path: 'M8 1.4 15.1 14.2H0.9Z',
  },
  erro: {
    viewBox: '0 0 16 16',
    path: 'M8 1 15 8 8 15 1 8Z',
  },
  blunder: {
    viewBox: '0 0 16 16',
    path: 'M5.6 1.2h4.8L14.8 5.6v4.8L10.4 14.8H5.6L1.2 10.4V5.6ZM4.2 6.9h7.6v2.2H4.2Z',
  },
}

/** Papel semântico por classificação. Todos existem nos três blocos do tokens.css. */
const CORES: Record<MoveQuality, string> = {
  excelente: 'var(--accent-readable)',
  bom: 'var(--positive)',
  imprecisao: 'var(--warning)',
  erro: 'var(--warning)',
  blunder: 'var(--danger)',
}

const RESUMOS: Record<MoveQuality, string> = {
  excelente: 'O melhor lance da posição.',
  bom: 'Mantém a avaliação da posição.',
  imprecisao: 'Cede um pouco da posição.',
  erro: 'Muda a avaliação de forma sensível.',
  blunder: 'Muda o resultado provável da partida.',
}

function montar(quality: MoveQuality): MoveQualityDescriptor {
  const base = moveQualityTokens[quality]
  return {
    quality,
    label: base.label,
    fillToken: base.token,
    colorVar: CORES[quality],
    icon: ICONES[quality],
    resumo: RESUMOS[quality],
  }
}

/**
 * Catálogo derivado de `moveQualityTokens`. Percorrer a FONTE, e não uma lista
 * escrita à mão, é o que garante que uma classificação nova apareça aqui.
 */
export const moveQualityCatalog: Record<MoveQuality, MoveQualityDescriptor> = Object.fromEntries(
  (Object.keys(moveQualityTokens) as MoveQuality[]).map((q) => [q, montar(q)]),
) as Record<MoveQuality, MoveQualityDescriptor>

export function describeMoveQuality(quality: MoveQuality): MoveQualityDescriptor {
  return moveQualityCatalog[quality]
}

/**
 * Severidade do domínio para classificação visual.
 *
 * A severidade é o que o pipeline mede; a classificação é como isso se
 * apresenta. São vocabulários diferentes de propósito: `ok` não vira
 * "excelente", porque não perder avaliação não é o mesmo que ter achado o
 * melhor lance — e afirmar isso seria falsa precisão.
 */
const QUALIDADE_POR_SEVERIDADE: Record<MoveSeverity, MoveQuality> = {
  ok: 'bom',
  imprecisao: 'imprecisao',
  erro: 'erro',
  'erro-grave': 'blunder',
}

export function moveQualityFromSeverity(severity: MoveSeverity): MoveQuality {
  return QUALIDADE_POR_SEVERIDADE[severity]
}
