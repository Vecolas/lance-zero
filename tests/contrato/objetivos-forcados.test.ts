/**
 * CONTRATO ENTRE O OBJETIVO DECLARADO DE CADA POSIÇÃO E A TABLEBASE REAL.
 *
 * POR QUE ESTE ARQUIVO EXISTE (issue #55, item 2): o portão do currículo prova
 * que a linha modelo é legal e chega ao objetivo. Só que OS LANCES DO
 * ADVERSÁRIO NESSA LINHA FOMOS NÓS QUE ESCOLHEMOS. O aluno que jogar fora do
 * roteiro pode encontrar uma defesa que o autor nunca considerou — e a lição
 * estaria afirmando algo falso, sem que nenhuma tela mostrasse nada de errado.
 *
 * A tablebase é a prova definitiva porque ela JÁ considerou todas as defesas: o
 * resultado teórico de uma posição é, por definição, o que o melhor jogo de
 * ambos os lados produz. Este arquivo pega esse resultado e o entrega a
 * `provarObjetivoPelaTablebase`, que decide se ele responde ao objetivo
 * DECLARADO. A ligação entre os dois não é óbvia e não é a mesma para os três
 * tipos de objetivo — está escrita, com a justificativa de cada uma, em
 * `src/domain/endgames/forcado.ts`. Em uma linha:
 *
 * - `empate-defendido`: equivale ao resultado `empate`. Provado.
 * - `mate-em`: equivale a `vitoria` com DTM dentro do prazo. Provado, e é um
 *   segundo par de olhos sobre `existeMateForcadoEm`, que já provava o mesmo
 *   sem rede.
 * - `promocao`: NÃO equivale a `vitoria`. Dá para ganhar sem promover e para
 *   promover sem ganhar. Só num material em que o mate é impossível sem
 *   promover a vitória implica promoção forçada; fora dele o veredito é
 *   `nao-provado` e aparece aqui em voz alta.
 *
 * O QUE ESTE PORTÃO REPROVA: objetivo IMPOSSÍVEL (a lição pede algo que a
 * defesa perfeita nega), posição coberta pela tablebase que não respondeu, e
 * `nao-provado` que NÃO seja limite declarado do método — o que inclui pedir
 * promoção em posição que não é vitória teórica e pedir empate em posição
 * teoricamente ganha. Esses casos não são erro de método: são pergunta para o
 * dono do produto.
 *
 * O QUE ELE TOLERA, ANUNCIANDO: `nao-provado` cujo motivo está em
 * `MOTIVOS_LIMITE_DO_METODO`. "Não consegui provar" não é "está errado", e
 * transformar um no outro treinaria todo mundo a ignorar vermelho. O que não se
 * pode é deixar a diferença invisível — por isso cada um sai nomeado na saída.
 *
 * ESTADO CONHECIDO EM 2026-09-09, contra o serviço real:
 * - 8 posições PROVADAS forçadas (4 de mate, 3 de empate, 2 de promoção — a de
 *   `oposicao-conquistar` e a de `quadrado-rei-fora`, ambas rei e peão contra
 *   rei);
 * - `passado-rompimento` tem 8 peças e fica FORA do alcance da tablebase para
 *   sempre. Não é falha, e não é silêncio: sai listada como não conferida;
 * - `lucena-ponte` fica em `nao-provado`, por limite do método: a vitória é
 *   teórica, mas com torre no tabuleiro o mate existe sem promoção, então a
 *   tablebase não decide se a PROMOÇÃO é forçada. A lição continua sendo a
 *   melhor evidência que temos, e a pergunta continua aberta.
 *
 * O QUE ELE NÃO PROVA:
 * 1. que a TELA reconhece o objetivo cumprido. A prova aqui é sobre o XADREZ;
 *    o reconhecimento é outro assunto, com portão próprio em
 *    `tests/unit/endgames-objetivo.test.ts`.
 *
 *    Este item dizia, até 2026-09-10, que `avaliarObjetivo` não reconhecia
 *    empate por repetição — e por isso um `empate-defendido` provado forçado
 *    AQUI podia nunca ser marcado como cumprido lá. Deixou de ser verdade: o
 *    domínio passou a receber o histórico e a reconhecer repetição e a regra
 *    dos 50 lances. O texto fica registrado porque documentação errada dentro
 *    de um portão é o pior lugar para ela;
 * 2. que a LINHA MODELO é boa. Isso é de `curriculo-vs-tablebase.test.ts`;
 * 3. nada sobre `passado-rompimento`, que nenhuma tablebase alcança.
 *
 * NÃO RODA NO CI, pelos mesmos dois motivos dos outros contratos: depende de
 * rede e de serviço de terceiro, e a orientação oficial da Lichess é uma
 * requisição por vez. Rode à mão com `pnpm test:contrato`.
 */

import { describe, expect, it } from 'vitest'
import { CURRICULO_FINAIS } from '@/content/endgames'
import {
  MOTIVOS_LIMITE_DO_METODO,
  posicoesDe,
  provarObjetivoPelaTablebase,
  type PosicaoDeFinal,
  type ProvaDeObjetivo,
} from '@/domain/endgames'
import { LichessTablebaseProvider, TABLEBASE_CONFIG } from '@/lib/tablebase/provider'

