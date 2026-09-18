/**
 * A TRAVESSIA DE NOVE ETAPAS PARA OITO, medida por aluno.
 *
 * O MODO DE FALHA QUE ESTE ARQUIVO COBRE É SILENCIOSO — e é o pior tipo que
 * este repositório já enfrentou. Uma jornada gravada com `currentStageId:
 * 'respostas'` não dá erro quando a etapa some: `stages.find` devolve
 * `undefined`, a tela cai no `?? stages[0]`, e o aluno que estava na etapa 4
 * reabre o curso na Visão. Nenhuma exceção, nenhum log, nenhum teste vermelho —
 * só alguém perdendo o lugar e concluindo que o app esqueceu dele.
 *
 * Cada caso aqui é um aluno real do dia da migração.
 */

import { describe, expect, it } from 'vitest'
import { OPENING_COURSES } from '@/content/openings/course'
import { construirJornadaDeAbertura } from '@/domain/openings/jornada'
import { migrarJornadaDeAbertura } from '@/domain/openings/migracao'
import { criarJornada, type StudyJourney } from '@/domain/jornada'

const ITALIANA = OPENING_COURSES.find((o) => o.slug === 'italiana') ?? OPENING_COURSES[0]
const ETAPAS = construirJornadaDeAbertura(ITALIANA)

/** As nove etapas antigas, na ordem em que existiam antes do VNext. */
const ETAPAS_ANTIGAS = [
  'visao',
  'ideias',
  'linha-principal',
  'respostas',
  'variacoes',
  'planos',
  'dois-lados',
  'pratica-guiada',
  'treino-final',
]

/** Uma jornada como o IndexedDB a devolveria antes da migração. */
function jornadaAntiga(campos: Partial<StudyJourney> = {}): StudyJourney {
  return {
    ...criarJornada('abertura:italiana', ITALIANA.id, 'abertura', ETAPAS),
    stageIds: ETAPAS_ANTIGAS,
    ...campos,
  }
}

describe('a jornada de 9 etapas migra para 8', () => {
  it('a etapa que sumiu nunca sobra no cursor', () => {
    const { jornada, migrou } = migrarJornadaDeAbertura(
      jornadaAntiga({ currentStageId: 'respostas' }),
      ETAPAS,
    )

    expect(migrou).toBe(true)
    expect(jornada.currentStageId).toBe('variacoes')
    // E o cursor aponta para uma etapa que EXISTE — é isto que impede a queda
    // silenciosa para a Visão.
    expect(ETAPAS.some((etapa) => etapa.id === jornada.currentStageId)).toBe(true)
  })

  it('as duas concluídas viram UMA concluída', () => {
    const { jornada } = migrarJornadaDeAbertura(
      jornadaAntiga({
        completedStageIds: ['visao', 'ideias', 'linha-principal', 'respostas', 'variacoes'],
        currentStageId: 'planos',
      }),
      ETAPAS,
    )

    expect(jornada.completedStageIds).toEqual(['visao', 'ideias', 'linha-principal', 'variacoes'])
    expect(jornada.currentStageId).toBe('planos')
  })

  it('UMA concluída vira EM ANDAMENTO, e não concluída', () => {
    /*
      A REGRA É CONSERVADORA DE PROPÓSITO. A etapa nova cobre o que as duas
      antigas cobriam; quem viu só metade não viu tudo. Rebaixar custa alguns
      minutos de releitura, promover esconde para sempre o que ele não viu.
    */
    const { jornada } = migrarJornadaDeAbertura(
      jornadaAntiga({
        completedStageIds: ['visao', 'ideias', 'linha-principal', 'respostas'],
        currentStageId: 'variacoes',
      }),
      ETAPAS,
    )

    expect(jornada.completedStageIds).not.toContain('variacoes')
    expect(jornada.currentStageId).toBe('variacoes')
  })

  it('o trabalho gravado na etapa que sumiu não é jogado fora', () => {
    const { jornada } = migrarJornadaDeAbertura(
      jornadaAntiga({
        itensRespondidos: { respostas: ['guiada:0'], variacoes: ['guiada:2'] },
      }),
      ETAPAS,
    )

    // União, não substituição: reresponder o que já foi respondido é a forma
    // mais rápida de o aluno achar que o app perdeu o progresso dele.
    expect(jornada.itensRespondidos.variacoes).toEqual(['guiada:2', 'guiada:0'])
    expect(jornada.itensRespondidos.respostas).toBeUndefined()
  })

  it('a união não duplica o que já estava nas duas', () => {
    const { jornada } = migrarJornadaDeAbertura(
      jornadaAntiga({
        itensRespondidos: { respostas: ['guiada:0'], variacoes: ['guiada:0'] },
      }),
      ETAPAS,
    )
    expect(jornada.itensRespondidos.variacoes).toEqual(['guiada:0'])
  })

  it('a jornada migrada lista exatamente as oito etapas atuais', () => {
    const { jornada } = migrarJornadaDeAbertura(
      jornadaAntiga({ currentStageId: 'respostas' }),
      ETAPAS,
    )
    expect(jornada.stageIds).toEqual(ETAPAS.map((etapa) => etapa.id))
    expect(jornada.stageIds).toHaveLength(8)
  })

  it('o aluno que concluiu a jornada inteira continua concluído', () => {
    const { jornada } = migrarJornadaDeAbertura(
      jornadaAntiga({
        completedStageIds: ETAPAS_ANTIGAS,
        currentStageId: 'treino-final',
      }),
      ETAPAS,
    )
    expect(jornada.completedStageIds).toEqual(ETAPAS.map((etapa) => etapa.id))
  })
})

describe('a migração é idempotente', () => {
  it('jornada nova passa intacta e sem gravar', () => {
    const nova = criarJornada('abertura:italiana', ITALIANA.id, 'abertura', ETAPAS)
    const { jornada, migrou } = migrarJornadaDeAbertura(nova, ETAPAS)

    expect(migrou).toBe(false)
    expect(jornada).toBe(nova)
  })

  it('migrar duas vezes dá o mesmo resultado', () => {
    /*
      É ISTO que permite chamar a migração no caminho de LEITURA sem medo. Sem
      idempotência, cada abertura da tela reescreveria o registro — e um bug de
      fusão passaria a corromper um pouco mais a cada visita.
    */
    const primeira = migrarJornadaDeAbertura(
      jornadaAntiga({ currentStageId: 'respostas', completedStageIds: ['visao', 'respostas'] }),
      ETAPAS,
    )
    const segunda = migrarJornadaDeAbertura(primeira.jornada, ETAPAS)

    expect(segunda.migrou).toBe(false)
    expect(segunda.jornada).toEqual(primeira.jornada)
  })
})

describe('o currículo novo', () => {
  it('toda abertura tem oito etapas, e nenhuma se chama respostas', () => {
    for (const opening of OPENING_COURSES) {
      const etapas = construirJornadaDeAbertura(opening)
      expect(etapas, `${opening.slug}`).toHaveLength(8)
      expect(etapas.map((etapa) => etapa.id)).not.toContain('respostas')
    }
  })

  it('a ordem das etapas é a do plano VNext', () => {
    expect(ETAPAS.map((etapa) => etapa.id)).toEqual([
      'visao',
      'ideias',
      'linha-principal',
      'variacoes',
      'planos',
      'dois-lados',
      'pratica-guiada',
      'treino-final',
    ])
  })
})
