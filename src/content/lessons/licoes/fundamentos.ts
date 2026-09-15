/**
 * Lote 1 — fundamentos: as três lições que um aluno de ~1100 usa em toda partida.
 *
 * POR QUE ESTAS TRÊS JUNTAS, e não uma lista qualquer de temas: elas são a base
 * que as outras lições assumem como já sabida. Peça pendurada é a conta de
 * defensores; última fileira é a conta de casas de fuga; mate de dama é a mesma
 * conta de casas de fuga apontada para o final de partida. Quem não faz essas
 * duas contas não aproveita garfo, cravada nem plano de abertura — erra antes de
 * chegar lá.
 *
 * São as três lições do catálogo V1 MIGRADAS para o esquema V2. O texto que já
 * estava conferido (conceito, comentário do exemplo, e os exercícios de
 * recuperação com as suas explicações) foi preservado palavra por palavra, e os
 * ids continuam os mesmos: um id novo faria o progresso gravado apontar para uma
 * lição que não existe mais, e o aluno perderia o histórico sem nada acusar.
 *
 * O QUE FOI ACRESCENTADO é o miolo que faltava entre "vi a solução" e "resolva
 * sozinho" (plano §13): objetivo, processo mental, raciocínio do exemplo,
 * contraste, completion, guiada e resumo.
 *
 * DECISÃO DE CONTEÚDO QUE ESTE LOTE CARREGA — posições ESPARSAS. Nenhuma posição
 * passa de seis peças. Não é economia de digitação: a posição cheia esconde o
 * sinal que a lição quer ensinar atrás de dez sinais irrelevantes, e ainda torna
 * a prova do portão cara o bastante para alguém um dia querer afrouxá-la.
 *
 * O CONTRASTE DE CADA LIÇÃO muda UMA coisa só, e é onde está o trabalho difícil
 * deste arquivo: em peça pendurada muda o defensor (entra um peão em b7), em
 * última fileira muda a casa de fuga (o peão h já andou), em mate de dama muda a
 * casa do rei branco (f6 em vez de g6). Um contraste que mudasse duas coisas ao
 * mesmo tempo deixaria o aluno sem saber qual delas importou.
 */

import { definirLicao, type Licao } from '@/domain/lessons'

