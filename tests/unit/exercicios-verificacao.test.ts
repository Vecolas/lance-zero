/**
 * Portão do verificador de exercício posicional — o lado que MORDE PARA DENTRO.
 *
 * POR QUE ESTE ARQUIVO EXISTE. Os portões do banco de diagnóstico e do catálogo
 * de lições varrem o conteúdo REAL e exigem lista de falhas vazia. Isso prova
 * que o conteúdo escrito está certo. Não prova nada sobre o VERIFICADOR: uma
 * `verificarExercicio` que devolvesse `[]` sempre passaria nos dois, e o dia em
 * que alguém escrevesse um distrator que também ganha material, o aluno
 * responderia certo e o app diria que ele errou — em silêncio, porque o CI
 * continuaria verde.
 *
 * Descoberto por mutação ao mover o verificador para `@/domain/exercicios`
 * (issue #74): desligar a checagem das alternativas não reprovava nenhum
 * portão. Este arquivo é o conserto, e ele NÃO muda comportamento nenhum — só
 * afirma o que a função já fazia.
 *
 * A posição é sintética e mínima de propósito: bispo branco em e4, dama preta
 * indefesa em d5. `Bxd5` ganha a dama contra qualquer resposta; `Ke2` não ganha
 * nada e ainda entrega o bispo. Com esses dois lances dá para escrever de
 * propósito cada erro de conteúdo que o verificador tem de acusar.
 *
 * OS PEÕES NÃO SÃO ENFEITE. Sem eles, `Bxd5` deixa rei e bispo contra rei — que
 * é empate por material insuficiente, e `saldoForcadoApos` devolve 0 para
 * partida terminada, de propósito. O lance ganharia a dama e o objetivo
 * reprovaria. Custou uma rodada de depuração; fica escrito.
 */

import { describe, expect, it } from 'vitest'
import { PIECE_VALUES } from '@/domain/games/board'
import {
  verificarExercicio,
  type ExercicioPosicional,
  type ObjetivoGanhaMaterial,
} from '@/domain/exercicios'

/** Bispo em e4 ataca a dama preta indefesa em d5. Brancas jogam. */
const DAMA_PENDURADA = '4k3/pp6/8/3q4/4B3/8/PP6/4K3 w - - 0 1'

/** Come a dama. Ganha material contra qualquer resposta. */
const COME_A_DAMA = 'e4d5'

/** Anda com o rei. Não ganha nada — e ainda perde o bispo depois. */
const ANDA_O_REI = 'e1e2'

/**
 * O piso é DERIVADO da tabela de valores, não cravado: se alguém recalibrar a
 * dama, este portão continua pedindo "uma dama" em vez de pedir um número que
 * deixou de significar isso.
 */
const GANHA_A_DAMA: ObjetivoGanhaMaterial = {
  tipo: 'ganha-material',
  saldoMinimo: PIECE_VALUES.q,
}

function exercicio(campos: Partial<ExercicioPosicional>): ExercicioPosicional {
  return {
    id: 'sintetico',
    fen: DAMA_PENDURADA,
    ladoDoAluno: 'w',
    objetivo: GANHA_A_DAMA,
    lancesAceitos: [COME_A_DAMA],
    alternativas: [ANDA_O_REI],
    ...campos,
  }
}

function problemas(item: ExercicioPosicional): string {
  return verificarExercicio(item)
    .map((falha) => falha.problema)
    .join(' | ')
}

describe('verificação de exercício posicional', () => {
  it('exercício correto não gera falha nenhuma', () => {
    expect(verificarExercicio(exercicio({}))).toEqual([])
  })

  it('acusa lance aceito que não cumpre o objetivo', () => {
    const falhas = verificarExercicio(exercicio({ lancesAceitos: [ANDA_O_REI] }))
    expect(problemas(exercicio({ lancesAceitos: [ANDA_O_REI] }))).toContain(
      'lance aceito não cumpre o objetivo',
    )
    expect(falhas.every((falha) => falha.itemId === 'sintetico')).toBe(true)
  })

  it('acusa alternativa apresentada como errada que também cumpre o objetivo', () => {
    expect(
      problemas(exercicio({ lancesAceitos: [ANDA_O_REI], alternativas: [COME_A_DAMA] })),
    ).toContain('alternativa apresentada como errada também cumpre o objetivo')
  })

  it('acusa o mesmo lance nos dois lados da chave de correção', () => {
    expect(problemas(exercicio({ alternativas: [COME_A_DAMA] }))).toContain(
      'está ao mesmo tempo entre os aceitos e entre as alternativas',
    )
  })

  it('acusa lance ilegal, sem deixar a busca lançar', () => {
    // Bispo não anda em coluna. O verificador relata; não lança.
    expect(problemas(exercicio({ lancesAceitos: ['e4e5'] }))).toContain('é ilegal em')
  })

  it('acusa FEN que não descreve uma posição possível', () => {
    expect(problemas(exercicio({ fen: 'isto não é um FEN' }))).toContain(
      'FEN inválido ou posição impossível',
    )
  })

  it('acusa FEN que não está na vez do aluno', () => {
    expect(problemas(exercicio({ ladoDoAluno: 'b' }))).toContain('o FEN não está na vez de b')
  })

  it('acusa posição já terminada', () => {
    // Mate do pastor consumado: não há lance a pedir.
    const terminada = 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4'
    expect(problemas(exercicio({ fen: terminada, ladoDoAluno: 'b' }))).toContain(
      'a posição já está terminada',
    )
  })
})

describe('a continuação, quando existe', () => {
  /*
    O PORTÃO DA CONTINUAÇÃO PRECISA MORDER PARA DENTRO, e este bloco é o único
    lugar que prova isso. O catálogo real ainda não tem nenhuma continuação
    autorada — varrê-lo só afirmaria que zero continuações estão corretas, que é
    verdade sobre coisa nenhuma.

    O modo de falha coberto é SILENCIOSO por natureza: o motor de sequência PARA
    no primeiro lance impossível, sem erro. Uma continuação com um typo vira, na
    tela, um exercício que acaba cedo — o aluno acerta, o computador não
    responde, e nada diz que faltou conteúdo.
  */

  /** O peão de b7 sai da diagonal, e o bispo de d5 segue até a8. */
  const AVANCA_O_PEAO = 'b7b6'
  const BISPO_ATE_A8 = 'd5a8'

  it('continuação legal do começo ao fim não gera falha', () => {
    expect(
      verificarExercicio(exercicio({ continuacao: [COME_A_DAMA, AVANCA_O_PEAO, BISPO_ATE_A8] })),
    ).toEqual([])
  })

  it('acusa lance impossível no meio da continuação', () => {
    expect(problemas(exercicio({ continuacao: [COME_A_DAMA, 'h7h5'] }))).toContain(
      'a continuação tem lance impossível na posição',
    )
  })

  it('acusa continuação que não começa pelo lance que o exercício cobra', () => {
    expect(problemas(exercicio({ continuacao: [ANDA_O_REI] }))).toContain(
      'não está entre os lances aceitos',
    )
  })

  it('acusa continuação que termina no lance do computador', () => {
    /*
      É o defeito que deixaria a tela pedindo uma jogada que a linha não tem: o
      aluno olharia a posição esperando instrução, e o exercício nunca
      concluiria. Ninguém veria erro — só um exercício travado.
    */
    expect(problemas(exercicio({ continuacao: [COME_A_DAMA, AVANCA_O_PEAO] }))).toContain(
      'termina num lance do computador',
    )
  })
})
