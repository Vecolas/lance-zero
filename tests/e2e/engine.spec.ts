/**
 * Contrato da engine REAL, num navegador de verdade.
 *
 * Os testes unitários da camada de engine usam um worker falso, porque jsdom não
 * tem `Worker`. Eles provam o protocolo; não provam que o Stockfish carrega,
 * responde e obedece. Este arquivo é a outra metade: sobe a rota interna
 * `/debug/engine`, que baixa ~7 MB de WASM sob demanda, e verifica mate em 1,
 * MultiPV, descarte de análise obsoleta, reinício do worker e responsividade da
 * thread principal.
 *
 * Regra de asserção: nada de centipeão exato. Números de engine mudam entre
 * versões e entre máquinas. Asserta-se ORDENAÇÃO, PROPRIEDADE e FAIXA. Mate é a
 * exceção legítima: mate em 1 é mate em 1 em qualquer engine.
 */

import { expect, test, type Locator, type Page } from '@playwright/test'

/** Mate do pastor: 1.Qxf7# na notação UCI é `f3f7`. */
const FEN_MATE_EM_1 = 'rnbqkbnr/pppp1ppp/8/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1'
const FEN_INICIAL = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

/** Orçamento pequeno: resposta rápida, suficiente para achar o que interessa. */
const NOS_RAPIDO = '250000'
/**
 * Orçamento grande de propósito: a busca precisa continuar rodando enquanto o
 * teste troca a posição ou clica em outro botão. Fica abaixo do timeout de
 * análise do provider (30 s) para não disparar reinício por engano.
 */
const NOS_LONGO = '9000000'

/** Baixar e instanciar o WASM leva alguns segundos em máquina fria. */
const ESPERA_ENGINE = 120_000

test.describe.configure({ mode: 'serial' })
test.setTimeout(180_000)

async function abrirBancada(page: Page): Promise<void> {
  await page.goto('/debug/engine')
  await expect(page.getByRole('heading', { name: 'Bancada da engine' })).toBeVisible()
  // A engine é sob demanda: antes do primeiro clique nada foi carregado.
  await expect(page.getByTestId('engine-status')).toContainText('Ociosa')
  await expect(page.getByTestId('engine-vazio')).toBeVisible()
}

async function configurar(
  page: Page,
  { fen, nos, linhas }: { fen: string; nos: string; linhas?: string },
): Promise<void> {
  await page.getByLabel('FEN', { exact: true }).fill(fen)
  await page.getByLabel('Orçamento de nós').fill(nos)
  if (linhas !== undefined) await page.getByLabel('Linhas (MultiPV)').fill(linhas)
}

function botao(page: Page, nome: string): Locator {
  return page.getByRole('button', { name: nome, exact: true })
}

/**
 * Clica em Analisar e espera a engine estar de pé.
 *
 * Existe para falhar cedo e com mensagem útil: sem isto, uma engine que não sobe
 * vira "elemento não encontrado" depois de dois minutos, sem dizer por quê.
 */
async function analisar(page: Page): Promise<void> {
  await botao(page, 'Analisar').click()
  await expect(page.getByTestId('engine-status')).toContainText(/Pronta|Erro/, {
    timeout: ESPERA_ENGINE,
  })
  await expect(page.getByTestId('engine-erro')).toHaveCount(0)
}

/** Lê os atributos de dados de cada linha de MultiPV, na ordem em que aparecem. */
async function lerLinhas(page: Page): Promise<
  {
    multiPv: number
    scoreCp: number | null
    mateIn: number | null
    primeiroLance: string
    scoreBrancas: number | null
    wdlBrancas: string
  }[]
> {
  return page.getByTestId('engine-linha').evaluateAll((nodes) =>
    nodes.map((node) => {
      const el = node as HTMLElement
      const cp = el.dataset.scoreCp ?? ''
      const mate = el.dataset.mate ?? ''
      return {
        multiPv: Number(el.dataset.multipv ?? '0'),
        scoreCp: cp === '' ? null : Number(cp),
        mateIn: mate === '' ? null : Number(mate),
        primeiroLance: el.dataset.melhorLance ?? '',
        scoreBrancas:
          (el.dataset.scoreBrancas ?? '') === '' ? null : Number(el.dataset.scoreBrancas),
        wdlBrancas: el.dataset.wdlBrancas ?? '',
      }
    }),
  )
}

