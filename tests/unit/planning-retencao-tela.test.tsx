/**
 * Portão da COSTURA da verificação de retenção no "Treino de hoje".
 *
 * Este arquivo existe por causa de um modo de falha que já aconteceu neste
 * projeto: uma regra ficar escrita, testada e verde, e NÃO SER CHAMADA por
 * ninguém. `prioridadesDeHabilidade` viveu assim entre dois PRs. Código que
 * ninguém executa não dá erro, não aparece na tela e passa em toda suíte — o
 * produto simplesmente não faz o que o repositório diz que faz.
 *
 * A retenção é a peça que fecha a promessa do produto: o erro virou treino, e
 * depois se pergunta se a habilidade VOLTOU A FALHAR. Se `DailyPlanView` parar
 * de aplicá-la, nada mais no repositório acusa — os testes de domínio da
 * retenção continuam todos verdes.
 *
 * COMO ESTE TESTE OBSERVA A DIFERENÇA: dois cenários idênticos, mudando UMA
 * coisa — se a habilidade treinada reincidiu ou não depois do treino. O plano
 * do dia escolhe habilidade por prioridade, então a reincidência tem de mudar
 * QUAL habilidade aparece no bloco de tática. É afirmação sobre comportamento
 * observável, não sobre a implementação ter chamado tal função.
 *
 * O CONTROLE é a metade que importa: sem o cenário que NÃO reincide, o teste
 * aprovaria uma tela que sempre escolhe a mesma habilidade.
 */

import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RETENCAO_CONFIG } from '@/domain/planning/retencao'
import { getSkill, SKILL_CATALOG } from '@/domain/skills/catalog'
import { SKILL_IDS } from '@/domain/types'
import type {
  Game,
  PositionAnalysis,
  ReviewCard,
  SkillId,
  SkillMastery,
  UserProfile,
} from '@/domain/types'
import { MemoryTrainingRepository } from '@/lib/storage/memory-repository'

const contexto = vi.hoisted(() => ({ valor: null as unknown }))

vi.mock('@/components/providers/RepositoryProvider', () => ({
  useRepository: () => contexto.valor,
}))

const { DailyPlanView } = await import('@/components/training/DailyPlanView')
const { ProgressView } = await import('@/components/training/ProgressView')

/**
 * Três habilidades da mesma área, com papéis distintos:
 *
 * - TREINADA e RIVAL disputam a vaga do bloco de tática, separadas por uma
 *   margem mínima de maestria. Quem vence é a observação deste teste.
 * - CULPADA é de quem são as falhas nas partidas. Ela existe para que o bloco
 *   "Seu erro" seja IDÊNTICO nos dois cenários.
 *
 * Essa separação não é preciosismo. Na primeira versão a habilidade treinada
 * era a mesma que falhava, e o resultado saiu invertido: o planner já a tinha
 * posto no bloco "Seu erro" e por isso ela não disputava o bloco de tática. O
 * teste mediria o bloco de erro achando que mede a retenção.
 *
 * TREINADA e RIVAL saem do CATÁLOGO, e o critério é EMPATE EM VALOR
 * PEDAGÓGICO. O planner ordena por `(1 - mastery) * valor`, então duas
 * habilidades com valores diferentes podem não trocar de posição por mais que
 * a maestria ande — foi o que aconteceu na segunda versão deste teste, com
 * garfo (5) contra cravada (4). Escolher a dedo travaria o teste no catálogo de
 * hoje; derivar mantém a propriedade que importa.
 */
function duasComMesmoValor(): [SkillId, SkillId] {
  const taticas = SKILL_CATALOG.filter((s) => s.area === 'tactics')
  for (const a of taticas) {
    const par = taticas.find((b) => b.id !== a.id && b.pedagogicalValue === a.pedagogicalValue)
    if (par) return [a.id, par.id]
  }
  throw new Error(
    'Nenhum par de habilidades táticas empata em valor pedagógico: este teste precisa ser reescrito.',
  )
}

const [TREINADA, RIVAL] = duasComMesmoValor()

/** A culpada não pode ser nenhuma das duas em disputa. */
const CULPADA: SkillId = SKILL_CATALOG.filter(
  (s) => s.area === 'tactics' && s.id !== TREINADA && s.id !== RIVAL,
)[0].id

