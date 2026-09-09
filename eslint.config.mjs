import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Artefatos GPL do Stockfish: código de terceiros, distribuído sem modificação.
    'public/engine/**',
    // Saída do Playwright.
    'test-results/**',
    'playwright-report/**',
  ]),
])

export default eslintConfig
