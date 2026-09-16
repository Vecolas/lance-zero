/**
 * O REGISTRO: qual conteúdo cada nó do Roadmap abre.
 *
 * POR QUE ELE EXISTE EM VEZ DE UMA BUSCA POR NOME. A ligação entre Roadmap e
 * conteúdo era feita comparando TÍTULOS normalizados ("Abertura Italiana" →
 * `italiana`). Funcionava, e o preço estava escrito no próprio arquivo: renomear
 * um dos dois lados quebrava o link em silêncio. Pior que o risco é a classe de
 * erro — busca por nome pode casar com o conteúdo ERRADO, e um aluno que pede
 * Caro-Kann e recebe outra abertura não tem como saber que foi o app que errou.
 *
 * Aqui a ligação é por ID, declarada à mão, uma linha por nó. É mais verboso de
 * propósito: um nó novo não ganha destino por acidente, ele ganha por decisão.
 *
 * `null` É UMA DECLARAÇÃO, NÃO UM BURACO. Vinte e nove nós do currículo ainda
 * não têm conteúdo escrito — o catálogo tem doze lições e a issue #11 pede
 * trinta. Enquanto não têm, eles dizem `null` aqui, o botão de aprender fica
 * desabilitado e a tela diz a verdade ("ainda não há lição"). O que NÃO acontece
 * mais é o nó oferecer "Aprender" e despejar o aluno na biblioteca inteira.
 *
 * A DIFERENÇA ENTRE `null` E AUSENTE É O PONTO DO PORTÃO. Ausente significa que
 * alguém criou um nó e não decidiu nada — e isso reprova em
 * `roadmap-learning-target.test.ts`. `null` significa "decidido: ainda não há
 * conteúdo". O número de `null`s é medido pelo mesmo teste e só pode cair.
 */

import { ROADMAP_DEFINITION, type RoadmapNode } from './index'
import { MissingLearningTargetError, type LearningTarget } from './learning-target'

/**
 * A jornada de lições dos CANDIDATOS.
 *
 * É o exemplo de nó composto: "Geração de candidatos" não se ensina numa lição.
 * O aluno precisa, nesta ordem, saber varrer os lances forçados (é de lá que os
 * candidatos saem), escolher poucos que merecem cálculo, e prever a resposta que
 * o adversário tem. Três lições que já existem, encadeadas.
 *
 * A ORDEM É A DO CURRÍCULO, não a de escrita: a varredura vem primeiro porque
 * candidato sem varredura é chute, e a resposta do adversário vem por último
 * porque ela só faz sentido depois de haver candidatos para testar.
 */
export const JORNADA_DE_CANDIDATOS = {
  type: 'lesson-journey',
  journeyId: 'candidatos',
  lessonIds: ['varredura-de-capturas', 'lances-candidatos', 'resposta-do-adversario'],
  entryLessonId: 'varredura-de-capturas',
} as const satisfies LearningTarget

/** Todas as jornadas de lições do produto. Uma só, por enquanto, e declarada. */
export const JORNADAS_DE_LICOES = [JORNADA_DE_CANDIDATOS] as const

function licao(lessonId: string): LearningTarget {
  return { type: 'lesson', lessonId }
}

function abertura(openingId: string): LearningTarget {
  return { type: 'opening-journey', openingId }
}

function final(endgameId: string): LearningTarget {
  return { type: 'endgame-journey', endgameId }
}

/**
 * Nó → destino. `null` é "ainda não há conteúdo", e é uma decisão registrada.
 *
 * TODO NÓ DO ROADMAP APARECE AQUI. O portão varre `ROADMAP_DEFINITION.nodes` e
 * reprova qualquer id ausente: é isso que impede um nó novo de nascer sem que
 * alguém tenha olhado para ele.
 */
