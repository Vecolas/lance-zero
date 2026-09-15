import { expect, test } from '@playwright/test'

test('curso novo navega por Aprender e Treinar sem revelar a resposta', async ({ page }) => {
  await page.route('https://explorer.lichess.ovh/**', (route) => route.abort())
  await page.goto('/aberturas')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Aberturas')
  await expect(page.getByRole('link', { name: 'Abrir curso Abertura Italiana' })).toBeVisible()
  await page.getByRole('link', { name: 'Abrir curso Abertura Italiana' }).click()

  await expect(page.getByRole('heading', { name: 'Abertura Italiana' })).toBeVisible()
  await expect(page.locator('[aria-label="Glossário da abertura"]')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Aprender', exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Aprender', exact: true }).first().click()
  await expect(page.getByText('MODO APRENDER')).toBeVisible()
  await expect(page.getByText('O QUE VAMOS OBSERVAR?')).toBeVisible()

  await page.getByRole('button', { name: 'Treinar', exact: true }).first().click()
  await expect(page.getByText('MODO TREINAR')).toBeVisible()
  await expect(page.getByText('Qual é sua decisão?')).toBeVisible()
  await expect(page.getByText(/sem dicas/)).toBeVisible()
  await expect(page.getByText('Lance do repertório.')).toBeHidden()
})

test('curso novo oferece Explorer como enriquecimento sob demanda', async ({ page }) => {
  let consultas = 0
  await page.route('https://explorer.lichess.ovh/**', (route) => {
    consultas += 1
    return route.abort()
  })
  await page.goto('/aberturas/italiana')
  await expect(page.getByText('O que o mundo joga (opcional)')).toBeVisible()
  expect(consultas).toBe(0)
  await page.getByRole('button', { name: 'Consultar o explorador' }).click()
  await expect(page.getByText(/Não consegui falar com o explorador/)).toBeVisible()
  expect(consultas).toBe(1)
})

test('catálogo filtra por primeiro lance, nível e status', async ({ page }) => {
  await page.goto('/aberturas')
  await expect(page.getByRole('link', { name: 'Abrir curso Abertura Italiana' })).toBeVisible()
  await page.getByLabel('Primeiro lance').selectOption('d4')
  await expect(page.getByRole('link', { name: 'Abrir curso Sistema Londres' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Abrir curso Abertura Italiana' })).toBeHidden()
  await page.getByLabel('Status').selectOption('learning')
  await expect(page.getByText(/Nenhuma abertura corresponde aos filtros/)).toBeVisible()
})

test('usuário experiente pode fazer diagnóstico curto antes da aula', async ({ page }) => {
  await page.goto('/aberturas/italiana')
  await page.getByRole('button', { name: 'Já conheço' }).click()
  await expect(page.getByText(/DIAGNÓSTICO/)).toBeVisible()
  await expect(page.getByText(/Qual decisão você tomaria/)).toBeVisible()
  await page.getByRole('button', { name: 'e4', exact: true }).click()
  await expect(page.getByText('Você reconheceu a decisão do repertório.')).toBeVisible()
})

test('usuário pode ativar a abertura no repertório guiado', async ({ page }) => {
  await page.goto('/aberturas/italiana')
  await page.getByRole('button', { name: 'Progresso', exact: true }).click()
  await page.getByRole('button', { name: 'Adicionar ao meu repertório' }).click()
  await expect(page.getByRole('button', { name: 'Repertório ativo' })).toBeVisible()
})

test('planos exibem posição e rota pedagógica', async ({ page }) => {
  await page.goto('/aberturas/italiana')
  await page.getByRole('button', { name: 'Planos', exact: true }).click()
  await expect(page.getByText('Rota visual: d3 → d4')).toBeVisible()
  await expect(page.getByText('Ruptura d4')).toBeVisible()
})
