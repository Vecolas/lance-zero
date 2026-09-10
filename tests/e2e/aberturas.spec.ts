/**
 * Ponta a ponta da tela de aberturas.
 *
 * O que SÓ este arquivo prova: que os módulos cobertos em
 * `tests/unit/openings-tela.test.tsx` e `tests/unit/repertoire-tela.test.tsx`
 * estão de fato LIGADOS à rota `/openings` — que a página deixou de ser
 * placeholder, que o repertório das duas cores chega ao navegador com as ideias,
 * e que o explorer fora do ar não derruba nada disso.
 *
 * DECISÃO: o explorer é controlado com `page.route` em TODO teste que o toca.
 * Sem isso o resultado dependeria de a rede estar de pé no momento da execução —
 * e teste que passa em quatro execuções de cinco não é portão, é sorteio. E há
 * um motivo a mais aqui: o serviço respondeu 401 nas duas medições da issue #71,
 * então o caminho "respondeu 200" não existe fora do dublê.
 *
 * CUIDADO conhecido: o anunciador de rota do Next tem `role="alert"` e colide
 * com o modo estrito do Playwright. Nada aqui mira por `role="alert"`, e as
 * buscas por `role="status"` são sempre feitas DENTRO da região de um
 * repertório, porque a página tem uma por repertório.
 */

import { expect, test, type Page } from '@playwright/test'

const ROTA_EXPLORER = 'https://explorer.lichess.ovh/**'

const BRANCAS = 'Brancas: 1.e4 e a Italiana com d3'
const PRETAS = 'Pretas: 1...e5 e 1...d5'

/** Explorer inalcançável: a consulta nem chega ao serviço. */
async function explorerForaDoAr(page: Page): Promise<void> {
  await page.route(ROTA_EXPLORER, (rota) => rota.abort())
}

/** Explorer respondendo 401, que é o que ele respondeu de verdade em 2026-09. */
async function explorerSemAutorizacao(page: Page): Promise<void> {
  await page.route(ROTA_EXPLORER, (rota) =>
    rota.fulfill({
      status: 401,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: '{"error":"Unauthorized"}',
    }),
  )
}

test('a página mostra os repertórios das DUAS cores, com o princípio de cada um', async ({
  page,
}) => {
  await explorerForaDoAr(page)
  await page.goto('/openings')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Aberturas')
  await expect(page.getByRole('heading', { name: BRANCAS })).toBeVisible()
  await expect(page.getByRole('heading', { name: PRETAS })).toBeVisible()

  await expect(page.getByText('Você joga de brancas.')).toBeVisible()
  await expect(page.getByText('Você joga de pretas.')).toBeVisible()

  // Não é mais o placeholder da fase: a frase abaixo é do `PlaceholderScreen`,
  // e enquanto ela estava aqui a rota não entregava nada.
  await expect(page.getByText('O que esta tela vai fazer')).toBeHidden()
  await expect(page.getByText('Ainda não implementado')).toBeHidden()
})

test('a IDEIA aparece ao lado do lance, inclusive a do lance do adversário', async ({ page }) => {
  await explorerForaDoAr(page)
  await page.goto('/openings')

  const brancas = page.getByRole('region', { name: BRANCAS })

  await expect(brancas.getByText('1. e4', { exact: true })).toBeVisible()
  await expect(
    brancas.getByText(/Ocupa o centro e abre as duas peças que você mais precisa/),
  ).toBeVisible()

  // A ideia do lance DELE: metade do que falta a um jogador de 1100.
  await expect(brancas.getByText('1... e5', { exact: true })).toBeVisible()
  await expect(brancas.getByText(/É a resposta mais comum abaixo de 1600/)).toBeVisible()

  // E a transposição é dita, não desenhada duas vezes.
  await expect(brancas.getByText(/Transposição/).first()).toBeVisible()
})

test('sem partida importada, a tela não inventa número nenhum', async ({ page }) => {
  await explorerForaDoAr(page)
  await page.goto('/openings')

  const brancas = page.getByRole('region', { name: BRANCAS })
  await expect(brancas.getByText(/Nenhuma partida importada ainda/)).toBeVisible()

  // "0 lacunas" com zero partidas afirmaria que o repertório cobre tudo.
  await expect(brancas.getByRole('region', { name: /Lacunas do repertório/ })).toBeHidden()
  await expect(brancas.getByRole('region', { name: /Desvios do seu repertório/ })).toBeHidden()
})

test('a tela NASCE sem estatística: nada é consultado antes de o aluno pedir', async ({ page }) => {
  let consultas = 0
  await page.route(ROTA_EXPLORER, (rota) => {
    consultas += 1
    return rota.abort()
  })
  await page.goto('/openings')

  const brancas = page.getByRole('region', { name: BRANCAS })
  await expect(brancas.getByText(/Nenhuma consulta feita nesta posição/)).toBeVisible()
  expect(consultas).toBe(0)
})

test('explorer inalcançável não quebra a tela, e diz o motivo', async ({ page }) => {
  await explorerForaDoAr(page)
  await page.goto('/openings')

  const brancas = page.getByRole('region', { name: BRANCAS })
  await brancas.getByRole('button', { name: 'Consultar o explorador' }).click()

  await expect(brancas.getByText('Não consegui falar com o explorador')).toBeVisible()
  await expect(brancas.getByText(/A consulta não chegou ao serviço/)).toBeVisible()

  // Falha passageira: aqui insistir faz sentido, e o botão existe.
  await expect(brancas.getByRole('button', { name: 'Consultar de novo' })).toBeVisible()

  // E o resto da tela continua inteiro.
  await expect(brancas.getByText(/Ocupa o centro e abre as duas peças/)).toBeVisible()
  await expect(page.getByRole('heading', { name: PRETAS })).toBeVisible()
})

test('401 é dito como 401: insistir não resolve, e não há botão convidando a isso', async ({
  page,
}) => {
  await explorerSemAutorizacao(page)
  await page.goto('/openings')

  const brancas = page.getByRole('region', { name: BRANCAS })
  await brancas.getByRole('button', { name: 'Consultar o explorador' }).click()

  await expect(brancas.getByText('O explorador não autorizou a consulta')).toBeVisible()
  await expect(brancas.getByText(/Insistir não resolve/)).toBeVisible()
  await expect(brancas.getByRole('button', { name: 'Consultar de novo' })).toBeHidden()

  // A afirmação proibida NÃO pode aparecer no resultado da consulta: falta de
  // estatística não é falta de partidas.
  await expect(brancas.getByRole('status').getByText(/nenhuma partida/i)).toBeHidden()
})
