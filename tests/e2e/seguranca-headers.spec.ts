/**
 * Headers de segurança e CSP num navegador de verdade.
 *
 * O teste unitário prova que a política tem o texto certo. Ele não prova o que
 * importa de fato: que o browser aceita a política sem reclamar e que o
 * Stockfish continua carregando debaixo dela. CSP é exatamente o tipo de coisa
 * que passa no unitário e quebra a engine em produção.
 *
 * Por isso aqui há três perguntas:
 *   1. os headers chegam nas respostas?
 *   2. a engine ainda acha o mate em 1 com a CSP ligada?
 *   3. o console fica limpo de violação de CSP ao navegar pelo app?
 *
 * A pergunta 3 é a que segura o rollout da seção 62 do plano: só se vira a
 * política para enforcing quando não sobra violação.
 */

import { expect, test, type Page } from '@playwright/test'
import { buildContentSecurityPolicy } from '../../src/lib/security/headers'

/** Mate do pastor: 1.Qxf7# na notação UCI é `f3f7`. Igual ao `engine.spec.ts`. */
const FEN_MATE_EM_1 = 'rnbqkbnr/pppp1ppp/8/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1'

/** Baixar e instanciar ~7 MB de WASM leva alguns segundos em máquina fria. */
const ESPERA_ENGINE = 120_000

const ROTAS = ['/', '/dashboard', '/puzzles', '/debug/engine'] as const

/** Espelha `playwright.config.ts`: `E2E_TARGET=prod` roda contra `next build`. */
const EM_PRODUCAO = process.env.E2E_TARGET === 'prod'

test.setTimeout(180_000)

/**
 * Uma violação de CSP aparece no console como "Refused to ..." citando a
 * política; em report-only vem prefixada por "[Report Only]".
 *
 * O casamento é por menção à Content Security Policy, para não confundir com
 * qualquer outro erro de console (que não é assunto deste arquivo).
 */
function ehViolacaoDeCsp(texto: string): boolean {
  return /content security policy/i.test(texto)
}

/** Passa a coletar violações de CSP da página, na ordem em que aparecem. */
function coletarViolacoes(page: Page): string[] {
  const violacoes: string[] = []
  page.on('console', (msg) => {
    const texto = msg.text()
    if (ehViolacaoDeCsp(texto)) violacoes.push(texto)
  })
  // O evento DOM pega também o que o browser reporta sem escrever no console.
  page.on('pageerror', (erro) => {
    if (ehViolacaoDeCsp(erro.message)) violacoes.push(erro.message)
  })
  return violacoes
}

test.describe('headers de segurança', () => {
  for (const rota of ['/', '/dashboard'] as const) {
    test(`a resposta de ${rota} traz os headers do plano`, async ({ page }) => {
      const resposta = await page.goto(rota)
      expect(resposta, `sem resposta para ${rota}`).not.toBeNull()

      const headers = resposta!.headers()

      expect(headers['x-content-type-options']).toBe('nosniff')
      expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
      expect(headers['x-frame-options']).toBe('DENY')
      expect(headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()')

      // Rollout da seção 62: report-only é o padrão. Se alguém ligar o
      // enforcing, o header muda de nome mas a política tem de continuar lá.
      const csp =
        headers['content-security-policy-report-only'] ?? headers['content-security-policy']
      expect(csp, 'nenhuma CSP na resposta').toBeTruthy()
      expect(csp).toContain("default-src 'self'")
      expect(csp).toContain("frame-ancestors 'none'")
      expect(csp).toContain("object-src 'none'")
      expect(csp).toContain("worker-src 'self' blob:")
      expect(csp).toContain("'wasm-unsafe-eval'")
      expect(csp).not.toContain('script-src *')

      // Amarra o header servido ao módulo de política: se alguém escrever uma
      // CSP à mão no `next.config.ts`, este teste acusa em vez de deixar duas
      // fontes de verdade divergirem em silêncio.
      //
      // A variante depende do alvo: `next dev` serve a política de
      // desenvolvimento, que é mais frouxa de propósito. Rode com
      // `E2E_TARGET=prod` para exercitar a política que vai para produção — é
      // a única que importa quando a CSP virar enforcing.
      expect(csp).toBe(buildContentSecurityPolicy({ reportOnly: false, development: !EM_PRODUCAO }))
    })
  }

  test('HSTS não promete preload em desenvolvimento', async ({ page }) => {
    const resposta = await page.goto('/')
    const hsts = resposta!.headers()['strict-transport-security']
    // Em `next dev` o header nem é enviado (o browser o ignoraria sob http).
    // Se estiver presente, jamais pode pedir preload — ver seção 64.
    if (hsts !== undefined) expect(hsts).not.toContain('preload')
  })
})

test('a engine continua achando o mate em 1 com a CSP ligada', async ({ page }) => {
  const violacoes = coletarViolacoes(page)

  await page.goto('/debug/engine')
  await expect(page.getByRole('heading', { name: 'Bancada da engine' })).toBeVisible()

  await page.getByLabel('FEN', { exact: true }).fill(FEN_MATE_EM_1)
  await page.getByRole('button', { name: 'Analisar', exact: true }).click()

  await expect(page.getByTestId('engine-melhor-lance')).toHaveText('f3f7', {
    timeout: ESPERA_ENGINE,
  })
  await expect(page.getByTestId('engine-erro')).toHaveCount(0)

  // O WASM e o Web Worker são o ponto mais frágil da política: se algo aqui
  // reclamou, a política está errada — não o teste.
  expect(violacoes, `violações de CSP na engine:\n${violacoes.join('\n')}`).toEqual([])
})

test('navegar pelo app não gera nenhuma violação de CSP', async ({ page }) => {
  const violacoes = coletarViolacoes(page)

  for (const rota of ROTAS) {
    await page.goto(rota)
    // Espera a página realmente montar: violação de CSP costuma acontecer na
    // hidratação, não no HTML servido.
    await expect(page.getByRole('heading').first()).toBeVisible()
    await expect(page.locator('body')).toBeVisible()
  }

  expect(violacoes, `violações de CSP ao navegar:\n${violacoes.join('\n')}`).toEqual([])
})
