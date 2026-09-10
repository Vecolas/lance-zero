/**
 * Contrato de um item do diagnóstico e a verificação do banco inteiro.
 *
 * FORMATO: posição + alternativas em lance. O aluno escolhe entre lances
 * legais, não arrasta peça. A escolha é de acessibilidade, não de preguiça: o
 * diagnóstico é a PRIMEIRA tela de quem chega sem conta, precisa funcionar em
 * 360 px, no teclado e em leitor de tela, e um tabuleiro arrastável como única
 * entrada exclui parte do público logo na porta. O tabuleiro continua na tela,
 * como leitura; a resposta é um botão.
 *
 * DECISÃO QUE ESTE ARQUIVO CARREGA — as alternativas erradas são CONTEÚDO
 * VERIFICADO, não enfeite. O portão exige que cada uma seja legal e que cada
 * uma FALHE o objetivo. É o lado do portão que morde para dentro: se eu
 * escrever como "errada" uma jogada que também ganha, o banco reprova em vez de
 * ensinar ao aluno que a resposta certa dele estava errada.
 *
 * `lancesAceitos` e `alternativas` são TUPLAS não-vazias: item sem resposta
 * certa, ou sem nenhuma alternativa, não chega a compilar. É a mesma ideia do
 * esquema de lição — impedir na forma em vez de cobrar num portão depois.
 */

import type { SkillId, Side } from '@/domain/types'
import { posicaoEhJogavel, positionStatus } from '@/lib/chess'
import { avaliarLance, type ObjetivoDeDiagnostico } from './objetivo'

/** Lista com pelo menos um elemento. */
export type NaoVazia<T> = readonly [T, ...T[]]

/**
 * Um exercício posicional conferível: posição, objetivo e a chave de correção.
 *
 * É o vocabulário COMPARTILHADO entre o banco de diagnóstico e a etapa de
 * recuperação das lições (`@/content/lessons/schema`). Os dois precisam da
 * mesma prova — lance aceito cumpre, alternativa apresentada como errada falha
 * — e escrever essa verificação duas vezes seria duas fontes para a mesma
 * verdade, com a segunda cópia divergindo no dia em que a primeira ganhasse um
 * caso novo.
 *
 * DÍVIDA DECLARADA: a casa certa deste tipo é um módulo de exercícios, não
 * `diagnostic/`. Ver o cabeçalho de `./index.ts`.
 */
export interface ExercicioPosicional {
  /** Único no catálogo onde ele vive. */
  id: string
  fen: string
  /** Lado do aluno. É sempre a vez dele no FEN. */
  ladoDoAluno: Side
  objetivo: ObjetivoDeDiagnostico
  lancesAceitos: NaoVazia<string>
  alternativas: NaoVazia<string>
}

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

/** Um problema encontrado no banco, já com o item que o carrega. */
export interface FalhaDeItem {
  itemId: string
  problema: string
}

/**
 * Confere um item inteiro e devolve TODOS os problemas dele.
 *
 * Devolve lista em vez de lançar no primeiro problema porque quem chama é o
 * portão do banco: parar no primeiro item quebrado esconderia os outros e
 * transformaria a correção do conteúdo numa fila de uma falha por execução.
 */
export function verificarExercicio(item: ExercicioPosicional): FalhaDeItem[] {
  const falhas: string[] = []

  if (!posicaoEhJogavel(item.fen)) {
    // Sem posição jogável nada mais pode ser conferido: as buscas lançariam.
    return [{ itemId: item.id, problema: `FEN inválido ou posição impossível: ${item.fen}` }]
  }
  const estado = positionStatus(item.fen)
  if (estado.turn !== item.ladoDoAluno) {
    return [{ itemId: item.id, problema: `o FEN não está na vez de ${item.ladoDoAluno}` }]
  }
  if (estado.isGameOver) {
    return [{ itemId: item.id, problema: 'a posição já está terminada' }]
  }

  for (const uci of item.lancesAceitos) {
    const veredito = avaliarLance(item.fen, item.ladoDoAluno, uci, item.objetivo)
    if (!veredito.cumpre) {
      falhas.push(`lance aceito não cumpre o objetivo: ${veredito.motivo}`)
    }
  }

  for (const uci of item.alternativas) {
    if (item.lancesAceitos.includes(uci)) {
      falhas.push(`${uci} está ao mesmo tempo entre os aceitos e entre as alternativas`)
      continue
    }
    const veredito = avaliarLance(item.fen, item.ladoDoAluno, uci, item.objetivo)
    if (veredito.cumpre) {
      falhas.push(
        `alternativa apresentada como errada também cumpre o objetivo: ${veredito.motivo}`,
      )
    }
  }

  return falhas.map((problema) => ({ itemId: item.id, problema }))
}

/**
 * Todas as opções de um item, na ordem em que a tela deve apresentá-las.
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

/** O lance escolhido está entre os aceitos deste item? */
export function acertou(item: ExercicioPosicional, lanceEscolhido: string): boolean {
  return item.lancesAceitos.includes(lanceEscolhido)
}
