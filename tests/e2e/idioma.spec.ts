/**
 * Ponta a ponta do seletor de idioma.
 *
 * A REGRA QUE ESTE ARQUIVO PROVA, e é a regra final do plano: trocar PT/EN em
 * qualquer ponto do aprendizado continua exatamente onde estava. O que muda é a
 * apresentação — nunca o estado pedagógico.
 *
 * O teste mais importante é `a troca NÃO manda para a home`. É o defeito clássico
 * de internacionalização: o seletor existe, funciona, e joga fora onde a pessoa
 * estava. Quem está na etapa 5 da Italiana e perde o lugar ao trocar de idioma
 * não vai trocar de idioma de novo.
 */

import { expect, test, type Page } from '@playwright/test'

/** O seletor, achado como o aluno o acha: pelo grupo de idioma no cabeçalho. */
function seletor(page: Page) {
  return page.getByRole('group', { name: /Alterar idioma|Change language/ })
}

async function trocarPara(page: Page, sigla: 'PT' | 'EN') {
  await seletor(page)
    .getByRole('link', { name: sigla === 'EN' ? 'English' : 'Português' })
    .click()
}

test('TESTE A — a casca inteira troca de idioma', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible()

  await trocarPara(page, 'EN')

  await expect(page).toHaveURL(/\/en\/today$/)

  /*
    A NAVEGAÇÃO VISÍVEL MUDA COM A LARGURA, e o teste mira o que está na tela.

    Abaixo de 60 rem a barra de cima some inteira e a de baixo mostra só os itens
    primários — Aberturas e Finais não estão lá, e isso é desenho do produto, não
    do idioma. Fixar a barra de cima aqui faria o teste reprovar no celular por
    uma razão que não tem nada a ver com tradução.

    "Today" e "Library" existem nas duas larguras, e são o bastante para provar
    que a navegação trocou de idioma.
  */
  await expect(page.getByRole('link', { name: 'Today' }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Library' }).first()).toBeVisible()
  // O rodapé também: a promessa da marca é conteúdo, não decoração.
  await expect(page.getByText('Train what loses your games.')).toBeVisible()
  // E nada de português sobrou na casca.
  await expect(page.getByRole('link', { name: 'Hoje' })).toHaveCount(0)
})

test('a troca NÃO manda para a home: a abertura continua a mesma', async ({ page }) => {
  await page.goto('/aberturas/italiana')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Abertura Italiana')

  await trocarPara(page, 'EN')

  // MESMA abertura, e o endereço dela não mudou: `aberturas` e `italiana` são
  // identificadores — só o prefixo de idioma entrou.
  await expect(page).toHaveURL(/\/en\/aberturas\/italiana$/)
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
})

test('a query string sobrevive à troca — é ela que carrega o checkpoint', async ({ page }) => {
  await page.goto('/aberturas/italiana?modo=reaprender')
  await expect(page.getByTestId('modo-de-aprendizado')).toBeVisible()

  await trocarPara(page, 'EN')

  await expect(page).toHaveURL(/\/en\/aberturas\/italiana\?modo=reaprender$/)
  // E o aviso do modo continua lá, agora em inglês.
  await expect(page.getByTestId('modo-de-aprendizado')).toContainText(/came up wrong/)
})

test('TESTE B — o Roadmap troca de idioma sem perder o estado', async ({ page }) => {
  await page.goto('/roadmap')
  await expect(page.getByRole('heading', { name: 'Fundamentos' })).toBeVisible()

  await trocarPara(page, 'EN')

  await expect(page).toHaveURL(/\/en\/roadmap$/)
  await expect(page.getByRole('heading', { name: 'Fundamentals' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tactics' })).toBeVisible()
  // O nó continua sendo o mesmo — o que muda é o nome que ele mostra.
  await expect(page.getByRole('heading', { name: 'Fork', exact: true })).toBeVisible()
})

test('TESTE F — o tema sobrevive à troca de idioma', async ({ page }) => {
  await page.goto('/dashboard')
  await page.getByRole('button', { name: /Trocar para escuro/ }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await trocarPara(page, 'EN')

  // Tema e idioma são preferências independentes. Uma não pode zerar a outra.
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('TESTE G — o idioma sobrevive ao recarregamento', async ({ page }) => {
  await page.goto('/dashboard')
  await trocarPara(page, 'EN')
  await expect(page).toHaveURL(/\/en\/today$/)

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  // E o cookie manda mesmo quando a URL não diz nada: voltar à raiz sem prefixo
  // não pode trazer o português de volta, senão a escolha não foi lembrada.
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('a URL explícita ganha da preferência gravada', async ({ page }) => {
  await page.goto('/dashboard')
  await trocarPara(page, 'EN')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  // Link compartilhado em português, com cookie dizendo inglês: a URL manda.
  // Sem isto, um link enviado a alguém abriria no idioma de quem recebeu.
  await page.goto('/dashboard')
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
})

test('o estado ativo do seletor não depende só de cor', async ({ page }) => {
  await page.goto('/dashboard')
  const pt = seletor(page).getByRole('link', { name: 'Português (Brasil)' })
  const en = seletor(page).getByRole('link', { name: 'English' })

  await expect(pt).toHaveAttribute('aria-current', 'true')
  await expect(en).not.toHaveAttribute('aria-current', 'true')
})

test('o idioma vale para a lição, não só para a navegação', async ({ page }) => {
  // O endereço canônico em inglês: `jornada` vira `journey`.
  await page.goto('/en/lessons/journey/candidatos')

  await expect(page.getByTestId('trilha-da-jornada')).toContainText('Stage 1 of 3')
  await expect(page.getByRole('list', { name: 'Stages in this topic' })).toBeVisible()
})
