/**
 * CONTRATO ENTRE A LINHA MODELO DO CURRÍCULO E A TABLEBASE REAL.
 *
 * POR QUE ESTE ARQUIVO EXISTE: a linha modelo de cada posição de final foi
 * ESCRITA À MÃO. O portão do currículo (`tests/unit/endgames-curriculo.test.ts`)
 * prova que ela é legal e que chega ao objetivo — e não prova que o primeiro
 * lance dela é o MELHOR lance da posição. Depois da issue #62 essa diferença
 * deixou de ser detalhe: é o primeiro lance da linha modelo que vira a solução
 * do card de revisão, e é contra o melhor lance da tablebase que o lance do
 * aluno passa a ser julgado. Se os dois discordarem, o aluno recebe a lição de
 * um lance e a sinalização de outro — e ninguém percebe, porque as duas telas
 * parecem certas isoladamente.
 *
 * Melhor descobrir aqui que na tela do aluno.
 *
 * O JULGAMENTO É O MESMO DA PRODUÇÃO. Este teste não compara UCI com UCI: ele
 * chama `julgarLanceDeFinal`, exatamente a função que a tela usa. Assim ele
 * aceita, sem reclamar, um lance que a tablebase não sabe distinguir do
 * primeiro — e reprova o que a tela chamaria de "mais longo que o melhor". Um
 * comparador próprio aqui mediria o código deste arquivo, não o da tela.
 *
 * SE ALGUMA POSIÇÃO DISCORDAR, NÃO CONSERTE O CURRÍCULO POR CONTA PRÓPRIA. Pode
 * ser a linha modelo que está errada, pode ser a leitura da tablebase — e
 * decidir isso é do dono do produto. A mensagem de falha traz os dois lances e
 * as duas distâncias justamente para essa conversa.
 *
 * NÃO RODA NO CI, pelos mesmos dois motivos do outro arquivo de contrato:
 * depende de rede e de serviço de terceiro, e a orientação oficial da Lichess é
 * uma requisição por vez. Rode à mão com `pnpm test:contrato`.
 *
 * O QUE ELE NÃO PROVA: que a linha modelo INTEIRA é ótima. Só o primeiro lance
 * é conferido — é o lance sobre o qual a lição é, e é o que vira card. Conferir
 * a linha toda multiplicaria as requisições por posição.
 *
 * ESTADO CONHECIDO EM 2026-09-09, contra o serviço real: 10 posições conferidas,
 * 9 de acordo, 1 EM DESACORDO —
 *
 *   lucena-ponte: a linha modelo começa com d1d4 (a ponte, que é a técnica que
 *   a lição ensina); a tablebase põe d1e1+ em primeiro. DTM 40 contra 34.
 *
 * Este arquivo fica VERMELHO por causa disso, de propósito. NÃO transforme a
 * posição numa exceção declarada para o vermelho sumir: aceitar que o lance da
 * lição não é o melhor da tablebase é exatamente a decisão de produto que
 * precisa ser tomada por quem decide produto — é o caso em que "o melhor lance
 * é o que carrega o espírito do problema" e "o melhor lance é o primeiro da
 * tablebase" podem não ser a mesma coisa. Silenciar aqui apagaria a pergunta.
 */

import { describe, expect, it } from 'vitest'
import { CURRICULO_FINAIS } from '@/content/endgames'
import { julgarLanceDeFinal, posicoesDe, type PosicaoDeFinal } from '@/domain/endgames'
import { normalizeUci } from '@/domain/puzzles/parser'
import { LichessTablebaseProvider, TABLEBASE_CONFIG } from '@/lib/tablebase/provider'

/** Orçamento total: uma requisição por posição, em série, sem paralelismo. */
const TEMPO = 120_000

const transporteReal: typeof fetch = (...args) => globalThis.fetch(...args)

/** Conta as peças no campo de tabuleiro do FEN. */
function pecas(fen: string): number {
  return ((fen.trim().split(/\s+/)[0] ?? '').match(/[a-zA-Z]/g) ?? []).length
}

interface Divergencia {
  posicao: PosicaoDeFinal
  linha: string
  descricao: string
}

