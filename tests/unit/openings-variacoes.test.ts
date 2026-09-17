/**
 * ONDE UMA VARIAÇÃO COMEÇA A ENSINAR.
 *
 * O MODO DE FALHA QUE ESTE ARQUIVO COBRE é conteúdo que parece ensinado e não
 * está: uma variação listada como `e4 e5 Cf3 Cc6 Bc4 Cf6 d3` é sete lances dos
 * quais cinco são reprise da linha principal, e o único que importa — o desvio
 * — não recebe destaque nenhum. O aluno lê a etapa inteira sem nunca ver a
 * posição em que a decisão acontece.
 *
 * O SEGUNDO CASO é o oposto: uma "variação" que NÃO desvia. O Giuoco Piano, no
 * conteúdo atual, é o nome de um trecho da própria linha principal. Apresentá-lo
 * como bifurcação ensinaria uma escolha que não existe no tabuleiro.
 */

import { describe, expect, it } from 'vitest'
import { OPENING_COURSES } from '@/content/openings/course'
import {
  posicoesDaLinha,
  ramificacaoDaVariacao,
  ramificacoesDaAbertura,
  variacaoEmCurso,
} from '@/domain/openings/variacoes'
import { ramosCore, ramosDaAbertura } from '@/domain/openings/ramos'
import { identidadeDePosicao } from '@/lib/chess'

const ITALIANA = OPENING_COURSES.find((o) => o.slug === 'italiana') ?? OPENING_COURSES[0]

describe('percorrer uma linha', () => {
  it('produz uma posição a mais que os lances — a inicial conta', () => {
    const posicoes = posicoesDaLinha(ITALIANA.rootFen, ITALIANA.mainline)
    expect(posicoes).toHaveLength(ITALIANA.mainline.length + 1)
    expect(posicoes[0]).toBe(ITALIANA.rootFen)
  })

  it('TESTE DE CONTEÚDO — toda linha autorada é legal do começo ao fim', () => {
    /*
      `posicoesDaLinha` PARA no primeiro lance ilegal, em silêncio. Sem este
      portão, uma variação com um lance impossível apareceria truncada na tela
      sem erro nenhum: falso verde clássico, e do tipo que só o aluno descobre.
    */
    for (const opening of OPENING_COURSES) {
      for (const variacao of opening.variations) {
        expect(
          posicoesDaLinha(opening.rootFen, variacao.line),
          `${opening.slug}/${variacao.id} tem lance ilegal`,
        ).toHaveLength(variacao.line.length + 1)
      }
    }
  })
})

describe('a ramificação de uma variação', () => {
  it('acha o lance em que o adversário recusa a linha principal', () => {
    const dois = ITALIANA.variations.find((v) => v.id === 'italiana-dois-cavalos')
    expect(dois).toBeDefined()
    if (!dois) return

    const ramo = ramificacaoDaVariacao(ITALIANA, dois)

    // Cf6 no lugar de Bc5: é isto, e só isto, que a variação ensina.
    expect(ramo.indiceDaDivergencia).not.toBeNull()
    expect(ramo.variacao.line[ramo.indiceDaDivergencia ?? 0].san).toBe('Nf6')
    expect(ramo.lanceRecusado?.san).toBe('Bc5')

    // Os lances anteriores são os da linha principal, e a etapa os resume.
    expect(ramo.lancesEmComum.map((l) => l.san)).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'])
  })

  it('a posição da decisão é a posição em que o desvio é jogado', () => {
    const [ramo] = ramificacoesDaAbertura(ITALIANA)

    // O tabuleiro da etapa abre AQUI. Se abrisse depois do desvio, o aluno veria
    // o resultado da decisão sem nunca ver a decisão.
    const posicoes = posicoesDaLinha(ITALIANA.rootFen, ramo.variacao.line)
    expect(ramo.fenDaDecisao).toBe(posicoes[ramo.indiceDaDivergencia ?? 0])

    // E quem decide é de quem é a vez nessa posição, não quem "costuma" desviar.
    const vez = ramo.fenDaDecisao.split(' ')[1] === 'b' ? 'black' : 'white'
    expect(ramo.ladoQueDesvia).toBe(vez)
  })

  it('uma variação que não desvia é reconhecida como o que é', () => {
    const piano = ITALIANA.variations.find((v) => v.id === 'italiana-giuoco-piano')
    expect(piano).toBeDefined()
    if (!piano) return

    const ramo = ramificacaoDaVariacao(ITALIANA, piano)
    expect(ramo.indiceDaDivergencia).toBeNull()
    expect(ramo.lanceRecusado).toBeNull()
    expect(ramo.lancesEmComum).toHaveLength(piano.line.length)
  })

  it('o desvio pode ser do lado do aluno, e não só do adversário', () => {
    /*
      Nem toda variação é uma resposta do adversário: algumas são uma escolha do
      próprio repertório. Um módulo que assumisse "variação = lance do outro"
      escreveria "o adversário joga c6" numa linha em que quem joga é o aluno.
    */
    const ladosQueDesviam = OPENING_COURSES.flatMap((opening) =>
      ramificacoesDaAbertura(opening)
        .filter((ramo) => ramo.indiceDaDivergencia !== null)
        .map((ramo) => (ramo.ladoQueDesvia === opening.side ? 'aluno' : 'adversario')),
    )

    expect(ladosQueDesviam).toContain('adversario')
    expect(ladosQueDesviam).toContain('aluno')
  })
})

