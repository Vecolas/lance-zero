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
  respostasDoAdversario,
  variacaoEmCurso,
  variacoesDoAluno,
} from '@/domain/openings/variacoes'

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

describe('de quem é a decisão — a partição que separa as duas etapas', () => {
  it('toda ramificação cai em exatamente uma das duas etapas', () => {
    /*
      "Melhores respostas do adversário" e "Variações importantes" leem listas
      COMPLEMENTARES. Se um terceiro caso aparecer — uma ramificação que não é
      resposta nem escolha do aluno — ele não some da tela com erro: some em
      silêncio, e o conteúdo fica inalcançável. Este portão morde dos dois
      lados: acusa tanto o ramo perdido quanto o ramo contado duas vezes.
    */
    for (const opening of OPENING_COURSES) {
      const todos = ramificacoesDaAbertura(opening)
      const respostas = respostasDoAdversario(opening)
      const doAluno = variacoesDoAluno(opening)

      expect(
        respostas.length + doAluno.length,
        `${opening.slug}: a partição perdeu ou duplicou um ramo`,
      ).toBe(todos.length)

      const ids = [...respostas, ...doAluno].map((ramo) => ramo.variacao.id)
      expect(new Set(ids).size, `${opening.slug}: um ramo aparece nas duas etapas`).toBe(ids.length)
    }
  })

  it('quem desvia numa resposta é sempre o adversário, e nunca o aluno', () => {
    for (const opening of OPENING_COURSES) {
      for (const ramo of respostasDoAdversario(opening)) {
        expect(ramo.indiceDaDivergencia, `${opening.slug}/${ramo.variacao.id}`).not.toBeNull()
        expect(ramo.ladoQueDesvia, `${opening.slug}/${ramo.variacao.id}`).not.toBe(opening.side)
      }
    }
  })

  it('TESTE DE CONTEÚDO — toda abertura tem ao menos uma resposta do adversário', () => {
    /*
      A etapa 4/9 pergunta "o que ele joga aqui?". Uma abertura sem resposta
      autorada responde com o estado vazio — que é honesto, e é exatamente o que
      não pode virar o normal. Metade do catálogo já esteve assim.
    */
    for (const opening of OPENING_COURSES) {
      expect(
        respostasDoAdversario(opening).length,
        `${opening.slug} não tem nenhuma resposta do adversário autorada`,
      ).toBeGreaterThan(0)
    }
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
