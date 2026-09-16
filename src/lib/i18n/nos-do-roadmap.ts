/**
 * Título e descrição de cada nó do Roadmap, em inglês.
 *
 * O NÓ NÃO É DUPLICADO POR IDIOMA. `tactic:fork` é um nó só; o que existe aqui é
 * a apresentação dele em inglês. Duplicar o nó criaria dois currículos livres
 * para divergir — e o progresso do aluno, que é indexado por id, ficaria preso a
 * um deles.
 *
 * O PORTUGUÊS VEM DO PRÓPRIO ROADMAP, não de uma cópia. É o que garante que a
 * tela em português mostre exatamente o que o currículo diz, e que só o inglês
 * possa ficar para trás — de forma medida, pelo portão.
 *
 * OS NÓS DE HABILIDADE NÃO ESTÃO AQUI: o título deles é o nome da habilidade, e
 * esse nome já é traduzido em `nomes-de-conteudo`. Repeti-los criaria duas
 * verdades para "Garfo"/"Fork", e elas divergiriam na primeira correção.
 */

import { ROADMAP_DEFINITION, type RoadmapNode } from '@/domain/roadmap'
import { DEFAULT_LOCALE, type AppLocale } from './locales'
import { nomeDaAbertura, nomeDaHabilidade } from './nomes-de-conteudo'
import { learningTargetOf } from '@/domain/roadmap/learning-objects'

interface TextoDoNo {
  title: string
  shortDescription: string
}

const EM_INGLES: Record<string, TextoDoNo> = {
  // --- Fundamentos -------------------------------------------------------
  'fundamentos.board': {
    title: 'Reading the board',
    shortDescription: 'Orientation, squares and coordinates without memorising the interface.',
  },
  'fundamentos.pieces': {
    title: 'Piece value and activity',
    shortDescription: 'Weigh material, activity and safety before trading.',
  },
  'fundamentos.attacked': {
    title: 'Attacked and defended pieces',
    shortDescription: 'Count attackers and defenders before you trade.',
  },
  'fundamentos.loose': {
    title: 'Loose pieces',
    shortDescription: 'Find the target that was left unprotected.',
  },
  'fundamentos.trades': {
    title: 'Trades',
    shortDescription: 'Trade for a concrete reason, not out of reflex.',
  },
  'fundamentos.king': {
    title: 'King safety',
    shortDescription: 'Notice when your own king is the one that needs attention.',
  },
  'fundamentos.development': {
    title: 'Development',
    shortDescription: 'Bring pieces into play with a purpose.',
  },
  'fundamentos.center': {
    title: 'Controlling the centre',
    shortDescription: 'Use the centre as space, not just as a pawn count.',
  },

  // --- Processo de pensamento -------------------------------------------
  'processo.threats': {
    title: 'What changed with the last move?',
    shortDescription: 'Start every decision by looking for changes and threats.',
  },
  'processo.candidates': {
    title: 'Checks, captures and threats',
    shortDescription: 'Generate strong candidates before calculating lines.',
  },
  'process.threats': {
    title: "The opponent's threats",
    shortDescription: 'Ask what the last move made possible.',
  },
  'process.cct': {
    title: 'CCT: checks, captures and threats',
    shortDescription: 'Begin the search for candidates with the forcing moves.',
  },
  'process.candidates': {
    title: 'Generating candidates',
    shortDescription: 'Pick the few moves that deserve calculation.',
  },
  'process.blunder-check': {
    title: 'Blunder check',
    shortDescription: 'Check the final position before you play it.',
  },

  // --- Cálculo -----------------------------------------------------------
  'calculation.visualize': {
    title: 'Visualising a reply',
    shortDescription: 'Calculate without moving the pieces.',
  },
  'calculation.forcing': {
    title: 'Forcing moves',
    shortDescription: "Give priority to the opponent's most demanding reply.",
  },
  'calculation.compare': {
    title: 'Comparing lines',
    shortDescription: 'Choose the healthiest final position.',
  },
  'calculation.three-ply': {
    title: 'Three-ply calculation',
    shortDescription: 'Go deeper only when the position asks for it.',
  },

  // --- Estratégia --------------------------------------------------------
  'strategy.weak-squares': {
    title: 'Weak squares and plans',
    shortDescription: 'Recognise lasting targets and how to use them.',
  },
  'strategy.isolated-pawn': {
    title: 'Isolated pawn',
    shortDescription: 'Plans and weak squares created by an isolated structure.',
  },
  'strategy.open-files': {
    title: 'Open files',
    shortDescription: 'Put rooks where the structure allows action.',
  },
  'strategy.outpost': {
    title: 'Outpost',
    shortDescription: 'Use a strong square no pawn can drive you off.',
  },
  'strategy.good-bad-piece': {
    title: 'Good piece, bad piece',
    shortDescription: 'Improve your worst piece before hunting for combinations.',
  },

  // --- Análise de partidas ----------------------------------------------
  'analysis.critical-moment': {
    title: 'Finding the critical moment',
    shortDescription: 'Review a game without turning every slip into a tactic.',
  },
  'analysis.engine-later': {
    title: 'Analyse without the engine first',
    shortDescription: 'Build your own explanation before the validation.',
  },
  'analysis.classify': {
    title: 'Classify the mistake',
    shortDescription: 'Separate tactics, calculation, strategy and opening decisions.',
  },
  'analysis.turn-error': {
    title: 'Turn a mistake into training',
    shortDescription: 'Convert a critical moment into an exercise you can recall.',
  },

  // --- Transferência -----------------------------------------------------
  'transfer.repertoire': {
    title: 'Applying the repertoire',
    shortDescription: 'Recognise the handover from opening to middlegame.',
  },
  'transfer.endgame': {
    title: 'Converting an advantage',
    shortDescription: 'Take a technique you studied into a real game.',
  },

  // --- Aberturas do repertório ------------------------------------------
  // O TÍTULO delas não está aqui: ele é o nome da abertura, que já é traduzido
  // em `nomes-de-conteudo`. Só a descrição é texto próprio do currículo.
  'opening.italian': {
    title: '',
    shortDescription: 'Fast development, pressure on f7 and the d4 break.',
  },
  'opening.scotch': {
    title: '',
    shortDescription: 'An open centre and active development from the start.',
  },
  'opening.london': {
    title: '',
    shortDescription: 'A solid structure, clear plans and consistent development.',
  },
  'opening.caro-kann': {
    title: '',
    shortDescription: 'A solid answer to 1.e4, with structure and counterplay.',
  },
  'opening.qgd': {
    title: '',
    shortDescription: 'Central control and safe development against 1.d4.',
  },
}

