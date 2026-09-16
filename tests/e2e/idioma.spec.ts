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

/**
 * As caixas visíveis do cabeçalho, para a checagem de sobreposição.
 *
 * Só o que ESTÁ NA TELA entra: abaixo de 60 rem a navegação de topo é escondida
 * por CSS, e contar retângulos de largura zero produziria pares "sobrepostos"
 * que ninguém vê.
 */
async function caixasDoCabecalho(page: Page) {
  return page.locator('header a, header button, header [role="group"]').evaluateAll((nos) =>
    nos
      .map((no) => {
        const r = no.getBoundingClientRect()
        return {
          texto: (no.textContent ?? no.getAttribute('aria-label') ?? '').trim().slice(0, 30),
          ...r.toJSON(),
        }
      })
      .filter((c) => c.width > 0 && c.height > 0),
  )
}

/** Pares que se cruzam, ignorando quem contém quem (grupo e seus filhos). */
function sobreposicoes(caixas: Awaited<ReturnType<typeof caixasDoCabecalho>>) {
  const pares: string[] = []
  for (let i = 0; i < caixas.length; i += 1) {
    for (let j = i + 1; j < caixas.length; j += 1) {
      const a = caixas[i]
      const b = caixas[j]
      const contido =
        (a.left <= b.left && a.right >= b.right && a.top <= b.top && a.bottom >= b.bottom) ||
        (b.left <= a.left && b.right >= a.right && b.top <= a.top && b.bottom >= a.bottom)
      if (contido) continue
      // 1px de folga: arredondamento de subpixel não é sobreposição.
      const cruza =
        a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1
      if (cruza) pares.push(`"${a.texto}" × "${b.texto}"`)
    }
  }
  return pares
}

/*
  O PORTÃO DO VAZAMENTO, e ele existe por um defeito real.

  O canto direito do cabeçalho era `position: absolute`, e o espaço dele era
  reservado com um `padding-right` FIXO — a largura do botão de tema, e só dele.
  Quando "Conta" e o seletor de idioma entraram naquele canto, o grupo ficou muito
  mais largo que o reservado e imprimiu por cima da navegação: em inglês,
  "Library" e "Account" saíam um sobre o outro.

  Medir à mão uma largura que muda com o idioma é o defeito, não o número errado.
  Este teste mede o desenho em vez de confiar na conta — e mede NOS DOIS IDIOMAS,
  porque foi o inglês, mais largo, que revelou o problema.
*/
for (const { nome, url } of [
  { nome: 'português', url: '/dashboard' },
  { nome: 'inglês', url: '/en/today' },
]) {
  test(`TESTE VAZAMENTO — nada se sobrepõe no cabeçalho em ${nome}`, async ({ page }) => {
    await page.goto(url)
    await expect(page.getByRole('link', { name: 'LanceZero' })).toBeVisible()

    const cruzados = sobreposicoes(await caixasDoCabecalho(page))
    expect(
      cruzados,
      `elementos do cabeçalho impressos um sobre o outro: ${cruzados.join(', ')}`,
    ).toEqual([])
  })
}

test('TESTE CONTA — o atalho é o ícone mais à direita, e diz o próprio nome', async ({ page }) => {
  await page.goto('/en/today')

  /*
    ÍCONE SEM RÓTULO É ADIVINHAÇÃO. O desenho virou símbolo, mas o nome acessível
    continua sendo palavra — e palavra no idioma da tela, que era exatamente o
    que faltava: a Conta era o único item da casca que não trocava de idioma.
  */
  const conta = page.getByRole('link', { name: 'Account', exact: true })
  await expect(conta).toBeVisible()
  await expect(page.getByRole('link', { name: 'Conta', exact: true })).toHaveCount(0)

  // MAIS À DIREITA: nenhum outro controle do cabeçalho começa depois dele.
  const caixas = await caixasDoCabecalho(page)
  const direitaDaConta = await conta.evaluate((el) => el.getBoundingClientRect().right)
  const maiorDireita = Math.max(...caixas.map((c) => c.right))
  expect(Math.round(direitaDaConta)).toBe(Math.round(maiorDireita))
})

/*
  O E2E RODA SEM SUPABASE, e por isso a tela de Conta cai no estado
  "indisponível" — que é justamente o caminho que este teste consegue provar de
  ponta a ponta. Os textos do formulário (e-mail, senha, "Esqueci a senha") vêm
  do mesmo bloco `account` do dicionário e são cobertos pelo portão de chaves em
  `tests/unit/i18n.test.ts`, que reprova se um idioma tiver chave que o outro não
  tem ou se a frase em inglês tiver ficado idêntica à portuguesa.
*/
test('TESTE CONTA — a tela inteira fala o idioma escolhido', async ({ page }) => {
  await page.goto('/en/account')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Account')
  // O painel era a maior exceção do app: estava inteiro em português fixo.
  await expect(page.getByRole('heading', { name: 'Online account unavailable' })).toBeVisible()
  await expect(page.getByText(/Conta online indisponível/)).toHaveCount(0)
  await expect(page.getByText(/Ajustes/)).toHaveCount(0)

  await page.goto('/account')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Conta')
  await expect(page.getByRole('heading', { name: 'Conta online indisponível' })).toBeVisible()
})
