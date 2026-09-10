import { expect, test, type Page } from '@playwright/test'
import { feedbackToneCatalog } from '../../src/lib/design/feedback'
import { MAX_HINT_LEVEL } from '../../src/domain/puzzles/hints'
import { INDEXEDDB_CONFIG, STORES } from '../../src/lib/storage/indexeddb-repository'

/**
 * O texto do desfecho vem do CATÁLOGO, não escrito à mão aqui.
 *
 * Antes da issue #61 este arquivo mirava "Não saiu desta vez", que era desenho
 * próprio da tela de puzzles. Cravar a palavra aqui de novo faria o e2e
 * DEFENDER a divergência: mudar o tom no catálogo deixaria a suíte vermelha e
 * quem corrigisse concluiria que a correção é que estava errada.
 */
const ESTADO_INCORRETO = feedbackToneCatalog.incorreto.label

/**
 * Lê as tentativas de puzzle GRAVADAS pelo app, no IndexedDB do navegador.
 *
 * Existe por causa da issue #66: a versão anterior deste arquivo conferia o
 * contador de dicas do RÓTULO DO BOTÃO, que era desenhado por estado local da
 * tela. Enquanto o registro gravava `hintsUsed: 0`, o e2e passava — ele
 * confirmava o número da tela, não o que foi gravado, e assim DEFENDIA o
 * defeito. O nome do banco e do object store vêm do próprio módulo de
 * persistência, nunca copiados aqui.
 */
async function tentativasGravadas(
  page: Page,
): Promise<Array<{ hintsUsed: number; firstTry: boolean; solved: boolean }>> {
  return page.evaluate(
    ({ databaseName, store }) =>
      new Promise((resolve, reject) => {
        const aberta = indexedDB.open(databaseName)
        aberta.onerror = () => reject(new Error('não consegui abrir o banco local'))
        aberta.onsuccess = () => {
          const db = aberta.result
          if (!db.objectStoreNames.contains(store)) {
            reject(new Error(`object store ausente: ${store}`))
            return
          }
          const pedido = db.transaction(store, 'readonly').objectStore(store).getAll()
          pedido.onerror = () => reject(new Error('não consegui ler as tentativas'))
          pedido.onsuccess = () => resolve(pedido.result)
        }
      }),
    { databaseName: INDEXEDDB_CONFIG.databaseName, store: STORES.puzzleAttempts },
  )
}

test('o tema não aparece antes da resposta', async ({ page }) => {
  await page.goto('/puzzles')

  await expect(page.getByText(/Puzzle 1 de \d+/)).toBeVisible()
  await expect(page.getByText(/Pense primeiro/)).toBeVisible()

  // Recuperação antes de explicação: nada de motivo nem de solução na tela.
  await expect(page.getByText('O que era')).toBeHidden()
  await expect(page.getByText(/^Solução:/)).toBeHidden()
})

test('as dicas escalam e a primeira não entrega o lance', async ({ page }) => {
  await page.goto('/puzzles')

  await page.getByRole('button', { name: 'Dica' }).click()
  const primeira = await page
    .getByText(/Dica|peça|casa/)
    .first()
    .textContent()
  // Nível 1 é categoria de pensamento: não pode conter notação algébrica.
  expect(primeira ?? '').not.toMatch(/\b[a-h][1-8]\b/)

  await expect(
    page.getByRole('button', { name: new RegExp(`\\(1/${MAX_HINT_LEVEL}\\)`) }),
  ).toBeVisible()
})

test('a dica pedida na tela é a dica gravada na tentativa', async ({ page }) => {
  await page.goto('/puzzles')

  const dica = page.getByRole('button', { name: /dica/i })
  for (let pedidas = 0; pedidas < MAX_HINT_LEVEL; pedidas += 1) {
    await expect(dica, `a dica ${pedidas + 1} deveria estar disponível`).toBeEnabled()
    await dica.click()
  }

  // O `disabled` vem de `nextHintLevel(tentativa)`: ele só fica nulo se as
  // dicas tiverem chegado ao domínio. Antes da #66 dava para pedir dica sem fim.
  await expect(dica).toBeDisabled()

  // Encerrar a tentativa é o que a manda para o disco.
  await page.getByRole('button', { name: 'Desistir' }).click()
  await expect(page.getByText('O que era')).toBeVisible()

  await expect
    .poll(async () => (await tentativasGravadas(page)).length, {
      message: 'a tentativa não chegou ao banco local',
    })
    .toBe(1)

  const [registro] = await tentativasGravadas(page)
  expect(registro.hintsUsed, 'a tela e o registro discordam sobre as dicas').toBe(MAX_HINT_LEVEL)
  expect(registro.firstTry).toBe(false)
})

test('desistir revela a solução e oferece o próximo', async ({ page }) => {
  await page.goto('/puzzles')

  await page.getByRole('button', { name: 'Desistir' }).click()

  await expect(page.getByText(ESTADO_INCORRETO)).toBeVisible()
  await expect(page.getByText('O que era')).toBeVisible()
  await expect(page.getByText(/^Solução:/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Próximo puzzle|Encerrar sessão/ })).toBeVisible()
})

test('o erro vira card de revisão em /train', async ({ page }) => {
  await page.goto('/puzzles')
  await page.getByRole('button', { name: 'Desistir' }).click()
  await expect(page.getByText('O que era')).toBeVisible()

  await page.goto('/train')
  // O card criado pelo puzzle está vencido agora, então a fila não está vazia.
  await expect(page.getByText(/Revisão 1 de/)).toBeVisible()
  await expect(page.getByText(/errou este padrão antes/)).toBeVisible()

  // A revisão usa a MESMA faixa da tela de puzzles: é isso que a #61 fechou.
  await page.getByRole('button', { name: 'Não lembro' }).click()
  await expect(page.getByText(ESTADO_INCORRETO)).toBeVisible()
  await expect(page.getByText(/O lance certo era/)).toBeVisible()
})
