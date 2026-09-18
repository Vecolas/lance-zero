/**
 * Os NOMES do conteúdo, por idioma.
 *
 * A SEPARAÇÃO QUE ESTE ARQUIVO CRAVA: o id é canônico, o nome é apresentação.
 * `tactics.fork` é `tactics.fork` em português e em inglês; o que muda é "Garfo"
 * ou "Fork". O mesmo vale para `italiana` → "Abertura Italiana" / "Italian Game"
 * e `opposition` → "Oposição" / "Opposition".
 *
 * POR QUE AQUI E NÃO NO CATÁLOGO DE CONTEÚDO: o catálogo carrega dado de xadrez —
 * FEN, lances, grafo de variantes, frequência. Esse dado é o mesmo nos dois
 * idiomas e não pode ser duplicado por locale; duplicá-lo seria criar duas
 * versões da mesma abertura, livres para divergir num lance. Só o texto humano
 * mora aqui.
 *
 * O PORTUGUÊS É A FONTE. Ele vem do próprio catálogo, e não de uma cópia — é
 * assim que o nome mostrado em português continua sendo o mesmo que os testes de
 * conteúdo leem. Só o inglês é escrito à mão, e só o que falta aparece no portão.
 *
 * NOMES OFICIAIS EM INGLÊS, e não tradução literal: "Abertura Italiana" é
 * "Italian Game", não "Italian Opening"; "Espeto" é "Skewer". Ver
 * `docs/i18n-glossary.md` — a consistência editorial mora lá.
 */

import { ENDGAME_DEFINITIONS } from '@/content/endgames/biblioteca'
import { OPENING_COURSES } from '@/content/openings/course'
import { SKILL_CATALOG } from '@/domain/skills/catalog'
import type { SkillId } from '@/domain/types'
import { DEFAULT_LOCALE, type AppLocale } from './locales'

/** Habilidade → nome em inglês. O português vem do catálogo. */
const HABILIDADE_EM_INGLES: Record<string, string> = {
  'tactics.hanging-piece': 'Hanging piece',
  'tactics.fork': 'Fork',
  'tactics.pin': 'Pin',
  'tactics.skewer': 'Skewer',
  'tactics.discovered-attack': 'Discovered attack',
  'tactics.removal-of-defender': 'Removing the defender',
  'tactics.deflection': 'Deflection',
  'tactics.overloaded-piece': 'Overloaded piece',
  'tactics.back-rank': 'Back rank',
  'tactics.mating-net': 'Mating net',
  'calculation.checks-captures-threats': 'Checks, captures and threats',
  'calculation.candidate-moves': 'Candidate moves',
  'calculation.opponent-best-response': "Opponent's best reply",
  'endgame.basic-mates': 'Basic mates',
  'endgame.king-pawn-opposition': 'Opposition',
  'endgame.key-squares': 'Key squares',
  'endgame.rule-of-square': 'Rule of the square',
  'endgame.passed-pawn': 'Passed pawn',
  'endgame.rook-endgames': 'Rook endgames',
  'opening.development': 'Development',
  'opening.center': 'The centre',
  'opening.king-safety': 'King safety',
}

/** Abertura → nome oficial em inglês. */
const ABERTURA_EM_INGLES: Record<string, string> = {
  italiana: 'Italian Game',
  /*
    A CHAVE É O ID DO CURSO, E NÃO O SLUG. Eles coincidem em quase todos e
    divergem neste: o endereço é `/aberturas/siciliana`, mas o curso se chama
    `siciliana-foundation` porque haverá cursos filhos. Um portão pegou a
    diferença — o nome em inglês caía no português.
  */
  'siciliana-foundation': 'Sicilian Defence — Foundations',
  francesa: 'French Defence',
  /*
    "Ruy Lopez" é o nome oficial em inglês — não "Spanish Opening". Em
    português a abertura é a Espanhola, e em inglês ela leva o nome do padre
    que a descreveu. Traduzir literalmente produziria um nome que nenhuma
    fonte usa. Ver `docs/i18n-glossary.md`.
  */
  'ruy-lopez': 'Ruy Lopez',
  escocesa: 'Scotch Game',
  'sistema-londres': 'London System',
  'caro-kann': 'Caro-Kann Defence',
  'gambito-da-dama-recusado': "Queen's Gambit Declined",
  'defesa-eslava': 'Slav Defence',
}

