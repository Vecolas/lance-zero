/**
 * TEXTO VAZANDO: o portão que faltava.
 *
 * O DEFEITO QUE ORIGINOU ESTE ARQUIVO era visível e nenhum teste o via. O canto
 * direito do cabeçalho era posicionado por cima do conteúdo, com o espaço dele
 * reservado por um `padding-right` FIXO — a largura do botão de tema, e só dele.
 * Quando "Conta" e o seletor de idioma entraram naquele canto, o grupo ficou
 * muito mais largo que o reservado e imprimiu sobre a navegação: em inglês,
 * "Library" e "Account" saíam um sobre o outro.
 *
 * POR QUE O PORTÃO DE 360 px NÃO PEGOU. Ele mede uma coisa diferente e mais
 * grosseira: se a PÁGINA INTEIRA rola na horizontal. Um elemento que transborda
 * a própria caixa sem empurrar o documento passa por lá intacto — e é assim que
 * quase todo vazamento se parece.
 *
 * O QUE SE MEDE AQUI é `scrollWidth > clientWidth` em elemento cujo `overflow-x`
 * é visível. A ressalva importa: tabela larga dentro do seu próprio contêiner
 * com `overflow-x: auto` é o padrão CERTO do projeto (a página de licenças faz
 * isso) e não pode reprovar — ali o transbordo é intencional e rolável.
 *
 * NOS DOIS IDIOMAS, e é o ponto. A largura do texto é o que empurra um layout, e
 * ela muda de idioma para idioma: "Finais" tem 6 caracteres e "Endgames" tem 8,
 * mas "Treinar" vira "Train". Nenhum dos dois é o pior caso do outro.
 *
 * O QUE ELE NÃO PROVA: que a tela ficou boa. Texto espremido em uma palavra por
 * linha passa por aqui — ele cabe. Isso continua exigindo olho humano.
 */

import { expect, test, type Page } from '@playwright/test'

/**
 * As rotas, aos pares onde o par existe.
 *
 * A lista em inglês é menor porque boa parte do conteúdo ainda não foi traduzida
 * (ver `docs/i18n-audit.md`) — nas telas de fora, medir o inglês seria medir o
 * mesmo português de novo.
 */
const ROTAS = [
  '/dashboard',
  '/en/today',
  '/revisao',
  '/roadmap',
  '/en/roadmap',
  '/lessons',
  '/en/lessons',
  '/aberturas',
  '/en/openings',
  '/finais',
  '/en/endgames',
  '/settings',
  '/account',
  '/en/account',
  '/games',
] as const

/**
 * As larguras.
 *
 * 360 é a régua do CLAUDE.md. 768 é onde a navegação de topo ainda está
 * escondida mas o conteúdo já tem duas colunas. 1280 é o desktop — e foi
 * justamente lá, a largura mais folgada de todas, que o cabeçalho vazou: o
 * defeito não era falta de espaço, era espaço reservado à mão.
 */
const LARGURAS = [360, 768, 1280] as const

/** Elementos cujo conteúdo não cabe na própria caixa, e que não rolam. */
async function vazamentos(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('body *')]
      .filter((el) => {
        const caixa = el.getBoundingClientRect()
        if (caixa.width === 0 || caixa.height === 0) return false
        const estilo = getComputedStyle(el)
        // Quem rola de propósito está certo: o transbordo ali é alcançável.
        if (estilo.overflowX !== 'visible' && estilo.overflowX !== 'clip') return false
        // 1px de folga: subpixel de borda arredondada não é vazamento.
        return el.scrollWidth > el.clientWidth + 1
      })
      .slice(0, 5)
      .map((el) => {
        const texto = (el.textContent ?? '').trim().slice(0, 40)
        return `<${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 40)}"> ${el.scrollWidth}px em ${el.clientWidth}px — "${texto}"`
      }),
  )
}

for (const largura of LARGURAS) {
  test(`TESTE VAZAMENTO — nada transborda a própria caixa em ${largura} px`, async ({ page }) => {
    // Um projeto só: a medida é da largura declarada aqui, e rodá-la nos três
    // projetos mediria a mesma coisa três vezes com nomes diferentes.
    test.skip(test.info().project.name !== 'desktop', 'a largura vem do caso, não do projeto')
    test.slow()

    await page.setViewportSize({ width: largura, height: 800 })
    const achados: string[] = []

    for (const rota of ROTAS) {
      await page.goto(rota)
      /*
        Esperar a MARCA e não um texto qualquer: ela é a única coisa que existe
        em toda rota antes de qualquer leitura de IndexedDB. `exact` porque um
        card do Treinar tem "LanceZero" no meio da frase, e sem isso o seletor
        encontra dois links e o teste reprova por ambiguidade — não por layout.
      */
      await expect(page.getByRole('link', { name: 'LanceZero', exact: true })).toBeVisible()
      for (const vazando of await vazamentos(page)) achados.push(`${rota}: ${vazando}`)
    }

    expect(achados, `texto vazando da própria caixa:\n${achados.join('\n')}`).toEqual([])
  })
}
