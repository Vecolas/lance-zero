/**
 * O PORTÃO NO NÍVEL DA TELA: toda etapa que COBRA itens tem o que CLICAR.
 *
 * `jornada-exige-o-que-a-tela-oferece.test.ts` compara duas metades do DOMÍNIO —
 * a regra da etapa e a lista de itens. Isso não basta, e a diferença é
 * exatamente o defeito de origem: em `main`, a lista de perguntas EXISTIA no
 * conteúdo e a regra CONTAVA certo. O que faltava era a tela renderizá-las. O
 * contrato só vale quando alguém confere o lado que desenha.
 *
 * Este arquivo, então, monta a jornada de verdade e afirma o que o aluno vê:
 *
 * 1. cada etapa com `regra.tipo === 'itens'` expõe pelo menos um controle
 *    habilitado na MESA da etapa — tabuleiro e instrução, que é o que o aluno
 *    tem diante dele;
 * 2. usar esse controle faz `itensRespondidos` crescer — isto é, chega até
 *    `registrarItem`, que é o único caminho até a etapa fechar.
 *
 * O QUE ELE NÃO PROVA:
 *
 * - o TREINO FINAL. Ele é etapa de COBERTURA e depende de um juiz de tablebase —
 *   entrega à parte, declarada no ADR. Aqui ele fica de fora, dito em voz alta
 *   em vez de coberto por engano;
 * - a jornada INTEIRA de ponta a ponta. Quem percorre etapa por etapa num
 *   navegador de verdade é `tests/e2e/jornada-sem-beco.spec.ts`;
 * - que o arraste funcione. O tabuleiro é dublado: o que este arquivo prova é
 *   que a etapa CHEGA ao lance, não que dnd-kit entregue o drop.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ENDGAME_BY_SLUG } from '@/content/endgames/biblioteca'
import { conteudoDoFinal } from '@/lib/training/etapas-do-conteudo'
import { construirJornadaDeFinal } from '@/domain/endgames/jornada'
import { criarJornada, type StudyJourney } from '@/domain/jornada'
import { MemoryTrainingRepository } from '@/lib/storage/memory-repository'

const contexto = vi.hoisted(() => ({ valor: null as unknown }))

vi.mock('@/components/providers/RepositoryProvider', () => ({
  useRepository: () => contexto.valor,
}))

/*
  O TABULEIRO É DUBLADO, e o duplo JOGA UM LANCE LEGAL DE VERDADE.

  Não é conveniência: `react-chessboard` usa dnd-kit, e arrastar em jsdom não
  acontece. Mas um duplo MUDO seria pior que nenhum teste — ele faria a etapa de
  lance parecer sem controle nenhum, e o portão reprovaria o código certo.

  O duplo calcula o primeiro lance legal da posição com o MESMO `legalMoves` do
  domínio e chama a MESMA callback `onMove` que a implementação real invoca no
  drop. O que ele dubla é o arraste; o caminho até o lance é o de produção.
*/
vi.mock('@/components/chess/ChessBoardView', async () => {
  const { legalMoves } = await import('@/lib/chess')
  return {
    ChessBoardView: (props: {
      fen: string
      interactive?: boolean
      onMove?: (de: string, para: string) => boolean
    }) => {
      const lance = primeiroLanceLegal(props.fen, legalMoves)
      return (
        <div data-testid="tabuleiro" data-fen={props.fen}>
          {props.interactive && props.onMove && lance ? (
            <button type="button" onClick={() => props.onMove?.(lance.from, lance.to)}>
              jogar {lance.from}
              {lance.to}
            </button>
          ) : null}
        </div>
      )
    },
  }
})

/** O primeiro lance legal da posição, casa a casa. */
function primeiroLanceLegal(
  fen: string,
  legalMoves: (fen: string, casa: string) => readonly { to: string }[],
): { from: string; to: string } | null {
  const colunas = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  for (const coluna of colunas) {
    for (let linha = 1; linha <= 8; linha += 1) {
      const casa = `${coluna}${linha}`
      const lances = legalMoves(fen, casa)
      const primeiro = lances[0]
      if (primeiro) return { from: casa, to: primeiro.to }
    }
  }
  return null
}

const { EndgameStudyJourney } = await import('@/components/endgames/EndgameStudyJourney')

const SLUG = 'atividade-do-rei'