const PECA_PENDURADA = definirLicao({
  id: 'peca-pendurada',
  titulo: 'A peça que ninguém está defendendo',
  habilidade: 'tactics.hanging-piece',
  versao: 1,
  objetivo:
    'Reconhecer, antes de procurar o melhor lance, quais peças do adversário estão sem nenhum ' +
    'defensor. É a verificação mais barata do tabuleiro e a que decide mais partidas até 1400: ' +
    'material de graça não exige plano, exige a pergunta certa na hora certa.',
  conceito:
    'Antes de qualquer plano, olhe quais peças do adversário estão sem nenhum defensor. É a ' +
    'busca mais barata do xadrez e a que decide mais partidas até 1400. Uma peça sem defesa ao ' +
    'alcance de uma peça sua é material de graça.',
  processoMental: [
    'Quais peças do adversário estão ao alcance de alguma peça minha?',
    'Quem defende cada uma delas: um peão, uma peça ou o rei?',
    'Se ninguém defende, a captura não devolve nada. Se alguém defende, faça a conta do que você entrega.',
    'Antes de capturar, confira a casa de destino: a sua peça fica atacada lá?',
  ],
  exemploResolvido: {
    fen: '4k3/8/2n5/8/8/8/8/2R1K3 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 250 },
    linhaModelo: ['c1c6'],
    raciocinio: [
      'Primeiro listo o que consigo capturar: a torre da coluna c alcança o cavalo em c6.',
      'Antes de capturar, procuro os defensores de c6. Não há peão preto no tabuleiro, o rei preto está em e8 e o cavalo é a única outra peça preta.',
      'Nenhum defensor: a captura não devolve nada. Falta conferir a casa de destino, e nada ataca c6 depois da captura.',
    ],
    comentario:
      'O cavalo em c6 não tem peão, peça nem rei defendendo. A torre da coluna c chega nele ' +
      'direto. Não há variante a calcular: há uma pergunta a fazer.',
  },
  contraste: {
    fen: '4k3/1p6/2n5/8/8/8/8/2R1K3 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 250 },
    lanceQueFalha: 'c1c6',
    oQueMudou:
      'Entrou um peão preto em b7. O cavalo continua em c6 e a torre continua na coluna c: a ' +
      'figura no tabuleiro é a mesma do exemplo. Só que agora Txc6 é respondido por bxc6, e a ' +
      'conta vira torre por cavalo, cinco pontos por três. O que decide não é a geometria da ' +
      'captura, é o defensor.',
  },
  completion: {
    id: 'peca-pendurada-c1',
    fen: '4k3/1p6/2n5/5b2/8/8/8/2R1KR2 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 250 },
    lancesAceitos: ['f1f5'],
    alternativas: ['c1c6', 'e1e2', 'f1f4'],
    raciocinioJaFeito: [
      'Duas peças pretas estão ao alcance das torres brancas: o cavalo em c6, pela coluna c, e o bispo em f5, pela coluna f.',
      'O cavalo em c6 tem defensor: o peão de b7.',
      'O bispo em f5 não tem nenhum: nem peão, nem peça, nem rei chega a essa casa.',
    ],
    enunciado: 'Falta um passo. Qual das duas torres captura, e onde?',
    explicacao:
      'Txf5 leva o bispo e nada recaptura. Txc6 parece a mesma captura e não é: o peão de b7 ' +
      'recaptura, e a conta vira torre por cavalo. As duas capturas estavam disponíveis; o que ' +
      'separa uma da outra é a pergunta sobre o defensor.',
  },
  guiada: [
    {
      id: 'peca-pendurada-g1',
      // O peão preto em h7 está longe de tudo e não participa da tática. Ele
      // existe porque sem ele a captura do bispo deixa rei e cavalo contra rei
      // sozinho — material insuficiente, empate — e o exercício ensinaria a
      // ganhar uma peça que não ganha partida nenhuma.
      fen: '4k3/7p/2b5/4N3/8/8/8/4K3 w - - 0 1',
      ladoDoAluno: 'w',
      objetivo: { tipo: 'ganha-material', saldoMinimo: 250 },
      lancesAceitos: ['e5c6'],
      alternativas: ['e5d7', 'e5f7', 'e1e2'],
      enunciado: 'Brancas jogam e ganham material. Confira também a casa onde o cavalo vai parar.',
      dicas: [
        {
          degrau: 'direcao',
          texto: 'Comece pela varredura: quais xeques, capturas e ameaças existem nesta posição?',
        },
        {
          degrau: 'area',
          texto: 'O cavalo branco alcança seis casas. Veja o que há em cada uma e quem as defende.',
        },
        {
          degrau: 'ideia',
          texto:
            'Uma peça preta está sem defensor. As casas vizinhas ao rei preto, não: ele defende todas elas.',
        },
        { degrau: 'candidato', texto: 'Considere Cxc6.' },
      ],
      explicacao:
        'Cxc6 leva o bispo sem devolver nada. Cd7 e Cf7 também entram no campo preto, mas são ' +
        'casas que o rei em e8 defende: nas duas o cavalo é capturado de graça. A pergunta sobre ' +
        'o defensor vale para as suas peças na mesma medida em que vale para as dele.',
    },
  ],
  recuperacao: [
    {
      id: 'peca-pendurada-r1',
      fen: '3rk3/8/8/8/3B4/8/8/4K3 b - - 0 1',
      ladoDoAluno: 'b',
      objetivo: { tipo: 'ganha-material', saldoMinimo: 250 },
      enunciado: 'Pretas jogam. Encontre o lance que ganha material imediatamente.',
      lancesAceitos: ['d8d4'],
      alternativas: ['d8d5', 'e8e7', 'd8a8'],
      explicacao:
        'A torre e o bispo estão na mesma coluna, e o rei branco está longe demais para ajudar. ' +
        'Atacar o bispo com Td5 dá a ele um lance para fugir; capturar não dá.',
    },
  ],
  resumo: [
    'Antes de escolher um lance, pergunte quem defende cada peça do adversário que você alcança.',
    'Peça sem defensor é material de graça. Peça defendida é uma troca, e toda troca precisa de conta.',
    'Confira a casa de destino: capturar numa casa defendida devolve a peça no lance seguinte.',
    'A mesma pergunta vale para o seu lado. As suas peças sem defensor são as que ele está procurando.',
  ],
})

