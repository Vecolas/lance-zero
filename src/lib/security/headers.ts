/**
 * Headers de segurança e Content Security Policy do LanceZero.
 *
 * As políticas vivem aqui como DADOS, não como string solta dentro do
 * `next.config.ts`. O motivo é testabilidade: uma CSP escrita à mão no config
 * só pode ser conferida subindo o servidor, e erro de CSP é justamente o tipo
 * de coisa que passa despercebida até quebrar produção.
 *
 * Referências do plano de segurança:
 * seção 60 (CSP), 61 (Stockfish e CSP), 62 (rollout report-only),
 * 63 (headers), 64 (HSTS), 66 (CORS — nada de `Access-Control-Allow-Origin: *`).
 *
 * Regra que não se negocia: nunca `script-src *`. Cada afrouxamento abaixo tem
 * um comentário dizendo o que exatamente quebra sem ele.
 */

/** Par pronto para o `headers()` do Next. */
export interface SecurityHeader {
  key: string
  value: string
}

export interface CspOptions {
  /**
   * Só decide o NOME do header (`Content-Security-Policy-Report-Only` vs
   * `Content-Security-Policy`). O conteúdo da política é idêntico nos dois
   * modos, de propósito: se report-only relaxasse a política, o modo de
   * observação estaria observando outra coisa e o rollout da seção 62 não
   * provaria nada.
   */
  reportOnly: boolean
  /**
   * Servidor de desenvolvimento. Libera o estritamente necessário para o
   * hot reload do Next; nunca vale em produção. Ver `DIRETIVAS_DEV`.
   */
  development?: boolean
}

export const CSP_HEADER_ENFORCING = 'Content-Security-Policy'
export const CSP_HEADER_REPORT_ONLY = 'Content-Security-Policy-Report-Only'

/**
 * Origens externas que o app realmente chama, e a lista que alimenta
 * `connect-src`.
 *
 * O nome anterior era `ORIGENS_IMPORTADORES` e passou a mentir quando a
 * tablebase entrou: ela nao importa partida nenhuma, ela consulta final. Nome
 * que descreve metade do conteudo faz a proxima pessoa concluir que o que ela
 * tem em maos nao pertence aqui — foi exatamente o que aconteceu.
 *
 * OMITIR UMA ORIGEM DAQUI FALHA EM SILENCIO. Enquanto a CSP for Report-Only a
 * requisicao ainda sai; no dia em que `LANCEZERO_CSP_ENFORCING=true`, o
 * navegador bloqueia e o adapter — que degrada graciosamente — devolve `null`,
 * o MESMO valor de "nao ha resposta para esta posicao". Nenhuma tela acusa
 * nada. Por isso existe o portao em `tests/unit/security-headers.test.ts` que
 * varre os `baseUrl` dos adapters e cobra que cada origem esteja aqui.
 */
export const ORIGENS_EXTERNAS = [
  // Importacao de partidas — `src/lib/importers/lichess.ts`.
  'https://lichess.org',
  // Importacao de partidas — `src/lib/importers/chesscom.ts`.
  'https://api.chess.com',
  // Defesa perfeita em finais — `src/lib/tablebase/provider.ts`.
  // NAO e `lichess.org`: o servico de tablebase mora em outro host.
  'https://tablebase.lichess.ovh',
  // Estatistica de aberturas — `src/lib/openings/explorer.ts`.
  // Tambem NAO e `lichess.org`: outro host, mesmo padrao da tablebase. Foi o
  // portao abaixo que acusou a falta desta linha quando o adapter nasceu.
  'https://explorer.lichess.ovh',
] as const

/**
 * Diretivas da política, na ordem em que serão serializadas.
 *
 * Comentário por diretiva, porque CSP sem justificativa vira lixo acumulado:
 * ninguém depois sabe se pode apertar de novo.
 */
