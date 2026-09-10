/**
 * Portão da COSTURA: o repertório chega ao "Treino de hoje" de verdade.
 *
 * Este arquivo existe pelo modo de falha que já aconteceu duas vezes nesta base:
 * uma regra escrita, testada e VERDE que ninguém executa.
 * `prioridadesDeHabilidade` viveu assim entre dois PRs. Todo o domínio deste
 * trabalho — `cardsDeRepertorio`, `frequenciaDoRepertorio`, `desviosDeRepertorios`
 * — pode continuar passando nos testes de domínio com a tela sem chamar nada
 * disso, e o produto simplesmente não faria o que o repositório diz que faz.
 *
 * São DUAS costuras distintas, e cada uma tem o seu controle:
 *
 * 1. SEMEADURA — os nós de estudo do repertório viram card GRAVADO, e por isso
 *    entram na fila de revisão como qualquer outro card. O controle é o
 *    repositório vazio: sem a chamada de semeadura não existe card vencido
 *    nenhum, e o bloco de revisão some do plano.
 * 2. DESVIO — a partida real em que o aluno saiu do próprio repertório vira
 *    bloco de abertura. O controle é a partida que fica DENTRO do livro: mesmo
 *    repertório, mesma tela, mesmo aluno, e o bloco não aparece.
 *
 * POR QUE A ASSERÇÃO É SOBRE O QUE A TELA MOSTRA, e não sobre "a função foi
 * chamada": espionar a chamada aprovaria uma tela que chama e joga o resultado
 * fora. O que se afirma aqui é comportamento observável pelo aluno.
 *
 * O RELÓGIO É O REAL, de propósito, como em `planning-retencao-tela.test.tsx`:
 * `DailyPlanView` chama `new Date()` por dentro e `waitFor` depende de
 * temporizador de verdade. As datas da fixture são RELATIVAS a este instante,
 * então o teste não envelhece.
 */

import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ladoPorExtenso } from '@/domain/planning/aberturas'
import { cardsDeRepertorio } from '@/domain/repertoire'
import { createMastery } from '@/domain/skills/mastery'
import { SKILL_IDS, type Game, type SkillMastery, type UserProfile } from '@/domain/types'
import { MemoryTrainingRepository } from '@/lib/storage/memory-repository'
import { repertoriosDoAluno } from '@/lib/training/repertorio-no-treino'

const contexto = vi.hoisted(() => ({ valor: null as unknown }))

vi.mock('@/components/providers/RepositoryProvider', () => ({
  useRepository: () => contexto.valor,
}))

const { DailyPlanView } = await import('@/components/training/DailyPlanView')

const DIA = 86_400_000
const AGORA = new Date()

/** O aluno de brancas sai do próprio livro: 3.Bb5 onde o repertório pede outro lance. */
const DESVIO_BB5 = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *'
/** A mesma abertura, jogada dentro do livro do começo ao fim. */
const NO_LIVRO = '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d3 Nf6 5. O-O *'

const perfil: UserProfile = {
  id: 'perfil-de-teste',
  createdAt: AGORA.toISOString(),
  estimatedRating: 1100,
  dailyBudgetMinutes: 20,
  preferences: { boardTheme: 'claro', reducedMotion: false },
}

function partida(id: string, pgn: string): Game {
  return {
    id,
    source: 'pgn',
    playedAt: new Date(AGORA.getTime() - 2 * DIA).toISOString(),
    white: 'Aluno',
    black: 'Adversário',
    result: '1-0',
    userColor: 'w',
    pgn,
    importedAt: AGORA.toISOString(),
  }
}

/** Habilidades todas iguais: o que este arquivo varia é a partida, não a maestria. */
function masteryUniforme(): SkillMastery[] {
  return SKILL_IDS.map((skillId) => ({
    ...createMastery(skillId),
    attempts: 40,
    exposures: 40,
    recentAccuracy: 0.6,
    retentionAccuracy: 0.6,
    mastery: 0.6,
    confidence: 0.8,
  }))
}

async function montarRepo(pgn?: string): Promise<MemoryTrainingRepository> {
  const repo = new MemoryTrainingRepository()
  await repo.saveProfile(perfil)
  await repo.saveSkillMastery(masteryUniforme())
  if (pgn) await repo.saveGame(partida('partida-1', pgn))
  return repo
}

async function renderizarCom(repo: MemoryTrainingRepository): Promise<void> {
  contexto.valor = {
    status: 'pronto',
    repo,
    profile: perfil,
    erro: null,
    saveProfile: vi.fn(),
    revision: 0,
  }
  render(<DailyPlanView />)
  await waitFor(() => expect(screen.queryByText('Montando seu treino…')).toBeNull())
}

/** Cada bloco do plano como "título + justificativa". É o que o aluno lê. */
function blocos(): string[] {
  return screen.getAllByRole('listitem').map((item) => item.textContent ?? '')
}

