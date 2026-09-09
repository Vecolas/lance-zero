/**
 * Data Access Layer do perfil.
 *
 * Referências do plano: seção 23 (DAL), 24 (DTO), 25 (perfil público),
 * 26 (Server Action é endpoint público), 27 (nunca confiar em `userId` do
 * navegador), 28 (IDOR/BOLA), 69 (mass assignment), 88/90 (erro e log).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * REGRA QUE NÃO SE NEGOCIA
 *
 * A identidade SEMPRE sai da sessão (`session.userId`). NENHUMA função pública
 * deste arquivo aceita `userId`, `ownerId`, `profileId` ou equivalente como
 * argumento — e isso está garantido pela assinatura, não só pelo comentário:
 * procure por `userId` abaixo e você só o encontrará sendo LIDO de `session`.
 *
 * É o ataque da seção 28: `PATCH /api/profile/user_A` com `user_B` no corpo.
 * Se o identificador nunca entra, o ataque não tem por onde começar.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Camadas de defesa, nesta ordem:
 *
 * 1. sem sessão válida, a função nega ANTES de consultar o banco (fail closed —
 *    o teste verifica que o store sequer foi chamado);
 * 2. a consulta filtra pelo `user_id` da sessão;
 * 3. a RLS confere de novo no Postgres, comparando com `auth.jwt()->>'sub'`;
 * 4. a resposta passa por DTO explícito, nunca pela linha crua.
 *
 * Uma camada furada não basta para vazar dado de outra conta. Isso não é o
 * mesmo que prometer que dado nunca vaza — é dizer que um erro isolado não é
 * suficiente.
 */

import {
  toProfileDto,
  toPublicProfileDto,
  toUserSettingsDto,
  type ProfileDto,
  type PublicProfileDto,
  type UserSettingsDto,
} from '@/server/dto'
import {
  createRequestId,
  internalError,
  invalidInput,
  notFound,
  unauthorized,
  type AppError,
} from '@/server/errors'
import { consoleSecurityLogger, hashActor, type SecurityLogger } from '@/server/logging'
import type { ProfilePatch, ProfileStore, UserSettingsPatch } from '@/server/profile-store'
import {
  publicUsernameSchema,
  updateProfileSchema,
  updateUserSettingsSchema,
} from '@/server/validation'

/**
 * Sessão autenticada, como o Supabase Auth entrega (ADR-0009).
 *
 * `userId` é o `sub` do token do Supabase Auth, o mesmo que `auth.uid()` devolve
 * dentro do Postgres (seção 6). `token` é o JWT usado para o cliente
 * do Supabase agir como o usuário — é ele que a RLS lê. Nenhum dos dois pode
 * ser construído pelo navegador.
 */
export interface AuthSession {
  readonly userId: string
  readonly token: string
}

/** O que a DAL precisa para funcionar. Tudo injetado: nada de singleton oculto. */
export interface ProfileDalDeps {
  readonly store: ProfileStore
  readonly logger?: SecurityLogger
  /** Injetável para o teste conseguir asserir o código de correlação. */
  readonly requestId?: () => string
  readonly now?: () => Date
}

export interface ProfileDal {
  getMyProfile(session: AuthSession | null | undefined): Promise<ProfileDto | null>
  updateMyProfile(session: AuthSession | null | undefined, entrada: unknown): Promise<ProfileDto>
  getMySettings(session: AuthSession | null | undefined): Promise<UserSettingsDto | null>
  updateMySettings(
    session: AuthSession | null | undefined,
    entrada: unknown,
  ): Promise<UserSettingsDto>
  /** Dado público. Recebe username, jamais `user_id` (seção 25). */
  getPublicProfile(username: unknown): Promise<PublicProfileDto | null>
}

/**
 * Valida a sessão antes de qualquer I/O. Fail closed: sessão ausente, com
 * `userId` vazio ou sem token é negada, e o banco nem chega a ser consultado.
 * Serviço de autenticação fora do ar nega; nunca permite.
 */
function requireSession(
  session: AuthSession | null | undefined,
  requestId: string,
): AuthSession | AppError {
  if (!session) return unauthorized(requestId, 'sessão ausente')
  if (typeof session.userId !== 'string' || session.userId.trim().length === 0) {
    return unauthorized(requestId, 'sessão sem userId')
  }
  if (typeof session.token !== 'string' || session.token.length === 0) {
    return unauthorized(requestId, 'sessão sem token')
  }
  return session
}

