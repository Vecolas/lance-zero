/**
 * Roda os testes end-to-end contra o BUILD DE PRODUÇÃO.
 *
 * Existe como script em vez de `E2E_TARGET=prod playwright test` porque essa
 * sintaxe não funciona no PowerShell, e um comando que só roda em um shell vira
 * um comando que ninguém roda.
 *
 * Por que importa: a CSP de desenvolvimento é deliberadamente mais frouxa (o
 * runtime do Next precisa de `unsafe-eval` e de websocket). Uma violação que só
 * existe em produção passaria despercebida se todo e2e rodasse em `next dev`.
 */
import { spawn } from 'node:child_process'

const args = process.argv.slice(2)
const filho = spawn('pnpm', ['exec', 'playwright', 'test', ...args], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, E2E_TARGET: 'prod' },
})

filho.on('exit', (code) => process.exit(code ?? 1))
