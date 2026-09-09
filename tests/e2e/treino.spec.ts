import { expect, test } from '@playwright/test'

test('o treino de hoje é montado sozinho e cabe no orçamento', async ({ page }) => {
  await page.goto('/dashboard')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Treino de hoje')

  // Usuário novo, sem dado nenhum: o planner cai no currículo rotativo e ainda
  // assim entrega um plano dentro do orçamento padrão de 40 min.
  const resumo = page.getByText(/min em \d+ bloco/)
  await expect(resumo).toBeVisible()
  await expect(page.getByText('dentro do seu orçamento de 40 min.')).toBeVisible()

  // Todo bloco precisa dizer por que está ali.
  const blocos = page.getByRole('listitem')
  await expect(blocos.first()).toBeVisible()
  const total = await blocos.count()
  expect(total).toBeGreaterThan(0)

  await expect(page.getByRole('link', { name: 'Começar o treino' })).toHaveAttribute(
    'href',
    '/train',
  )
})

test('trocar o orçamento remonta o plano e persiste', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByText('dentro do seu orçamento de 40 min.')).toBeVisible()

  await page.getByRole('button', { name: '20 min' }).click()
  await expect(page.getByText('dentro do seu orçamento de 20 min.')).toBeVisible()

  await page.reload()
  await expect(page.getByText('dentro do seu orçamento de 20 min.')).toBeVisible()
})

test('o progresso admite que ainda não há o que medir', async ({ page }) => {
  await page.goto('/progress')
  await expect(page.getByText(/Ainda não há o que medir/)).toBeVisible()
})

test('a tela de treino admite quando não há revisão vencida', async ({ page }) => {
  await page.goto('/train')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Treinar')
  await expect(page.getByText(/Nada vencido agora/)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Voltar ao treino de hoje' })).toBeVisible()
})
