import { describe, expect, it } from 'vitest'

import { OPENING_COURSES } from '@/content/openings/course'
import { ramosDaAbertura } from '@/domain/openings/ramos'
import {
  continuacoesConhecidas,
  deixarBotJogar,
  iniciarSparring,
  jogarNoSparring,
  type LadoDoAluno,
} from '@/domain/openings/sparring'
import type { OpeningDefinition } from '@/domain/openings'

/*
  O ALCANCE DO BOT NO PAPEL INVERTIDO.

  Já existe um contrato de alcance em `openings-sparring.test.ts`, e ele mede o
  papel PRIMÁRIO: o aluno joga o lado do repertório e o bot joga o outro. Ele
  filtra os ramos por `ladoQueDesvia !== opening.side`, o que é correto para o
  que ele mede — e deixa um vão exatamente do tamanho da etapa "dois lados".

  NO PAPEL INVERTIDO O BOT JOGA O LADO DO REPERTÓRIO, e passa a ser ele quem
  precisa escolher os desvios que antes eram do aluno. Nenhum teste media isso, e
  era ali que estava o defeito.

  O CASO QUE ESTE ARQUIVO NASCEU PARA PEGAR. A escolha do bot era
  `(seed + ply) % opcoes`, e o `seed` é a rodada — o mesmo valor em todos os
  lances. Isso amarra duas bifurcações uma à outra. Na Escandinava:

    ply 3: opções [Qxd5, Nf6] -> (seed+3) % 2  =>  Qxd5 exige seed ÍMPAR
    ply 5: opções [Qa5, Qd6]  -> (seed+5) % 2  =>  Qd6  exige seed PAR

  Chegar a `Qd6` exigia passar por `Qxd5`, e nenhum seed é par e ímpar ao mesmo
  tempo. O ramo era inalcançável para sempre.

  ESTE TESTE DIRIGE O PRODUTO, e não uma cópia dele: ele joga partidas inteiras
  com `deixarBotJogar` e `jogarNoSparring`. Reimplementar a seleção aqui mediria
  a reimplementação — foi o primeiro rascunho, e ele acusou quatro ramos da
  Italiana que estavam perfeitamente alcançáveis no produto.
*/

/** O orçamento de partidas. Um ramo que só aparece na rodada 900 não aparece. */
const RODADAS = 12

/**
 * Uma partida inteira no papel invertido: o bot joga o lado do repertório e o
 * aluno, o outro. O aluno segue sempre a primeira continuação teórica — o que
 * se mede aqui é a escolha do BOT.
 */
function partidaNoPapelInverso(opening: OpeningDefinition, rodada: number): string[] {
  const ladoDoAluno: LadoDoAluno = opening.side === 'white' ? 'b' : 'w'
  let estado = deixarBotJogar(opening, iniciarSparring(opening), ladoDoAluno, rodada).estado

  for (let ply = 0; ply < 60; ply += 1) {
    const opcoes = continuacoesConhecidas(opening, estado.historico)
    if (opcoes.length === 0) break

    const jogada = jogarNoSparring(opening, estado, opcoes[0]!.uci)
    if (jogada.tipo !== 'na-teoria') break
    estado = deixarBotJogar(opening, jogada.estado, ladoDoAluno, rodada).estado
  }

  return [...estado.historico]
}

describe('no papel invertido, o bot também alcança cada ramo estudado', () => {
  it('alguma rodada leva o bot a cada desvio do lado do repertório', () => {
    const inalcancaveis: string[] = []

    for (const opening of OPENING_COURSES) {
      /*
        Aqui os papéis se invertem: interessam os ramos cujo desvio é do lado do
        REPERTÓRIO, porque é esse lado que o bot assume agora.
      */
      const ramos = ramosDaAbertura(opening).filter(
        (ramo) =>
          ramo.ramificacao.indiceDaDivergencia !== null &&
          ramo.ramificacao.ladoQueDesvia === opening.side,
      )
      if (ramos.length === 0) continue

      const partidas = Array.from({ length: RODADAS }, (_, rodada) =>
        partidaNoPapelInverso(opening, rodada),
      )

      for (const ramo of ramos) {
        const divergencia = ramo.ramificacao.indiceDaDivergencia ?? 0
        const ateODesvio = ramo.ramificacao.variacao.line
          .slice(0, divergencia + 1)
          .map((lance) => lance.uci.toLowerCase())

        const alcancado = partidas.some((historico) =>
          ateODesvio.every((uci, i) => historico[i]?.toLowerCase() === uci),
        )

        if (!alcancado) {
          inalcancaveis.push(
            `${opening.slug}/${ramo.ramificacao.variacao.id}: nenhuma das ${RODADAS} primeiras rodadas leva o bot até o desvio`,
          )
        }
      }
    }

    expect(inalcancaveis).toEqual([])
  })

  it('há ramos de verdade sendo medidos — o contrato não passa por lista vazia', () => {
    /*
      Sem este piso, um refatoramento que mudasse `ladoQueDesvia` deixaria o
      contrato acima verde por não medir nada. É a mesma classe de defeito do
      portão de microdecisão, que dizia "por curso" e media o catálogo.
    */
    const medidos = OPENING_COURSES.flatMap((opening) =>
      ramosDaAbertura(opening).filter(
        (ramo) =>
          ramo.ramificacao.indiceDaDivergencia !== null &&
          ramo.ramificacao.ladoQueDesvia === opening.side,
      ),
    )
    expect(medidos.length).toBeGreaterThan(5)
  })
})
