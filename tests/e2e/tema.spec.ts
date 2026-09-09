import { expect, test } from '@playwright/test'

const BOTAO = /^Tema: /

test('alterna sistema, claro e escuro e persiste a escolha', async ({ page }) => {
  await page.goto('/')
  const html = page.locator('html')
  const botao = page.getByRole('button', { name: BOTAO })

  // Padrão é seguir o sistema: sem atributo no <html>.
  await expect(botao).toHaveAttribute('aria-label', /Tema: Sistema/)
  await expect(html).not.toHaveAttribute('data-theme', /.*/)

  await botao.click()
  await expect(html).toHaveAttribute('data-theme', 'light')

  await botao.click()
  await expect(html).toHaveAttribute('data-theme', 'dark')

  // A escolha sobrevive ao recarregamento e é aplicada antes da pintura.
  await page.reload()
  await expect(html).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('button', { name: BOTAO })).toHaveAttribute(
    'aria-label',
    /Tema: Escuro/,
  )

  await page.getByRole('button', { name: BOTAO }).click()
  await expect(html).not.toHaveAttribute('data-theme', /.*/)
})

test('o modo escuro pinta fundo escuro e texto claro', async ({ page }) => {
  await page.goto('/')
  const botao = page.getByRole('button', { name: BOTAO })
  await botao.click()
  await botao.click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  const body = page.locator('body')
  await expect(body).toHaveCSS('background-color', 'rgb(7, 19, 28)')
  await expect(body).toHaveCSS('color', 'rgb(241, 245, 247)')
})

test('respeita prefers-color-scheme quando a preferência é o sistema', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.*/)
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(7, 19, 28)')

  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(247, 249, 251)')
})