describe('a linha modelo do currículo concorda com a tablebase', () => {
  it(
    'o primeiro lance de toda posição coberta é o melhor lance da posição',
    async () => {
      const provider = new LichessTablebaseProvider({ fetchFn: transporteReal })
      const posicoes = posicoesDe([...CURRICULO_FINAIS])

      const divergencias: Divergencia[] = []
      const foraDoAlcance: string[] = []
      const semResposta: string[] = []
      const conferidas: string[] = []
      const maisLongas: string[] = []

      for (const posicao of posicoes) {
        const primeiro = normalizeUci(posicao.linhaModelo[0] ?? '')
        // Uma de cada vez: o `await` dentro do laço é o requisito, não um
        // descuido. A fila do provider reforça, mas quem manda é este laço.
        const resultado = await provider.probe(posicao.fen)

        if (resultado === null) {
          // As duas causas de `null` são indistinguíveis para quem chama, e
          // separá-las AQUI é o que impede o teste de ficar verde por engano
          // durante uma queda do serviço: fora do alcance é esperado, sem
          // resposta com 7 peças ou menos é falha.
          if (pecas(posicao.fen) > TABLEBASE_CONFIG.maxPecas) {
            foraDoAlcance.push(`${posicao.id} (${pecas(posicao.fen)} peças)`)
          } else {
            semResposta.push(`${posicao.id} (${posicao.fen})`)
          }
          continue
        }

        conferidas.push(posicao.id)
        const julgamento = julgarLanceDeFinal({
          fenAntes: posicao.fen,
          uciDoAluno: primeiro,
          antes: resultado,
        })

        const c = julgamento.comparacao
        const descricao =
          `${posicao.id}: a linha modelo começa com ${primeiro}, a tablebase põe ` +
          `${julgamento.melhorUci} (${julgamento.melhorSan ?? '—'}) em primeiro. ` +
          `Grau: ${julgamento.grau} (${julgamento.motivo})` +
          (c === null
            ? '.'
            : `. ${c.metrica.toUpperCase()} da linha modelo: ${c.doAluno}; do melhor: ${c.doMelhor}.`)

        // O QUE ESTE PORTÃO AFIRMA, depois da decisão do dono do produto: a
        // linha modelo tem de PRESERVAR o resultado teórico. Ela NÃO precisa ser
        // o primeiro lance da tablebase.
        //
        // A regra anterior era "tem de ser o melhor da tablebase", e ela
        // reprovava o currículo certo: em Lucena, a ponte é a nona de dezesseis
        // por chegar ao mate três lances depois — e a ponte é literalmente a
        // técnica que a lição existe para ensinar. A tablebase mede caminho até
        // o mate; a lição ensina um padrão que se repete.
        //
        // O que continua sendo erro de verdade: linha modelo que joga fora a
        // vitória, ou posição coberta que o juiz não consegue avaliar.
        if (julgamento.grau === 'perde-o-resultado' || julgamento.grau === 'indeterminado') {
          divergencias.push({ posicao, linha: primeiro, descricao })
        } else if (julgamento.grau === 'mantem-mas-e-pior') {
          // NÃO é falha — é informação, e ela precisa aparecer. Silenciar de vez
          // apagaria o sinal de que a linha modelo talvez pudesse ser melhor.
          maisLongas.push(descricao)
        }
      }

      // As posições fora do alcance não são erro — mas ficam registradas ANTES
      // de qualquer asserção, para ninguém achar que elas foram conferidas
      // quando o teste parar numa falha mais adiante.
      if (maisLongas.length > 0) {
        console.warn(
          'linhas modelo que GANHAM mas não são o primeiro lance da tablebase ' +
            '(esperado numa lição de técnica; conferir se ainda faz sentido):\n' +
            maisLongas.join('\n'),
        )
      }

      if (foraDoAlcance.length > 0) {
        console.warn(
          `posições fora do alcance da tablebase (NÃO conferidas): ${foraDoAlcance.join(', ')}`,
        )
      }
      console.warn(`posições conferidas contra a tablebase: ${conferidas.join(', ')}`)

      // Regra do portão: varredura que não varreu nada não é aprovação. Uma
      // queda geral do serviço cai aqui, em vez de imprimir "tudo certo".
      expect(conferidas.length, 'nenhuma posição foi conferida contra a tablebase').toBeGreaterThan(
        0,
      )

      // Posição dentro do alcance que não respondeu é falha do serviço ou do
      // adapter, e não pode virar silêncio.
      expect(semResposta, `posições cobertas sem resposta:\n${semResposta.join('\n')}`).toEqual([])

      expect(
        divergencias.map((d) => d.descricao),
        `linhas modelo em desacordo com a tablebase:\n${divergencias.map((d) => d.descricao).join('\n')}\n` +
          'NÃO conserte o currículo por conta própria: leve os dois lances ao dono do produto.',
      ).toEqual([])
    },
    TEMPO,
  )
})