function final() {
  const definicao = ENDGAME_BY_SLUG.get(SLUG)
  const conteudo = conteudoDoFinal(SLUG)
  if (!definicao || !conteudo) throw new Error(`final ${SLUG} sumiu do catálogo`)
  return { definicao, conteudo }
}

/** Monta a tela já posicionada numa etapa, com um repositório de memória. */
async function abrirNaEtapa(stageId: string) {
  const { definicao, conteudo } = final()
  const stages = construirJornadaDeFinal(definicao, conteudo)
  const repo = new MemoryTrainingRepository()
  const inicial: StudyJourney = {
    ...criarJornada(`final:${definicao.id}`, definicao.id, 'final', stages),
    currentStageId: stageId,
  }
  await repo.saveStudyJourney(inicial)
  contexto.valor = { repo, profile: null, refresh: () => undefined, status: 'pronto' }

  render(<EndgameStudyJourney endgame={definicao} conteudo={conteudo} />)
  await screen.findByTestId('instrucao-do-estudo')
  return { repo, stages, jornadaId: inicial.id }
}

const { stages: ETAPAS } = (() => {
  const { definicao, conteudo } = final()
  return { stages: construirJornadaDeFinal(definicao, conteudo) }
})()

const ETAPAS_DE_ITENS = ETAPAS.filter((etapa) => etapa.regra.tipo === 'itens')

/** A mesa da etapa: tabuleiro E instrução, que é o que o aluno tem diante dele. */
function mesaDaEtapa(): HTMLElement {
  const painel = screen.getByTestId('instrucao-do-estudo')
  const mesa = painel.parentElement
  if (!mesa) throw new Error('painel de instrução sem mesa em volta')
  return mesa
}

describe('a varredura encontra etapas para conferir', () => {
  it('o final de referência tem etapa de itens — senão este arquivo não prova nada', () => {
    // Regra 3 dos portões: tabela vazia não é aprovação. Se um dia todas as
    // etapas virarem leitura, este teste reprova e obriga alguém a decidir se
    // isso é o produto ou um defeito.
    expect(ETAPAS_DE_ITENS.length).toBeGreaterThan(0)
  })
})

describe('toda etapa que cobra itens oferece o que clicar', () => {
  it.each(ETAPAS_DE_ITENS.map((etapa) => [etapa.id, etapa] as const))(
    'etapa %s',
    async (stageId) => {
      await abrirNaEtapa(stageId)
      /*
        A ETAPA É A MESA INTEIRA, e não só a coluna de instrução.

        A primeira versão deste teste olhava só `instrucao-do-estudo` e reprovou
        `variacoes`, `dois-lados` e `pratica-guiada` — que ESTAVAM certas. Num
        item de lance o controle é o TABULEIRO, na outra coluna. Medir só metade
        da mesa é medir a coisa errada, e teria feito o portão pedir um botão de
        enfeite ao lado de um tabuleiro que já funciona.
      */
      const mesa = mesaDaEtapa()
      const controles = within(mesa)
        .queryAllByRole('button')
        .filter((botao) => !(botao as HTMLButtonElement).disabled)

      expect(
        controles.length,
        `etapa ${stageId} cobra itens e não tem nenhum controle habilitado: beco sem saída`,
      ).toBeGreaterThan(0)
    },
  )
})

describe('responder chega até registrarItem', () => {
  it.each(ETAPAS_DE_ITENS.map((etapa) => [etapa.id, etapa] as const))(
    'etapa %s grava o item respondido',
    async (stageId) => {
      const { repo, jornadaId } = await abrirNaEtapa(stageId)
      const usuario = userEvent.setup()

      // Primeiro controle: a opção da pergunta, ou o lance no tabuleiro.
      const primeiro = within(mesaDaEtapa())
        .getAllByRole('button')
        .find((botao) => !(botao as HTMLButtonElement).disabled)
      expect(primeiro).toBeDefined()
      await usuario.click(primeiro!)

      // O veredito aparece e traz o "Continuar" que registra.
      const continuar = await screen.findByRole('button', { name: /^Continuar$/ })
      await usuario.click(continuar)

      await waitFor(async () => {
        const gravada = await repo.getStudyJourney(jornadaId)
        expect(
          gravada?.itensRespondidos[stageId]?.length ?? 0,
          `etapa ${stageId}: responder não gravou nada`,
        ).toBeGreaterThan(0)
      })
    },
  )
})