export const LEARNING_OBJECTS: Readonly<Record<string, LearningTarget | null>> = {
  // --- Fundamentos -------------------------------------------------------
  'fundamentos.board': null,
  'fundamentos.pieces': null,
  'fundamentos.attacked': null,
  // "Peças indefesas" é exatamente o assunto da lição da peça pendurada.
  'fundamentos.loose': licao('peca-pendurada'),
  'fundamentos.trades': null,
  'fundamentos.king': null,
  'fundamentos.development': licao('desenvolvimento'),
  'fundamentos.center': null,

  // --- Processo de pensamento -------------------------------------------
  // Os dois nós abaixo são o MESMO assunto do currículo antigo e do novo; o
  // Roadmap carrega a duplicata desde antes deste trabalho. Apontar os dois
  // para a mesma lição é o reflexo honesto disso — inventar uma segunda lição
  // para justificar a duplicata seria escrever conteúdo para servir à tabela.
  'processo.threats': licao('resposta-do-adversario'),
  'process.threats': licao('resposta-do-adversario'),
  'processo.candidates': licao('varredura-de-capturas'),
  'process.cct': licao('varredura-de-capturas'),
  // O nó COMPOSTO: três lições em sequência (ver `JORNADA_DE_CANDIDATOS`).
  'process.candidates': JORNADA_DE_CANDIDATOS,
  'process.blunder-check': null,

  // --- Cálculo -----------------------------------------------------------
  'calculation.visualize': null,
  'calculation.forcing': licao('varredura-de-capturas'),
  'calculation.compare': null,
  'calculation.three-ply': null,

  // --- Estratégia --------------------------------------------------------
  'strategy.weak-squares': null,
  'strategy.isolated-pawn': null,
  'strategy.open-files': null,
  'strategy.outpost': null,
  'strategy.good-bad-piece': null,

  // --- Análise de partidas ----------------------------------------------
  'analysis.critical-moment': null,
  'analysis.engine-later': null,
  'analysis.classify': null,
  'analysis.turn-error': null,

  // --- Transferência -----------------------------------------------------
  'transfer.repertoire': null,
  'transfer.endgame': null,

  // --- Aberturas do repertório ------------------------------------------
  // Aqui o destino é a JORNADA da abertura, nunca a biblioteca de lições: uma
  // abertura não se ensina numa microlição de conceito.
  'opening.italian': abertura('italiana'),
  'opening.scotch': abertura('escocesa'),
  'opening.london': abertura('sistema-londres'),
  'opening.caro-kann': abertura('caro-kann'),
  'opening.qgd': abertura('gambito-da-dama-recusado'),

  // --- Habilidades de tática --------------------------------------------
  'skill.tactics.hanging-piece': licao('peca-pendurada'),
  'skill.tactics.fork': licao('garfo'),
  'skill.tactics.pin': licao('cravada'),
  'skill.tactics.skewer': null,
  'skill.tactics.discovered-attack': null,
  'skill.tactics.removal-of-defender': null,
  'skill.tactics.deflection': null,
  'skill.tactics.overloaded-piece': null,
  'skill.tactics.back-rank': licao('ultima-fileira'),
  'skill.tactics.mating-net': licao('rede-de-mate'),

  // --- Habilidades de cálculo -------------------------------------------
  'skill.calculation.checks-captures-threats': licao('varredura-de-capturas'),
  'skill.calculation.candidate-moves': licao('lances-candidatos'),
  'skill.calculation.opponent-best-response': licao('resposta-do-adversario'),

  // --- Habilidades de finais --------------------------------------------
  // Finais abrem a JORNADA do final, e não a microlição: a jornada tem o
  // tabuleiro, o adversário que responde e a cobrança no fim. É a diferença
  // entre ler sobre oposição e ter de segurá-la.
  'skill.endgame.basic-mates': final('queen-mate'),
  'skill.endgame.king-pawn-opposition': final('opposition'),
  'skill.endgame.key-squares': final('key-squares'),
  'skill.endgame.rule-of-square': final('rule-of-square'),
  'skill.endgame.passed-pawn': final('passed-pawn'),
  // "Finais de torre" é maior que Lucena, e a escolha está declarada: Lucena é
  // a técnica que o catálogo tem escrita, e abrir a técnica certa é melhor que
  // abrir uma lista. Quando Philidor e as demais virarem jornada composta, o
  // destino daqui muda em uma linha.
  'skill.endgame.rook-endgames': final('lucena'),

  // --- Habilidades de abertura ------------------------------------------
  'skill.opening.development': licao('desenvolvimento'),
  'skill.opening.center': null,
  'skill.opening.king-safety': null,
}

/**
 * O destino de um nó, ou `null` quando ele ainda não tem conteúdo.
 *
 * LANÇA para id desconhecido, em vez de devolver `null`: nó fora do registro é
 * nó que ninguém decidiu, e tratá-lo como "sem conteúdo" apagaria a diferença
 * entre uma decisão e um esquecimento.
 */
export function learningTargetOf(node: Pick<RoadmapNode, 'id'>): LearningTarget | null {
  if (!(node.id in LEARNING_OBJECTS)) throw new MissingLearningTargetError(node.id)
  return LEARNING_OBJECTS[node.id] ?? null
}

/** O nó pode ser aprendido agora? Falso enquanto não houver conteúdo. */
export function temConteudo(node: Pick<RoadmapNode, 'id'>): boolean {
  return learningTargetOf(node) !== null
}

/** Os nós que ainda esperam conteúdo. O portão mede este número. */
export function nosSemConteudo(): string[] {
  return ROADMAP_DEFINITION.nodes
    .filter((node) => LEARNING_OBJECTS[node.id] === null)
    .map((node) => node.id)
}

/** Os nós que ninguém declarou. Tem de ser vazio, sempre. */
export function nosSemDeclaracao(): string[] {
  return ROADMAP_DEFINITION.nodes
    .filter((node) => !(node.id in LEARNING_OBJECTS))
    .map((node) => node.id)
}

/**
 * Reprova se algum nó ficou sem decisão. Lança.
 *
 * ONDE ELA RODA, e por que não em produção. Em desenvolvimento ela roda na
 * CARGA deste módulo (logo abaixo), então um nó novo sem destino estoura na
 * primeira vez que alguém abre o Roadmap — que é quando a pessoa ainda lembra do
 * que estava fazendo.
 *
 * Em PRODUÇÃO ela não roda na carga, e a escolha é deliberada: o registro é
 * conteúdo estático, então uma falha aqui já teria aparecido em desenvolvimento
 * e no CI. Deixá-la estourar em produção trocaria "um card diz que não há lição"
 * por "a tela inteira não abre" — uma configuração incompleta derrubaria o
 * Roadmap de quem não tem nada a ver com ela.
 *
 * O PORTÃO DE VERDADE é `roadmap-learning-target.test.ts`, que o CI roda antes
 * do build. Foi por isso também que não entrou um `prebuild` chamando o vitest:
 * ele repetiria o que o CI já faz e poria a publicação na dependência de uma
 * ferramenta de teste estar instalada no ambiente de build.
 */
export function validarRegistroDeAprendizado(): void {
  const semDeclaracao = nosSemDeclaracao()
  if (semDeclaracao.length > 0) throw new MissingLearningTargetError(semDeclaracao.join(', '))
}

if (process.env.NODE_ENV !== 'production') validarRegistroDeAprendizado()