const DIA = 24 * 60 * 60 * 1000

/**
 * O relógio é o REAL, de propósito. `DailyPlanView` chama `new Date()` por
 * dentro e `waitFor` depende de temporizador de verdade; fixar o relógio aqui
 * trava o teste em vez de estabilizá-lo. As datas da fixture são todas
 * RELATIVAS a este instante, então o teste não envelhece.
 */
const AGORA = new Date()
const TREINADA_EM = new Date(AGORA.getTime() - 6 * DIA)

function maestria(skillId: SkillId, valor: number): SkillMastery {
  return {
    skillId,
    exposures: 20,
    attempts: 20,
    firstTryCorrect: 10,
    recentAccuracy: valor,
    retentionAccuracy: valor,
    hintedAttempts: 0,
    medianThinkTimeMs: 20_000,
    realGameOccurrences: 0,
    realGameErrors: 0,
    mastery: valor,
    confidence: 0.8,
    lastSeenAt: null,
  }
}

function cardDeTreino(skillId: SkillId): ReviewCard {
  return {
    id: `card-${skillId}`,
    kind: 'erro-de-partida',
    skillIds: [skillId],
    fen: '4k3/8/8/8/8/8/8/4K2R w K - 0 1',
    solutionUci: ['h1h8'],
    prompt: 'Ache o lance.',
    createdAt: TREINADA_EM.toISOString(),
    // Vencido no futuro: não queremos que ele entre no bloco de revisões e
    // roube o espaço do bloco de tática que estamos observando.
    dueAt: new Date(AGORA.getTime() + 30 * DIA).toISOString(),
    scheduler: {
      stability: 5,
      difficulty: 5,
      elapsedDays: 0,
      scheduledDays: 30,
      reps: 1,
      lapses: 0,
      state: 'review',
      lastReviewAt: null,
    },
  }
}

function partida(id: string, diasAtras: number): Game {
  return {
    id,
    source: 'pgn',
    playedAt: new Date(AGORA.getTime() - diasAtras * DIA).toISOString(),
    white: 'Alice',
    black: 'Bruno',
    result: '1-0',
    userColor: 'w',
    pgn: '1. e4 e5 *',
    importedAt: AGORA.toISOString(),
  }
}

function analise(gameId: string, skillIds: SkillId[]): PositionAnalysis {
  return {
    gameId,
    ply: 10,
    fenBefore: '4k3/8/8/8/8/8/8/4K2R w K - 0 1',
    userMoveUci: 'e1e2',
    bestMoveUci: 'h1h8',
    pv: ['h1h8'],
    scoreCp: -300,
    mateIn: null,
    expectedScoreLossPp: 30,
    // O pior degrau da escala, para o erro contar como erro de verdade.
    severity: 'erro-grave',
    skillIds,
    explanationCode: 'hanging-piece',
    precisao: 'aprofundada',
  }
}

const perfil: UserProfile = {
  id: 'perfil-de-teste',
  createdAt: AGORA.toISOString(),
  estimatedRating: 1100,
  dailyBudgetMinutes: 20,
  preferences: { boardTheme: 'claro', reducedMotion: false },
}

/**
 * Monta o repositório dos dois cenários. A ÚNICA diferença é a existência do
 * card de treino da habilidade observada.
 */
