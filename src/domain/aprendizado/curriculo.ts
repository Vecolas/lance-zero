/**
 * Grafo do currículo: quais habilidades precisam vir antes de quais.
 *
 * PARA QUE ISTO EXISTE, em uma frase: o planner precisa poder responder "o
 * aluno tem as ferramentas para tentar isto de forma racional?" sem inventar a
 * resposta. Sem o grafo, a única resposta possível era "tente e veja" — que é o
 * defeito que este trabalho veio remover.
 *
 * O GRAFO NÃO É UMA TELA. O plano diz, e vale repetir onde o código mora: não
 * existe cadeado na interface. Nada aqui bloqueia o aluno que quiser abrir a
 * biblioteca e ler a lição de finais de torre no primeiro dia. O grafo serve ao
 * PLANNER, que monta o que o app OFERECE — não à navegação, que é do aluno.
 *
 * DUAS FONTES QUE SERIAM FÁCEIS DE CRIAR AQUI, e não foram:
 *
 * 1. Os nós NÃO são uma lista nova de habilidades. São `SkillId`, do catálogo.
 *    Um `PREREQUISITOS` com uma chave que não existe no catálogo não compila, e
 *    uma habilidade nova no catálogo sem entrada aqui é pega pelo portão —
 *    `prerequisitosDe` exige que o mapa cubra `SKILL_IDS` inteiro.
 * 2. As ÁREAS não são redeclaradas. O agrupamento "fundamentos / processo /
 *    tática / finais / aberturas" do plano §24 é derivado de `SkillArea` mais a
 *    profundidade no grafo, não escrito uma segunda vez.
 */

import { getSkill } from '@/domain/skills/catalog'
import { SKILL_IDS, type SkillId } from '@/domain/types'

/**
 * Pré-requisitos DIRETOS de cada habilidade.
 *
 * A leitura de cada linha é: "para cobrar X sem apoio, o aluno precisa já ter
 * passado por estes". Lista vazia é raiz do currículo — e as raízes são poucas
 * de propósito: um grafo em que quase tudo é raiz não restringe nada, e um em
 * que quase nada é raiz trava o aluno no primeiro dia.
 *
 * `satisfies` e não anotação de tipo: o `satisfies` confere a cobertura de
 * `SkillId` SEM alargar o valor, então `prerequisitosDe` continua devolvendo a
 * tupla exata e um id fora do catálogo não compila.
 */
export const PREREQUISITOS = {
  // --- raízes: o vocabulário mínimo do tabuleiro ------------------------
  // Peça pendurada é a raiz do produto inteiro. Ver o valor pedagógico 5 no
  // catálogo: é a busca mais barata do xadrez e a que decide mais partidas
  // até 1400.
  'tactics.hanging-piece': [],
  'calculation.checks-captures-threats': [],
  'opening.development': [],
  'opening.center': [],
  'endgame.basic-mates': [],

  // --- tática: tudo depende de enxergar o que está sem defesa -----------
  'tactics.fork': ['tactics.hanging-piece'],
  'tactics.pin': ['tactics.hanging-piece'],
  'tactics.back-rank': ['tactics.hanging-piece'],
  'tactics.skewer': ['tactics.pin'],
  'tactics.discovered-attack': ['tactics.fork'],
  'tactics.mating-net': ['tactics.back-rank', 'endgame.basic-mates'],
  // Os três abaixo exigem ver a FUNÇÃO de uma peça, e não só o ataque a ela.
  // Por isso pendem de `checks-captures-threats`: sem a varredura sistemática
  // o aluno não encontra o lance que desvia, só o que captura.
  'tactics.removal-of-defender': ['tactics.hanging-piece', 'calculation.checks-captures-threats'],
  'tactics.deflection': ['tactics.removal-of-defender'],
  'tactics.overloaded-piece': ['tactics.removal-of-defender'],

  // --- cálculo: a escada do processo de pensamento ----------------------
  'calculation.candidate-moves': ['calculation.checks-captures-threats'],
  'calculation.opponent-best-response': ['calculation.checks-captures-threats'],

  // --- finais -----------------------------------------------------------
  'endgame.king-pawn-opposition': ['endgame.basic-mates'],
  'endgame.rule-of-square': ['endgame.basic-mates'],
  'endgame.key-squares': ['endgame.king-pawn-opposition'],
  'endgame.passed-pawn': ['endgame.rule-of-square'],
  'endgame.rook-endgames': ['endgame.passed-pawn'],

  // --- aberturas --------------------------------------------------------
  // Segurança do rei depende de última fileira porque o aluno precisa saber
  // CONTRA O QUÊ ele está protegendo o rei. Rocar por regra, sem entender o
  // perigo, é a memorização que o produto recusa.
  'opening.king-safety': ['opening.development', 'tactics.back-rank'],
} as const satisfies Record<SkillId, readonly SkillId[]>

