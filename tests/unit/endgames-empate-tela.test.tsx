/**
 * Portão da TELA do empate: o aluno lê que cumpriu, e lê POR QUE.
 *
 * O portão do domínio (`endgames-empate.test.ts`) prova a REGRA; este prova que
 * a regra CHEGA AO ALUNO. São defeitos diferentes, e o segundo é o silencioso:
 * `avaliarObjetivo` devolve "cumprido por repetição", a tela mostra só
 * "cumprido", e nada fica vermelho em lugar nenhum. O aluno termina a defesa
 * correta sem saber o que foi que funcionou.
 *
 * A POSIÇÃO É SINTÉTICA, e é de propósito. O que se mede aqui é o comportamento
 * da TELA, não o conteúdo do currículo — e nenhuma posição do currículo tem
 * linha modelo que termine em repetição. Amarrar este teste a um id de conteúdo
 * o quebraria na primeira reordenação da lição, medindo a coisa errada. O
 * currículo tem portão próprio.
 *
 * A sonda é MUDA: sem tablebase, o adversário segue a linha modelo, que é o
 * degrau determinístico. Assim o vai-e-volta acontece sem rede e sem sorteio.
 */

import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LicaoDeFinal, PosicaoDeFinal } from '@/domain/endgames'
import {
  APRESENTACAO_POR_ESTADO,
  APRESENTACAO_POR_REGRA_DE_EMPATE,
} from '@/components/endgames/textos'
import type { Sonda } from '@/components/endgames/resposta-do-adversario'

const contexto = vi.hoisted(() => ({ valor: null as unknown }))

vi.mock('@/components/providers/RepositoryProvider', () => ({
  useRepository: () => contexto.valor,
}))

const tabuleiro = vi.hoisted(() => ({
  onMove: null as null | ((from: string, to: string, promotion?: string) => boolean),
}))

vi.mock('@/components/chess/ChessBoardView', () => ({
  ChessBoardView: (props: {
    fen: string
    onMove?: (from: string, to: string, promotion?: string) => boolean
  }) => {
    tabuleiro.onMove = props.onMove ?? null
    return <div data-testid="tabuleiro" data-fen={props.fen} />
  },
}))

const { EndgameTrainer } = await import('@/components/endgames/EndgameTrainer')

/**
 * Peão de torre com o rei defensor no canto — o material das lições de casa
 * chave. As pretas seguram indo e voltando entre a8 e b8; as brancas não têm
 * como progredir e vão e voltam entre a6 e b6. Duas voltas devolvem a posição
 * inicial pela terceira vez.
 */
const VAI_E_VOLTA = ['a8b8', 'a6b6', 'b8a8', 'b6a6'] as const
const LINHA = [...VAI_E_VOLTA, ...VAI_E_VOLTA]

/** Os lances do ALUNO na linha: os de índice par. */
const LANCES_DO_ALUNO = LINHA.filter((_, indice) => indice % 2 === 0)

const posicao: PosicaoDeFinal = {
  id: 'teste-empate-por-repeticao',
  fen: 'k7/8/K7/P7/8/8/8/8 b - - 0 1',
  ladoDoAluno: 'b',
  objetivo: { tipo: 'empate-defendido' },
  enunciado: 'Segure o empate com o rei no canto.',
  linhaModelo: LINHA,
  dicas: [],
}

const licao: LicaoDeFinal = {
  id: 'teste-empate',
  titulo: 'Empate por repetição',
  habilidade: 'endgame.key-squares',
  conceito: 'O rei defensor não sai da casa que segura.',
  posicoes: [posicao],
}

/** Sem tablebase: o adversário segue a linha modelo, que é determinística. */
const sondaMuda: Sonda = async () => null

function contextoPronto() {
  return {
    status: 'pronto' as const,
    repo: null,
    profile: null,
    erro: null,
    saveProfile: async () => {},
    refresh: () => {},
    revision: 0,
  }
}

/**
 * O chip de status que carrega este rótulo, ou `undefined`.
 *
 * A tela tem várias regiões `role="status"` (veredito, julgamento do lance,
 * gravação): `getByRole('status')` sozinho reprova por ambiguidade, e
 * `queryAllByText` acharia o rótulo em qualquer lugar. Procurar o chip pelo
 * rótulo é o que responde à pergunta certa — a tela DISSE isto ao aluno?
 */
