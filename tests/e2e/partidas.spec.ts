import { expect, test } from '@playwright/test'

const PGN_DUAS = `[Event "Teste A"]
[White "Alice"]
[Black "Bruno"]
[Result "1-0"]
[Date "2026.01.02"]

1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0

[Event "Teste B"]
[White "Bruno"]
[Black "Alice"]
[Result "0-1"]
[Date "2026.01.03"]

1. d4 d5 2. c4 e6 3. Nc3 Nf6 0-1`

async function importar(page: import('@playwright/test').Page) {
  await page.goto('/games')
  await page.getByLabel('PGN', { exact: true }).fill(PGN_DUAS)
  await page.getByRole('button', { name: 'Importar' }).click()
  await expect(page.getByText(/2 importadas/)).toBeVisible()
}

test('importa várias partidas de um PGN só e não duplica', async ({ page }) => {
  await importar(page)

  await expect(page.getByRole('link', { name: /Alice × Bruno/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Bruno × Alice/ })).toBeVisible()

  // Importar de novo o mesmo texto não pode criar cópias.
  await page.getByRole('button', { name: 'Importar' }).click()
  await expect(page.getByText(/0 importadas, 2 já existiam/)).toBeVisible()
})

test('a revisão humana não mostra nenhuma avaliação', async ({ page }) => {
  await importar(page)
  await page.getByRole('link', { name: /Alice × Bruno/ }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Revisar partida')
  await expect(page.getByText('Onde você acha que a partida mudou?')).toBeVisible()

  // Passe 1 é sem engine: nada de centipawns, nada de barra de avaliação.
  await expect(page.getByText(/\+\d+\.\d\d/)).toBeHidden()
  await expect(page.getByText(/O passe 2|Passe 2/)).toBeVisible()
})

test('marcar lances e anotar sobrevive ao recarregamento', async ({ page }) => {
  await importar(page)
  await page.getByRole('link', { name: /Alice × Bruno/ }).click()

  await page.getByRole('button', { name: 'Qh5' }).click()
  await page.getByRole('button', { name: 'Marcar este lance' }).click()
  await page.getByLabel('Suas anotações').fill('Achei que a dama saiu cedo demais.')
  await page.getByRole('button', { name: 'Salvar minha análise' }).click()

  await expect(page.getByText('Salvo: 1 lance marcado.')).toBeVisible()

  await page.reload()
  await expect(page.getByLabel('Suas anotações')).toHaveValue('Achei que a dama saiu cedo demais.')
  await expect(page.getByRole('button', { name: /Qh5/ })).toContainText('⚑')

  await page.goto('/games')
  await expect(page.getByRole('link', { name: /Alice × Bruno/ })).toContainText('Revisada')
})

test('o passe 2 só aparece depois de a leitura humana ser salva', async ({ page }) => {
  await importar(page)
  await page.getByRole('link', { name: /Alice × Bruno/ }).click()

  // Antes de salvar: nada de engine, e a tela explica por quê.
  await expect(page.getByText(/Salve a sua leitura primeiro/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Analisar com a engine' })).toBeHidden()

  await page.getByRole('button', { name: 'Salvar minha análise' }).click()
  await expect(page.getByText(/^Salvo:/)).toBeVisible()

  await expect(page.getByRole('heading', { name: /Passe 2/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Analisar com a engine' })).toBeVisible()
})

test('a engine analisa a partida e cruza com o que o usuário marcou', async ({ page }) => {
  test.setTimeout(240_000)
  await importar(page)
  await page.getByRole('link', { name: /Alice × Bruno/ }).click()

  // Marca um lance de propósito, para o cruzamento ter o que comparar.
  await page.getByRole('button', { name: 'Qh5' }).click()
  await page.getByRole('button', { name: 'Marcar este lance' }).click()
  await page.getByRole('button', { name: 'Salvar minha análise' }).click()
  await expect(page.getByText(/^Salvo:/)).toBeVisible()

  await page.getByRole('button', { name: 'Analisar com a engine' }).click()

  // Barra de progresso durante, veredito depois.
  await expect(page.getByRole('progressbar')).toBeVisible({ timeout: 60_000 })
  // Escopado ao bloco do passe 2: o tabuleiro tem um role="status" próprio, e a
  // confirmação de "Salvo" é outro.
  const passe2 = page.getByRole('region', { name: /Passe 2/ })
  await expect(passe2.getByRole('status')).toContainText(/momento|marcou|percebeu|não encontrou/i, {
    timeout: 180_000,
  })

  // O rodapé é honesto sobre quanto da análise foi profunda.
  await expect(page.getByText(/receberam análise profunda/)).toBeVisible()
})

test('importa um arquivo .pgn, e o arquivo tem precedência sobre o texto', async ({ page }) => {
  await page.goto('/games')

  await page.getByLabel(/Ou envie um arquivo/).setInputFiles({
    name: 'minhas-partidas.pgn',
    mimeType: 'application/x-chess-pgn',
    buffer: Buffer.from(PGN_DUAS, 'utf8'),
  })
  await expect(page.getByText(/minhas-partidas\.pgn pronto para importar/)).toBeVisible()

  await page.getByRole('button', { name: 'Importar' }).click()
  await expect(page.getByText(/2 importadas/)).toBeVisible()
  await expect(page.getByRole('link', { name: /Alice × Bruno/ })).toBeVisible()
})

test('digitar no campo tira o arquivo do caminho, sem surpresa silenciosa', async ({ page }) => {
  await page.goto('/games')

  await page.getByLabel(/Ou envie um arquivo/).setInputFiles({
    name: 'lote.pgn',
    mimeType: 'application/x-chess-pgn',
    buffer: Buffer.from(PGN_DUAS, 'utf8'),
  })
  await expect(page.getByText(/lote\.pgn pronto para importar/)).toBeVisible()

  // Ao digitar, o aviso do arquivo some: o que vale passa a ser o texto.
  await page.getByLabel('PGN', { exact: true }).fill('não é um pgn')
  await expect(page.getByText(/lote\.pgn pronto para importar/)).toBeHidden()

  await page.getByRole('button', { name: 'Importar' }).click()

  // Escopo no painel: a lista vazia tambem diz "Nenhuma partida", e o texto solto
  // casaria com ela mesmo que o arquivo tivesse sido usado em silencio.
  const painel = page.getByRole('region', { name: 'Importar partidas' })
  await expect(painel.getByText(/Nenhuma partida leg/)).toBeVisible()

  // Controle: se o arquivo tivesse vencido, estas duas partidas estariam na lista.
  await expect(page.getByRole('link', { name: /Alice . Bruno/ })).toHaveCount(0)
})

test('as anotações do passe 1 ficam visíveis ao lado do veredito da engine', async ({ page }) => {
  test.setTimeout(240_000)
  await importar(page)
  await page.getByRole('link', { name: /Alice × Bruno/ }).click()

  await page.getByLabel('Suas anotações').fill('Achei que a dama saiu cedo demais.')
  await page.getByRole('button', { name: 'Salvar minha análise' }).click()
  await expect(page.getByText(/^Salvo:/)).toBeVisible()

  await page.getByRole('button', { name: 'Analisar com a engine' }).click()

  const passe2 = page.getByRole('region', { name: /Passe 2/ })
  await expect(passe2.getByText('O que você escreveu antes de ver a engine')).toBeVisible({
    timeout: 180_000,
  })
  await expect(passe2.getByText('Achei que a dama saiu cedo demais.')).toBeVisible()
})