const DIRETIVAS: readonly (readonly [string, readonly string[]])[] = [
  // Ponto de partida fechado: tudo que não tiver diretiva própria cai aqui.
  ['default-src', ["'self'"]],

  [
    'script-src',
    [
      "'self'",
      // O Stockfish é WebAssembly. Sem `'wasm-unsafe-eval'` o
      // `WebAssembly.instantiate` do build lite-single é bloqueado e a engine
      // nunca completa o handshake UCI — a bancada fica em "Ociosa" para sempre.
      // É o mínimo do WASM: NÃO libera `eval()` de JavaScript.
      "'wasm-unsafe-eval'",
      // AFROUXAMENTO CONSCIENTE, com data de validade.
      // Sem isto quebram duas coisas, ambas fora do nosso controle direto hoje:
      //   1. `src/app/layout.tsx` injeta um <script> inline que aplica o tema
      //      salvo antes da primeira pintura (evita o flash de tema errado);
      //   2. o App Router do Next emite <script> inline com o payload de RSC
      //      (`self.__next_f.push(...)`), cujo conteúdo muda a cada resposta e
      //      por isso não pode ser coberto por hash.
      // O conserto correto é nonce por requisição gerado no middleware e
      // repassado ao Next — o middleware entra junto com a autenticação
      // (ADR-0008). Quando ele existir, troque esta entrada por `'nonce-...'`:
      // basta lembrar que a presença de nonce faz o browser IGNORAR
      // `'unsafe-inline'`, então a troca é literalmente substituição.
      // Enquanto isso a política roda em report-only (seção 62), então este
      // afrouxamento não está protegendo nada que já estivesse protegido.
      "'unsafe-inline'",
    ],
  ],

  [
    'style-src',
    [
      "'self'",
      // Sem isto o tabuleiro perde o estilo: `react-chessboard` posiciona casas
      // e peças por atributo `style` inline, e o Next injeta <style> inline em
      // desenvolvimento. `style-src` cobre os dois casos.
      // Risco aceito: CSS inline é vetor de exfiltração muito mais fraco que
      // script inline. Uma vez que exista nonce, dá para apertar aqui também.
      "'unsafe-inline'",
    ],
  ],

  // `data:` cobre SVG/PNG embutidos (peças do tabuleiro, ícones).
  ['img-src', ["'self'", 'data:']],

  // A tipografia prefere Inter quando instalada no sistema e cai para fontes
  // locais; não existe download de fonte no build nem em runtime. Por isso
  // `fonts.gstatic.com` não entra aqui.
  ['font-src', ["'self'"]],

  // Os adapters de servico externo falam com estas APIs oficiais, e so com
  // elas. Nada de scraping de HTML, nada de terceiro generico. A lista e
  // derivada de `ORIGENS_EXTERNAS`, e um portao cobra que nenhum adapter chame
  // host que nao esteja la.
  ['connect-src', ["'self'", ...ORIGENS_EXTERNAS]],

  // A engine roda em Web Worker de mesma origem
  // (`/engine/stockfish/stockfish-18-lite-single.js`).
  // `blob:` fica porque builds Emscripten caem para worker via Blob URL quando
  // o carregamento direto falha; sem ele esse caminho de fallback morre calado.
  ['worker-src', ["'self'", 'blob:']],

  // Nada de <object>/<embed>: superfície de plugin legado.
  ['object-src', ["'none'"]],

  // Clickjacking: ninguém embute o LanceZero. Par moderno do X-Frame-Options.
  ['frame-ancestors', ["'none'"]],

  // Impede que um <base> injetado reescreva a resolução de URLs relativas.
  ['base-uri', ["'self'"]],

  // Formulário só posta para a própria origem.
  ['form-action', ["'self'"]],
]

/**
 * Acréscimos exclusivos do `next dev`.
 *
 * Nunca chegam a produção: `next.config.ts` só passa `development: true` quando
 * `NODE_ENV !== 'production'`, e o teste unitário trava isso.
 *
 * `'unsafe-eval'`: o runtime de desenvolvimento do Next avalia módulo como
 * string a cada hot reload. Sem esta fonte, o console de dev enche de violação
 * — dezenas por navegação — e o ruído esconderia a violação de verdade que o
 * e2e existe para pegar. É o oposto de segurança: uma política que ninguém
 * consegue ler não é observada. O bundle de produção não avalia string, então
 * a política servida em produção continua sem `'unsafe-eval'`.
 *
 * `ws:`/`wss:`: o hot reload conversa por WebSocket com o próprio servidor.
 * `'self'` já cobre mesma origem pela CSP3, mas listar explicitamente evita
 * depender dessa sutileza em cada browser.
 */