function chipComRotulo(rotulo: string): HTMLElement | undefined {
  return screen.queryAllByRole('status').find((elemento) => elemento.textContent?.includes(rotulo))
}

/**
 * Joga um lance do aluno e ESPERA A VEZ VOLTAR.
 *
 * O TESTE CORRIA COM O ADVERSÁRIO, e perdia sob carga. Ele esperava por
 * `/O adversário está escolhendo|É a sua vez/` — e a primeira metade dessa
 * alternativa é o estado INTERMEDIÁRIO. Bastava a espera ser satisfeita por ela
 * para o laço disparar o lance seguinte enquanto ainda era a vez das brancas: o
 * rei preto continuava em a8, `b8a8` chegava à tela e voltava como "não é um
 * lance legal nesta posição". A repetição nunca acontecia e o teste reprovava
 * dizendo que faltava o bloco do empate — a duas camadas de distância da causa.
 *
 * Na minha máquina isso só aparecia com duas suítes rodando ao mesmo tempo, o
 * que é a pior forma de um teste falhar: parece ruído da máquina, e some quando
 * alguém vai olhar.
 *
 * A condição para jogar o próximo lance é UMA: ser a vez do aluno. É essa que a
 * espera passa a cobrar.
 *
 * O `act` existe pelo mesmo motivo — sem ele o React avisava, a cada lance, que
 * havia atualização de estado fora dele, e era esse estado solto que chegava
 * atrasado.
 */
async function jogar(uci: string) {
  await act(async () => {
    tabuleiro.onMove?.(uci.slice(0, 2), uci.slice(2, 4))
  })
}

/** Espera o adversário responder e a vez voltar para o aluno. */
async function esperarAVez() {
  await waitFor(() => expect(screen.getByText(/É a sua vez/)).toBeInTheDocument())
}

beforeEach(() => {
  contexto.valor = contextoPronto()
  // Nenhuma rede sai daqui: a sonda é injetada, e o `fetch` global reprova alto
  // se algum caminho esquecido tentar usá-lo.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new Error('sem rede no teste')
    }),
  )
  render(<EndgameTrainer licao={licao} posicao={posicao} onVoltar={() => {}} probe={sondaMuda} />)
})

describe('a tela diz por que o empate valeu', () => {
  it('não anuncia regra de empate nenhuma enquanto a partida está viva', async () => {
    // Uma volta só: a posição apareceu duas vezes, e duas não é repetição.
    for (const uci of LANCES_DO_ALUNO.slice(0, 1)) {
      await jogar(uci)
      await esperarAVez()
    }
    expect(screen.queryByTestId('regra-do-empate')).toBeNull()
    expect(chipComRotulo(APRESENTACAO_POR_ESTADO['em-andamento'].rotulo)).toBeTruthy()
    // E nem por antecipação: "cumprido" aqui seria dizer que o aluno segurou o
    // empate quando ele apenas ainda não perdeu.
    expect(chipComRotulo(APRESENTACAO_POR_ESTADO.cumprido.rotulo)).toBeUndefined()
  })

  it('na terceira ocorrência diz "cumprido" E diz que foi por repetição', async () => {
    for (const [indice, uci] of LANCES_DO_ALUNO.entries()) {
      await jogar(uci)
      // No último lance a posição se encerra: não há vez para voltar.
      if (indice < LANCES_DO_ALUNO.length - 1) await esperarAVez()
    }

    const bloco = await screen.findByTestId('regra-do-empate')
    // Os textos saem da FONTE, nunca de um literal reescrito aqui: assim uma
    // frase reescrita em `textos.ts` não faz este portão reprovar por nada, e
    // uma frase APAGADA o faz reprovar de verdade.
    expect(bloco).toHaveTextContent(APRESENTACAO_POR_REGRA_DE_EMPATE.repeticao.rotulo)
    expect(bloco).toHaveTextContent(APRESENTACAO_POR_REGRA_DE_EMPATE.repeticao.explicacao)

    // E o veredito continua sendo o do domínio: cumprido.
    expect(
      chipComRotulo(APRESENTACAO_POR_ESTADO.cumprido.rotulo),
      'a tela não disse que o objetivo foi cumprido',
    ).toBeTruthy()

    // Quem segurou o empate não pode ler nada que sugira erro.
    expect(chipComRotulo(APRESENTACAO_POR_ESTADO.falhou.rotulo)).toBeUndefined()
  })
})
