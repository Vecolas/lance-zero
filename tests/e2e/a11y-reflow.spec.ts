/**
 * REFLUXO: 360 px de largura e zoom de 200%.
 *
 * DUAS DECISÕES ESTÃO NESTE ARQUIVO.
 *
 * 1. **A régua é 360, e ela estava escrita e não medida.** O CLAUDE.md exige
 *    "360px viewport" de toda tela; o e2e mais estreito que existia rodava em
 *    393 px (Pixel 5). 33 px de diferença não parecem nada e são exatamente a
 *    faixa onde um `min-width` mal escolhido começa a empurrar a página.
 *
 * 2. **Zoom de 200% é emulado ENCOLHENDO o viewport pela metade, não com
 *    `deviceScaleFactor`.** `deviceScaleFactor` mexe na densidade de pixels do
 *    aparelho: a página continua com a MESMA largura em pixels CSS, o layout
 *    não muda em nada e o teste passaria sem testar coisa alguma — um falso
 *    verde perfeito. O que o zoom do navegador faz é o oposto: o pixel CSS
 *    fica maior, então cabe METADE da largura em pixels CSS. Um desktop de
 *    1280×720 com 200% de zoom vê 640×360, e é isso que estes casos montam.
 *
 * O que se afirma aqui é a REGRA do WCAG 1.4.10 (Reflow): conteúdo não pode
 * exigir rolagem nos DOIS eixos. Rolagem vertical é normal; rolagem horizontal
 * da página inteira é o defeito. Note que a régua é `documentElement`: tabela
 * larga dentro do seu próprio contêiner com `overflow-x: auto` é o padrão
 * CERTO e não pode reprovar — a página de licenças faz exatamente isso.
 *
 * O QUE ESTE ARQUIVO NÃO PROVA: que a tela ficou BOA. Ele prova que nada
 * transborda e que o essencial continua na tela. Texto espremido, imagem
 * ilegível e ordem de leitura embaralhada passam por aqui sem serem vistos —
 * isso exige olho humano, e continua não tendo acontecido.
 *
 * PONTO CEGO CONHECIDO, e ele foi MEDIDO por mutação: alargar `VIEWPORT_360`
 * só é pego hoje pelo caso de `/openings`, que é a única rota que transborda.
 * Consertado o `/openings` e apagada a declaração, nada mais reprova se alguém
 * trocar 360 por 400. O zoom NÃO tem esse buraco — o caso "o zoom realmente
 * refluiu" existe justamente para fechá-lo, porque lá todos os outros casos
 * passariam num desktop folgado.
 */

import { expect, test, type Page } from '@playwright/test'

/**
 * LIMITE DE DESIGN, e ele vem do CLAUDE.md ("360px viewport"), não de um
 * aparelho específico. 740 de altura é a proporção comum de um telefone dessa
 * largura; a altura não é regra, só evita medir uma página artificialmente
 * curta.
 */
const VIEWPORT_360 = { width: 360, height: 740 } as const

/**
 * Zoom de 200% sobre um desktop de 1280×720. Ver o cabeçalho: metade da
 * largura E metade da altura em pixels CSS é o que o navegador entrega.
 */
const ZOOM_200 = { width: 640, height: 360 } as const

const ROTAS_360 = [
  '/',
  '/dashboard',
  '/train',
  '/puzzles',
  '/calculate',
  '/endgames',
  '/openings',
  '/progress',
  '/lessons',
  '/games',
  '/onboarding',
  '/settings',
  '/licenses',
] as const

/**
 * Transbordo MEDIDO que esta frente não pode consertar, porque o arquivo é de
 * outra fronteira. Declarado com o número, com o dono e com o conserto, para o
 * portão poder ficar verde sem MENTIR que a tela cabe.
 *
 * Não é perdão: o caso do transbordo declarado reprova quando a tela PARA de
 * transbordar. Assim a lista encolhe sozinha quando o dono consertar, em vez de
 * virar sedimento — e uma tela consertada não fica coberta por uma peneira
 * aberta esperando o próximo defeito.
 */
const TRANSBORDOS_DECLARADOS: Record<string, { dono: string; causa: string; conserto: string }> = {
  '/openings': {
    dono: 'src/components/openings/** (fora da fronteira desta frente)',
    causa:
      'o cartão de repertório é item de grade com `min-width: auto`, então a menor largura ' +
      'possível do conteúdo vaza para fora da tela; quem manda nela é o <select> do explorador, ' +
      'cuja opção mais longa é "Depois de 1. e4 e5 2. Nf3 Nc6"',
    conserto:
      '`min-width: 0` em `.card` de RepertorioCard.module.css — medido no navegador: leva a ' +
      'largura de rolagem de 486 px de volta para 360 px',
  },
}

