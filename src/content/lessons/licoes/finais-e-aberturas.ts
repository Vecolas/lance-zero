/**
 * Lote 4 — oposição, regra do quadrado e desenvolvimento.
 *
 * POR QUE AS TRÊS ESTÃO JUNTAS: são as lições em que a resposta certa NÃO é uma
 * captura vistosa. Nas três o lance que decide é discreto — um passo de rei, um
 * peão que anda sozinho, uma peça que sai de casa — e o aluno de ~1100 erra
 * todas pelo mesmo motivo: procura o lance que faz alguma coisa acontecer
 * agora. As três ensinam a fazer uma CONTA antes de escolher: quantas casas
 * entre os reis, quantas casas até promover, quantas peças cada lado já tirou
 * de casa.
 *
 * O PREÇO QUE ESTE LOTE PAGOU, e que precisa estar declarado: o portão só sabe
 * conferir mate forçado e saldo de material forçado (ver
 * `@/domain/exercicios/objetivo`). Uma corrida de peões decidida em seis lances
 * quietos não é conferível por nada daqui — e conteúdo que afirma o que o
 * portão não confere é exatamente o conteúdo que este produto recusa. Então as
 * posições foram escolhidas no MOMENTO DE DECISÃO da ideia, e não na ideia
 * inteira:
 *
 * - a oposição vira mate em 2, porque é aí que o zugzwang aparece medido: o
 *   passo de rei não ameaça nada e ainda assim é o único lance que ganha;
 * - a regra do quadrado vira promoção, porque promover é ganho de material que
 *   o código sabe contar, e a conta do quadrado é justamente o que diz se a
 *   promoção sobrevive;
 * - o desenvolvimento vira captura da peça adiantada, porque é a forma concreta
 *   com que a vantagem de tempo cobra a conta no tabuleiro.
 *
 * O que ficou de fora — a marcha de rei de cinco lances, a corrida que se ganha
 * por um tempo — mora no conceito e no processo mental, e não é afirmado como
 * exercício.
 */

import { definirLicao, type Licao } from '@/domain/lessons'

/**
 * Oposição.
 *
 * As cinco posições são a MESMA ideia em quatro geometrias (flanco do rei,
 * flanco da dama, com brancas e com pretas). É deliberado: a transferência que
 * a lição quer é "reis frente a frente com uma casa no meio", e ela só aparece
 * se o aluno vir o padrão fora da casa onde o aprendeu. O contraste muda a
 * coluna do rei branco justamente para quebrar a memorização de "vá para g6".
 */