const DIRETIVAS_DEV: Readonly<Record<string, readonly string[]>> = {
  'script-src': ["'unsafe-eval'"],
  'connect-src': ['ws:', 'wss:'],
}

function serializar(diretiva: string, valores: readonly string[]): string {
  return `${diretiva} ${valores.join(' ')}`
}

/**
 * Monta a política como string única.
 *
 * `reportOnly` de propósito não altera o conteúdo — ver `CspOptions`.
 */
export function buildContentSecurityPolicy(options: CspOptions): string {
  const { development = false } = options
  return DIRETIVAS.map(([diretiva, valores]) => {
    const extras = development ? (DIRETIVAS_DEV[diretiva] ?? []) : []
    return serializar(diretiva, [...valores, ...extras])
  }).join('; ')
}

/** Nome do header conforme o estágio do rollout da seção 62. */
export function contentSecurityPolicyHeaderName(reportOnly: boolean): string {
  return reportOnly ? CSP_HEADER_REPORT_ONLY : CSP_HEADER_ENFORCING
}

/** Header de CSP pronto, nome e valor coerentes entre si. */
export function buildCspHeader(options: CspOptions): SecurityHeader {
  return {
    key: contentSecurityPolicyHeaderName(options.reportOnly),
    value: buildContentSecurityPolicy(options),
  }
}

/**
 * Headers da seção 63 do plano. Valem em toda resposta, sem exceção.
 */
export const SECURITY_HEADERS: readonly SecurityHeader[] = [
  // Impede o browser de adivinhar o tipo de um recurso e executar como script
  // algo que servimos como texto.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Não vaza o caminho interno para terceiros; mantém a origem em cross-origin.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Clickjacking para browsers antigos; `frame-ancestors 'none'` é o par moderno.
  { key: 'X-Frame-Options', value: 'DENY' },
  // O app não usa câmera, microfone nem localização. Negar por padrão.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

/**
 * HSTS (seção 64).
 *
 * SEM `preload`, e isso é deliberado. Entrar na lista de preload é uma decisão
 * praticamente irreversível e vale para o domínio INTEIRO, incluindo qualquer
 * subdomínio que ainda não exista — um subdomínio interno sem HTTPS deixa de
 * ser alcançável. O plano exige avaliação do domínio inteiro antes; até lá,
 * `preload` fica fora.
 */
export const HSTS_HEADER: SecurityHeader = {
  key: 'Strict-Transport-Security',
  value: 'max-age=31536000; includeSubDomains',
}

export interface SecurityHeadersOptions extends CspOptions {
  /**
   * HSTS só faz sentido sob HTTPS; em `http://localhost` o browser ignora o
   * header. Fica desligado em desenvolvimento para o conjunto de headers do dev
   * ser o mais parecido possível com o que o browser realmente aplica.
   */
  includeHsts?: boolean
}

/** Conjunto completo de headers aplicado pelo `next.config.ts`. */
export function buildSecurityHeaders(options: SecurityHeadersOptions): SecurityHeader[] {
  const { includeHsts = !options.development } = options
  return [...SECURITY_HEADERS, ...(includeHsts ? [HSTS_HEADER] : []), buildCspHeader(options)]
}

/**
 * Estágio do rollout lido do ambiente.
 *
 * Fail safe pelo lado do produto: o padrão é report-only. Enforcing exige
 * `LANCEZERO_CSP_ENFORCING=true` explícito, depois de a telemetria de violações
 * estar limpa (seção 62). Nada de `NEXT_PUBLIC_`: isto é decisão de servidor.
 */
export function cspReportOnlyFromEnv(env: Record<string, string | undefined>): boolean {
  return env.LANCEZERO_CSP_ENFORCING !== 'true'
}
