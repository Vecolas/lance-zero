/**
 * Item do diagnóstico: o que ele acrescenta a um exercício posicional.
 *
 * FORMATO: posição + alternativas em lance. O aluno escolhe entre lances
 * legais, não arrasta peça. A escolha é de acessibilidade, não de preguiça: o
 * diagnóstico é a PRIMEIRA tela de quem chega sem conta, precisa funcionar em
 * 360 px, no teclado e em leitor de tela, e um tabuleiro arrastável como única
 * entrada exclui parte do público logo na porta. O tabuleiro continua na tela,
 * como leitura; a resposta é um botão.
 *
 * O QUE NÃO ESTÁ AQUI, e onde está: a posição, o objetivo, a chave de correção
 * e a verificação deles vivem em `@/domain/exercicios`, porque valem para
 * qualquer exercício posicional — o diagnóstico e a recuperação das lições
 * precisam da MESMA prova. Este arquivo guarda só o que é do DIAGNÓSTICO:
 * habilidade medida, dificuldade de referência, enunciado e explicação.
 *
 * `opcoesDe` e `acertou` também ficam aqui, e isso é DÍVIDA DECLARADA: as duas
 * operam sobre `ExercicioPosicional` e a biblioteca de lições já as usa, então
 * a casa delas é `@/domain/exercicios`. Não vieram junto porque migrá-las mexe
 * em telas que pertencem a outra frente nesta rodada. Está relatado.
 */

import type { SkillId } from '@/domain/types'
import type { ExercicioPosicional } from '@/domain/exercicios'

export interface ItemDeDiagnostico extends ExercicioPosicional {
  /** Habilidade do catálogo que este item mede. */
  skillId: SkillId
  /**
   * Rating de referência do item.
   *
   * HEURÍSTICA DE PRODUTO: é a âncora que o estimador usa para converter acerto
   * e erro em faixa de rating. Não saiu de calibração com jogadores reais e
   * deve ser recalibrada quando houver telemetria — hoje é o julgamento de
   * quem escreveu, declarado como tal.
   */
  dificuldade: number
  /**
   * O que se pede, em uma frase.
   *
   * NÃO nomeia o tema. É a regra de recuperação antes da explicação do
   * PEDAGOGY: dizer "garfo" antes da resposta destrói o que o item mede.
   */
  enunciado: string
  /** O que o item ensina. Só aparece DEPOIS da resposta. */
  explicacao: string
}

/**
 * Todas as opções de um exercício, na ordem em que a tela deve apresentá-las.
 *
 * A ordem é DERIVADA do id do item, e não sorteada: o mesmo item mostra sempre
 * a mesma ordem, então o e2e e a tela falam da mesma tela, e nenhum aluno vê a
 * resposta certa sempre na primeira posição. Ordenar por texto do lance seria
 * suficiente para não vazar a resposta, mas colocaria `a1a8` sempre antes de
 * `h1h8` — a rotação por id evita esse padrão sem introduzir aleatoriedade.
 */
export function opcoesDe(item: ExercicioPosicional): string[] {
  const todas = [...item.lancesAceitos, ...item.alternativas].sort((a, b) => a.localeCompare(b))
  const deslocamento = somaDosCodigos(item.id) % todas.length
  return [...todas.slice(deslocamento), ...todas.slice(0, deslocamento)]
}

function somaDosCodigos(texto: string): number {
  let soma = 0
  for (let i = 0; i < texto.length; i += 1) soma += texto.charCodeAt(i)
  return soma
}

/** O lance escolhido está entre os aceitos deste exercício? */
export function acertou(item: ExercicioPosicional, lanceEscolhido: string): boolean {
  return item.lancesAceitos.includes(lanceEscolhido)
}