/**
 * Quantos cards o CONTEÚDO manda existir. Derivado, nunca cravado: se alguém
 * acrescentar uma linha ao repertório, o número acompanha em vez de reprovar o
 * código certo.
 */
function cardsEsperados(): number {
  return repertoriosDoAluno().arvores.reduce(
    (soma, arvore) => soma + cardsDeRepertorio(arvore, AGORA).length,
    0,
  )
}

describe('os cards do repertório entram na fila de revisão como qualquer outro', () => {
  it('a tela grava os cards de estudo, e eles chegam vencidos ao bloco de revisão', async () => {
    const repo = await montarRepo()
    await renderizarCom(repo)

    const guardados = await repo.listReviewCards()
    const doRepertorio = guardados.filter((card) => card.kind === 'repertorio')
    expect(doRepertorio.length).toBe(cardsEsperados())
    expect(doRepertorio.length).toBeGreaterThan(0)

    // Gravados, e não derivados só para a tela: a fila de revisão lê
    // `getDueCards` do repositório por conta própria. Se estes cards vivessem
    // apenas na memória do plano, o plano prometeria revisões que a fila não
    // teria — duas fontes para a mesma verdade.
    const vencidos = await repo.getDueCards(new Date())
    expect(vencidos.filter((card) => card.kind === 'repertorio').length).toBe(cardsEsperados())

    const revisao = blocos().find((texto) => texto.includes('revisões vencidas'))
    expect(revisao).toBeDefined()
    // Borda de DÍGITO, e não `\b`: o texto do bloco vem colado ("…5 itens17
    // revisões…"), então `\b` não casaria; e um `toContain` de número curto
    // aprovaria 170 quando o certo é 17.
    expect(revisao).toMatch(new RegExp(`(?<!\\d)${cardsEsperados()}(?!\\d) revis`))
  })

  it('CONTROLE: sem a semeadura não há revisão nenhuma para mostrar', async () => {
    // Esta é a metade que morde: um repositório recém-aberto não tem card
    // nenhum. Se `DailyPlanView` parar de semear, o bloco de revisão desaparece
    // do plano — e nenhum teste de domínio acusaria, porque
    // `cardsDeRepertorio` continuaria devolvendo os cards certos para ninguém.
    const repo = await montarRepo()
    expect(await repo.listReviewCards()).toEqual([])
    expect(await repo.getDueCards(new Date())).toEqual([])
  })

  it('semear de novo não sobrescreve o agendamento de quem já revisou', async () => {
    const repo = await montarRepo()
    await renderizarCom(repo)
    const primeiro = await repo.listReviewCards()

    // Simula um card JÁ RESPONDIDO: agendado para daqui a um mês, com uma
    // repetição no histórico. É este estado que uma segunda safra de cards
    // "novos em folha" apagaria — e o aluno responderia tudo de novo, sem erro
    // nenhum aparecendo em lugar algum.
    const alvo = primeiro.find((card) => card.kind === 'repertorio')
    expect(alvo).toBeDefined()
    const revisado = {
      ...alvo!,
      dueAt: new Date(AGORA.getTime() + 30 * DIA).toISOString(),
      scheduler: { ...alvo!.scheduler, reps: 3, state: 'review' as const },
    }
    await repo.saveReviewCard(revisado)

    await renderizarCom(repo)
    const segundo = await repo.listReviewCards()

    expect(segundo.map((c) => c.id).sort()).toEqual(primeiro.map((c) => c.id).sort())
    const depois = segundo.find((card) => card.id === revisado.id)
    expect(depois?.dueAt).toBe(revisado.dueAt)
    expect(depois?.scheduler.reps).toBe(3)
  })
})

describe('o ramo que apareceu em partida real chega ao plano do dia', () => {
  const marca = `seu repertório de ${ladoPorExtenso('w')}`

  it('sair do próprio repertório numa partida vira bloco de abertura', async () => {
    await renderizarCom(await montarRepo(DESVIO_BB5))

    const bloco = blocos().find((texto) => texto.includes(marca))
    expect(bloco).toBeDefined()
    expect(bloco).toContain('Bb5')
    // O lance prescrito continua fora da tela: o card ainda vai perguntá-lo.
    expect(blocos().join(' | ')).not.toContain('Bc4')
  })

  it('CONTROLE: partida dentro do livro não produz esse bloco', async () => {
    // Sem esta metade, uma tela que mostrasse o bloco sempre — ou que o
    // montasse a partir do conteúdo, sem olhar partida nenhuma — passaria no
    // caso acima.
    await renderizarCom(await montarRepo(NO_LIVRO))

    expect(blocos().find((texto) => texto.includes(marca))).toBeUndefined()
    expect(blocos().join(' | ')).not.toContain('Bb5')
  })

  it('CONTROLE: sem partida importada não há desvio a mostrar', async () => {
    await renderizarCom(await montarRepo())
    expect(blocos().find((texto) => texto.includes(marca))).toBeUndefined()
  })
})
