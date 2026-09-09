/**
 * Forma das tabelas de perfil e a lista de colunas que o servidor tem
 * permissão de ler.
 *
 * Referências do plano: seção 9 (`profiles`), 11 (`user_settings`),
 * 13 (dados proibidos), 24 (nunca devolver a row inteira).
 *
 * As colunas ficam aqui como DADO, e não inline em cada consulta, por dois
 * motivos: `select('*')` deixa de ser possível por descuido, e uma coluna nova
 * e sensível no banco não passa a ser lida sozinha — alguém precisa vir aqui e
 * escrever o nome dela.
 */

/** Visibilidade do perfil (seção 9, default `private`). */
export type ProfileVisibility = 'private' | 'public'

export const PROFILE_VISIBILITIES: readonly ProfileVisibility[] = ['private', 'public']

export function isProfileVisibility(value: unknown): value is ProfileVisibility {
  return typeof value === 'string' && (PROFILE_VISIBILITIES as readonly string[]).includes(value)
}

/** Linha crua de `profiles`. NUNCA atravessa a fronteira para o navegador. */
export interface ProfileRow {
  id: string
  user_id: string
  username: string | null
  display_name: string | null
  avatar_path: string | null
  rating_estimate: number | null
  rating_source: string | null
  profile_visibility: string
  created_at: string
  updated_at: string
}

/**
 * Recorte da linha de `profiles` lido para o perfil público. Mais estreito que
 * `ProfileRow` de propósito: coluna que não é lida não vaza depois (seção 25).
 */
export type PublicProfileRow = Pick<
  ProfileRow,
  'username' | 'display_name' | 'avatar_path' | 'rating_estimate' | 'profile_visibility'
>

/** Linha crua de `user_settings`. Também não atravessa a fronteira. */
export interface UserSettingsRow {
  user_id: string
  language: string | null
  theme: string | null
  board_theme: string | null
  piece_theme: string | null
  timezone: string | null
  training_reminders: boolean | null
  analytics_opt_in: boolean | null
}

/**
 * Colunas lidas de `profiles`. `user_id` está aqui porque a camada de acesso
 * confere a posse da linha antes de montar o DTO — e é a última coluna a sair,
 * porque nenhum DTO a expõe.
 */
export const PROFILE_COLUMNS = [
  'id',
  'user_id',
  'username',
  'display_name',
  'avatar_path',
  'rating_estimate',
  'rating_source',
  'profile_visibility',
  'created_at',
  'updated_at',
] as const

/**
 * Colunas do perfil público. Menos que `PROFILE_COLUMNS` de propósito: o que
 * não é lido do banco não tem como vazar por engano depois (seção 25).
 */
export const PUBLIC_PROFILE_COLUMNS = [
  'username',
  'display_name',
  'avatar_path',
  'rating_estimate',
  'profile_visibility',
] as const

export const USER_SETTINGS_COLUMNS = [
  'user_id',
  'language',
  'theme',
  'board_theme',
  'piece_theme',
  'timezone',
  'training_reminders',
  'analytics_opt_in',
] as const

/**
 * Nomes que nunca podem ser lidos nem devolvidos (seção 13). Se alguma dessas
 * colunas existir no banco de perfil, isso já é um bug de modelagem; a lista
 * está aqui para o erro ser barrado uma segunda vez, no código.
 */
export const FORBIDDEN_FIELDS: readonly string[] = [
  'password',
  'password_hash',
  'session',
  'refresh_token',
  'clerk_jwt',
  'jwt',
  'mfa_secret',
  'supabase_secret',
  'clerk_secret',
  'oauth_password',
  'email',
  'ip',
  'ip_address',
]

export function isForbiddenField(name: string): boolean {
  return FORBIDDEN_FIELDS.includes(name.toLowerCase())
}

/**
 * Converte a lista de colunas na string do `select()` do Supabase, barrando
 * `*` e coluna proibida. Lança em vez de filtrar em silêncio: consulta que
 * pediu coluna proibida é bug, e bug silencioso volta depois.
 */
export function toSelectList(columns: readonly string[]): string {
  if (columns.length === 0) {
    throw new Error('Lista de colunas vazia: select sem colunas explícitas é proibido.')
  }

  for (const column of columns) {
    if (column.includes('*')) {
      throw new Error('select("*") é proibido: liste as colunas explicitamente (seção 24).')
    }
    if (isForbiddenField(column)) {
      throw new Error(`Coluna proibida no select: ${column} (seção 13).`)
    }
  }

  return columns.join(', ')
}