test('a engine só é baixada quando alguém pede análise', async ({ page }) => {
  const pedidosDaEngine: string[] = []
  page.on('request', (req) => {
    if (req.url().includes('/engine/stockfish/')) pedidosDaEngine.push(req.url())
  })

  // A landing não pode encostar nos 7 MB de WASM.
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  expect(pedidosDaEngine).toEqual([])

  // Abrir a bancada também não: o carregamento é sob demanda.
  await abrirBancada(page)
  expect(pedidosDaEngine).toEqual([])

  await configurar(page, { fen: FEN_MATE_EM_1, nos: NOS_RAPIDO, linhas: '1' })
  await analisar(page)
  await expect(page.getByTestId('engine-melhor-lance')).toHaveText('f3f7', {
    timeout: ESPERA_ENGINE,
  })

  expect(pedidosDaEngine.some((url) => url.endsWith('.js'))).toBe(true)
  expect(pedidosDaEngine.some((url) => url.endsWith('.wasm'))).toBe(true)
})

test('acha o mate em 1 e reporta score de mate, não de centipeões', async ({ page }) => {
  await abrirBancada(page)
  await configurar(page, { fen: FEN_MATE_EM_1, nos: NOS_RAPIDO, linhas: '1' })

  await analisar(page)

  await expect(page.getByTestId('engine-melhor-lance')).toHaveText('f3f7', {
    timeout: ESPERA_ENGINE,
  })
  await expect(page.getByTestId('engine-fen-analisada')).toHaveText(FEN_MATE_EM_1)
  await expect(page.getByTestId('engine-avaliacao').first()).toHaveText('Mate em 1')

  const linhas = await lerLinhas(page)
  expect(linhas).toHaveLength(1)
  expect(linhas[0].mateIn).toBe(1)
  // Mate não é centipeão: a linha não pode trazer os dois.
  expect(linhas[0].scoreCp).toBeNull()
  expect(linhas[0].primeiroLance).toBe('f3f7')

  // Propriedades, não números fixos.
  await expect(page.getByTestId('engine-profundidade')).not.toHaveText('0')
  const nos = Number(await page.getByTestId('engine-nodes').innerText())
  expect(nos).toBeGreaterThan(0)
})

test('WDL só aparece acompanhado do aviso de que não é chance humana', async ({ page }) => {
  await abrirBancada(page)
  await configurar(page, { fen: FEN_INICIAL, nos: NOS_RAPIDO, linhas: '1' })

  await analisar(page)
  await expect(page.getByTestId('engine-fen-analisada')).toHaveText(FEN_INICIAL, {
    timeout: ESPERA_ENGINE,
  })

  const wdl = page.getByTestId('engine-wdl')
  if ((await wdl.count()) === 0) {
    // A engine pode não ter emitido WDL; então o aviso também não pode existir.
    await expect(page.getByTestId('engine-wdl-aviso')).toHaveCount(0)
    return
  }

  const aviso = page.getByTestId('engine-wdl-aviso')
  await expect(aviso).toBeVisible()
  await expect(aviso).toContainText('auto-jogo')
  await expect(aviso).toContainText('não é a sua chance humana de vitória')
})

test('MultiPV devolve três linhas ordenadas da melhor para a pior', async ({ page }) => {
  await abrirBancada(page)
  await configurar(page, { fen: FEN_INICIAL, nos: '500000', linhas: '3' })

  await analisar(page)
  await expect(page.getByTestId('engine-fen-analisada')).toHaveText(FEN_INICIAL, {
    timeout: ESPERA_ENGINE,
  })
  await expect(page.getByTestId('engine-linha')).toHaveCount(3)

  const linhas = await lerLinhas(page)

  // Índices 1, 2, 3, na ordem.
  expect(linhas.map((linha) => linha.multiPv)).toEqual([1, 2, 3])

  // Lances distintos: três linhas iguais não são três alternativas.
  const lances = linhas.map((linha) => linha.primeiroLance)
  expect(new Set(lances).size).toBe(3)
  for (const lance of lances) expect(lance).toMatch(/^[a-h][1-8][a-h][1-8][qrbn]?$/)

  // Ordenação: da melhor para a pior, sem assertar centipeão exato.
  const scores = linhas.map((linha) => {
    expect(linha.mateIn).toBeNull()
    expect(linha.scoreCp).not.toBeNull()
    return linha.scoreCp as number
  })
  for (let i = 1; i < scores.length; i += 1) {
    expect(scores[i]).toBeLessThanOrEqual(scores[i - 1])
  }

  // Faixa de sanidade: a posição inicial é equilibrada, não ±10 peões.
  for (const score of scores) expect(Math.abs(score)).toBeLessThan(200)

  // O `bestmove` final tem de bater com a primeira linha.
  await expect(page.getByTestId('engine-melhor-lance')).toHaveText(lances[0])
})

