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
  indiceDaEscolha,
} from '@/domain/openings/sparring'
import { ramificacoesDaAbertura } from '@/domain/openings/variacoes'

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

  it('a primeira partida é a linha principal', () => {
    // A rodada 0 confirma o que foi ensinado. Os desvios vêm ao recomeçar.
    const escolha = lanceDoBot(ITALIANA, iniciarSparring(ITALIANA), 0)
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

/**
 * O BOT JOGA AS VARIAÇÕES ENSINADAS.
 *
 * Este bloco existe por causa de um defeito que a suíte antiga não via: o bot
 * filtrava as continuações para a linha principal e só olhava as variações
 * quando a principal acabava. Como uma variação ramifica JUSTAMENTE onde a
 * principal continua, ela era inalcançável — o aluno estudava a Defesa dos
 * Dois Cavalos numa etapa e nunca a encontrava no treino.
 *
 * O teste é escrito sobre o CONTEÚDO, e não sobre a Italiana: qualquer abertura
 * nova que traga uma variação do lado do adversário entra aqui sozinha.
 */
describe('o bot joga as variações, e não só a linha principal', () => {
  /** Uma partida inteira contra o bot, com o aluno sempre seguindo a teoria. */
  function partidaContraOBot(opening: (typeof OPENING_COURSES)[number], rodada: number): string[] {
    const lado = opening.side === 'white' ? 'w' : 'b'
    let estado = deixarBotJogar(opening, iniciarSparring(opening), lado, rodada).estado

    for (let ply = 0; ply < 60; ply += 1) {
      const opcoes = continuacoesConhecidas(opening, estado.historico)
      if (opcoes.length === 0) break

      const jogada = jogarNoSparring(opening, estado, opcoes[0].uci)
      if (jogada.tipo !== 'na-teoria') break
      estado = deixarBotJogar(opening, jogada.estado, lado, rodada).estado
    }

    return [...estado.historico]
  }

  for (const opening of OPENING_COURSES) {
    const ramos = ramificacoesDaAbertura(opening).filter(
      (ramo) => ramo.indiceDaDivergencia !== null && ramo.ladoQueDesvia !== opening.side,
    )
    if (ramos.length === 0) continue

    for (const ramo of ramos) {
      it(`${opening.slug}: alguma rodada traz a ${ramo.variacao.name}`, () => {
        /*
          A CONFERÊNCIA É POR PREFIXO, e a primeira versão deste teste não era —
          ela perguntava se o lance do desvio aparecia em algum lugar do
          histórico. Na Italiana isso passava com o bot ANTIGO: o desvio é Cf6,
          e a linha principal também joga Cf6, oito lances depois. O teste ficava
          verde provando o contrário do que afirmava.

          Seguir a variação significa que os lances até o desvio, INCLUSIVE, são
          exatamente os dela.
        */
        const divergencia = ramo.indiceDaDivergencia ?? 0
        const ateODesvio = ramo.variacao.line
          .slice(0, divergencia + 1)
          .map((lance) => lance.uci.toLowerCase())

        // Recomeçar é o que muda a rodada. Damos ao aluno tantas partidas
        // quantas variações existem, mais folga — se nem assim o desvio
        // aparecer, ele é conteúdo que ninguém alcança.
        const rodadas = opening.variations.length + 2
        const alcancado = Array.from({ length: rodadas }, (_, rodada) =>
          partidaContraOBot(opening, rodada),
        ).some((historico) => ateODesvio.every((uci, i) => historico[i]?.toLowerCase() === uci))

        expect(alcancado, `${ramo.variacao.name} nunca é jogada pelo bot`).toBe(true)
      })
    }
  }

  it('nenhuma rodada faz o bot sair da árvore', () => {
    /*
      A contrapartida do teste acima: agora que o bot ramifica, "ele nunca
      improvisa" precisa valer para TODA rodada, e não só para a rodada 0.
    */
    for (const opening of OPENING_COURSES) {
      const declarados = new Set(
        [
          ...opening.mainline.map((l) => l.uci),
          ...opening.variations.flatMap((v) => v.line.map((l) => l.uci)),
        ].map((uci) => uci.toLowerCase()),
      )

      for (let rodada = 0; rodada < 6; rodada += 1) {
        for (const uci of partidaContraOBot(opening, rodada)) {
          expect(declarados.has(uci), `${opening.slug}: ${uci} não está na abertura`).toBe(true)
        }
      }
    }
  })

  it('o aluno também pode escolher a variação, quando o desvio é do lado dele', () => {
    /*
      Nem toda variação é do adversário. No repertório de pretas do Gambito da
      Dama Recusado, a Eslava é uma escolha do ALUNO — e o bot tem de aceitá-la
      como teoria, não tratá-la como saída do repertório.
    */
    const comEscolhaDoAluno = OPENING_COURSES.flatMap((opening) =>
      ramificacoesDaAbertura(opening)
        .filter((ramo) => ramo.indiceDaDivergencia !== null && ramo.ladoQueDesvia === opening.side)
        .map((ramo) => ({ opening, ramo })),
    )

    expect(comEscolhaDoAluno.length).toBeGreaterThan(0)

    for (const { opening, ramo } of comEscolhaDoAluno) {
      const divergencia = ramo.indiceDaDivergencia ?? 0
      let estado = iniciarSparring(opening)

      // Até o desvio, as duas linhas são a mesma.
      for (let i = 0; i < divergencia; i += 1) {
        const jogada = jogarNoSparring(opening, estado, ramo.variacao.line[i].uci)
        expect(jogada.tipo).toBe('na-teoria')
        if (jogada.tipo !== 'na-teoria') return
        estado = jogada.estado
      }

      const desvio = jogarNoSparring(opening, estado, ramo.variacao.line[divergencia].uci)
      expect(desvio.tipo, `${ramo.variacao.name} deveria ser teoria`).toBe('na-teoria')
    }
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

describe('a escolha do bot se espalha dentro da partida', () => {
  /**
   * O QUE ISTO CORRIGE (plano VNext §48). A seleção era `seed % opcoes`, e o
   * `seed` é a RODADA — o mesmo valor em todos os lances. O bot pegava a SEGUNDA
   * opção em cada bifurcação da rodada 1, a terceira na rodada 2, e o aluno
   * aprendia o padrão do sorteio em vez do repertório.
   */
  it('a rodada 0 é a linha principal do começo ao fim', () => {
    /*
      A EXCEÇÃO É DELIBERADA: a primeira partida confirma o que foi ensinado. Sem
      ela, quem acabou de estudar entraria no sparring e encontraria um desvio no
      terceiro lance — bom treino, péssima estreia.
    */
    for (let ply = 0; ply < 12; ply += 1) {
      expect(indiceDaEscolha(0, ply, 4), `ply ${ply}`).toBe(0)
    }
  })

  it('a partir da rodada 1, o índice varia com o ply', () => {
    const indices = Array.from({ length: 6 }, (_, ply) => indiceDaEscolha(1, ply, 3))
    expect(new Set(indices).size).toBeGreaterThan(1)
  })

  it('nunca aponta para fora da lista', () => {
    // Um índice fora da faixa devolveria `undefined` e o bot pararia de jogar no
    // meio da partida, como se a teoria tivesse acabado.
    for (const seed of [0, 1, 2, 7, 99]) {
      for (let ply = 0; ply < 20; ply += 1) {
        for (const total of [1, 2, 3, 5]) {
          const indice = indiceDaEscolha(seed, ply, total)
          expect(indice, `seed ${seed} ply ${ply} total ${total}`).toBeGreaterThanOrEqual(0)
          expect(indice).toBeLessThan(total)
        }
      }
    }
  })

  it('lista vazia não quebra', () => {
    expect(indiceDaEscolha(3, 5, 0)).toBe(0)
  })

  it('é determinístico: mesma entrada, mesma escolha', () => {
    // É o que torna possível o teste que prova "o bot nunca sai da árvore".
    expect(indiceDaEscolha(4, 7, 3)).toBe(indiceDaEscolha(4, 7, 3))
  })
})
