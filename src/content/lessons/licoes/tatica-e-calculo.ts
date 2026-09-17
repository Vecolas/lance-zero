/**
 * Lote 3 — tática e cálculo: as três lições que mudam o QUE o aluno procura.
 *
 * POR QUE ESTAS TRÊS JUNTAS: as lições de fundamentos ensinam a contar
 * defensores e casas de fuga numa posição parada. Estas três ensinam a mesma
 * conta com o tabuleiro se mexendo, e cada uma ataca um defeito diferente do
 * jogador de ~1100:
 *
 * - `cravada` — ele vê a peça atacada e não vê que ela não pode fugir, então
 *   troca a cravada por uma peça em vez de somar um segundo atacante;
 * - `lances-candidatos` — ele calcula o primeiro lance que a vista pega, quase
 *   sempre uma captura ou um xeque, e joga esse. Não é falta de cálculo: é
 *   falta de LISTA antes do cálculo;
 * - `rede-de-mate` — ele dá o xeque disponível e persegue o rei pelo tabuleiro
 *   em vez de fechar as casas primeiro.
 *
 * As três são o mesmo hábito em três formas: olhar a posição inteira antes de
 * olhar um lance. Por isso estão no mesmo lote e nesta ordem — a cravada mostra
 * que existe mais de um ataque possível sobre o mesmo alvo, os candidatos
 * generalizam isso para qualquer posição, e a rede de mate aplica a lista a um
 * objetivo em que o lance mais óbvio (o xeque) costuma ser o pior.
 *
 * DECISÃO DE CONTEÚDO — posições ESPARSAS, nenhuma passa de seis peças. Com o
 * tabuleiro quase vazio, o sinal que a lição ensina é o único sinal na tela, e
 * a prova do portão roda em segundos. Posição cheia esconde a ideia atrás de
 * ruído e ainda torna a verificação cara o bastante para alguém um dia querer
 * afrouxá-la.
 *
 * O CONTRASTE DE CADA LIÇÃO muda UMA coisa, e é a parte cara deste arquivo:
 * na cravada entra um peão preto em c6 que tapa a diagonal; nos candidatos a
 * torre preta sai de a8 para b8, de modo que o mesmo xeque deixa de garfar; na
 * rede de mate o rei preto está em g8 em vez de h8, e a caixa que fechava com
 * duas casas passa a ter três. Em todos, o lance análogo continua LEGAL e
 * continua parecendo certo — ele só deixa de funcionar, que é o que o portão
 * exige e o que o aluno precisa ver.
 *
 * SOBRE O OBJETIVO `ganha-material` NA CRAVADA: `saldoForcadoApos` só enxerga
 * ganho que se resolve em capturas, e não ganho que aparece depois de um lance
 * quieto. Por isso todas as posições de cravada aqui são do tipo "somar o
 * segundo atacante e capturar", e nenhuma é do tipo "cravou, agora ganhe o alvo
 * de trás com manobra". Não é limitação escondida: é a razão de as posições
 * terem a forma que têm.
 */

import { definirLicao, type Licao } from '@/domain/lessons'