test('análise obsoleta não vaza: o resultado exibido é o da posição nova', async ({ page }) => {
  await abrirBancada(page)

  // Primeira busca, longa de propósito.
  await configurar(page, { fen: FEN_INICIAL, nos: NOS_LONGO, linhas: '1' })
  // `analisar` já espera a engine subir: aqui basta confirmar que ela está
  // realmente buscando — senão o teste cancelaria algo que nem chegou ao worker.
  await analisar(page)
  await expect(page.getByTestId('engine-analisando')).toBeVisible()
  await expect(page.getByTestId('engine-vazio')).toBeVisible()

  // Troca a posição no meio da busca e pede a análise nova.
  await configurar(page, { fen: FEN_MATE_EM_1, nos: NOS_RAPIDO })
  await analisar(page)

  await expect(page.getByTestId('engine-fen-analisada')).toHaveText(FEN_MATE_EM_1, {
    timeout: ESPERA_ENGINE,
  })
  await expect(page.getByTestId('engine-melhor-lance')).toHaveText('f3f7')

  // A resposta antiga ainda poderia chegar atrasada. Ela não pode sobrescrever.
  await page.waitForTimeout(6_000)
  await expect(page.getByTestId('engine-fen-analisada')).toHaveText(FEN_MATE_EM_1)
  await expect(page.getByTestId('engine-melhor-lance')).toHaveText('f3f7')
  await expect(page.getByTestId('engine-erro')).toHaveCount(0)
})

test('a engine volta a responder depois de reiniciar o worker', async ({ page }) => {
  await abrirBancada(page)
  await configurar(page, { fen: FEN_MATE_EM_1, nos: NOS_RAPIDO, linhas: '1' })

  await analisar(page)
  await expect(page.getByTestId('engine-melhor-lance')).toHaveText('f3f7', {
    timeout: ESPERA_ENGINE,
  })

  await botao(page, 'Reiniciar').click()
  await expect(page.getByTestId('engine-vazio')).toBeVisible()
  await expect(page.getByTestId('engine-status')).toContainText('Ociosa')

  // Segunda vida: worker novo, handshake novo, mesma resposta.
  await analisar(page)
  await expect(page.getByTestId('engine-melhor-lance')).toHaveText('f3f7', {
    timeout: ESPERA_ENGINE,
  })
  await expect(page.getByTestId('engine-erro')).toHaveCount(0)
})

test('a interface não congela durante uma busca pesada', async ({ page }) => {
  await abrirBancada(page)
  await configurar(page, { fen: FEN_INICIAL, nos: NOS_LONGO, linhas: '1' })

  await analisar(page)
  await expect(page.getByTestId('engine-analisando')).toBeVisible()

  // A thread principal aceita digitação enquanto a engine busca no worker.
  const campoFen = page.getByLabel('FEN', { exact: true })
  await campoFen.fill(FEN_MATE_EM_1)
  await expect(campoFen).toHaveValue(FEN_MATE_EM_1)

  // E responde a um clique em outro botão, rápido.
  const inicio = Date.now()
  await botao(page, 'Parar').click()
  await expect(page.getByTestId('engine-analisando')).toHaveCount(0, { timeout: 5_000 })
  expect(Date.now() - inicio).toBeLessThan(5_000)

  // Cancelar não é falha: nada de mensagem de erro e nada exibido.
  await expect(page.getByTestId('engine-erro')).toHaveCount(0)
  await expect(page.getByTestId('engine-vazio')).toBeVisible()
})

