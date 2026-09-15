import { expect, test } from '@playwright/test'

test('a landing apresenta a promessa e leva ao treino', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Treine o que perde suas partidas.',
  )
  await page.getByRole('link', { name: 'Ver o treino de hoje' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Treino de hoje')
})

test('o skip link leva ao conteúdo principal', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
  await expect(skip).toBeFocused()
  await skip.press('Enter')
  await expect(page).toHaveURL(/#conteudo$/)
})

test('a página de licenças lista as obrigações', async ({ page }) => {
  await page.goto('/licenses')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Licenças e fontes de dados')
  await expect(page.getByRole('cell', { name: 'GPL-3.0' }).first()).toBeVisible()
})

test('o manifesto PWA declara o shell instalável', async ({ request }) => {
  const resposta = await request.get('/manifest.webmanifest')

  expect(resposta.ok()).toBe(true)
  expect(resposta.headers()['content-type']).toContain('application/manifest+json')
  const manifesto = await resposta.json()
  expect(manifesto).toMatchObject({
    short_name: 'LanceZero',
    start_url: '/',
    display: 'standalone',
    lang: 'pt-BR',
  })

  const offline = await request.get('/offline.html')
  expect(offline.ok()).toBe(true)
  expect(await offline.text()).toContain('Você está sem conexão.')
})

test('as rotas públicas continuam utilizáveis depois de perder a rede', async ({
  page,
  context,
}) => {
  test.skip(process.env.E2E_TARGET !== 'prod', 'service worker só é registrado em produção')

  await page.goto('/dashboard')
  await expect
    .poll(
      () => page.evaluate(async () => Boolean(await navigator.serviceWorker.getRegistration('/'))),
      { timeout: 15_000 },
    )
    .toBe(true)

  // A primeira visita registra; o reload deixa o worker controlar a página.
  await page.reload()
  await context.setOffline(true)
  await page.goto('/puzzles')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Puzzles')
})