const OPOSICAO = definirLicao({
  id: 'oposicao',
  titulo: 'Quem tem de mover, cede',
  habilidade: 'endgame.king-pawn-opposition',
  versao: 1,
  objetivo:
    'Usar a posição dos dois reis para obrigar o adversário a ceder terreno. É o que decide ' +
    'finais de rei e peão: com material igual, quem fica sem lance útil abre a casa que estava ' +
    'segurando.',
  conceito:
    'Quando os dois reis estão na mesma coluna ou fileira, com uma casa entre eles, quem tem de ' +
    'mover é quem piora. O rei que espera mantém as casas cobertas; o que joga descobre uma.',
  processoMental: [
    'Os dois reis estão na mesma linha, com uma casa vazia no meio?',
    'De quem é a vez? Quem joga agora é quem cede.',
    'Se eu não mexer no rei, o adversário fica sem lance útil?',
    'Quais casas o rei dele ainda tem, e quem cobre cada uma: meu rei ou meu peão?',
  ],
  exemploResolvido: {
    fen: '6k1/4P3/8/6K1/8/8/8/8 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'mate-em', lances: 2 },
    linhaModelo: ['g5g6', 'g8h8', 'e7e8q'],
    raciocinio: [
      'Começo pelo lance mais chamativo da posição e pergunto o que ele entrega: promover.',
      'Promovendo agora, o rei preto sai por h7 e não há mate. Então o lance de rei vem antes.',
      'Conto as casas entre os reis: g5 e g8, com duas casas no meio. Indo a g6 sobra uma, e a ' +
        'vez passa a ser dele.',
      'Com o rei em g6 eu cubro f7, g7 e h7; o peão de e7 cobre f8. Sobra h8, e ele é obrigado ' +
        'a ir para lá.',
      'Aí sim promovo: a dama toma a oitava fileira com as casas de fuga já tomadas.',
    ],
    comentario:
      'O lance que decide não ameaça nada. Ele passa a obrigação de mover para o adversário, e ' +
      'é essa obrigação que descobre h8.',
  },
  contraste: {
    fen: '6k1/4P3/8/5K2/8/8/8/8 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'mate-em', lances: 2 },
    lanceQueFalha: 'f5f6',
    oQueMudou:
      'O rei branco está em f5, não em g5. Avançar para f6 é o mesmo gesto do exemplo, mas f6 ' +
      'não fica de frente para g8: h7 continua descoberta e o rei preto escapa por lá. A casa ' +
      'que resolve é g6, e ela se acha pela posição do outro rei, não pela coluna do peão.',
  },
  completion: {
    id: 'oposicao-c1',
    fen: '1k6/3P4/8/1K6/8/8/8/8 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'mate-em', lances: 2 },
    lancesAceitos: ['b5b6'],
    alternativas: ['d7d8q', 'b5c6', 'b5a6'],
    raciocinioJaFeito: [
      'Promover agora não dá mate: o rei preto sai por b7 e a dama nova não cobre tudo sozinha.',
      'Então o lance é de rei, e ele precisa deixar o rei preto sem casa segura.',
      'O peão de d7 já cobre c8. Ficam a7, b7 e c7 para o rei branco resolver.',
    ],
    enunciado: 'Brancas jogam. Qual lance de rei tira essas três casas de uma vez?',
    explicacao:
      'Com o rei em b6, as casas a7, b7 e c7 ficam cobertas e c8 já estava no raio do peão. ' +
      'Sobra a8, o rei preto é obrigado a ir para lá, e d8=D fecha a oitava fileira. Ka6 parece ' +
      'o mesmo lance e deixa c7 livre: o rei preto sai por ali e ainda ataca o peão.',
  },
  guiada: [
    {
      id: 'oposicao-g1',
      fen: '8/8/8/8/6k1/8/4p3/6K1 b - - 0 1',
      ladoDoAluno: 'b',
      objetivo: { tipo: 'mate-em', lances: 2 },
      lancesAceitos: ['g4g3'],
      alternativas: ['e2e1q', 'g4f3', 'g4h3'],
      enunciado: 'Pretas jogam e dão mate em dois lances.',
      dicas: [
        {
          degrau: 'direcao',
          texto:
            'Comece pela varredura de sempre: xeques, capturas e ameaças. Promover é forçante — ' +
            'confira o que o adversário responde depois.',
        },
        {
          degrau: 'area',
          texto:
            'Liste as casas ao redor do rei branco e marque quais já estão cobertas e quais não.',
        },
        {
          degrau: 'ideia',
          texto:
            'Faltam g2 e h2. Nenhuma peça preta cobre essas duas com xeque; quem cobre as duas ' +
            'de uma vez é o outro rei.',
        },
        {
          degrau: 'candidato',
          texto:
            'Há uma casa em que o rei preto fica de frente para g1, com uma casa vazia no meio. ' +
            'Vá para ela e o rei branco fica com um lance só.',
        },
      ],
      explicacao:
        'Com o rei em g3, as casas f2, g2 e h2 ficam cobertas e f1 já está no raio do peão de ' +
        'e2. Sobra h1, e a promoção no lance seguinte fecha a primeira fileira. Promovendo de ' +
        'imediato, o rei branco sai por g2 e não há mate.',
    },
  ],
  recuperacao: [
    {
      id: 'oposicao-r1',
      fen: '8/8/8/8/1k6/8/3p4/1K6 b - - 0 1',
      ladoDoAluno: 'b',
      objetivo: { tipo: 'mate-em', lances: 2 },
      lancesAceitos: ['b4b3'],
      alternativas: ['d2d1q', 'b4c3', 'b4a3'],
      enunciado: 'Pretas jogam. Há mate em dois lances, e o primeiro deles não é xeque.',
      explicacao:
        'Kb3 deixa o rei branco com a1 como única casa: a2, b2 e c2 passam a ser cobertas pelo ' +
        'rei preto, e c1 está no raio do peão de d2. Depois de Ka1, d1=D fecha a primeira ' +
        'fileira. Kc3 e Ka3 cobrem parte das casas, e promover antes deixa o rei branco sair ' +
        'por a2.',
    },
  ],
  resumo: [
    'Reis na mesma linha com uma casa no meio: quem tem de mover é quem cede.',
    'Em final de rei e peão, o passo de rei costuma valer mais que o avanço do peão.',
    'Antes de promover, conte as casas de fuga que o rei adversário ainda tem.',
    'A oposição decide quando o adversário não tem nenhum outro lance à disposição.',
  ],
})

