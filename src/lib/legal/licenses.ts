/**
 * Inventário de licenças exibido em /licenses.
 *
 * Regra do projeto: nenhuma dependência entra sem uma linha aqui e em
 * `docs/LICENSES.md`.
 */
export interface DependencyLicense {
  name: string
  version?: string
  license: string
  reason: string
  url: string
}

export const runtimeDependencies: DependencyLicense[] = [
  {
    name: 'Next.js',
    version: '16.3.4',
    license: 'MIT',
    reason: 'Framework de aplicação, roteamento e build.',
    url: 'https://github.com/vercel/next.js',
  },
  {
    name: 'React / React DOM',
    version: '19.2.8',
    license: 'MIT',
    reason: 'Camada de interface.',
    url: 'https://github.com/facebook/react',
  },
  {
    name: 'chess.js',
    version: '1.4.0',
    license: 'BSD-2-Clause',
    reason: 'Regras, geração de lances legais, FEN e PGN.',
    url: 'https://github.com/jhlywa/chess.js',
  },
  {
    name: 'react-chessboard',
    version: '5.12.1',
    license: 'MIT',
    reason: 'Componente de tabuleiro. Escolhido no lugar do Chessground para não herdar GPL.',
    url: 'https://github.com/Clariity/react-chessboard',
  },
  {
    name: 'Stockfish 18 (stockfish.js)',
    version: '18.0.8 — build lite single-threaded',
    license: 'GPL-3.0',
    reason:
      'Engine de análise em WebAssembly. Distribuída sem modificação e isolada em public/engine/stockfish/, com COPYING.txt e SOURCE.txt.',
    url: 'https://github.com/nmrugg/stockfish.js',
  },
  {
    name: 'ts-fsrs',
    version: '5.4.2',
    license: 'MIT',
    reason: 'Agendamento de revisão espaçada.',
    url: 'https://github.com/open-spaced-repetition/ts-fsrs',
  },
  {
    name: 'TypeScript',
    version: '5.9.3',
    license: 'Apache-2.0',
    reason: 'Tipagem estática do domínio e da UI.',
    url: 'https://github.com/microsoft/TypeScript',
  },
  {
    name: 'Vitest',
    version: '5.0.0',
    license: 'MIT',
    reason: 'Testes unitários e de componente.',
    url: 'https://github.com/vitest-dev/vitest',
  },
  {
    name: 'Playwright',
    version: '1.63.0',
    license: 'Apache-2.0',
    reason: 'Testes end-to-end em desktop e mobile.',
    url: 'https://github.com/microsoft/playwright',
  },
  {
    name: 'Testing Library',
    license: 'MIT',
    reason: 'Testes de componente orientados a acessibilidade.',
    url: 'https://github.com/testing-library/react-testing-library',
  },
  {
    name: 'ESLint + eslint-config-next',
    license: 'MIT',
    reason: 'Análise estática.',
    url: 'https://github.com/eslint/eslint',
  },
  {
    name: 'Prettier',
    version: '3.9.6',
    license: 'MIT',
    reason: 'Formatação consistente.',
    url: 'https://github.com/prettier/prettier',
  },
  {
    name: 'Inter',
    license: 'SIL Open Font License 1.1',
    reason: 'Tipografia de interface, servida localmente pelo next/font.',
    url: 'https://github.com/rsms/inter',
  },
]

export const plannedDependencies: DependencyLicense[] = [
  {
    name: 'Lichess puzzle database',
    license: 'CC0-1.0',
    reason: 'Base de puzzles táticos. Fase 3.',
    url: 'https://database.lichess.org/#puzzles',
  },
  {
    name: 'chess-openings (Lichess)',
    license: 'CC0-1.0',
    reason: 'Nomes e códigos ECO de aberturas. Fase 9.',
    url: 'https://github.com/lichess-org/chess-openings',
  },
]