const CRAVADA = definirLicao({
  id: 'cravada',
  titulo: 'A peça que não pode sair do lugar',
  habilidade: 'tactics.pin',
  versao: 1,
  objetivo:
    'Reconhecer quando uma peça adversária está presa pelo que está atrás dela, e saber o que ' +
    'fazer com isso. Uma peça cravada não foge: ela deixa de ser um alvo móvel e vira um alvo ' +
    'parado, que você pode atacar mais uma vez com calma antes de capturar.',
  conceito:
    'Cravada é quando uma peça não pode se mexer porque, na mesma linha atrás dela, está algo ' +
    'mais valioso — quase sempre o rei, e aí ela não pode mesmo. Enquanto a linha existir, ' +
    'aquela peça é um alvo que não corre.',
  processoMental: [
    'Alguma peça adversária está na mesma coluna, fileira ou diagonal de uma peça mais valiosa dele?',
    'Eu tenho, ou posso pôr, uma peça minha atacando essa linha? Se tenho, a peça da frente está cravada.',
    'Quantas vezes o alvo cravado está atacado e quantas está defendido?',
    'Se falta um atacante, qual das minhas peças, começando pela mais barata, chega nele?',
  ],
  exemploResolvido: {
    fen: '4k3/3r4/8/4P3/B7/8/8/4K3 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 400 },
    linhaModelo: ['e5e6', 'e8d8', 'e6d7'],
    raciocinio: [
      'O bispo em a4 olha a diagonal a4-e8. Na frente do rei preto, em d7, está a torre: ela não pode sair da diagonal, porque sair expõe o rei.',
      'A captura imediata existe: Bxd7+. Mas o rei recaptura, e a conta vira bispo por torre — ganho, e menos do que a posição dá.',
      'Como a torre não foge, eu tenho tempo para somar um atacante. Quem chega em d7 sem tapar a diagonal? O peão de e5, indo para e6.',
      'Depois de e6 a torre continua sem lance nenhum, e o peão captura na jogada seguinte defendido pelo próprio bispo.',
    ],
    comentario:
      'A diferença entre Bxd7+ e e6 é a pressa. As duas ganham material; a segunda ganha a torre ' +
      'inteira, porque uma peça cravada não usa o tempo que você lhe dá.',
  },
  contraste: {
    // Muda UM peão. A geometria da tática continua idêntica — bispo, torre, rei
    // e peão nas mesmas casas —, e é exatamente por isso que este contraste
    // ensina: o que sustentava a cravada era a diagonal, não o desenho.
    fen: '4k3/1p6/2p5/4P3/B7/8/8/4K3 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 400 },
    lanceQueFalha: 'e5e6',
    oQueMudou:
      'Entrou um peão preto em c6, defendido por b7. Ele tapa a diagonal a4-e8 no meio do ' +
      'caminho: o bispo não enxerga mais d7, e a torre preta que parecia presa pode ir para ' +
      'onde quiser. Sem a linha, não há cravada — e e6 vira um lance de peão sem alvo.',
  },
  completion: {
    id: 'cravada-c1',
    // A mesma ideia com as cores trocadas e o tabuleiro de cabeça para baixo.
    // A troca existe para o aluno não gravar o desenho de uma diagonal só: o
    // que tem de ficar é a pergunta, não a imagem de um bispo em a4.
    fen: '4k3/8/8/b7/4p3/8/3R4/4K3 b - - 0 1',
    ladoDoAluno: 'b',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 400 },
    lancesAceitos: ['e4e3'],
    alternativas: ['a5c3', 'a5b4', 'e8e7'],
    raciocinioJaFeito: [
      'O bispo preto em a5 olha a diagonal a5-e1. Na frente do rei branco, em d2, está a torre.',
      'A torre está cravada: qualquer lance dela deixaria o rei branco em xeque, então ela não tem lance nenhum.',
      'A torre está atacada uma vez, pelo bispo, e defendida uma vez, pelo rei. Falta um atacante.',
    ],
    enunciado: 'Falta um passo. Qual peça preta ainda pode entrar nessa conta, e para onde?',
    explicacao:
      'e3 ataca d2 pela segunda vez e não tapa a diagonal, que é o detalhe que decide: um peão ' +
      'em c3 também atacaria d2, mas cortaria a linha do próprio bispo e soltaria a torre. ' +
      'Depois de e3 o branco só pode mexer o rei, e exd2 vem defendido pelo bispo — o rei não ' +
      'recaptura. Bxd2+ ganha menos: troca o bispo pela torre e devolve a peça que sustentava a ' +
      'cravada.',
  },
  guiada: [
    {
      id: 'cravada-g1',
      // Aqui a cravada não trava o ALVO: trava o DEFENSOR. É a segunda cara do
      // mesmo tema e a que mais aparece em partida real — o aluno conta os
      // defensores certo e erra assim mesmo, porque conta um defensor que não
      // pode capturar.
      fen: '6k1/6p1/7n/8/8/8/8/2B1K1R1 w - - 0 1',
      ladoDoAluno: 'w',
      objetivo: { tipo: 'ganha-material', saldoMinimo: 250 },
      lancesAceitos: ['c1h6'],
      alternativas: ['g1g7', 'c1g5', 'e1e2'],
      enunciado:
        'Brancas jogam e ganham material. O cavalo preto parece defendido: confira se o ' +
        'defensor pode mesmo capturar.',
      dicas: [
        {
          degrau: 'direcao',
          texto: 'Comece pela varredura: quais xeques, capturas e ameaças existem nesta posição?',
        },
        {
          degrau: 'area',
          texto: 'Olhe a coluna g inteira, de baixo para cima, e diga o que está alinhado nela.',
        },
        {
          degrau: 'ideia',
          texto:
            'Um defensor que está preso não defende. Se o peão de g7 capturasse, o que ' +
            'aconteceria com o rei preto?',
        },
        {
          degrau: 'candidato',
          texto: 'Considere a entrada do bispo em h6 e calcule a resposta das pretas.',
        },
      ],
      explicacao:
        'O peão de g7 está cravado pela torre de g1: capturar em h6 deixaria o rei preto em ' +
        'xeque, e por isso a captura não é legal. O cavalo de h6, que parecia defendido, está ' +
        'na prática sozinho. Txg7+ é a pressa do outro lado: o rei recaptura e a conta vira ' +
        'torre por peão.',
    },
  ],
  recuperacao: [
    {
      id: 'cravada-r1',
      fen: '4k3/8/1b6/8/6p1/8/5R2/6K1 b - - 0 1',
      ladoDoAluno: 'b',
      objetivo: { tipo: 'ganha-material', saldoMinimo: 400 },
      lancesAceitos: ['g4g3'],
      alternativas: ['b6f2', 'b6d4', 'e8e7'],
      enunciado: 'Pretas jogam e ganham material. Há uma captura disponível e ela não é a melhor.',
      explicacao:
        'Bxf2+ é a captura que a vista pega primeiro, e ela devolve o bispo: o rei recaptura e ' +
        'a conta vira bispo por torre. A torre branca não tem para onde ir — qualquer lance dela ' +
        'abre xeque no próprio rei —, então há tempo para g3, que a ataca uma segunda vez. ' +
        'Depois disso gxf2 vem defendido pelo bispo e o rei branco não pode recapturar.',
    },
  ],
  resumo: [
    'Uma peça parada na frente de algo mais valioso, na mesma linha, está cravada.',
    'Peça cravada não foge. Isso te dá um lance inteiro de graça.',
    'Antes de capturar o alvo cravado, conte atacantes e defensores: quase sempre falta somar um atacante barato.',
    'Não tape a sua própria linha: o atacante novo não pode entrar entre o cravador e o alvo.',
    'Vale para o defensor também: um defensor cravado não defende nada.',
  ],
})