async function montarRepo(treinada: boolean): Promise<MemoryTrainingRepository> {
  const repo = new MemoryTrainingRepository()
  await repo.saveProfile(perfil)
  // TODAS as habilidades recebem registro, e as outras nascem quase dominadas.
  // Sem isso o planner escolhe uma habilidade que nunca foi vista (maestria 0,
  // portanto prioridade máxima) e a comparação que este teste quer fazer nunca
  // acontece — foi exatamente o que ocorreu na primeira versão.
  await repo.saveSkillMastery(
    SKILL_IDS.map((id) => {
      // Margem mínima de propósito: qualquer movimento da retenção inverte a
      // escolha. Margem grande esconderia uma realimentação fraca demais para
      // ter efeito, que é uma forma de o recurso existir sem funcionar.
      if (id === TREINADA) return maestria(id, 0.5)
      if (id === RIVAL) return maestria(id, 0.51)
      return maestria(id, 0.95)
    }),
  )
  // A ÚNICA diferença entre os cenários: existe ou não um card marcando que
  // esta habilidade virou treino. Sem card não há janela, e sem janela não há
  // veredito de retenção nenhum.
  if (treinada) await repo.saveReviewCard(cardDeTreino(TREINADA))

  // Partidas suficientes para o lado POSITIVO poder ser afirmado. O número sai
  // da config do domínio, não cravado aqui: se o limiar subir, o teste
  // acompanha em vez de reprovar o código certo.
  const quantas = Math.max(RETENCAO_CONFIG.minPartidasParaAfirmarMelhora, 2)
  for (let i = 0; i < quantas; i += 1) {
    const jogo = partida(`depois-${i}`, 1 + i)
    await repo.saveGame(jogo)
    // A falha é sempre da MESMA habilidade nos dois cenários, e não é nenhuma
    // das duas que disputam a vaga. Assim `recentGameErrors` é idêntico dos
    // dois lados e não pode ser a causa da diferença observada.
    await repo.savePositionAnalyses([analise(jogo.id, [CULPADA])])
  }
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

/** Títulos dos blocos, que é onde o rótulo da habilidade escolhida aparece. */
function titulos(): string[] {
  return screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent ?? '')
}

describe('a verificação de retenção chega ao plano do dia', () => {
  it('CONTROLE: sem treino registrado, a habilidade mais fraca é a escolhida', async () => {
    // Esta é a metade que impede o teste seguinte de ser carimbo: sem ela, uma
    // tela que ignora a retenção e escolhe sempre a mesma habilidade passaria.
    await renderizarCom(await montarRepo(false))
    const texto = titulos().join(' | ')
    expect(texto).toContain(getSkill(TREINADA).label)
    expect(texto).not.toContain(getSkill(RIVAL).label)
  })

  it('treinada e sem reincidir, ela cede a vaga para a habilidade rival', async () => {
    // O ciclo fecha aqui: a habilidade foi treinada e NÃO voltou a falhar nas
    // partidas analisadas depois, então ela desce na fila e outra sobe. Se
    // `DailyPlanView` parar de aplicar a retenção, este caso vira igual ao
    // controle — e nenhum teste de domínio acusaria.
    await renderizarCom(await montarRepo(true))
    const texto = titulos().join(' | ')
    expect(texto).toContain(getSkill(RIVAL).label)
    expect(texto).not.toContain(getSkill(TREINADA).label)
  })
})

describe('o veredito de retenção chega à tela de progresso', () => {
  /**
   * O segundo lugar onde a retenção pode virar código morto. O plano do dia usa
   * o veredito para ORDENAR; a tela de progresso é onde o aluno LÊ o que
   * aconteceu. Se ela parar de mostrar, o cálculo continua certo e o aluno
   * nunca fica sabendo se o treino funcionou — que é a metade da promessa do
   * produto que esta issue existe para entregar.
   */
  async function renderizarProgresso(repo: MemoryTrainingRepository): Promise<void> {
    contexto.valor = { status: 'pronto', repo, profile: perfil, erro: null, revision: 0 }
    render(<ProgressView />)
    await waitFor(() => expect(screen.queryByText('Abrindo seus dados locais…')).toBeNull())
  }

  it('mostra o veredito com a ressalva, e não como domínio do padrão', async () => {
    await renderizarProgresso(await montarRepo(true))

    const secao = await screen.findByRole('region', { name: 'Depois do treino' })
    expect(secao).toBeInTheDocument()
    expect(secao.textContent ?? '').toContain(getSkill(TREINADA).label)
    // A ressalva é o ponto: sem ela o aluno lê "não reincidiu" como "dominei".
    expect(secao.textContent ?? '').toContain('não quer dizer')
  })

  it('CONTROLE: sem treino registrado, a seção não aparece', async () => {
    // Sem esta metade, uma tela que mostrasse a seção sempre — inclusive vazia,
    // ou com habilidade que nunca virou treino — passaria no teste acima.
    await renderizarProgresso(await montarRepo(false))
    expect(screen.queryByRole('region', { name: 'Depois do treino' })).toBeNull()
  })
})
