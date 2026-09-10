import { expect, test } from '@playwright/test'

test('exporta um backup com o formato esperado', async ({ page }) => {
  await page.goto('/settings')
  await expect(page.getByRole('heading', { name: 'Backup dos seus dados' })).toBeVisible()

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar backup' }).click()
  const arquivo = await download

  expect(arquivo.suggestedFilename()).toMatch(/^lancezero-backup-\d{4}-\d{2}-\d{2}\.json$/)
  await expect(page.getByText('Backup exportado.')).toBeVisible()
})

test('recusa um arquivo que não é backup, sem quebrar a tela', async ({ page }) => {
  await page.goto('/settings')

  await page.getByLabel('Escolher arquivo de backup para importar').setInputFiles({
    name: 'qualquer.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"nada":"disso"}'),
  })

  await expect(page.getByText('Não consegui importar')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Backup dos seus dados' })).toBeVisible()
})

test('preferência de tabuleiro e de tempo persistem', async ({ page }) => {
  await page.goto('/settings')

  await page.getByRole('button', { name: 'LanceZero Contraste' }).click()
  await expect(page.getByRole('button', { name: 'LanceZero Contraste' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await page.getByRole('button', { name: '60 min' }).click()
  // Espera a CONFIRMAÇÃO antes de recarregar. `aria-pressed` só vira depois de
  // a gravação no IndexedDB terminar — o provider dá `await` na escrita antes de
  // mexer no estado —, então este é o sinal de que o dado está no disco.
  //
  // Sem esta linha o teste corria contra a escrita e reprovava de vez em quando.
  // Aparecia SÓ no build de produção, porque lá o recarregamento chega mais
  // cedo: em `next dev` o atraso do runtime escondia a corrida.
  await expect(page.getByRole('button', { name: '60 min' })).toHaveAttribute('aria-pressed', 'true')

  await page.reload()

  await expect(page.getByRole('button', { name: '60 min' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'LanceZero Contraste' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})
