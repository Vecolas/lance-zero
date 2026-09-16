/**
 * Ponta a ponta da regra central: "Aprender" abre o conteúdo exato.
 *
 * O QUE SÓ ESTE ARQUIVO PROVA. Os testes de unidade provam que o roteador
 * devolve o endereço certo; eles não provam que o CARD usa o roteador. Foi
 * exatamente essa fresta que produziu o defeito: a resolução existia em algum
 * lugar, e o card decidia por conta própria com um `?? '/lessons'` no fim da
 * linha. Aqui o teste clica no que o aluno clica e confere onde ele chega.
 *
 * NENHUM TESTE AQUI PROCURA NA BIBLIOTECA. Se um deles precisasse, a regra já
 * estaria quebrada.
 */

import { expect, test, type Page } from '@playwright/test'

/** Abre o Roadmap e espera a lista de nós existir de fato. */
async function abrirRoadmap(page: Page): Promise<void> {
  await page.goto('/roadmap')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Roadmap')
  await expect(page.getByRole('heading', { name: 'Fundamentos' })).toBeVisible()
}

/** O card de um nó, achado pelo título — é como o aluno o acha. */
function card(page: Page, titulo: string) {
  return page.locator('article').filter({ has: page.getByRole('heading', { name: titulo }) })
}

test('TESTE A — "Peças indefesas" abre a lição, e não a biblioteca', async ({ page }) => {
  await abrirRoadmap(page)

  await card(page, 'Pecas indefesas').getByRole('link').click()

  await expect(page).toHaveURL(/\/lessons\/peca-pendurada$/)
  /*
    Chegou NA lição: o título dela está na tela, e não uma lista de cartões.

    A asserção é pelo CABEÇALHO e não por texto solto. Com a lição ganhando
    endereço próprio ela ganhou também `<title>`, e o anunciador de rota do Next
    passou a repetir o mesmo texto num `role="alert"` — dois nós, e o texto solto
    virou ambíguo. O cabeçalho é o que o aluno vê; o anunciador é para leitor de
    tela.
  */
  await expect(
    page.getByRole('heading', { name: 'A peça que ninguém está defendendo' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: /^Lição: / })).toHaveCount(0)
})

test('TESTE B — "Geracao de candidatos" abre a primeira lição da jornada', async ({ page }) => {
  await abrirRoadmap(page)

  await card(page, 'Geracao de candidatos').getByRole('link').click()

  await expect(page).toHaveURL(/\/lessons\/jornada\/candidatos$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Geração de candidatos')
  // A sequência é visível: três etapas, e a primeira é a que está aberta.
  await expect(page.getByTestId('trilha-da-jornada')).toContainText('Etapa 1 de 3')
  await expect(page.getByText('Xeques, capturas e ameaças').first()).toBeVisible()
})

test('TESTE E — "Abertura Italiana" abre a jornada da Italiana', async ({ page }) => {
  await abrirRoadmap(page)

  await card(page, 'Abertura Italiana').getByRole('link').click()

  await expect(page).toHaveURL(/\/aberturas\/italiana/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Abertura Italiana')
})

test('TESTE F — "Oposição" abre a jornada de final da oposição', async ({ page }) => {
  await abrirRoadmap(page)

  await card(page, 'Oposição').getByRole('link').click()

  await expect(page).toHaveURL(/\/finais\/oposicao/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Oposição')
})

test('TESTE G — o modo de reaprendizado é DITO ao chegar', async ({ page }) => {
  // O deep link é o que o card gera quando o nó pede reaprendizado; o teste o
  // usa direto porque produzir um estado de reaprendizado real exigiria errar a
  // habilidade em partida — que é o que o teste do planner já cobre.
  await page.goto('/aberturas/italiana?modo=reaprender')

  await expect(page.getByTestId('modo-de-aprendizado')).toContainText(/voltou a falhar/)
  // E continua sendo o conteúdo certo, não uma tela de aviso.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Abertura Italiana')
})

test('nó sem conteúdo NÃO oferece um link genérico', async ({ page }) => {
  await abrirRoadmap(page)

  const semConteudo = card(page, 'Posto avancado')
  await expect(semConteudo.getByTestId('sem-conteudo')).toContainText(
    'ainda não possui uma lição disponível',
  )
  // O ponto inteiro: não há para onde clicar. Antes havia, e levava à
  // biblioteca inteira.
  await expect(semConteudo.getByRole('link')).toHaveCount(0)
})

test('NENHUM card do Roadmap leva à biblioteca genérica', async ({ page }) => {
  await abrirRoadmap(page)

  const destinos = await page
    .locator('article a')
    .evaluateAll((links) =>
      links.map((link) => (link as HTMLAnchorElement).getAttribute('href') ?? ''),
    )

  expect(destinos.length).toBeGreaterThan(20)
  const genericos = destinos.filter((href) => href === '/lessons' || href === '/licoes')
  expect(genericos, `cards apontando para a biblioteca: ${genericos.join(', ')}`).toEqual([])
})

test('a biblioteca continua existindo para exploração livre', async ({ page }) => {
  // §25 do plano: o que muda é o Roadmap parar de usá-la como roteador, não a
  // biblioteca deixar de existir.
  await page.goto('/lessons')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Biblioteca de lições')
  /*
    O CARD INTEIRO É O LINK, e por isso a asserção mudou de botão para link.

    O "Abrir lição" que existia aqui era um botão dentro de um card que não
    levava a lugar nenhum sozinho: o alvo de clique era pequeno no celular e o
    resto do card — título, descrição, prévia — não fazia nada. Cartão de
    biblioteca É um destino; o elemento inteiro ser o link é o que diz isso.
  */
  await expect(page.getByRole('link', { name: /^Lição: / }).first()).toBeVisible()
})