describe('o ramo é a unidade — os invariantes que substituem a partição', () => {
  /*
    O QUE SAIU DAQUI, e por quê. Havia um portão afirmando que
    `respostasDoAdversario` e `variacoesDoAluno` eram COMPLEMENTARES: a soma das
    duas dava o total, e nenhum id aparecia nas duas. Ele guardava o ADR-0018,
    que dividia a jornada em duas etapas por QUEM TOMOU A DECISÃO.

    O VNext desfaz essa divisão: o ramo passa a ser a unidade que o aluno vê, e
    `autor` volta a ser metadata. Um portão sobre a soma de duas listas que não
    existem mais guardaria uma promessa vazia — o pior tipo, porque continua
    verde para sempre.

    No lugar dele entram três invariantes sobre a lista ÚNICA, e cada um cobre
    um jeito diferente de perder conteúdo em silêncio.
  */

  it('todo ramo autorado aparece exatamente uma vez, e com id único', () => {
    for (const opening of OPENING_COURSES) {
      const ramos = ramosDaAbertura(opening)

      // Nenhum some e nenhum se duplica na travessia da biblioteca.
      expect(ramos.length, `${opening.slug}: a lista de ramos perdeu conteúdo`).toBe(
        opening.variations.length,
      )

      const ids = ramos.map((ramo) => ramo.id)
      expect(new Set(ids).size, `${opening.slug}: id de ramo repetido`).toBe(ids.length)
    }
  })

  it('todo ramo é alcançável no grafo a partir da posição inicial', () => {
    /*
      ALCANÇABILIDADE É O INVARIANTE QUE FALTAVA. Um ramo pode ser legal do
      começo ao fim e ainda assim nunca acontecer numa partida que siga o
      repertório — bastam os lances anteriores não existirem no grafo. Ele
      apareceria na biblioteca, seria estudável, e o bot jamais o jogaria.
    */
    for (const opening of OPENING_COURSES) {
      for (const ramo of ramosDaAbertura(opening)) {
        const posicoes = posicoesDaLinha(opening.rootFen, ramo.ramificacao.variacao.line)
        const fenDaDecisao = posicoes[ramo.ramificacao.indiceDaDivergencia ?? 0]
        expect(
          fenDaDecisao !== undefined && opening.graph.has(identidadeDePosicao(fenDaDecisao)),
          `${opening.slug}/${ramo.id}: a posição de bifurcação não está no grafo`,
        ).toBe(true)
      }
    }
  })

  it('TESTE DE CONTEÚDO — todo ramo core traz intenção do adversário e objetivo do aluno', () => {
    /*
      SEM ESTES DOIS CAMPOS O RAMO VOLTA A SER UMA SEQUÊNCIA DE LANCES. A
      pergunta que o aluno leva para a partida não é "qual era o lance?", é "o
      que ele está tentando fazer?" — e é essa que sobrevive quando a ordem dos
      lances muda.

      Só `core` é cobrado: é o que bloqueia a conclusão. Exigir de `optional`
      transformaria conteúdo de referência em dívida.
    */
    for (const opening of OPENING_COURSES) {
      const core = ramosCore(opening)
      expect(core.length, `${opening.slug} não tem nenhum ramo core`).toBeGreaterThan(0)

      for (const ramo of core) {
        expect(
          (ramo.intencaoDoAdversario ?? '').trim().length,
          `${opening.slug}/${ramo.id}: ramo core sem intenção do adversário`,
        ).toBeGreaterThan(20)
        expect(
          (ramo.objetivoDoAluno ?? '').trim().length,
          `${opening.slug}/${ramo.id}: ramo core sem objetivo do aluno`,
        ).toBeGreaterThan(20)
      }
    }
  })

  it('o autor do ramo continua sendo verdade, agora como metadata', () => {
    /*
      `autor` deixou de criar etapa, mas não deixou de existir: é ele que decide
      se a tela escreve "o adversário joga" ou "você joga", e é ele que separa
      os papéis na cobertura. Um módulo que assumisse "ramo = lance do outro"
      mentiria na Eslava dentro do repertório de pretas do Gambito da Dama.
    */
    const autores = OPENING_COURSES.flatMap((opening) =>
      ramosDaAbertura(opening).map((ramo) => ramo.autor),
    )
    expect(autores).toContain('adversario')
    expect(autores).toContain('aluno')
    expect(autores).toContain('nenhum')
  })
})

