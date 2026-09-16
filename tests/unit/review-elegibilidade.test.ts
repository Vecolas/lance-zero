/**
 * O portão da regra "o app não cobra o que nunca ensinou".
 *
 * ESTE ARQUIVO EXISTE POR CAUSA DE UM DEFEITO SILENCIOSO, e o formato dos testes
 * vem dele: a regra era escrita em TRÊS lugares — o filtro da fila em
 * `ReviewSession`, o `reviewEligible` que ela passava ao planner de sessão, e o
 * filtro de vencidos em `planning/planner-v2`. As três cópias divergiram, e
 * divergência aqui não aparece como erro: aparece como fila vazia.
 *
 * O CASO QUE ELAS ERRAVAM JUNTAS é o primeiro teste abaixo. `some` sobre lista
 * vazia é `false`, e `Puzzle.skillIds` é declaradamente opcional — um puzzle de
 * tema não mapeado gerava um card que vencia e NUNCA mais aparecia. Nenhum erro,
 * nenhum aviso, nenhuma pista: o card simplesmente não existia mais para o
 * aluno.
 *
 * O ÚLTIMO TESTE é o que impede a regra de voltar a ser escrita à mão: ele lê os
 * dois arquivos que a aplicam e reprova se algum deles decidir sozinho.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  KINDS_QUE_EXIGEM_ENSINO,
  cardPodeSerRevisado,
  exigeEnsinoPrevio,
} from '@/domain/review/elegibilidade'
import type { ReviewCard, ReviewCardKind, SkillId } from '@/domain/types'

const ENSINADAS = new Set<SkillId>(['tactics.fork'])
const NENHUMA = new Set<SkillId>()

function card(kind: ReviewCardKind, skillIds: SkillId[]): Pick<ReviewCard, 'kind' | 'skillIds'> {
  return { kind, skillIds }
}

/** Todos os tipos que o produto tem hoje. Tipo novo aparece aqui ou o teste quebra. */
const TODOS_OS_KINDS: ReviewCardKind[] = [
  'posicao-exata',
  'erro-de-partida',
  'final',
  'conceito',
  'repertorio',
]

describe('card SEM habilidade nenhuma', () => {
  it('passa, em vez de sumir para sempre', () => {
    for (const kind of TODOS_OS_KINDS) {
      expect(cardPodeSerRevisado(card(kind, []), NENHUMA)).toBe(true)
    }
  })

  /**
   * A frase que documenta a decisão, para quem for mexer: ausência de habilidade
   * é ausência de EVIDÊNCIA, e na ausência de evidência a fila não inventa uma.
   * O contrário — descartar — é afirmar "este conceito não foi ensinado" sem ter
   * como saber.
   */
  it('vale mesmo para conceito, que é o tipo sujeito ao portão', () => {
    expect(exigeEnsinoPrevio('conceito')).toBe(true)
    expect(cardPodeSerRevisado(card('conceito', []), NENHUMA)).toBe(true)
  })
})

describe('o portão de ensino vale SÓ para conceito', () => {
  it('conceito de habilidade nunca ensinada não entra', () => {
    expect(cardPodeSerRevisado(card('conceito', ['tactics.pin']), ENSINADAS)).toBe(false)
  })

  it('conceito de habilidade ensinada entra', () => {
    expect(cardPodeSerRevisado(card('conceito', ['tactics.fork']), ENSINADAS)).toBe(true)
  })

  /**
   * O ERRO DO ALUNO NÃO PRECISA DE AULA PRÉVIA, e esta é a promessa central do
   * produto: "erro vira treino". O card não cobra currículo — ele replica UMA
   * posição que o aluno errou, e a evidência que o criou é a justificativa dele.
   *
   * Enquanto o portão valia para todo card, o app anunciava a revisão do erro e
   * ela não vinha. Pego por `tests/e2e/puzzles.spec.ts`.
   */
  it('card nascido de evidência entra sem ensino nenhum', () => {
    for (const kind of ['posicao-exata', 'erro-de-partida', 'final'] as const) {
      expect(cardPodeSerRevisado(card(kind, ['tactics.pin']), NENHUMA)).toBe(true)
    }
  })

  /**
   * REPERTÓRIO pergunta o lance que o PRÓPRIO aluno escolheu para a linha dele.
   * Ninguém recebe uma aula do próprio repertório, então exigir evidência de
   * ensino de `opening.development` para mostrá-lo é aplicar a régua errada.
   */
  it('repertório entra sem ensino nenhum', () => {
    expect(cardPodeSerRevisado(card('repertorio', ['opening.development']), NENHUMA)).toBe(true)
  })

  it('a lista de tipos sujeitos ao portão é curta e explícita', () => {
    expect([...KINDS_QUE_EXIGEM_ENSINO]).toEqual(['conceito'])
    for (const kind of TODOS_OS_KINDS) {
      expect(exigeEnsinoPrevio(kind)).toBe(kind === 'conceito')
    }
  })
})

/**
 * UMA FONTE PARA CADA VERDADE.
 *
 * Não basta os dois arquivos concordarem hoje: eles concordavam antes também, e
 * depois deixaram de concordar sem que nada reprovasse. Este teste reprova a
 * REESCRITA, não o resultado.
 */
describe('a regra mora em um lugar só', () => {
  const APLICAM = [
    'src/domain/planning/planner-v2.ts',
    'src/components/training/ReviewSession.tsx',
  ]

  it('quem aplica a regra chama a função, e não a reescreve', () => {
    for (const caminho of APLICAM) {
      const fonte = readFileSync(caminho, 'utf8')
      expect(fonte, `${caminho} deveria importar a regra`).toContain('cardPodeSerRevisado')
    }
  })

  it('ninguém decide por tipo de card por conta própria', () => {
    for (const caminho of APLICAM) {
      const fonte = readFileSync(caminho, 'utf8')
      // Comentário citando o tipo é legítimo; código comparando com ele, não.
      const codigo = fonte
        .split('\n')
        .filter((linha) => !/^\s*(\/\/|\*|\/\*)/.test(linha))
        .join('\n')
      expect(codigo, `${caminho} decide sozinho sobre repertório`).not.toMatch(
        /kind\s*===\s*'repertorio'/,
      )
      expect(codigo, `${caminho} decide sozinho sobre conceito`).not.toMatch(
        /kind\s*!==\s*'conceito'/,
      )
    }
  })
})
