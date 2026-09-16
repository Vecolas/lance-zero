/**
 * O bot que joga a abertura contra o aluno.
 *
 * O CASO MAIS IMPORTANTE é `o bot NUNCA sai da árvore`. Ele é a diferença entre
 * treinar um repertório e jogar uma partida livre: um adversário que improvisa
 * quando a teoria acaba leva o aluno para posições que o repertório dele não
 * prevê, e o aluno sai achando que estudou errado.
 *
 * O SEGUNDO é que "fora do repertório" NÃO é chamado de erro. Um lance que esta
 * abertura não cobre pode ser excelente; o que o app pode afirmar é que ele sai
 * do que foi estudado. Chamar de erro o que não se conferiu é a explicação
 * inventada que o CLAUDE.md proíbe.
 */

import { describe, expect, it } from 'vitest'
import { OPENING_COURSES } from '@/content/openings/course'
import {
  aplicarLanceDoBot,
  continuacoesConhecidas,
  deixarBotJogar,
  ehVezDoBot,
  iniciarSparring,
  jogarNoSparring,
  lanceDoBot,
  vezDe,
} from '@/domain/openings/sparring'

const ITALIANA = OPENING_COURSES.find((o) => o.slug === 'italiana') ?? OPENING_COURSES[0]

describe('o bot conhece a abertura', () => {
  it('oferece a continuação da linha principal na raiz', () => {
    const opcoes = continuacoesConhecidas(ITALIANA, [])
    expect(opcoes.length).toBeGreaterThan(0)
    expect(opcoes[0].principal).toBe(true)
    expect(opcoes[0].uci).toBe(ITALIANA.mainline[0].uci)
  })

  it('o comentário vem do conteúdo, e é o que explica o lance', () => {
    const [primeira] = continuacoesConhecidas(ITALIANA, [])
    expect(primeira.comment).toBe(ITALIANA.mainline[0].comment)
  })

  it('prefere a linha principal quando há variação disputando a mesma posição', () => {
    const escolha = lanceDoBot(ITALIANA, iniciarSparring(ITALIANA))
    expect(escolha?.principal).toBe(true)
  })

  it('a escolha é determinística: o mesmo seed dá o mesmo lance', () => {
    // Sem isto não daria para escrever o teste abaixo — nem para o aluno
    // repetir uma sessão que deu errado.
    const estado = iniciarSparring(ITALIANA)
    expect(lanceDoBot(ITALIANA, estado, 7)).toEqual(lanceDoBot(ITALIANA, estado, 7))
  })
})

describe('o bot NUNCA sai da árvore', () => {
  it('joga a linha inteira e depois admite que a teoria acabou', () => {
    /*
      Joga a abertura dos DOIS lados pelo próprio bot, até ele não ter mais o
      que oferecer. Em nenhum momento ele pode devolver um lance que a abertura
      não declara — é isso que separa treinar repertório de jogar partida.
    */
    let estado = iniciarSparring(ITALIANA)
    const declarados = new Set(
      [
        ...ITALIANA.mainline.map((l) => l.uci),
        ...ITALIANA.variations.flatMap((v) => v.line.map((l) => l.uci)),
      ].map((uci) => uci.toLowerCase()),
    )

    for (let ply = 0; ply < 60; ply += 1) {
      const escolha = lanceDoBot(ITALIANA, estado)
      if (!escolha) break
      expect(declarados.has(escolha.uci), `${escolha.uci} não está na abertura`).toBe(true)
      estado = aplicarLanceDoBot(estado, escolha)
    }

    // Chegou ao fim da teoria, e o estado continua coerente.
    expect(lanceDoBot(ITALIANA, estado)).toBeNull()
    expect(estado.historico.length).toBeGreaterThan(0)
  })
})