const ULTIMA_FILEIRA = definirLicao({
  id: 'ultima-fileira',
  titulo: 'A fileira que os próprios peões fecharam',
  habilidade: 'tactics.back-rank',
  versao: 1,
  objetivo:
    'Enxergar quando o rei adversário está preso pelos próprios peões, e fazer a mesma conta no ' +
    'seu rei antes de jogar. É a estrutura mais comum do tabuleiro depois do roque, e o mate que ' +
    'mais decide partida em um lance só.',
  conceito:
    'Depois do roque, os três peões que protegem o rei também o prendem. Uma torre ou dama que ' +
    'entre na última fileira dá mate se o rei não tiver casa de fuga. Vale para os dois lados: ' +
    'confira a sua fileira com a mesma frequência com que ataca a dele.',
  processoMental: [
    'Quantas casas de fuga o rei adversário tem? Conte os peões dele como parede, não como escudo.',
    'Se todas as saídas ficam na última fileira, procure uma torre ou dama que entre nessa fileira.',
    'Antes de entrar, confira quem defende a casa de entrada e se alguma peça consegue se interpor.',
    'Repita a conta no seu rei: a última fileira é uma via de mão dupla.',
  ],
  exemploResolvido: {
    fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'mate-em', lances: 1 },
    linhaModelo: ['a1a8'],
    raciocinio: [
      'Antes de procurar lance, conto as casas de fuga do rei preto: f8, h8, f7, g7 e h7.',
      'Três delas estão ocupadas pelos próprios peões pretos. Sobram f8 e h8, e as duas ficam na oitava fileira.',
      'Então um xeque na oitava fileira não deixa saída nenhuma. Procuro quem chega lá: a torre da coluna a chega, ninguém defende a8 e nada se interpõe.',
    ],
    comentario:
      'O rei preto tem cinco casas ao redor e nenhuma serve: três estão ocupadas pelos próprios ' +
      'peões e duas ficam na fileira que a torre acabou de tomar.',
  },
  contraste: {
    fen: '6k1/5pp1/7p/8/8/8/8/R5K1 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'mate-em', lances: 1 },
    lanceQueFalha: 'a1a8',
    oQueMudou:
      'O peão h preto está em h6 e não em h7. A torre, os reis e os outros dois peões estão nas ' +
      'mesmas casas do exemplo, e Ta8 continua sendo xeque — só que agora o rei sobe para h7 e a ' +
      'partida segue. Um único lance de peão, jogado muito antes, cancela a ideia inteira.',
  },
  completion: {
    id: 'ultima-fileira-c1',
    fen: '6k1/5ppp/8/8/8/8/8/Q5K1 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'mate-em', lances: 1 },
    lancesAceitos: ['a1a8'],
    alternativas: ['a1a7', 'a1a4', 'g1f1'],
    raciocinioJaFeito: [
      'O rei preto está em g8, e os peões f7, g7 e h7 fecham as três casas da sétima fileira.',
      'Sobram f8 e h8, e as duas estão na oitava fileira.',
      'A dama branca tem a coluna a inteira livre e a oitava fileira inteira livre.',
    ],
    enunciado: 'Falta um passo. Qual lance das brancas termina a partida agora?',
    explicacao:
      'Da8 entra na fileira e cobre f8 e h8 no mesmo lance. Da7 é o lance que mais tenta: ataca ' +
      'o peão de f7 e parece mais ativo. Mas atacar não é entrar — a sétima fileira está cheia ' +
      'de peões pretos, e a que está vazia é a oitava.',
  },
  guiada: [
    {
      id: 'ultima-fileira-g1',
      fen: '3r2k1/5ppp/1q6/8/8/8/5PPP/6K1 b - - 0 1',
      ladoDoAluno: 'b',
      objetivo: { tipo: 'mate-em', lances: 1 },
      lancesAceitos: ['d8d1'],
      alternativas: ['b6f2', 'd8d2', 'g8h8'],
      enunciado: 'Pretas jogam e terminam a partida em um lance. Há mais de um xeque disponível.',
      dicas: [
        {
          degrau: 'direcao',
          texto:
            'Liste os xeques que as pretas têm e, para cada um, pergunte para onde o rei branco vai.',
        },
        {
          degrau: 'area',
          texto: 'Olhe a primeira fileira branca e conte quantas casas o rei em g1 tem de verdade.',
        },
        {
          degrau: 'ideia',
          texto:
            'O xeque de dama em f2 deixa h1 livre para o rei. O xeque que toma a primeira fileira inteira não deixa nada.',
        },
        { degrau: 'candidato', texto: 'Considere Td1.' },
      ],
      explicacao:
        'Td1 é mate: o rei branco não tem f1 nem h1, os peões f2, g2 e h2 fecham o resto, e ' +
        'nenhuma peça branca chega à primeira fileira para interpor. Dxf2+ é o xeque mais ' +
        'chamativo e o mais natural de calcular primeiro — ele ganha um peão e não termina nada, ' +
        'porque o rei sai para h1. Entre dois xeques, quem decide é a contagem de casas de fuga.',
    },
  ],
  recuperacao: [
    {
      id: 'ultima-fileira-r1',
      fen: 'r5k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1',
      ladoDoAluno: 'b',
      objetivo: { tipo: 'mate-em', lances: 1 },
      enunciado: 'Pretas jogam e dão mate em um lance.',
      lancesAceitos: ['a8a1'],
      alternativas: ['a8a2', 'g8h8', 'f7f6'],
      explicacao:
        'A mesma posição do exemplo, virada. Os peões f2, g2 e h2 protegem o rei branco de tudo ' +
        'menos disto. Repare que o próprio rei preto está na mesma situação — por isso a lição ' +
        'vale para os dois lados.',
    },
  ],
  resumo: [
    'Rei roqueado com os três peões parados tem duas saídas, e as duas ficam na última fileira.',
    'Procure a entrada na fileira antes de procurar um plano: ela costuma estar a um lance.',
    'Antes de entrar, confira quem defende a casa de entrada e quem consegue se interpor.',
    'Um lance de peão abre a janela e cancela a ideia. Vale contra você também: faça a conta no seu rei.',
  ],
})

