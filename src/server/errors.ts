/**
 * Erros da camada de servidor.
 *
 * Referência do plano: seção 88 (error handling), 89 (logs), 90 (logs mínimos).
 *
 * A regra é a separação entre o que o usuário vê e o que o servidor sabe:
 *
 * - para fora vai uma mensagem genérica em português e um código de correlação;
 * - para o log vai o detalhe (mensagem do banco, código do driver, stack).
 *
 * Nunca devolver ao chamador: SQL, JWT, segredo, stack, caminho interno. O
 * `requestId` existe para o usuário conseguir citar o incidente sem que o
 * servidor precise contar o que deu errado.
 */

/** Códigos estáveis. O cliente pode ramificar por eles; a mensagem é genérica. */
export type AppErrorCode = 'unauthorized' | 'invalid_input' | 'not_found' | 'internal'

const MENSAGENS: Record<AppErrorCode, string> = {
  unauthorized: 'Sessão inválida ou expirada. Entre novamente para continuar.',
  invalid_input: 'Não foi possível concluir a operação: dados inválidos.',
  not_found: 'Não encontramos o que você procurou.',
  internal: 'Não foi possível concluir a operação.',
}

/**
 * Erro seguro para atravessar a fronteira servidor → cliente.
 *
 * `message` é sempre genérica. O detalhe interno fica em `internalDetail`, que
 * NÃO deve ser serializado para o navegador — existe só para o logger.
 */
export class AppError extends Error {
  readonly code: AppErrorCode
  readonly requestId: string
  /** Só para log no servidor. Nunca envie isto ao navegador. */
  readonly internalDetail?: string

  constructor(code: AppErrorCode, options: { requestId: string; internalDetail?: string }) {
    super(MENSAGENS[code])
    this.name = 'AppError'
    this.code = code
    this.requestId = options.requestId
    this.internalDetail = options.internalDetail
  }

  /** Forma segura para o cliente: sem detalhe interno, sem stack. */
  toClientPayload(): { code: AppErrorCode; message: string; requestId: string } {
    return { code: this.code, message: this.message, requestId: this.requestId }
  }
}

/**
 * Identificador de correlação. Sem valor de segurança — serve para casar a
 * reclamação do usuário com a linha de log.
 */
export function createRequestId(random: () => number = Math.random): string {
  const parte = () =>
    Math.floor(random() * 0xffffffff)
      .toString(16)
      .padStart(8, '0')
  return `${parte()}${parte()}`
}

export function unauthorized(requestId: string, internalDetail?: string): AppError {
  return new AppError('unauthorized', { requestId, internalDetail })
}

export function invalidInput(requestId: string, internalDetail?: string): AppError {
  return new AppError('invalid_input', { requestId, internalDetail })
}

export function notFound(requestId: string, internalDetail?: string): AppError {
  return new AppError('not_found', { requestId, internalDetail })
}

export function internalError(requestId: string, internalDetail?: string): AppError {
  return new AppError('internal', { requestId, internalDetail })
}

/**
 * Reduz qualquer coisa lançada a uma string de log. Deliberadamente NÃO inclui
 * stack: stack costuma carregar caminho interno e, às vezes, valor de variável.
 */
export function describeUnknownError(erro: unknown): string {
  if (erro instanceof Error) return `${erro.name}: ${erro.message}`
  if (typeof erro === 'string') return erro
  return 'erro não identificado'
}
