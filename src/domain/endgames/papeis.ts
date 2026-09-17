/**
 * Papéis, alvos de cobertura e o conteúdo de um final.
 *
 * O QUE MORA AQUI: as perguntas que se responde olhando só para a POSIÇÃO — de
 * que lado da técnica ela treina, que alvo de cobertura ela vale, e o que a
 * família de posições tem a oferecer.
 *
 * POR QUE SAIU DE `jornada.ts`: as etapas precisam desses papéis para montar a
 * regra, e os ITENS de cada etapa (`itens-da-etapa.ts`) precisam deles para
 * montar o exercício. Se os dois morassem em `jornada.ts`, o módulo de itens
 * importaria a jornada e a jornada importaria os itens — ciclo. Extrair a parte
 * que os dois leem é o conserto; duplicá-la seria a segunda fonte da mesma
 * verdade, e `alvoDeCobertura` é literalmente a função que existe para que a
 * string do alvo tenha um dono só.
 *
 * `jornada.ts` reexporta tudo daqui, então nenhum chamador precisa mudar de
 * endereço.
 */

import type { EndgameLessonStep, EndgamePosition } from './catalogo'

// ------------------------------------------------------------------ os papéis

/**
 * Quem o ALUNO é na rodada.
 *
 * Dois valores e nunca um terceiro: "quem tenta ganhar" e "quem tenta segurar".
 * O papel decide o que é progresso e o que é resistência, e por isso é dado da
 * rodada em vez de ser deduzido do FEN a cada lance — deduzir de novo dentro de
 * cada função seria a segunda fonte da mesma verdade.
 */
export type PapelDoAluno = 'atacante' | 'defensor'

/**
 * O objetivo da rodada, na linguagem do treino.
 *
 * `hold` existe porque o catálogo chama o papel de `defend` (o que a POSIÇÃO
 * pede) e a rodada precisa dizer o que o ALUNO faz (segurar). A tradução é uma
 * tabela exaustiva e não um `if`: objetivo novo no catálogo sem decisão aqui não
 * compila, em vez de virar `undefined` numa tela.
 */
export type ObjetivoDaRodada = 'win' | 'draw' | 'mate' | 'promote' | 'hold' | 'reach-target'

export const OBJETIVO_DA_RODADA_POR_POSICAO: Record<
  EndgamePosition['objective'],
  ObjetivoDaRodada
> = {
  win: 'win',
  draw: 'draw',
  mate: 'mate',
  promote: 'promote',
  'reach-target': 'reach-target',
  defend: 'hold',
}

/**
 * De que lado da técnica a posição treina.
 *
 * Tabela exaustiva pelo mesmo motivo da de cima. É ela que responde a pergunta
 * que decide a cobertura do treino final: este final ADMITE defesa?
 */
export const PAPEL_POR_OBJETIVO_DE_POSICAO: Record<EndgamePosition['objective'], PapelDoAluno> = {
  win: 'atacante',
  mate: 'atacante',
  promote: 'atacante',
  'reach-target': 'atacante',
  draw: 'defensor',
  defend: 'defensor',
}

export function papelDaPosicao(posicao: EndgamePosition): PapelDoAluno {
  return PAPEL_POR_OBJETIVO_DE_POSICAO[posicao.objective]
}

// --------------------------------------------------------- alvos de cobertura

/**
 * O nome de um alvo de cobertura.
 *
 * FUNÇÃO, e não template solto no chamador: o alvo que a rodada grava e o alvo
 * que a etapa exige têm de ser a MESMA string, e duas montagens à mão divergem
 * no dia em que alguém trocar o separador. A etapa ficaria eternamente
 * incompleta, sem erro nenhum — falso vermelho silencioso.
 *
 * O alvo é `papel:posição` porque cobrir os dois papéis da MESMA posição não
 * prova transferência, e cobrir a mesma posição duas vezes com o mesmo papel não
 * prova nada. As duas dimensões precisam aparecer no nome.
 */
export function alvoDeCobertura(posicaoId: string, papel: PapelDoAluno): string {
  return `${papel}:${posicaoId}`
}

// ---------------------------------------------------------------- o conteúdo

/**
 * O conteúdo de que a montagem precisa.
 *
 * Entra por parâmetro, e não é lido de `@/content`: as funções ficam puras, o
 * teste monta o final que quiser provar, e o domínio não passa a depender da
 * ordem em que os módulos de conteúdo carregam.
 */
export interface ConteudoDoFinal {
  /**
   * Posições treináveis da MESMA família, na ordem em que o aluno as encontra.
   * É daqui que saem os papéis, a transferência e os alvos do treino final.
   */
  posicoes: readonly EndgamePosition[]
  /** Passos da lição, quando o tema tem uma. De onde saem os itens de reconhecimento. */
  passosDaLicao?: readonly EndgameLessonStep[]
}

/** As posições em que o aluno ATACA (converte, promove, dá mate). */
export function posicoesDeAtaque(conteudo: ConteudoDoFinal): readonly EndgamePosition[] {
  return conteudo.posicoes.filter((posicao) => papelDaPosicao(posicao) === 'atacante')
}

/** As posições em que o aluno DEFENDE (segura o empate). */
export function posicoesDeDefesa(conteudo: ConteudoDoFinal): readonly EndgamePosition[] {
  return conteudo.posicoes.filter((posicao) => papelDaPosicao(posicao) === 'defensor')
}

/**
 * Este final admite defesa?
 *
 * DERIVADO DO CONTEÚDO, e essa é a decisão central da etapa `defender`. Nem todo
 * final tem os dois lados: em rei e torre contra rei sozinho não existe defesa —
 * o lado fraco não tem o que segurar, o final é vitória forçada. Exigir um alvo
 * defensivo ali criaria uma etapa de treino IMPOSSÍVEL de completar, e o aluno
 * ficaria preso numa jornada que nenhuma jogada resolve. É o falso vermelho
 * simétrico ao bug do "atividade concluída": a tela não mentiria dizendo que
 * acabou, mentiria dizendo que ainda falta algo inexistente.
 *
 * Derivar da existência de posição defensiva, em vez de uma bandeira escrita à
 * mão na definição do final, é deliberado: bandeira e conteúdo divergem no dia
 * em que alguém acrescentar a posição de defesa e esquecer de virar a bandeira.
 */
export function admiteDefesa(conteudo: ConteudoDoFinal): boolean {
  return posicoesDeDefesa(conteudo).length > 0
}

/**
 * O papel DOMINANTE da família: o que a maioria das posições treina.
 *
 * Existe porque nem todo final é ofensivo. Philidor é uma técnica DEFENSIVA — o
 * que se aprende ali é segurar o empate com a torre —, e exigir dela uma posição
 * de conversão seria pedir que a lição ensinasse o contrário de si mesma. Quando
 * há posições de ataque, elas mandam; quando não há, a defesa é o treino.
 */
export function posicoesPrincipais(conteudo: ConteudoDoFinal): readonly EndgamePosition[] {
  const ataque = posicoesDeAtaque(conteudo)
  return ataque.length > 0 ? ataque : posicoesDeDefesa(conteudo)
}

/** A posição que representa a família nas etapas que mostram uma só. */
export function posicaoPrincipal(conteudo: ConteudoDoFinal): EndgamePosition | undefined {
  return posicoesPrincipais(conteudo)[0] ?? conteudo.posicoes[0]
}
