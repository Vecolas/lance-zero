/**
 * Ponta a ponta da tela de finais.
 *
 * O que só este arquivo prova: que os módulos cobertos em
 * `tests/unit/endgames-tela.test.ts` estão de fato LIGADOS à tela — que o
 * julgamento do domínio chega ao aluno, que a dica não aparece de graça e que a
 * linha modelo fica escondida até o fim.
 *
 * DECISÃO: a tablebase é controlada em TODO teste, com `page.route`. Sem isso o
 * resultado dependeria de a rede estar de pé no momento da execução — e teste
 * que passa em quatro execuções de cinco não é portão, é sorteio.
 *
 * Os lances entram pelo campo de texto em UCI, que é a alternativa acessível ao
 * arraste. Arrastar peça em navegador automatizado é frágil; e se o campo
 * quebrar, o tabuleiro deixa de ter alternativa por teclado — então cobrar o
 * campo é cobrar acessibilidade, não conveniência.
 *
 * CUIDADO conhecido: o anunciador de rota do Next tem `role="alert"` e colide
 * com o modo estrito do Playwright. Por isso nada aqui mira por `role="alert"`.
 */

import { expect, test, type Page } from '@playwright/test'

const ROTA_TABLEBASE = 'https://tablebase.lichess.ovh/**'

/** Tablebase fora do ar: o adversário tem de cair para o roteiro. */
async function semTablebase(page: Page): Promise<void> {
  await page.route(ROTA_TABLEBASE, (rota) => rota.abort())
}

/**
 * Tablebase respondendo. O cabeçalho de CORS é obrigatório mesmo em resposta
 * fabricada: o navegador confere a origem antes de entregar o corpo ao `fetch`.
 */
async function comTablebase(page: Page, uci: string): Promise<void> {
  await page.route(ROTA_TABLEBASE, (rota) =>
    rota.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({
        category: 'loss',
        dtz: -1,
        dtm: -2,
        checkmate: false,
        stalemate: false,
        moves: [{ uci, san: 'Kg8', category: 'win', dtz: 1, dtm: 2 }],
      }),
    }),
  )
}

async function abrirPosicao(page: Page, enunciado: RegExp): Promise<void> {
  await page.goto('/endgames')
  await page.getByRole('button', { name: enunciado }).click()
}

async function jogar(page: Page, uci: string): Promise<void> {
  await page.getByLabel(/Lance em UCI/).fill(uci)
  await page.getByRole('button', { name: 'Jogar lance' }).click()
}

const MATE_EM_1 = /O rei preto já está no canto/
const MATE_EM_2 = /Tire a casa de fuga primeiro/

test('a lista mostra as lições do currículo com conceito e número de posições', async ({
  page,
}) => {
  await semTablebase(page)
  await page.goto('/endgames')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Finais')
  await expect(page.getByRole('heading', { name: 'Mate de rei e dama' })).toBeVisible()
  await expect(page.getByText(/2 posições treináveis · cerca de \d+ min/).first()).toBeVisible()
  await expect(page.getByText(/A dama sozinha não dá mate/)).toBeVisible()
  await expect(page.getByRole('button', { name: MATE_EM_1 })).toBeVisible()
})

test('resolver a posição leva o objetivo a cumprido', async ({ page }) => {
  await semTablebase(page)
  await abrirPosicao(page, MATE_EM_1)

  await expect(page.getByText(/Em andamento/)).toBeVisible()
  await jogar(page, 'b1b8')

  await expect(page.getByText(/Objetivo cumprido/)).toBeVisible()
  await expect(page.getByText(/Mate aplicado dentro do número de lances/)).toBeVisible()
})

