/**
 * Portão do repertório dentro do plano do dia.
 *
 * O que está sendo defendido aqui, em uma frase: **o planner prioriza o ramo
 * que apareceu em partida real** — o critério de aceite da issue #10 que ainda
 * não tinha dono — e prioriza a saída CERTA das duas.
 *
 * As duas metades que este arquivo morde:
 *
 * 1. DESVIO (o usuário jogou diferente do próprio repertório) vira bloco;
 * 2. LACUNA (o adversário jogou o que o repertório não cobre) NÃO vira bloco.
 *
 * A segunda é a que mais importa, e é a que um teste distraído esqueceria: sem
 * ela, uma implementação que confundisse as duas listas passaria inteira, e o
 * aluno receberia um bloco de treino de uma linha que ninguém escreveu — uma
 * pergunta sem resposta para conferir.
 *
 * As fixtures saem do CONTEÚDO REAL (`REPERTORIOS_INICIAIS`), não de uma árvore
 * de mentira. É de propósito: o desvio que o teste monta (3.Bb5 na Italiana) é
 * um lance que um aluno de 1100 joga de verdade, e se alguém reescrever o
 * repertório de brancas para não passar mais por ali, este teste reprova em vez
 * de continuar verde medindo uma posição que o produto abandonou.
 */

import { describe, expect, it } from 'vitest'

import { REPERTORIO_BRANCAS, REPERTORIO_PRETAS } from '@/content/openings/repertorio'
import {
  desviosDaArvore,
  desviosDeRepertorios,
  ladoPorExtenso,
  type DesvioDeRepertorio,
} from '@/domain/planning/aberturas'
import {
  PLANNER_CONFIG,
  buildDailyPlan,
  type PlannerConfig,
  type PlannerContext,
} from '@/domain/planning/planner'
import { construirRepertorio, frequenciaDoRepertorio } from '@/domain/repertoire'
import { createMastery } from '@/domain/skills/mastery'
import { SKILL_IDS, type DailyPlan, type Game, type SkillMastery } from '@/domain/types'

const AGORA = new Date('2026-09-09T08:00:00.000Z')
const DIA = 86_400_000

const BRANCAS = construirRepertorio(REPERTORIO_BRANCAS)
const PRETAS = construirRepertorio(REPERTORIO_PRETAS)

/**
 * O conteúdo tem de estar íntegro para o resto do arquivo significar alguma
 * coisa: um repertório com conflito produz ramo sem ideia e nó sem lance
 * prescrito, e aí os casos abaixo estariam medindo um repertório quebrado.
 */
it('o conteúdo usado por este arquivo não tem conflito', () => {
  expect(BRANCAS.conflitos).toEqual([])
  expect(PRETAS.conflitos).toEqual([])
})

function partida(id: string, pgn: string, diasAtras: number, userColor: 'w' | 'b' = 'w'): Game {
  return {
    id,
    source: 'pgn',
    playedAt: new Date(AGORA.getTime() - diasAtras * DIA).toISOString(),
    white: 'Aluno',
    black: 'Adversário',
    result: '1-0',
    userColor,
    pgn,
    importedAt: AGORA.toISOString(),
  }
}

/** O aluno (brancas) sai do próprio livro no terceiro lance: joga Bb5 em vez de Bc4. */
const DESVIO_BB5 = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *'
/** O aluno (brancas) sai do livro mais cedo ainda: 2.Bc4 em vez de 2.Nf3. */
const DESVIO_BC4_CEDO = '1. e4 e5 2. Bc4 Nf6 *'
/** O ADVERSÁRIO sai do livro: Siciliana, que o repertório de brancas não cobre. */
const LACUNA_SICILIANA = '1. e4 c5 2. Nf3 d6 *'
/** Partida inteira dentro do livro. */
const NO_LIVRO = '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d3 Nf6 5. O-O *'

