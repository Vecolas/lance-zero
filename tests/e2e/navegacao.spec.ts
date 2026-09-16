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

  /*
    ESPERA PELO CONTROLADOR, e não por um `reload` que "deve dar tempo".

    Antes daqui o teste registrava, esperava só a REGISTRO existir e recarregava
    a página, confiando que o recarregamento chegaria depois da ativação. Isso é
    corrida: o registro existe no instante em que `register()` resolve, muito
    antes de o worker instalar. Quando a instalação passou a guardar também os
    assets do shell — que é o que faz a rota abrir offline de verdade — ela
    ficou mais longa, o recarregamento passou na frente e o teste virou
    `ERR_INTERNET_DISCONNECTED`: ninguém estava no comando para responder.

    `navigator.serviceWorker.controller` só deixa de ser nulo depois de instalar
    E ativar. Esperar por ele é esperar exatamente a condição que o resto do
    teste precisa — e, de quebra, garante que a pré-carga terminou, porque a
    ativação só acontece depois da instalação.
  */
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), {
      timeout: 30_000,
    })
    .toBe(true)

  await context.setOffline(true)
  await page.goto('/puzzles')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Puzzles')
})
