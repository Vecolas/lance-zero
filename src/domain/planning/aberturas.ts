/**
 * O repertório vira prioridade do plano do dia — e vira por DESVIO.
 *
 * É o critério de aceite da issue #10 que faltava: "o planner prioriza o ramo
 * que apareceu em partida real". `frequenciaDoRepertorio` já sabe o que
 * apareceu; este arquivo é a ponte entre aquela contagem e o `buildDailyPlan`.
 *
 * DECISÃO 1 — SÓ O DESVIO VIRA TREINO. LACUNA NÃO. As duas saídas do livro têm
 * nomes diferentes em `frequencia.ts` de propósito, e a razão vale aqui inteira:
 *
 * - **desvio** é o USUÁRIO jogando diferente do próprio repertório. Existe um
 *   lance prescrito, escrito por ele, que ele não jogou. Há o que perguntar, há
 *   resposta certa, e a falha é de RECUPERAÇÃO — exatamente o que este produto
 *   promete treinar.
 * - **lacuna** é o ADVERSÁRIO jogando algo que o repertório não cobre. Não há
 *   lance prescrito. Um bloco de treino sobre uma lacuna perguntaria "o que você
 *   joga aqui?" sem ter resposta nenhuma para conferir — e a única saída honesta
 *   seria inventar teoria na hora, que é o oposto do princípio 8 do CLAUDE.md.
 *
 * A frente do domínio sugeriu "desvio tem prioridade sobre lacuna". CONCORDO
 * com a conclusão e implemento algo mais forte do que a frase: lacuna não
 * concorre. Não é que o desvio ganhe o desempate — é que não há empate, porque
 * lacuna não produz bloco nenhum. Lacuna é REDAÇÃO DE CONTEÚDO: alguém precisa
 * escrever a linha e a ideia antes que exista o que estudar. Isso é trabalho de
 * pessoa, e o lugar dele é a tela de aberturas, não o plano do dia. Quem quiser
 * mostrar a lista de lacunas lê `frequenciaDoRepertorio(...).lacunas`, que já
 * vem ordenada por frequência real.
 *
 * DECISÃO 2 — O DESVIO NÃO ENTREGA A RESPOSTA. `DesvioDeRepertorio` carrega o
 * lance prescrito porque quem monta a tela de aberturas precisa dele, mas o
 * texto do bloco do plano NÃO o nomeia. Motivo: a mesma posição vira card de
 * repertório ("qual é o seu lance aqui?"), e um plano do dia que dissesse "seu
 * repertório pede Bc4" responderia o card antes de ele ser perguntado. É a
 * regra 5 do CLAUDE.md, recuperação antes de explicação, aplicada onde ela é
 * fácil de furar sem querer.
 *
 * DECISÃO 3 — FUNÇÃO PURA, PARTIDAS POR PARÂMETRO, SEM RELÓGIO. Nada aqui lê
 * repositório, rede ou data de hoje. A recência que importa já está no
 * `playedAt` das próprias partidas, e a JANELA de quais partidas entram é
 * decidida por quem lê o banco (`carregarSinaisDePartida`), num lugar só.
 */

import {
  frequenciaDoRepertorio,
  lanceDoRepertorio,
  type ArvoreDeRepertorio,
  type FrequenciaDeRepertorio,
} from '@/domain/repertoire'
import type { Game, Side, SkillId } from '@/domain/types'
import { instanteDe } from '@/lib/tempo'

/**
 * Uma vez em que o usuário saiu do PRÓPRIO repertório numa partida real.
 *
 * Junta as duas metades que moram separadas: a contagem (de
 * `frequenciaDoRepertorio`) e o conteúdo do nó (da árvore).
 */
export interface DesvioDeRepertorio {
  repertorioId: string
  /** Título do repertório, como escrito no conteúdo. */
  titulo: string
  lado: Side
  /** Habilidades que o repertório declara treinar. */
  habilidades: readonly SkillId[]
  /** Identidade da posição em que a saída aconteceu. */
  origem: string
  /** FEN jogável dessa posição, para a tela poder mostrar o tabuleiro. */
  fen: string
  /** O lance que o usuário jogou de verdade. */
  sanJogado: string
  /**
   * O lance que o repertório prescreve ali.
   *
   * NÃO vai para o texto do plano do dia — ver DECISÃO 2 no cabeçalho.
   */
  sanPrescrito: string
  /** Em quantas partidas recebidas isto aconteceu. */
  partidas: number
  /** `playedAt` da partida mais recente em que aconteceu, ou `null`. */
  ultimaEm: string | null
  gameIds: readonly string[]
}

