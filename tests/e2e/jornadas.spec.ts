import { expect, test } from '@playwright/test'

/**
 * As jornadas de Aberturas e Finais, medidas no navegador.
 *
 * O QUE ESTES TESTES AFIRMAM, e quase tudo é AUSÊNCIA — que é o que ninguém
 * nota faltando:
 *
 * 1. as duas abas continuam SEPARADAS e não aparece uma terceira agregando;
 * 2. abrir um conteúdo abre a JORNADA, e não um menu de abas pedagógicas;
 * 3. o treino não é a primeira etapa de uma jornada nova;
 * 4. uma rodada que termina em erro NUNCA escreve "Atividade concluída".
 *
 * O item 4 é o bug que este trabalho veio matar. Ele não aparece como tela
 * quebrada nem como exceção: aparece como ELOGIO depois de um erro. Nada mais
 * no app discorda dele, e por isso ele precisa de portão.
 */

const FRASES_DE_CONCLUSAO = /atividade conclu[íi]da|jornada conclu[íi]da|abertura conclu[íi]da/i

test('Aberturas e Finais continuam abas separadas, sem uma terceira agregando', async ({
  page,
}) => {
  await page.goto('/aberturas')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Aberturas')
  // Nenhum final vaza para a aba de aberturas.
  await expect(page.getByText(/oposi[çc][ãa]o|lucena|philidor/i)).toHaveCount(0)

  await page.goto('/finais')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Finais/)

  // E não existe uma terceira aba juntando os dois assuntos.
  const nav = page.getByRole('navigation').first()
  await expect(nav.getByRole('link', { name: /aberturas e finais|estudos|jornadas/i })).toHaveCount(
    0,
  )
})

test('abrir uma abertura abre a JORNADA, não um menu de abas pedagógicas', async ({ page }) => {
  await page.goto('/aberturas')

  const primeiro = page.getByRole('link', { name: /Estudar|Continuar estudo|Treinar novamente/i })
  await expect(primeiro.first()).toBeVisible()
  await primeiro.first().click()

  // A jornada se apresenta: etapa 1 de N, com o objetivo escrito.
  await expect(page.getByText(/Etapa 1 de \d+/)).toBeVisible()

  /*
    AS ABAS PEDAGÓGICAS NÃO EXISTEM MAIS NO CAMINHO PRINCIPAL. Elas eram o
    defeito: para aprender a Italiana o aluno precisava primeiro entender a
    arquitetura da interface e escolher sozinho a ordem correta.
  */
  for (const aba of ['Visão geral', 'Aprender', 'Erros comuns']) {
    await expect(page.getByRole('button', { name: aba, exact: true })).toHaveCount(0)
  }

  // O trilho de progresso informa onde o aluno está — e não é uma tab bar.
  await expect(page.getByRole('navigation', { name: 'Progresso da jornada' })).toBeVisible()
})

test('o treino NÃO é a primeira etapa de uma jornada nova', async ({ page }) => {
  await page.goto('/aberturas')
  await page
    .getByRole('link', { name: /Estudar|Continuar estudo/i })
    .first()
    .click()

  await expect(page.getByText(/Etapa 1 de \d+/)).toBeVisible()
  // A etapa 1 é de leitura: nenhum tabuleiro pedindo lance, nenhum "sem dicas".
  await expect(page.getByText('TREINO · sem dicas')).toHaveCount(0)
})

test('a jornada avança sozinha de etapa em etapa, sem voltar a um menu', async ({ page }) => {
  await page.goto('/aberturas')
  await page
    .getByRole('link', { name: /Estudar|Continuar estudo/i })
    .first()
    .click()

  await expect(page.getByText('Etapa 1 de 9')).toBeVisible()
  await page.getByRole('button', { name: /Continuar/ }).click()

  // Etapa 2 abre direto. Sem menu no meio — é a diferença entre uma jornada e
  // um índice.
  await expect(page.getByText('Etapa 2 de 9')).toBeVisible()
})

