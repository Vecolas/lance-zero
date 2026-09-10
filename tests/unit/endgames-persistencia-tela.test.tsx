/**
 * Portão da GRAVAÇÃO na tela de finais.
 *
 * Este arquivo existe por causa de UMA falha, e ela é silenciosa: gravar a
 * tentativa mais de uma vez. A tela re-renderiza várias vezes depois que a
 * tentativa termina — o provider avisa que os dados mudaram, o estado do
 * adversário chega atrasado, o React em modo estrito roda o efeito duas vezes.
 * Se cada render gravasse, o modelo de maestria inflaria sem erro no console,
 * sem linha vermelha em teste e sem nada na tela: o aluno só veria o planner
 * achando que ele treina finais muito mais do que treina.
 *
 * Por isso o caso central é montado em `<StrictMode>`: é o ambiente que dobra
 * efeitos de propósito, e é o mais parecido com o desenvolvimento real.
 *
 * O segundo motivo deste arquivo é a DEGRADAÇÃO. IndexedDB some em aba anônima
 * e com permissão negada. Quando some, o aluno tem de terminar a posição do
 * mesmo jeito e LER que nada foi gravado — silêncio ali seria prometer um
 * histórico que não existe.
 *
 * A posição usada sai do currículo por PROPRIEDADE (mate em 1 lance com linha
 * modelo de um lance só), nunca por id cravado: assim o teste continua válido
 * se o conteúdo for reordenado, e falha alto se o currículo perder esse tipo de
 * posição.
 */

import { StrictMode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CURRICULO_FINAIS } from '@/content/endgames'
import type { LicaoDeFinal, PosicaoDeFinal } from '@/domain/endgames'
import { chaveDaPosicao } from '@/domain/endgames/persistencia'
import {
  APRESENTACAO_DA_GRAVACAO,
  descreverHistorico,
  ESTADOS_DA_GRAVACAO,
} from '@/components/endgames/textos'
import type { Sonda } from '@/components/endgames/resposta-do-adversario'
import { legalMoves } from '@/lib/chess'
import { MemoryTrainingRepository } from '@/lib/storage/memory-repository'
import type { BackupRepository } from '@/lib/storage/repository'

const contexto = vi.hoisted(() => ({ valor: null as unknown }))

vi.mock('@/components/providers/RepositoryProvider', () => ({
  useRepository: () => contexto.valor,
}))

// O tabuleiro é dependência de terceiros com arraste: fora do escopo aqui. Os
// lances entram pelo campo de UCI, que é a alternativa acessível de verdade.
vi.mock('@/components/chess/ChessBoardView', () => ({
  ChessBoardView: ({ fen }: { fen: string }) => <div data-testid="tabuleiro" data-fen={fen} />,
}))

const { EndgameTrainer } = await import('@/components/endgames/EndgameTrainer')

/** Mate em 1 com linha modelo de um lance: resolver é um lance só. */
function posicaoDeUmLance(): { licao: LicaoDeFinal; posicao: PosicaoDeFinal } {
  for (const licao of CURRICULO_FINAIS) {
    for (const posicao of licao.posicoes) {
      if (
        posicao.objetivo.tipo === 'mate-em' &&
        posicao.objetivo.lancesMaximos === 1 &&
        posicao.linhaModelo.length === 1
      ) {
        return { licao, posicao }
      }
    }
  }
  throw new Error(
    'O currículo não tem mais nenhum mate em 1 de um lance: este teste precisa ser reescrito.',
  )
}

const { licao, posicao } = posicaoDeUmLance()
const LANCE_CERTO = posicao.linhaModelo[0]

/** Um lance legal que NÃO cumpre o objetivo, derivado da posição. */
const LANCE_ERRADO = (() => {
  const outro = legalMoves(posicao.fen).find((lance) => lance.uci !== LANCE_CERTO)
  if (outro === undefined) {
    throw new Error('A posição só tem um lance legal: não dá para exercitar a falha.')
  }
  return outro.uci
})()

function contextoCom(repo: BackupRepository | null, status: 'pronto' | 'erro' = 'pronto') {
  return {
    status,
    repo,
    profile: null,
    erro: null,
    saveProfile: async () => {},
    refresh: () => {},
    revision: 0,
  }
}

function montar(probe?: Sonda) {
  return render(
    <StrictMode>
      <EndgameTrainer licao={licao} posicao={posicao} onVoltar={() => {}} probe={probe} />
    </StrictMode>,
  )
}

async function jogar(uci: string) {
  await userEvent.type(screen.getByLabelText(/Lance em UCI/), uci)
  await userEvent.click(screen.getByRole('button', { name: 'Jogar lance' }))
}

beforeEach(() => {
  // A tela monta um provider de tablebase; nenhuma rede sai daqui.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new Error('sem rede no teste')
    }),
  )
})