test('errar devolve falhou, com motivo, e a tela continua utilizável', async ({ page }) => {
  await semTablebase(page)
  await abrirPosicao(page, MATE_EM_1)

  // Lance legal que desperdiça o único lance do objetivo.
  await jogar(page, 'b1b2')

  await expect(page.getByText(/Objetivo não cumprido/)).toBeVisible()
  await expect(page.getByText(/Os lances previstos no objetivo acabaram/)).toBeVisible()

  // Não quebrou: dá para recomeçar e voltar.
  await expect(page.getByRole('button', { name: 'Recomeçar a posição' })).toBeVisible()
  await page.getByRole('button', { name: 'Recomeçar a posição' }).click()
  await expect(page.getByText(/Em andamento/)).toBeVisible()
})

test('lance ilegal é recusado com explicação, sem encerrar a tentativa', async ({ page }) => {
  await semTablebase(page)
  await abrirPosicao(page, MATE_EM_1)

  await jogar(page, 'a1a2')

  await expect(page.getByText(/não é um lance legal nesta posição/)).toBeVisible()
  await expect(page.getByText(/Em andamento/)).toBeVisible()
})

test('a dica só aparece quando o aluno pede, e escala uma por vez', async ({ page }) => {
  await semTablebase(page)
  await abrirPosicao(page, MATE_EM_1)

  const primeiraDica = /Procure o xeque que o rei adversário não tem como responder/
  await expect(page.getByText(primeiraDica)).toBeHidden()
  await expect(page.getByText(/A dica fica disponível, mas ela não aparece sozinha/)).toBeVisible()

  await page.getByRole('button', { name: 'Dica', exact: true }).click()
  await expect(page.getByText(primeiraDica)).toBeVisible()
  // Nível 1 é categoria de pensamento: ainda não entrega o lance.
  await expect(page.getByText(/Dama para b8/)).toBeHidden()
  await expect(page.getByRole('button', { name: /Mais uma dica \(1\/3\)/ })).toBeVisible()
})

test('a linha modelo fica escondida até o aluno resolver ou desistir', async ({ page }) => {
  await semTablebase(page)
  await abrirPosicao(page, MATE_EM_1)

  await expect(page.getByRole('heading', { name: 'Linha modelo' })).toBeHidden()

  await page.getByRole('button', { name: 'Desistir e ver a linha modelo' }).click()

  await expect(page.getByRole('heading', { name: 'Linha modelo' })).toBeVisible()
  await expect(page.getByText(/Você desistiu desta posição/)).toBeVisible()
})

test('sem tablebase, a tela avisa que o adversário segue um roteiro', async ({ page }) => {
  await semTablebase(page)
  await abrirPosicao(page, MATE_EM_2)

  await jogar(page, 'c2c7')

  await expect(page.getByText('Roteiro, não defesa perfeita')).toBeVisible()
  await expect(page.getByText(/A tablebase não respondeu agora/)).toBeVisible()

  // O aluno ainda pode terminar, e o veredito carrega a ressalva.
  await jogar(page, 'c7g7')
  await expect(page.getByText(/Objetivo cumprido/)).toBeVisible()
  await expect(page.getByText(/não vieram da tablebase/)).toBeVisible()
})

/**
 * Este teste depende de a CSP deixar a requisição sair. Hoje ela sai porque a
 * política ainda é report-only por padrão; `tablebase.lichess.ovh` NÃO está em
 * `ORIGENS_IMPORTADORES` (`src/lib/security/headers.ts`), e no dia em que a CSP
 * virar enforcing este teste cai — apontando exatamente para o bloqueio que a
 * entrega desta tela declarou.
 */
test('com tablebase, o adversário é apresentado como defesa perfeita', async ({ page }) => {
  await comTablebase(page, 'h8g8')
  await abrirPosicao(page, MATE_EM_2)

  await jogar(page, 'c2c7')

  // O ícone entra no seletor de propósito: a frase "defesa perfeita" também
  // aparece no texto de abertura da página, e status aqui é ícone + texto.
  await expect(page.getByText('◆ Defesa perfeita')).toBeVisible()
  await expect(page.getByText(/tablebase Syzygy/)).toBeVisible()

  await jogar(page, 'c7g7')
  await expect(page.getByText(/Objetivo cumprido/)).toBeVisible()
  await expect(page.getByText(/não vieram da tablebase/)).toBeHidden()
})