/** Final → nome em inglês, na terminologia estabelecida. */
const FINAL_EM_INGLES: Record<string, string> = {
  'king-activity': 'King activity',
  'rule-of-square': 'Rule of the square',
  opposition: 'Opposition',
  'key-squares': 'Key squares',
  'king-pawn': 'King and pawn versus king',
  'queen-mate': 'King and queen versus king',
  'rook-mate': 'King and rook versus king',
  'passed-pawn': 'Passed pawn',
  lucena: 'Lucena position',
  philidor: 'Philidor position',
  'two-bishops': 'Two bishops versus king',
  'bishop-knight': 'Bishop and knight versus king',
  triangulation: 'Triangulation',
  'connected-pawns': 'Connected pawns',
  'distant-passer': 'Distant passed pawn',
  'rook-activity': 'Rook activity',
  'good-bad-bishop': 'Good bishop versus bad bishop',
  'opposite-bishops': 'Opposite-coloured bishops',
  'queen-endgames': 'Queen endgames',
  'material-conversion': 'Converting extra material',
}

const NOME_PT_DA_HABILIDADE = new Map(SKILL_CATALOG.map((s) => [s.id as string, s.label]))
const NOME_PT_DA_ABERTURA = new Map(OPENING_COURSES.map((o) => [o.id, o.name]))
const NOME_PT_DO_FINAL = new Map(ENDGAME_DEFINITIONS.map((f) => [f.id, f.name]))

/**
 * Cai para o português quando falta o inglês, e isso é deliberado.
 *
 * Nome ausente é lacuna de tradução, não defeito de execução: mostrar "Garfo"
 * numa tela em inglês é ruim e legível; mostrar `tactics.fork` é o encanamento
 * aparecendo. O portão em `i18n.test.ts` conta as lacunas e não deixa crescer.
 */
function escolher(
  locale: AppLocale,
  id: string,
  emIngles: Record<string, string>,
  emPortugues: ReadonlyMap<string, string>,
): string {
  const pt = emPortugues.get(id) ?? id
  if (locale === DEFAULT_LOCALE) return pt
  return emIngles[id] ?? pt
}

export function nomeDaHabilidade(skillId: SkillId | string, locale: AppLocale): string {
  return escolher(locale, skillId, HABILIDADE_EM_INGLES, NOME_PT_DA_HABILIDADE)
}

export function nomeDaAbertura(openingId: string, locale: AppLocale): string {
  return escolher(locale, openingId, ABERTURA_EM_INGLES, NOME_PT_DA_ABERTURA)
}

export function nomeDoFinal(endgameId: string, locale: AppLocale): string {
  return escolher(locale, endgameId, FINAL_EM_INGLES, NOME_PT_DO_FINAL)
}

/** Os ids que ainda não têm nome em inglês. O portão mede este número. */
export function nomesSemIngles(): string[] {
  const faltando: string[] = []
  for (const id of NOME_PT_DA_HABILIDADE.keys())
    if (!(id in HABILIDADE_EM_INGLES)) faltando.push(`habilidade:${id}`)
  for (const id of NOME_PT_DA_ABERTURA.keys())
    if (!(id in ABERTURA_EM_INGLES)) faltando.push(`abertura:${id}`)
  for (const id of NOME_PT_DO_FINAL.keys())
    if (!(id in FINAL_EM_INGLES)) faltando.push(`final:${id}`)
  return faltando
}
