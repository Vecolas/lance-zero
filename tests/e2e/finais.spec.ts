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
  const origem = page.locator('#lancezero-board-square-' + uci.slice(0, 2))
  const destino = page.locator('#lancezero-board-square-' + uci.slice(2, 4))
  await expect(origem).toBeVisible()
  await expect(destino).toBeVisible()
  await expect(origem.locator('[role="button"]').first()).toBeVisible()
  await origem.locator('[role="button"]').first().dragTo(destino)
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

test('um lance legal pelo tabuleiro mantém a tela utilizável', async ({ page }) => {
  await semTablebase(page)
  await abrirPosicao(page, MATE_EM_1)

  // Lance legal que desperdiça o único lance do objetivo.
  await jogar(page, 'b1b8')

  await expect(page.getByText(/Objetivo cumprido/)).toBeVisible()

  await expect(page.getByRole('button', { name: 'Voltar às lições' })).toBeVisible()
})

test('lance ilegal é recusado com explicação, sem encerrar a tentativa', async ({ page }) => {
  await semTablebase(page)
  await abrirPosicao(page, MATE_EM_1)

  await jogar(page, 'b1c3')

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
  await abrirPosicao(page, MATE_EM_1)

  await jogar(page, 'b1b8')

  await expect(page.getByText(/Objetivo cumprido/)).toBeVisible()
  await expect(page.getByText(/A tablebase não respondeu para esta posição/)).toBeVisible()
})

/**
 * Este teste depende de a CSP deixar a requisição sair. Hoje ela sai porque a
 * política ainda é report-only por padrão; `tablebase.lichess.ovh` NÃO está em
 * `ORIGENS_IMPORTADORES` (`src/lib/security/headers.ts`), e no dia em que a CSP
 * virar enforcing este teste cai — apontando exatamente para o bloqueio que a
 * entrega desta tela declarou.
 */
test.skip('com tablebase, o adversário é apresentado como defesa perfeita', async ({ page }) => {
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

/**
 * A partir daqui: PERSISTÊNCIA.
 *
 * O que só estes testes provam é o que nenhum teste unitário alcança: que o
 * caminho tela → repositório → IndexedDB de VERDADE existe. Os testes de unidade
 * gravam num repositório de memória; se o esquema do banco, o provider ou a
 * fronteira do cliente quebrarem, eles continuam verdes.
 *
 * O recarregar da página é o coração disto. Uma tela que guardasse a tentativa
 * só em estado de React passaria em tudo que não recarrega — e o aluno perderia
 * o histórico ao fechar a aba, que é exatamente o defeito que a issue #58
 * descreve.
 */

test('a tentativa resolvida sobrevive ao recarregar a página', async ({ page }) => {
  await semTablebase(page)
  await abrirPosicao(page, MATE_EM_1)

  await jogar(page, 'b1b8')
  await expect(page.getByText(/Objetivo cumprido/)).toBeVisible()
  // A tela DIZ que gravou. Enquanto não gravava, ela dizia o contrário — e a
  // afirmação errada na tela é pior que a ausência do recurso.
  await expect(page.getByText(/Tentativa gravada/)).toBeVisible()

  await page.getByRole('button', { name: /Voltar às lições/ }).click()
  await expect(page.getByText(/Resolvida · 1 tentativa/)).toBeVisible()

  await page.reload()
  await expect(page.getByText(/Resolvida · 1 tentativa/)).toBeVisible()
})

test('a tentativa que falhou também fica gravada, e não vira "resolvida"', async ({ page }) => {
  await semTablebase(page)
  await abrirPosicao(page, MATE_EM_1)

  // Lance legal que desperdiça o único lance do objetivo.
  await jogar(page, 'b1e1')
  await expect(page.getByText(/Objetivo não cumprido/)).toBeVisible()
  await expect(page.getByText(/Tentativa gravada/)).toBeVisible()

  await page.getByRole('button', { name: /Voltar às lições/ }).click()
  await page.reload()

  await expect(page.getByText(/Tentada, ainda não cumprida · 1 tentativa/)).toBeVisible()
  await expect(page.getByText(/Resolvida/)).toBeHidden()
})

test('a posição que o aluno não cumpriu aparece no treino de hoje', async ({ page }) => {
  await semTablebase(page)
  await abrirPosicao(page, MATE_EM_1)

  await jogar(page, 'b1e1')
  await expect(page.getByText(/já está vencida e aparece no treino de hoje/)).toBeVisible()

  await page.goto('/train/revisao')

  // O card de final entrou na fila de revisão vencida, com o enunciado da
  // posição como pergunta.
  await expect(page.getByText(/Jogue o primeiro lance da técnica/)).toBeVisible()
  await expect(page.getByText(/O rei preto já está no canto/)).toBeVisible()

  // E o plano do dia CONTA essa revisão: é o "Treino de hoje" da issue, não só
  // a fila de /train.
  await page.goto('/dashboard')
  // O card de revisão deixou de ser um `heading` de bloco e passou a ser uma
  // ATIVIDADE da lista — a mudança do Hoje V2. O que o teste afirma continua
  // sendo a mesma coisa: o card de final conta no plano do dia.
  //
  // A BUSCA É DENTRO DA LISTA, e não na página: o rodapé do Hoje também fala em
  // "revisões vencidas" ao explicar como o plano é montado, e uma busca solta
  // casava com os dois. Passaria a aprovar uma página que só tem o rodapé —
  // isto é, um plano SEM o card, que é exatamente o que este teste existe para
  // impedir.
  const cards = page.getByRole('listitem')
  await expect(cards.filter({ hasText: 'Revisões vencidas' })).toHaveCount(1)

  // Afirma a REGRA, e não o número. A versão anterior cravava "1 revisão
  // vencida esperando" e passou a reprovar no dia em que o planner começou a
  // semear cards de repertório — reprovando o código CERTO, que é o pior tipo
  // de portão. Quantos outros cards existem ao lado não é assunto deste teste.
  await expect(cards.filter({ hasText: /revis(ão|ões) vence(u|ram)/ })).toHaveCount(1)
})

test('cumprir sem dica não enche a fila de revisão', async ({ page }) => {
  await semTablebase(page)
  await abrirPosicao(page, MATE_EM_1)

  await jogar(page, 'b1b8')
  await expect(page.getByText(/Tentativa gravada/)).toBeVisible()
  await expect(page.getByText(/aparece no treino de hoje/)).toBeHidden()

  await page.goto('/train/revisao')
  await expect(page.getByText(/Nada vencido agora/)).toBeVisible()
})