/**
 * O texto de um nó no idioma pedido.
 *
 * A ORDEM DE BUSCA é: nome de conteúdo (abertura, habilidade) primeiro, depois a
 * tabela acima, depois o português. Ela existe porque o nome de uma abertura ou
 * de uma habilidade tem UM dono — e não é o currículo.
 */
export function textoDoNo(node: RoadmapNode, locale: AppLocale): TextoDoNo {
  const pt = { title: node.title, shortDescription: node.shortDescription }
  if (locale === DEFAULT_LOCALE) return pt

  const proprio = EM_INGLES[node.id]

  if (node.skillId !== undefined) {
    return {
      title: nomeDaHabilidade(node.skillId, locale),
      shortDescription: proprio?.shortDescription || pt.shortDescription,
    }
  }

  const alvo = learningTargetOf(node)
  if (alvo?.type === 'opening-journey') {
    return {
      title: nomeDaAbertura(alvo.openingId, locale),
      shortDescription: proprio?.shortDescription || pt.shortDescription,
    }
  }

  if (!proprio) return pt
  return {
    title: proprio.title || pt.title,
    shortDescription: proprio.shortDescription || pt.shortDescription,
  }
}

/** Os nós sem texto em inglês. O portão mede, e o número só pode cair. */
export function nosSemIngles(): string[] {
  return ROADMAP_DEFINITION.nodes
    .filter((node) => {
      if (node.skillId !== undefined) return false
      const alvo = learningTargetOf(node)
      if (alvo?.type === 'opening-journey') return false
      return EM_INGLES[node.id] === undefined
    })
    .map((node) => node.id)
}