/** Orçamento total: uma requisição por posição, em série, sem paralelismo. */
const TEMPO = 120_000

const transporteReal: typeof fetch = (...args) => globalThis.fetch(...args)

/** Conta as peças no campo de tabuleiro do FEN. */
function pecas(fen: string): number {
  return ((fen.trim().split(/\s+/)[0] ?? '').match(/[a-zA-Z]/g) ?? []).length
}

function descrever(posicao: PosicaoDeFinal, prova: ProvaDeObjetivo): string {
  const prazo =
    prova.lancesAteOMate === null
      ? ''
      : `, mate em ${String(prova.lancesAteOMate)} lance(s) do aluno`
  return (
    `${posicao.id}: objetivo ${posicao.objetivo.tipo}, resultado teórico para o aluno ` +
    `${prova.resultadoDoAluno ?? 'desconhecido'}${prazo} → ${prova.veredito} (${prova.motivo})`
  )
}

describe('os objetivos do currículo de finais são forçados, não só alcançáveis', () => {
  it(
    'toda posição coberta pela tablebase tem o objetivo provado forçado',
    async () => {
      const provider = new LichessTablebaseProvider({ fetchFn: transporteReal })
      const posicoes = posicoesDe([...CURRICULO_FINAIS])

      const forcados: string[] = []
      const impossiveis: string[] = []
      const naoProvados: string[] = []
      const limitesDoMetodo: string[] = []
      const foraDoAlcance: string[] = []
      const semResposta: string[] = []

      for (const posicao of posicoes) {
        // Uma de cada vez: o `await` dentro do laço é o requisito, não um
        // descuido. A fila do provider reforça, mas quem manda é este laço.
        const resultado = await provider.probe(posicao.fen)

        if (resultado === null) {
          // As duas causas de `null` são indistinguíveis para quem chama, e
          // separá-las AQUI é o que impede o portão de ficar verde por engano
          // durante uma queda do serviço: fora do alcance é esperado e
          // permanente, sem resposta com 7 peças ou menos é falha.
          if (pecas(posicao.fen) > TABLEBASE_CONFIG.maxPecas) {
            foraDoAlcance.push(`${posicao.id} (${String(pecas(posicao.fen))} peças)`)
          } else {
            semResposta.push(`${posicao.id} (${posicao.fen})`)
          }
          continue
        }

        const prova = provarObjetivoPelaTablebase({
          fen: posicao.fen,
          objetivo: posicao.objetivo,
          ladoDoAluno: posicao.ladoDoAluno,
          tablebase: resultado,
        })
        const linha = descrever(posicao, prova)

        switch (prova.veredito) {
          case 'forcado':
            forcados.push(linha)
            break
          case 'impossivel':
            impossiveis.push(linha)
            break
          case 'nao-provado':
            // A separação que dá sentido ao portão: limite do método é ponto
            // cego declarado; o resto é pergunta para o dono do produto.
            if (prova.limiteDoMetodo) {
              limitesDoMetodo.push(linha)
            } else {
              naoProvados.push(linha)
            }
            break
        }
      }

      // Tudo o que o portão viu sai ANTES de qualquer asserção, para ninguém
      // achar que uma posição foi conferida quando o teste parar mais adiante.
      console.warn(`objetivos PROVADOS forçados:\n${forcados.join('\n')}`)
      if (limitesDoMetodo.length > 0) {
        console.warn(
          'objetivos NÃO PROVADOS por limite declarado do método ' +
            `(${MOTIVOS_LIMITE_DO_METODO.join(', ')}) — a pergunta continua aberta:\n` +
            limitesDoMetodo.join('\n'),
        )
      }
      if (foraDoAlcance.length > 0) {
        console.warn(
          `posições fora do alcance da tablebase (NÃO conferidas): ${foraDoAlcance.join(', ')}`,
        )
      }

      // Regra do portão: varredura que não varreu nada não é aprovação. Uma
      // queda geral do serviço cai aqui, em vez de imprimir "tudo certo".
      expect(
        forcados.length + limitesDoMetodo.length,
        'nenhuma posição foi confrontada com a tablebase',
      ).toBeGreaterThan(0)

      // Posição dentro do alcance que não respondeu é falha do serviço ou do
      // adapter, e não pode virar silêncio.
      expect(semResposta, `posições cobertas sem resposta:\n${semResposta.join('\n')}`).toEqual([])

      expect(
        impossiveis,
        'objetivos que a defesa perfeita NEGA — a lição afirma ao aluno algo falso:\n' +
          `${impossiveis.join('\n')}\n` +
          'NÃO conserte o currículo por conta própria: leve a posição, o objetivo e o ' +
          'resultado teórico ao dono do produto.',
      ).toEqual([])

      expect(
        naoProvados,
        'objetivos que a tablebase não confirma, e cujo motivo NÃO é limite do método:\n' +
          `${naoProvados.join('\n')}\n` +
          'Pode ser o objetivo mal declarado, pode ser a leitura do resultado — decidir é ' +
          'do dono do produto, não deste portão.',
      ).toEqual([])
    },
    TEMPO,
  )
})
