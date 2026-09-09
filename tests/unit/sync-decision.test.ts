import { describe, expect, it } from 'vitest'
import {
  decideSync,
  describeAction,
  resolveConflict,
  type SyncContext,
} from '@/domain/sync/decision'

const T = {
  antes: '2026-01-01T10:00:00.000Z',
  meio: '2026-01-01T11:00:00.000Z',
  depois: '2026-01-01T12:00:00.000Z',
}

function contexto(over: Partial<SyncContext> = {}): SyncContext {
  return {
    localChangedAt: null,
    marker: null,
    remote: null,
    localSchemaVersion: 1,
    ...over,
  }
}

describe('decisão de sincronização', () => {
  it('sem nada dos dois lados, não faz nada', () => {
    expect(decideSync(contexto())).toEqual({ acao: 'em-dia' })
  })

  it('local mudou e não há cópia remota: envia', () => {
    const acao = decideSync(contexto({ localChangedAt: T.meio }))
    expect(acao).toEqual({ acao: 'enviar', motivo: 'primeiro-envio' })
  })

  it('aparelho novo e sem mudança local: baixa', () => {
    const acao = decideSync(contexto({ remote: { updatedAt: T.meio, schemaVersion: 1 } }))
    expect(acao).toEqual({ acao: 'baixar', motivo: 'primeiro-download' })
  })

  it('só o remoto mudou desde o último encontro: baixa', () => {
    const acao = decideSync(
      contexto({
        localChangedAt: T.antes,
        marker: { remoteUpdatedAt: T.antes, syncedAt: T.meio },
        remote: { updatedAt: T.depois, schemaVersion: 1 },
      }),
    )
    expect(acao).toEqual({ acao: 'baixar', motivo: 'remoto-mais-novo' })
  })

  it('só o local mudou desde o último encontro: envia', () => {
    const acao = decideSync(
      contexto({
        localChangedAt: T.depois,
        marker: { remoteUpdatedAt: T.meio, syncedAt: T.meio },
        remote: { updatedAt: T.meio, schemaVersion: 1 },
      }),
    )
    expect(acao).toEqual({ acao: 'enviar', motivo: 'local-mais-novo' })
  })

  it('nada mudou dos dois lados: em dia', () => {
    const acao = decideSync(
      contexto({
        localChangedAt: T.antes,
        marker: { remoteUpdatedAt: T.meio, syncedAt: T.meio },
        remote: { updatedAt: T.meio, schemaVersion: 1 },
      }),
    )
    expect(acao).toEqual({ acao: 'em-dia' })
  })

  // O teste que justifica a existência deste módulo: com "última escrita vence",
  // este é o caso que apagaria trabalho em silêncio se não fosse detectado.
  it('os dois mudaram desde o último encontro: CONFLITO, nunca sobrescreve sozinho', () => {
    const acao = decideSync(
      contexto({
        localChangedAt: T.depois,
        marker: { remoteUpdatedAt: T.antes, syncedAt: T.antes },
        remote: { updatedAt: T.meio, schemaVersion: 1 },
      }),
    )
    expect(acao).toEqual({
      acao: 'conflito',
      localChangedAt: T.depois,
      remoteUpdatedAt: T.meio,
    })
  })

  it('aparelho sem marcador mas com dados locais também é conflito', () => {
    // Sem marcador não dá para saber se o local evoluiu do remoto ou é paralelo.
    const acao = decideSync(
      contexto({
        localChangedAt: T.meio,
        remote: { updatedAt: T.antes, schemaVersion: 1 },
      }),
    )
    expect(acao.acao).toBe('conflito')
  })

  it('schema remoto mais novo bloqueia, para não rebaixar o dado', () => {
    const acao = decideSync(
      contexto({
        localChangedAt: T.depois,
        marker: { remoteUpdatedAt: T.antes, syncedAt: T.antes },
        remote: { updatedAt: T.depois, schemaVersion: 2 },
      }),
    )
    expect(acao).toEqual({
      acao: 'bloqueado',
      motivo: 'schema-remoto-mais-novo',
      remoteSchemaVersion: 2,
    })
  })

  it('schema remoto mais antigo não bloqueia', () => {
    const acao = decideSync(
      contexto({
        remote: { updatedAt: T.meio, schemaVersion: 1 },
        localSchemaVersion: 2,
      }),
    )
    expect(acao.acao).toBe('baixar')
  })
})

describe('resolução de conflito', () => {
  it('as duas escolhas viram ações opostas e explícitas', () => {
    expect(resolveConflict('manter-este-aparelho').acao).toBe('enviar')
    expect(resolveConflict('usar-a-copia-do-servidor').acao).toBe('baixar')
  })
})

describe('texto para o usuário', () => {
  it('toda ação tem explicação em PT-BR, e o conflito admite que não há merge', () => {
    const acoes = [
      decideSync(contexto()),
      decideSync(contexto({ localChangedAt: T.meio })),
      decideSync(contexto({ remote: { updatedAt: T.meio, schemaVersion: 1 } })),
      decideSync(
        contexto({
          localChangedAt: T.depois,
          marker: { remoteUpdatedAt: T.antes, syncedAt: T.antes },
          remote: { updatedAt: T.meio, schemaVersion: 1 },
        }),
      ),
      decideSync(
        contexto({ remote: { updatedAt: T.depois, schemaVersion: 9 }, localSchemaVersion: 1 }),
      ),
    ]
    for (const acao of acoes) {
      expect(describeAction(acao).length).toBeGreaterThan(20)
    }
    expect(describeAction(acoes[3])).toMatch(/não dá para juntar/)
  })
})