/**
 * A convenção de perspectiva do UCI, provada contra a engine de verdade.
 *
 * Todo o resto do projeto assume que a engine reporta o score na perspectiva de
 * QUEM JOGA, e converte com `normalizeScoreToWhite`. Essa suposição nunca tinha
 * sido verificada: as suítes usam duble, e um duble confirma o que nós
 * escrevemos nele.
 *
 * Se a convenção estivesse invertida, o app diria ao jogador que o lance bom
 * dele foi ruim, criaria card de revisão indevido — e todos os testes
 * continuariam verdes. É o falso verde mais caro que este projeto poderia ter.
 *
 * As duas posições são espelho exato: mesma vantagem material, cores trocadas,
 * mesmo número de lances legais.
 */
/**
 * Analisa e devolve a primeira linha, esperando ela existir.
 *
 * `analisar` só garante que a engine ficou pronta; as linhas chegam logo depois.
 * Ler antes disso devolve array vazio e o teste falha por "undefined", que
 * esconde a causa real.
 */
async function primeiraLinha(page: Page, fen: string) {
  await configurar(page, { fen, nos: '400000' })
  await analisar(page)
  await expect(page.getByTestId('engine-linha').first()).toBeVisible({ timeout: ESPERA_ENGINE })
  const [linha] = await lerLinhas(page)
  return linha
}

const VANTAGEM_BRANCAS = '4k3/8/8/8/8/8/8/3QK3 w - - 0 1'
const VANTAGEM_PRETAS = '3qk3/8/8/8/8/8/8/4K3 b - - 0 1'

/** Dama a mais é vantagem enorme; qualquer piso baixo aqui seria frouxo. */
const VANTAGEM_MINIMA_CP = 300

test('a engine reporta o score na perspectiva de quem joga', async ({ page }) => {
  await page.goto('/debug/engine')

  const brancas = await primeiraLinha(page, VANTAGEM_BRANCAS)
  const pretas = await primeiraLinha(page, VANTAGEM_PRETAS)

  // O ponto do teste: nas DUAS posições quem joga está ganhando, então o score
  // cru tem de ser positivo nas duas. Se a engine reportasse sempre do lado das
  // brancas, o segundo caso viria negativo.
  const cru = (linha: typeof brancas): number => linha.scoreCp ?? (linha.mateIn ?? 0) * 10_000
  expect(cru(brancas), 'brancas com dama a mais, brancas jogam').toBeGreaterThan(VANTAGEM_MINIMA_CP)
  expect(cru(pretas), 'pretas com dama a mais, pretas jogam').toBeGreaterThan(VANTAGEM_MINIMA_CP)
})

test('normalizeScoreToWhite inverte o lado certo', async ({ page }) => {
  await page.goto('/debug/engine')

  const brancas = await primeiraLinha(page, VANTAGEM_BRANCAS)
  const pretas = await primeiraLinha(page, VANTAGEM_PRETAS)

  // Depois de normalizar, o sinal passa a falar sempre das brancas: positivo
  // quando as brancas estão melhor, negativo quando estão piores.
  if (brancas.scoreCp !== null) {
    expect(brancas.scoreBrancas, 'vantagem das brancas continua positiva').toBeGreaterThan(0)
  }
  if (pretas.scoreCp !== null) {
    expect(pretas.scoreBrancas, 'vantagem das pretas vira negativa').toBeLessThan(0)
    expect(pretas.scoreBrancas).toBe(-(pretas.scoreCp as number))
  }
})

test('normalizeWdlToWhite troca vitória por derrota quando as pretas jogam', async ({ page }) => {
  await page.goto('/debug/engine')

  // O painel já pede WDL em toda análise; não há controle para ligar.
  const linha = await primeiraLinha(page, VANTAGEM_PRETAS)
  test.skip(linha.wdlBrancas === '', 'esta build não reportou WDL')

  const [win, draw, loss] = linha.wdlBrancas.split(',').map(Number)
  expect(win + draw + loss).toBe(1000)
  // Pretas estão ganhando: na perspectiva das brancas isso é DERROTA provável.
  expect(loss, 'derrota das brancas domina o WDL normalizado').toBeGreaterThan(win)
})
