/**
 * PRATICAR A ABERTURA CONTRA O COMPUTADOR.
 *
 * O QUE ELA OFERECE que a jornada não oferecia: repetição livre. A jornada
 * ensina uma vez, em sequência, e termina — quem quer jogar a Italiana dez vezes
 * seguidas, que é como um repertório entra na cabeça, não tinha onde.
 *
 * O CASO MAIS IMPORTANTE é `TESTE FORA DO REPERTÓRIO`. Ele afirma que o app NÃO
 * chama de errado um lance que ele não conferiu: sair da abertura estudada pode
 * ser um lance excelente, e o que o app sabe é só que o bot não sabe respondê-lo
 * por ali. Chamar isso de erro seria a explicação inventada que o projeto
 * proíbe.
 */

import { expect, test, type Page } from '@playwright/test'

/**
 * Leva a jornada até o fim, para o sparring aparecer.
 *
 * O SPARRING SÓ É OFERECIDO A QUEM CONCLUIU. Praticar contra o bot sem ter visto
 * a linha vira tentativa e erro contra um adversário que sabe a resposta — a
 * forma mais rápida de o aluno concluir que não entende a abertura.
 */
async function concluirAJornada(page: Page) {
  await page.goto('/aberturas/italiana')

  for (let i = 0; i < 40; i += 1) {
    const sparring = page.getByRole('heading', { name: 'Praticar contra o computador' })
    if (await sparring.isVisible().catch(() => false)) return

    const tabuleiro = page.locator('[data-testid="chessboard"][data-interactive="true"]').first()
    if (await tabuleiro.isVisible().catch(() => false)) {
      // Etapa que cobra lance: joga o primeiro legal. O objetivo aqui é
      // atravessar, e não acertar — quem mede acerto são os outros arquivos.
      const fen = await tabuleiro.getAttribute('data-fen')
      if (fen) {
        const casas = await page
          .locator('[id^="lancezero-board-square-"]')
          .evaluateAll((nos) => nos.map((no) => no.id.replace('lancezero-board-square-', '')))
        if (casas.length > 0) {
          await page.locator('#lancezero-board-square-' + casas[0]).click()
        }
      }
    }

    const continuar = page.getByRole('button', { name: /Continuar/ }).first()
    if (!(await continuar.isVisible().catch(() => false))) break
    if (await continuar.isDisabled().catch(() => true)) break
    await continuar.click()
    await page.waitForTimeout(120)
  }
}

test('TESTE SPARRING — a prática só aparece depois de concluir', async ({ page }) => {
  await page.goto('/aberturas/italiana')

  // Na primeira etapa ele não existe: o estudo vem antes da repetição livre.
  await expect(page.getByRole('heading', { name: 'Praticar contra o computador' })).toHaveCount(0)
})

/*
  OS CASOS DO ESTADO CONCLUÍDO MORAM EM `tests/unit/sparring-tela.test.tsx`.

  Eles estiveram aqui e ficavam PULADOS: chegar ao fim da jornada pelo e2e exige
  cumprir a cobertura do treino final, e o ajudante que atravessa etapas não tem
  como fazer isso jogando lances arbitrários. Um teste que nunca roda passa para
  sempre sem provar nada — pior que não existir, porque parece coberto.

  O que ficou aqui é o que só o e2e consegue afirmar: que o sparring NÃO aparece
  antes da conclusão.
*/