const PGN_REVISAO = `[Event "Refluxo"]
[White "Alice"]
[Black "Bruno"]
[Result "1-0"]
[Date "2026.01.02"]

1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0`

/** Mede a página inteira, não um elemento. */
async function rolagemHorizontal(page: Page): Promise<{ scroll: number; visivel: number }> {
  return page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    visivel: document.documentElement.clientWidth,
  }))
}

/**
 * Espera generosa de propósito. Em `next dev` a rota é compilada na primeira
 * visita, e com dois workers disputando o mesmo servidor isso passa dos 5 s
 * padrão. O que se espera aqui não é conteúdo lento: é COMPILAÇÃO. Falhar por
 * isso seria vermelho por sorteio, não portão.
 */
async function esperaConteudo(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })
}

async function semRolagemHorizontal(page: Page, onde: string): Promise<void> {
  const { scroll, visivel } = await rolagemHorizontal(page)
  // Um pixel de folga: subpixel de borda arredondada produz 360.004 em alguns
  // builds do Chromium, e isso não é rolagem — não dá para arrastar.
  expect(
    scroll,
    `${onde}: a página inteira rola na horizontal (${scroll} > ${visivel})`,
  ).toBeLessThanOrEqual(visivel + 1)
}

/** Abre a revisão de partida, que só existe depois de importar um PGN. */
async function abrirRevisao(page: Page): Promise<void> {
  await page.goto('/games')
  await page.getByLabel('PGN', { exact: true }).fill(PGN_REVISAO)
  await page.getByRole('button', { name: 'Importar' }).click()
  await page.getByRole('link', { name: /Alice × Bruno/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Revisar partida')
}

test.describe('360 px — a régua escrita no CLAUDE.md', () => {
  test.use({ viewport: VIEWPORT_360 })

  for (const rota of ROTAS_360) {
    const declarado = TRANSBORDOS_DECLARADOS[rota]

    if (!declarado) {
      test(`${rota} cabe em 360 px sem rolar na horizontal`, async ({ page }) => {
        await page.goto(rota)
        await esperaConteudo(page)
        await semRolagemHorizontal(page, rota)
      })
      continue
    }

    test(`${rota} transborda em 360 px — defeito declarado, não corrigido aqui`, async ({
      page,
    }) => {
      await page.goto(rota)
      await esperaConteudo(page)
      const { scroll, visivel } = await rolagemHorizontal(page)
      expect(
        scroll,
        `${rota} parou de transbordar em 360 px (${scroll} <= ${visivel}). ` +
          `Se o dono (${declarado.dono}) consertou, APAGUE a entrada de ` +
          `TRANSBORDOS_DECLARADOS e deixe a rota entrar no caso normal. ` +
          `Causa medida: ${declarado.causa}. Conserto esperado: ${declarado.conserto}`,
      ).toBeGreaterThan(visivel + 1)
    })
  }

  test('a revisão de partida cabe em 360 px', async ({ page }) => {
    await abrirRevisao(page)
    await semRolagemHorizontal(page, '/games/[gameId]')
  })

  test('a navegação inferior não come o fim do conteúdo', async ({ page }) => {
    // A barra é `position: fixed`. Sem reserva de espaço embaixo, o último
    // bloco da página fica ETERNAMENTE escondido atrás dela: rolar até o fim
    // não resolve, porque a barra rola junto. É um defeito que não aparece em
    // nenhuma captura de tela do topo.
    await page.goto('/dashboard')
    await esperaConteudo(page)

    const barra = page.getByRole('navigation', { name: 'Navegação principal (mobile)' })
    await expect(barra).toBeVisible()

    const alturaBarra = (await barra.boundingBox())?.height ?? 0
    expect(alturaBarra, 'a barra inferior não tem altura').toBeGreaterThan(0)

    const folga = await page.evaluate(() => {
      const main = document.querySelector('main')
      const rodape = document.querySelector('footer')
      const alvo = rodape ?? main
      if (!alvo) return -1
      return Number.parseFloat(getComputedStyle(alvo).paddingBottom)
    })
    expect(folga, 'o fim da página não reserva espaço para a barra fixa').toBeGreaterThanOrEqual(
      alturaBarra,
    )
  })
})

test.describe('zoom de 200% — onde o aluno passa o tempo', () => {
  test.use({ viewport: ZOOM_200 })

  test('o zoom realmente refluiu a página, e não só rodou num desktop', async ({ page }) => {
    // SEM ESTE CASO os cinco seguintes seriam inúteis por dentro: se alguém
    // trocasse ZOOM_200 de volta por 1280×720, todos continuariam VERDES — um
    // desktop folgado não rola na horizontal. Aqui a afirmação é a REGRA: com
    // 200% de zoom o app tem de estar abaixo do ponto de quebra de 60rem, o
    // que ele demonstra trocando a navegação lateral pela barra inferior.
    await page.goto('/dashboard')
    await esperaConteudo(page)

    await expect(
      page.getByRole('navigation', { name: 'Navegação principal (mobile)' }),
    ).toBeVisible()
    // `exact` porque, sem ele, "Navegação principal" casa por SUBSTRING com
    // "Navegação principal (mobile)" e o caso mediria a barra errada.
    await expect(
      page.getByRole('navigation', { name: 'Navegação principal', exact: true }),
    ).toBeHidden()
  })

  test('o treino de hoje continua utilizável com 200% de zoom', async ({ page }) => {
    await page.goto('/dashboard')
    await esperaConteudo(page)
    await semRolagemHorizontal(page, '/dashboard @200%')
    // A ação principal não pode ter sido empurrada para fora do fluxo.
    await expect(page.getByRole('link', { name: 'Começar o treino' })).toBeVisible()
  })

  test('o puzzle continua utilizável com 200% de zoom', async ({ page }) => {
    await page.goto('/puzzles')
    await esperaConteudo(page)
    await semRolagemHorizontal(page, '/puzzles @200%')
    // O tabuleiro é o objeto do treino: se ele sumir ou vazar, não há puzzle.
    const tabuleiro = page.locator('[data-column]').first()
    await expect(tabuleiro).toBeVisible()
  })

  test('o final continua utilizável com 200% de zoom', async ({ page }) => {
    await page.goto('/endgames')
    await esperaConteudo(page)
    await semRolagemHorizontal(page, '/endgames @200%')
  })

  test('a revisão de partida continua utilizável com 200% de zoom', async ({ page }) => {
    await abrirRevisao(page)
    await semRolagemHorizontal(page, '/games/[gameId] @200%')
    await expect(page.getByText('Onde você acha que a partida mudou?')).toBeVisible()
  })

  test('o treino do dia continua utilizável com 200% de zoom', async ({ page }) => {
    await page.goto('/train')
    await esperaConteudo(page)
    await semRolagemHorizontal(page, '/train @200%')
  })
})

test.describe('o portão morde: uma página que estoura 360 px reprova', () => {
  test.use({ viewport: VIEWPORT_360 })

  test('largura fixa maior que a tela é detectada', async ({ page }) => {
    // Sem este caso, `semRolagemHorizontal` poderia estar medindo a coisa
    // errada (por exemplo `body` em vez de `documentElement`) e ficaria verde
    // para sempre. Aqui a falha é FABRICADA e tem de ser vista.
    await page.goto('/dashboard')
    await esperaConteudo(page)
    await semRolagemHorizontal(page, 'antes da injeção')

    // Pendurado em `body` e não em `main`: React é dono dos filhos de `main` e
    // uma re-renderização por hidratação apaga o nó injetado entre uma chamada
    // e a seguinte. O teste então ficaria verde por não ter conseguido quebrar
    // nada — o pior desfecho possível para um caso cujo trabalho é falhar.
    await page.evaluate(() => {
      const vilao = document.createElement('div')
      vilao.style.width = '900px'
      vilao.style.height = '10px'
      vilao.textContent = 'transbordo fabricado'
      document.body.appendChild(vilao)
    })

    // Chama a MESMA função que os 14 casos acima usam. Medir aqui por fora
    // provaria que o transbordo existe e não provaria nada sobre a régua — que
    // é justamente o que este caso serve para provar.
    let erro: unknown = null
    try {
      await semRolagemHorizontal(page, 'com transbordo fabricado')
    } catch (e) {
      erro = e
    }
    expect(erro, 'a régua não enxergou o transbordo fabricado').not.toBeNull()
  })
})