describe('o conteúdo do desvio em diante', () => {
  /*
    A ETAPA MOSTRA ESTES LANCES UM A UM, NUM TABULEIRO GRANDE. O comentário é a
    aula; sem ele a tela é um tabuleiro bonito com um rótulo embaixo.

    O portão existe porque `validateOpeningDefinition` só cobra comentário na
    LINHA PRINCIPAL: um `comment: ''` numa variação passa em runtime, e um
    `'Centro.'` passa em qualquer lugar. Era assim que quatro das linhas
    autoradas estavam — reprise da principal com rótulos de uma palavra.

    Só vale do DESVIO EM DIANTE: o prefixo é a linha principal repetida, a
    navegação da etapa nem o mostra, e cobrá-lo obrigaria a reescrever o que já
    foi ensinado.
  */
  /*
    O PISO NÃO É CALIBRADO, e é por isso que ele está nomeado aqui em vez de
    solto numa comparação. Ele é o comprimento abaixo do qual TODO comentário de
    variação do catálogo anterior era rótulo e não explicação: 'Centro.' tem 8,
    'Defesa natural.' tem 15, 'Recupere e abra linhas.' tem 23 e o mais longo de
    todos, 'Sustente e4 e continue o plano.', tem 31.
  */
  const MINIMO_DE_COMENTARIO = 40

  it('todo lance a partir do desvio tem comentário de verdade', () => {
    for (const opening of OPENING_COURSES) {
      for (const ramo of ramificacoesDaAbertura(opening)) {
        if (ramo.indiceDaDivergencia === null) continue
        for (let i = ramo.indiceDaDivergencia; i < ramo.variacao.line.length; i += 1) {
          const lance = ramo.variacao.line[i]
          expect(
            lance.comment.trim().length,
            `${opening.slug}/${ramo.variacao.id}: ${lance.san} tem comentário curto demais ("${lance.comment}")`,
          ).toBeGreaterThanOrEqual(MINIMO_DE_COMENTARIO)
        }
      }
    }
  })

  it('o comentário do desvio não é o da linha principal copiado', () => {
    /*
      A MANEIRA ÓBVIA DE BURLAR O PISO É COLAR O COMENTÁRIO DA PRINCIPAL, que já
      é longo o bastante. Ele descreveria o lance recusado, não o jogado — e o
      aluno leria, na posição da decisão, a explicação da decisão oposta.
    */
    for (const opening of OPENING_COURSES) {
      for (const ramo of ramificacoesDaAbertura(opening)) {
        if (ramo.indiceDaDivergencia === null) continue
        for (let i = ramo.indiceDaDivergencia; i < ramo.variacao.line.length; i += 1) {
          const daVariacao = ramo.variacao.line[i].comment.trim()
          const daPrincipal = opening.mainline[i]?.comment.trim()
          if (daPrincipal === undefined) continue
          expect(
            daVariacao,
            `${opening.slug}/${ramo.variacao.id}: o lance ${ramo.variacao.line[i].san} repete o comentário da linha principal`,
          ).not.toBe(daPrincipal)
        }
      }
    }
  })

  it('o lance do desvio diz também o que ele prepara', () => {
    // O "por quê" do lance é o comentário; o "o que isso muda" é a ideia ou o
    // plano. O lance da decisão precisa dos dois — é o único da linha que o
    // aluno terá de reconhecer sozinho no treino.
    for (const opening of OPENING_COURSES) {
      for (const ramo of ramificacoesDaAbertura(opening)) {
        if (ramo.indiceDaDivergencia === null) continue
        const desvio = ramo.variacao.line[ramo.indiceDaDivergencia]
        expect(
          Boolean(desvio.strategicIdea ?? desvio.resultingPlan),
          `${opening.slug}/${ramo.variacao.id}: ${desvio.san} não diz o que prepara`,
        ).toBe(true)
      }
    }
  })
})

describe('em qual variação a partida está', () => {
  const dois = ITALIANA.variations.find((v) => v.id === 'italiana-dois-cavalos')
  const ramo = dois ? ramificacaoDaVariacao(ITALIANA, dois) : null
  const ate = (n: number) => (dois?.line ?? []).slice(0, n).map((l) => l.uci)

  it('não nomeia nada enquanto a partida é a linha principal', () => {
    expect(variacaoEmCurso(ITALIANA, [])).toBeNull()
    expect(variacaoEmCurso(ITALIANA, ate(ramo?.indiceDaDivergencia ?? 0))).toBeNull()
  })

  it('nomeia a variação depois que o lance de desvio é jogado', () => {
    const depois = ate((ramo?.indiceDaDivergencia ?? 0) + 1)
    expect(variacaoEmCurso(ITALIANA, depois)?.id).toBe('italiana-dois-cavalos')
  })

  it('não nomeia nada quando a partida saiu do repertório', () => {
    // Um lance legal que a abertura não cobre não pertence a variação nenhuma —
    // e inventar um nome para ele seria a explicação que o projeto proíbe.
    expect(variacaoEmCurso(ITALIANA, ['e2e4', 'e7e5', 'd1h5'])).toBeNull()
  })
})