/**
 * Regra do quadrado.
 *
 * A LIMITAÇÃO QUE MOLDOU AS POSIÇÕES: o peão está sempre na sétima, então o
 * quadrado tem lado 1 e a conta é curta. Não é preguiça — é o que o portão
 * consegue provar (ver o cabeçalho do módulo). O quadrado grande, com o peão na
 * quinta e o rei correndo quatro casas, aparece no conceito e no processo, onde
 * é ensinado; o exercício cobra a mesma pergunta no tamanho em que ela vira
 * material no tabuleiro.
 *
 * A posição do completion tem DOIS peões passados de propósito: é a única forma
 * de a conta ter de ser feita duas vezes, e é ali que a regra deixa de ser
 * decorada e passa a ser usada para escolher.
 */
const REGRA_DO_QUADRADO = definirLicao({
  id: 'regra-do-quadrado',
  titulo: 'Ele chega a tempo?',
  habilidade: 'endgame.rule-of-square',
  versao: 1,
  objetivo:
    'Saber de olho, sem calcular a corrida lance a lance, se o rei alcança um peão passado. É a ' +
    'conta que decide quando empurrar o seu peão e quando ir atrás do peão dele.',
  conceito:
    'Do peão até a casa de promoção, conte as casas: esse número é o lado do quadrado. Desenhe ' +
    'o quadrado a partir do peão, do lado onde está o rei adversário. Rei dentro do quadrado, ' +
    'ele alcança; rei fora, o peão vai sozinho.',
  processoMental: [
    'Quantas casas faltam para o peão promover? Esse número é o lado do quadrado.',
    'Desenhe o quadrado a partir da casa do peão, na direção do rei adversário.',
    'De quem é a vez? Quem joga agora ganha uma casa na conta.',
    'Rei dentro: o peão precisa de ajuda. Rei fora: empurre e não gaste lance com o rei.',
  ],
  exemploResolvido: {
    fen: '1k6/6P1/8/8/7K/8/8/8 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 800 },
    linhaModelo: ['g7g8q', 'b8b7', 'g8d5'],
    raciocinio: [
      'O peão de g7 está a uma casa de promover, então o quadrado tem lado 1: g7, g8 e as duas ' +
        'casas vizinhas do lado do rei preto, f7 e f8.',
      'O rei preto está em b8, a cinco colunas dali. Fora do quadrado, e nem jogando ele entra.',
      'Como ninguém discute g8, não preciso levar meu rei junto: o lance de rei seria tempo ' +
        'perdido.',
      'Promovo. A dama nova volta pela diagonal para cuidar do resto do tabuleiro.',
    ],
    comentario:
      'A conta do quadrado responde a pergunta inteira antes de qualquer variante: o rei preto ' +
      'não chega a g8, então a promoção acontece sem contrapartida.',
  },
  contraste: {
    fen: '8/5kP1/8/8/7K/8/8/8 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 800 },
    lanceQueFalha: 'g7g8q',
    oQueMudou:
      'O rei preto saiu de b8 e está em f7, colado na casa de promoção. Com o peão em g7 o ' +
      'quadrado é f7-g7-f8-g8, e ele está dentro dele: a dama nova cai no lance seguinte. O ' +
      'mesmo peão, a mesma casa, e a conta muda o veredito.',
  },
  completion: {
    id: 'quadrado-c1',
    fen: '1k6/6P1/P7/8/7K/8/8/8 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 700 },
    lancesAceitos: ['g7g8q'],
    alternativas: ['a6a7', 'h4g5', 'h4h3'],
    raciocinioJaFeito: [
      'São dois peões passados e um rei preto. A conta se faz peão a peão.',
      'O peão de a6 precisa de duas casas, e o rei preto em b8 está colado nele: dentro do ' +
        'quadrado, e ele para esse peão.',
      'O peão de g7 precisa de uma casa, e o quadrado dele é f7-g7-f8-g8. O rei preto está a ' +
        'seis colunas.',
    ],
    enunciado: 'Brancas jogam. Um dos dois peões chega e o outro não. Qual lance ganha material?',
    explicacao:
      'g8=D ganha a dama porque ninguém discute a casa g8. a7+ parece o lance ativo, porque é ' +
      'xeque, mas o rei preto captura o peão: ele já estava dentro daquele quadrado desde o ' +
      'começo, e o xeque não muda a conta.',
  },
  guiada: [
    {
      id: 'quadrado-g1',
      fen: '8/7P/8/2k5/8/1p6/8/6K1 w - - 0 1',
      ladoDoAluno: 'w',
      objetivo: { tipo: 'ganha-material', saldoMinimo: 800 },
      lancesAceitos: ['h7h8q'],
      alternativas: ['g1f2', 'g1g2', 'g1f1'],
      enunciado:
        'Brancas jogam. Os dois lados têm peão passado. Encontre o lance que ganha material.',
      dicas: [
        {
          degrau: 'direcao',
          texto:
            'Comece pelos lances forçantes: xeques, capturas e promoções. Depois pergunte o que ' +
            'o adversário responde a cada um.',
        },
        {
          degrau: 'area',
          texto:
            'Há dois peões passados no tabuleiro, um de cada cor. Faça a conta de cada um em ' +
            'separado antes de escolher.',
        },
        {
          degrau: 'ideia',
          texto:
            'Ir de rei atrás do peão preto custa lances, e a corrida não espera. Compare quantas ' +
            'casas falta a cada peão e quantos lances falta a cada rei.',
        },
        {
          degrau: 'candidato',
          texto:
            'O peão branco promove neste lance, e a dama nova pega a diagonal longa que passa ' +
            'pela casa do peão preto.',
        },
      ],
      explicacao:
        'h8=D promove de imediato, e a dama nova fica na diagonal h8-b2, por onde ela alcança o ' +
        'peão preto assim que ele avançar. Levar o rei a f2 chega tarde: de g1 até a primeira ' +
        'fileira da coluna b são cinco lances, e o peão de b3 promove em dois.',
    },
  ],
  recuperacao: [
    {
      id: 'quadrado-r1',
      fen: '6k1/8/1P6/8/2K5/8/7p/8 b - - 0 1',
      ladoDoAluno: 'b',
      objetivo: { tipo: 'ganha-material', saldoMinimo: 800 },
      lancesAceitos: ['h2h1q'],
      alternativas: ['g8f7', 'g8g7', 'g8h7'],
      enunciado: 'Pretas jogam. Vale mais ir atrás do peão branco ou tratar do seu?',
      explicacao:
        'h1=D. De g8 até a coluna b são cinco lances de rei, e o peão branco promove em dois: a ' +
        'corrida não se ganha com o rei. Com a dama em h1, a diagonal h1-b7 fica sob controle e ' +
        'o peão branco não passa. Kf7 perde os dois lados da conta ao mesmo tempo.',
    },
  ],
  resumo: [
    'Casas até promover = lado do quadrado.',
    'Desenhe o quadrado do lado onde está o rei adversário.',
    'Quem tem a vez entra no quadrado antes de a conta fechar.',
    'Rei fora do quadrado: empurre o peão, sem gastar lance com o rei.',
  ],
})