describe('grava uma vez por tentativa', () => {
  it('resolver grava um registro só, e re-renderizar não grava de novo', async () => {
    const repo = new MemoryTrainingRepository()
    const gravou = vi.spyOn(repo, 'savePuzzleAttempt')
    contexto.valor = contextoCom(repo)

    const { rerender } = montar()
    await jogar(LANCE_CERTO)
    await screen.findByText(/Tentativa gravada/)

    expect(gravou).toHaveBeenCalledTimes(1)

    // Exatamente o que acontece de verdade: gravar chama `refresh()`, o provider
    // muda de revisão e todo consumidor re-renderiza.
    contexto.valor = { ...contextoCom(repo), revision: 1 }
    rerender(
      <StrictMode>
        <EndgameTrainer licao={licao} posicao={posicao} onVoltar={() => {}} />
      </StrictMode>,
    )
    await waitFor(() => expect(screen.getByText(/Tentativa gravada/)).toBeInTheDocument())

    expect(gravou).toHaveBeenCalledTimes(1)
    expect(await repo.listPuzzleAttempts()).toHaveLength(1)
    expect((await repo.getSkillMastery())[0].attempts).toBe(1)
  })

  it('recomeçar e resolver de novo é uma tentativa NOVA, não a primeira de novo', async () => {
    const repo = new MemoryTrainingRepository()
    contexto.valor = contextoCom(repo)

    montar()
    await jogar(LANCE_ERRADO)
    await screen.findByText(/Tentativa gravada/)

    await userEvent.click(screen.getByRole('button', { name: 'Recomeçar a posição' }))
    await jogar(LANCE_CERTO)
    await waitFor(async () => expect(await repo.listPuzzleAttempts()).toHaveLength(2))

    const registros = await repo.listPuzzleAttempts()
    expect(new Set(registros.map((r) => r.id)).size).toBe(2)
    expect(registros.map((r) => r.solved).sort()).toEqual([false, true])
    // A segunda cumpriu, mas depois de recomeçar: não é acerto de primeira.
    expect(registros.find((r) => r.solved)?.firstTry).toBe(false)
    expect((await repo.getSkillMastery())[0].attempts).toBe(2)
  })

  it('desistir grava a tentativa e manda a posição para a revisão vencida', async () => {
    const repo = new MemoryTrainingRepository()
    contexto.valor = contextoCom(repo)

    montar()
    await userEvent.click(screen.getByRole('button', { name: /Desistir/ }))
    await screen.findByText(/Tentativa gravada/)

    expect(screen.getByText(/já está vencida e aparece no treino de hoje/)).toBeInTheDocument()
    const vencidos = await repo.getDueCards(new Date())
    expect(vencidos.map((card) => card.id)).toContain(chaveDaPosicao(posicao.id))
    expect((await repo.listPuzzleAttempts())[0].solved).toBe(false)
  })

  it('não promete revisão espaçada quando a tentativa foi limpa', async () => {
    const repo = new MemoryTrainingRepository()
    contexto.valor = contextoCom(repo)

    montar()
    await jogar(LANCE_CERTO)
    await screen.findByText(/Tentativa gravada/)

    expect(screen.queryByText(/aparece no treino de hoje/)).not.toBeInTheDocument()
    expect(await repo.listReviewCards()).toHaveLength(0)
  })
})

describe('a tela não afirma mais o que deixou de ser verdade', () => {
  it('sumiu o aviso de que a tentativa não é gravada', async () => {
    contexto.valor = contextoCom(new MemoryTrainingRepository())

    montar()
    await jogar(LANCE_CERTO)
    await screen.findByText(/Tentativa gravada/)

    expect(screen.queryByText(/ainda não vira revisão espaçada/)).not.toBeInTheDocument()
    expect(screen.queryByText(/persistência de finais chegar/)).not.toBeInTheDocument()
  })
})