describe('desvio e lacuna são coisas diferentes, e só uma vira treino', () => {
  it('o lance do USUÁRIO fora do repertório vira desvio, com o lance prescrito junto', () => {
    const desvios = desviosDeRepertorios([BRANCAS, PRETAS], [partida('g1', DESVIO_BB5, 1)])

    expect(desvios).toHaveLength(1)
    expect(desvios[0].repertorioId).toBe(BRANCAS.id)
    expect(desvios[0].sanJogado).toBe('Bb5')
    // A prescrição vem junto porque a tela de aberturas precisa dela. Quem NÃO
    // pode falar dela é o texto do plano — ver o caso "não entrega a resposta".
    expect(desvios[0].sanPrescrito).toBe('Bc4')
    expect(desvios[0].partidas).toBe(1)
    expect(desvios[0].gameIds).toEqual(['g1'])
    expect(desvios[0].fen).toContain('w ')
  })

  it('o lance do ADVERSÁRIO fora do repertório NÃO vira desvio', () => {
    // A Siciliana está fora do repertório de brancas de propósito (o conteúdo
    // documenta a decisão). Ela é LACUNA: conteúdo a escrever, não treino.
    const frequencia = frequenciaDoRepertorio(BRANCAS, [partida('g1', LACUNA_SICILIANA, 1)])
    expect(frequencia.lacunas.length).toBeGreaterThan(0)

    expect(desviosDeRepertorios([BRANCAS, PRETAS], [partida('g1', LACUNA_SICILIANA, 1)])).toEqual(
      [],
    )
  })

  it('partida inteira dentro do livro não produz desvio nenhum', () => {
    expect(desviosDeRepertorios([BRANCAS, PRETAS], [partida('g1', NO_LIVRO, 1)])).toEqual([])
  })

  it('partida do outro lado não conta para este repertório', () => {
    // O mesmo PGN, jogado com as PRETAS: os lances brancos não são do aluno, e
    // portanto não são desvio dele.
    const comoPretas = desviosDeRepertorios([BRANCAS], [partida('g1', DESVIO_BB5, 1, 'b')])
    expect(comoPretas).toEqual([])
  })
})

describe('ordem: o ramo mais frequente primeiro, e o empate desce para o mais recente', () => {
  it('mais partidas vem antes', () => {
    const desvios = desviosDeRepertorios(
      [BRANCAS],
      [
        partida('a1', DESVIO_BC4_CEDO, 5),
        partida('b1', DESVIO_BB5, 4),
        partida('b2', DESVIO_BB5, 3),
      ],
    )
    expect(desvios.map((d) => d.sanJogado)).toEqual(['Bb5', 'Bc4'])
    expect(desvios[0].partidas).toBe(2)
  })

  it('empate em partidas é resolvido pela data da MAIS RECENTE', () => {
    const desvios = desviosDeRepertorios(
      [BRANCAS],
      [partida('a1', DESVIO_BC4_CEDO, 1), partida('b1', DESVIO_BB5, 9)],
    )
    expect(desvios.map((d) => d.partidas)).toEqual([1, 1])
    expect(desvios[0].sanJogado).toBe('Bc4')
    expect(desvios[0].ultimaEm).toBe(new Date(AGORA.getTime() - 1 * DIA).toISOString())
  })
})

describe('cruzar repertório errado é erro de programação, e grita', () => {
  it('lança quando a frequência é de outra árvore', () => {
    const frequenciaDasPretas = frequenciaDoRepertorio(PRETAS, [])
    expect(() => desviosDaArvore(BRANCAS, frequenciaDasPretas)).toThrow(/repert/i)
  })
})

// --------------------------------------------------------------- no planner

function perfil(dailyBudgetMinutes: 20 | 40 | 60 = 40) {
  return {
    id: 'usuario-teste',
    createdAt: '2026-08-01T00:00:00.000Z',
    estimatedRating: 1100,
    dailyBudgetMinutes,
    preferences: { boardTheme: 'claro' as const, reducedMotion: false },
  }
}

/** Todas as habilidades igualmente dominadas: o que varia é só o desvio. */
function masteryUniforme(valor = 0.6): SkillMastery[] {
  return SKILL_IDS.map((skillId) => ({
    ...createMastery(skillId),
    attempts: 40,
    exposures: 40,
    recentAccuracy: valor,
    retentionAccuracy: valor,
    mastery: valor,
    confidence: 0.8,
  }))
}

function contexto(desviosDeRepertorio: readonly DesvioDeRepertorio[]): PlannerContext {
  return {
    profile: perfil(),
    mastery: masteryUniforme(),
    dueCards: [],
    recentGameErrors: [],
    desviosDeRepertorio,
    now: AGORA,
  }
}

const DESVIOS = desviosDeRepertorios([BRANCAS, PRETAS], [partida('g1', DESVIO_BB5, 1)])

/** O texto inteiro do plano, que é onde o aluno lê. */
function textoDoPlano(plano: DailyPlan): string {
  return plano.blocks.map((b) => `${b.title} ${b.rationale}`).join(' | ')
}

function blocoDeDesvio(plano: DailyPlan) {
  const marca = `seu repertório de ${ladoPorExtenso('w')}`
  return plano.blocks.find((b) => b.kind === 'abertura' && b.title.includes(marca))
}

