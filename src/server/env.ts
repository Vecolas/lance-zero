/**
 * Leitura e validação das variáveis de ambiente do servidor.
 *
 * Este é o ÚNICO arquivo do projeto autorizado a ler `process.env`. O motivo é
 * simples: `process.env` espalhado pelo código é como um segredo vaza — alguém
 * lê a chave secreta num arquivo que depois vira Client Component, e o build
 * empacota o valor. Concentrando aqui, existe um lugar só para auditar.
 *
 * Referências do plano de segurança:
 * seção 20 (Supabase secret key), 40 (environment variables), 41 (`NEXT_PUBLIC_`).
 *
 * Duas regras que este módulo impõe:
 *
 * 1. **Fail closed no boot.** Faltando variável obrigatória, a função lança.
 *    Não existe valor padrão silencioso, não existe string vazia aceita. Um
 *    servidor que sobe com configuração pela metade é pior que um que não sobe.
 * 2. **Segredo nunca com prefixo `NEXT_PUBLIC_`.** O prefixo faz o Next
 *    embutir o valor no bundle do navegador. Se alguém definir
 *    `NEXT_PUBLIC_SUPABASE_SECRET_KEY`, isso não é um deslize a ser ignorado:
 *    é erro de configuração e o processo para.
 *
 * Nenhuma mensagem de erro daqui inclui VALOR de variável — só nome. Mensagem
 * de erro vai parar em log, e log com segredo dentro é vazamento.
 */

import { z } from 'zod'

/** Fonte das variáveis. Injetável para o teste não depender de `process.env`. */
export type EnvSource = Record<string, string | undefined>

/** Erro de configuração. Nunca carrega valor de variável, apenas nomes. */
export class EnvConfigError extends Error {
  readonly variables: readonly string[]

  constructor(message: string, variables: readonly string[] = []) {
    super(message)
    this.name = 'EnvConfigError'
    this.variables = variables
  }
}

/**
 * Variáveis realmente públicas (seção 41). Estas PODEM ir para o navegador: a
 * publishable key do Supabase só funciona sujeita a RLS, e é para isso que a
 * RLS existe. Sem ela, esta chave seria uma porta aberta.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
})

/**
 * Variáveis secretas. NUNCA vão para o navegador, nunca aparecem em log, nunca
 * entram no Git. Na Vercel devem estar marcadas como Sensitive.
 */
const secretEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
})

export type PublicEnv = z.infer<typeof publicEnvSchema>
export type SecretEnv = z.infer<typeof secretEnvSchema>

/** Nomes que jamais podem existir com prefixo `NEXT_PUBLIC_`. */
export const SECRET_ENV_KEYS: readonly string[] = Object.keys(secretEnvSchema.shape)

/**
 * Palavras que denunciam segredo num nome de variável. A checagem é por
 * substring justamente para pegar variantes que ninguém previu
 * (`NEXT_PUBLIC_STRIPE_SECRET`, `NEXT_PUBLIC_SERVICE_ROLE_KEY`, ...).
 */
const SECRET_NAME_MARKERS = [
  'SECRET',
  'SERVICE_ROLE',
  'PRIVATE_KEY',
  'PASSWORD',
  'ACCESS_TOKEN',
  'REFRESH_TOKEN',
  'WEBHOOK_SIGNING',
] as const

const PUBLIC_PREFIX = 'NEXT_PUBLIC_'

/**
 * Nomes explicitamente permitidos com o prefixo público mesmo contendo uma das
 * palavras acima. Hoje está vazio de propósito: qualquer exceção futura precisa
 * ser escrita aqui, com revisão, em vez de passar despercebida.
 */
const PUBLIC_PREFIX_ALLOWLIST: readonly string[] = []

/**
 * Falha se alguma variável secreta estiver exposta com prefixo público
 * (seção 41). Roda antes de qualquer parse: configuração errada é erro de
 * deploy, não algo a ser corrigido em silêncio.
 */
export function assertNoPublicSecrets(source: EnvSource): void {
  const offenders: string[] = []

  for (const key of Object.keys(source)) {
    if (!key.startsWith(PUBLIC_PREFIX)) continue
    if (PUBLIC_PREFIX_ALLOWLIST.includes(key)) continue

    const isSecretName =
      SECRET_ENV_KEYS.some((secret) => key === `${PUBLIC_PREFIX}${secret}`) ||
      SECRET_NAME_MARKERS.some((marker) => key.includes(marker))

    if (isSecretName) offenders.push(key)
  }

  if (offenders.length > 0) {
    throw new EnvConfigError(
      `Variável secreta exposta com prefixo ${PUBLIC_PREFIX}: ${offenders.join(', ')}. ` +
        'Remova o prefixo e trate a chave como comprometida.',
      offenders,
    )
  }
}

function parseOrThrow<T>(schema: z.ZodType<T>, source: EnvSource, escopo: string): T {
  const result = schema.safeParse(source)

  if (!result.success) {
    // Só os NOMES das variáveis problemáticas. Valor de variável nunca entra em
    // mensagem de erro — mensagem de erro vira log, e log com segredo vaza.
    const nomes = result.error.issues.map((issue) => issue.path.join('.')).filter(Boolean)
    throw new EnvConfigError(
      `Configuração ${escopo} inválida ou incompleta: ${nomes.join(', ') || 'variáveis desconhecidas'}.`,
      nomes,
    )
  }

  return result.data
}

/**
 * Configuração pública. Pode ser lida no servidor e no cliente.
 * Não valida segredos de propósito: o cliente não tem como satisfazê-los.
 */
export function readPublicEnv(source: EnvSource = process.env): PublicEnv {
  assertNoPublicSecrets(source)
  return parseOrThrow(publicEnvSchema, source, 'pública')
}

/**
 * Configuração secreta. Chamar isto do cliente é um bug — os módulos que a
 * usam carregam `import 'server-only'` para o build falhar antes do runtime.
 */
export function readSecretEnv(source: EnvSource = process.env): SecretEnv {
  assertNoPublicSecrets(source)
  return parseOrThrow(secretEnvSchema, source, 'secreta')
}

/**
 * Validação de boot do servidor: pública + secreta de uma vez. Serve para
 * falhar no start do processo, e não na primeira requisição de usuário.
 */
export function readServerEnv(source: EnvSource = process.env): PublicEnv & SecretEnv {
  return { ...readPublicEnv(source), ...readSecretEnv(source) }
}