describe('gravar pode falhar, e o aluno fica sabendo', () => {
  it('sem armazenamento, diz que nada foi gravado e a posição continua utilizável', async () => {
    contexto.valor = contextoCom(null, 'erro')

    montar()
    await jogar(LANCE_CERTO)

    expect(await screen.findByText(/Nada foi gravado/)).toBeInTheDocument()
    // O julgamento e a linha modelo continuam lá: a falha de gravação não pode
    // custar ao aluno o resultado da tentativa.
    expect(screen.getByText(/Objetivo cumprido/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Linha modelo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recomeçar a posição' })).toBeEnabled()
  })

  it('erro de escrita vira aviso com o motivo, não silêncio', async () => {
    const repo = new MemoryTrainingRepository()
    vi.spyOn(repo, 'savePuzzleAttempt').mockRejectedValue(new Error('QuotaExceededError'))
    contexto.valor = contextoCom(repo)

    montar()
    await jogar(LANCE_CERTO)

    expect(await screen.findByText(/Não consegui gravar/)).toBeInTheDocument()
    expect(screen.getByText(/QuotaExceededError/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Linha modelo' })).toBeInTheDocument()
  })
})

/**
 * Status nunca depende só de cor — regra de acessibilidade do projeto, e das
 * que só um portão pega: numa revisão de código um `tom` sem ícone parece
 * completo.
 *
 * A varredura parte da FONTE (`ESTADOS_DA_GRAVACAO`), e morde dos dois lados:
 * estado sem apresentação reprova, e apresentação órfã também.
 */
describe('apresentação da gravação', () => {
  it('a varredura encontrou estados para checar', () => {
    expect(ESTADOS_DA_GRAVACAO.length).toBeGreaterThan(0)
  })

  it('todo estado traz tom, ícone e texto', () => {
    for (const estado of ESTADOS_DA_GRAVACAO) {
      const apresentacao = APRESENTACAO_DA_GRAVACAO[estado]
      expect(apresentacao, estado).toBeDefined()
      expect(apresentacao.tom, estado).toBeTruthy()
      expect(apresentacao.icone.trim(), estado).not.toBe('')
      expect(apresentacao.rotulo.trim(), estado).not.toBe('')
      expect(apresentacao.explicacao.trim(), estado).not.toBe('')
    }
  })

  it('não tem apresentação órfã', () => {
    expect(Object.keys(APRESENTACAO_DA_GRAVACAO).sort()).toEqual([...ESTADOS_DA_GRAVACAO].sort())
  })

  it('só o estado com card promete revisão espaçada', () => {
    const prometem = ESTADOS_DA_GRAVACAO.filter((estado) =>
      /treino de hoje/.test(APRESENTACAO_DA_GRAVACAO[estado].explicacao),
    )
    expect(prometem).toEqual(['na-revisao'])
  })
})

describe('histórico na lista de lições', () => {
  it('cala quando não há tentativa: silêncio não é o mesmo que cobrança', () => {
    expect(descreverHistorico(undefined)).toBeNull()
    expect(
      descreverHistorico({
        posicaoId: 'x',
        tentativas: 0,
        cumpriu: false,
        ultimaEm: '2026-03-01T12:00:00.000Z',
      }),
    ).toBeNull()
  })

  it('distingue resolvida de tentada, sempre com ícone e texto', () => {
    const base = { posicaoId: 'x', ultimaEm: '2026-03-01T12:00:00.000Z' }
    const resolvida = descreverHistorico({ ...base, tentativas: 1, cumpriu: true })
    const tentada = descreverHistorico({ ...base, tentativas: 3, cumpriu: false })

    expect(resolvida?.icone.trim()).not.toBe('')
    expect(resolvida?.rotulo).toMatch(/Resolvida/)
    expect(resolvida?.rotulo).toMatch(/1 tentativa\b/)

    expect(tentada?.icone.trim()).not.toBe('')
    expect(tentada?.rotulo).not.toMatch(/Resolvida/)
    expect(tentada?.rotulo).toMatch(/3 tentativas/)

    // O tom não é a informação: dois estados diferentes têm rótulos diferentes.
    expect(resolvida?.rotulo).not.toBe(tentada?.rotulo)
  })
})

describe('a gravação espera o veredito que ainda está no ar', () => {
  /**
   * O defeito que este caso existe para impedir era MUDO.
   *
   * A consulta à tablebase é assíncrona, então o julgamento do ÚLTIMO lance
   * chega DEPOIS de a tentativa terminar. A gravação disparava no fim da
   * tentativa e levava a contagem incompleta — o desconto por caminho mais
   * longo saía subcontado, sem erro, sem aviso e sem nada na tela. Apareceria
   * meses depois como "a maestria sobe mais rápido do que deveria", sem
   * ninguém ligar à causa.
   *
   * A sonda aqui é SEGURADA de propósito: é o único jeito de recriar a janela
   * em que a tentativa acabou e o veredito ainda não chegou. Com uma sonda que
   * resolve na hora, o defeito não aparece — e foi por isso que ele passou.
   */
  it('não grava enquanto a tablebase não responde, e grava depois', async () => {
    const repo = new MemoryTrainingRepository()
    const gravar = vi.spyOn(repo, 'savePuzzleAttempt')
    contexto.valor = contextoCom(repo)

    let liberar: () => void = () => {}
    const presa = new Promise<void>((resolve) => {
      liberar = resolve
    })
    const sondaPresa: Sonda = async () => {
      await presa
      return null
    }

    montar(sondaPresa)
    await jogar(LANCE_CERTO)

    // A tentativa ACABOU — a tela já mostra o desfecho — e mesmo assim nada foi
    // gravado. É esta asserção que reprova quando alguém tira a espera.
    await waitFor(() => expect(screen.getByText(/Objetivo cumprido/)).toBeInTheDocument())
    expect(gravar).not.toHaveBeenCalled()

    liberar()

    await waitFor(() => expect(gravar).toHaveBeenCalledTimes(1))
  })
})