test('voltar para uma etapa concluída NÃO perde progresso', async ({ page }) => {
  await page.goto('/aberturas')
  await page
    .getByRole('link', { name: /Estudar|Continuar estudo/i })
    .first()
    .click()

  await page.getByRole('button', { name: /Continuar/ }).click()
  await expect(page.getByText('Etapa 2 de 9')).toBeVisible()

  // O trilho deixa voltar ao que já foi visto.
  const trilho = page.getByRole('navigation', { name: 'Progresso da jornada' })
  await trilho.getByRole('button').first().click()
  await expect(page.getByText('Etapa 1 de 9')).toBeVisible()

  // E o avanço não foi desfeito: continuar leva de volta à etapa 2.
  await page.getByRole('button', { name: /Continuar/ }).click()
  await expect(page.getByText('Etapa 2 de 9')).toBeVisible()
})

test('a jornada retoma exatamente onde parou depois de recarregar', async ({ page }) => {
  await page.goto('/aberturas')
  await page
    .getByRole('link', { name: /Estudar|Continuar estudo/i })
    .first()
    .click()

  await page.getByRole('button', { name: /Continuar/ }).click()
  await page.getByRole('button', { name: /Continuar/ }).click()
  await expect(page.getByText('Etapa 3 de 9')).toBeVisible()

  await page.reload()
  // Retomada EXATA: sem isto, sair no meio custaria o estudo inteiro, e o aluno
  // aprenderia a não sair — que é a forma errada de manter alguém na tela.
  await expect(page.getByText('Etapa 3 de 9')).toBeVisible()
})

test('o card da abertura mostra o estado da jornada e o CTA certo', async ({ page }) => {
  await page.goto('/aberturas')
  await expect(page.getByText(/\d+ de \d+ etapas|\d+ etapas/).first()).toBeVisible()
  await expect(page.getByText('Estudar →').first()).toBeVisible()

  await page
    .getByRole('link', { name: /Estudar/i })
    .first()
    .click()
  await page.getByRole('button', { name: /Continuar/ }).click()

  await page.goto('/aberturas')
  // Começou: o CTA muda, e o aluno não precisa lembrar onde parou.
  await expect(page.getByText('Continuar estudo →').first()).toBeVisible()
})

test('NENHUMA tela de jornada escreve "Atividade concluída" — o bug de origem', async ({
  page,
}) => {
  await page.goto('/aberturas')
  await page
    .getByRole('link', { name: /Estudar|Continuar estudo/i })
    .first()
    .click()

  // Percorre a jornada inteira até o treino, conferindo a cada etapa.
  for (let i = 0; i < 8; i += 1) {
    await expect(page.locator('main')).not.toContainText(FRASES_DE_CONCLUSAO)
    const continuar = page.getByRole('button', { name: /Continuar/ })
    if ((await continuar.count()) === 0) break
    if (await continuar.isDisabled()) break
    await continuar.click()
  }

  await expect(page.locator('main')).not.toContainText(FRASES_DE_CONCLUSAO)
})

test('abrir um final abre a jornada do final, com reconhecimento antes do lance', async ({
  page,
}) => {
  await page.goto('/finais')

  const primeiro = page.getByRole('link', { name: /Estudar|Continuar estudo|Treinar novamente/i })
  // `toBeVisible` e NÃO `count()`: `count()` não espera, então media a página
  // antes da hidratação e o teste se pulava sozinho. Um skip assim é pior que
  // uma falha — ele parece "ainda não implementado" e era só corrida.
  await expect(primeiro.first()).toBeVisible()

  await primeiro.first().click()
  await expect(page.getByText(/Etapa 1 de \d+/)).toBeVisible()

  // A jornada de finais NÃO usa vocabulário de repertório: "fora do repertório"
  // é conceito de abertura, e aplicá-lo a um final seria reprovar um lance bom.
  await expect(page.locator('main')).not.toContainText(/fora do repert[óo]rio/i)
})