const LANCES_CANDIDATOS = definirLicao({
  id: 'lances-candidatos',
  titulo: 'Liste antes de calcular',
  habilidade: 'calculation.candidate-moves',
  versao: 1,
  objetivo:
    'Trocar o hábito de calcular o primeiro lance que a vista pega pelo hábito de listar dois ou ' +
    'três lances plausíveis e só então calcular. A maior parte dos erros de cálculo até 1400 não ' +
    'é conta errada: é conta certa do lance errado, porque o lance certo nunca entrou na lista.',
  conceito:
    'Lance candidato é qualquer lance que valha a pena examinar. Antes de calcular variantes, ' +
    'faça a lista: dois ou três candidatos, sempre incluindo os forçantes. Só depois compare.',
  processoMental: [
    'Quais são os meus lances forçantes aqui: xeques, capturas e ameaças?',
    'Escreva mentalmente dois ou três candidatos. Nenhum é descartado antes de entrar na lista.',
    'Para cada candidato, qual é a melhor resposta do adversário?',
    'Compare os resultados e escolha. O primeiro candidato não ganha por ter sido o primeiro.',
  ],
  exemploResolvido: {
    fen: 'r3k3/6p1/4N3/8/8/8/8/4K3 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 400 },
    linhaModelo: ['e6c7', 'e8e7', 'c7a8'],
    raciocinio: [
      'O cavalo em e6 alcança oito casas. Dois lances são forçantes: Cxg7+, que é xeque e captura ao mesmo tempo, e Cc7+, que dá xeque sem capturar nada.',
      'Cxg7+ é o que a vista pega primeiro, porque junta as duas coisas que costumam ser boas. Ele ganha um peão e deixa o cavalo no canto do tabuleiro preto.',
      'Cc7+ não captura nada. Mas de c7 o cavalo ataca e8 e a8 ao mesmo tempo: o rei é obrigado a sair e a torre fica para o lance seguinte.',
      'Comparando os dois candidatos: um peão contra uma torre. Escolher exigiu listar os dois antes de calcular qualquer um.',
    ],
    comentario:
      'O lance que ganha é o que captura menos. Quem calcula só o primeiro impulso encontra ' +
      'Cxg7+, confirma que ele ganha um peão, e joga — sem nunca ter visto o lance de torre.',
  },
  contraste: {
    // Muda a casa de UMA peça preta. O xeque continua existindo e continua
    // parecendo forte, e é por isso que este contraste ensina: forçante não é
    // sinônimo de bom, e o que decidia era o alinhamento, não o xeque.
    fen: '1r2k3/6p1/4N3/8/8/8/8/4K3 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 400 },
    lanceQueFalha: 'e6c7',
    oQueMudou:
      'A torre preta está em b8, e não em a8. De c7 o cavalo alcança a8, e não b8: o xeque ' +
      'continua sendo xeque, só que agora não ataca mais nada junto. O rei sai para d8 atacando ' +
      'o cavalo e quem perde tempo é o branco. O candidato era bom na outra posição por causa do ' +
      'alinhamento, não por ser forçante.',
  },
  completion: {
    id: 'lances-candidatos-c1',
    fen: '4k3/8/8/8/8/4n3/6P1/R3K3 b - - 0 1',
    ladoDoAluno: 'b',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 400 },
    lancesAceitos: ['e3c2'],
    /*
      O GARFO SÓ SE PROVA QUANDO A TORRE É RECOLHIDA.

      Parar em Cc2+ deixa o exercício terminar no lance que PARECE ganhar. O
      aluno que joga o xeque e vê a tela dizer "certo" aprendeu a reconhecer um
      xeque duplo de cavalo; ele não viu o rei sair nem a torre cair, que é a
      parte que transforma o garfo em material.
    */
    continuacao: ['e3c2', 'e1d2', 'c2a1'],
    alternativas: ['e3g2', 'e3d1', 'e8e7'],
    raciocinioJaFeito: [
      'O cavalo preto em e3 tem seis casas. Duas delas dão xeque: g2, que também captura o peão, e c2.',
      'Cxg2+ ganha um peão e é o lance que a vista pega primeiro, porque é xeque e captura ao mesmo tempo.',
      'A torre branca está em a1 e o rei branco em e1. Os dois estão nas casas que um cavalo em c2 ataca.',
    ],
    enunciado: 'A lista tem dois candidatos. Calcule os dois e jogue o que rende mais.',
    explicacao:
      'Cc2+ ataca o rei e a torre no mesmo lance. O rei tem de sair do xeque, e Cxa1 vem na ' +
      'jogada seguinte: torre contra o peão que Cxg2+ ganharia. Cd1 tem a forma de um lance ' +
      'ativo e perde o cavalo para o rei. Os dois xeques estavam na lista; o que os separa é a ' +
      'conta, feita antes de jogar.',
  },
  guiada: [
    {
      id: 'lances-candidatos-g1',
      // Aqui os dois candidatos são de tipos diferentes — um xeque com captura
      // e uma entrada quieta de torre. É de propósito: a lição perde a graça se
      // os candidatos forem sempre duas capturas, porque aí o aluno aprende a
      // comparar capturas em vez de aprender a listar.
      fen: '6k1/5ppp/8/8/2B5/8/8/3R2K1 w - - 0 1',
      ladoDoAluno: 'w',
      objetivo: { tipo: 'mate-em', lances: 1 },
      lancesAceitos: ['d1d8'],
      alternativas: ['c4f7', 'd1d7', 'c4b3'],
      enunciado: 'Brancas jogam e terminam a partida neste lance. Liste os candidatos primeiro.',
      dicas: [
        {
          degrau: 'direcao',
          texto: 'Comece pela varredura: quais xeques, capturas e ameaças existem nesta posição?',
        },
        {
          degrau: 'area',
          texto:
            'Dois lugares merecem entrar na lista: a diagonal que o bispo aponta e a coluna ' +
            'aberta da torre.',
        },
        {
          degrau: 'ideia',
          texto:
            'Um dos candidatos é xeque e captura ao mesmo tempo, e o rei responde capturando. ' +
            'O outro não captura nada. Conte as casas de fuga do rei preto antes de escolher.',
        },
        {
          degrau: 'candidato',
          texto: 'Compare Bxf7+ com a entrada da torre na oitava fileira.',
        },
      ],
      explicacao:
        'Bxf7+ é xeque e captura, e por isso entra na lista primeiro — mas o rei captura de ' +
        'volta e o branco fica sem bispo. Td8 não captura nada e termina a partida: os três ' +
        'peões que protegem o rei preto também fecham a fuga dele. Quem calcula só o lance mais ' +
        'chamativo nunca chega ao segundo candidato.',
    },
  ],
  recuperacao: [
    {
      id: 'lances-candidatos-r1',
      fen: '3r2k1/8/8/8/2b5/1N6/5PPP/6K1 b - - 0 1',
      ladoDoAluno: 'b',
      objetivo: { tipo: 'mate-em', lances: 1 },
      lancesAceitos: ['d8d1'],
      alternativas: ['c4b3', 'd8d2', 'g8h8'],
      enunciado: 'Pretas jogam e terminam a partida neste lance.',
      explicacao:
        'Bxb3 ganha uma peça inteira e é o lance que a vista pega primeiro: captura limpa, peça ' +
        'sem defensor. Td1 não captura nada e encerra a partida — o rei branco está fechado ' +
        'pelos próprios peões e f1 está coberto pelo bispo de c4. Ganhar uma peça é bom; ' +
        'terminar a partida é melhor, e só aparece para quem listou os dois.',
    },
  ],
  resumo: [
    'Antes de calcular qualquer variante, liste dois ou três candidatos.',
    'Os forçantes entram sempre na lista: xeques, capturas e ameaças.',
    'Entrar na lista não é ser escolhido. Xeque e captura juntos chamam a atenção e nem por isso rendem mais.',
    'Para cada candidato, pergunte qual é a melhor resposta do adversário.',
    'Compare os resultados. Se você só calculou um lance, não escolheu nada.',
  ],
})