describe('o desvio chega ao plano do dia', () => {
  it('vira um bloco de abertura que diz o que o aluno jogou', () => {
    const plano = buildDailyPlan(contexto(DESVIOS), 'seed-fixa')
    const bloco = blocoDeDesvio(plano)

    expect(bloco).toBeDefined()
    expect(bloco?.rationale).toContain('Bb5')
    expect(bloco?.skillIds.length).toBeGreaterThan(0)
    // As habilidades do bloco são as que o repertório declara treinar, e não
    // uma escolha própria do planner.
    expect(bloco?.skillIds).toEqual([...BRANCAS.habilidades])
  })

  it('CONTROLE: sem desvio, esse bloco não existe', () => {
    // A metade que impede o caso acima de ser carimbo: o rodízio do currículo
    // também produz bloco de abertura, e sem este controle qualquer bloco de
    // abertura passaria por "o repertório chegou ao plano".
    const plano = buildDailyPlan(contexto([]), 'seed-fixa')
    expect(blocoDeDesvio(plano)).toBeUndefined()
    expect(textoDoPlano(plano)).not.toContain('Bb5')
  })

  it('NÃO entrega o lance do repertório: o card ainda vai perguntar isso', () => {
    // Regra 5 do CLAUDE.md, recuperação antes de explicação. A mesma posição
    // vira card de repertório ("qual é o seu lance aqui?"); um plano que
    // dissesse "seu repertório pede Bc4" responderia o card antes da pergunta.
    const plano = buildDailyPlan(contexto(DESVIOS), 'seed-fixa')
    expect(DESVIOS[0].sanPrescrito).toBe('Bc4')
    expect(textoDoPlano(plano)).not.toContain('Bc4')
  })

  it('o desvio ocupa a vaga da ÁREA, não só as habilidades que ele nomeia', () => {
    // O desvio estreito é o caso que morde: um repertório pode declarar UMA
    // habilidade, e sobrariam outras de abertura livres para o planner abrir um
    // segundo bloco da mesma área — desta vez por estimativa de maestria, com
    // evidência pior que a partida real que acabou de acontecer.
    //
    // A maestria de abertura vai a zero e o orçamento ao máximo de propósito:
    // é o cenário em que o bloco de fraqueza de abertura VENCERIA a disputa.
    // Sem isso o caso passaria por falta de vaga, medindo o orçamento em vez
    // da regra.
    const estreito: DesvioDeRepertorio = { ...DESVIOS[0], habilidades: ['opening.development'] }
    const plano = buildDailyPlan(
      {
        ...contexto([estreito]),
        profile: perfil(60),
        mastery: masteryUniforme(0.95).map((item) =>
          item.skillId.startsWith('opening.')
            ? { ...item, mastery: 0, recentAccuracy: 0, retentionAccuracy: 0 }
            : item,
        ),
      },
      'seed-fixa',
    )

    expect(blocoDeDesvio(plano)).toBeDefined()
    expect(plano.blocks.filter((b) => b.kind === 'abertura')).toHaveLength(1)
  })

  it('respeita o mínimo de partidas, e o mínimo é a REGRA e não o número de hoje', () => {
    // Afirma a regra girando a config, em vez de cravar o valor atual: se o
    // produto decidir esperar a repetição, o comportamento continua descrito.
    //
    // A conversão explícita é necessária porque `PLANNER_CONFIG` é `as const`:
    // o tipo do parâmetro exige o literal de hoje, e uma variante — que é
    // justamente o que este caso precisa — não é atribuível a ele.
    const comMinimo = (minPartidasDeDesvio: number): PlannerConfig =>
      ({ ...PLANNER_CONFIG, minPartidasDeDesvio }) as PlannerConfig

    const exigente = comMinimo(DESVIOS[0].partidas + 1)
    expect(blocoDeDesvio(buildDailyPlan(contexto(DESVIOS), 'seed-fixa', exigente))).toBeUndefined()

    const frouxo = comMinimo(DESVIOS[0].partidas)
    expect(blocoDeDesvio(buildDailyPlan(contexto(DESVIOS), 'seed-fixa', frouxo))).toBeDefined()
  })

  it('não estoura o orçamento nem some com o determinismo', () => {
    for (const orcamento of [20, 40, 60] as const) {
      const plano = buildDailyPlan(
        { ...contexto(DESVIOS), profile: perfil(orcamento) },
        'seed-fixa',
      )
      const soma = plano.blocks.reduce((total, b) => total + b.estimatedMinutes, 0)
      expect(soma).toBeLessThanOrEqual(orcamento)
      expect(soma).toBe(plano.totalMinutes)
      expect(JSON.stringify(plano)).toBe(
        JSON.stringify(
          buildDailyPlan({ ...contexto(DESVIOS), profile: perfil(orcamento) }, 'seed-fixa'),
        ),
      )
    }
  })

  it('lacuna sozinha não produz bloco nenhum de repertório', () => {
    // O caminho completo, da partida ao plano: só lacuna entra, e o plano sai
    // sem bloco de desvio. É a DECISÃO 1 de `aberturas.ts` vista de fora.
    const soLacuna = desviosDeRepertorios([BRANCAS, PRETAS], [partida('g1', LACUNA_SICILIANA, 1)])
    expect(soLacuna).toEqual([])
    expect(blocoDeDesvio(buildDailyPlan(contexto(soLacuna), 'seed-fixa'))).toBeUndefined()
  })
})