/** Pré-requisitos diretos. */
export function prerequisitosDe(skillId: SkillId): readonly SkillId[] {
  return PREREQUISITOS[skillId]
}

/**
 * Todos os pré-requisitos, diretos e indiretos, sem repetição.
 *
 * Em ordem TOPOLÓGICA — raízes primeiro. A ordem importa porque quem consome
 * isto é a tela que mostra "o que vem antes" e o planner que escolhe o próximo
 * conceito; nos dois casos, listar `finais de torre` antes de `mates básicos`
 * seria mostrar a escada de cabeça para baixo.
 *
 * O laço tem guarda de ciclo mesmo com `verificarCurriculo` existindo: um
 * portão que roda no CI não protege quem chama isto em produção com um grafo
 * que alguém editou. Diante de ciclo, devolve o que conseguiu em vez de travar.
 */
export function prerequisitosTransitivos(skillId: SkillId): SkillId[] {
  const resultado: SkillId[] = []
  const visitados = new Set<SkillId>([skillId])

  function descer(id: SkillId): void {
    for (const pai of prerequisitosDe(id)) {
      if (visitados.has(pai)) continue
      visitados.add(pai)
      descer(pai)
      resultado.push(pai)
    }
  }

  descer(skillId)
  return resultado
}

/**
 * Profundidade no grafo: 0 para raiz, 1 para quem depende só de raiz, etc.
 *
 * É o que dá ordem ao currículo sem ninguém numerar as lições à mão. Numerar à
 * mão seria a segunda fonte da mesma verdade — o número diria uma ordem e as
 * arestas diriam outra, e nada acusaria a divergência.
 */
export function profundidadeNoCurriculo(skillId: SkillId): number {
  const pais = prerequisitosDe(skillId)
  if (pais.length === 0) return 0
  return 1 + Math.max(...pais.map(profundidadeNoCurriculo))
}

/**
 * A ordem canônica do currículo: raízes primeiro, e dentro da mesma
 * profundidade o maior valor pedagógico primeiro.
 *
 * DETERMINÍSTICA. O desempate final é o índice em `SKILL_IDS`, então duas
 * habilidades com a mesma profundidade e o mesmo valor nunca trocam de lugar
 * entre execuções — o planner depende disso para ser reproduzível.
 */
export function ordemDoCurriculo(): SkillId[] {
  return [...SKILL_IDS].sort((a, b) => {
    const profundidade = profundidadeNoCurriculo(a) - profundidadeNoCurriculo(b)
    if (profundidade !== 0) return profundidade
    const valor = getSkill(b).pedagogicalValue - getSkill(a).pedagogicalValue
    if (valor !== 0) return valor
    return SKILL_IDS.indexOf(a) - SKILL_IDS.indexOf(b)
  })
}

/** Problema estrutural do grafo. */
export interface FalhaDeCurriculo {
  skillId: SkillId
  problema: string
}

/**
 * Confere o grafo inteiro e devolve TODOS os problemas.
 *
 * Lista em vez de lançar no primeiro, pelo mesmo motivo de
 * `verificarExercicio`: quem chama é um portão, e parar no primeiro esconde os
 * outros.
 *
 * O que ele pega, e cada item é um jeito real de o grafo mentir:
 *
 * - habilidade que é pré-requisito de si mesma, direta ou indiretamente —
 *   `prerequisitosTransitivos` pararia, mas o planner giraria para sempre
 *   procurando um conceito ensinável que não existe;
 * - pré-requisito fora do catálogo — barrado no tipo, conferido aqui também
 *   porque `as const satisfies` não sobrevive a um `as`;
 * - aresta duplicada, que não quebra nada e por isso ninguém notaria.
 */
export function verificarCurriculo(): FalhaDeCurriculo[] {
  const falhas: FalhaDeCurriculo[] = []

  for (const skillId of SKILL_IDS) {
    const pais = prerequisitosDe(skillId)

    if (new Set(pais).size !== pais.length) {
      falhas.push({ skillId, problema: 'repete um pré-requisito' })
    }

    for (const pai of pais) {
      if (!SKILL_IDS.includes(pai)) {
        falhas.push({ skillId, problema: `pré-requisito fora do catálogo: ${pai}` })
      }
      if (pai === skillId) {
        falhas.push({ skillId, problema: 'é pré-requisito de si mesma' })
      }
    }

    // Ciclo indireto: descer a partir de cada pai tem de terminar sem
    // reencontrar o filho.
    const pilha: SkillId[] = [...pais]
    const vistos = new Set<SkillId>()
    while (pilha.length > 0) {
      const atual = pilha.pop() as SkillId
      if (atual === skillId) {
        falhas.push({ skillId, problema: 'participa de um ciclo de pré-requisitos' })
        break
      }
      if (vistos.has(atual)) continue
      vistos.add(atual)
      pilha.push(...prerequisitosDe(atual))
    }
  }

  return falhas
}
