/**
 * Ponta a ponta da ENTRADA POR TECLADO na fila de revisão (issue #67).
 *
 * O QUE SÓ ESTE ARQUIVO PROVA, e nenhum teste de unidade alcança: que dá para
 * chegar ao campo de lance e responder um card USANDO SÓ O TECLADO, no
 * navegador de verdade, com a ordem de foco e o `Tab` reais. O teste de unidade
 * chama a função do campo direto; ele nunca soube se alguém consegue CHEGAR até
 * lá. Era exatamente esse o buraco: a tela existia, o `onMove` existia, e a
 * pessoa que não usa mouse não conseguia responder nada.
 *
 * A REGRA DESTE ARQUIVO: no teste do percurso completo não há um clique de
 * mouse. Nem para abrir a lição, nem para trocar de página, nem para dar a
 * nota. `page.keyboard` e nada mais — porque um único `click()` no meio do
 * caminho esconderia justamente o degrau que falta.
 *
 * A FILA PRECISA DE UM CARD, e ele nasce de uma tentativa de final que não
 * cumpre o objetivo (é o mesmo caminho de `finais.spec.ts`). Semear o
 * IndexedDB por fora seria mais rápido e provaria menos: amarraria o teste ao
 * esquema do banco em vez de ao produto.
 *
 * DECISÃO: a tablebase é abortada em TODO teste. Sem isso o resultado
 * dependeria de a rede estar de pé, e teste que passa em quatro execuções de
 * cinco não é portão, é sorteio.
 *
 * O QUE ELE NÃO PROVA: promoção menor (não há card de promoção no currículo —
 * quem cobre isso é `tests/unit/review-entrada-por-teclado.test.tsx`), contraste
 * e aparência do anel de foco (só que ele existe e se move), e leitor de tela de
 * verdade.
 *
 * CUIDADO conhecido: o anunciador de rota do Next tem `role="alert"` e colide
 * com o modo estrito do Playwright. Nada aqui mira por `role="alert"`.
 */

import { expect, test, type Locator, type Page } from '@playwright/test'

const ROTA_TABLEBASE = 'https://tablebase.lichess.ovh/**'

/** A posição de mate em 1 do currículo, e os dois lances que importam nela. */
const MATE_EM_1 = /O rei preto já está no canto/
const LANCE_CERTO = 'b1b8'
const LANCE_QUE_FALHA = 'b1b2'

/** O campo da fila de revisão. O rótulo é o nome acessível INTEIRO. */
function campoDaRevisao(page: Page): Locator {
  return page.getByLabel('Lance em UCI', { exact: true })
}

async function semTablebase(page: Page): Promise<void> {
  await page.route(ROTA_TABLEBASE, (rota) => rota.abort())
}

/**
 * Aperta `Tab` até o alvo receber o foco.
 *
 * O laço é o teste: ele prova que o elemento é ALCANÇÁVEL na ordem de foco do
 * documento, e não só que ele existe no DOM. Um campo com `tabindex="-1"`, ou
 * escondido atrás de um `inert`, passaria em qualquer consulta por rótulo e
 * reprovaria aqui — que é o defeito que a issue descreve.
 */
async function tabAte(page: Page, alvo: Locator, limite = 120): Promise<number> {
  await alvo.waitFor({ state: 'attached' })
  for (let passos = 0; passos <= limite; passos += 1) {
    if (await alvo.evaluate((elemento) => elemento === document.activeElement)) {
      return passos
    }
    await page.keyboard.press('Tab')
  }
  throw new Error(`O alvo não recebeu foco em ${limite} tabulações: não dá para chegar nele.`)
}

/**
 * Deixa um card vencido na fila, pelo caminho do produto.
 *
 * Usa mouse de propósito: aqui o percurso não é o que está sob teste, e um
 * caminho de preparação mais curto deixa o teste do teclado falando de uma
 * coisa só.
 */
async function semearCardDeRevisao(page: Page): Promise<void> {
  await page.goto('/endgames')
  await page.getByRole('button', { name: MATE_EM_1 }).click()
  await page.getByLabel(/Lance em UCI/).fill(LANCE_QUE_FALHA)
  await page.getByRole('button', { name: 'Jogar lance' }).click()
  await expect(page.getByText(/já está vencida e aparece no treino de hoje/)).toBeVisible()
  await page.goto('/train/revisao')
  await expect(page.getByText(/Jogue o primeiro lance da técnica/)).toBeVisible()
}

