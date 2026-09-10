/**
 * Tema: o botão tem DUAS posições, e o armazenamento tem três.
 *
 * "Seguir o sistema" continua existindo como o estado de quem ainda não
 * escolheu — só deixou de ser oferecido no botão. Ver ADR-0010.
 *
 * O caso que mais importa aqui é o ÚLTIMO: sem escolha salva, quem manda é o
 * `prefers-color-scheme`. Ele é o que garante que a primeira visita respeita o
 * aparelho, que é o motivo de o terceiro estado não ter sido apagado.
 */

import { expect, test } from '@playwright/test'

const BOTAO = /^Tema (claro|escuro)\./

test('duas posições, e a escolha sobrevive ao recarregamento', async ({ page }) => {
  // Ancorado no claro para o teste não depender do tema da máquina que o roda.
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  const html = page.locator('html')
  const botao = page.getByRole('button', { name: BOTAO })

  // Sem escolha salva não há atributo no <html>: quem decide é o CSS.
  await expect(html).not.toHaveAttribute('data-theme', /.*/)
  await expect(botao).toHaveAttribute('aria-label', /Tema claro\. Trocar para escuro\./)

  await botao.click()
  await expect(html).toHaveAttribute('data-theme', 'dark')
  await expect(botao).toHaveAttribute('aria-label', /Tema escuro\. Trocar para claro\./)

  // Duas posições, não três: o segundo clique volta para claro em vez de cair
  // num terceiro estado. É a diferença que o ADR-0010 registra.
  await botao.click()
  await expect(html).toHaveAttribute('data-theme', 'light')

  await botao.click()
  await expect(html).toHaveAttribute('data-theme', 'dark')

  // A escolha é aplicada ANTES da pintura, pelo script inline do <head>.
  await page.reload()
  await expect(html).toHaveAttribute('data-theme', 'dark')
})

test('o modo escuro pinta fundo escuro e texto claro', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  await page.getByRole('button', { name: BOTAO }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  const body = page.locator('body')
  await expect(body).toHaveCSS('background-color', 'rgb(7, 19, 28)')
  await expect(body).toHaveCSS('color', 'rgb(241, 245, 247)')
})

test('sem escolha salva, respeita o prefers-color-scheme do aparelho', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.*/)
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(7, 19, 28)')

  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(247, 249, 251)')
})

test('o ícone acompanha o tema sem depender de JavaScript para escolher', async ({ page }) => {
  // O ícone é decidido por CSS de propósito: o servidor não sabe o tema do
  // aparelho, e decidir em JS faria a primeira pintura mostrar o símbolo errado.
  // Este caso é o que impede alguém de "simplificar" isso de volta para JS.
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  const botao = page.getByRole('button', { name: BOTAO })

  const sol = botao.locator('svg').first()
  const lua = botao.locator('svg').nth(1)
  await expect(sol).toBeVisible()
  await expect(lua).toBeHidden()

  await botao.click()
  await expect(sol).toBeHidden()
  await expect(lua).toBeVisible()
})

test('a marca do cabeçalho é a arte do guia, e carrega', async ({ page }) => {
  await page.goto('/')
  const marca = page.locator('header img')

  await expect(marca).toHaveAttribute('src', '/marca/lancezero-icon.png')
  // `naturalWidth > 0` é o que separa "a tag está lá" de "a imagem existe": um
  // caminho errado deixaria a tag no DOM e a página sem marca nenhuma.
  await expect
    .poll(async () => marca.evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0)
})

test('a página declara o ícone da aba, e ele existe de verdade', async ({ page, request }) => {
  await page.goto('/')

  // Next gera as tags a partir de `src/app/icon*.png`. Afirmar a REGRA (existe
  // pelo menos um ícone declarado, e ele responde) em vez do caminho gerado,
  // que carrega um hash e mudaria a cada build.
  const hrefs = await page
    .locator('link[rel="icon"]')
    .evaluateAll((tags) => tags.map((t) => (t as HTMLLinkElement).getAttribute('href') ?? ''))
  expect(hrefs.length, 'nenhum <link rel="icon"> na página').toBeGreaterThan(0)

  // Declarar e não servir é o modo de falha silencioso aqui: a aba fica com o
  // ícone padrão do navegador e ninguém associa isso a um arquivo faltando.
  for (const href of hrefs) {
    const resposta = await request.get(href)
    expect(resposta.status(), `${href} não respondeu 200`).toBe(200)
  }
})
