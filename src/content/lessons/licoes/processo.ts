/**
 * Lote de lições: PROCESSO.
 *
 * As três lições daqui têm a mesma resposta para a pergunta "o que o aluno leva
 * embora": um ROTEIRO, não uma posição. Elas estão juntas porque o processo
 * mental de uma é pré-requisito do da seguinte, e separá-las faria três lições
 * repetirem a mesma escada em três lugares:
 *
 * - `varredura-de-capturas` ensina a LISTA (xeques, capturas, ameaças) e a
 *   contagem de defensores que decide qual item da lista presta;
 * - `garfo` é a lista apontada para uma casa: o aluno procura a casa que toca
 *   dois alvos, e a contagem de defensores vira "essa casa é segura?";
 * - `resposta-do-adversario` é a MESMA lista, com os lados trocados. É o passo
 *   que os outros dois deixariam de fora se cada um fosse escrito sozinho.
 *
 * MIGRADAS DA V1 (issue #74, plano §13). Conceito, comentário do exemplo e
 * exercícios de recuperação vieram do catálogo antigo com os ids preservados —
 * o progresso já gravado por `completedItemIds` continua apontando para o mesmo
 * exercício. O que é novo são as etapas intermediárias, e cada uma existe
 * contra um defeito nomeado no esquema.
 *
 * O QUE CUSTOU MAIS CARO AQUI, e vale como aviso para o próximo lote: o
 * CONTRASTE. O portão exige que o lance análogo FALHE, e a primeira versão de
 * cada um destes três falhava ao contrário — o lance análogo também ganhava,
 * porque mudar a posição "um pouquinho" quase nunca muda a conclusão. Os três
 * contrastes daqui mudam UMA coisa só, e é sempre a que o aluno não estava
 * olhando: quem defende a casa de chegada, quem defende a peça capturada, e
 * quem vigia a casa de fuga.
 */

import { definirLicao, type Licao } from '@/domain/lessons'