function isAppError(value: AuthSession | AppError): value is AppError {
  return value instanceof Error
}

export function createProfileDal(deps: ProfileDalDeps): ProfileDal {
  const logger = deps.logger ?? consoleSecurityLogger
  const nextRequestId = deps.requestId ?? (() => createRequestId())
  const now = deps.now ?? (() => new Date())

  function registrar(
    event: string,
    requestId: string,
    actorId: string | null,
    success: boolean,
    detail?: string,
  ): void {
    logger.log({
      event,
      requestId,
      actorHash: actorId === null ? null : hashActor(actorId),
      success,
      timestamp: now().toISOString(),
      detail,
    })
  }

  /**
   * Traduz falha do banco em erro genérico. O texto do driver (que pode conter
   * SQL, nome de constraint e às vezes o valor rejeitado) fica só no log.
   */
  function falhaDeBanco(
    event: string,
    requestId: string,
    actorId: string | null,
    error: string,
  ): AppError {
    registrar(event, requestId, actorId, false, error)
    return internalError(requestId, error)
  }

  async function getMyProfile(session: AuthSession | null | undefined): Promise<ProfileDto | null> {
    const requestId = nextRequestId()
    const sessao = requireSession(session, requestId)

    if (isAppError(sessao)) {
      registrar('profile_read', requestId, null, false, sessao.internalDetail)
      throw sessao
    }

    const resultado = await deps.store.findProfileByUserId(sessao.userId)

    if (!resultado.ok) {
      throw falhaDeBanco('profile_read', requestId, sessao.userId, resultado.error)
    }

    if (resultado.data === null) {
      registrar('profile_read', requestId, sessao.userId, true, 'perfil inexistente')
      return null
    }

    // Redundância proposital: a consulta já filtrou e a RLS já conferiu. Se
    // mesmo assim veio linha de outra conta, existe bug grave em algum lugar —
    // e o comportamento aqui é negar, não entregar.
    if (resultado.data.user_id !== sessao.userId) {
      throw falhaDeBanco(
        'profile_ownership_mismatch',
        requestId,
        sessao.userId,
        'linha de outro dono',
      )
    }

    registrar('profile_read', requestId, sessao.userId, true)
    return toProfileDto(resultado.data)
  }

  async function updateMyProfile(
    session: AuthSession | null | undefined,
    entrada: unknown,
  ): Promise<ProfileDto> {
    const requestId = nextRequestId()
    const sessao = requireSession(session, requestId)

    if (isAppError(sessao)) {
      registrar('profile_update', requestId, null, false, sessao.internalDetail)
      throw sessao
    }

    const parsed = updateProfileSchema.safeParse(entrada)

    if (!parsed.success) {
      // Campo a mais (`user_id`, `profile_visibility`, `role`...) cai aqui:
      // `.strict()` transforma mass assignment em rejeição, não em silêncio.
      const campos = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')
      registrar('profile_update', requestId, sessao.userId, false, `entrada inválida: ${campos}`)
      throw invalidInput(requestId, `entrada inválida: ${campos}`)
    }

    // Patch montado campo a campo a partir do resultado do parse. Nada de
    // spread da entrada: spread devolve para o banco o que o schema não previu.
    const patch: ProfilePatch = {
      username: parsed.data.username,
      display_name: parsed.data.displayName,
      rating_estimate: parsed.data.ratingEstimate,
    }

    const resultado = await deps.store.updateProfileByUserId(sessao.userId, patch)

    if (!resultado.ok) {
      throw falhaDeBanco('profile_update', requestId, sessao.userId, resultado.error)
    }

    if (resultado.data === null) {
      // Nenhuma linha atualizada: ou o perfil não existe, ou a RLS barrou.
      // Para fora, as duas situações são a mesma — não vale contar qual foi.
      registrar('profile_update', requestId, sessao.userId, false, 'nenhuma linha atualizada')
      throw notFound(requestId, 'nenhuma linha atualizada')
    }

    if (resultado.data.user_id !== sessao.userId) {
      throw falhaDeBanco(
        'profile_ownership_mismatch',
        requestId,
        sessao.userId,
        'linha de outro dono',
      )
    }

    registrar('profile_update', requestId, sessao.userId, true)
    return toProfileDto(resultado.data)
  }

  async function getMySettings(
    session: AuthSession | null | undefined,
  ): Promise<UserSettingsDto | null> {
    const requestId = nextRequestId()
    const sessao = requireSession(session, requestId)

    if (isAppError(sessao)) {
      registrar('settings_read', requestId, null, false, sessao.internalDetail)
      throw sessao
    }

    const resultado = await deps.store.findSettingsByUserId(sessao.userId)

    if (!resultado.ok) {
      throw falhaDeBanco('settings_read', requestId, sessao.userId, resultado.error)
    }

    if (resultado.data === null) {
      registrar('settings_read', requestId, sessao.userId, true, 'preferências inexistentes')
      return null
    }

    if (resultado.data.user_id !== sessao.userId) {
      throw falhaDeBanco(
        'settings_ownership_mismatch',
        requestId,
        sessao.userId,
        'linha de outro dono',
      )
    }

    registrar('settings_read', requestId, sessao.userId, true)
    return toUserSettingsDto(resultado.data)
  }

  async function updateMySettings(
    session: AuthSession | null | undefined,
    entrada: unknown,
  ): Promise<UserSettingsDto> {
    const requestId = nextRequestId()
    const sessao = requireSession(session, requestId)

    if (isAppError(sessao)) {
      registrar('settings_update', requestId, null, false, sessao.internalDetail)
      throw sessao
    }

    const parsed = updateUserSettingsSchema.safeParse(entrada)

    if (!parsed.success) {
      const campos = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')
      registrar('settings_update', requestId, sessao.userId, false, `entrada inválida: ${campos}`)
      throw invalidInput(requestId, `entrada inválida: ${campos}`)
    }

    const patch: UserSettingsPatch = {}
    if (parsed.data.language !== undefined) patch.language = parsed.data.language
    if (parsed.data.theme !== undefined) patch.theme = parsed.data.theme
    if (parsed.data.boardTheme !== undefined) patch.board_theme = parsed.data.boardTheme
    if (parsed.data.pieceTheme !== undefined) patch.piece_theme = parsed.data.pieceTheme
    if (parsed.data.timezone !== undefined) patch.timezone = parsed.data.timezone
    if (parsed.data.trainingReminders !== undefined) {
      patch.training_reminders = parsed.data.trainingReminders
    }
    if (parsed.data.analyticsOptIn !== undefined) {
      patch.analytics_opt_in = parsed.data.analyticsOptIn
    }

    const resultado = await deps.store.updateSettingsByUserId(sessao.userId, patch)

    if (!resultado.ok) {
      throw falhaDeBanco('settings_update', requestId, sessao.userId, resultado.error)
    }

    if (resultado.data === null) {
      registrar('settings_update', requestId, sessao.userId, false, 'nenhuma linha atualizada')
      throw notFound(requestId, 'nenhuma linha atualizada')
    }

    if (resultado.data.user_id !== sessao.userId) {
      throw falhaDeBanco(
        'settings_ownership_mismatch',
        requestId,
        sessao.userId,
        'linha de outro dono',
      )
    }

    registrar('settings_update', requestId, sessao.userId, true)
    return toUserSettingsDto(resultado.data)
  }

  async function getPublicProfile(username: unknown): Promise<PublicProfileDto | null> {
    const requestId = nextRequestId()
    const parsed = publicUsernameSchema.safeParse(username)

    if (!parsed.success) {
      // Username fora do formato não é erro do servidor: é 404. Responder
      // "inválido" para uns e "não encontrado" para outros ajuda quem varre.
      registrar('public_profile_read', requestId, null, true, 'username fora do formato')
      return null
    }

    const resultado = await deps.store.findPublicProfileByUsername(parsed.data)

    if (!resultado.ok) {
      throw falhaDeBanco('public_profile_read', requestId, null, resultado.error)
    }

    if (resultado.data === null) {
      registrar('public_profile_read', requestId, null, true, 'não encontrado')
      return null
    }

    // O DTO devolve `null` se a visibilidade não for pública. É a terceira
    // checagem do mesmo fato (SQL, RLS e aqui) — seção 127: esconder na
    // interface não é autorizar; o dado não pode nem chegar ao navegador.
    const dto = toPublicProfileDto(resultado.data)
    registrar(
      'public_profile_read',
      requestId,
      null,
      true,
      dto === null ? 'não público' : undefined,
    )
    return dto
  }

  return { getMyProfile, updateMyProfile, getMySettings, updateMySettings, getPublicProfile }
}