test('responder um card de revisão SÓ pelo teclado, sem um clique de mouse', async ({ page }) => {
  await semTablebase(page)

  // ---- semear a fila, também sem mouse ----
  await page.goto('/endgames')
  const licao = page.getByRole('button', { name: MATE_EM_1 })
  await tabAte(page, licao)
  await page.keyboard.press('Enter')

  const campoDoFinal = page.getByLabel(/Lance em UCI/)
  await tabAte(page, campoDoFinal)
  await page.keyboard.type(LANCE_QUE_FALHA)
  await page.keyboard.press('Enter')
  await expect(page.getByText(/já está vencida e aparece no treino de hoje/)).toBeVisible()

  // Troca de página pelo teclado: o link que a própria tela oferece. Ele aponta
  // para `/train/revisao` desde que `/train` virou hub — ver EndgameTrainer.
  const paraOTreino = page.getByRole('link', { name: 'Revisar agora' })
  await tabAte(page, paraOTreino)
  await page.keyboard.press('Enter')

  // ---- a revisão ----
  await expect(page.getByText(/Jogue o primeiro lance da técnica/)).toBeVisible()

  const campo = campoDaRevisao(page)
  await tabAte(page, campo)
  // O anel de foco é visível: o `outline` global desenha em quem está focado.
  await expect(campo).toBeFocused()

  await page.keyboard.type(LANCE_CERTO)
  await page.keyboard.press('Enter')

  await expect(page.getByText('Você lembrou o lance desta posição.')).toBeVisible()

  const nota = page.getByRole('button', { name: 'Bom' })
  await tabAte(page, nota)
  await page.keyboard.press('Enter')

  // A revisão FOI REGISTRADA: é o desfecho, não só uma faixa verde na tela.
  await expect(page.getByText(/1 revisão concluída/)).toBeVisible()
})

test('o campo tem rótulo próprio e ajuda associada, sem inchar o nome acessível', async ({
  page,
}) => {
  await semTablebase(page)
  await semearCardDeRevisao(page)

  const campo = campoDaRevisao(page)
  await expect(campo).toBeVisible()

  // A ajuda existe, está associada por `aria-describedby` e NÃO está no rótulo:
  // se estivesse, o nome acessível cresceria e a consulta exata acima falharia.
  const descrito = await campo.getAttribute('aria-describedby')
  expect(descrito, 'campo sem descrição associada').not.toBeNull()
  const ajuda = page.locator(`#${descrito}`)
  await expect(ajuda).toContainText('cavalo')
  await expect(ajuda).toContainText('torre')
})

test('lance ilegal digitado é recusado com frase, e a revisão continua', async ({ page }) => {
  await semTablebase(page)
  await semearCardDeRevisao(page)

  const campo = campoDaRevisao(page)
  await campo.fill('a1a2')
  await page.keyboard.press('Enter')

  // Recusa COM FRASE, nomeando as casas.
  await expect(page.getByText(/a1a2 não é um lance legal nesta posição/)).toBeVisible()
  // A tentativa CONTINUA: nada de nota, e o campo segue aberto.
  await expect(page.getByRole('button', { name: 'Não lembro' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Bom' })).toBeHidden()
  await expect(campo).toBeEnabled()

  // E o lance certo ainda entra depois da recusa.
  await campo.fill(LANCE_CERTO)
  await page.keyboard.press('Enter')
  await expect(page.getByText('Você lembrou o lance desta posição.')).toBeVisible()
})

test('texto que não é lance recebe a frase da forma, não silêncio', async ({ page }) => {
  await semTablebase(page)
  await semearCardDeRevisao(page)

  await campoDaRevisao(page).fill('torre pra oitava')
  await page.keyboard.press('Enter')

  // A frase da RECUSA, e não a da ajuda: as duas falam de casa de origem, e
  // mirar no trecho comum casaria com as duas de uma vez.
  await expect(page.getByText(/Escreva o lance como casa de origem/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Não lembro' })).toBeVisible()
})