/** "brancas" ou "pretas", para o texto em PT-BR. Fonte única do rótulo. */
export function ladoPorExtenso(lado: Side): string {
  return lado === 'w' ? 'brancas' : 'pretas'
}

/**
 * Ordem de relevância: mais partidas primeiro; empate desce para a mais
 * RECENTE; e o resto é desempate textual, só para ser determinístico.
 *
 * Data ilegível não vira "muito antigo" nem "muito recente": ela perde o
 * desempate por recência e cai no critério textual. Tratá-la como zero
 * mandaria o desvio para o fim da fila por causa de um cabeçalho torto.
 */
function porRelevancia(a: DesvioDeRepertorio, b: DesvioDeRepertorio): number {
  if (a.partidas !== b.partidas) return b.partidas - a.partidas

  const instanteA = a.ultimaEm === null ? null : instanteDe(a.ultimaEm)
  const instanteB = b.ultimaEm === null ? null : instanteDe(b.ultimaEm)
  if (instanteA !== null && instanteB !== null && instanteA !== instanteB) {
    return instanteB - instanteA
  }
  if (instanteA !== null && instanteB === null) return -1
  if (instanteA === null && instanteB !== null) return 1

  if (a.repertorioId !== b.repertorioId) return a.repertorioId < b.repertorioId ? -1 : 1
  if (a.origem !== b.origem) return a.origem < b.origem ? -1 : 1
  return a.sanJogado < b.sanJogado ? -1 : a.sanJogado > b.sanJogado ? 1 : 0
}

/**
 * Junta a contagem de desvios com o conteúdo da árvore que a produziu.
 *
 * LANÇA quando a frequência é de OUTRO repertório. Cruzar os dois produziria
 * desvios com o título errado e o lance prescrito errado, sem erro nenhum no
 * caminho — o tipo de falha muda que este projeto passou a rodada inteira
 * caçando. É erro de programação, não conteúdo ruim, e por isso não vira lista.
 */
export function desviosDaArvore(
  arvore: ArvoreDeRepertorio,
  frequencia: FrequenciaDeRepertorio,
): DesvioDeRepertorio[] {
  if (frequencia.repertorioId !== arvore.id) {
    throw new Error(
      `Frequência do repertório "${frequencia.repertorioId}" cruzada com a árvore ` +
        `"${arvore.id}".`,
    )
  }

  const desvios: DesvioDeRepertorio[] = []

  for (const saida of frequencia.desvios) {
    const no = arvore.nos.get(saida.origem)
    const ramo = no ? lanceDoRepertorio(arvore, no) : null
    if (!no || ramo === null) {
      // Inalcançável por construção: `frequenciaDoRepertorio` só registra desvio
      // num nó DA ÁRVORE que ainda tem ramos, e num nó cuja vez é do usuário
      // todos os ramos são dele. A guarda existe porque o contrário — montar um
      // desvio sem lance prescrito — viraria um bloco de treino sem resposta.
      continue
    }
    desvios.push({
      repertorioId: arvore.id,
      titulo: arvore.titulo,
      lado: arvore.lado,
      habilidades: arvore.habilidades,
      origem: saida.origem,
      fen: no.fen,
      sanJogado: saida.san,
      sanPrescrito: ramo.san,
      partidas: saida.partidas,
      ultimaEm: saida.ultimaEm,
      gameIds: saida.gameIds,
    })
  }

  return desvios.sort(porRelevancia)
}

/**
 * O caminho completo: árvores + partidas reais → desvios, já ordenados.
 *
 * É a porta que a camada de leitura usa. As partidas são as MESMAS para todas
 * as árvores; cada `frequenciaDoRepertorio` descarta sozinha as do outro lado.
 */
export function desviosDeRepertorios(
  arvores: readonly ArvoreDeRepertorio[],
  partidas: readonly Game[],
): DesvioDeRepertorio[] {
  return arvores
    .flatMap((arvore) => desviosDaArvore(arvore, frequenciaDoRepertorio(arvore, partidas)))
    .sort(porRelevancia)
}