/**
 * Desenvolvimento.
 *
 * O EXERCÍCIO NÃO PEDE UM LANCE DE DESENVOLVIMENTO, e isso é deliberado.
 * "Jogue Cf3 porque desenvolve" não é conferível — nenhum objetivo daqui prova
 * que um lance posicional é o certo, e um item com chave de correção que é
 * opinião mede quem escreveu, não quem responde. O que É conferível é a CONTA
 * que o desenvolvimento paga: o lado que gastou lances com a mesma peça deixa
 * essa peça sozinha, e a peça que ainda estava em casa a captura.
 *
 * Por isso o aluno resolve sempre do lado de quem PUNE. Ele aprende o custo do
 * hábito vendo a fatura, que é a única parte que o tabuleiro mede.
 */
const DESENVOLVIMENTO = definirLicao({
  id: 'desenvolvimento',
  titulo: 'Uma peça, um lance',
  habilidade: 'opening.development',
  versao: 1,
  objetivo:
    'Tirar cavalos e bispos de casa nos primeiros lances, um lance por peça, em vez de passear ' +
    'com a mesma. Quem termina a abertura com mais peças prontas é quem encontra o golpe ' +
    'concreto primeiro.',
  conceito:
    'Na abertura, cada lance deveria colocar uma peça nova em jogo. Mover a mesma peça duas ' +
    'vezes, ou sair cedo com a dama, entrega lances: o adversário desenvolve enquanto você anda ' +
    'em círculos, e são as peças ainda em casa dele que punem a sua peça adiantada.',
  processoMental: [
    'Quantas peças menores cada lado já tirou de casa?',
    'Este lance põe uma peça nova em jogo, ou mexe outra vez na mesma?',
    'A peça que ele adiantou está defendida? Por quem?',
    'Quem dos meus alcança a casa dela — inclusive as peças que ainda não se moveram?',
  ],
  exemploResolvido: {
    fen: 'rnb1kbnr/pppp1ppp/8/4p1q1/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 2 3',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 800 },
    linhaModelo: ['c1g5', 'e5d4', 'd1d4'],
    raciocinio: [
      'Contagem primeiro: as pretas moveram um peão e depois a dama. Nenhuma peça menor delas ' +
        'saiu de casa.',
      'A dama preta está em g5. Pergunto quem defende g5: nem peão, nem peça. Ela está sozinha.',
      'Agora pergunto quem meu alcança g5. O cavalo de g1 chega a f3 e ataca; o bispo de c1 vai ' +
        'direto a g5, porque o lance d4 abriu a diagonal.',
      'Atacar a dama apenas a faz mudar de casa. Capturar encerra o assunto.',
    ],
    comentario:
      'Quem cobra a conta é o bispo que ainda não tinha se mexido. Não foi um golpe: foi o ' +
      'resultado de as pretas gastarem dois lances com a mesma peça enquanto as brancas abriam ' +
      'linhas.',
  },
  contraste: {
    fen: 'rnbqkbnr/pppp1p2/7p/4p1p1/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 4',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 800 },
    lanceQueFalha: 'c1g5',
    oQueMudou:
      'Em g5 não está mais a dama que passeou: está um peão, e o peão de h6 defende essa casa. ' +
      'A mesma diagonal e o mesmo bispo, e o lance passa a perder bispo por peão. Estar mais ' +
      'desenvolvido não transforma qualquer captura em ganho — a casa adiantada só é alvo ' +
      'quando ninguém a defende.',
  },
  completion: {
    id: 'desenvolvimento-c1',
    fen: 'rnbqkbnr/pppp1pp1/7p/4p1N1/4P3/8/PPPP1PPP/RNBQKB1R b KQkq - 1 3',
    ladoDoAluno: 'b',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 250 },
    lancesAceitos: ['h6g5', 'd8g5'],
    alternativas: ['g8f6', 'b8c6', 'd7d6'],
    raciocinioJaFeito: [
      'As brancas moveram o cavalo de g1 duas vezes seguidas e ele parou em g5, onde o peão de ' +
        'h6 já o ataca.',
      'Quem defende g5 pelas brancas? O bispo de c1 está fechado pelo peão de d2, e nenhuma ' +
        'outra peça alcança a casa.',
      'Então a peça adiantada está sem defensor, e um lance de desenvolvimento normal a deixaria ' +
        'escapar.',
    ],
    enunciado: 'Pretas jogam. Qual lance cobra a conta da peça que está sem defensor?',
    explicacao:
      'hxg5 ganha o cavalo e ainda abre a coluna h para a torre. Dxg5 também ganha o cavalo e ' +
      'está correto, com uma ressalva: sai com a dama cedo, que é o hábito que custou a peça às ' +
      'brancas. Cf6 e Cc6 desenvolvem, e seriam lances razoáveis em quase qualquer outra ' +
      'posição — aqui devolvem a peça de graça.',
  },
  guiada: [
    {
      id: 'desenvolvimento-g1',
      fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1P1n1/3P1N1P/PPP2PP1/RNBQ1RK1 w kq - 1 8',
      ladoDoAluno: 'w',
      objetivo: { tipo: 'ganha-material', saldoMinimo: 250 },
      lancesAceitos: ['h3g4'],
      alternativas: ['f3g5', 'c4f7', 'f1e1'],
      enunciado: 'Brancas jogam. Encontre o lance que ganha material.',
      dicas: [
        {
          degrau: 'direcao',
          texto:
            'Antes de escolher, faça a varredura: xeques, capturas e ameaças. Comece pelas ' +
            'capturas.',
        },
        {
          degrau: 'area',
          texto:
            'Olhe as peças pretas que saíram do lugar e pergunte quais delas estão ao alcance de ' +
            'alguma peça branca.',
        },
        {
          degrau: 'ideia',
          texto:
            'Uma peça preta está numa casa atacada por um peão. Conte os defensores dela antes ' +
            'de capturar.',
        },
        {
          degrau: 'candidato',
          texto:
            'O peão de h3 tem uma captura, e depois dela nenhuma peça preta recupera o material.',
        },
      ],
      explicacao:
        'hxg4 ganha um cavalo. Ele foi de g8 a f6 e de f6 a g4, dois lances com a mesma peça, e ' +
        'parou numa casa que um peão ataca. O bispo de c8 continua em casa, preso atrás do peão ' +
        'de d7, e não defende g4. Bxf7+ parece ativo, mas depois de Rxf7 as brancas ficam com ' +
        'bispo a menos por um peão.',
    },
  ],
  recuperacao: [
    {
      id: 'desenvolvimento-r1',
      fen: 'rnbqkbnr/ppp1pppp/8/3p4/4P1Q1/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2',
      ladoDoAluno: 'b',
      objetivo: { tipo: 'ganha-material', saldoMinimo: 800 },
      lancesAceitos: ['c8g4'],
      alternativas: ['d5e4', 'g8f6', 'e7e6'],
      enunciado: 'Pretas jogam. Encontre o lance que ganha material agora.',
      explicacao:
        'Bxg4 ganha a dama. Ela saiu no segundo lance das brancas para uma casa que o bispo de ' +
        'c8 alcança pela diagonal c8-g4, aberta desde que o peão de d7 avançou. dxe4 ganha um ' +
        'peão e deixa a dama viva. e6 prepara o outro bispo, e seria um lance normal em quase ' +
        'qualquer outra posição — aqui ele fecha justamente a diagonal que ganhava a dama.',
    },
  ],
  resumo: [
    'Um lance por peça: cavalos e bispos primeiro.',
    'Mover de novo a mesma peça na abertura precisa de um motivo concreto.',
    'Dama cedo numa casa adiantada é alvo, não ameaça.',
    'Antes de capturar a peça adiantada do adversário, conte os defensores dela.',
  ],
})

export const LICOES_FINAIS_E_ABERTURAS: readonly Licao[] = [
  OPOSICAO,
  REGRA_DO_QUADRADO,
  DESENVOLVIMENTO,
]