const VARREDURA = definirLicao({
  id: 'varredura-de-capturas',
  titulo: 'Xeques, capturas e ameaças',
  habilidade: 'calculation.checks-captures-threats',
  versao: 1,
  objetivo:
    'Você vai aprender a listar os lances forçantes antes de escolher o lance, e a contar quem ' +
    'defende a casa antes de capturar. A lista leva segundos e é o que faz aparecer o material ' +
    'que já estava de graça na posição.',
  conceito:
    'Antes de escolher um lance, liste os lances forçantes: quais xeques você tem, quais ' +
    'capturas, quais ameaças. São poucos e a lista se faz em segundos. Capturar nem sempre é ' +
    'certo — a varredura serve para você DECIDIR, não para capturar por reflexo.',
  processoMental: [
    'Liste os xeques que você tem. São poucos, e é por eles que a lista começa.',
    'Liste as capturas. Todas, inclusive as que parecem ruins.',
    'Liste as ameaças: o que você atacaria se tivesse mais um lance.',
    'Para cada captura da lista, conte quem defende a casa de chegada.',
    'Sem defensor, o material é seu. Com defensor, faça a conta antes de jogar.',
  ],
  exemploResolvido: {
    fen: '4k3/2p5/1n4b1/8/8/8/8/1R2K1R1 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 250 },
    linhaModelo: ['g1g6'],
    raciocinio: [
      'Xeques primeiro: nenhuma torre alcança o rei preto. A lista começa nas capturas.',
      'Capturas: são duas, Txb6 e Txg6. Escrevi as duas antes de julgar qualquer uma.',
      'Defensores de b6: o peão de c7 defende o cavalo. Torre por cavalo é prejuízo.',
      'Defensores de g6: nenhum. Nenhum peão, nenhuma peça, e o rei preto está longe.',
      'A captura que sobra da contagem é a que eu jogo.',
    ],
    comentario:
      'As duas capturas aparecem na varredura, e só uma presta: o cavalo de b6 está defendido ' +
      'pelo peão c7, então Txb6 devolve cinco pontos por três. O bispo de g6 não tem ninguém.',
  },
  contraste: {
    fen: '4k3/2p4p/1n4b1/8/8/8/8/1R2K1R1 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 250 },
    lanceQueFalha: 'g1g6',
    oQueMudou:
      'Existe um peão em h7. A captura é a mesma, na mesma casa, contra a mesma peça — e agora ' +
      'hxg6 devolve torre por bispo. O que mudou não foi a captura: foi a contagem de ' +
      'defensores, e ela é a parte da varredura que costuma ser pulada.',
  },
  completion: {
    id: 'varredura-c1',
    fen: '4k3/2p5/3n3b/8/8/8/8/3RK2R w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 250 },
    lancesAceitos: ['h1h6'],
    alternativas: ['d1d6', 'h1h5', 'e1f2'],
    raciocinioJaFeito: [
      'Xeques: nenhum. A torre de d1 esbarra no cavalo de d6, e a de h1 esbarra no bispo de h6.',
      'Capturas: duas, Txd6 e Txh6.',
      'Defensores: o peão de c7 defende o cavalo de d6. O bispo de h6 não tem nenhum.',
    ],
    enunciado: 'A contagem já está feita. Qual das duas capturas ganha material?',
    explicacao:
      'Txh6 leva o bispo inteiro, porque nada recaptura. Txd6 come a peça mais valiosa das duas ' +
      'e é a pior escolha: cxd6 devolve torre por cavalo. Entre "capturei o que valia mais" e ' +
      '"ganhei material" existe a contagem de defensores.',
  },
  guiada: [
    {
      id: 'varredura-g1',
      // O BISPO ESTÁ EM h5, E NÃO EM h4, e a diferença de uma casa é a diferença
      // entre o exercício existir e não existir. Em h4 ele dá XEQUE pela
      // diagonal h4-e1, e a posição deixa de ter escolha nenhuma: as pretas não
      // perguntam qual peça cai, elas obrigam. As duas "alternativas erradas" da
      // coluna a eram, na verdade, lances ILEGAIS — e passavam pelo portão em
      // silêncio, porque não cumprir o objetivo era exatamente o que se esperava
      // delas. Pego pela checagem de legalidade em `verificarExercicio`, que
      // nasceu deste caso.
      fen: '4k3/1p6/n7/7b/8/8/8/R3K2R w - - 0 1',
      ladoDoAluno: 'w',
      objetivo: { tipo: 'ganha-material', saldoMinimo: 250 },
      lancesAceitos: ['h1h5'],
      // O lance de espera é Rf2 e não Re2: da casa h5 o bispo vigia a diagonal
      // h5-g4-f3-e2, então Re2 é ilegal. É o mesmo tipo de erro que a checagem
      // de legalidade acabou de pegar duas linhas acima, e ele reapareceu ao
      // mover o bispo — o que é a melhor evidência possível de que a checagem
      // precisava existir.
      alternativas: ['a1a6', 'a1a5', 'e1f2'],
      enunciado: 'Brancas jogam. Duas peças pretas estão ao alcance das torres. Qual delas cai?',
      dicas: [
        {
          degrau: 'direcao',
          texto: 'Comece pela lista: quais xeques, quais capturas, quais ameaças você tem aqui?',
        },
        {
          degrau: 'area',
          texto:
            'As duas peças pretas fora da oitava fileira estão em lados opostos do tabuleiro. Olhe as colunas a e h.',
        },
        {
          degrau: 'ideia',
          texto:
            'Uma das duas capturas devolve mais material do que ganha. Conte quem defende cada casa antes de escolher.',
        },
        { degrau: 'candidato', texto: 'Considere Txh5.' },
      ],
      explicacao:
        'O bispo de h5 não tem defensor, e a torre de h1 chega nele pela coluna aberta. O cavalo ' +
        'de a6 está defendido pelo peão de b7, então Txa6 devolve torre por cavalo. Ta5 ataca o ' +
        'bispo em vez de capturá-lo, e atacar dá ao adversário exatamente o lance que faltava ' +
        'para tirar a peça de lá.',
    },
  ],
  recuperacao: [
    {
      id: 'varredura-r1',
      fen: '4k3/8/6p1/5n2/8/7b/8/4KR1R w - - 0 1',
      ladoDoAluno: 'w',
      objetivo: { tipo: 'ganha-material', saldoMinimo: 250 },
      enunciado: 'Brancas jogam. Há mais de uma captura na posição. Qual delas ganha material?',
      lancesAceitos: ['h1h3'],
      alternativas: ['f1f5', 'f1f4', 'e1e2'],
      explicacao:
        'O cavalo de f5 está defendido pelo peão de g6; o bispo de h3 não está defendido por ' +
        'nada. Contar defensores antes de capturar é o passo que separa a varredura útil da ' +
        'captura por reflexo.',
    },
  ],
  resumo: [
    'Xeques, capturas e ameaças. Nessa ordem, e a lista é curta.',
    'Escreva a lista inteira antes de julgar qualquer item dela.',
    'Nenhuma captura entra na conta antes de você contar os defensores da casa.',
    'Capturar a peça mais valiosa não é a mesma coisa que ganhar material.',
    'Atacar uma peça sem defensor dá a ela um lance para sair. Capturar não dá.',
  ],
})