describe('o lance do aluno', () => {
  it('lance ilegal não muda o estado', () => {
    const estado = iniciarSparring(ITALIANA)
    expect(jogarNoSparring(ITALIANA, estado, 'a1a8')).toEqual({ tipo: 'ilegal' })
  })

  it('o lance da teoria continua na árvore', () => {
    const estado = iniciarSparring(ITALIANA)
    const resultado = jogarNoSparring(ITALIANA, estado, ITALIANA.mainline[0].uci)

    expect(resultado.tipo).toBe('na-teoria')
    if (resultado.tipo !== 'na-teoria') return
    expect(resultado.estado.naArvore).toBe(true)
    expect(resultado.continuacao.comment).toBeTruthy()
  })

  it('lance legal fora da abertura é "fora do repertório", nunca "errado"', () => {
    /*
      A DISTINÇÃO É O PONTO. O app não conferiu se o lance é bom — ele só sabe
      que a abertura estudada não o cobre, e é exatamente isso que ele diz.
    */
    const estado = iniciarSparring(ITALIANA)
    const outro = ITALIANA.mainline[0].uci === 'e2e4' ? 'd2d4' : 'e2e4'
    const resultado = jogarNoSparring(ITALIANA, estado, outro)

    expect(resultado.tipo).toBe('fora-do-repertorio')
    if (resultado.tipo !== 'fora-do-repertorio') return
    // O lance ACONTECE: sair do repertório não trava o tabuleiro.
    expect(resultado.estado.historico).toHaveLength(1)
    expect(resultado.estado.naArvore).toBe(false)
  })

  it('uma vez fora da árvore, não se volta a dizer que está na teoria', () => {
    const estado = iniciarSparring(ITALIANA)
    const outro = ITALIANA.mainline[0].uci === 'e2e4' ? 'd2d4' : 'e2e4'
    const fora = jogarNoSparring(ITALIANA, estado, outro)
    if (fora.tipo !== 'fora-do-repertorio') throw new Error('esperava sair do repertório')

    // Qualquer lance seguinte continua fora: a sessão não "se conserta".
    const seguinte = jogarNoSparring(ITALIANA, fora.estado, 'g8f6')
    if (seguinte.tipo === 'ilegal') return
    expect(seguinte.estado.naArvore).toBe(false)
  })
})

describe('o bot responde como consequência do lance', () => {
  it('deixa o bot jogar até a vez voltar ao aluno', () => {
    /*
      `deixarBotJogar` é a transição "aluno jogou → bot respondeu" inteira. Ela
      existe no domínio porque o bot responder é CONSEQUÊNCIA do lance, não
      efeito de renderização — a primeira versão vivia num efeito que escrevia
      estado, e o lint do projeto reprovou com razão.
    */
    const inicial = iniciarSparring(ITALIANA)
    const ladoDoBot = vezDe(inicial)
    const ladoDoAluno = ladoDoBot === 'w' ? 'b' : 'w'

    const avanco = deixarBotJogar(ITALIANA, inicial, ladoDoAluno)

    expect(avanco.estado.historico.length).toBeGreaterThan(0)
    expect(vezDe(avanco.estado)).toBe(ladoDoAluno)
    expect(avanco.comentario).toBeTruthy()
    expect(avanco.fimDaTeoria).toBe(false)
  })

  it('quando já é a vez do aluno, não joga nada', () => {
    const inicial = iniciarSparring(ITALIANA)
    const avanco = deixarBotJogar(ITALIANA, inicial, vezDe(inicial))

    expect(avanco.estado).toEqual(inicial)
    expect(avanco.comentario).toBeNull()
  })

  it('fora da árvore o bot não joga — ele não tem o que jogar', () => {
    const inicial = iniciarSparring(ITALIANA)
    const outro = ITALIANA.mainline[0].uci === 'e2e4' ? 'd2d4' : 'e2e4'
    const fora = jogarNoSparring(ITALIANA, inicial, outro)
    if (fora.tipo !== 'fora-do-repertorio') throw new Error('esperava sair do repertório')

    const avanco = deixarBotJogar(ITALIANA, fora.estado, vezDe(inicial))
    expect(avanco.estado).toEqual(fora.estado)
    expect(avanco.comentario).toBeNull()
  })
})

describe('de quem é a vez', () => {
  it('sai da posição, não da contagem de lances', () => {
    /*
      Contar lances diria a mesma coisa só enquanto a raiz fosse sempre das
      brancas — e um repertório de pretas começa com o lance branco já feito.
    */
    const estado = iniciarSparring(ITALIANA)
    expect(vezDe(estado)).toBe(ITALIANA.rootFen.split(' ')[1] === 'b' ? 'b' : 'w')
  })

  it('o bot joga quando não é a vez do aluno', () => {
    const estado = iniciarSparring(ITALIANA)
    const daVez = vezDe(estado)
    expect(ehVezDoBot(estado, daVez)).toBe(false)
    expect(ehVezDoBot(estado, daVez === 'w' ? 'b' : 'w')).toBe(true)
  })
})
