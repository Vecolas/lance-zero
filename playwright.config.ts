import { defineConfig, devices } from '@playwright/test'

const PORT = 3210
const BASE_URL = `http://localhost:${PORT}`
const PROD = process.env.E2E_TARGET === 'prod'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  /**
   * DOIS workers localmente, e o número é MEDIDO, não escolhido por gosto.
   *
   * Quatro specs sobem a Stockfish de verdade (`engine`, `partidas`, `pipeline`,
   * `seguranca-headers`), em dois projetos cada. O build é WASM lite
   * single-threaded: a suíte é limitada por CPU, não por espera de rede, e o
   * paralelismo padrão do Playwright (metade dos núcleos) põe os workers para
   * disputar o mesmo processador.
   *
   * O sintoma não é lentidão: é a engine reprovando com "não respondeu `uciok` a
   * tempo" — o handshake estourando 15 s porque o WASM não consegue subir. Lê-se
   * como defeito da engine e não é.
   *
   * Medido nesta máquina (6 núcleos), suíte inteira:
   *   4 workers -> 3 falhas, 4,8 min
   *   3 workers (padrão) -> 1 falha, 5,7 min
   *   2 workers -> 0 falhas, 3,2 min
   *
   * Menos paralelismo saiu mais verde E mais rápido, porque os specs de engine
   * pararam de se atropelar. No CI já era 1 por outro motivo (a máquina é menor),
   * e é por isso que o CI nunca viu esta falha.
   */
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    /**
     * Os specs de acessibilidade rodam em UM projeto só, e o `testIgnore`
     * abaixo é o que garante isso.
     *
     * CADA PROJETO NOVO MULTIPLICA A SUÍTE INTEIRA. Com dois projetos e dois
     * workers ela leva ~2,3 min; um terceiro projeto irrestrito somaria toda a
     * suíte de novo, e quatro specs dela sobem a Stockfish (ver a nota sobre
     * `workers` acima) — repetir isso em 360 px custaria minutos para medir
     * exatamente o que já foi medido em 393.
     *
     * A troca feita, com os olhos abertos: em 360 px roda a VARREDURA de
     * refluxo e de contraste, que passa por TODAS as telas principais, e não os
     * fluxos funcionais. FICA DE FORA de 360, e não adianta fingir que não:
     * resolver puzzle, importar partida por Lichess/Chess.com, o pipeline de
     * engine, os cabeçalhos de segurança e a troca de tema. Se um desses tiver
     * um defeito que só aparece a 360 e não a 393, esta matriz não o encontra.
     */
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /a11y-.*\.spec\.ts$/,
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
      testIgnore: /a11y-.*\.spec\.ts$/,
    },
    {
      /**
       * 360 px é a régua escrita no CLAUDE.md ("360px viewport"), e até a issue
       * #75 o e2e mais estreito rodava em 393 (Pixel 5).
       *
       * Os specs de contraste sobrescrevem este viewport de propósito: medem em
       * 360 E em desktop, porque abaixo de 60rem o app troca a navegação
       * lateral pela barra inferior — são composições diferentes.
       */
      name: 'acessibilidade-360',
      use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 740 } },
      testMatch: /a11y-.*\.spec\.ts$/,
    },
  ],
  webServer: {
    /**
     * `E2E_TARGET=prod` roda contra o build de produção.
     *
     * Não é preciosismo: a CSP de desenvolvimento é mais frouxa de propósito
     * (o runtime do Next precisa de `unsafe-eval` e de websocket), então uma
     * violação que só existe em produção passaria despercebida se todo e2e
     * rodasse em `next dev`. Ver `src/lib/security/headers.ts`.
     */
    command: PROD
      ? `pnpm exec next build && pnpm exec next start --port ${PORT}`
      : `pnpm exec next dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: PROD ? 300_000 : 120_000,
  },
})
