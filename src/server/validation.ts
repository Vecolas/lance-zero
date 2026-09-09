/**
 * Schemas de entrada. Nada chega ao banco sem passar por aqui.
 *
 * Referências do plano: seção 10 (constraints e reservados), 53 (username e
 * display name), 69 (mass assignment), 70 (Zod), 128 (Unicode).
 *
 * O ponto central é a seção 69. Um schema permissivo aceita
 * `{ displayName: 'x', profile_visibility: 'public', user_id: 'user_da_vitima' }`
 * e passa adiante o que não deveria existir. Por isso todo schema de escrita é
 * `.strict()`: campo a mais é ERRO, não algo ignorado em silêncio. Ignorar em
 * silêncio funciona até o dia em que alguém trocar o `parse` por um spread.
 */

import { z } from 'zod'

/** Formato do username (seção 10): 3–24, `A-Z a-z 0-9 _ -`. */
export const USERNAME_PATTERN = /^[A-Za-z0-9_-]+$/
export const USERNAME_MIN = 3
export const USERNAME_MAX = 24

/**
 * ASCII restrito de propósito (seção 128): reduz phishing por homoglyph, o
 * ataque em que `Iancezero` com i maiúsculo se passa por `lancezero`.
 */
export const RESERVED_USERNAMES: readonly string[] = [
  'admin',
  'administrator',
  'support',
  'staff',
  'moderator',
  'lancezero',
  'security',
  'api',
]

export function isReservedUsername(value: string): boolean {
  return RESERVED_USERNAMES.includes(value.trim().toLowerCase())
}

export const usernameSchema = z
  .string()
  .trim()
  .min(USERNAME_MIN, `O nome de usuário precisa de ao menos ${USERNAME_MIN} caracteres.`)
  .max(USERNAME_MAX, `O nome de usuário aceita no máximo ${USERNAME_MAX} caracteres.`)
  .regex(USERNAME_PATTERN, 'Use apenas letras sem acento, números, hífen e sublinhado.')
  .refine((value) => !isReservedUsername(value), {
    message: 'Este nome de usuário é reservado.',
  })

/**
 * Display name aceita Unicode (seção 53/128) e é renderizado como TEXTO. O
 * React já escapa por padrão; nada aqui deve virar HTML. O limite pequeno é
 * defesa contra nome usado como faixa de propaganda.
 */
export const DISPLAY_NAME_MAX = 40

/**
 * Caracteres de controle e separadores de linha, barrados por ponto de código
 * em vez de por regex: escrever esses caracteres dentro de um literal de regex
 * deixa bytes invisíveis no fonte, que ninguém revisa direito. Eles importam
 * porque viram truque visual em lista de usuários e quebra de linha em log.
 */
const CODIGOS_PROIBIDOS_DISPLAY_NAME = { del: 0x7f, lineSep: 0x2028, paragraphSep: 0x2029 }

export function hasControlChars(value: string): boolean {
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0
    if (code < 0x20) return true
    if (
      code === CODIGOS_PROIBIDOS_DISPLAY_NAME.del ||
      code === CODIGOS_PROIBIDOS_DISPLAY_NAME.lineSep ||
      code === CODIGOS_PROIBIDOS_DISPLAY_NAME.paragraphSep
    ) {
      return true
    }
  }

  return false
}

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Informe um nome de exibição.')
  .max(DISPLAY_NAME_MAX, `O nome de exibição aceita no máximo ${DISPLAY_NAME_MAX} caracteres.`)
  .refine((value) => !hasControlChars(value), {
    message: 'O nome de exibição não pode conter caracteres de controle.',
  })

/** Faixa da constraint `profile_rating_range` (seção 10). */
export const RATING_MIN = 100
export const RATING_MAX = 4000

export const ratingEstimateSchema = z
  .number()
  .int('O rating precisa ser um número inteiro.')
  .min(RATING_MIN, `O rating começa em ${RATING_MIN}.`)
  .max(RATING_MAX, `O rating vai até ${RATING_MAX}.`)
  .nullable()

export const profileVisibilitySchema = z.enum(['private', 'public'])

/**
 * Atualização do próprio perfil (seções 69 e 70).
 *
 * O que NÃO está aqui é tão importante quanto o que está: `user_id`, `id`,
 * `profile_visibility`, `created_at`, qualquer flag de moderação. `user_id`
 * jamais entra por input — a identidade sai da sessão (seção 27). E como o
 * schema é `.strict()`, mandar um desses campos derruba a operação inteira em
 * vez de ser descartado sem aviso.
 */
export const updateProfileSchema = z
  .object({
    username: usernameSchema,
    displayName: displayNameSchema,
    ratingEstimate: ratingEstimateSchema,
  })
  .strict()

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

/**
 * Troca de visibilidade: operação separada, e de propósito. Passar de privado
 * para público é uma decisão consciente do usuário, não um campo que viaja de
 * carona num formulário de edição de nome.
 */
export const updateProfileVisibilitySchema = z
  .object({
    profileVisibility: profileVisibilitySchema,
  })
  .strict()

export type UpdateProfileVisibilityInput = z.infer<typeof updateProfileVisibilitySchema>

/** Preferências (seção 11). Também `.strict()`, também sem `user_id`. */
export const updateUserSettingsSchema = z
  .object({
    language: z.enum(['pt-BR']).optional(),
    theme: z.enum(['claro', 'escuro', 'sistema']).optional(),
    boardTheme: z.enum(['papel', 'grafite']).optional(),
    pieceTheme: z.string().trim().min(1).max(32).optional(),
    timezone: z.string().trim().min(1).max(64).optional(),
    trainingReminders: z.boolean().optional(),
    analyticsOptIn: z.boolean().optional(),
  })
  .strict()

export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>

/**
 * Username vindo da URL pública (`/u/:username`). Validar antes de consultar
 * evita que lixo chegue ao banco e dá 404 rápido em varredura automatizada.
 * A mesma regra do cadastro, sem a lista de reservados — um reservado que
 * exista deve poder ser exibido.
 */
export const publicUsernameSchema = z
  .string()
  .trim()
  .min(USERNAME_MIN)
  .max(USERNAME_MAX)
  .regex(USERNAME_PATTERN)
