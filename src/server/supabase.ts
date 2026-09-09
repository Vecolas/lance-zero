import 'server-only'

/**
 * Os três clientes do Supabase — e por que eles nunca se substituem.
 *
 * Referências do plano: seção 20 (secret key), 21 (separação de clientes),
 * 22 (`server-only`), 40/41 (variáveis de ambiente).
 *
 * O `import 'server-only'` da primeira linha é o que faz um import acidental
 * deste módulo a partir de um Client Component quebrar o BUILD, e não vazar em
 * produção. É uma barreira de compilação, não uma convenção.
 *
 * Os clientes, do menos ao mais perigoso:
 *
 * | cliente               | chave            | RLS      | uso                        |
 * |-----------------------|------------------|----------|----------------------------|
 * | `createAnonClient`    | publishable      | aplica   | dado realmente público     |
 * | `createUserClient`    | publishable + JWT| aplica   | tudo que é do usuário      |
 * | `createSecretClient`  | secret           | CONTORNA | administração deliberada   |
 *
 * Nenhum deles é intercambiável. Trocar um pelo outro "porque deu erro de
 * permissão" é exatamente o erro que a RLS existe para impedir: o erro de
 * permissão normalmente está certo.
 *
 * As fábricas recebem a configuração POR PARÂMETRO, com valor padrão vindo do
 * ambiente. Isso permite testar e apontar para outro projeto sem mexer em
 * `process.env` global — e mantém a leitura de ambiente concentrada em
 * `env.ts`.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readPublicEnv, readSecretEnv } from '@/server/env'

/** Configuração pública: pode ser conhecida pelo navegador. */
export interface SupabaseConnection {
  url: string
  publishableKey: string
}

/** Configuração administrativa. O `secretKey` nunca sai do servidor. */
export interface SupabaseAdminConnection {
  url: string
  secretKey: string
}

/**
 * Sem sessão de navegador, sem refresh automático, sem ler token da URL.
 * Este servidor é stateless: quem guarda sessão é o Clerk.
 */
const BASE_AUTH_OPTIONS = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
} as const

export function publicConnection(): SupabaseConnection {
  const env = readPublicEnv()
  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  }
}

export function adminConnection(): SupabaseAdminConnection {
  const publica = readPublicEnv()
  const secreta = readSecretEnv()
  return { url: publica.NEXT_PUBLIC_SUPABASE_URL, secretKey: secreta.SUPABASE_SECRET_KEY }
}

/**
 * Cliente anônimo: publishable key, sem usuário.
 *
 * Enxerga apenas o que a RLS liberar para o papel anônimo — na prática, dado
 * declaradamente público. Não serve para "ler o perfil do usuário logado":
 * sem JWT, `auth.jwt()->>'sub'` é nulo e a policy nega, como deve.
 */
export function createAnonClient(config: SupabaseConnection = publicConnection()): SupabaseClient {
  return createClient(config.url, config.publishableKey, { auth: { ...BASE_AUTH_OPTIONS } })
}

/**
 * Cliente do usuário: publishable key + JWT do Clerk.
 *
 * Toda consulta roda sujeita à RLS, com a identidade que o Postgres lê do
 * próprio token. É o cliente do caminho de requisição normal — o único que a
 * DAL deveria usar.
 *
 * O JWT vem SEMPRE da sessão do servidor, nunca de campo de formulário, header
 * escolhido pelo cliente ou query string (seção 27).
 */
export function createUserClient(
  jwt: string,
  config: SupabaseConnection = publicConnection(),
): SupabaseClient {
  if (typeof jwt !== 'string' || jwt.length === 0) {
    // Fail closed: sem token, cair para o cliente anônimo seria pior que
    // falhar — a consulta "funcionaria" enxergando outra coisa.
    throw new Error('createUserClient exige um JWT de sessão.')
  }

  return createClient(config.url, config.publishableKey, {
    auth: { ...BASE_AUTH_OPTIONS },
    // O supabase-js chama isto a cada requisição e manda o token adiante.
    accessToken: async () => jwt,
  })
}

/**
 * ⚠️ CLIENTE ADMINISTRATIVO — CONTORNA A RLS. ⚠️
 *
 * A secret key do Supabase é o segredo mais crítico deste projeto: com ela,
 * toda linha de todo usuário é legível e gravável, e nenhuma policy se aplica.
 * Vazá-la equivale a entregar o banco inteiro.
 *
 * Regras (seção 20), sem exceção:
 *
 * - server-side apenas, nunca no navegador;
 * - nunca com prefixo `NEXT_PUBLIC_` (`env.ts` derruba o boot se isso ocorrer);
 * - nunca em log, nunca no Git;
 * - marcada como Sensitive Environment Variable na Vercel.
 *
 * Uso permitido: operação administrativa deliberada e revisada — processar
 * webhook do Clerk, executar exclusão de conta, tarefa de manutenção. NUNCA em
 * caminho de requisição comum: se uma página ou Server Action de usuário
 * precisou deste cliente, a resposta certa quase sempre é corrigir a policy de
 * RLS, e não contorná-la.
 *
 * Regra prática para revisão de PR: cada chamada a esta função é um ponto onde
 * a autorização passa a ser responsabilidade exclusiva do código. Se o código
 * errar, não há segunda camada.
 */
export function createSecretClient(
  config: SupabaseAdminConnection = adminConnection(),
): SupabaseClient {
  return createClient(config.url, config.secretKey, { auth: { ...BASE_AUTH_OPTIONS } })
}