const REDE_DE_MATE = definirLicao({
  id: 'rede-de-mate',
  titulo: 'Tirar as casas antes do xeque',
  habilidade: 'tactics.mating-net',
  versao: 1,
  objetivo:
    'Aprender a fechar as casas de fuga do rei adversário antes de dar xeque. O xeque que sai ' +
    'cedo demais empurra o rei para o espaço aberto e devolve ao adversário a partida que estava ' +
    'perdida; o lance que fecha a última casa costuma ser quieto.',
  conceito:
    'Mate é xeque sem casa de fuga. Então a conta que importa não é "onde dou xeque", e sim ' +
    '"quantas casas o rei ainda tem, e quem cobre cada uma". Feche as casas primeiro; o xeque é ' +
    'o último lance, não o primeiro.',
  processoMental: [
    'Quais casas o rei adversário pode usar agora? Liste uma a uma, inclusive a casa onde ele está.',
    'Quem já cobre cada uma delas: uma peça minha, o meu rei, ou uma peça dele atrapalhando?',
    'Qual casa sobra? É ela que o meu próximo lance precisa fechar.',
    'Antes de fechar, confira: se o rei ficar sem lance nenhum e sem estar em xeque, é afogamento, não mate.',
  ],
  exemploResolvido: {
    fen: '7k/8/5K2/8/8/8/8/2R5 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'mate-em', lances: 2 },
    linhaModelo: ['f6g6', 'h8g8', 'c1c8'],
    raciocinio: [
      'O rei preto em h8 tem três casas: g8, g7 e h7. O rei branco em f6 já cobre g7, e mais nenhuma.',
      'O xeque está disponível: Tc8+. Só que o rei responde Rh7, e depois disso ele tem a oitava e a sétima fileiras para correr. Xeque dado cedo não fecha nada.',
      'Rg6 não dá xeque. Ele tira duas casas de uma vez: g7 e h7. Sobra g8 para o rei preto, e é a única casa que ele tem.',
      'Como a torre cobre a oitava fileira inteira de c8, a casa que sobrou é justamente a que o xeque final fecha.',
    ],
    comentario:
      'O lance que decide é o que não dá xeque. Depois de Rg6 o rei preto tem exatamente um ' +
      'lance, e a torre entra na oitava fileira para fechar a última casa.',
  },
  contraste: {
    // Muda UMA casa: o rei preto começa em g8, não em h8. O lance análogo
    // continua legal e continua parecendo a mesma aproximação — só que agora a
    // caixa tem uma parede a menos.
    fen: '6k1/8/5K2/8/8/8/8/2R5 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'mate-em', lances: 2 },
    lanceQueFalha: 'f6g6',
    oQueMudou:
      'O rei preto está em g8, fora do canto. Rg6 continua tirando f7, g7 e h7, mas agora ' +
      'sobram duas casas na oitava fileira, f8 e h8, e o xeque da torre só alcança uma delas de ' +
      'cada vez. A rede não fecha com o rei no meio da fileira: primeiro empurre-o para a borda, ' +
      'depois conte as casas.',
  },
  completion: {
    id: 'rede-de-mate-c1',
    fen: 'r7/8/8/8/8/8/5k1P/7K b - - 0 1',
    ladoDoAluno: 'b',
    objetivo: { tipo: 'mate-em', lances: 1 },
    lancesAceitos: ['a8a1'],
    alternativas: ['a8h8', 'a8a2', 'f2f3'],
    raciocinioJaFeito: [
      'O rei branco em h1 tem três casas possíveis: g1, g2 e h2.',
      'O rei preto em f2 cobre g1 e g2. A terceira, h2, está ocupada pelo peão branco, que de quebra tapa a coluna h.',
      'Com as três fechadas, falta só o xeque. Ele não pode vir pela coluna h, que o próprio peão branco bloqueia.',
    ],
    enunciado: 'A caixa já está fechada. Falta o xeque: por onde a torre entra?',
    explicacao:
      'Ta1 dá xeque pela primeira fileira, e o rei branco não tem nenhuma das três casas. Th8 ' +
      'não chega a ser xeque, porque o peão de h2 é do próprio branco e tapa a coluna. A ordem ' +
      'é essa: primeiro as casas, depois o xeque.',
  },
  guiada: [
    {
      id: 'rede-de-mate-g1',
      // Dama em vez de torre, de propósito. A rede é a mesma conta de casas, e
      // com a dama o erro típico é outro e pior: dar o xeque que existe e
      // empurrar o rei para fora, ou fechar casas demais e afogar.
      fen: 'k7/8/2K5/8/8/8/8/3Q4 w - - 0 1',
      ladoDoAluno: 'w',
      objetivo: { tipo: 'mate-em', lances: 2 },
      lancesAceitos: ['d1d7', 'd1b3'],
      alternativas: ['d1d8', 'd1a4', 'd1h5'],
      enunciado: 'Brancas jogam e dão mate em dois lances. Conte as casas do rei preto primeiro.',
      dicas: [
        {
          degrau: 'direcao',
          texto: 'Comece pela varredura: quais xeques, capturas e ameaças existem nesta posição?',
        },
        {
          degrau: 'area',
          texto:
            'O rei preto está no canto. Liste as casas que ele alcança e veja quais o rei ' +
            'branco já cobre.',
        },
        {
          degrau: 'ideia',
          texto:
            'Sobra uma casa. O lance que decide não é xeque: é o que fecha essa casa sem tirar ' +
            'todas as outras de uma vez, para o rei preto não ficar afogado.',
        },
        {
          degrau: 'candidato',
          texto: 'Considere a dama na sétima fileira, e confira que lance sobra para as pretas.',
        },
      ],
      explicacao:
        'Dd7 não dá xeque e tira a sétima fileira inteira: sobra b8 para o rei preto, e ele é ' +
        'obrigado a ir. Dxb7 no lance seguinte é mate, porque o rei branco em c6 defende a dama. ' +
        'Dd8+ é o xeque disponível e é o erro: o rei vai para a7 e escapa. Xeque que não fecha ' +
        'casa nenhuma só devolve tempo.',
    },
  ],
  recuperacao: [
    {
      id: 'rede-de-mate-r1',
      fen: '2r5/8/8/8/8/5k2/8/7K b - - 0 1',
      ladoDoAluno: 'b',
      objetivo: { tipo: 'mate-em', lances: 2 },
      lancesAceitos: ['f3g3'],
      alternativas: ['c8c1', 'c8h8', 'f3e3'],
      enunciado: 'Pretas jogam e dão mate em dois lances. O xeque imediato não é o caminho.',
      explicacao:
        'Tc1+ e Th8+ são os dois xeques da posição, e os dois soltam o rei branco: ele sai para ' +
        'h2 ou g1 e a perseguição recomeça. Rg3 não dá xeque e fecha g2 e h2 de uma vez. Sobra ' +
        'g1, o rei branco é obrigado a ir, e Tc1 é mate na primeira fileira.',
    },
    {
      id: 'rede-de-mate-r2',
      fen: '6k1/8/6K1/8/8/8/8/2R5 b - - 0 1',
      ladoDoAluno: 'b',
      objetivo: { tipo: 'evita-mate', emLances: 1, perdaMaximaTolerada: 0 },
      lancesAceitos: ['g8f8'],
      alternativas: ['g8h8'],
      enunciado:
        'Pretas jogam. As brancas ameaçam terminar a partida no próximo lance: encontre a ' +
        'única defesa.',
      explicacao:
        'Com o rei preto em g8 e o rei branco em g6, a torre entra na oitava fileira e é mate: ' +
        'f7, g7 e h7 estão cobertas pelo rei branco. Rh8 mantém o rei dentro da mesma caixa e o ' +
        'mate continua. Rf8 sai dela pelo lado que o rei branco não cobre, e a oitava fileira ' +
        'deixa de ser uma parede: o rei preto passa a ter e7 e e8 para correr.',
    },
  ],
  resumo: [
    'Mate é xeque sem casa de fuga. Conte as casas antes de procurar o xeque.',
    'O lance que fecha a rede quase sempre é quieto: aproximar o rei, cortar uma fileira, tomar uma coluna.',
    'Xeque dado cedo empurra o rei para o espaço aberto e devolve a partida.',
    'Rei na borda ou no canto tem menos casas. Empurre primeiro, feche depois.',
    'Antes do lance que fecha a última casa, confira se sobra lance legal para o adversário: sem xeque e sem lance, é afogamento.',
  ],
})

export const LICOES_TATICA_E_CALCULO: readonly Licao[] = [CRAVADA, LANCES_CANDIDATOS, REDE_DE_MATE]
