/**
 * Portão do currículo de finais.
 *
 * Varre a FONTE — `CURRICULO_FINAIS` — e não uma lista escrita à mão, porque
 * lista paralela nunca acusa a lição que nunca entrou nela.
 *
 * O que este portão PROVA:
 * - todo FEN é legal, possível numa partida real, e começa na vez do aluno;
 * - todo id (de lição e de posição) é único;
 * - toda habilidade existe em `SKILL_IDS`;
 * - todo objetivo NÃO está cumprido nem falhado na posição inicial (objetivo
 *   que nasce cumprido aprova qualquer lance do aluno);
 * - toda linha modelo é jogável do começo ao fim e termina com o objetivo
 *   cumprido, ou seja, o objetivo é ALCANÇÁVEL;
 * - todo objetivo de mate é FORÇADO no prazo declarado, contra qualquer defesa;
 * - todo tipo de objetivo que existe aparece no currículo.
 *
 * O que ele NÃO prova, e está declarado de propósito: que promoção e defesa de
 * empate são FORÇADAS. A linha modelo usa a defesa que o autor escolheu. A
 * prova definitiva desses dois sai da tablebase (`@/lib/tablebase`), que não é
 * consultada aqui porque teste unitário não toca a rede.
 */

import { describe, expect, it } from 'vitest'
import { CURRICULO_CONFIG, CURRICULO_FINAIS } from '@/content/endgames'
import {
  TIPOS_DE_OBJETIVO,
  avaliarObjetivo,
  contextoInicialDe,
  estimarMinutos,
  existeMateForcadoEm,
  posicaoEhJogavel,
  posicoesDe,
  reproduzirLinhaModelo,
} from '@/domain/endgames'
import { SKILL_IDS } from '@/domain/types'
import { isValidFen, positionStatus } from '@/lib/chess'

const licoes = CURRICULO_FINAIS
const posicoes = posicoesDe(licoes)

describe('currículo de finais', () => {
  // Regra 3 dos portões: tabela vazia não é aprovação. Um currículo vazio faria
  // todos os laços abaixo caírem no `continue` e imprimirem "tudo certo".
  it('a varredura encontrou lições e posições para checar', () => {
    expect(licoes.length).toBeGreaterThanOrEqual(7)
    expect(posicoes.length).toBeGreaterThanOrEqual(licoes.length)
    for (const licao of licoes) {
      expect(licao.posicoes.length, licao.id).toBeGreaterThan(0)
    }
  })

  it('todo id de lição e de posição é único', () => {
    const idsDeLicao = licoes.map((licao) => licao.id)
    expect(new Set(idsDeLicao).size, `ids repetidos em ${idsDeLicao.join(', ')}`).toBe(
      idsDeLicao.length,
    )
    const idsDePosicao = posicoes.map((posicao) => posicao.id)
    expect(new Set(idsDePosicao).size, `ids repetidos em ${idsDePosicao.join(', ')}`).toBe(
      idsDePosicao.length,
    )
  })

  it('toda habilidade citada existe em SKILL_IDS', () => {
    const conhecidas = new Set<string>(SKILL_IDS)
    for (const licao of licoes) {
      expect(conhecidas.has(licao.habilidade), `${licao.id} → ${licao.habilidade}`).toBe(true)
    }
  })

  it('toda habilidade de final tem alguma lição que a ensina', () => {
    // Varre a FONTE (`SKILL_IDS`), não a lista de lições: conferir o contrário
    // nunca acusaria a habilidade que ninguém ensina — e o sintoma dela é mudo,
    // uma coluna do modelo de maestria que nunca enche.
    const deFinal = SKILL_IDS.filter((id) => id.startsWith('endgame.'))
    expect(deFinal.length).toBeGreaterThan(0)

    const ensinadas = new Set(licoes.map((licao) => licao.habilidade))
    for (const id of deFinal) {
      expect(ensinadas.has(id), `${id} não é ensinada por nenhuma lição`).toBe(true)
    }
  })

  it('todo FEN é legal e começa na vez do aluno', () => {
    for (const posicao of posicoes) {
      expect(isValidFen(posicao.fen), `${posicao.id}: ${posicao.fen}`).toBe(true)
      // `isValidFen` sozinho não basta: ele aceita posição em que o lado sem a
      // vez está em xeque. Foi assim que uma posição impossível entrou neste
      // currículo e só apareceu três camadas abaixo, no gerador de lances.
      expect(
        posicaoEhJogavel(posicao.fen),
        `${posicao.id}: posição impossível (o lado sem a vez está em xeque?)`,
      ).toBe(true)
      const status = positionStatus(posicao.fen)
      expect(status.turn, `${posicao.id} não começa na vez do aluno`).toBe(posicao.ladoDoAluno)
      expect(status.isGameOver, `${posicao.id} já está terminada`).toBe(false)
    }
  })

  it('nenhum objetivo nasce cumprido nem nasce falhado', () => {
    for (const posicao of posicoes) {
      const inicial = avaliarObjetivo(posicao.fen, posicao.objetivo, contextoInicialDe(posicao))
      expect(inicial.estado, `${posicao.id}: ${inicial.motivo}`).toBe('em-andamento')
    }
  })

  it('toda linha modelo é jogável e termina com o objetivo cumprido', () => {
    for (const posicao of posicoes) {
      expect(posicao.linhaModelo.length, `${posicao.id} sem linha modelo`).toBeGreaterThanOrEqual(
        CURRICULO_CONFIG.linhaModeloMinima,
      )
      const reproducao = reproduzirLinhaModelo(posicao)
      expect(reproducao.erro, `${posicao.id}: ${reproducao.erro}`).toBeNull()
      expect(
        reproducao.resultadoFinal.estado,
        `${posicao.id} terminou em ${reproducao.resultadoFinal.motivo}`,
      ).toBe('cumprido')
    }
  })

  it('todo objetivo de mate é forçado no prazo declarado', () => {
    let verificados = 0
    for (const posicao of posicoes) {
      if (posicao.objetivo.tipo !== 'mate-em') {
        continue
      }
      verificados += 1
      expect(
        posicao.objetivo.lancesMaximos,
        `${posicao.id} pede mais fôlego do que o portão consegue provar`,
      ).toBeLessThanOrEqual(CURRICULO_CONFIG.mateMaximoVerificavel)
      expect(
        existeMateForcadoEm(posicao.fen, posicao.ladoDoAluno, posicao.objetivo.lancesMaximos),
        `${posicao.id} não tem mate forçado em ${posicao.objetivo.lancesMaximos}`,
      ).toBe(true)
    }
    expect(verificados, 'nenhum objetivo de mate foi verificado').toBeGreaterThan(0)
  })

  it('todo tipo de objetivo que existe aparece no currículo', () => {
    const usados = new Set(posicoes.map((posicao) => posicao.objetivo.tipo))
    for (const tipo of TIPOS_DE_OBJETIVO) {
      expect(usados.has(tipo), `nenhuma posição do currículo usa o objetivo "${tipo}"`).toBe(true)
    }
  })

  it('toda lição tem texto em PT-BR e estimativa de tempo positiva', () => {
    for (const licao of licoes) {
      expect(licao.titulo.trim().length, licao.id).toBeGreaterThan(0)
      expect(licao.conceito.trim().length, licao.id).toBeGreaterThan(20)
      expect(estimarMinutos(licao), licao.id).toBeGreaterThan(0)
      for (const posicao of licao.posicoes) {
        expect(posicao.enunciado.trim().length, posicao.id).toBeGreaterThan(0)
      }
    }
  })
})