const MATE_DE_DAMA = definirLicao({
  id: 'mate-de-dama',
  titulo: 'Mate com rei e dama',
  habilidade: 'endgame.basic-mates',
  versao: 1,
  objetivo:
    'Terminar uma partida ganha com rei e dama, sem depender de sorte e sem cair no afogamento. ' +
    'É o final que aparece logo depois de uma promoção, e o que mais desperdiça ponto inteiro ' +
    'quando o método não está claro.',
  conceito:
    'A dama sozinha não dá mate. Quem dá é a dama apoiada pelo rei: ela tira as casas, ele ' +
    'defende a casa em que ela entra. Empurre o rei adversário para a borda antes de dar o ' +
    'xeque, e confira as casas de fuga antes de cada lance para não afogar.',
  processoMental: [
    'O rei adversário já está na borda? Se não estiver, empurre-o para lá antes de procurar mate.',
    'Quais casas o meu rei já cobre sozinho?',
    'Qual xeque de dama fecha as casas que sobraram, dado de uma casa que o rei adversário não alcança?',
    'Antes de jogar: se este lance não for xeque, o rei adversário ainda tem algum lance legal? Se não tiver, a partida termina empatada por afogamento.',
  ],
  exemploResolvido: {
    fen: '7k/8/6K1/8/8/8/8/3Q4 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'mate-em', lances: 1 },
    linhaModelo: ['d1d8'],
    raciocinio: [
      'O rei preto já está na borda, em h8. Não há mais para onde empurrá-lo: falta o xeque.',
      'Vejo o que o meu rei já faz sozinho: de g6 ele tira g7 e h7 do rei preto.',
      'Sobra g8. Procuro um xeque que cubra g8 e h8 ao mesmo tempo, dado de longe, e a oitava fileira faz as duas coisas.',
    ],
    comentario:
      'O rei branco já tira g7 e h7 do rei preto. A dama só precisa fechar a oitava fileira, e ' +
      'faz isso de longe: chegar ao lado do rei sem o apoio dele seria entregar a dama.',
  },
  contraste: {
    fen: '7k/8/5K2/8/8/8/8/3Q4 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'mate-em', lances: 1 },
    lanceQueFalha: 'd1d8',
    oQueMudou:
      'O rei branco está em f6 e não em g6. A dama está na mesma casa, o rei preto está na mesma ' +
      'casa, e Dd8 continua sendo xeque pela oitava fileira. Só que de f6 o rei branco não cobre ' +
      'h7, e o rei preto sobe por lá. Quem dá o mate é a dupla: mudar a casa do rei muda o ' +
      'resultado sem mexer na dama.',
  },
  completion: {
    id: 'mate-de-dama-c1',
    fen: 'k7/8/1K6/8/8/8/8/6Q1 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'mate-em', lances: 1 },
    lancesAceitos: ['g1g8'],
    alternativas: ['g1a1', 'g1g7', 'b6c6'],
    raciocinioJaFeito: [
      'O rei preto está em a8, encostado na borda. Não há mais para onde empurrá-lo.',
      'O rei branco em b6 já cobre a7 e b7.',
      'Sobra b8, e o xeque precisa vir de uma casa que o rei preto não alcance.',
    ],
    enunciado: 'Falta um passo. Para onde vai a dama?',
    explicacao:
      'Dg8 dá xeque pela oitava fileira e cobre b8 no mesmo lance; a7 e b7 já eram do rei ' +
      'branco. Da1 também dá xeque, pela coluna a, e é a ideia mais direta — mas deixa b8 livre ' +
      'e o rei preto sai por lá. O xeque certo é o que fecha a casa que sobrou.',
  },
  guiada: [
    {
      id: 'mate-de-dama-g1',
      fen: 'k7/8/1K6/8/8/8/2Q5/8 w - - 0 1',
      ladoDoAluno: 'w',
      objetivo: { tipo: 'mate-em', lances: 1 },
      lancesAceitos: ['c2c8'],
      alternativas: ['c2c7', 'c2a2', 'b6c6'],
      enunciado:
        'Brancas jogam e terminam a partida em um lance. Conte as casas do rei preto antes de escolher.',
      dicas: [
        {
          degrau: 'direcao',
          texto: 'Comece pelo rei adversário: para quantas casas ele pode ir agora?',
        },
        {
          degrau: 'area',
          texto: 'As casas são a7, b7 e b8. Veja quais delas o rei branco já cobre sozinho.',
        },
        {
          degrau: 'ideia',
          texto:
            'O rei branco cobre a7 e b7. A dama precisa dar xeque e cobrir b8 no mesmo lance: se ela cobrir tudo sem dar xeque, a partida termina empatada por afogamento.',
        },
        { degrau: 'candidato', texto: 'Considere Dc8.' },
      ],
      explicacao:
        'Dc8 dá xeque pela oitava fileira e tira b8. a7 e b7 são do rei branco, e a dama está ' +
        'longe demais para ser capturada. Dc7 é o lance que a intuição pede, porque cobre as ' +
        'três casas de uma vez — e é exatamente por isso que empata: sem xeque e sem casa legal, ' +
        'a posição é afogamento. Nos finais de dama, cobrir tudo e dar xeque são coisas ' +
        'diferentes.',
    },
  ],
  recuperacao: [
    {
      id: 'mate-de-dama-r1',
      fen: '4k3/8/4K3/8/8/8/8/7Q w - - 0 1',
      ladoDoAluno: 'w',
      objetivo: { tipo: 'mate-em', lances: 1 },
      enunciado: 'Brancas jogam e dão mate em um lance.',
      lancesAceitos: ['h1h8', 'h1a8'],
      alternativas: ['h1h5', 'h1e1', 'e6d6'],
      explicacao:
        'Aqui o rei branco já cobre d7, e7 e f7, e o rei preto está na borda. Falta a dama tomar ' +
        'a oitava fileira — de longe, não de perto: chegar ao lado do rei não é necessário e ' +
        'nesta posição nem seria seguro.',
    },
  ],
  resumo: [
    'A dama sozinha não dá mate. Ela tira casas; o rei defende a casa em que ela entra.',
    'Empurre o rei adversário para a borda antes de procurar o xeque.',
    'Antes de cada lance, conte as casas que sobram para o rei adversário. Nenhuma casa e nenhum xeque é empate por afogamento.',
    'Dama encostada no rei adversário sem o apoio do seu rei é dama entregue.',
  ],
})

export const LICOES_FUNDAMENTOS: readonly Licao[] = [PECA_PENDURADA, ULTIMA_FILEIRA, MATE_DE_DAMA]