const GARFO = definirLicao({
  id: 'garfo',
  titulo: 'Um lance, dois alvos',
  habilidade: 'tactics.fork',
  versao: 1,
  objetivo:
    'Você vai aprender a procurar a CASA de onde uma peça sua ataca dois alvos ao mesmo tempo, ' +
    'e a conferir se essa casa é segura antes de jogar. É o ganho de material mais frequente ' +
    'até 1400, e some da vista quando a busca é por peça em vez de por casa.',
  conceito:
    'Garfo é um lance que ataca duas coisas ao mesmo tempo. O adversário só salva uma. Cavalo e ' +
    'peão são os melhores garfadores porque valem pouco: o alvo não pode simplesmente capturar ' +
    'o atacante e ficar bem.',
  processoMental: [
    'Liste os alvos: o rei, a dama, as torres e qualquer peça sem defensor.',
    'Procure a CASA de onde uma peça sua tocaria dois desses alvos, não a peça mais ativa.',
    'Pergunte quem defende essa casa. Se alguém defende, o garfo devolve mais do que ganha.',
    'Se um dos dois alvos for o rei, o adversário perde o tempo de salvar o outro.',
  ],
  exemploResolvido: {
    fen: '3r3k/8/8/4N3/8/8/8/6K1 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 400 },
    linhaModelo: ['e5f7', 'h8g8', 'f7d8'],
    raciocinio: [
      'Alvos: o rei em h8 e a torre em d8. Os dois valem mais que o meu cavalo.',
      'Procurei a casa que toca os dois, e não o melhor lance do cavalo: de f7 ele alcança h8 e d8.',
      'Conferi f7: nenhuma peça preta a defende, e o rei em h8 não chega até lá.',
      'Um dos alvos é o rei, então o xeque vem primeiro e a torre não tem tempo de sair.',
    ],
    comentario:
      'De f7 o cavalo dá xeque ao rei e ataca a torre de d8 no mesmo lance. O xeque é o que ' +
      'transforma o ataque duplo em ganho: o rei precisa responder, e a torre fica para depois.',
  },
  contraste: {
    fen: '3r2k1/8/8/4N3/8/8/8/6K1 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 400 },
    lanceQueFalha: 'e5f7',
    oQueMudou:
      'O rei preto está em g8, e não em h8. Daqui ele defende f7. O cavalo chega na mesma casa ' +
      'e ataca a mesma torre, só que não dá xeque e é capturado antes de cobrar nada. A casa do ' +
      'garfo precisa ser segura, e quem confere isso é a contagem de defensores.',
  },
  completion: {
    id: 'garfo-c1',
    fen: 'k3r3/8/8/3N4/8/8/8/6K1 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 400 },
    lancesAceitos: ['d5c7'],
    alternativas: ['d5b6', 'd5f6', 'g1g2'],
    raciocinioJaFeito: [
      'Os alvos são o rei em a8 e a torre em e8. O cavalo de d5 é a única peça que pode atacá-los.',
      'De d5 o cavalo alcança oito casas: b4, b6, c3, c7, e3, e7, f4 e f6.',
      'Duas delas dão xeque ao rei em a8: c7 e b6. Nenhuma peça preta defende as duas.',
    ],
    enunciado: 'Dos dois xeques de cavalo, qual deles também alcança a torre?',
    explicacao:
      'De c7 o cavalo dá xeque ao rei e ataca a torre de e8 no mesmo lance. De b6 o xeque é o ' +
      'mesmo, mas a torre fica fora do alcance e o rei ganha justamente o tempo que o garfo ' +
      'deveria tirar dele. Quando os dois alvos estão distantes um do outro, costuma existir uma ' +
      'casa só que serve.',
  },
  guiada: [
    {
      id: 'garfo-g1',
      fen: '3q3k/8/8/4N3/8/8/8/6K1 w - - 0 1',
      ladoDoAluno: 'w',
      objetivo: { tipo: 'ganha-material', saldoMinimo: 900 },
      lancesAceitos: ['e5f7'],
      alternativas: ['e5d7', 'e5g6', 'e5c6'],
      enunciado: 'Brancas jogam e ganham material. Antes de escolher, veja onde as pretas estão.',
      dicas: [
        {
          degrau: 'direcao',
          texto:
            'Comece pelos lances forçantes: quais xeques e quais capturas você tem nesta posição?',
        },
        {
          degrau: 'area',
          texto: 'As duas peças pretas estão na oitava fileira, distantes uma da outra.',
        },
        {
          degrau: 'ideia',
          texto: 'Existe uma casa de onde o cavalo dá xeque e ainda alcança a outra peça.',
        },
        { degrau: 'candidato', texto: 'Considere Cf7.' },
      ],
      explicacao:
        'De f7 o cavalo dá xeque ao rei em h8 e ataca a dama em d8. O rei é obrigado a responder ' +
        'ao xeque, e a dama não tem defensor nem tempo para sair. Cg6 também dá xeque, mas de lá ' +
        'o cavalo não toca a dama — e o rei ainda o ataca de h7. Cc6 ataca a dama sem xeque, e ' +
        'ela simplesmente se muda.',
    },
  ],
  recuperacao: [
    {
      id: 'garfo-r1',
      fen: '4k3/8/8/8/3n3R/8/8/4K3 b - - 0 1',
      ladoDoAluno: 'b',
      objetivo: { tipo: 'ganha-material', saldoMinimo: 400 },
      enunciado: 'Pretas jogam. Existe uma casa que ataca duas peças brancas ao mesmo tempo.',
      lancesAceitos: ['d4f3'],
      alternativas: ['d4e2', 'd4c6', 'e8e7'],
      explicacao:
        'Em f3 o cavalo dá xeque e ataca a torre. O xeque é o que faz o garfo funcionar: o rei ' +
        'branco é obrigado a responder e não sobra tempo para salvar a torre. Em e2 o cavalo ' +
        'também toca as duas peças — só que o rei simplesmente o captura.',
    },
  ],
  resumo: [
    'Alvos primeiro: rei, dama, torres e qualquer peça sem defensor.',
    'Procure a casa que toca dois alvos, não a peça que parece mais ativa.',
    'Antes de jogar o garfo, conte quem defende a casa de chegada.',
    'Garfo com xeque cobra. Garfo sem xeque dá um lance de resposta ao adversário.',
  ],
})

