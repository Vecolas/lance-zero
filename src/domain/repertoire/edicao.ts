/**
 * Edição do repertório pelo aluno: por enquanto, a IDEIA de um lance.
 *
 * POR QUE COMEÇAR PELA IDEIA, e não pela árvore. O produto promete um
 * repertório com IDEIA escrita, e não uma sequência decorada (`CLAUDE.md`,
 * DECISÃO 1 de `arvore.ts`). Um repertório de fábrica com ideias de fábrica é
 * conteúdo de outra pessoa: o aluno lê "o bispo mira f7" numa frase que ele não
 * escolheu, e nada ali é dele. Poder trocar essa frase pela que faz sentido para
 * ele é a menor edição que muda o dono do repertório. Arrastar, criar e apagar
 * ramo é outra rodada, e este arquivo não finge fazê-lo.
 *
 * DECISÃO 1 — A EDIÇÃO É ENDEREÇADA PELO PAR (POSIÇÃO, LANCE), nunca por
 * "linha 2, lance 5". É a mesma DECISÃO 2 de `arvore.ts` vista do outro lado: a
 * ideia pertence ao par, e é declarada UMA vez. Endereçar por posição no array
 * quebraria no dia em que alguém inserisse um lance antes — e quebraria em
 * silêncio, editando a frase errada. A posição entra como IDENTIDADE
 * (`identidadeDePosicao`), que é o que faz transposição ser um nó só.
 *
 * DECISÃO 2 — A LINHA A EDITAR É DESCOBERTA REJOGANDO, e não guardada. O mesmo
 * caminhamento de `construirRepertorio`, na mesma ordem de declaração, encontra
 * a PRIMEIRA aparição do par — que é exatamente onde a ideia mora, porque nas
 * repetições ela é proibida. Guardar um índice ao lado da árvore seria a segunda
 * fonte da mesma verdade, e ela divergiria no primeiro conteúdo editado.
 *
 * DECISÃO 3 — A IDENTIDADE DOS NÓS NÃO PODE MUDAR AQUI, e é por isso que esta
 * função só toca em `ideia`. O id do card FSRS é derivado da identidade da
 * posição (`cards.ts`, DECISÃO 3): mexer num SAN reescreveria as posições dali
 * para a frente e órfãos todos os cards daquele trecho, levando junto o
 * agendamento que o aluno construiu. O portão `repertoire-edicao` prova que
 * editar a ideia deixa TODOS os ids de card intactos.
 *
 * DECISÃO 4 — PROBLEMA VOLTA COMO RESULTADO, e não como exceção. Mesma escolha
 * de `construirRepertorio` (DECISÃO 6 de lá): quem chama é uma tela, e tela
 * precisa de motivo para escrever uma frase — não de um `throw` para engolir.
 */

import { applyMove, identidadeDePosicao, START_FEN } from '@/lib/chess'
import type { DefinicaoDeRepertorio, LanceDeRepertorio, LinhaDeRepertorio } from '@/domain/types'

/** Onde a ideia mora: o par posição + lance. Ver DECISÃO 1. */
export interface AlvoDaIdeia {
  /** Identidade da posição de ONDE o lance sai. */
  origem: string
  /** O lance, em SAN, como está declarado. */
  san: string
}

export type MotivoDaRecusa =
  /** Nenhuma linha do repertório declara este lance nesta posição. */
  | 'lance-nao-encontrado'
  /** Texto em branco. Lance sem ideia é memorização — ver DECISÃO 1 de `arvore.ts`. */
  | 'ideia-vazia'

export type ResultadoDaEdicao =
  | { ok: true; definicao: DefinicaoDeRepertorio }
  | { ok: false; motivo: MotivoDaRecusa; mensagem: string }

/** Onde a primeira aparição do par foi declarada. */
interface Ocorrencia {
  linha: number
  lance: number
}

/**
 * A primeira aparição do par (posição, lance) na definição, ou `null`.
 *
 * Percorre as linhas na ORDEM DE DECLARAÇÃO e para na primeira, porque é essa
 * a que carrega a ideia. Linha com lance ilegal é interrompida no lance ilegal,
 * do mesmo jeito que `construirRepertorio` faz — assim as duas leituras do
 * mesmo conteúdo nunca discordam sobre até onde a linha vai.
 */
export function primeiraOcorrenciaDoLance(
  definicao: DefinicaoDeRepertorio,
  alvo: AlvoDaIdeia,
): Ocorrencia | null {
  for (let linha = 0; linha < definicao.linhas.length; linha += 1) {
    let fen = START_FEN
    const lances = definicao.linhas[linha].lances
    for (let lance = 0; lance < lances.length; lance += 1) {
      const san = lances[lance].san
      const origem = identidadeDePosicao(fen)
      if (origem === alvo.origem && san === alvo.san) {
        return { linha, lance }
      }
      const aplicado = applyMove(fen, san)
      if (aplicado === null) {
        break
      }
      fen = aplicado.fenAfter
    }
  }
  return null
}

/**
 * Troca a ideia de um lance e devolve a definição resultante.
 *
 * PURA: recebe a definição, devolve outra, e não toca na que recebeu — a
 * original continua sendo a semente de fábrica para quem ainda não editou.
 *
 * O texto é gravado com as pontas aparadas. Espaço em volta não é conteúdo, e
 * uma ideia feita só de espaço passaria por "escrita" no armazenamento e
 * reprovaria no portão do conteúdo — que é a falha silenciosa a evitar aqui.
 */
export function editarIdeiaDoRepertorio(
  definicao: DefinicaoDeRepertorio,
  alvo: AlvoDaIdeia,
  ideia: string,
): ResultadoDaEdicao {
  const texto = ideia.trim()
  if (texto.length === 0) {
    return {
      ok: false,
      motivo: 'ideia-vazia',
      mensagem:
        'Escreva a ideia antes de salvar. Um lance sem ideia é memorização, e é o que ' +
        'este repertório recusa a ser.',
    }
  }

  const onde = primeiraOcorrenciaDoLance(definicao, alvo)
  if (onde === null) {
    return {
      ok: false,
      motivo: 'lance-nao-encontrado',
      mensagem: `O lance "${alvo.san}" não está declarado nesta posição do repertório.`,
    }
  }

  const linhas: LinhaDeRepertorio[] = definicao.linhas.map((linha, indice) => {
    if (indice !== onde.linha) {
      return linha
    }
    const lances: LanceDeRepertorio[] = linha.lances.map((lance, posicao) =>
      posicao === onde.lance ? { ...lance, ideia: texto } : lance,
    )
    return { ...linha, lances }
  })

  return { ok: true, definicao: { ...definicao, linhas } }
}
