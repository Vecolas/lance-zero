import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Config separada para os testes de CONTRATO COM SERVIÇO REAL.
 *
 * Eles ficam fora de `pnpm test` de propósito: dependem de rede e de um serviço
 * de terceiro. Portão que pisca vermelho sem culpa do código treina todo mundo
 * a ignorar vermelho.
 *
 * Config própria em vez de `--include` na linha de comando porque glob entre
 * aspas já chegou literal ao vitest neste projeto rodando no Windows — e o
 * sintoma foi "0 arquivos, tudo certo", que é o pior tipo de verde.
 *
 * Ambiente `node`: aqui queremos o `fetch` de verdade, não o do jsdom.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/contrato/**/*.test.ts'],
    // Uma requisição por vez, como manda a orientação oficial da Lichess.
    fileParallelism: false,
    maxConcurrency: 1,
  },
})