const RESPOSTA_DO_ADVERSARIO = definirLicao({
  id: 'resposta-do-adversario',
  titulo: 'O que ele quer jogar?',
  habilidade: 'calculation.opponent-best-response',
  versao: 1,
  objetivo:
    'Você vai aprender a dar a vez ao adversário dentro da sua cabeça antes de jogar, e a tratar ' +
    'a ameaça dele antes do seu próprio plano. A maior parte do material perdido até 1400 sai de ' +
    'ameaças que já estavam no tabuleiro.',
  conceito:
    'Depois de escolher o seu lance e antes de jogá-lo, pergunte o que o adversário responderia. ' +
    'A maioria das partidas perdidas até 1400 não se perde por não achar um plano: perde-se por ' +
    'não olhar a ameaça que já estava na mesa.',
  processoMental: [
    'Antes de jogar, imagine que é a vez dele.',
    'Procure os lances forçantes DELE: xeques, capturas e ameaças.',
    'Se algum deles ganha, o seu lance tem de tratar disso antes de qualquer plano.',
    'Escolhido o lance, repita a pergunta para a posição que vai surgir.',
  ],
  exemploResolvido: {
    fen: '3r2k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'evita-mate', emLances: 1, perdaMaximaTolerada: 0 },
    linhaModelo: ['h2h3'],
    raciocinio: [
      'Dei a vez a ele: se as pretas jogassem agora, qual seria o lance?',
      'Td1 é xeque, e o rei branco não tem casa: f1 e h1 estão na fileira da torre, f2, g2 e h2 são peões meus.',
      'Então a ameaça não é perda de material, é mate. Ela vem antes de qualquer plano meu.',
      'Não tenho peça nenhuma para cobrir d1, então o que sobra é mudar as casas do rei.',
      'O peão de h2 abre h2 e não custa nada. Depois dele, Td1 é xeque e o rei sai por h2.',
    ],
    comentario:
      'A torre preta entra em d1 no próximo lance e é mate. Nenhuma peça branca chega a tempo de ' +
      'impedir isso; o que resolve é dar ao rei uma casa de fuga com um lance de peão.',
  },
  contraste: {
    fen: '3r2k1/5ppp/8/4b3/8/8/5PPP/6K1 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'evita-mate', emLances: 1, perdaMaximaTolerada: 0 },
    lanceQueFalha: 'h2h3',
    oQueMudou:
      'Um bispo preto em e5 vigia h2. O peão abre a casa, e a casa já está tomada: depois de h3, ' +
      'Td1 continua sendo mate. A pergunta útil não é "tenho casa de fuga?", e sim "para onde o ' +
      'rei vai DEPOIS do xeque, e quem está olhando para lá?".',
  },
  completion: {
    id: 'resposta-do-adversario-c1',
    fen: '3r2k1/5ppp/8/8/8/1R6/5PPP/6K1 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'evita-mate', emLances: 1, perdaMaximaTolerada: 0 },
    lancesAceitos: ['h2h3', 'g2g3', 'b3b1'],
    alternativas: ['b3d3', 'b3b8', 'b3b7'],
    raciocinioJaFeito: [
      'A vez dele: Td1 é xeque e o rei branco não tem casa — f1 e h1 estão na fileira, f2, g2 e h2 são peões.',
      'Logo o lance das brancas precisa tratar dessa ameaça, e não de outra coisa.',
      'Duas famílias de lance resolvem: dar uma casa ao rei, ou cobrir a primeira fileira.',
    ],
    enunciado: 'Escolha um lance que tire o mate da mesa sem entregar a torre.',
    explicacao:
      'h3 dá ao rei a casa h2 e Tb1 cobre a primeira fileira: depois de qualquer um dos dois, ' +
      'Td1 deixa de ser mate. Td3 também bloqueia a coluna, e a torre preta a captura de graça — ' +
      'bloquear com peça atacada troca o mate por uma torre. Tb8 procura contrajogo na oitava ' +
      'fileira, perde a torre e deixa a ameaça intacta.',
  },
  guiada: [
    {
      id: 'resposta-do-adversario-g1',
      fen: '3r2k1/5ppp/8/8/8/8/5PPP/7K w - - 0 1',
      ladoDoAluno: 'w',
      objetivo: { tipo: 'evita-mate', emLances: 1, perdaMaximaTolerada: 0 },
      lancesAceitos: ['h2h3', 'g2g3'],
      alternativas: ['f2f3', 'f2f4', 'h1g1'],
      enunciado:
        'Brancas jogam. Veja o que as pretas fariam agora e escolha o lance que trata disso.',
      dicas: [
        {
          degrau: 'direcao',
          texto:
            'Antes de procurar o seu melhor lance, pergunte qual seria o lance dele se fosse a vez dele.',
        },
        { degrau: 'area', texto: 'Olhe a primeira fileira e as casas vizinhas ao rei branco.' },
        {
          degrau: 'ideia',
          texto: 'O rei precisa de uma saída, e ela só serve se for uma casa vizinha à dele.',
        },
        { degrau: 'candidato', texto: 'Considere h3.' },
      ],
      explicacao:
        'O rei está em h1, então as únicas casas que adiantam abrir são g2 e h2. f3 abre f2, que ' +
        'fica a duas casas do rei: depois dele, Td1 é mate do mesmo jeito. Rg1 troca a casa do ' +
        'rei sem criar saída nenhuma — o rei continua preso entre os próprios peões e a fileira ' +
        'da torre.',
    },
  ],
  recuperacao: [
    {
      id: 'resposta-do-adversario-r1',
      fen: '6k1/5ppp/8/n7/8/8/5PPP/3R2K1 b - - 0 1',
      ladoDoAluno: 'b',
      objetivo: { tipo: 'evita-mate', emLances: 1, perdaMaximaTolerada: 0 },
      enunciado: 'Pretas jogam. Antes de escolher, veja o que as brancas jogariam agora.',
      lancesAceitos: ['h7h6', 'g7g6'],
      alternativas: ['g8h8', 'a5c4', 'a5b3'],
      explicacao:
        'A torre branca entra em d8 e é mate. Melhorar o cavalo não trata da ameaça, e levar o rei ' +
        'para h8 só troca a casa em que ele leva o mate. O lance que resolve é o mais modesto do ' +
        'tabuleiro: abrir a casa de fuga antes de precisar dela.',
    },
  ],
  resumo: [
    'Antes de jogar, dê a vez a ele dentro da sua cabeça.',
    'Procure os xeques, as capturas e as ameaças DELE, não as suas.',
    'Ameaça de mate vem antes de tudo: material a mais não serve se o mate cai primeiro.',
    'Casa de fuga tem de ser vizinha do rei e tem de continuar livre depois do xeque.',
  ],
})

export const LICOES_PROCESSO: readonly Licao[] = [VARREDURA, GARFO, RESPOSTA_DO_ADVERSARIO]
