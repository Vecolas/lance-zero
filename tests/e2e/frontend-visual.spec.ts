import { expect, test } from '@playwright/test'

const ROTAS = [
  '/dashboard',
  '/revisao',
  '/aberturas',
  '/aberturas/italiana?mode=learn',
  '/aberturas/italiana?mode=train',
  '/endgames',
  '/endgames/mate-de-dama',
  '/progress',
  '/settings',
] as const
const VIEWPORTS = [
  { nome: 'mobile', width: 360, height: 800 },
  { nome: 'tablet', width: 768, height: 1024 },
  { nome: 'desktop-curto', width: 1280, height: 800 },
  { nome: 'desktop', width: 1440, height: 900 },
] as const

test.describe('QA visual do frontend', () => {
  test('rotas principais não criam overflow e mantêm landmarks', async ({ page }, testInfo) => {
    /*
      ELE É LEGITIMAMENTE LENTO: são 40 navegações e 40 capturas de página
      inteira, em quatro viewports. Sozinho leva ~50s; dividindo a máquina com o
      resto da suíte, o dobro disso é normal. O relógio generoso é para medir
      layout, e não a contenção de CPU da máquina de quem roda.
    */
    test.setTimeout(300_000)

    /*
      AQUECER AS ROTAS ANTES DE MEDIR, e isto não é paciência: é a correção de
      uma instabilidade real.

      O servidor de desenvolvimento compila cada rota NO PRIMEIRO ACESSO. Com a
      suíte inteira rodando em paralelo, uma navegação podia cair no meio de uma
      compilação — e o Next devolvia a própria tela de erro, sem `h1` nenhum. O
      sintoma era um `SyntaxError: Unexpected end of JSON input` vindo de dentro
      do framework, com dezoito quadros ignorados na pilha: nada do app.

      O teste então reprovava por causa do relógio da máquina, e passava sozinho.
      Teste que passa em quatro execuções de cinco não é portão — é sorteio.

      Com a volta de aquecimento, toda rota já está compilada quando a medição
      começa, e o que sobra medido é o layout, que é o que este arquivo existe
      para medir.
    */
    for (const rota of ROTAS) {
      /*
        O aquecimento não MEDE nada, mas precisa TERMINAR. Com `commit` ele
        devolvia assim que a resposta começava, e a última rota ainda estava
        renderizando quando o laço trocava a viewport para 360 px — o layout
        medido logo depois era o de uma página no meio da troca, e o overflow
        acusado não existia na tela parada.

        `load` sem asserção de `h1` é o meio-termo: espera a página assentar, e
        não paga o preço de procurar um elemento que o aquecimento não usa.
      */
      await page.goto(rota, { waitUntil: 'load' })
    }

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })

      /*
        MEDIR E FOTOGRAFAR SÃO DUAS PASSADAS, e a separação é a correção de um
        defeito que este teste tinha contra si mesmo.

        `page.screenshot({ fullPage: true })` expande a área de renderização para
        caber a página inteira — e a rota NAVEGADA EM SEGUIDA herdava essa
        largura. Em 360 px, `/aberturas/italiana?mode=learn` acusava
        `scrollWidth` 389 logo depois da captura de `/aberturas`, e 360 quando
        medida sozinha. Está medido: o mesmo laço sem capturas não acusa nada, e
        com capturas acusa na hora.

        Reafirmar a viewport com o MESMO tamanho não desfazia — para o Playwright
        é um no-op. Tirar as fotos só depois de todas as medições desfaz, porque
        aí nenhuma captura acontece antes de uma medição.

        O teste estava mandando consertar uma tela que está certa, que é a pior
        espécie de portão: ele gasta o tempo de quem confia nele.
      */
      for (const rota of ROTAS) {
        await page.goto(rota, { waitUntil: 'load' })
        await expect(page.locator('h1').first()).toBeVisible({ timeout: 30_000 })
        // A fonte da marca muda a largura do texto ao carregar. Medir antes dela
        // mede uma tela que o aluno nunca vê.
        await page.evaluate(() => document.fonts.ready)
        /*
          O PORTÃO NOMEIA O CULPADO. "Alguma coisa ultrapassa a viewport" manda
          quem lê abrir o navegador e caçar; o elemento, a largura e a borda
          direita dizem onde mexer. Um portão que acusa sem apontar gasta o tempo
          de quem confia nele.
        */
        const layout = await page.evaluate(() => {
          const culpados: string[] = []
          document.querySelectorAll('*').forEach((el) => {
            const r = el.getBoundingClientRect()
            if (r.width > 0 && r.right > window.innerWidth + 1) {
              const classe = (el.className || '').toString().slice(0, 40)
              culpados.push(`${el.tagName}.${classe} right=${Math.round(r.right)}`)
            }
          })
          return {
            overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
            largura: document.documentElement.scrollWidth,
            viewport: window.innerWidth,
            culpados: culpados.slice(0, 5),
          }
        })
        expect(
          layout.overflow,
          `${rota} em ${viewport.nome} ultrapassa a viewport: ${layout.largura}px contra ${layout.viewport}px — ${layout.culpados.join(' | ') || 'nenhum elemento identificado'}`,
        ).toBe(false)
        await expect(page.locator('main')).toBeVisible()
      }

      for (const rota of ROTAS) {
        await page.goto(rota, { waitUntil: 'load' })
        await expect(page.locator('h1').first()).toBeVisible({ timeout: 30_000 })
        const arquivo = rota.slice(1).replace(/[/?&=]/g, '-') || 'home'
        const destino = process.env.SAVE_FRONTEND_BASELINES
          ? `docs/frontend-baselines/${viewport.nome}-${arquivo}.png`
          : testInfo.outputPath(`frontend-${viewport.nome}-${arquivo}.png`)
        await page.screenshot({ path: destino, fullPage: true })
      }
    }
  })
})
