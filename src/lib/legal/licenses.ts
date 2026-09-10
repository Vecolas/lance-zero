/**
 * Inventário de licenças exibido em /licenses.
 *
 * Regra do projeto: nenhuma dependência entra sem uma linha aqui e em
 * `docs/LICENSES.md`.
 *
 * O campo `ids` liga cada entrada desta página às linhas correspondentes do
 * documento, que é o inventário completo. É por ele que o portão
 * (`tests/unit/licencas-inventario.test.ts`) cruza os dois lados: os nomes não
 * batem de propósito — aqui se escreve para gente (`Next.js`), lá para o
 * `package.json` (`next`) — e a URL não desempata, porque três linhas apontam
 * para `https://lichess.org/api`.
 *
 * Uma entrada pode cobrir mais de uma linha do documento quando separá-las
 * pioraria a leitura pública sem melhorar o inventário (React e React DOM,
 * ESLint e o preset, a família Testing Library).
 */
export interface DependencyLicense {
  /** Linhas de `docs/LICENSES.md` que esta entrada representa. Nunca vazio. */
  ids: string[]
  name: string
  version?: string
  license: string
  reason: string
  url: string
}

export const runtimeDependencies: DependencyLicense[] = [
  {
    ids: ['next'],
    name: 'Next.js',
    version: '16.3.4',
    license: 'MIT',
    reason: 'Framework de aplicação, roteamento e build.',
    url: 'https://github.com/vercel/next.js',
  },
  {
    ids: ['react', 'react-dom'],
    name: 'React / React DOM',
    version: '19.2.8',
    license: 'MIT',
    reason: 'Camada de interface.',
    url: 'https://github.com/facebook/react',
  },
  {
    ids: ['chess-js'],
    name: 'chess.js',
    version: '1.4.0',
    license: 'BSD-2-Clause',
    reason: 'Regras, geração de lances legais, FEN e PGN.',
    url: 'https://github.com/jhlywa/chess.js',
  },
  {
    ids: ['react-chessboard'],
    name: 'react-chessboard',
    version: '5.12.1',
    license: 'MIT',
    reason: 'Componente de tabuleiro. Escolhido no lugar do Chessground para não herdar GPL.',
    url: 'https://github.com/Clariity/react-chessboard',
  },
  {
    ids: ['stockfish-js'],
    name: 'Stockfish 18 (stockfish.js)',
    version: '18.0.8 — build lite single-threaded',
    license: 'GPL-3.0',
    reason:
      'Engine de análise em WebAssembly. Distribuída sem modificação e isolada em public/engine/stockfish/, com COPYING.txt e SOURCE.txt.',
    url: 'https://github.com/nmrugg/stockfish.js',
  },
  {
    ids: ['ts-fsrs'],
    name: 'ts-fsrs',
    version: '5.4.2',
    license: 'MIT',
    reason: 'Agendamento de revisão espaçada.',
    url: 'https://github.com/open-spaced-repetition/ts-fsrs',
  },
  {
    ids: ['lichess-puzzle-db'],
    name: 'Lichess puzzle database',
    license: 'CC0-1.0',
    reason:
      'Base de puzzles táticos. O dump não é distribuído aqui: o pipeline de ingestão o consome e gera um recorte curado.',
    url: 'https://database.lichess.org/#puzzles',
  },
  {
    ids: ['lichess-api-partidas'],
    name: 'API de partidas do Lichess',
    license: 'Termos da API Lichess',
    reason:
      'Importação das suas partidas. Uma requisição por vez e espera de um minuto inteiro após HTTP 429.',
    url: 'https://lichess.org/api',
  },
  {
    ids: ['lichess-api-tablebase'],
    name: 'API de tablebase da Lichess',
    license: 'Termos da API Lichess',
    reason:
      'Defesa perfeita em finais de até 7 peças. Cache por FEN e degradação graciosa: tablebase fora do ar não quebra a lição.',
    url: 'https://lichess.org/api',
  },
  {
    ids: ['chesscom-pubapi'],
    name: 'Chess.com Published-Data API',
    license: 'Termos de uso Chess.com',
    reason: 'Importação das suas partidas, apenas pela API pública de leitura. Nunca por scraping.',
    url: 'https://www.chess.com/news/view/published-data-api',
  },
  {
    ids: ['zod'],
    name: 'Zod',
    version: '4.5.4',
    license: 'MIT',
    reason: 'Validação de entrada em tempo de execução, contra mass assignment.',
    url: 'https://github.com/colinhacks/zod',
  },
  {
    ids: ['supabase-js'],
    name: 'supabase-js',
    version: '2.116.0',
    license: 'MIT',
    reason: 'Cliente do Supabase. A autorização é feita pelo Postgres, via RLS.',
    url: 'https://github.com/supabase/supabase-js',
  },
  {
    ids: ['server-only'],
    name: 'server-only',
    version: '0.0.1',
    license: 'MIT',
    reason: 'Faz o build falhar se um módulo de servidor for importado no cliente.',
    url: 'https://www.npmjs.com/package/server-only',
  },
  {
    ids: ['typescript'],
    name: 'TypeScript',
    version: '5.9.3',
    license: 'Apache-2.0',
    reason: 'Tipagem estática do domínio e da UI.',
    url: 'https://github.com/microsoft/TypeScript',
  },
  {
    ids: ['vitest'],
    name: 'Vitest',
    version: '5.0.0',
    license: 'MIT',
    reason: 'Testes unitários e de componente.',
    url: 'https://github.com/vitest-dev/vitest',
  },
  {
    ids: ['playwright'],
    name: 'Playwright',
    version: '1.63.0',
    license: 'Apache-2.0',
    reason: 'Testes end-to-end em desktop e mobile.',
    url: 'https://github.com/microsoft/playwright',
  },
  {
    ids: ['testing-library-react', 'testing-library-jest-dom', 'testing-library-user-event'],
    name: 'Testing Library',
    license: 'MIT',
    reason: 'Testes de componente orientados a acessibilidade.',
    url: 'https://github.com/testing-library/react-testing-library',
  },
  {
    ids: ['eslint', 'eslint-config-next'],
    name: 'ESLint + eslint-config-next',
    license: 'MIT',
    reason: 'Análise estática.',
    url: 'https://github.com/eslint/eslint',
  },
  {
    ids: ['prettier'],
    name: 'Prettier',
    version: '3.9.6',
    license: 'MIT',
    reason: 'Formatação consistente.',
    url: 'https://github.com/prettier/prettier',
  },
  {
    ids: ['chess-openings'],
    name: 'chess-openings (Lichess)',
    version: 'recorte de 2026-09-09',
    license: 'CC0-1.0',
    reason:
      'Nomes e códigos ECO das aberturas. O LanceZero distribui um recorte curado, não o dump completo.',
    url: 'https://github.com/lichess-org/chess-openings',
  },
  {
    ids: ['inter'],
    name: 'Inter',
    license: 'SIL Open Font License 1.1',
    reason: 'Tipografia de interface, servida localmente pelo next/font.',
    url: 'https://github.com/rsms/inter',
  },
]

export const plannedDependencies: DependencyLicense[] = [
  {
    ids: ['lichess-api-opening-explorer'],
    name: 'API de Opening Explorer da Lichess',
    license: 'Termos da API Lichess',
    reason:
      'Estatísticas de aberturas a partir das partidas públicas do Lichess. Consultado sob demanda pela tela de aberturas — nenhuma consulta acontece sem ação do aluno. O serviço responde 401 a requisição anônima (ver issue #71), então na prática a tela funciona sem ele.',
    url: 'https://lichess.org/api',
  },
]
