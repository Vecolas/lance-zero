/**
 * A ABA REVISAR, ponta a ponta.
 *
 * O QUE ESTE ARQUIVO PROTEGE. A aba "Treinar" era um roteador — seis blocos,
 * cinco só apontando para lugares que já existiam. No lugar entrou a casa da
 * revisão espaçada, que é um princípio inegociável do produto e não tinha casa
 * nenhuma: era uma linha dentro do hub levando a uma fila sem contexto.
 *
 * O CASO MAIS IMPORTANTE é `TESTE HISTÓRICO`. Ele prova que o histórico vem do
 * `ReviewLog` gravado no banco, e não de `localStorage` — o app gravava esses
 * logs com o desfecho de cada revisão DESDE SEMPRE e nunca os lia. A prova é o
 * recarregamento: `localStorage` sobreviveria a ele, mas o resumo efêmero que a
 * sessão montava era apagado quando a fila terminava.
 */

import { expect, test, type Page } from '@playwright/test'

/** Erra um puzzle de propósito, que é como um card de revisão nasce. */
async function errarUmPuzzle(page: Page) {
  await page.goto('/puzzles')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page
    .getByRole('button', { name: /Desistir|Ver a solução/ })
    .first()
    .click()
}

test('TESTE CASA — Revisar mostra os blocos, e nenhum tabuleiro', async ({ page }) => {
  await page.goto('/revisao')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Revisar')

  /*
    ABRIR A ABA NÃO DISPARA EXERCÍCIO. Herdada do hub, e é a razão de ele ter
    existido: `/train` abria uma posição direto, sem o aluno escolher nada.
  */
  await expect(page.locator('[data-testid="chessboard"]')).toHaveCount(0)

  for (const titulo of [
    'O que vem',
    'De onde vem o que você revisa',
    'Voltando a cair',
    'Já revisado',
    'Como a revisão funciona aqui',
  ]) {
    await expect(page.getByRole('heading', { name: titulo })).toBeVisible()
  }
})

test('TESTE VAZIO — sem nada vencido, o botão fica visível e diz por quê', async ({ page }) => {
  await page.goto('/revisao')

  await expect(page.getByText('Nada vencido agora')).toBeVisible()
  /*
    O BOTÃO NÃO SOME. Escondê-lo faria a tela parecer quebrada — o aluno chega na
    aba de revisar e não encontra como revisar. Inerte com o motivo ao lado, ele
    ENSINA a regra em vez de só bloquear.
  */
  await expect(page.getByText('Revisar agora')).toBeVisible()
  await expect(page.getByText(/Antecipar revisão não ajuda a fixar/)).toBeVisible()

  // E os blocos admitem o vazio sem fingir dado.
  await expect(page.getByText(/Nada voltando a cair/)).toBeVisible()
  await expect(page.getByText(/Nenhuma revisão ainda/)).toBeVisible()
})

test('TESTE SESSÃO — o erro vira card, a casa o anuncia, e a sessão volta para cá', async ({
  page,
}) => {
  await errarUmPuzzle(page)

  await page.goto('/revisao')
  // A contagem é o que o botão promete, e ela passa pela MESMA elegibilidade que
  // a fila aplica — o hub antigo contava cru e podia prometer mais do que abria.
  await expect(
    page.getByRole('heading', { name: /revisão vencida|revisões vencidas/ }),
  ).toBeVisible()
  // E a origem diz de onde aquele card veio, em vez de ser um número solto.
  await expect(page.getByText('Tática que você errou')).toBeVisible()

  await page.getByRole('link', { name: /Revisar agora/ }).click()
  await expect(page).toHaveURL(/\/revisao\/sessao$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sessão de revisão')
  await expect(page.locator('[data-testid="chessboard"]').first()).toBeVisible()
})

test('TESTE HISTÓRICO — a sessão revisada sobrevive ao recarregamento', async ({ page }) => {
  await errarUmPuzzle(page)

  await page.goto('/revisao/sessao')
  await expect(page.locator('[data-testid="chessboard"]').first()).toBeVisible()

  // Declara esquecimento e dá a nota: é o caminho mais curto até um `ReviewLog`.
  await page.getByRole('button', { name: 'Não lembro' }).click()
  await page.getByRole('button', { name: 'Errei' }).click()

  /*
    ESPERA A FILA FECHAR ANTES DE NAVEGAR.

    Dar a nota dispara `saveReviewCard` + `saveReviewLog` no IndexedDB, e sair da
    página no mesmo instante corre com a gravação. Numa execução isolada isso
    passa por sorte; com a suíte inteira competindo por CPU, não. O resumo da
    sessão é o sinal de que a fila terminou — e ele só aparece depois da nota.
  */
  await expect(page.getByTestId('resumo-da-revisao')).toBeVisible()

  await page.goto('/revisao')
  const historico = page.locator('section', {
    has: page.getByRole('heading', { name: 'Já revisado' }),
  })
  await expect(historico.getByText(/1 item/)).toBeVisible()

  /*
    O RECARREGAMENTO É A PROVA. O resumo que a sessão montava vivia em
    `localStorage` e era APAGADO quando a fila terminava. Este sobrevive porque
    vem do `ReviewLog`, que está no IndexedDB desde sempre — e que nenhuma tela
    lia até agora.
  */
  await page.reload()
  await expect(historico.getByText(/1 item/)).toBeVisible()
})

test('TESTE REDIRECIONAMENTO — os endereços antigos continuam abrindo', async ({ page }) => {
  /*
    `/train` esteve na navegação desde a fase 5 e está no SHELL do service
    worker; `/train/revisao` é o href que os PLANOS JÁ GRAVADOS guardam. Um 404
    aqui transformaria renomear uma aba em perder acesso — e faria o card
    "Revisões vencidas" de ontem quebrar hoje.
  */
  await page.goto('/train')
  await expect(page).toHaveURL(/\/revisao$/)

  await page.goto('/train/revisao')
  await expect(page).toHaveURL(/\/revisao\/sessao$/)

  await page.goto('/train/pratica/tactics.fork')
  await expect(page).toHaveURL(/\/pratica\/tactics\.fork$/)
})

test('TESTE IDIOMA — a aba inteira fala inglês', async ({ page }) => {
  await page.goto('/en/review')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Review')
  await expect(page.getByRole('heading', { name: 'What is coming' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Already reviewed' })).toBeVisible()
  await expect(page.getByText('Nothing due right now')).toBeVisible()

  // E nada de português sobrou.
  await expect(page.getByText('Nada vencido agora')).toHaveCount(0)
})
