/**
 * Tradução dos temas do Lichess para a nossa taxonomia de habilidades.
 *
 * Regra dura: tema sem correspondência é IGNORADO. Nunca chutamos uma
 * habilidade a partir de um tema parecido — `unknown` é melhor que um tema
 * inventado (PEDAGOGY.md, "Explicação determinística").
 *
 * Lacunas conhecidas e propositais:
 * - `tactics.overloaded-piece` não tem tema equivalente no Lichess. Lá,
 *   sobrecarga está dissolvida dentro de `deflection`. Preferimos deixar a
 *   habilidade sem fonte de puzzles a marcá-la errado em milhares de posições.
 * - `calculation.*` não tem tema equivalente. `long`/`veryLong` falam do
 *   tamanho da solução, não do hábito de cálculo. Esses exercícios vêm do
 *   módulo de cálculo, não do dump.
 * - `endgame.*` idem: `pawnEndgame` garante rei e peão, não oposição nem
 *   casas-chave. O currículo de finais é escrito à mão na Fase 8.
 * - `opening.*` idem: o tema `opening` só diz em que fase da partida o puzzle
 *   aconteceu.
 */

import type { SkillId } from '@/domain/types'

/**
 * Temas do Lichess que viram habilidade nossa.
 *
 * Um tema pode render mais de uma habilidade, mas só quando o nome do tema
 * garante as duas. Hoje nenhum caso precisa disso.
 */
export const LICHESS_THEME_SKILLS: Readonly<Record<string, readonly SkillId[]>> = {
  // --- motivos táticos com correspondência direta
  fork: ['tactics.fork'],
  hangingPiece: ['tactics.hanging-piece'],
  pin: ['tactics.pin'],
  skewer: ['tactics.skewer'],
  discoveredAttack: ['tactics.discovered-attack'],
  // Xeque duplo só existe através de um ataque descoberto.
  doubleCheck: ['tactics.discovered-attack'],
  deflection: ['tactics.deflection'],
  capturingDefender: ['tactics.removal-of-defender'],

  // --- mate na última fileira tem habilidade própria
  backRankMate: ['tactics.back-rank'],

  // --- todo o resto que termina em mate cai em rede de mate
  mate: ['tactics.mating-net'],
  mateIn1: ['tactics.mating-net'],
  mateIn2: ['tactics.mating-net'],
  mateIn3: ['tactics.mating-net'],
  mateIn4: ['tactics.mating-net'],
  mateIn5: ['tactics.mating-net'],
  smotheredMate: ['tactics.mating-net'],
  anastasiaMate: ['tactics.mating-net'],
  arabianMate: ['tactics.mating-net'],
  bodenMate: ['tactics.mating-net'],
  doubleBishopMate: ['tactics.mating-net'],
  dovetailMate: ['tactics.mating-net'],
  hookMate: ['tactics.mating-net'],
  killBoxMate: ['tactics.mating-net'],
  vukovicMate: ['tactics.mating-net'],
}

/**
 * Habilidades da nossa taxonomia que o dump do Lichess alimenta.
 * Serve para o planner saber o que dá para treinar com puzzles importados.
 */
export function skillsCoveredByPuzzles(): SkillId[] {
  const vistos = new Set<SkillId>()
  for (const skills of Object.values(LICHESS_THEME_SKILLS)) {
    for (const skill of skills) vistos.add(skill)
  }
  return [...vistos]
}

/**
 * Traduz uma lista de temas crus. Sem duplicatas e em ordem estável: a ordem
 * de `themes` manda, e o mesmo conjunto sempre produz a mesma lista.
 */
export function skillIdsForThemes(themes: readonly string[]): SkillId[] {
  const resultado: SkillId[] = []
  for (const tema of themes) {
    const skills = LICHESS_THEME_SKILLS[tema.trim()]
    if (skills === undefined) continue
    for (const skill of skills) {
      if (!resultado.includes(skill)) resultado.push(skill)
    }
  }
  return resultado
}

/**
 * Rótulos PT-BR dos temas que usamos.
 *
 * Estes textos só podem aparecer DEPOIS da resposta. No modo misto, mostrar
 * "garfo" antes do exercício destrói o valor de recuperação (PEDAGOGY.md).
 */
export const THEME_LABELS_PT: Readonly<Record<string, string>> = {
  fork: 'garfo',
  hangingPiece: 'peça pendurada',
  pin: 'cravada',
  skewer: 'espeto',
  discoveredAttack: 'ataque descoberto',
  doubleCheck: 'xeque duplo',
  deflection: 'desvio',
  capturingDefender: 'remoção do defensor',
  backRankMate: 'mate do corredor',
  mate: 'mate',
  mateIn1: 'mate em 1',
  mateIn2: 'mate em 2',
  mateIn3: 'mate em 3',
  mateIn4: 'mate em 4',
  mateIn5: 'mate em 5',
  smotheredMate: 'mate sufocado',
  anastasiaMate: 'mate de Anastasia',
  arabianMate: 'mate árabe',
  bodenMate: 'mate de Boden',
  doubleBishopMate: 'mate dos dois bispos',
  dovetailMate: 'mate da cauda de andorinha',
  hookMate: 'mate do gancho',
  killBoxMate: 'mate da caixa',
  vukovicMate: 'mate de Vuković',
  sacrifice: 'sacrifício',
  promotion: 'promoção',
  advancedPawn: 'peão avançado',
  endgame: 'final',
  middlegame: 'meio-jogo',
  opening: 'abertura',
  rookEndgame: 'final de torres',
  queenEndgame: 'final de damas',
  pawnEndgame: 'final de peões',
  bishopEndgame: 'final de bispos',
  knightEndgame: 'final de cavalos',
  advantage: 'ganho de material',
  crushing: 'vantagem decisiva',
  short: 'solução curta',
  long: 'solução longa',
  veryLong: 'solução muito longa',
  oneMove: 'lance único',
}

/** Rótulo PT-BR de um tema, ou `null` quando não temos tradução para ele. */
export function themeLabelPt(theme: string): string | null {
  return THEME_LABELS_PT[theme.trim()] ?? null
}

/**
 * Rótulos dos temas que sabemos nomear, em ordem estável.
 * Usado só na explicação DEPOIS da resposta.
 */
export function themeLabelsPt(themes: readonly string[]): string[] {
  const resultado: string[] = []
  for (const tema of themes) {
    const rotulo = themeLabelPt(tema)
    if (rotulo !== null && !resultado.includes(rotulo)) resultado.push(rotulo)
  }
  return resultado
}

/** Um tema é suportado quando vira habilidade nossa. */
export function isSupportedTheme(theme: string): boolean {
  return LICHESS_THEME_SKILLS[theme.trim()] !== undefined
}

/** `true` quando pelo menos um tema do puzzle vira habilidade nossa. */
export function hasSupportedTheme(themes: readonly string[]): boolean {
  return themes.some(isSupportedTheme)
}
