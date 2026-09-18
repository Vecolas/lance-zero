/**
 * Conteúdo autorado dos cursos de abertura.
 *
 * A fonte é curta de propósito: cada linha ensina uma decisão e termina antes
 * de virar livro de variantes. O grafo é derivado uma vez no carregamento e
 * validado pelo próprio domínio ao importar este módulo.
 */
import {
  buildOpeningDefinition,
  type OpeningDefinition,
  type OpeningMoveLesson,
} from '@/domain/openings'

const lesson = (
  ply: number,
  san: string,
  comment: string,
  extra: Partial<OpeningMoveLesson> = {},
): OpeningMoveLesson => ({ ply, san, uci: '', comment, ...extra })

const italianaMain = [
  lesson(1, 'e4', 'O peão ocupa o centro e abre linhas para o bispo e a dama.', {
    strategicIdea: 'Controle o centro antes de procurar ataques.',
  }),
  lesson(2, 'e5', 'As pretas disputam o centro de imediato.', {
    strategicIdea: 'A posição fica aberta e as peças ganham importância.',
  }),
  lesson(3, 'Nf3', 'O cavalo se desenvolve atacando e5 e prepara o roque.', {
    highlights: ['e5'],
    arrows: [{ from: 'g1', to: 'f3' }],
    resultingPlan: 'Roque curto e desenvolvimento do bispo.',
  }),
  lesson(4, 'Nc6', 'As pretas defendem e5 desenvolvendo uma peça.', {
    strategicIdea: 'A defesa também ganha tempo e controla d4.',
  }),
  lesson(5, 'Bc4', 'O bispo vai para uma casa ativa e pressiona f7.', {
    highlights: ['f7'],
    arrows: [
      { from: 'f1', to: 'c4' },
      { from: 'c4', to: 'f7' },
    ],
    strategicIdea: 'Desenvolver com iniciativa e preparar o roque.',
    warning: 'Não transforme a pressão em ataque prematuro antes de completar o desenvolvimento.',
    resultingPlan: 'Roque curto e possível ruptura d4.',
    alternatives: [
      {
        san: 'Bb5',
        uci: '',
        label: 'Alternativa saudável',
        explanation:
          'Também desenvolve e cria pressão indireta, mas sai da linha que estamos treinando.',
        acceptable: true,
      },
    ],
  }),
  lesson(6, 'Bc5', 'O bispo preto mira f2 e mantém a posição simétrica.', { highlights: ['f2'] }),
  lesson(7, 'd3', 'O peão sustenta e4 e abre o bispo de c1 sem abandonar o centro.', {
    strategicIdea: 'Conclua o desenvolvimento antes da ruptura d4.',
  }),
  lesson(8, 'Nf6', 'O cavalo ataca e4 e mostra o plano defensivo das pretas.', {
    highlights: ['e4'],
  }),
  lesson(9, 'O-O', 'O rei fica seguro e a torre entra no jogo em um lance.', {
    resultingPlan: 'Te1, Cf1-g3 e d4 quando as peças estiverem prontas.',
  }),
]

/* ------------------------------------------------------------------ Ruy López */

/**
 * A linha principal da Ruy López: 1.e4 e5 2.Cf3 Cc6 3.Bb5 a6 4.Ba4 Cf6 5.O-O Be7.
 *
 * A ESCOLHA DA PRINCIPAL É PEDAGÓGICA. A Morphy com ...a6 é a linha que o aluno
 * de clube encontra em quase toda partida, e ela ensina a pergunta que define a
 * abertura: o bispo recua ou troca? Começar pela Berlim daria uma aula de final
 * antes de uma aula de abertura.
 */
const ruyMain = [
  lesson(1, 'e4', 'O peão ocupa o centro e abre as linhas do bispo e da dama.', {
    strategicIdea: 'Controle o centro antes de procurar alvos.',
  }),
  lesson(2, 'e5', 'As pretas disputam o centro de imediato e abrem as próprias linhas.', {
    strategicIdea: 'Jogo aberto: as peças vão valer mais que a estrutura.',
  }),
  lesson(3, 'Nf3', 'O cavalo ataca e5 e prepara o roque num só lance.', {
    highlights: ['e5'],
    arrows: [{ from: 'g1', to: 'f3' }],
    resultingPlan: 'Desenvolver o bispo e rocar antes de decidir o centro.',
  }),
  lesson(4, 'Nc6', 'As pretas defendem e5 desenvolvendo — defesa que também ganha tempo.', {
    strategicIdea: 'A melhor defesa é a que acrescenta uma peça ao jogo.',
  }),
  lesson(5, 'Bb5', 'O bispo ataca o defensor de e5 em vez do peão. É a ideia da Ruy López.', {
    highlights: ['c6'],
    arrows: [{ from: 'f1', to: 'b5' }],
    strategicIdea: 'Atacar quem defende vale mais que atacar o que está defendido.',
    resultingPlan: 'Roque rápido e pressão permanente sobre e5.',
  }),
  lesson(6, 'a6', 'As pretas perguntam ao bispo: trocar ou recuar? É o lance mais jogado.', {
    strategicIdea: 'Perguntar a uma peça ativa sempre ganha alguma coisa — a troca ou o tempo.',
  }),
  lesson(7, 'Ba4', 'O bispo recua mantendo a diagonal e a pressão sobre c6.', {
    arrows: [{ from: 'b5', to: 'a4' }],
    resultingPlan: 'O-O, Te1 e c3 preparando d4.',
  }),
  lesson(8, 'Nf6', 'As pretas desenvolvem atacando e4 — o tempo é delas agora.', {
    highlights: ['e4'],
  }),
  lesson(9, 'O-O', 'O rei sai do meio e a torre entra. e4 fica indefeso de propósito.', {
    strategicIdea: 'Na Ruy López, e4 pode esperar: quem captura paga em desenvolvimento.',
    resultingPlan: 'Te1 recupera o controle de e4 e prepara c3 e d4.',
  }),
  lesson(10, 'Be7', 'As pretas completam o desenvolvimento e preparam o roque.', {
    resultingPlan: 'O-O e depois ...d6 ou ...b5 conforme as brancas se comprometam.',
  }),
]

/* ------------------------------------------------------------------- Francesa */

/**
 * A linha principal da Francesa: 1.e4 e6 2.d4 d5 3.e5 c5 4.c3 Cc6.
 *
 * A AVANÇADA É A PRINCIPAL PORQUE É O QUE O ALUNO ENCONTRA. Em nível de clube,
 * `3.e5` é a resposta mais comum de longe — e é a que produz a estrutura que dá
 * identidade à defesa: a cadeia de peões e o bispo de c8 preso atrás dela.
 * Começar pela Winawer daria uma aula de teoria antes de uma aula de estrutura.
 */
const francesaMain = [
  lesson(1, 'e4', 'As brancas ocupam o centro e abrem as linhas do bispo e da dama.', {
    strategicIdea: 'Contra 1.e4, a Francesa escolhe solidez em vez de simetria.',
  }),
  lesson(2, 'e6', 'O peão prepara ...d5 sem entregar nada — e tranca o bispo de c8 por enquanto.', {
    strategicIdea: 'Este é o compromisso da Francesa: centro sólido, bispo com problema.',
    resultingPlan: '...d5 no próximo lance, disputando o centro de frente.',
  }),
  lesson(3, 'd4', 'As brancas montam o centro completo.', { highlights: ['d4', 'e4'] }),
  lesson(4, 'd5', 'Agora a disputa: as pretas atacam e4 e obrigam uma decisão.', {
    highlights: ['e4'],
    strategicIdea: 'Avançar, trocar ou defender — a partida inteira sai dessa escolha.',
  }),
  lesson(5, 'e5', 'As brancas avançam e ganham espaço, fechando o centro.', {
    arrows: [{ from: 'e4', to: 'e5' }],
    strategicIdea: 'Cadeia de peões: quem tem espaço manobra, quem tem menos precisa romper.',
    resultingPlan: 'As pretas atacam a BASE da cadeia, e não o topo.',
  }),
  lesson(6, 'c5', 'A ruptura padrão: atacar a base em d4, e não o peão avançado em e5.', {
    arrows: [{ from: 'c7', to: 'c5' }],
    strategicIdea: 'Cadeia se ataca pela base. O topo é o que está mais defendido.',
  }),
  lesson(7, 'c3', 'As brancas sustentam d4 com peão, como a estrutura pede.', {
    resultingPlan: 'Cf3, Be2 e O-O, mantendo o espaço.',
  }),
  lesson(8, 'Nc6', 'Mais um atacante sobre d4 — a pressão se soma, ela não vem de um lance só.', {
    highlights: ['d4'],
    resultingPlan: '...Qb6 e ...Nh6-f5 aumentando a pressão sobre a base.',
  }),
]

/* ------------------------------------------------------------------ Siciliana */

/**
 * A linha principal da Siciliana Foundation: 1.e4 c5 2.Cf3 d6 3.d4 cxd4 4.Cxd4 Cf6.
 *
 * ESTE CURSO É UM MAPA, E NÃO UMA ENCICLOPÉDIA (plano de expansão §4 e §16). A
 * Siciliana tem mais teoria que qualquer outra abertura, e o erro óbvio seria
 * tentar cobrir Najdorf, Dragão, Scheveningen, Sveshnikov, Taimanov e Kan num
 * curso só. O Foundation ensina o TERRITÓRIO: como a Aberta funciona, e o que
 * muda quando as brancas recusam entrar nela.
 *
 * A PRINCIPAL É A ABERTA porque é a partir dela que todos os cursos filhos
 * nascem. Quem entende a troca em d4 e o cavalo em d4 entende a família inteira.
 */
const sicilianaMain = [
  lesson(1, 'e4', 'As brancas ocupam o centro.', {
    strategicIdea: 'Contra 1.e4, a Siciliana recusa a simetria desde o primeiro lance.',
  }),
  lesson(2, 'c5', 'As pretas disputam d4 sem abrir a própria posição — a marca da defesa.', {
    highlights: ['d4'],
    strategicIdea: 'Assimetria desde o começo: as duas partes jogam em alas diferentes.',
    resultingPlan: 'Trocar o peão de c pelo peão de d das brancas e ficar com maioria central.',
  }),
  lesson(3, 'Nf3', 'O cavalo prepara d4 e desenvolve.', {
    arrows: [{ from: 'g1', to: 'f3' }],
  }),
  lesson(4, 'd6', 'O peão sustenta e5 no futuro e abre a diagonal do bispo de c8.', {
    strategicIdea:
      'Lance flexível: ele mantém abertas as portas da Najdorf, do Dragão e da Scheveningen.',
  }),
  lesson(5, 'd4', 'As brancas abrem o centro — é isto que define a Siciliana Aberta.', {
    arrows: [{ from: 'd2', to: 'd4' }],
    strategicIdea: 'Trocar o peão de d pelo peão de c é o negócio que a defesa inteira propõe.',
  }),
  lesson(6, 'cxd4', 'As pretas aceitam: elas trocam um peão de flanco por um peão CENTRAL.', {
    strategicIdea: 'É esse o lucro estrutural da Siciliana, e ele dura até o final.',
    resultingPlan: 'Maioria de peões no centro e coluna c aberta para as torres.',
  }),
  lesson(7, 'Nxd4', 'O cavalo ocupa o centro e a posição fica aberta e desequilibrada.', {
    highlights: ['d4'],
    resultingPlan: 'Cc3 e o desenvolvimento, com as duas partes jogando em alas opostas.',
  }),
  lesson(8, 'Nf6', 'O cavalo ataca e4 e obriga as brancas a defendê-lo com Cc3.', {
    highlights: ['e4'],
    resultingPlan: 'Depois de Cc3, a escolha do quinto lance preto abre a família inteira.',
  }),
]

/* ----------------------------------------------- Gambito da Dama Aceito */

/** 1.d4 d5 2.c4 dxc4 3.Cf3 Cf6 4.e3 e6 — desenvolvimento antes de segurar o peão. */
const qgaMain = [
  lesson(1, 'd4', 'As brancas ocupam o centro com o peão da dama.', {
    strategicIdea: 'Aberturas de 1.d4 são mais lentas e mais estruturais que as de 1.e4.',
  }),
  lesson(2, 'd5', 'As pretas disputam o centro de frente, sem conceder espaço.', {
    highlights: ['d5'],
  }),
  lesson(3, 'c4', 'O gambito: o peão de c ataca d5 e oferece material por centro.', {
    arrows: [{ from: 'c2', to: 'c4' }],
    strategicIdea: 'Não é gambito de verdade — o peão volta. O que se compra é tempo e centro.',
  }),
  lesson(4, 'dxc4', 'As pretas aceitam e cedem o centro por enquanto, ganhando um tempo livre.', {
    strategicIdea: 'Aceitar não é ganância: é abrir a diagonal e escolher onde desenvolver.',
    resultingPlan: '...e6 e ...c5 atacando o centro que as brancas vão montar.',
  }),
  lesson(5, 'Nf3', 'O cavalo impede ...e5 e desenvolve antes de recuperar o peão.', {
    highlights: ['e5'],
    resultingPlan: 'e3 e Bxc4, com o peão de volta e o desenvolvimento pronto.',
  }),
  lesson(6, 'Nf6', 'As pretas desenvolvem e vigiam d5, sem tentar segurar o peão a mais.', {
    strategicIdea: 'Quem tenta segurar o peão de c4 com ...b5 paga com a estrutura.',
  }),
  lesson(7, 'e3', 'O peão abre a diagonal do bispo de f1, que vai recuperar o material.', {
    resultingPlan: 'Bxc4, O-O e a ruptura e4 quando as peças estiverem prontas.',
  }),
  lesson(8, 'e6', 'As pretas abrem a saída do bispo de f8 e preparam a ruptura ...c5.', {
    resultingPlan: '...c5 atacando a base do centro branco, e ...Cc6 somando pressão.',
  }),
]

/* ------------------------------------------------------- Índia do Rei */

/** 1.d4 Cf6 2.c4 g6 3.Cc3 Bg7 4.e4 d6 5.Cf3 O-O — a Clássica. */
const kidMain = [
  lesson(1, 'd4', 'As brancas ocupam o centro com o peão da dama.', {
    strategicIdea: 'Contra 1.d4, a Índia do Rei recusa disputar o centro de imediato.',
  }),
  lesson(2, 'Nf6', 'O cavalo vigia e4 e mantém todas as defesas indianas em aberto.', {
    highlights: ['e4'],
    strategicIdea: 'Controlar o centro à distância é a ideia que dá nome às defesas indianas.',
  }),
  lesson(3, 'c4', 'O segundo peão central entra e as brancas ficam com espaço.', {
    arrows: [{ from: 'c2', to: 'c4' }],
  }),
  lesson(
    4,
    'g6',
    'As pretas preparam o fianchetto: o bispo vai atacar o centro pela diagonal longa.',
    {
      strategicIdea: 'Ceder o centro agora para atacá-lo depois, com peças e não com peões.',
      resultingPlan: '...Bg7, ...O-O e a ruptura ...e5 quando as peças estiverem prontas.',
    },
  ),
  lesson(5, 'Nc3', 'O cavalo defende e4 e completa o domínio central das brancas.', {
    resultingPlan: 'e4 no próximo lance, com o centro inteiro ocupado.',
  }),
  lesson(6, 'Bg7', 'O bispo ocupa a diagonal longa e mira d4 por trás dos próprios peões.', {
    arrows: [{ from: 'f8', to: 'g7' }],
    strategicIdea: 'Esta peça é a alma da defesa: ela pressiona o centro sem tocá-lo.',
  }),
  lesson(7, 'e4', 'As brancas montam o centro completo — é este o momento que define a abertura.', {
    highlights: ['d4', 'e4'],
    resultingPlan: 'Cf3 e Be2, com espaço para manobrar.',
  }),
  lesson(8, 'd6', 'O peão sustenta a futura ruptura ...e5 e abre a diagonal do bispo de c8.', {
    resultingPlan: '...O-O e depois ...e5, atacando o centro que as brancas construíram.',
  }),
  lesson(
    9,
    'Nf3',
    'O cavalo completa o desenvolvimento sem se comprometer com um plano de ataque.',
    {
      resultingPlan: 'Be2 e O-O, com espaço e sem riscos.',
    },
  ),
  lesson(
    10,
    'O-O',
    'As pretas rocam e ficam prontas para a ruptura que a defesa inteira prepara.',
    {
      resultingPlan: '...e5 no próximo lance, com a torre já apontando para a coluna e.',
    },
  ),
]

/* --------------------------------------------------------- Nimzo-Índia */

/** 1.d4 Cf6 2.c4 e6 3.Cc3 Bb4 4.e3 O-O — a Rubinstein. */
const nimzoMain = [
  lesson(1, 'd4', 'As brancas ocupam o centro com o peão da dama.', {
    strategicIdea: 'A Nimzo responde a 1.d4 sem disputar o centro com peões.',
  }),
  lesson(2, 'Nf6', 'O cavalo vigia e4 e mantém as defesas indianas em aberto.', {
    highlights: ['e4'],
  }),
  lesson(3, 'c4', 'O segundo peão central entra e as brancas ganham espaço.', {
    arrows: [{ from: 'c2', to: 'c4' }],
  }),
  lesson(4, 'e6', 'O peão abre a diagonal do bispo de f8 e prepara a cravada.', {
    strategicIdea: 'Lance modesto com ideia concreta: o bispo vai para b4.',
    resultingPlan: '...Bb4 cravando o cavalo que defende e4.',
  }),
  lesson(5, 'Nc3', 'O cavalo defende e4 e prepara o centro completo.', {
    highlights: ['e4'],
  }),
  lesson(
    6,
    'Bb4',
    'A cravada que dá nome à defesa: o cavalo que controla e4 fica preso à própria dama.',
    {
      arrows: [{ from: 'f8', to: 'b4' }],
      strategicIdea: 'Controlar e4 pela peça que o defende, e não ocupando a casa.',
      resultingPlan: 'Trocar em c3 no momento certo e jogar contra os peões dobrados.',
    },
  ),
  lesson(7, 'e3', 'As brancas desenvolvem sem se comprometer — é a resposta mais sólida.', {
    resultingPlan: 'Bd3, Cf3 e O-O, com o centro preparado para e4.',
  }),
  lesson(8, 'O-O', 'As pretas rocam antes de decidir o que fazer com o bispo de b4.', {
    resultingPlan: '...d5 ou ...c5 conforme as brancas escolherem a estrutura.',
  }),
]

/* ------------------------------------------------------------- Catalã */

/** 1.d4 Cf6 2.c4 e6 3.g3 d5 4.Bg2 Be7 — a Catalã Fechada. */
const catalaMain = [
  lesson(1, 'd4', 'As brancas ocupam o centro com o peão da dama.', {
    strategicIdea: 'A Catalã junta o centro de 1.d4 com o fianchetto da Inglesa.',
  }),
  lesson(2, 'Nf6', 'As pretas vigiam e4 e mantêm as defesas indianas em aberto.', {
    highlights: ['e4'],
  }),
  lesson(3, 'c4', 'O segundo peão central entra e a pressão sobre d5 começa.', {
    arrows: [{ from: 'c2', to: 'c4' }],
  }),
  lesson(4, 'e6', 'As pretas abrem a diagonal do bispo de f8 e preparam ...d5.', {
    resultingPlan: '...d5 disputando o centro de frente.',
  }),
  lesson(5, 'g3', 'O lance que define a abertura: o bispo vai para a diagonal longa.', {
    arrows: [{ from: 'g2', to: 'g3' }],
    strategicIdea: 'A diagonal a8-h1 é o ativo permanente da Catalã.',
    resultingPlan: 'Bg2 pressionando d5 e a torre de a8 de muito longe.',
  }),
  lesson(6, 'd5', 'As pretas ocupam o centro e bloqueiam a diagonal — por enquanto.', {
    highlights: ['d5'],
  }),
  lesson(7, 'Bg2', 'O bispo ocupa a diagonal e passa a mirar d5 e a8 ao mesmo tempo.', {
    resultingPlan: 'Cf3 e O-O, com pressão de longo prazo sobre a ala da dama preta.',
  }),
  lesson(8, 'Be7', 'As pretas desenvolvem e preparam o roque, sustentando d5.', {
    resultingPlan: '...O-O e depois ...c6 ou ...dxc4, conforme a pressão apertar.',
  }),
]

/* ------------------------------------------------------------ Inglesa */

/** 1.c4 e5 2.Cc3 Cf6 3.Cf3 Cc6 — a Siciliana invertida. */
const inglesaMain = [
  lesson(1, 'c4', 'As brancas abrem no flanco e recusam ocupar o centro de imediato.', {
    arrows: [{ from: 'c2', to: 'c4' }],
    strategicIdea: 'Controlar d5 de longe, e decidir a estrutura depois do adversário.',
    resultingPlan: 'Cc3, g3 e Bg2, com o centro ainda em aberto.',
  }),
  lesson(2, 'e5', 'As pretas ocupam o centro — é a Siciliana com as cores trocadas.', {
    highlights: ['e5'],
    strategicIdea: 'Quem ocupa o centro primeiro assume o compromisso primeiro.',
  }),
  lesson(3, 'Nc3', 'O cavalo disputa d5, a casa que a abertura inteira quer.', {
    highlights: ['d5'],
  }),
  lesson(4, 'Nf6', 'As pretas desenvolvem e também disputam d5.', {
    resultingPlan: '...Bb4 ou ...d5 conforme as brancas se comprometam.',
  }),
  lesson(5, 'Nf3', 'O segundo cavalo ataca e5 e mantém o centro branco flexível.', {
    highlights: ['e5'],
    resultingPlan: 'g3 e Bg2, completando o sistema sem tocar nos peões centrais.',
  }),
  lesson(6, 'Nc6', 'As pretas defendem e5 desenvolvendo, e a posição fica quase simétrica.', {
    resultingPlan: '...d5 no momento certo, aproveitando o tempo de vantagem.',
  }),
]

/* ------------------------------------------------------- Escandinava */

/** 1.e4 d5 2.exd5 Dxd5 3.Cc3 Da5 — a linha clássica. */
const escandinavaMain = [
  lesson(1, 'e4', 'As brancas ocupam o centro.', {
    strategicIdea:
      'A Escandinava responde no primeiro lance: ela não espera para disputar o centro.',
  }),
  lesson(2, 'd5', 'As pretas atacam e4 imediatamente, antes de qualquer desenvolvimento.', {
    highlights: ['e4'],
    strategicIdea: 'Simplificar cedo: uma defesa sem variações longas para decorar.',
    resultingPlan: 'Recuperar o peão com a dama e desenvolver com tempo.',
  }),
  lesson(3, 'exd5', 'As brancas capturam — recusar deixaria as pretas com centro de graça.', {
    resultingPlan: 'Cc3 depois, ganhando tempo sobre a dama preta.',
  }),
  lesson(4, 'Qxd5', 'A dama recupera o peão, sabendo que vai ser atacada.', {
    strategicIdea: 'O tempo que se perde aqui é o preço de uma estrutura sem fraquezas.',
  }),
  lesson(5, 'Nc3', 'O cavalo desenvolve atacando a dama — as brancas ganham o tempo previsto.', {
    arrows: [{ from: 'b1', to: 'c3' }],
  }),
  lesson(6, 'Qa5', 'A dama recua para uma casa segura, ainda ativa na diagonal.', {
    strategicIdea: 'Recuar para uma casa que faz alguma coisa é diferente de recuar por recuar.',
    resultingPlan: '...Cf6, ...c6 e ...Bf5, com uma estrutura parecida com a Caro-Kann.',
  }),
]

/* -------------------------------------------------------------- Pirc */

/** 1.e4 d6 2.d4 Cf6 3.Cc3 g6 4.Cf3 Bg7 — a Clássica. */
const pircMain = [
  lesson(1, 'e4', 'As brancas ocupam o centro.', {
    strategicIdea: 'A Pirc cede o centro de propósito, como as defesas indianas fazem contra 1.d4.',
  }),
  lesson(2, 'd6', 'O peão prepara ...Cf6 sem entregar e5, e abre a diagonal do bispo de c8.', {
    strategicIdea: 'Lance modesto que mantém Pirc, Moderna e até Siciliana em aberto.',
    resultingPlan: '...Cf6 atacando e4, e depois o fianchetto.',
  }),
  lesson(3, 'd4', 'As brancas montam o centro completo, que é justamente o convite.', {
    highlights: ['d4', 'e4'],
  }),
  lesson(4, 'Nf6', 'O cavalo ataca e4 e obriga as brancas a defender.', {
    highlights: ['e4'],
  }),
  lesson(5, 'Nc3', 'O cavalo defende e4 e completa o domínio central.', {
    resultingPlan: 'Cf3 ou f4, conforme o grau de ambição.',
  }),
  lesson(6, 'g6', 'As pretas preparam o fianchetto: o bispo vai pressionar d4 de longe.', {
    strategicIdea: 'A peça que ataca o centro não precisa estar no centro.',
    resultingPlan: '...Bg7, ...O-O e a ruptura ...c5 ou ...e5.',
  }),
  lesson(7, 'Nf3', 'As brancas desenvolvem sem se comprometer com um ataque de peões.', {
    resultingPlan: 'Be2 e O-O, com espaço e uma partida tranquila.',
  }),
  lesson(8, 'Bg7', 'O bispo ocupa a diagonal longa e a defesa está montada.', {
    arrows: [{ from: 'f8', to: 'g7' }],
    resultingPlan: '...O-O e depois ...c5 ou ...e5, atacando o centro que as brancas construíram.',
  }),
]

/* ---------------------------------------------------------- Grünfeld */

/** 1.d4 Cf6 2.c4 g6 3.Cc3 d5 4.cxd5 Cxd5 — a Troca. */
const grunfeldMain = [
  lesson(1, 'd4', 'As brancas ocupam o centro com o peão da dama.', {
    strategicIdea: 'A Grünfeld convida o centro branco a crescer para depois atacá-lo.',
  }),
  lesson(2, 'Nf6', 'O cavalo vigia e4 e mantém as defesas indianas em aberto.', {
    highlights: ['e4'],
  }),
  lesson(3, 'c4', 'O segundo peão central entra.', { arrows: [{ from: 'c2', to: 'c4' }] }),
  lesson(4, 'g6', 'As pretas preparam o fianchetto, como na Índia do Rei.', {
    resultingPlan: '...d5 no próximo lance — e é aqui que as duas defesas se separam.',
  }),
  lesson(5, 'Nc3', 'O cavalo defende o centro e prepara e4.', { highlights: ['d5'] }),
  lesson(
    6,
    'd5',
    'O lance que separa a Grünfeld da Índia do Rei: as pretas disputam o centro de frente.',
    {
      highlights: ['d5'],
      strategicIdea: 'Convidar a troca para que o centro branco fique grande e indefeso.',
      resultingPlan: 'Depois de cxd5 Cxd5, o cavalo ataca c3 e o bispo de g7 ataca d4.',
    },
  ),
  lesson(7, 'cxd5', 'As brancas capturam e aceitam montar o centro grande.', {
    resultingPlan: 'e4 em seguida, com dois peões centrais e espaço.',
  }),
  lesson(
    8,
    'Nxd5',
    'O cavalo recaptura e já ataca c3 — a pressão começa antes do desenvolvimento.',
    {
      highlights: ['c3'],
      resultingPlan: '...Bg7 e ...c5, atacando a base do centro que as brancas acabaram de montar.',
    },
  ),
]

/* --------------------------------------------------------- Holandesa */

/** 1.d4 f5 2.g3 Cf6 3.Bg2 g6 — a Leningrado. */
const holandesaMain = [
  lesson(1, 'd4', 'As brancas ocupam o centro com o peão da dama.', {
    strategicIdea: 'A Holandesa responde no flanco do rei, e não no centro.',
  }),
  lesson(2, 'f5', 'O peão disputa e4 e declara o plano: as pretas vão jogar na ala do rei.', {
    highlights: ['e4'],
    strategicIdea: 'Espaço na ala do rei em troca de uma casa e8-h5 mais frágil.',
    resultingPlan: '...Cf6, ...g6 e ...Bg7, com a torre pela coluna f.',
  }),
  lesson(3, 'g3', 'As brancas fianchetam para disputar a diagonal longa e o centro de longe.', {
    resultingPlan: 'Bg2, Cf3 e O-O, sem tocar no centro por enquanto.',
  }),
  lesson(4, 'Nf6', 'O cavalo vigia e4 e completa o controle da casa que o peão de f já disputa.', {
    highlights: ['e4'],
  }),
  lesson(5, 'Bg2', 'O bispo ocupa a diagonal e pressiona o centro e a ala da dama preta.', {
    resultingPlan: 'Cf3 e O-O, com uma posição sólida e flexível.',
  }),
  lesson(6, 'g6', 'As pretas também fiancham: é a Leningrado, a linha mais ativa da Holandesa.', {
    strategicIdea: 'O bispo em g7 compensa a casa enfraquecida por ...f5.',
    resultingPlan: '...Bg7, ...O-O e ...d6, com ...e5 como ruptura marcada.',
  }),
]

/* -------------------------------------------------------- Semi-Eslava */

/** 1.d4 d5 2.c4 c6 3.Cf3 Cf6 4.Cc3 e6 — a Semi-Eslava. */
const semiEslavaMain = [
  lesson(1, 'd4', 'As brancas ocupam o centro com o peão da dama.', {
    strategicIdea: 'A Semi-Eslava defende d5 duas vezes antes de decidir qualquer outra coisa.',
  }),
  lesson(2, 'd5', 'As pretas disputam o centro de frente.', { highlights: ['d5'] }),
  lesson(3, 'c4', 'O Gambito da Dama: as brancas atacam d5 pelo flanco.', {
    arrows: [{ from: 'c2', to: 'c4' }],
  }),
  lesson(4, 'c6', 'O primeiro defensor de d5 — e ele não tranca nenhum bispo.', {
    highlights: ['d5'],
    strategicIdea: 'Sustentar o centro com o peão que menos atrapalha as peças.',
  }),
  lesson(5, 'Nf3', 'O cavalo desenvolve e vigia e5 e d4.', {
    resultingPlan: 'Cc3 e e3, com desenvolvimento sólido.',
  }),
  lesson(6, 'Nf6', 'O cavalo preto responde e soma um segundo defensor a d5.', {
    highlights: ['d5'],
  }),
  lesson(7, 'Nc3', 'O terceiro atacante de d5 entra.', { highlights: ['d5'] }),
  lesson(
    8,
    'e6',
    'O segundo defensor de peão: é aqui que a Eslava vira Semi-Eslava, e o bispo de c8 fica trancado de propósito.',
    {
      strategicIdea:
        'Centro inatacável em troca de um bispo que precisará de ...dxc4 e ...b5 para respirar.',
      resultingPlan: '...dxc4 e ...b5, ganhando espaço na ala da dama e libertando o bispo.',
    },
  ),
]

/* ----------------------------------------------------- Índia da Dama */

/** 1.d4 Cf6 2.c4 e6 3.Cf3 b6 — a Índia da Dama. */
const indiaDaDamaMain = [
  lesson(1, 'd4', 'As brancas ocupam o centro com o peão da dama.', {
    strategicIdea: 'A Índia da Dama disputa e4 com peças, e não com peões.',
  }),
  lesson(2, 'Nf6', 'O cavalo vigia e4 antes de qualquer peão preto se mexer.', {
    highlights: ['e4'],
  }),
  lesson(3, 'c4', 'O segundo peão central entra e as brancas ganham espaço.', {
    arrows: [{ from: 'c2', to: 'c4' }],
  }),
  lesson(4, 'e6', 'As pretas abrem a diagonal do bispo de f8 e mantêm as opções.', {
    resultingPlan: '...Bb4 seria a Nimzo-Índia; ...b6 é a Índia da Dama.',
  }),
  lesson(5, 'Nf3', 'As brancas evitam a Nimzo-Índia: sem o cavalo em c3, não há o que cravar.', {
    strategicIdea: 'A ordem dos lances é teoria: 3.Cf3 fecha uma defesa inteira.',
  }),
  lesson(6, 'b6', 'O segundo fianchetto: o bispo vai a b7 disputar e4 pela diagonal mais longa.', {
    arrows: [{ from: 'c8', to: 'b7' }],
    strategicIdea: 'Três atacantes sobre e4 — cavalo, bispo e, se preciso, ...d5.',
    resultingPlan: '...Bb7, ...Be7 e ...O-O, com a casa e4 negada às brancas.',
  }),
]

/* ---------------------------------------------------------- Moderna */

/** 1.e4 g6 2.d4 Bg7 3.Cc3 d6 — a Defesa Moderna. */
const modernaMain = [
  lesson(1, 'e4', 'As brancas ocupam o centro com o peão do rei.', {
    strategicIdea: 'A Moderna deixa o centro crescer e não coloca nenhuma peça na frente dele.',
  }),
  lesson(
    2,
    'g6',
    'As pretas preparam o fianchetto antes de qualquer cavalo — é o que separa a Moderna da Pirc.',
    {
      arrows: [{ from: 'f8', to: 'g7' }],
      strategicIdea: 'Sem ...Cf6, as brancas não têm alvo para ganhar tempo com e5.',
      resultingPlan: '...Bg7, ...d6 e uma ruptura escolhida bem mais tarde.',
    },
  ),
  lesson(3, 'd4', 'O segundo peão central entra e as brancas ficam com o centro inteiro.', {
    arrows: [{ from: 'd2', to: 'd4' }],
  }),
  lesson(4, 'Bg7', 'O bispo ocupa a diagonal longa e já pressiona d4 de longe.', {
    arrows: [{ from: 'g7', to: 'd4' }],
    strategicIdea: 'A peça mais importante da defesa entra antes de qualquer outra.',
  }),
  lesson(5, 'Nc3', 'O cavalo defende e4 e prepara o desenvolvimento branco.', {
    highlights: ['e4'],
  }),
  lesson(
    6,
    'd6',
    'O peão nega e5 às brancas e abre a casa d7 para o cavalo — a estrutura da Moderna está pronta.',
    {
      highlights: ['e5'],
      strategicIdea: 'Menos espaço, zero alvos: as brancas precisam se comprometer primeiro.',
      resultingPlan: '...a6 e ...b5 na ala da dama, ou ...c6 e ...d5 no centro.',
    },
  ),
]

/* ------------------------------------------------------------- Réti */

/** 1.Cf3 d5 2.c4 e6 3.g3 Cf6 — a Abertura Réti. */
const retiMain = [
  lesson(1, 'Nf3', 'O cavalo desenvolve e vigia e5 e d4 sem comprometer um único peão central.', {
    highlights: ['d4', 'e5'],
    strategicIdea: 'Ver o que as pretas fazem antes de decidir qual centro montar.',
    resultingPlan: 'c4 e g3, atacando o centro preto de longe.',
  }),
  lesson(2, 'd5', 'As pretas ocupam o centro — é a resposta mais direta e a mais comum.', {
    highlights: ['d5'],
  }),
  lesson(3, 'c4', 'O lance que dá nome à abertura: o peão ataca d5 do flanco.', {
    arrows: [{ from: 'c2', to: 'c4' }],
    strategicIdea: 'Atacar o centro sem ocupá-lo, e deixar o adversário defender.',
  }),
  lesson(4, 'e6', 'As pretas sustentam d5 e abrem o bispo de f8.', { highlights: ['d5'] }),
  lesson(5, 'g3', 'O fianchetto entra: o bispo de g2 vai pressionar d5 pela diagonal longa.', {
    arrows: [{ from: 'f1', to: 'g2' }],
    resultingPlan: 'Bg2 e O-O, com pressão sobre o centro preto de dois lados.',
  }),
  lesson(6, 'Nf6', 'As pretas desenvolvem e defendem d5 com a terceira peça.', {
    highlights: ['d5'],
    strategicIdea: 'Um centro ocupado precisa de defensores tanto quanto de peões.',
  }),
]

/* ------------------------------------------------------------ Viena */

/** 1.e4 e5 2.Cc3 Cf6 3.f4 d5 — o Gambito de Viena. */
const vienaMain = [
  lesson(1, 'e4', 'As brancas ocupam o centro com o peão do rei.', {
    strategicIdea: 'A Viena guarda o lance f4 para quando ele valer mais.',
  }),
  lesson(2, 'e5', 'As pretas respondem simetricamente e disputam o centro.', {
    highlights: ['e5'],
  }),
  lesson(
    3,
    'Nc3',
    'O cavalo defende e4 sem atacar nada — e é justamente isso que guarda o lance f4.',
    {
      highlights: ['e4'],
      strategicIdea: 'Cf3 atacaria e5 e convidaria a defesa; Cc3 deixa f4 disponível.',
      resultingPlan: 'f4 no lance seguinte, com o Gambito de Viena.',
    },
  ),
  lesson(4, 'Nf6', 'As pretas desenvolvem e disputam e4 de volta.', { highlights: ['e4'] }),
  lesson(5, 'f4', 'O gambito: as brancas atacam e5 com o peão que ainda não tinha se mexido.', {
    arrows: [{ from: 'f2', to: 'f4' }],
    strategicIdea: 'Com o cavalo em c3 e não em f3, o peão de f tem a casa livre.',
    resultingPlan: 'fxe5 e d4, com centro e coluna f abertos.',
  }),
  lesson(
    6,
    'd5',
    'A melhor resposta: as pretas contra-atacam no centro em vez de capturar em f4.',
    {
      highlights: ['e4'],
      strategicIdea: 'Contra um gambito de flanco, a resposta é uma ruptura central.',
      resultingPlan: 'Depois de fxe5 Cxe4, a posição abre para os dois lados.',
    },
  ),
]

/* --------------------------------------------------- Gambito do Rei */

/** 1.e4 e5 2.f4 exf4 3.Cf3 g5 — o Gambito do Rei aceito. */
const gambitoDoReiMain = [
  lesson(1, 'e4', 'As brancas ocupam o centro com o peão do rei.', {
    strategicIdea: 'O Gambito do Rei entrega um peão já no segundo lance por centro e linhas.',
  }),
  lesson(2, 'e5', 'As pretas respondem simetricamente.', { highlights: ['e5'] }),
  lesson(
    3,
    'f4',
    'O gambito: um peão pelo centro, pela coluna f e pelo tempo de desenvolvimento.',
    {
      arrows: [{ from: 'f2', to: 'f4' }],
      strategicIdea: 'Trocar o peão de flanco pelo peão central muda quem manda no meio.',
      resultingPlan: 'Cf3, Bc4 e O-O, com a torre em f1 e o centro pronto para d4.',
    },
  ),
  lesson(4, 'exf4', 'Aceitar é o mais testado: recusar deixaria as brancas com tudo.', {
    highlights: ['f4'],
  }),
  lesson(
    5,
    'Nf3',
    'O cavalo desenvolve e impede o xeque em h4 — sem ele, a abertura desaba num lance.',
    {
      highlights: ['h4'],
      strategicIdea: 'A primeira obrigação de quem abriu a diagonal do próprio rei é fechá-la.',
      resultingPlan: 'Bc4, d4 e O-O, recuperando o peão de f4 quando for conveniente.',
    },
  ),
  lesson(6, 'g5', 'As pretas sustentam o peão extra — e enfraquecem o próprio rei ao fazê-lo.', {
    strategicIdea: 'Segurar material com peões na frente do rei é a aposta que define a linha.',
    resultingPlan: 'h4 em seguida, quebrando a corrente antes que ela vire fortaleza.',
  }),
]

function course(
  definition: Omit<
    OpeningDefinition,
    'graph' | 'rootNodeId' | 'previewFen' | 'rootFen' | 'mainLineId' | 'variationIds' | 'planIds'
  >,
): OpeningDefinition {
  return buildOpeningDefinition(definition)
}

const italian = course({
  id: 'italiana',
  slug: 'italiana',
  name: 'Abertura Italiana',
  side: 'white',
  ecoCodes: ['C50'],
  description:
    'Uma abertura aberta para aprender desenvolvimento, roque, pressão em f7 e ruptura no centro.',
  philosophy: 'Desenvolver com propósito, proteger o rei e só então abrir o centro.',
  difficulty: 1,
  prerequisites: [],
  tags: ['open', 'simple', 'positional'],
  transitionToMiddlegame:
    'A partir daqui, a ordem dos lances varia. Reconheça desenvolvimento completo, rei seguro e a ruptura d4 como os sinais para começar a jogar a posição.',
  mainline: italianaMain,
  variations: [
    {
      id: 'italiana-dois-cavalos',
      importancia: 'core',
      eco: 'C55',
      conceitos: ['concept.break-d4', 'concept.space-vs-counterplay'],
      estrutura: 'structure.open-center',
      motivos: ['motif.f7-pressure'],
      erroComum: {
        lance: 'Ng5',
        porque:
          'Atacar f7 de imediato parece ganhar material e entrega a iniciativa: depois de ...d5 as pretas devolvem o peão e ficam com o centro e o desenvolvimento. O cavalo em g5 sai duas vezes para não conseguir nada.',
      },
      fronteira: { type: 'handoff', planId: 'italiana-d4' },
      politicaDoLadoInverso:
        'Pelo lado das pretas, o que se demonstra é o tempo ganho no ataque a e4 — e a disciplina de não transformá-lo em ataque prematuro.',
      intencaoDoAdversario:
        'Atacar e4 antes de desenvolver o bispo, para que você tenha de defender em vez de continuar o plano.',
      objetivoDoAluno:
        'Sustentar e4 com um peão e seguir desenvolvendo: o ataque some e nenhum tempo foi gasto.',
      name: 'Defesa dos Dois Cavalos',
      description: 'Em vez de espelhar o seu bispo, as pretas atacam e4 na hora.',
      rootNodeId: '',
      line: [
        ...italianaMain.slice(0, 5),
        lesson(6, 'Nf6', 'As pretas recusam a simetria e atacam e4 antes de desenvolver o bispo.', {
          highlights: ['e4'],
          strategicIdea:
            'Elas ganham tempo atacando, e é por isso que este é o lance mais comum aqui.',
        }),
        lesson(
          7,
          'd3',
          'Sustente e4 com o peão. O ataque some, você não perdeu nenhum tempo e o plano continua o mesmo.',
          {
            resultingPlan: 'O-O, Te1 e a ruptura d4 quando as peças estiverem prontas.',
          },
        ),
      ],
    },
    {
      id: 'italiana-hungara',
      importancia: 'secondary',
      intencaoDoAdversario:
        'Evitar qualquer choque tático e jogar uma posição sem alvos, aceitando ceder espaço.',
      objetivoDoAluno:
        'Ocupar o espaço cedido e completar o desenvolvimento antes de procurar ruptura.',
      name: 'Defesa Húngara',
      description: 'As pretas recusam o confronto e põem o bispo numa casa modesta.',
      rootNodeId: '',
      line: [
        ...italianaMain.slice(0, 5),
        lesson(
          6,
          'Be7',
          'O bispo vai para uma casa passiva e evita qualquer choque tático imediato.',
          {
            strategicIdea:
              'Quem recusa o centro costuma ceder espaço: não force nada, ocupe o que foi cedido.',
          },
        ),
        lesson(
          7,
          'd3',
          'Contra uma defesa passiva, desenvolvimento vale mais que ataque. Siga o plano de sempre.',
          {
            resultingPlan: 'O-O, Cbd2 e d4 no momento em que o centro estiver sustentado.',
          },
        ),
      ],
    },
    {
      /*
        O GIUOCO PIANO DE VERDADE DIVERGE COM c3, e este comentário existe
        porque eu autorei errado da primeira vez.

        A linha principal deste curso é `...Bc5 4.d3` — e `4.d3` É o Giuoco
        PIANISSIMO. O ramo que escrevi como "Pianissimo" era idêntico à
        principal: um nome novo para a mesma linha, que é a definição de ramo
        que não ensina nada. O portão de legalidade pegou, porque um ramo sem
        divergência não tem posição de desvio onde medir.

        O Piano clássico é `4.c3`, preparando `d4` de imediato. Isso sim é uma
        decisão: centro rápido contra manobra lenta.
      */
      id: 'italiana-giuoco-piano-c3',
      importancia: 'core',
      eco: 'C53',
      conceitos: ['concept.break-d4', 'concept.material-vs-initiative', 'concept.open-file'],
      estrutura: 'structure.open-center',
      motivos: ['motif.pin-on-d-file'],
      erroComum: {
        lance: 'd4',
        porque:
          'Romper antes de c3 entrega o centro: depois de ...exd4 o peão não pode ser recapturado com peão, e as brancas ficam com um lance de desenvolvimento a menos e nada em troca. O c3 existe justamente para que d4 venha com apoio.',
      },
      fronteira: { type: 'handoff', planId: 'italiana-d4' },
      politicaDoLadoInverso:
        'Pelas pretas, demonstra-se pressionar o centro antes que ele se complete: ...Nf6 e ...d5 no momento certo desfazem a preparação.',
      intencaoDoAdversario:
        'Deixar você montar o centro para depois atacá-lo com ...Nf6 e ...d5, quando o peão de d4 já não puder recuar.',
      objetivoDoAluno:
        'Preparar d4 com c3 e só então romper: o centro que vem com apoio é o que dá as linhas abertas para as peças já desenvolvidas.',
      name: 'Giuoco Piano com c3',
      description: 'As brancas preparam d4 de imediato em vez de manobrar atrás de d3.',
      rootNodeId: '',
      line: [
        ...italianaMain.slice(0, 6),
        lesson(7, 'c3', 'O peão prepara d4 — o centro vem com apoio, e não de improviso.', {
          arrows: [{ from: 'c2', to: 'c3' }],
          strategicIdea: 'Romper o centro sem preparo é entregá-lo.',
        }),
        lesson(8, 'Nf6', 'As pretas atacam e4 antes que o centro branco se complete.', {
          highlights: ['e4'],
        }),
        lesson(9, 'd4', 'Agora sim: a ruptura vem com c3 sustentando a recaptura.', {
          resultingPlan: 'Abrir linhas enquanto o rei preto ainda decide onde ficar.',
        }),
      ],
    },
    {
      /*
        O EVANS É A LIÇÃO DE INICIATIVA DO CURSO. Ele é core porque ensina a
        conta que todo gambito faz — tempo contra material — num formato em que
        as duas metades são visíveis no mesmo lance.
      */
      id: 'italiana-evans',
      importancia: 'core',
      eco: 'C51',
      conceitos: ['concept.material-vs-initiative', 'concept.break-d4', 'concept.open-file'],
      estrutura: 'structure.open-center',
      motivos: ['motif.f7-pressure'],
      erroComum: {
        lance: 'Nc3',
        porque:
          'Desenvolver naturalmente aqui desperdiça o gambito: o peão de b4 foi entregue para ganhar c3 e d4 com tempo, e o cavalo nessa casa tira justamente o apoio que a ruptura precisa.',
      },
      fronteira: { type: 'handoff', planId: 'italiana-d4' },
      politicaDoLadoInverso:
        'Pelas pretas, demonstra-se aceitar material sem pânico: devolver o peão no momento certo vale mais que segurá-lo.',
      intencaoDoAdversario:
        'Ficar com o peão a mais e provar que a sua iniciativa acaba antes de virar algo concreto.',
      objetivoDoAluno:
        'Usar os tempos que o peão comprou: c3 e d4 vêm com ataque, e o centro abre a favor de quem se desenvolveu.',
      name: 'Gambito Evans',
      description: 'As brancas entregam um peão em b4 para ganhar tempo e abrir o centro.',
      rootNodeId: '',
      line: [
        ...italianaMain.slice(0, 6),
        lesson(7, 'b4', 'O peão é oferecido para desviar o bispo e ganhar o tempo de c3.', {
          arrows: [{ from: 'b2', to: 'b4' }],
          strategicIdea: 'Material por iniciativa: a conta só fecha se os tempos virarem centro.',
        }),
        lesson(8, 'Bxb4', 'As pretas aceitam — recusar também é jogável e leva a outro jogo.'),
        lesson(9, 'c3', 'O bispo é expulso e o centro ganha o apoio que d4 precisa.', {
          resultingPlan: 'd4 abrindo linhas enquanto o rei preto ainda está no meio.',
        }),
      ],
    },
    {
      id: 'italiana-giuoco-piano',
      importancia: 'core',
      eco: 'C50',
      conceitos: ['concept.break-d4', 'concept.king-safety-timing'],
      estrutura: 'structure.open-center',
      motivos: ['motif.f7-pressure'],
      erroComum: {
        lance: 'Nxe5',
        porque:
          'Capturar em e5 parece ganhar um peão e perde uma peça: depois de ...Nxe5 o bispo de c4 fica sozinho contra o centro preto. É o erro de contar material sem contar defensores.',
      },
      fronteira: { type: 'handoff', planId: 'italiana-d4' },
      politicaDoLadoInverso:
        'Pelas pretas, demonstra-se que a simetria não é passividade: quem espelha precisa romper primeiro ou ceder a iniciativa.',
      intencaoDoAdversario: 'Espelhar o seu desenvolvimento e manter a posição simétrica.',
      objetivoDoAluno:
        'Reconhecer que esta é a própria linha principal, e continuar com d3 e roque.',
      name: 'Giuoco Piano',
      description: 'As duas peças menores chegam a casas ativas e a posição fica flexível.',
      rootNodeId: '',
      line: italianaMain.slice(0, 6),
    },
  ],
  plans: [
    {
      id: 'italiana-d4',
      name: 'Ruptura d4',
      positionNodeId: 'root',
      positionPly: 8,
      objective: 'Abrir o centro quando as peças estão prontas.',
      when: 'Depois do roque e com desenvolvimento suficiente.',
      risk: 'Abrir o centro com o rei exposto.',
      arrows: [{ from: 'd3', to: 'd4' }],
      porQueFunciona:
        'O peão em d3 sustenta e4; quando d4 avança, as colunas centrais se abrem para peças que já estão prontas — e quem tem mais peças prontas ganha com a abertura do centro.',
      preparacao:
        'Rei em segurança pelo roque e uma torre olhando a coluna que vai abrir. Sem isso, a ruptura abre linhas para o adversário antes de abrir para você.',
      oQueOAdversarioTenta:
        'Manter a tensão em e5 e escolher ele a hora da troca, ou responder d5 e igualar o centro antes que a ruptura signifique alguma coisa.',
      /*
        SEM MICRODECISÃO, E A AUSÊNCIA É DELIBERADA. A condição deste plano é
        "depois do roque", e a linha principal da Italiana ROCA no último lance —
        não existe posição nela em que as brancas joguem d4 já rocadas. Autorar a
        pergunta na posição anterior ensinaria a romper o centro com o rei no
        meio, que é exatamente o `risk` escrito acima.
      */
    },
    {
      id: 'italiana-manobra',
      name: 'Manobra Cbd2-f1-g3',
      positionNodeId: 'root',
      positionPly: 8,
      objective: 'Levar o pior cavalo para a melhor casa antes de tocar no centro.',
      when: 'Em posições fechadas, quando nenhuma ruptura ainda está preparada.',
      risk: 'Manobrar para sempre e nunca romper: a paciência vira passividade.',
      porQueFunciona:
        'O cavalo de b1 é a peça mais lenta da posição, e em g3 ele vigia e4, f5 e h5 ao mesmo tempo. Melhorar a pior peça é o plano padrão quando não há alvo imediato.',
      preparacao:
        'Rei rocado e centro sustentado por d3: a manobra leva três lances, e três lances com o rei no meio é convite à ruptura adversária.',
      oQueOAdversarioTenta:
        'Romper com ...d5 enquanto o cavalo está no caminho, ou avançar na ala da dama enquanto as brancas manobram do outro lado.',
      arrows: [
        { from: 'b1', to: 'd2' },
        { from: 'd2', to: 'f1' },
      ],
    },
    {
      id: 'italiana-f7',
      name: 'Pressão em f7',
      positionNodeId: 'root',
      positionPly: 5,
      objective:
        'Usar a casa f7 como alvo de desenvolvimento, não como convite a sacrificar peças.',
      when: 'Enquanto o bispo permanece ativo em c4.',
      risk: 'Atacar antes de terminar o desenvolvimento.',
      arrows: [{ from: 'c4', to: 'f7' }],
      porQueFunciona:
        'f7 é defendido só pelo rei enquanto ele não roca. O bispo de c4 mira essa casa enquanto se desenvolve — a pressão vem junto com o lance útil, e não no lugar dele.',
      preparacao:
        'Nada além do bispo em c4. É por não exigir preparação que isto é um alvo de desenvolvimento, e não um ataque a ser montado.',
      oQueOAdversarioTenta:
        'Rocar, o que tira o rei de e8 e põe a torre defendendo f7, ou jogar d5 fechando a diagonal com ganho de tempo.',
      /*
        SEM MICRODECISÃO: a seta c4→f7 não é um lance, é uma linha de pressão.
        Uma implementação que transformasse toda seta em pergunta pediria aqui um
        lance impossível — e o portão de legalidade reprovaria.
      */
    },
  ],
  structures: [
    {
      name: 'Centro aberto',
      description: 'Peões em e4/e5 deixam diagonais e colunas importantes disponíveis.',
      pawnBreaks: ['d4'],
      weakSquares: ['f7', 'f2'],
      openFiles: ['e'],
    },
  ],
  mistakes: [
    {
      id: 'italiana-ataque-f7',
      nodeId: 'root',
      positionPly: 2,
      moveSan: 'Qh5',
      explanation: 'A dama sai cedo e o ataque depende de uma única ameaça.',
      principle: 'Desenvolva as peças antes de mover a dama várias vezes.',
    },
  ],
  version: 1,
})

const caroMain = [
  lesson(1, 'e4', 'As brancas ocupam o centro.'),
  lesson(2, 'c6', 'Prepare d5 sem bloquear o bispo de c8.', {
    strategicIdea: 'A estrutura é mais importante que atacar imediatamente.',
  }),
  lesson(3, 'd4', 'As brancas montam dois peões no centro.'),
  lesson(4, 'd5', 'Ataque o centro no momento certo.', {
    highlights: ['d4'],
    arrows: [{ from: 'd7', to: 'd5' }],
    resultingPlan: 'Trocar ou pressionar e4 e desenvolver o bispo da dama.',
  }),
  lesson(5, 'e5', 'A variante do avanço ganha espaço.'),
  lesson(6, 'Bf5', 'Desenvolva o bispo antes de fechar a cadeia.', {
    warning: 'Não deixe o bispo de c8 preso atrás da própria cadeia.',
  }),
]

const caroKann = course({
  id: 'caro-kann',
  slug: 'caro-kann',
  name: 'Defesa Caro-Kann',
  side: 'black',
  ecoCodes: ['B10', 'B12'],
  description: 'Uma defesa sólida que disputa o centro e procura libertar o bispo de c8.',
  philosophy: 'Atacar o centro com d5, manter uma estrutura saudável e desenvolver sem pressa.',
  difficulty: 2,
  prerequisites: [],
  tags: ['solid', 'positional'],
  transitionToMiddlegame:
    'Depois de d5 e do desenvolvimento do bispo, pare de decorar e observe a estrutura: as rupturas e5 ou c5 definem o meio-jogo.',
  mainline: caroMain,
  variations: [
    {
      id: 'caro-troca',
      importancia: 'core',
      eco: 'B13',
      conceitos: ['concept.open-file', 'concept.bad-bishop', 'concept.minority-attack'],
      estrutura: 'structure.carlsbad',
      erroComum: {
        lance: 'Qxd5',
        porque:
          'Recapturar com a dama entrega o tempo: Nc3 a ataca e as brancas se desenvolvem de graça. O peão de c6 recaptura, abre a coluna c e mantém d5 sustentado — que é a razão de a defesa existir.',
      },
      fronteira: { type: 'handoff', planId: 'caro-bispo' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se o ataque de minoria: b4-b5 é o plano que a estrutura de Carlsbad autoriza.',
      intencaoDoAdversario:
        'Simplificar em d5 para tirar a tensão e jogar uma posição sem alvo fixo.',
      objetivoDoAluno:
        'Recapturar com o peão de c6, abrir a coluna c e manter o bispo de c8 livre.',
      name: 'Variante da Troca',
      description: 'As brancas trocam em d5 e a estrutura fica simétrica.',
      rootNodeId: '',
      line: [
        ...caroMain.slice(0, 4),
        lesson(
          5,
          'exd5',
          'As brancas simplificam em vez de avançar. O espaço some, e com ele a pressão.',
          {
            strategicIdea: 'Sem cadeia de peões no centro, ninguém tem alvo fixo para atacar.',
          },
        ),
        lesson(
          6,
          'cxd5',
          'Recapture com o peão de c6: a coluna c abre para a sua torre e d5 fica sustentado.',
          {
            resultingPlan: 'Cc6, Af5 e e6, com jogo pela coluna c.',
          },
        ),
      ],
    },
    {
      /*
        O PANOV NASCE DENTRO DA TROCA e muda o jogo inteiro: com c4 as brancas
        aceitam um peão isolado em troca de peças ativas. É o ramo que ensina o
        IQP deste curso — e ele é o mesmo IQP da Escocesa e da Tarrasch.
      */
      id: 'caro-panov',
      importancia: 'core',
      eco: 'B14',
      conceitos: ['concept.iqp', 'concept.material-vs-initiative', 'concept.open-file'],
      estrutura: 'structure.iqp',
      motivos: ['motif.fork-on-d5', 'motif.pin-on-d-file'],
      erroComum: {
        lance: 'dxc4',
        porque:
          'Capturar em c4 devolve o centro e dá às brancas exatamente o que elas queriam: desenvolvimento com tempo sobre o peão recuperado. Contra o Panov, as pretas sustentam d5 e jogam para trocar peças, não peões.',
      },
      fronteira: { type: 'handoff', planId: 'caro-contra-iqp' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se jogar COM o peão isolado: atacar antes das trocas, porque no final ele vira alvo fixo.',
      intencaoDoAdversario:
        'Aceitar um peão isolado em troca de casas ativas e iniciativa, apostando que você vai trocar peças tarde demais.',
      objetivoDoAluno:
        'Sustentar d5 e trocar peças: cada troca aproxima o final em que o peão isolado é fraqueza, e não força.',
      name: 'Ataque Panov-Botvinnik',
      description: 'Depois da troca, as brancas jogam c4 e aceitam um peão isolado por atividade.',
      rootNodeId: '',
      line: [
        ...caroMain.slice(0, 4),
        lesson(
          5,
          'exd5',
          'As brancas resolvem a tensão central, mas desta vez com a intenção de atacar d5 logo em seguida.',
          { strategicIdea: 'A troca aqui não é para simplificar: é para criar um alvo.' },
        ),
        lesson(
          6,
          'cxd5',
          'A recaptura correta continua sendo com o peão de c, que abre a coluna e sustenta o centro.',
          { resultingPlan: 'A coluna c aberta é a compensação permanente das pretas.' },
        ),
        lesson(7, 'c4', 'Agora o centro é atacado: as brancas oferecem o peão isolado.', {
          arrows: [{ from: 'c2', to: 'c4' }],
          strategicIdea: 'Peão isolado é atividade agora e fraqueza depois.',
        }),
        lesson(8, 'Nf6', 'Desenvolver atacando o centro vale mais que capturar em c4.', {
          resultingPlan: '...e6, ...Be7 e trocas: cada peça fora do tabuleiro favorece as pretas.',
        }),
      ],
    },
    {
      /*
        O FANTASY É A LINHA QUE PEGA QUEM DECOROU. Ela não desenvolve nada, e é
        justamente por isso que confunde: o repertório preto precisa de um plano,
        não de um lance memorizado.
      */
      id: 'caro-fantasy',
      importancia: 'core',
      eco: 'B12',
      conceitos: ['concept.break-e5', 'concept.king-safety-timing', 'concept.bad-bishop'],
      estrutura: 'structure.open-center',
      erroComum: {
        lance: 'dxe4',
        porque:
          'Capturar em e4 abre a coluna f para as brancas e devolve o centro com tempo — depois de fxe4 elas ficam com dois peões centrais e a iniciativa. Contra f3, as pretas atacam o centro com ...e5 ou ...Qb6, e não o simplificam.',
      },
      fronteira: { type: 'handoff', planId: 'caro-bispo' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se construir um centro grande aceitando ficar atrasado no desenvolvimento.',
      intencaoDoAdversario:
        'Sustentar e4 com um peão e montar um centro grande, aceitando não desenvolver nenhuma peça por enquanto.',
      objetivoDoAluno:
        'Atacar o centro antes que ele se complete: quem gasta lances com peões não pode ganhar uma corrida de desenvolvimento.',
      name: 'Variante Fantasy',
      description: 'As brancas sustentam e4 com f3 em vez de avançar ou trocar.',
      rootNodeId: '',
      line: [
        ...caroMain.slice(0, 4),
        lesson(5, 'f3', 'O peão sustenta e4 sem desenvolver nada — e abre a diagonal do rei.', {
          highlights: ['e4'],
          strategicIdea: 'Centro grande custa tempo. Tempo é o que ataca centro grande.',
        }),
        lesson(6, 'e6', 'As pretas preparam ...c5 e abrem a diagonal do bispo de f8.', {
          resultingPlan: '...c5 atacando a base, com o rei branco ainda no meio.',
        }),
      ],
    },
    {
      id: 'caro-classica',
      importancia: 'core',
      eco: 'B18',
      conceitos: ['concept.bad-bishop', 'concept.space-vs-counterplay', 'concept.break-c5'],
      estrutura: 'structure.open-center',
      motivos: ['motif.greek-gift'],
      erroComum: {
        lance: 'e6',
        porque:
          'Jogar ...e6 antes de tirar o bispo de c8 tranca justamente a peça que a Caro-Kann existe para libertar — a defesa vira uma Francesa sem as compensações dela. A ordem é o conteúdo inteiro desta abertura.',
      },
      fronteira: { type: 'handoff', planId: 'caro-bispo' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se ganhar espaço e perseguir o bispo preto que saiu cedo, com Bd3 ou h4-h5.',
      intencaoDoAdversario:
        'Desenvolver sem definir o centro, deixando a decisão sobre d5 com você.',
      objetivoDoAluno: 'Trocar em e4 enquanto a troca é sua, e só então tirar o bispo por f5.',
      name: 'Variante Clássica',
      description: 'As brancas desenvolvem em vez de definir o centro, e deixam a troca com você.',
      rootNodeId: '',
      line: [
        ...caroMain.slice(0, 4),
        lesson(
          5,
          'Nc3',
          'As brancas desenvolvem e deixam a tensão de pé: quem decide o que acontece com d5 é você.',
          {
            strategicIdea:
              'Tensão mantida é convite para você escolher a estrutura. Aceite o convite.',
          },
        ),
        lesson(
          6,
          'dxe4',
          'Troque enquanto a troca é sua. Deixar o peão em d5 apenas devolveria a escolha às brancas.',
          {
            resultingPlan: 'Depois de Cxe4, o bispo sai por f5 antes de e6 fechar a diagonal.',
          },
        ),
        lesson(7, 'Nxe4', 'O cavalo recupera no centro e mira as casas d6 e g5.'),
        lesson(
          8,
          'Bf5',
          'Este é o lance que a Caro-Kann existe para permitir: o bispo sai ANTES de e6.',
          {
            highlights: ['f5'],
            warning: 'Jogar e6 primeiro prenderia o bispo atrás dos próprios peões.',
          },
        ),
      ],
    },
  ],
  plans: [
    {
      id: 'caro-contra-iqp',
      name: 'Trocar peças contra o peão isolado',
      positionNodeId: 'root',
      positionPly: 4,
      objective: 'Aproximar o final trocando peças, para que o peão isolado vire alvo fixo.',
      when: 'Sempre que as brancas aceitarem o isolado — no Panov, tipicamente.',
      risk: 'Trocar sem completar o desenvolvimento: o isolado é forte justamente no meio-jogo.',
      porQueFunciona:
        'Um peão isolado dá casas ativas enquanto há peças para ocupá-las e vira fraqueza quando elas somem. Cada troca tira um atacante e mantém o alvo — é a única fraqueza do xadrez que não pode fugir.',
      preparacao:
        'Bloquear a casa à frente do peão, tipicamente com um cavalo em d5 ou d4. Sem bloqueio, o peão avança e deixa de ser isolado.',
      oQueOAdversarioTenta:
        'Evitar trocas e usar as colunas abertas para atacar antes que o final chegue — d5 no momento certo desfaz tudo.',
    },
    {
      id: 'caro-coluna-c',
      name: 'Usar a coluna c',
      positionNodeId: 'root',
      positionPly: 4,
      objective: 'Pôr a torre em c8 e pressionar a coluna que a recaptura abriu.',
      when: 'Depois de ...cxd5, em qualquer linha de troca.',
      risk: 'Abrir a coluna e não ocupá-la: a coluna aberta serve a quem chega primeiro.',
      porQueFunciona:
        'A recaptura com o peão de c é o que diferencia a Caro-Kann: ela abre uma coluna para a torre preta sem enfraquecer o centro. A mesma troca que tira a tensão entrega a estrada.',
      preparacao:
        'O bispo de c8 já resolvido — em f5 ou trocado. Com ele em casa, a torre em c8 empurra uma peça que ainda não saiu.',
      oQueOAdversarioTenta:
        'Disputar a coluna com a própria torre, ou fechar o assunto trocando tudo nela e indo para um final igual.',
    },
    {
      id: 'caro-bispo',
      name: 'Libertar o bispo',
      positionNodeId: 'root',
      positionPly: 5,
      objective: 'Colocar o bispo de c8 fora da cadeia de peões.',
      when: 'Antes de jogar e6 em posições em que o bispo ficaria preso.',
      risk: 'Ficar passivo e sem desenvolvimento.',
      arrows: [{ from: 'c8', to: 'f5' }],
      porQueFunciona:
        'Na Caro-Kann o peão chega a d5 sem trancar o bispo de c8 — é isso que a separa da Francesa. Tirá-lo para f5 antes de e6 é usar a única janela que a estrutura oferece.',
      preparacao:
        'Apenas que o peão de e ainda esteja em e7. Depois de e6 a janela fecha e o bispo passa a partida atrás da própria cadeia.',
      oQueOAdversarioTenta:
        'Expulsar o bispo com Bd3 para trocá-lo, ou ganhar espaço com g4 e h4 empurrando-o para casas piores.',
      microdecisao: {
        ply: 5,
        san: 'Bf5',
        pergunta: 'O centro fechou com e5. Qual lance começa este plano?',
        porque:
          'Antes de e6, e só antes: este é o lance que a Caro-Kann existe para permitir. Depois de e6 o bispo fica preso e a defesa vira uma Francesa sem as compensações dela.',
      },
    },
  ],
  structures: [
    {
      name: 'Cadeia do avanço',
      description: 'As brancas têm espaço; as pretas atacam a base da cadeia.',
      pawnBreaks: ['c5', 'e5'],
      weakSquares: ['d4'],
      openFiles: ['c'],
    },
  ],
  mistakes: [
    {
      id: 'caro-sem-d5',
      nodeId: 'root',
      positionPly: 1,
      moveSan: 'a6',
      explanation: 'Um lance de espera permite que o centro branco se consolide.',
      principle: 'Ataque o centro enquanto ele ainda está se formando.',
    },
  ],
  version: 1,
})

const qgdMain = [
  lesson(1, 'd4', 'As brancas ocupam o centro.'),
  lesson(2, 'd5', 'Ocupe o centro e impeça e4 fácil.', {
    strategicIdea: 'Centro contra centro.',
  }),
  lesson(3, 'c4', 'O Gambito da Dama desafia d5.'),
  lesson(4, 'e6', 'Sustente d5 e abra o bispo de f8.', {
    highlights: ['d5'],
    resultingPlan: 'Cf6, Be7, O-O e c5 no momento certo.',
  }),
  lesson(5, 'Nc3', 'As brancas aumentam a pressão central.'),
  lesson(6, 'Nf6', 'Desenvolva e controle e4.', { arrows: [{ from: 'g8', to: 'f6' }] }),
]

const qgd = course({
  id: 'gambito-da-dama-recusado',
  slug: 'gambito-da-dama-recusado',
  name: 'Gambito da Dama Recusado',
  side: 'black',
  ecoCodes: ['D30'],
  description: 'Uma resposta sólida a 1.d4: centro firme, desenvolvimento e pressão sobre c4.',
  philosophy: 'Sustentar d5, desenvolver e preparar a ruptura c5 sem ficar passivo.',
  difficulty: 2,
  prerequisites: [],
  tags: ['solid', 'positional'],
  transitionToMiddlegame:
    'Quando as peças menores estão desenvolvidas, a posição deixa de ser uma sequência: observe a tensão em c4/d5 e escolha a ruptura.',
  mainline: qgdMain,
  variations: [
    {
      id: 'qgd-tres-cavalos',
      importancia: 'core',
      eco: 'D37',
      conceitos: ['concept.bad-bishop', 'concept.break-c5', 'concept.space-vs-counterplay'],
      estrutura: 'structure.slav-triangle',
      erroComum: {
        lance: 'dxc4',
        porque:
          'Capturar em c4 sem ter preparado ...b5 ou ...c5 devolve o centro com tempo: as brancas recuperam o peão com e3 e Bxc4 já desenvolvidas. Na Ortodoxa, a tensão é sustentada até a ruptura estar pronta.',
      },
      fronteira: { type: 'handoff', planId: 'qgd-c5' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se manter a tensão central e completar o desenvolvimento antes de decidir a estrutura.',
      intencaoDoAdversario:
        'Desenvolver o cavalo do rei antes de comprometer o centro, mudando só a ordem dos lances.',
      objetivoDoAluno:
        'Responder com o mesmo lance da linha principal: ordem diferente não é linha diferente.',
      name: 'Desenvolvimento com Cf3',
      description: 'As brancas desenvolvem o cavalo do rei antes de decidir o centro.',
      rootNodeId: '',
      line: [
        ...qgdMain.slice(0, 4),
        lesson(
          5,
          'Nf3',
          'As brancas desenvolvem sem definir nada. É a ordem de lances mais comum nesta posição.',
          {
            strategicIdea: 'Ordem diferente, mesma posição: não mude o seu plano por causa dela.',
          },
        ),
        lesson(
          6,
          'Nf6',
          'Responda com o mesmo lance da linha principal. Você não precisa de teoria nova aqui.',
          {
            resultingPlan: 'Be7, O-O e a ruptura c5 quando o desenvolvimento estiver pronto.',
          },
        ),
      ],
    },
    {
      /*
        O TARTAKOWER RESOLVE O PROBLEMA CENTRAL DA ORTODOXA — o bispo de c8 — e
        por isso é core: ele é a resposta à pergunta que o curso inteiro faz.
      */
      id: 'qgd-tartakower',
      importancia: 'core',
      eco: 'D58',
      conceitos: ['concept.bad-bishop', 'concept.break-c5', 'concept.open-file'],
      estrutura: 'structure.slav-triangle',
      erroComum: {
        lance: 'c5',
        porque:
          'Romper antes de resolver o bispo deixa a peça presa atrás da própria cadeia justamente quando a posição abre. O ...b6 vem primeiro porque é ele que dá ao bispo a diagonal onde ele vale alguma coisa.',
      },
      fronteira: { type: 'handoff', planId: 'qgd-c5' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se pressionar antes de o bispo sair: cada tempo que as pretas gastam com ...h6 e ...b6 é um tempo de desenvolvimento a mais.',
      intencaoDoAdversario:
        'Pressionar o centro e o cavalo de f6 enquanto o bispo de c8 ainda não tem diagonal.',
      objetivoDoAluno:
        'Resolver o bispo ruim antes de romper: ...b6 e ...Bb7 transformam a peça pior da posição na melhor.',
      name: 'Variante Tartakower',
      description: 'As pretas resolvem o bispo de c8 com ...b6 antes de qualquer ruptura.',
      rootNodeId: '',
      line: [
        ...qgdMain,
        lesson(
          7,
          'Bg5',
          'O bispo crava o cavalo de f6 e aumenta a pressão sobre d5, que é o ponto que a defesa sustenta.',
          {
            highlights: ['f6'],
            resultingPlan: 'e3, Bd3 e a pressão somada sobre o centro preto.',
          },
        ),
        lesson(
          8,
          'Be7',
          'As pretas desfazem a cravada desenvolvendo, sem gastar um lance só para resolver o problema.',
          { strategicIdea: 'Resolver uma ameaça com desenvolvimento é sempre o melhor negócio.' },
        ),
        lesson(
          9,
          'e3',
          'As brancas fecham a cadeia e abrem a diagonal do bispo de f1 antes de completar o desenvolvimento.',
          { resultingPlan: 'Bd3 e O-O, com o centro sustentado.' },
        ),
        lesson(
          10,
          'h6',
          'Antes de qualquer ruptura, a pergunta ao bispo: ele troca em f6 ou recua e perde um tempo?',
          {
            strategicIdea: 'Ganhar o tempo do bispo é o que torna ...b6 possível sem concessão.',
            resultingPlan: '...b6 e ...Bb7 com o cavalo de f6 já livre da cravada.',
          },
        ),
        lesson(
          11,
          'Bh4',
          'O bispo mantém a cravada em vez de trocar — mas gastou um tempo, e é esse tempo que as pretas usam.',
          {
            strategicIdea: 'Perguntar ao bispo sempre ganha alguma coisa: ou a troca, ou o tempo.',
          },
        ),
        lesson(12, 'b6', 'Agora sim: a diagonal longa abre para o bispo que estava preso.', {
          arrows: [{ from: 'c8', to: 'b7' }],
          resultingPlan: '...Bb7, ...Nbd7 e a ruptura ...c5 com todas as peças no jogo.',
        }),
      ],
    },
    {
      id: 'qgd-troca',
      importancia: 'core',
      eco: 'D35',
      conceitos: ['concept.minority-attack', 'concept.open-file', 'concept.break-e5'],
      estrutura: 'structure.carlsbad',
      erroComum: {
        lance: 'Qxd5',
        porque:
          'Recapturar com a dama entrega o tempo a Nc3 e desfaz a estrutura de Carlsbad antes de ela existir. É o peão de e6 que recaptura — e é essa recaptura que define o plano dos dois lados pelo resto da partida.',
      },
      fronteira: { type: 'handoff', planId: 'qgd-minoria' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se o ataque de minoria: b4-b5 cria a fraqueza permanente que a estrutura autoriza.',
      intencaoDoAdversario: 'Fixar a estrutura cedo e jogar contra a sua minoria de peões.',
      objetivoDoAluno:
        'Recapturar com o peão de e6 para manter d5 sustentado e o bispo de c8 com saída.',
      name: 'Variante da Troca',
      description: 'As brancas trocam em d5 e a estrutura fica fixa desde cedo.',
      rootNodeId: '',
      line: [
        ...qgdMain.slice(0, 4),
        lesson(
          5,
          'cxd5',
          'As brancas resolvem a tensão e fixam a estrutura. A posição fica clara para os dois lados.',
          {
            strategicIdea:
              'Estrutura fixa significa plano fixo: aqui o jogo é de peças, não de teoria.',
          },
        ),
        lesson(
          6,
          'exd5',
          'Recapture com o peão de e6: d5 continua sustentado e o bispo de c8 fica livre.',
          {
            resultingPlan: 'Cf6, Be7, O-O e Bf5 ou Be6, com a coluna e disponível.',
          },
        ),
      ],
    },
    {
      id: 'qgd-eslava-ponte',
      importancia: 'secondary',
      intencaoDoAdversario: 'Nenhuma: aqui quem escolhe é você.',
      objetivoDoAluno:
        'Sustentar d5 com c6 em vez de e6, mantendo a diagonal do bispo de c8 aberta.',
      name: 'Estrutura com c6',
      description: 'A estrutura fica mais sólida, mas o bispo de c8 pede atenção.',
      rootNodeId: '',
      line: [
        ...qgdMain.slice(0, 3),
        lesson(
          4,
          'c6',
          'Você sustenta d5 com o peão de c6 em vez do de e6, e o bispo de c8 continua com saída.',
          {
            strategicIdea: 'É a Eslava: mesma ideia, outro peão — e a diagonal c8-h3 segue aberta.',
          },
        ),
        lesson(5, 'Nf3', 'As brancas desenvolvem e mantêm a pressão sobre d5.'),
        lesson(6, 'Nf6', 'Desenvolva e controle e4, exatamente como na linha principal.'),
      ],
    },
  ],
  plans: [
    {
      id: 'qgd-minoria',
      name: 'Enfrentar o ataque de minoria',
      positionNodeId: 'root',
      positionPly: 4,
      objective: 'Jogar no centro e na ala do rei enquanto as brancas avançam na ala da dama.',
      when: 'Na estrutura de Carlsbad, depois de cxd5 exd5.',
      risk: 'Tentar parar b4-b5 com peões: as casas que isso enfraquece custam mais que o avanço.',
      porQueFunciona:
        'O ataque de minoria é lento por natureza — dois peões contra três levam vários lances. Cada um deles é um lance que as brancas não usam no centro, e é aí que as pretas jogam ...Ne4 e ...f5.',
      preparacao:
        'Peças no centro antes do avanço chegar: com o cavalo em e4 e a torre em e8, a ruptura ...f5 vem com apoio.',
      oQueOAdversarioTenta:
        'Completar b4-b5 e fixar um peão atrasado em c6, para atacá-lo pela coluna c no final.',
      arrows: [{ from: 'f7', to: 'f5' }],
    },
    {
      id: 'qgd-bispo-ruim',
      name: 'Resolver o bispo de c8',
      positionNodeId: 'root',
      positionPly: 4,
      objective: 'Dar ao bispo de casas claras uma diagonal antes de a posição abrir.',
      when: 'Em toda estrutura fechada do QGD — é a pergunta permanente da defesa.',
      risk: 'Gastar tempo demais com uma peça só e ficar atrasado no resto do desenvolvimento.',
      porQueFunciona:
        'O peão em e6 tranca o bispo atrás da própria cadeia, e uma peça que não participa é material a menos. ...b6 e ...Bb7 ou ...dxc4 com ...b5 são as duas formas de a peça voltar ao jogo.',
      preparacao:
        'O cavalo de f6 já defendido ou a cravada já resolvida com ...h6: sem isso, ...b6 afrouxa o centro no pior momento.',
      oQueOAdversarioTenta:
        'Abrir a posição enquanto o bispo ainda está em casa, tipicamente com cxd5 e e4 no momento certo.',
    },
    {
      id: 'qgd-c5',
      name: 'Ruptura c5',
      positionNodeId: 'root',
      positionPly: 3,
      objective: 'Questionar a cadeia branca e buscar liberdade.',
      when: 'Após desenvolvimento e rei seguro.',
      risk: 'Abrir linhas sem terminar o desenvolvimento.',
      arrows: [{ from: 'c7', to: 'c5' }],
      porQueFunciona:
        'A cadeia branca se apoia em d4. c5 ataca a base do avanço, e quando as trocas vêm, o bispo e a torre das pretas ganham as linhas que o próprio peão abriu.',
      preparacao:
        'Desenvolvimento terminado e rei rocado. c5 abre a coluna c e a diagonal do bispo branco ao mesmo tempo — quem não terminou de se desenvolver abre para o outro.',
      oQueOAdversarioTenta:
        'Sustentar d4 com e3 e Nf3 para que a ruptura não ganhe nada, ou trocar em c5 na hora em que a recaptura atrapalhe as peças pretas.',
      /*
        SEM MICRODECISÃO: a única posição da linha principal em que c5 é legal é
        o terceiro lance, e ali ele não é este plano — é outra defesa. Perguntar
        lá ensinaria a sair do repertório que a etapa anterior acabou de ensinar.
      */
    },
  ],
  structures: [
    {
      name: 'Centro com tensão',
      description: 'O peão branco em c4 pressiona d5 e cria decisões de estrutura.',
      pawnBreaks: ['c5', 'e5'],
      weakSquares: ['c4', 'e4'],
      openFiles: ['c'],
    },
  ],
  mistakes: [
    {
      id: 'qgd-segurar-c4',
      nodeId: 'root',
      positionPly: 3,
      moveSan: 'dxc4',
      explanation: 'Tentar segurar o peão pode atrasar o desenvolvimento.',
      principle: 'Priorize centro e desenvolvimento sobre material temporário.',
    },
  ],
  version: 1,
})

const escocesaMain = [
  lesson(1, 'e4', 'Ocupe o centro.'),
  lesson(2, 'e5', 'As pretas respondem no centro.'),
  lesson(3, 'Nf3', 'Ataque e5 e desenvolva.'),
  lesson(4, 'Nc6', 'Defenda e5 desenvolvendo.'),
  lesson(5, 'd4', 'Abra o centro enquanto as peças ganham atividade.', {
    arrows: [{ from: 'd2', to: 'd4' }],
    resultingPlan: 'Desenvolver e rocar, sem caçar peões.',
  }),
  lesson(6, 'exd4', 'As pretas aceitam a troca.'),
  lesson(7, 'Nxd4', 'Recupere com desenvolvimento e pressão no centro.'),
]

const scotch = course({
  id: 'escocesa',
  slug: 'escocesa',
  name: 'Jogo Escocês',
  side: 'white',
  ecoCodes: ['C45'],
  description:
    'Uma abertura direta que abre o centro cedo para ensinar desenvolvimento e iniciativa.',
  philosophy: 'Trocar no centro e usar a vantagem de desenvolvimento para jogar com atividade.',
  difficulty: 2,
  prerequisites: [],
  tags: ['open', 'tactical'],
  transitionToMiddlegame:
    'Depois da troca em d4, avalie desenvolvimento e rei: a teoria acaba quando as peças começam a disputar casas.',
  mainline: escocesaMain,
  variations: [
    {
      id: 'escocesa-classica',
      importancia: 'core',
      eco: 'C45',
      conceitos: ['concept.open-file', 'concept.break-d4', 'concept.king-safety-timing'],
      estrutura: 'structure.open-center',
      motivos: ['motif.pin-on-d-file'],
      erroComum: {
        lance: 'Nb3',
        porque:
          'Recuar o cavalo devolve de graça o tempo que d4 ganhou e deixa o bispo de c5 mandando na diagonal. Defender desenvolvendo com Be3 mantém a peça e acrescenta outra ao jogo.',
      },
      fronteira: { type: 'handoff', planId: 'escocesa-atividade' },
      politicaDoLadoInverso:
        'Pelas pretas, demonstra-se a pergunta direta: atacar a peça que avançou, em vez de aceitar o espaço em silêncio.',
      intencaoDoAdversario:
        'Atacar o cavalo de d4 e a casa f2 com um só lance, forçando você a decidir cedo.',
      objetivoDoAluno:
        'Defender o cavalo desenvolvendo: recuar devolveria de graça o tempo que d4 ganhou.',
      name: 'Variante Clássica',
      description: 'As pretas põem o bispo em c5, de frente para o seu cavalo de d4.',
      rootNodeId: '',
      line: [
        ...escocesaMain,
        lesson(
          8,
          'Bc5',
          'O bispo mira o cavalo de d4 e ataca f2. É a resposta mais direta que você vai encontrar.',
          {
            highlights: ['d4', 'f2'],
            strategicIdea: 'A pergunta é sobre o cavalo de d4. Responda defendendo-o, não fugindo.',
          },
        ),
        lesson(
          9,
          'Be3',
          'Defenda o cavalo desenvolvendo. Recuar o cavalo devolveria de graça o tempo que d4 ganhou.',
          {
            resultingPlan: 'c3, Bc4 e O-O, com o centro sustentado.',
          },
        ),
      ],
    },
    {
      /*
        O GAMBITO ESCOCÊS É A DECISÃO DE NÃO TROCAR, e por isso ele é core: as
        duas outras linhas do curso nascem de `4.Nxd4`, e este ramo ensina que
        existe uma escolha antes dela.

        Ele também é a ponte para a Italiana (§47): depois de `4.Bc4 Bc5 5.c3`, a
        posição pode transpor para o Giuoco Piano com c3. A transposição está
        declarada em vez de a explicação ser copiada nos dois cursos.
      */
      id: 'escocesa-gambito',
      importancia: 'core',
      eco: 'C44',
      conceitos: ['concept.material-vs-initiative', 'concept.break-d4', 'concept.open-file'],
      estrutura: 'structure.open-center',
      motivos: ['motif.f7-pressure'],
      erroComum: {
        lance: 'Qxd4',
        porque:
          'Recapturar com a dama parece natural e entrega o tempo: ...Nc6 ataca a dama e as pretas se desenvolvem de graça. Num centro aberto, quem sai com a dama cedo paga em tempo.',
      },
      fronteira: { type: 'handoff', planId: 'escocesa-atividade' },
      transposicoes: ['italiana-giuoco-piano-c3'],
      politicaDoLadoInverso:
        'Pelas pretas, demonstra-se devolver o peão na hora certa: segurá-lo custa desenvolvimento, e é o desenvolvimento que decide um centro aberto.',
      intencaoDoAdversario:
        'Ficar com o peão de d4 e sobreviver aos primeiros lances, apostando que a sua iniciativa acaba antes de virar ataque.',
      objetivoDoAluno:
        'Desenvolver com ameaça em vez de recapturar: o bispo em c4 mira f7 e o peão de d4 volta depois, ou não volta e paga em linhas abertas.',
      name: 'Gambito Escocês',
      description: 'Em vez de recapturar em d4, as brancas desenvolvem o bispo e miram f7.',
      rootNodeId: '',
      line: [
        ...escocesaMain.slice(0, 6),
        lesson(7, 'Bc4', 'O peão de d4 espera: primeiro o bispo entra mirando f7.', {
          highlights: ['f7'],
          arrows: [{ from: 'f1', to: 'c4' }],
          strategicIdea: 'Num centro aberto, um tempo de desenvolvimento vale mais que um peão.',
        }),
        lesson(8, 'Bc5', 'As pretas também desenvolvem e defendem a diagonal.'),
        lesson(9, 'c3', 'O peão prepara a recuperação do centro com apoio.', {
          resultingPlan: 'cxd4 com centro sustentado, ou O-O antes de abrir tudo.',
        }),
      ],
    },
    {
      id: 'escocesa-schmidt',
      importancia: 'core',
      eco: 'C45',
      conceitos: ['concept.break-e5', 'concept.backward-pawn', 'concept.space-vs-counterplay'],
      estrutura: 'structure.open-center',
      motivos: ['motif.fork-on-d5'],
      erroComum: {
        lance: 'Nc3',
        porque:
          'Defender e4 com peça deixa as pretas confortáveis e desperdiça a única troca que muda a pergunta. Nxc6 primeiro cria o alvo em c6 e só então e5 avança com tempo sobre o cavalo que atacava.',
      },
      fronteira: { type: 'handoff', planId: 'escocesa-espaco' },
      politicaDoLadoInverso:
        'Pelas pretas, demonstra-se aceitar os peões dobrados em troca da coluna b aberta e do par de bispos.',
      intencaoDoAdversario:
        'Atacar e4 e ignorar o seu cavalo, apostando que você vai defender passivamente.',
      objetivoDoAluno:
        'Trocar antes de defender, e depois avançar e5 com tempo sobre o cavalo que atacava.',
      name: 'Variante Schmidt',
      description: 'As pretas atacam e4 com o cavalo antes de desenvolver o bispo.',
      rootNodeId: '',
      line: [
        ...escocesaMain,
        lesson(
          8,
          'Nf6',
          'O cavalo ataca e4 e ignora o seu cavalo de d4. Defender e4 com peça seria passivo.',
          {
            highlights: ['e4'],
            strategicIdea:
              'Quando o adversário ataca, procure primeiro a troca que muda a pergunta.',
          },
        ),
        lesson(
          9,
          'Nxc6',
          'Troque antes de defender: a resposta à ameaça começa com esta troca, não com um lance defensivo.',
          {
            resultingPlan: 'Depois da recaptura, e5 expulsa o cavalo com tempo.',
          },
        ),
        lesson(
          10,
          'bxc6',
          'As pretas recapturam e a estrutura delas fica com peões dobrados em c.',
        ),
        lesson(
          11,
          'e5',
          'Agora o peão avança com tempo: o cavalo que atacava e4 é quem precisa se mexer.',
          {
            arrows: [{ from: 'e4', to: 'e5' }],
            resultingPlan: 'Qe2, Nc3 e O-O, com espaço e um alvo fixo em c6.',
          },
        ),
      ],
    },
  ],
  plans: [
    {
      id: 'escocesa-espaco',
      name: 'Espaço com e5',
      positionNodeId: 'root',
      positionPly: 7,
      objective: 'Avançar e5 com tempo e fixar o alvo que a troca em c6 criou.',
      when: 'Depois de Nxc6 bxc6, quando um cavalo preto ainda ocupa f6.',
      risk: 'Avançar sem tempo: e5 sem ganhar nada vira um peão fraco à frente das próprias peças.',
      porQueFunciona:
        'A troca em c6 deixou as pretas com peões dobrados e sem o cavalo que defendia e5. O avanço ganha espaço, expulsa a peça que atacava e4 e transforma c6 num alvo que não anda.',
      preparacao:
        'A troca em c6 precisa vir ANTES: e5 com o cavalo preto ainda em c6 seria só um peão avançado sem apoio.',
      oQueOAdversarioTenta:
        'Desfazer os peões dobrados com ...d5, ou usar a coluna b aberta e o par de bispos para compensar a estrutura.',
      arrows: [{ from: 'e4', to: 'e5' }],
    },
    {
      id: 'escocesa-rei',
      name: 'Rei seguro antes de abrir',
      positionNodeId: 'root',
      positionPly: 4,
      objective: 'Rocar antes de o centro terminar de abrir.',
      when: 'Sempre que a troca central estiver próxima e o rei ainda estiver no meio.',
      risk: 'Rocar no automático quando existe um lance com ameaça que ganha tempo.',
      porQueFunciona:
        'A Escocesa abre o centro no terceiro lance, e num centro aberto a coluna e e a diagonal a2-g8 apontam para o rei que ficou. Quem roca primeiro decide onde a partida acontece.',
      preparacao:
        'Um lance de desenvolvimento que não pendure nada — em geral Bc4 ou Be3, que servem ao roque e à defesa do centro ao mesmo tempo.',
      oQueOAdversarioTenta:
        'Manter a tensão para que o seu rei fique no meio mais um lance, ou abrir a coluna e antes de você rocar.',
    },
    {
      id: 'escocesa-atividade',
      name: 'Atividade no centro',
      positionNodeId: 'root',
      positionPly: 4,
      objective: 'Usar linhas abertas para desenvolver com tempo.',
      when: 'Quando a troca central abriu diagonais.',
      risk: 'Sacrificar desenvolvimento por um peão.',
      arrows: [{ from: 'd2', to: 'd4' }],
      porQueFunciona:
        'd4 troca o peão central e abre a coluna d e as diagonais no mesmo lance. Quem já tem o cavalo em f3 desenvolve com tempo; quem não desenvolveu, corre atrás da posição.',
      preparacao:
        'O cavalo em f3 atacando e5. É ele que obriga a troca — sem essa pressão as pretas simplesmente sustentam o centro e o avanço não ganha nada.',
      oQueOAdversarioTenta:
        'Devolver o tempo com Bc5 ou Nf6 atacando o cavalo de d4, e igualar o desenvolvimento antes que a atividade vire algo concreto.',
      microdecisao: {
        ply: 4,
        san: 'd4',
        pergunta:
          'As peças estão desenvolvidas e o centro ainda está fechado. Qual lance começa este plano?',
        porque:
          'É o lance que dá nome à abertura: ele abre o centro enquanto o cavalo de f3 mantém e5 sob pressão. Adiar deixa as pretas completarem o desenvolvimento e a troca perde o sentido.',
      },
    },
  ],
  structures: [
    {
      name: 'Centro trocado',
      description: 'A troca abre linhas e reduz a massa de peões.',
      pawnBreaks: ['c3'],
      weakSquares: ['d4'],
      openFiles: ['d'],
    },
  ],
  mistakes: [
    {
      id: 'escocesa-dama',
      nodeId: 'root',
      positionPly: 2,
      moveSan: 'Qh5',
      explanation: 'A dama não substitui desenvolvimento.',
      principle: 'Atividade vem de peças menores e rei seguro.',
    },
  ],
  version: 1,
})

const londresMain = [
  lesson(1, 'd4', 'O peão ocupa o centro.'),
  lesson(2, 'd5', 'As pretas disputam o centro.'),
  lesson(3, 'Nf3', 'Desenvolva e controle e5.'),
  lesson(4, 'Nf6', 'As pretas fazem o mesmo.'),
  lesson(5, 'Bf4', 'O bispo sai antes de e3 e evita ficar preso.', {
    arrows: [{ from: 'c1', to: 'f4' }],
    strategicIdea: 'A estrutura é um mapa de planos, não uma obrigação de repetir lances.',
  }),
  lesson(6, 'e6', 'As pretas sustentam d5 e abrem o bispo.'),
  lesson(7, 'e3', 'Consolide o centro e prepare Bd3 e O-O.'),
]

const london = course({
  id: 'sistema-londres',
  slug: 'sistema-londres',
  name: 'Sistema Londres',
  side: 'white',
  ecoCodes: ['D02'],
  description: 'Um sistema sólido para desenvolver sem decorar muitas respostas.',
  philosophy: 'Construir uma estrutura estável, desenvolver as peças e escolher a ruptura certa.',
  difficulty: 1,
  prerequisites: [],
  tags: ['solid', 'simple'],
  transitionToMiddlegame:
    'A estrutura dá um ponto de partida, não uma lista de lances: observe a resposta das pretas e escolha c4 ou e4.',
  mainline: londresMain,
  variations: [
    {
      id: 'londres-c5',
      importancia: 'core',
      eco: 'D02',
      conceitos: ['concept.break-c5', 'concept.space-vs-counterplay'],
      estrutura: 'structure.slav-triangle',
      erroComum: {
        lance: 'dxc5',
        porque:
          'Trocar em c5 devolve o centro de graça e dá às pretas o tempo de ...e6 e ...Bxc5 com desenvolvimento. O sistema existe para não precisar reagir: e3 sustenta e o plano segue igual.',
      },
      fronteira: { type: 'handoff', planId: 'london-e4' },
      politicaDoLadoInverso:
        'Pelas pretas, demonstra-se atacar a base da cadeia em vez de espelhar — e não trocar em d4 antes de ter com que ocupar a casa.',
      intencaoDoAdversario:
        'Atacar a base do seu centro em vez de sustentar o dele — o teste mais direto do sistema.',
      objetivoDoAluno:
        'Sustentar d4 com e3 e c3: o sistema foi feito para não precisar de lance novo aqui.',
      name: 'Contra-ataque com c5',
      description: 'As pretas atacam a base do seu centro em vez de sustentar o delas.',
      rootNodeId: '',
      line: [
        ...londresMain.slice(0, 5),
        lesson(
          6,
          'c5',
          'As pretas atacam d4 em vez de sustentar d5. É a resposta mais ativa contra o sistema.',
          {
            highlights: ['d4'],
            strategicIdea:
              'O sistema foi feito para isto: você não precisa de um lance novo, só do mesmo.',
          },
        ),
        lesson(
          7,
          'e3',
          'Sustente d4 com o peão e siga o plano. Trocar em c5 devolveria o centro sem necessidade.',
          {
            resultingPlan: 'c3, Cbd2, Bd3 e O-O, com d4 amparado duas vezes.',
          },
        ),
      ],
    },
    {
      /*
        O SETUP INDIANO É A RESPOSTA QUE MUDA O JOGO, não a que o testa: as
        pretas não disputam d5 e vão fianchetar. O erro que ele produz é querer
        atacar um roque que ainda não existe.
      */
      id: 'londres-indiano',
      importancia: 'core',
      eco: 'A45',
      conceitos: ['concept.space-vs-counterplay', 'concept.break-e5', 'concept.bad-bishop'],
      estrutura: 'structure.kid-locked-center',
      erroComum: {
        lance: 'h4',
        porque:
          'Avançar na ala do rei contra um fianchetto ainda não rocado ataca o vazio: as pretas simplesmente não rocam ali, e o peão de h vira fraqueza numa posição em que as brancas já estavam bem.',
      },
      fronteira: { type: 'handoff', planId: 'london-e4' },
      politicaDoLadoInverso:
        'Pelas pretas, demonstra-se ceder o centro por enquanto e preparar ...c5 ou ...e5 contra uma estrutura que não pode avançar depressa.',
      intencaoDoAdversario:
        'Não disputar d5 agora: fianchetar, rocar e só então atacar o centro branco, quando ele já não puder crescer.',
      objetivoDoAluno:
        'Completar a estrutura e escolher a ruptura certa — contra o fianchetto, o centro vale mais que qualquer ataque no flanco.',
      name: 'Estrutura indiana',
      description: 'As pretas não disputam o centro: fianchetam o bispo e atacam depois.',
      rootNodeId: '',
      line: [
        ...londresMain.slice(0, 4),
        lesson(5, 'Bf4', 'O bispo sai da cadeia antes de e3 — é a marca do sistema.', {
          arrows: [{ from: 'c1', to: 'f4' }],
        }),
        lesson(6, 'g6', 'As pretas escolhem o fianchetto em vez de disputar d5 de frente.', {
          strategicIdea: 'Quem cede o centro planeja atacá-lo depois, e não esquecê-lo.',
        }),
        lesson(7, 'e3', 'A cadeia se fecha e o bispo de f1 ganha a diagonal.', {
          resultingPlan: 'c3, Cbd2, Bd3 e O-O; a ruptura e4 vem quando o centro estiver pronto.',
        }),
      ],
    },
    {
      /*
        ...Qb6 É A PERGUNTA MAIS DESCONFORTÁVEL DO SISTEMA, e é por isso que ela
        é core: ela ataca b2 e d4 ao mesmo tempo, e quem decorou a ordem de
        lances descobre aqui que não tem resposta pronta.
      */
      id: 'londres-qb6',
      importancia: 'core',
      eco: 'D02',
      conceitos: ['concept.break-c5', 'concept.material-vs-initiative'],
      estrutura: 'structure.slav-triangle',
      erroComum: {
        lance: 'b3',
        porque:
          'Defender b2 com o peão enfraquece a casa c3 e tira a própria dama do jogo depois. A resposta do sistema é desenvolver: Nc3 ou Qb3 defendem e acrescentam uma peça, em vez de só remendar.',
      },
      fronteira: { type: 'handoff', planId: 'london-e4' },
      politicaDoLadoInverso:
        'Pelas pretas, demonstra-se a pergunta dupla — atacar dois pontos com um lance é o que obriga o adversário a escolher.',
      intencaoDoAdversario:
        'Atacar b2 e d4 no mesmo lance, para que você precise escolher entre defender material e manter o centro.',
      objetivoDoAluno:
        'Responder desenvolvendo: o peão de b2 vale menos que o tempo, e quem defende com peça continua construindo a posição.',
      name: 'Pressão com Dama em b6',
      description:
        'As pretas atacam b2 e d4 com um lance só, antes de completar o desenvolvimento.',
      rootNodeId: '',
      line: [
        ...londresMain.slice(0, 5),
        lesson(
          6,
          'c5',
          'As pretas atacam a base da cadeia em vez do topo, preparando a pressão da dama sobre b2 e d4 ao mesmo tempo.',
          {
            highlights: ['d4'],
            strategicIdea: 'Atacar a base é o golpe padrão contra um centro apoiado em d4.',
          },
        ),
        lesson(
          7,
          'e3',
          'O centro é sustentado com peão, como o sistema prevê, e a diagonal do bispo de f1 abre.',
          { resultingPlan: 'c3 e Cbd2, com d4 amparado duas vezes.' },
        ),
        lesson(8, 'Qb6', 'Agora a dama ataca b2 e reforça a pressão sobre d4.', {
          highlights: ['b2', 'd4'],
          strategicIdea: 'Dois alvos num lance só: a resposta precisa servir aos dois.',
        }),
        lesson(9, 'Nc3', 'Defender desenvolvendo — a peça entra e b2 deixa de ser de graça.', {
          resultingPlan: 'Bd3, O-O e a decisão de quando romper com e4.',
        }),
      ],
    },
    {
      id: 'londres-bf5',
      importancia: 'secondary',
      intencaoDoAdversario:
        'Jogar o seu próprio sistema contra você, tirando o bispo da cadeia antes de e6.',
      objetivoDoAluno:
        'Consolidar o centro e usar o tempo a mais na escolha da ruptura, não em ataque.',
      name: 'Bispo por f5',
      description: 'As pretas jogam o Londres contra você e desenvolvem o bispo antes de e6.',
      rootNodeId: '',
      line: [
        ...londresMain.slice(0, 5),
        lesson(
          6,
          'Bf5',
          'As pretas tiram o bispo da cadeia antes de jogar e6 — a mesma ideia que o seu Bf4 teve.',
          {
            strategicIdea:
              'Posição quase simétrica, com um tempo a mais para você. Não procure vantagem: desenvolva.',
          },
        ),
        lesson(
          7,
          'e3',
          'Consolide o centro. O tempo a mais aparece depois, na escolha da ruptura, e não agora.',
          {
            resultingPlan: 'Bd3 para trocar o bispo ativo delas, depois O-O e c4.',
          },
        ),
      ],
    },
  ],
  plans: [
    {
      id: 'londres-troca-do-bispo',
      name: 'Trocar o bispo ativo delas',
      positionNodeId: 'root',
      positionPly: 4,
      objective: 'Pôr o bispo em d3 para trocar o bispo preto que saiu da cadeia.',
      when: 'Sempre que as pretas jogarem ...Bf5 antes de ...e6.',
      risk: 'Trocar por trocar: sem o bispo preto ativo na diagonal, d3 é só um lance a mais.',
      porQueFunciona:
        'O bispo de casas claras é a peça que as duas defesas tentam resolver. Quem troca o bispo bom do adversário fica com a posição igual e um problema a menos — e num sistema, um problema a menos é a vantagem inteira.',
      preparacao:
        'O peão em e3 já jogado, para que d3 não bloqueie o próprio bispo de c1 antes de ele ter saído.',
      oQueOAdversarioTenta:
        'Recuar o bispo para g6 ou g4 em vez de trocar, mantendo a peça ativa e obrigando você a decidir de novo.',
      arrows: [{ from: 'f1', to: 'd3' }],
    },
    {
      id: 'londres-cadeia',
      name: 'Sustentar a cadeia c3-d4-e3',
      positionNodeId: 'root',
      positionPly: 6,
      objective: 'Manter d4 amparado duas vezes para que nenhuma pressão obrigue a trocar.',
      when: 'Contra ...c5 e ...Qb6, que atacam a base em vez do topo.',
      risk: 'Sustentar para sempre: a cadeia existe para permitir a ruptura, não para substituí-la.',
      porQueFunciona:
        'O Sistema Londres monta a mesma estrutura contra quase tudo, e ela só vale enquanto d4 não cai. Com c3 e e3, nenhuma troca em d4 é forçada — e quem não é forçado a trocar escolhe a hora.',
      preparacao:
        'Nada além da própria ordem do sistema. É esse o ponto: a estrutura vem antes da pergunta, e por isso a resposta já está pronta.',
      oQueOAdversarioTenta:
        'Somar atacantes sobre d4 — ...c5, ...Qb6, ...Nc6 — até que uma troca se torne obrigatória e o centro se desfaça.',
    },
    {
      id: 'london-e4',
      name: 'Ruptura e4',
      positionNodeId: 'root',
      positionPly: 6,
      objective: 'Expandir no centro quando as peças estão prontas.',
      when: 'Após o roque e desenvolvimento.',
      risk: 'Fechar o bispo sem necessidade.',
      arrows: [{ from: 'e2', to: 'e4' }],
      porQueFunciona:
        'O Londres monta a mesma estrutura contra quase tudo; e4 é o lance que transforma solidez em espaço, abrindo a diagonal do bispo de d3 e a coluna e.',
      preparacao:
        'Peão em e3, bispo já fora da cadeia em f4, cavalos em f3 e d2 e o rei rocado. O cavalo de d2 existe justamente para apoiar e4.',
      oQueOAdversarioTenta:
        'Ocupar e4 primeiro com um cavalo, ou fixar o centro com c5 e Nc6 para que o avanço nunca aconteça sem concessão.',
      /*
        SEM MICRODECISÃO, E ESTE É O CASO QUE PROVA A REGRA. Na posição que
        ilustra o plano, e2-e4 é LEGAL e é um peão perdido: d5 e o cavalo de f6
        já vigiam a casa, e o Londres joga e3 primeiro por isso. Uma
        implementação que transformasse a seta em pergunta ensinaria aqui um erro
        de material — sem que nada na tela avisasse.
      */
    },
  ],
  structures: [
    {
      name: 'Cadeia do Londres',
      description: 'Peões em d4/e3 sustentam um desenvolvimento sólido.',
      pawnBreaks: ['c4', 'e4'],
      weakSquares: ['e5'],
      openFiles: ['c'],
    },
  ],
  mistakes: [
    {
      id: 'london-bispo',
      nodeId: 'root',
      positionPly: 2,
      moveSan: 'e3',
      explanation: 'Fechar o bispo antes de Bf4 perde a principal ideia do sistema.',
      principle: 'Desenvolva o bispo de c1 antes de fechar a diagonal.',
    },
  ],
  version: 1,
})

const eslavaMain = [
  lesson(1, 'd4', 'As brancas ocupam o centro.'),
  lesson(2, 'd5', 'As pretas respondem no centro.'),
  lesson(3, 'c4', 'As brancas pressionam d5.'),
  lesson(4, 'c6', 'Sustente d5 e mantenha o bispo livre.', {
    arrows: [{ from: 'c7', to: 'c6' }],
    resultingPlan: 'Cf6, Af5 e e6 ou dxc4 conforme a posição.',
  }),
  lesson(5, 'Nf3', 'Desenvolvimento natural.'),
  lesson(6, 'Nf6', 'Controle e4 e prepare o roque.'),
]

const slav = course({
  id: 'defesa-eslava',
  slug: 'defesa-eslava',
  name: 'Defesa Eslava',
  side: 'black',
  ecoCodes: ['D10'],
  description: 'Uma defesa firme que sustenta d5 com c6 e mantém o bispo de c8 livre.',
  philosophy: 'Estrutura sólida sem prender o bispo, seguida de desenvolvimento e ruptura.',
  difficulty: 2,
  prerequisites: [],
  tags: ['solid', 'positional'],
  transitionToMiddlegame:
    'A estrutura c6/d5 define a posição. Depois do desenvolvimento, jogue pelas rupturas e não pela memorização.',
  mainline: eslavaMain,
  variations: [
    {
      id: 'eslava-cc3',
      importancia: 'core',
      eco: 'D15',
      conceitos: ['concept.bad-bishop', 'concept.space-vs-counterplay', 'concept.break-c5'],
      estrutura: 'structure.slav-triangle',
      erroComum: {
        lance: 'e6',
        porque:
          'Jogar ...e6 cedo tranca o bispo de c8 atrás da cadeia — e a Eslava existe justamente para não fazer isso. Quem quer a estrutura com ...e6 está jogando a Ortodoxa, e ali o peão de c fica em c7.',
      },
      fronteira: { type: 'handoff', planId: 'slava-bispo' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se pressionar antes de o bispo sair: cada lance preto gasto com peões é um tempo de desenvolvimento a mais.',
      intencaoDoAdversario: 'Desenvolver pelo lado da dama mantendo o centro sem definição.',
      objetivoDoAluno: 'Responder com o lance da linha principal: a posição não pede teoria nova.',
      name: 'Desenvolvimento com Cc3',
      description: 'As brancas desenvolvem pelo outro lado antes de tocar no centro.',
      rootNodeId: '',
      line: [
        ...eslavaMain.slice(0, 4),
        lesson(
          5,
          'Nc3',
          'Outra ordem de lances, e ela é tão comum quanto Cf3. O centro continua sem definição.',
          {
            strategicIdea:
              'Ordem diferente não é linha diferente: responda pelo plano, não pela memória.',
          },
        ),
        lesson(
          6,
          'Nf6',
          'Desenvolva e controle e4, o mesmo lance da linha principal. Nada aqui pede teoria nova.',
          {
            resultingPlan: 'dxc4 ou Af5 conforme as brancas se comprometam com e3.',
          },
        ),
      ],
    },
    {
      /*
        A LINHA PRINCIPAL DA ESLAVA É ESTA: capturar em c4 DEPOIS de ter tirado o
        bispo. A ordem é a defesa inteira — trocada, ela vira uma Ortodoxa com um
        tempo a menos.
      */
      id: 'eslava-principal',
      importancia: 'core',
      eco: 'D17',
      conceitos: ['concept.bad-bishop', 'concept.material-vs-initiative', 'concept.break-c5'],
      estrutura: 'structure.slav-triangle',
      motivos: ['motif.fork-on-d5'],
      erroComum: {
        lance: 'b5',
        porque:
          'Tentar segurar o peão de c4 com ...b5 enfraquece a5 e c6 e convida a4 com ataque. O peão é devolvido: o que a captura comprou foi o tempo de tirar o bispo, e não material.',
      },
      fronteira: { type: 'handoff', planId: 'slava-bispo' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se recuperar c4 sem pressa e usar o tempo em desenvolvimento, não em perseguir o peão.',
      intencaoDoAdversario:
        'Recuperar o peão de c4 com tempo e provar que o bispo em f5 ficou exposto a Bd3 ou a Qb3.',
      objetivoDoAluno:
        'Capturar em c4 só depois de o bispo estar fora: a captura compra o tempo de ...Bf5, e é esse tempo que a defesa existe para ganhar.',
      name: 'Eslava Principal',
      description: 'As pretas capturam em c4 e tiram o bispo de c8 antes de fechar a cadeia.',
      rootNodeId: '',
      line: [
        ...eslavaMain,
        lesson(
          7,
          'Nc3',
          'As brancas completam o desenvolvimento natural e somam mais um defensor ao peão de c4.',
          { resultingPlan: 'e3 e Bxc4, recuperando o peão com desenvolvimento.' },
        ),
        lesson(
          8,
          'dxc4',
          'A captura compra o tempo de tirar o bispo de c8 — ela não é ganho de material, é troca de moeda.',
          {
            strategicIdea: 'O peão volta. O tempo, não.',
            resultingPlan: '...Bf5 antes de ...e6: é essa ordem que define a Eslava.',
          },
        ),
        lesson(
          9,
          'a4',
          'As brancas impedem ...b5 e preparam a recuperação do peão sem perseguição inútil.',
          { strategicIdea: 'Recuperar material sem pressa vale mais que recuperá-lo com a dama.' },
        ),
        lesson(10, 'Bf5', 'O bispo sai da cadeia. É este lance que a defesa inteira preparou.', {
          arrows: [{ from: 'c8', to: 'f5' }],
          resultingPlan: '...e6 agora é seguro, e a ruptura ...c5 vem com todas as peças no jogo.',
        }),
      ],
    },
    {
      /*
        A ESTRUTURA COM ...a6 é a Eslava moderna: ela prepara ...b5 antes de
        qualquer captura, e muda a pergunta de "quando capturar" para "quando
        avançar". Entra como `secondary` porque o curso já tem quatro core.
      */
      id: 'eslava-a6',
      importancia: 'secondary',
      eco: 'D15',
      intencaoDoAdversario:
        'Ocupar o centro enquanto as pretas gastam um lance de peão na ala da dama.',
      objetivoDoAluno:
        'Preparar ...b5 com apoio: o peão de c4 passa a ser difícil de recuperar sem concessão.',
      name: 'Estrutura com a6',
      description: 'As pretas preparam ...b5 antes de decidir sobre a captura em c4.',
      rootNodeId: '',
      line: [
        ...eslavaMain,
        lesson(
          7,
          'Nc3',
          'Desenvolvimento natural das brancas, somando um defensor ao peão de c4.',
          { resultingPlan: 'e3 e Bxc4 quando as pretas se decidirem.' },
        ),
        lesson(
          8,
          'a6',
          'O peão prepara ...b5 antes de qualquer captura, e muda a pergunta que as brancas enfrentam.',
          {
            strategicIdea: 'Em vez de quando capturar, a pergunta passa a ser quando avançar.',
            resultingPlan: '...dxc4 seguido de ...b5, agora com apoio.',
          },
        ),
      ],
    },
    {
      id: 'eslava-troca',
      importancia: 'core',
      eco: 'D10',
      conceitos: ['concept.open-file', 'concept.space-vs-counterplay'],
      estrutura: 'structure.carlsbad',
      erroComum: {
        lance: 'Qxd5',
        porque:
          'Recapturar com a dama entrega o tempo a Nc3 e abandona a coluna c que a recaptura de peão abriria. Na Eslava, é sempre o peão de c6 que recaptura — é essa a diferença para a Ortodoxa.',
      },
      fronteira: { type: 'handoff', planId: 'slava-bispo' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se que simetria não é empate: quem desenvolve com propósito e ocupa a coluna primeiro joga melhor.',
      intencaoDoAdversario:
        'Resolver a tensão cedo e buscar uma posição simétrica e pobre em alvos.',
      objetivoDoAluno:
        'Recapturar com o peão de c6, abrir a coluna c e manter o bispo com saída por f5.',
      name: 'Variante da Troca',
      description: 'As brancas trocam em d5 e a estrutura fica simétrica desde o quinto lance.',
      rootNodeId: '',
      line: [
        ...eslavaMain.slice(0, 4),
        lesson(
          5,
          'cxd5',
          'As brancas resolvem a tensão cedo. A posição fica simétrica e pobre em alvos.',
          {
            strategicIdea:
              'Simetria não é empate: quem desenvolver com mais propósito joga melhor.',
          },
        ),
        lesson(
          6,
          'cxd5',
          'Recapture com o peão de c6: a coluna c abre e o bispo de c8 continua com saída por f5.',
          {
            resultingPlan: 'Cc6, Cf6, Af5 e e6, com as torres pela coluna c.',
          },
        ),
      ],
    },
  ],
  plans: [
    {
      id: 'eslava-coluna-c',
      name: 'Ocupar a coluna c',
      positionNodeId: 'root',
      positionPly: 4,
      objective: 'Levar a torre a c8 e pressionar a coluna que a recaptura abriu.',
      when: 'Depois de qualquer troca em d5 recapturada com o peão de c6.',
      risk: 'Abrir a coluna e deixar o adversário chegar primeiro: a estrada serve a quem a ocupa.',
      porQueFunciona:
        'A recaptura com o peão de c é o que distingue a Eslava. Ela abre uma coluna para a torre preta sem criar fraqueza nenhuma, e a torre em c8 pressiona c4 e c3 ao mesmo tempo.',
      preparacao:
        'O bispo de c8 já resolvido e o cavalo fora de c6, para que a torre veja a coluna inteira.',
      oQueOAdversarioTenta:
        'Disputar a coluna com a própria torre, ou trocar tudo nela e ir para um final igual.',
    },
    {
      id: 'eslava-ruptura-c5',
      name: 'A ruptura ...c5',
      positionNodeId: 'root',
      positionPly: 4,
      objective: 'Atacar a base do centro branco depois de completar o desenvolvimento.',
      when: 'Com o bispo de c8 resolvido e o rei rocado.',
      risk: 'Romper com o bispo ainda preso: a posição abre a favor de quem tem mais peças no jogo.',
      porQueFunciona:
        'O peão de c6 ocupa a casa que a ruptura precisa, então ...c5 sempre custa um tempo a mais na Eslava do que em outras defesas. Em troca, ele chega quando as pretas já resolveram o problema que as outras defesas ainda têm.',
      preparacao:
        'Bispo fora da cadeia, rei rocado e a torre já apontando para c: sem isso, a ruptura só abre linhas para o adversário.',
      oQueOAdversarioTenta:
        'Fixar o centro com e3 e Bd3 para que ...c5 nunca venha sem concessão, ou avançar d5 antes.',
      arrows: [{ from: 'c6', to: 'c5' }],
    },
    {
      id: 'slava-bispo',
      name: 'Bispo fora da cadeia',
      positionNodeId: 'root',
      positionPly: 5,
      objective: 'Desenvolver o bispo antes de e6.',
      when: 'Quando a estrutura permite Af5 ou Ag4.',
      risk: 'Deixar a dama sair cedo para defender peões.',
      arrows: [{ from: 'c8', to: 'f5' }],
      porQueFunciona:
        'c6 sustenta d5 sem fechar a diagonal c8-h3. É a vantagem estrutural da Eslava sobre a Ortodoxa, e ela só se realiza se o bispo sair antes de e6.',
      preparacao:
        'O peão de e ainda em e7, e atenção a b7: com o bispo fora da casa inicial, a diagonal a4-e8 e o peão de b7 ficam mais expostos.',
      oQueOAdversarioTenta:
        'Jogar cxd5 seguido de Qb3 mirando b7 e d5, ou avançar e3 e Bd3 para trocar o bispo assim que ele aparecer em f5.',
      /*
        SEM MICRODECISÃO: na posição desta linha o lance do repertório é Nf6, e
        não o bispo. Perguntar pelo bispo ali cobraria um lance que a própria
        linha principal não joga.
      */
    },
  ],
  structures: [
    {
      name: 'Estrutura eslava',
      description: 'c6 sustenta d5 e preserva o bispo da dama.',
      pawnBreaks: ['e5', 'c5'],
      weakSquares: ['e5'],
      openFiles: ['c'],
    },
  ],
  mistakes: [
    {
      id: 'slava-dama',
      nodeId: 'root',
      positionPly: 5,
      moveSan: 'Qb6',
      explanation: 'A dama cedo vira alvo de desenvolvimento.',
      principle: 'Use peões e peças menores para disputar o centro.',
    },
  ],
  version: 1,
})

const ruyLopez = course({
  id: 'ruy-lopez',
  slug: 'ruy-lopez',
  name: 'Abertura Espanhola',
  side: 'white',
  ecoCodes: ['C60', 'C65', 'C68', 'C80', 'C84'],
  description:
    'A abertura clássica do jogo aberto: pressão permanente sobre e5, roque rápido e a manobra que prepara d4.',
  philosophy:
    'Atacar quem defende, não o que está defendido. A pressão sobre c6 dura a partida inteira.',
  difficulty: 3,
  prerequisites: ['italiana'],
  tags: ['open', 'positional', 'classical'],
  transitionToMiddlegame:
    'A abertura termina quando as duas partes rocaram e a ruptura d4 está preparada por c3. A partir daí a pergunta deixa de ser qual lance e passa a ser em que ala jogar.',
  mainline: ruyMain,
  /*
    ESTE CURSO NASCE COM DOIS RAMOS, E A AUSÊNCIA DOS OUTROS É DECISÃO.

    O §15 lista também a Variante Aberta e a Steinitz Moderna. Elas foram
    escritas e REMOVIDAS desta entrega por um portão: o do sparring, que exige
    que o bot alcance toda variação autorada em poucas rodadas — "variação que o
    bot nunca joga é decoração".

    A linha principal da Espanhola tem dez plies e vários pontos de bifurcação, e
    essas duas desviam no oitavo e no décimo lance. O bot escolhe entre as
    continuações conhecidas com um sorteio determinístico; alcançar um desvio tão
    fundo exigiria que ele acertasse a principal em todos os pontos anteriores.

    TENTEI CONSERTAR O BOT E PIOREI: contar pontos de bifurcação pelo histórico
    conta os dois lados, e o bot só decide nos lances dele — a mudança quebrou a
    alcançabilidade de cinco ramos que já funcionavam. Revertida.

    O conteúdo é que se adapta. As duas linhas voltam quando a seleção do bot
    souber percorrer os desvios sistematicamente, e isso é entrega própria.
  */
  variations: [
    {
      /*
        A BERLIM É CORE PORQUE ELA É A RESPOSTA QUE MAIS MUDA O JOGO. Ela não
        pergunta ao bispo: ataca e4 e convida à troca de damas. Quem só estudou
        a Morphy chega ao quarto lance sem plano nenhum.
      */
      id: 'ruy-berlim',
      importancia: 'core',
      eco: 'C65',
      conceitos: ['concept.bishop-pair', 'concept.space-vs-counterplay', 'concept.open-file'],
      estrutura: 'structure.open-center',
      erroComum: {
        lance: 'Nxe5',
        porque:
          'Capturar em e5 antes de trocar em c6 devolve tudo: ...Qe7 ou ...Nxe4 recuperam o material com as pretas melhor desenvolvidas. Na Espanhola, o peão de e5 só cai depois de o defensor sair.',
      },
      fronteira: { type: 'handoff', planId: 'ruy-d4' },
      politicaDoLadoInverso:
        'Pelas pretas, demonstra-se aceitar a estrutura danificada em troca do par de bispos e de um final sólido.',
      intencaoDoAdversario:
        'Atacar e4 de imediato e forçar um jogo em que as damas saem cedo e a estrutura vale mais que a iniciativa.',
      objetivoDoAluno:
        'Trocar em c6 no momento certo e usar a maioria de peões da ala do rei, sem esperar ataque rápido.',
      name: 'Defesa Berlim',
      description: 'As pretas atacam e4 no terceiro lance em vez de perguntar ao bispo.',
      rootNodeId: '',
      line: [
        ...ruyMain.slice(0, 5),
        lesson(6, 'Nf6', 'As pretas ignoram o bispo e atacam e4 diretamente.', {
          highlights: ['e4'],
          strategicIdea:
            'Quem não pergunta ao bispo aceita outra partida: mais estrutura, menos ataque.',
        }),
        lesson(
          7,
          'O-O',
          'As brancas rocam e deixam e4 de lado — a captura custa tempo às pretas.',
          {
            resultingPlan: 'Te1 e d4 depois de a estrutura se definir.',
          },
        ),
        lesson(8, 'Nxe4', 'As pretas aceitam o peão, e agora a troca em c6 ganha sentido.', {
          strategicIdea: 'O peão volta. O que fica é a estrutura.',
        }),
      ],
    },
    {
      /*
        A TROCA É A LIÇÃO DE ESTRUTURA DO CURSO. Ela entrega o par de bispos de
        graça e ganha uma maioria sã na ala do rei — a conta que decide se um
        final é bom ou ruim.
      */
      id: 'ruy-troca',
      importancia: 'core',
      eco: 'C68',
      conceitos: ['concept.bishop-pair', 'concept.backward-pawn', 'concept.space-vs-counterplay'],
      estrutura: 'structure.open-center',
      erroComum: {
        lance: 'Nxe5',
        porque:
          'Capturar logo depois da troca parece ganhar um peão e perde a vantagem: ...Qd4 recupera o material com garfo sobre o cavalo e e4. A troca em c6 prepara o final, não um golpe imediato.',
      },
      fronteira: { type: 'handoff', planId: 'ruy-maioria' },
      politicaDoLadoInverso:
        'Pelas pretas, demonstra-se usar o par de bispos antes que o final chegue: num centro aberto eles valem mais que a estrutura.',
      intencaoDoAdversario:
        'Ficar com os dois bispos e abrir a posição antes de o final chegar, quando a estrutura ainda não decide.',
      objetivoDoAluno:
        'Trocar peças e chegar a um final com quatro peões contra três na ala do rei — a maioria sã contra a maioria dobrada.',
      name: 'Variante da Troca',
      description: 'As brancas trocam em c6 e apostam na estrutura em vez da iniciativa.',
      rootNodeId: '',
      line: [
        ...ruyMain.slice(0, 6),
        lesson(
          7,
          'Bxc6',
          'O bispo é entregue para danificar a estrutura preta de forma permanente.',
          {
            arrows: [{ from: 'a4', to: 'c6' }],
            strategicIdea: 'Par de bispos por estrutura: a conta fecha no final, e não agora.',
          },
        ),
        lesson(8, 'dxc6', 'As pretas recapturam abrindo a diagonal do bispo de c8.', {
          resultingPlan: 'Os bispos compensam enquanto houver peças no tabuleiro.',
        }),
        lesson(9, 'O-O', 'O rei sai do meio antes de qualquer troca no centro.', {
          resultingPlan: 'd4 e trocas: cada peça fora aproxima o final da maioria sã.',
        }),
      ],
    },
  ],
  plans: [
    {
      id: 'ruy-d4',
      name: 'A ruptura d4 preparada por c3',
      positionNodeId: 'root',
      positionPly: 9,
      objective: 'Montar o centro com c3 e d4 depois de o rei estar seguro.',
      when: 'Com o roque feito e a torre já em e1.',
      risk: 'Romper antes de c3: sem apoio, a troca em d4 entrega o centro que a abertura construiu.',
      porQueFunciona:
        'A Espanhola gasta cinco lances construindo pressão sobre e5 sem ganhar nada de imediato. O d4 é a cobrança: quando ele vem com c3 sustentando, o centro preto precisa ceder ou trocar em condições piores.',
      preparacao:
        'Rei rocado, torre em e1 e o peão em c3. Sem c3, a recaptura em d4 fica com a dama e o tempo se perde.',
      oQueOAdversarioTenta:
        'Ganhar espaço na ala da dama com ...b5 e ...Na5 para trocar o bispo, ou fixar o centro com ...d6 antes de o avanço vir.',
      arrows: [
        { from: 'c2', to: 'c3' },
        { from: 'd2', to: 'd4' },
      ],
    },
    {
      id: 'ruy-manobra',
      name: 'Manobra Cb1-d2-f1-g3',
      positionNodeId: 'root',
      positionPly: 9,
      objective: 'Levar o cavalo da dama à ala do rei sem abrir a posição.',
      when: 'Em estruturas fechadas, depois de c3 e antes de d4.',
      risk: 'Manobrar com o centro já aberto: três lances com um cavalo é um luxo que a posição aberta não permite.',
      porQueFunciona:
        'O cavalo de b1 é a peça mais lenta da Espanhola, e em g3 ele vigia e4, f5 e h5. É a manobra que dá nome ao plano clássico, e ela só é possível porque o centro travado dá tempo.',
      preparacao:
        'O centro sustentado por c3 e d3 ou d4 fechado; sem isso, a manobra deixa o rei sem defensores no pior momento.',
      oQueOAdversarioTenta:
        'Abrir o centro justamente durante a manobra, ou avançar na ala da dama enquanto as peças brancas viajam para o outro lado.',
      arrows: [
        { from: 'b1', to: 'd2' },
        { from: 'd2', to: 'f1' },
      ],
    },
    {
      id: 'ruy-maioria',
      name: 'A maioria sã no final',
      positionNodeId: 'root',
      positionPly: 6,
      objective: 'Trocar peças e usar quatro peões contra três na ala do rei.',
      when: 'Depois da troca em c6, quando a estrutura preta ficou com peões dobrados.',
      risk: 'Trocar tudo com os bispos pretos ainda ativos: eles compensam a estrutura enquanto houver peças.',
      porQueFunciona:
        'Os peões dobrados em c não produzem um peão passado na ala da dama; a maioria branca na ala do rei produz. O final é ganho de material sem ganho de material — é a estrutura que decide.',
      preparacao:
        'Os bispos pretos neutralizados, por troca ou por peões nas casas certas. Com eles ativos, o final ainda não chegou.',
      oQueOAdversarioTenta:
        'Evitar trocas, abrir diagonais para os dois bispos e criar jogo antes que a estrutura passe a mandar.',
    },
  ],
  structures: [
    {
      name: 'Centro espanhol',
      description:
        'Peões brancos em e4 e c3 preparando d4, contra peões pretos em e5 e d6. O espaço é branco; a solidez, preta.',
      pawnBreaks: ['d4', 'f5'],
      weakSquares: ['d5', 'f5'],
      openFiles: ['e'],
    },
  ],
  mistakes: [
    {
      id: 'ruy-erro-captura-cedo',
      nodeId: 'root',
      /*
        A POSIÇÃO É DEPOIS DE ...a6, E O PORTÃO ME OBRIGOU A ACERTAR DUAS VEZES.

        Eu tinha escrito "trocar em c6 antes de ...a6" — que é IMPOSSÍVEL: nessa
        posição é a vez das pretas, e as brancas teriam de jogar dois lances
        seguidos. O portão de legalidade pegou.

        O erro real desta abertura é o oposto: capturar em e5 ANTES de tirar o
        defensor. É o que faz um iniciante perder uma peça na Espanhola.
      */
      positionPly: 6,
      moveSan: 'Nxe5',
      explanation:
        'Capturar em e5 antes de trocar em c6 perde uma peça: o cavalo de c6 simplesmente recaptura, e o bispo de b5 não compensa nada.',
      principle:
        'Numa abertura que ataca o DEFENSOR, a ordem é tudo: tire o defensor primeiro, capture depois.',
    },
  ],
  version: 1,
})

const french = course({
  id: 'francesa',
  slug: 'francesa',
  name: 'Defesa Francesa',
  side: 'black',
  ecoCodes: ['C00', 'C01', 'C03', 'C11', 'C15'],
  description:
    'Uma defesa sólida contra 1.e4: centro disputado de frente, cadeia de peões e um plano claro de ruptura.',
  philosophy:
    'Aceitar menos espaço em troca de um centro sem fraquezas, e atacar a base da cadeia em vez do topo.',
  difficulty: 2,
  prerequisites: [],
  tags: ['semi-open', 'positional', 'closed'],
  transitionToMiddlegame:
    'A abertura termina quando a pressão sobre d4 está montada e as brancas precisam decidir entre sustentar, trocar ou avançar. A partir daí a pergunta é o que fazer com o bispo de c8.',
  mainline: francesaMain,
  variations: [
    {
      /*
        A TARRASCH É A LINHA MAIS COMUM DEPOIS DA AVANÇADA e a que mais confunde:
        `3.Cd2` parece passivo e é flexível. Ela é core porque o aluno precisa
        saber que existe uma resposta que NÃO trava o centro.
      */
      id: 'francesa-tarrasch',
      importancia: 'core',
      eco: 'C03',
      conceitos: ['concept.iqp', 'concept.break-c5', 'concept.bad-bishop'],
      estrutura: 'structure.iqp',
      motivos: ['motif.pin-on-d-file'],
      erroComum: {
        lance: 'Bb4+',
        porque:
          'A cravada não existe aqui: com o cavalo em d2 e não em c3, o bispo em b4 não crava nada e ainda pode ser expulso com c3 ganhando tempo. A resposta certa é atacar o centro com ...c5.',
      },
      fronteira: { type: 'handoff', planId: 'francesa-c5' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se escolher a flexibilidade: o cavalo em d2 não bloqueia o peão de c e mantém o centro em aberto.',
      intencaoDoAdversario:
        'Desenvolver sem travar o peão de c, mantendo a opção de trocar no centro e jogar contra um peão isolado depois.',
      objetivoDoAluno:
        'Atacar o centro imediatamente com ...c5: contra a Tarrasch, o tempo vale mais que a estrutura.',
      name: 'Variante Tarrasch',
      description: 'As brancas desenvolvem o cavalo em d2 e mantêm o centro flexível.',
      rootNodeId: '',
      line: [
        ...francesaMain.slice(0, 4),
        lesson(
          5,
          'Nd2',
          'O cavalo vai para d2 em vez de c3: ele não bloqueia o peão de c e evita a cravada.',
          {
            strategicIdea: 'Lance modesto, ideia flexível: o centro não fecha.',
            resultingPlan: 'exd5 ou e5 depois, conforme as pretas se comprometam.',
          },
        ),
        lesson(
          6,
          'c5',
          'As pretas atacam o centro de imediato, antes que as brancas escolham a estrutura.',
          {
            arrows: [{ from: 'c7', to: 'c5' }],
            resultingPlan:
              'A partida costuma chegar a um peão isolado — e ele é jogável dos dois lados.',
          },
        ),
      ],
    },
    {
      /*
        A WINAWER É A LINHA MAIS AFIADA DA DEFESA: as pretas entregam o par de
        bispos para danificar a estrutura branca. Ela é core porque ensina a
        conta que aparece em toda a Francesa — estrutura contra bispos.
      */
      id: 'francesa-winawer',
      importancia: 'core',
      eco: 'C15',
      conceitos: ['concept.bishop-pair', 'concept.backward-pawn', 'concept.break-c5'],
      estrutura: 'structure.french-chain',
      erroComum: {
        lance: 'Nf6',
        porque:
          'Desenvolver o cavalo aqui permite Bg5 com pressão e devolve a iniciativa: a Winawer existe justamente porque ...Bb4 pergunta ao cavalo de c3 ANTES de as brancas se organizarem.',
      },
      fronteira: { type: 'handoff', planId: 'francesa-c5' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se aceitar os peões dobrados em troca do par de bispos e do espaço no centro.',
      intencaoDoAdversario:
        'Ocupar o centro com o cavalo em c3 e desenvolver naturalmente, sem conceder estrutura.',
      objetivoDoAluno:
        'Cravar o cavalo que sustenta e4 e forçar uma decisão: ou as brancas quebram a própria estrutura, ou perdem o centro.',
      name: 'Variante Winawer',
      description: 'As pretas cravam o cavalo de c3 e aceitam entregar o par de bispos.',
      rootNodeId: '',
      line: [
        ...francesaMain.slice(0, 4),
        lesson(
          5,
          'Nc3',
          'O cavalo defende e4 e ocupa a casa natural de desenvolvimento — mas fica preso à defesa do centro.',
          {
            highlights: ['e4'],
            resultingPlan: 'e5 ou Bg5 depois, conforme as pretas se comprometam.',
          },
        ),
        lesson(
          6,
          'Bb4',
          'A cravada: o cavalo que defende e4 fica preso, e as brancas precisam escolher.',
          {
            arrows: [{ from: 'f8', to: 'b4' }],
            strategicIdea: 'Atacar o defensor do centro vale mais que atacar o centro.',
            resultingPlan:
              'Depois de a4 e Bxc3, a estrutura branca fica danificada de forma permanente.',
          },
        ),
      ],
    },
    {
      /*
        A TROCA É A LINHA QUE PARECE MORTA E NÃO É. Ela some com a tensão e com
        o problema do bispo — e por isso é core: o aluno precisa saber que a
        Francesa também produz posições simétricas, e como jogá-las.
      */
      id: 'francesa-troca',
      importancia: 'core',
      eco: 'C01',
      conceitos: ['concept.open-file', 'concept.space-vs-counterplay'],
      estrutura: 'structure.open-center',
      erroComum: {
        lance: 'Qxd5',
        porque:
          'Recapturar com a dama entrega o tempo a Cc3 e não resolve nada: é o peão de e6 que recaptura, e com ele o bispo de c8 finalmente ganha uma diagonal.',
      },
      fronteira: { type: 'handoff', planId: 'francesa-bispo' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se que simetria não é empate: quem desenvolve com propósito e ocupa a coluna aberta primeiro joga melhor.',
      intencaoDoAdversario:
        'Tirar a tensão e jogar uma posição simétrica, apostando que a Francesa sem cadeia perde o plano.',
      objetivoDoAluno:
        'Recapturar com o peão de e, soltar o bispo de c8 e disputar a coluna e antes das brancas.',
      name: 'Variante da Troca',
      description: 'As brancas trocam em d5 e a estrutura fica simétrica.',
      rootNodeId: '',
      line: [
        ...francesaMain.slice(0, 4),
        lesson(5, 'exd5', 'As brancas simplificam e a tensão central desaparece.', {
          strategicIdea:
            'Sem cadeia, ninguém tem alvo fixo — e o bispo preso deixa de ser problema.',
        }),
        lesson(6, 'exd5', 'Recapture com o peão de e: é ele que abre a diagonal do bispo de c8.', {
          arrows: [{ from: 'c8', to: 'f5' }],
          resultingPlan: '...Bd6, ...Cf6 e ...O-O, com a coluna e disputada.',
        }),
      ],
    },
    {
      /*
        `secondary`: a Clássica é boa e menos frequente em clube que as três
        acima. Ela entra para o aluno reconhecer a cravada em g5, não para ser
        cobrada no treino.
      */
      id: 'francesa-classica',
      importancia: 'secondary',
      intencaoDoAdversario:
        'Desenvolver com Cc3 e cravar o cavalo de f6, somando pressão sobre d5 antes de decidir o centro.',
      objetivoDoAluno:
        'Escolher entre desfazer a cravada e contra-atacar o centro, sabendo que as duas são jogáveis.',
      name: 'Variante Clássica',
      description: 'As pretas desenvolvem o cavalo e as brancas cravam com Bg5.',
      rootNodeId: '',
      line: [
        ...francesaMain.slice(0, 4),
        lesson(
          5,
          'Nc3',
          'O cavalo defende e4 e abre caminho para Bg5, somando pressão sobre d5 de forma indireta.',
          {
            highlights: ['e4'],
            resultingPlan: 'Bg5 cravando o cavalo, e depois e5 com tempo.',
          },
        ),
        lesson(6, 'Nf6', 'As pretas desenvolvem e somam pressão sobre e4.', {
          strategicIdea: 'Outra forma de perguntar ao centro: com peça, e não com o bispo.',
        }),
        lesson(7, 'Bg5', 'A cravada aumenta a pressão sobre d5 de forma indireta.', {
          resultingPlan: 'e5 depois, expulsando o cavalo com tempo.',
        }),
      ],
    },
  ],
  plans: [
    {
      id: 'francesa-c5',
      name: 'Atacar a base da cadeia',
      positionNodeId: 'root',
      positionPly: 6,
      objective: 'Somar atacantes sobre d4 até que a base da cadeia ceda.',
      when: 'Sempre que as brancas fecharem o centro com e5.',
      risk: 'Trocar em d4 cedo demais: sem atacantes suficientes, a troca só melhora as brancas.',
      porQueFunciona:
        'Uma cadeia de peões só pode ser atacada pela base — o topo está defendido pelo próprio peão de trás. Com ...c5, ...Cc6 e ...Db6, três peças pressionam d4, e as brancas precisam sustentar com peças em vez de peões.',
      preparacao:
        'O cavalo em c6 e a dama em b6 antes de qualquer captura. A pressão da Francesa é cumulativa: ela nunca vem de um lance só.',
      oQueOAdversarioTenta:
        'Sustentar d4 com c3 e Cf3 e, quando a pressão apertar, trocar em c5 para abrir a posição a favor do espaço.',
      arrows: [{ from: 'c7', to: 'c5' }],
    },
    {
      id: 'francesa-bispo',
      name: 'Resolver o bispo de c8',
      positionNodeId: 'root',
      positionPly: 4,
      objective: 'Dar uma diagonal ao bispo que o peão de e6 trancou.',
      when: 'Em toda estrutura da Francesa — é o problema permanente da defesa.',
      risk: 'Gastar lances demais com uma peça e ficar atrasado no resto do desenvolvimento.',
      porQueFunciona:
        'O peão em e6 é o preço da solidez, e ele tranca o bispo de casas claras. As três saídas são ...b6 com ...Ba6, ...Bd7-b5 e a troca depois de ...exd5. Uma peça que não joga é material a menos.',
      preparacao:
        'O centro estável o bastante para gastar dois lances com uma peça. Com a cadeia sob ataque, a ruptura vem antes.',
      oQueOAdversarioTenta:
        'Manter a cadeia fechada para que o bispo nunca encontre diagonal, e trocar as peças ativas pretas.',
    },
    {
      id: 'francesa-f6',
      name: 'A segunda ruptura: ...f6',
      positionNodeId: 'root',
      positionPly: 6,
      objective: 'Atacar o topo da cadeia depois que a base já está pressionada.',
      when: 'Quando ...c5 sozinho não basta e o peão de e5 é o que sufoca a posição.',
      risk: 'Abrir a coluna f com o rei ainda no meio: a ruptura é boa depois do roque, não antes.',
      porQueFunciona:
        'Depois de ...c5, o peão de e5 costuma ficar sustentado só pelo peão de d4 ou por peças. ...f6 ataca esse ponto e devolve espaço às pretas — e a troca em f6 abre a coluna para a torre.',
      preparacao:
        'Rei já rocado e a pressão sobre d4 montada. As duas rupturas juntas são o plano; cada uma sozinha é meia ideia.',
      oQueOAdversarioTenta:
        'Sustentar e5 com f4 e Cf3, ou responder à ruptura com exf6 para deixar o peão de e6 atrasado.',
      arrows: [{ from: 'f7', to: 'f6' }],
    },
  ],
  structures: [
    {
      name: 'Cadeia da Francesa',
      description:
        'Peões brancos em d4 e e5 contra peões pretos em d5 e e6. As brancas têm espaço; as pretas têm um plano de ruptura escrito na própria estrutura.',
      pawnBreaks: ['c5', 'f6', 'f5'],
      weakSquares: ['d4', 'e5'],
      openFiles: ['c', 'f'],
    },
  ],
  mistakes: [
    {
      id: 'francesa-erro-bispo-preso',
      nodeId: 'root',
      /*
        PLY 5, E NÃO 4: depois de quatro lances é a vez das BRANCAS, e ...Bd7 é
        lance preto. O portão de legalidade pegou — um erro comum ancorado na
        vez errada é notação que o aluno não consegue reproduzir.
      */
      positionPly: 5,
      moveSan: 'Bd7',
      explanation:
        'Desenvolver o bispo para d7 antes de decidir a estrutura o deixa numa casa sem futuro: ele bloqueia a própria dama e continua sem diagonal.',
      principle:
        'Na Francesa, o bispo de c8 não se desenvolve — ele se RESOLVE, e a solução depende de como o centro fechar.',
    },
  ],
  version: 1,
})

const sicilianFoundation = course({
  id: 'siciliana-foundation',
  slug: 'siciliana',
  name: 'Defesa Siciliana — Fundamentos',
  side: 'black',
  ecoCodes: ['B20', 'B22', 'B23', 'B50', 'B90'],
  description:
    'O mapa da Siciliana: a Aberta, e o que muda quando as brancas recusam entrar nela com Alapin, Fechada ou Smith-Morra.',
  philosophy:
    'Trocar um peão de flanco por um peão central e jogar por desequilíbrio, não por igualdade.',
  difficulty: 3,
  prerequisites: [],
  tags: ['semi-open', 'sharp', 'asymmetric'],
  transitionToMiddlegame:
    'A abertura termina quando o centro já trocou e as duas partes escolheram as alas. A partir daí a pergunta deixa de ser qual lance e passa a ser quem chega primeiro.',
  mainline: sicilianaMain,
  /*
    ESTE CURSO É UM MAPA, E A AUSÊNCIA DE NAJDORF, DRAGÃO E SVESHNIKOV É A
    DECISÃO CENTRAL DELE (plano de expansão §4 e §16).

    A Siciliana tem mais teoria publicada que qualquer outra abertura. Um curso
    que tentasse cobri-la inteira teria quinze ramos core — e o §3 é explícito:
    "se um curso precisa de 15 branches core, ele está grande demais; criar
    curso filho".

    O Foundation ensina o TERRITÓRIO: o que a Aberta propõe, e o que muda quando
    as brancas recusam entrar nela. Najdorf, Dragão e Sveshnikov são cursos
    próprios, e eles pressupõem este.
  */
  variations: [
    {
      /*
        A ALAPIN É A RECUSA MAIS COMUM EM CLUBE. Ela é core porque quem estudou
        só a Aberta trava no segundo lance — e porque ela ensina a pergunta
        oposta: como jogar contra um centro que NÃO abriu.
      */
      id: 'siciliana-alapin',
      importancia: 'core',
      eco: 'B22',
      conceitos: ['concept.iqp', 'concept.break-d4', 'concept.space-vs-counterplay'],
      estrutura: 'structure.iqp',
      motivos: ['motif.pin-on-d-file'],
      erroComum: {
        lance: 'd6',
        porque:
          'O lance flexível da Aberta é passivo aqui: com c3 jogado, as brancas montam d4 sem trocas e ficam com centro grande de graça. Contra a Alapin, as pretas atacam o centro de imediato com ...d5 ou ...Nf6.',
      },
      fronteira: { type: 'handoff', planId: 'siciliana-centro' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se recusar a Siciliana no próprio terreno: montar d4 com apoio em vez de trocar.',
      intencaoDoAdversario:
        'Preparar d4 com c3 e ficar com um centro de peões grande, sem entregar o peão central que a Siciliana quer trocar.',
      objetivoDoAluno:
        'Atacar o centro antes que ele se complete — com c3 jogado, o cavalo de b1 perdeu a casa natural e as brancas estão um tempo atrás no desenvolvimento.',
      name: 'Variante Alapin',
      description: 'As brancas jogam c3 para montar d4 sem trocar o peão central.',
      rootNodeId: '',
      line: [
        ...sicilianaMain.slice(0, 2),
        lesson(3, 'c3', 'O peão prepara d4 — as brancas recusam a Siciliana Aberta.', {
          arrows: [{ from: 'c2', to: 'c3' }],
          strategicIdea: 'O preço de c3 é a casa do cavalo de b1.',
        }),
        lesson(4, 'Nf6', 'As pretas atacam e4 antes que o centro branco se complete.', {
          highlights: ['e4'],
          resultingPlan: '...d5 depois, aproveitando que o cavalo de b1 não chega a c3.',
        }),
      ],
    },
    {
      /*
        A FECHADA muda a natureza do jogo: sem troca no centro, a Siciliana
        perde o lucro estrutural e ganha uma partida de flanco. Core porque é
        comum e porque exige um plano completamente diferente.
      */
      id: 'siciliana-fechada',
      importancia: 'core',
      eco: 'B23',
      conceitos: ['concept.space-vs-counterplay', 'concept.break-c5', 'concept.king-safety-timing'],
      estrutura: 'structure.kid-locked-center',
      erroComum: {
        lance: 'd5',
        porque:
          'Romper no centro cedo perde material: depois de exd5 nenhuma peça preta recaptura em boas condições, porque o cavalo de c3 já vigia a casa. Contra a Fechada, o jogo é nas alas — não no centro.',
      },
      fronteira: { type: 'handoff', planId: 'siciliana-ala' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se o ataque de flanco: f4, Cf3 e g4, com o centro fechado dando tempo.',
      intencaoDoAdversario:
        'Evitar a troca central e montar um ataque de flanco com f4 e g4, num centro que não abre.',
      objetivoDoAluno:
        'Ganhar espaço na ala da dama com ...Cc6, ...g6 e ...Tb8, e correr do outro lado — quem tem centro fechado joga nas alas.',
      name: 'Siciliana Fechada',
      description: 'As brancas jogam Cc3 e mantêm o centro fechado, mirando um ataque de flanco.',
      rootNodeId: '',
      line: [
        ...sicilianaMain.slice(0, 2),
        lesson(3, 'Nc3', 'O cavalo desenvolve sem preparar d4 — o centro vai ficar fechado.', {
          strategicIdea: 'Sem troca no centro, a partida vira uma corrida nas alas.',
        }),
        lesson(4, 'Nc6', 'As pretas desenvolvem e começam a ocupar a ala da dama.', {
          resultingPlan: '...g6, ...Bg7 e ...Rb8 preparando ...b5.',
        }),
      ],
    },
    {
      /*
        O SMITH-MORRA É O GAMBITO QUE MAIS APARECE CONTRA A SICILIANA EM CLUBE,
        e é core porque quem não sabe o que fazer com um peão a mais perde a
        partida por medo.
      */
      id: 'siciliana-morra',
      importancia: 'core',
      eco: 'B21',
      conceitos: [
        'concept.material-vs-initiative',
        'concept.open-file',
        'concept.king-safety-timing',
      ],
      estrutura: 'structure.open-center',
      motivos: ['motif.pin-on-d-file'],
      erroComum: {
        lance: 'Nf6',
        porque:
          'Desenvolver naturalmente permite e5 com tempo sobre o cavalo, e a iniciativa branca vira ataque real. Contra o Morra, a ordem correta começa por ...d6 e ...a6, tirando as casas que as peças brancas querem.',
      },
      fronteira: { type: 'handoff', planId: 'siciliana-devolver' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se a conta do gambito: dois tempos e duas colunas abertas contra um peão.',
      intencaoDoAdversario:
        'Entregar um peão para abrir as colunas c e d e desenvolver com ameaça antes de você completar o desenvolvimento.',
      objetivoDoAluno:
        'Aceitar sem pânico e devolver o peão no momento certo: segurá-lo custa desenvolvimento, e é o desenvolvimento que decide um centro aberto.',
      name: 'Gambito Smith-Morra',
      description: 'As brancas entregam um peão para abrir colunas e ganhar tempo.',
      rootNodeId: '',
      line: [
        ...sicilianaMain.slice(0, 2),
        lesson(
          3,
          'd4',
          'As brancas abrem o centro de imediato, sem o lance preparatório que a Aberta usa.',
          {
            arrows: [{ from: 'd2', to: 'd4' }],
            resultingPlan: 'c3 depois, oferecendo o peão para abrir a coluna c.',
          },
        ),
        lesson(
          4,
          'cxd4',
          'As pretas aceitam a troca, como sempre — o peão de flanco sai pelo peão central.',
          { strategicIdea: 'Aceitar é correto; o que muda é o que vem depois.' },
        ),
        lesson(5, 'c3', 'Agora o gambito: o peão é oferecido para abrir a coluna c.', {
          strategicIdea: 'Material por iniciativa — a conta fecha se os tempos virarem ataque.',
        }),
        lesson(6, 'd6', 'Antes de desenvolver peças, tirar a casa e5 das brancas.', {
          resultingPlan: '...a6 depois, tirando b5 do bispo, e só então o desenvolvimento.',
        }),
      ],
    },
  ],
  plans: [
    {
      id: 'siciliana-centro',
      name: 'A maioria central',
      positionNodeId: 'root',
      positionPly: 6,
      objective: 'Usar o peão de d contra o peão de e depois da troca em d4.',
      when: 'Em toda linha da Siciliana Aberta, do meio-jogo ao final.',
      risk: 'Esquecer que a maioria só vale se as peças sobreviverem: um ataque branco rápido a torna irrelevante.',
      porQueFunciona:
        'A troca do peão de c pelo peão de d deixa as pretas com dois peões centrais contra um. É uma vantagem pequena e permanente — ela não ganha a partida, mas decide muitos finais.',
      preparacao:
        'Rei seguro e a coluna c ocupada. A maioria é um ativo de longo prazo; sem sobreviver ao meio-jogo, ela não chega a existir.',
      oQueOAdversarioTenta:
        'Atacar antes que o final chegue, tipicamente com e5, f4 e peças na ala do rei.',
    },
    {
      id: 'siciliana-ala',
      name: 'A corrida nas alas',
      positionNodeId: 'root',
      positionPly: 6,
      objective: 'Avançar na ala da dama com ...b5 e ...a5 enquanto as brancas avançam na do rei.',
      when: 'Sempre que os reis rocarem em lados opostos ou o centro travar.',
      risk: 'Abrir a própria ala antes de chegar: numa corrida, um tempo perdido é a partida.',
      porQueFunciona:
        'Com o centro fechado ou trocado, os peões das alas viram a única moeda. A Siciliana dá às pretas a coluna c aberta e a maioria na ala da dama — as duas apontam para o mesmo lado.',
      preparacao:
        'A torre em c8 e o rei fora da ala em que se vai avançar. Avançar peões na frente do próprio rei é a forma mais rápida de perder a corrida.',
      oQueOAdversarioTenta:
        'Chegar primeiro com g4-g5 e h4-h5, ou abrir o centro no meio da corrida para que os peões avançados virem fraqueza.',
    },
    {
      id: 'siciliana-devolver',
      name: 'Devolver o peão na hora certa',
      positionNodeId: 'root',
      positionPly: 4,
      objective: 'Trocar o peão a mais por desenvolvimento quando a pressão apertar.',
      when: 'Contra gambitos — Smith-Morra, principalmente.',
      risk: 'Devolver cedo demais e ficar sem compensação nenhuma: o peão é a moeda, não o objetivo.',
      porQueFunciona:
        'Quem dá um gambito conta com o adversário segurar o material e ficar atrasado. Devolver o peão desarma a ideia inteira: as colunas abertas deixam de valer quando as peças estão todas no jogo.',
      preparacao:
        'As casas que as peças brancas querem já tiradas — ...d6 contra e5, ...a6 contra Bb5. Devolver sem isso é devolver de graça.',
      oQueOAdversarioTenta:
        'Recusar a devolução e manter a pressão, ou abrir mais uma coluna antes de aceitar o peão de volta.',
    },
  ],
  structures: [
    {
      name: 'Estrutura da Siciliana Aberta',
      description:
        'Peões pretos em d6 e e7 (ou e6) contra o peão branco em e4, com a coluna c aberta. A assimetria é o conteúdo: cada lado joga na sua ala.',
      pawnBreaks: ['d5', 'b5', 'e5'],
      weakSquares: ['d5', 'b5'],
      openFiles: ['c', 'd'],
    },
  ],
  mistakes: [
    {
      id: 'siciliana-erro-dama-cedo',
      nodeId: 'root',
      positionPly: 6,
      moveSan: 'Qxd4',
      explanation:
        'Recapturar em d4 com a dama entrega o tempo: ...Cc6 a ataca e as pretas se desenvolvem de graça, exatamente o que a Siciliana quer.',
      principle:
        'Num centro aberto, quem sai com a dama cedo paga em tempo — e tempo é a moeda de toda posição aberta.',
    },
  ],
  version: 1,
})

const qga = course({
  id: 'gambito-da-dama-aceito',
  slug: 'gambito-da-dama-aceito',
  name: 'Gambito da Dama Aceito',
  side: 'black',
  ecoCodes: ['D20', 'D21', 'D24', 'D27'],
  description:
    'Aceitar o peão de c4 sem tentar segurá-lo: ceder o centro por um tempo e atacá-lo com ...c5 depois.',
  philosophy: 'O peão volta. O que fica é o tempo livre e a diagonal aberta para o bispo de c8.',
  difficulty: 2,
  prerequisites: [],
  tags: ['closed', 'positional'],
  transitionToMiddlegame:
    'A abertura termina quando as brancas recuperam o peão e as pretas jogam ...c5. A partir daí a pergunta é quem controla a casa d4.',
  mainline: qgaMain,
  variations: [
    {
      /*
        A VARIANTE CENTRAL É A PUNIÇÃO DE QUEM ACEITA POR GANÂNCIA: as brancas
        montam e4 de imediato e ficam com centro grande. Core porque é o teste
        mais direto da defesa.
      */
      id: 'qga-central',
      importancia: 'core',
      eco: 'D20',
      conceitos: [
        'concept.material-vs-initiative',
        'concept.break-c5',
        'concept.space-vs-counterplay',
      ],
      estrutura: 'structure.open-center',
      erroComum: {
        lance: 'b5',
        porque:
          'Tentar segurar o peão com ...b5 enfraquece a6 e c6 de forma permanente, e depois de a4 a estrutura preta racha. O peão de c4 nunca foi o objetivo — ele é a moeda que compra tempo.',
      },
      fronteira: { type: 'handoff', planId: 'qga-c5' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se montar o centro grande de imediato e usar o tempo que a captura preta custou.',
      intencaoDoAdversario:
        'Ocupar o centro inteiro com e4 e d4 e provar que o peão a mais custou às pretas o direito de disputar o meio do tabuleiro.',
      objetivoDoAluno:
        'Atacar o centro antes que ele se consolide: com ...e5 ou ...c5, um centro grande demais vira alvo grande demais.',
      name: 'Variante Central',
      description: 'As brancas montam e4 de imediato em vez de recuperar o peão com calma.',
      rootNodeId: '',
      line: [
        ...qgaMain.slice(0, 4),
        lesson(
          5,
          'e4',
          'As brancas ocupam o centro inteiro e deixam o peão de c4 para depois — espaço agora, material depois.',
          {
            arrows: [{ from: 'e2', to: 'e4' }],
            strategicIdea: 'Centro grande é força e alvo ao mesmo tempo.',
            resultingPlan: 'Bxc4 mais tarde, com o centro já montado.',
          },
        ),
        lesson(
          6,
          'e5',
          'As pretas atacam o centro antes que ele se consolide, abrindo a própria diagonal.',
          {
            highlights: ['d4'],
            resultingPlan:
              '...exd4 e ...Cc6, com o centro branco desfeito antes de virar vantagem.',
          },
        ),
      ],
    },
    {
      /*
        A CLÁSSICA COM a6 É O SISTEMA MAIS SÓLIDO DA DEFESA e o mais jogado em
        clube. Core porque ensina a ordem: ...a6 tira b5 das peças brancas ANTES
        de o bispo sair.
      */
      id: 'qga-classica',
      importancia: 'core',
      eco: 'D27',
      conceitos: ['concept.break-c5', 'concept.hanging-pawns', 'concept.open-file'],
      estrutura: 'structure.hanging-pawns',
      erroComum: {
        lance: 'Nc6',
        porque:
          'Desenvolver o cavalo para c6 antes de ...c5 bloqueia justamente o peão que precisa avançar, e a ruptura que dá vida à defesa fica impossível sem perder mais um tempo.',
      },
      fronteira: { type: 'handoff', planId: 'qga-c5' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se recuperar o peão com desenvolvimento e ocupar a casa d4 antes da ruptura preta.',
      intencaoDoAdversario:
        'Recuperar o peão com Bxc4 e ocupar o centro, apostando que as pretas demoram a jogar ...c5.',
      objetivoDoAluno:
        'Preparar ...c5 com ...a6 e ...b5, ganhando espaço na ala da dama antes de atacar o centro.',
      name: 'Variante Clássica',
      description: 'As brancas recuperam o peão com o bispo e as pretas preparam ...c5 com ...a6.',
      rootNodeId: '',
      line: [
        ...qgaMain.slice(0, 7),
        lesson(
          8,
          'a6',
          'Antes de qualquer outra coisa, tirar a casa b5 das peças brancas e preparar ...b5.',
          {
            strategicIdea:
              'A ordem é o conteúdo: tirar a casa antes de romper garante o espaço na ala.',
            resultingPlan: '...b5, ...Bb7 e ...c5, com a ala da dama ocupada.',
          },
        ),
        lesson(
          9,
          'Bxc4',
          'As brancas finalmente recuperam o peão, já com todo o desenvolvimento pronto.',
          { resultingPlan: 'O-O e a disputa da casa d4.' },
        ),
      ],
    },
  ],
  plans: [
    {
      id: 'qga-c5',
      name: 'A ruptura ...c5',
      positionNodeId: 'root',
      positionPly: 8,
      objective: 'Atacar a base do centro branco e disputar a casa d4.',
      when: 'Depois de ...e6 e, idealmente, de ...a6 com ...b5.',
      risk: 'Romper com o rei ainda no meio: o centro abre a favor de quem já rocou.',
      porQueFunciona:
        'O peão de c4 foi capturado justamente para que a coluna c fique livre. Com ...c5 as pretas atacam d4, abrem a coluna para a torre e transformam o tempo ganho na abertura em pressão concreta.',
      preparacao:
        'O bispo de f8 já com saída por ...e6 e, quando possível, ...a6 e ...b5 garantindo espaço. Sem isso, a ruptura só abre linhas para o adversário.',
      oQueOAdversarioTenta:
        'Ocupar d4 com peça depois da troca, ou avançar d5 antes da ruptura para fechar o centro a favor do espaço.',
      arrows: [{ from: 'c7', to: 'c5' }],
    },
    {
      id: 'qga-bispo',
      name: 'A diagonal do bispo de c8',
      positionNodeId: 'root',
      positionPly: 4,
      objective: 'Usar a diagonal que a captura em c4 abriu, antes de fechá-la com peões.',
      when: 'Logo depois de ...dxc4, e sempre antes de ...e6 travar a saída.',
      risk: 'Esquecer o bispo e jogar ...e6 cedo: a defesa perde a única vantagem que a captura deu.',
      porQueFunciona:
        'Capturar em c4 abre a diagonal c8-h3 de graça. É a diferença entre o Gambito Aceito e o Recusado: aqui o bispo problemático da família toda tem saída natural.',
      preparacao:
        'Nenhuma além da própria captura. O que exige cuidado é a ORDEM — ...e6 antes de resolver o bispo desfaz a vantagem.',
      oQueOAdversarioTenta:
        'Jogar e3 e Bd3 rapidamente para disputar a diagonal, ou forçar ...e6 com pressão sobre d5.',
    },
    {
      id: 'qga-devolver',
      name: 'Não segurar o peão',
      positionNodeId: 'root',
      positionPly: 4,
      objective: 'Devolver c4 sem resistência e investir os tempos em desenvolvimento.',
      when: 'Sempre que segurá-lo custar um lance de peão na ala da dama.',
      risk: 'Devolver antes de ganhar nada: o peão deve custar ao adversário pelo menos um tempo.',
      porQueFunciona:
        'O peão de c4 é indefensável a longo prazo, e tentar segurá-lo com ...b5 cria fraquezas permanentes em a6 e c6. Quem aceita e devolve termina a abertura com desenvolvimento igual e uma diagonal a mais.',
      preparacao:
        'Nada. O plano é justamente a ausência de plano ganancioso — a disciplina de não gastar lances defendendo o que vai cair.',
      oQueOAdversarioTenta:
        'Recuperar o peão com ganho de tempo, tipicamente com Bxc4 atacando alguma peça mal colocada.',
    },
  ],
  structures: [
    {
      name: 'Centro contra peões pendentes',
      description:
        'Depois de ...c5 e das trocas, as brancas costumam ficar com peões em c e d lado a lado. São força enquanto avançam juntos e alvo quando param.',
      pawnBreaks: ['c5', 'd5', 'e4'],
      weakSquares: ['d4', 'c4'],
      openFiles: ['c', 'd'],
    },
  ],
  mistakes: [
    {
      id: 'qga-erro-segurar',
      nodeId: 'root',
      /* Ply 7: depois de e3 e a vez das PRETAS, e ...b5 e lance preto. */
      positionPly: 7,
      moveSan: 'b5',
      explanation:
        'Segurar o peão com ...b5 enfraquece a6 e c6 para sempre, e depois de a4 a estrutura preta racha sem compensação.',
      principle:
        'Num gambito que se aceita por tempo, o material é a moeda — quem tenta guardá-la paga com a posição.',
    },
  ],
  version: 1,
})

const kingsIndian = course({
  id: 'india-do-rei',
  slug: 'india-do-rei',
  name: 'Defesa Índia do Rei',
  side: 'black',
  ecoCodes: ['E60', 'E70', 'E80', 'E90', 'E97'],
  description:
    'Ceder o centro para atacá-lo depois: fianchetto, roque rápido e a ruptura ...e5 que decide a partida.',
  philosophy:
    'Espaço contra contrajogo. As brancas mandam no centro; as pretas mandam na hora de rompê-lo.',
  difficulty: 3,
  prerequisites: [],
  tags: ['closed', 'sharp', 'asymmetric'],
  transitionToMiddlegame:
    'A abertura termina quando o centro trava e as duas partes escolhem as alas. A partir daí a pergunta é quem chega primeiro, e não qual lance vem agora.',
  mainline: kidMain,
  /*
    O ATAQUE DOS QUATRO PEÕES FOI ESCRITO E REMOVIDO desta entrega, pela mesma
    razão que tirou dois ramos da Espanhola: ele desvia no MESMO ponto que a
    Sämisch (o quinto lance branco), e o bot de sparring percorre um ponto de
    bifurcação por rodada. Com dois ramos ali, um deles nunca seria jogado — e
    "variação que o bot nunca joga é decoração".

    Ele volta quando a seleção do bot souber percorrer os desvios
    sistematicamente.
  */
  variations: [
    {
      /*
        A SÄMISCH É A RESPOSTA MAIS DURA: f3 sustenta e4 e prepara ataque com
        g4 e h4. Core porque muda o jogo inteiro — contra ela, o plano padrão de
        ...e5 costuma ser tarde demais.
      */
      id: 'kid-samisch',
      importancia: 'core',
      eco: 'E80',
      conceitos: ['concept.space-vs-counterplay', 'concept.king-safety-timing', 'concept.break-c5'],
      estrutura: 'structure.kid-locked-center',
      erroComum: {
        lance: 'e5',
        porque:
          'A ruptura padrão chega tarde contra a Sämisch: com f3 jogado, as brancas sustentam d4 sem esforço e ganham a corrida na ala do rei. Contra esta linha, o contrajogo vem da ala da dama com ...c5.',
      },
      fronteira: { type: 'handoff', planId: 'kid-alas' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se sustentar o centro com peão e correr na ala do rei com g4 e h4.',
      intencaoDoAdversario:
        'Sustentar e4 sem usar peça nenhuma, liberando os peões da ala do rei para avançar contra o seu roque.',
      objetivoDoAluno:
        'Trocar a ala: com f3 jogado, a corrida da ala do rei é das brancas, e o contrajogo preto vem de ...c5.',
      name: 'Variante Sämisch',
      description: 'As brancas sustentam e4 com f3 e preparam um ataque de peões na ala do rei.',
      rootNodeId: '',
      line: [
        /*
          A ORDEM DE LANCES É 3.f3, E NÃO 5.f3 — e a escolha é forçada por um
          portão, não por estética.

          As duas ordens chegam à mesma posição, e 3.f3 é ordem corrente da
          Sämisch. A diferença é que ela bifurca no MESMO ponto de decisão que o
          Fianchetto. O bot de sparring percorre as alternativas de um ponto
          conforme a rodada, mas desviar num ponto RASO afasta a partida de
          qualquer ponto mais fundo: com 5.f3, a Sämisch nunca era jogada.

          TENTEI CONSERTAR O BOT DUAS VEZES E PIOREI NAS DUAS. Ficou registrado
          no histórico; aqui fica o resultado: o conteúdo se adapta.
        */
        ...kidMain.slice(0, 4),
        lesson(
          5,
          'f3',
          'O peão sustenta o futuro e4 sem gastar peça, e libera os peões da ala do rei para avançar.',
          {
            strategicIdea: 'Sustentar com peão custa um tempo e compra uma ala inteira.',
            resultingPlan: 'e4, Be3 e a corrida com g4 e h4 contra o roque preto.',
          },
        ),
        lesson(
          6,
          'Bg7',
          'As pretas seguem o plano: o bispo ocupa a diagonal antes de o centro branco fechar.',
          { resultingPlan: '...d6 e ...O-O, com o contrajogo indo para a ala da dama.' },
        ),
      ],
    },
    {
      /*
        O FIANCHETTO É A LINHA MAIS POSICIONAL e a mais comum contra jogadores
        de clube. Core porque ela desarma o ataque preto sem precisar de teoria.
      */
      id: 'kid-fianchetto',
      importancia: 'core',
      eco: 'E60',
      conceitos: ['concept.space-vs-counterplay', 'concept.break-c5', 'concept.bishop-pair'],
      estrutura: 'structure.kid-locked-center',
      erroComum: {
        lance: 'e5',
        porque:
          'Romper cedo contra o fianchetto branco abre a diagonal longa para o bispo de g2 justamente quando ele mira a torre de a8. A ordem correta passa por ...Cc6 e ...Te8 antes da ruptura.',
      },
      fronteira: { type: 'handoff', planId: 'kid-e5' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se neutralizar o bispo de g7 com o próprio fianchetto, e jogar por espaço sem riscos.',
      intencaoDoAdversario:
        'Espelhar o fianchetto e neutralizar o bispo de g7, jogando por pequena vantagem de espaço sem abrir o jogo.',
      objetivoDoAluno:
        'Preparar a ruptura com peças antes de tocar nos peões: contra o fianchetto, ...e5 sem preparo abre a diagonal do adversário.',
      name: 'Variante Fianchetto',
      description: 'As brancas também fianchetam e neutralizam o bispo de g7 pela mesma diagonal.',
      rootNodeId: '',
      line: [
        ...kidMain.slice(0, 4),
        lesson(
          5,
          'g3',
          'As brancas preparam o próprio fianchetto e vão disputar a diagonal longa de igual para igual.',
          {
            strategicIdea: 'Neutralizar o bispo de g7 vale mais que ocupar mais uma casa central.',
            resultingPlan: 'Bg2, Cf3 e O-O, com um jogo de espaço sem riscos.',
          },
        ),
        lesson(
          6,
          'Bg7',
          'O bispo ocupa a diagonal mesmo assim: a partida vai se decidir na preparação da ruptura.',
          { resultingPlan: '...O-O, ...d6 e ...Cc6 antes de qualquer avanço de peão.' },
        ),
      ],
    },
  ],
  plans: [
    {
      id: 'kid-e5',
      name: 'A ruptura ...e5',
      positionNodeId: 'root',
      positionPly: 8,
      objective: 'Atacar o centro branco com o peão de e depois de o rei estar seguro.',
      when: 'Com o roque feito e o cavalo já em c6 ou d7.',
      risk: 'Romper antes de preparar: a troca em e5 abre a diagonal do bispo de g7 para o adversário.',
      porQueFunciona:
        'A Índia do Rei cede o centro por quatro lances para atacá-lo de uma vez. Com ...e5 o peão de d4 precisa decidir: avançar e travar, trocar e abrir, ou ficar e ser pressionado. As três respostas dão um plano às pretas.',
      preparacao:
        'Rei rocado, torre em e8 e um cavalo apontando para e5. A ruptura é o fim de uma preparação, e não um lance isolado.',
      oQueOAdversarioTenta:
        'Avançar d5 travando o centro e correndo na ala da dama, ou trocar em e5 para simplificar antes de o ataque preto nascer.',
      arrows: [{ from: 'e7', to: 'e5' }],
    },
    {
      id: 'kid-alas',
      name: 'A corrida em alas opostas',
      positionNodeId: 'root',
      positionPly: 8,
      objective: 'Avançar ...f5 e ...g5 contra o rei branco enquanto ele avança do outro lado.',
      when: 'Depois de o centro travar com d5 — é a estrutura que autoriza a corrida.',
      risk: 'Começar a corrida com o centro ainda aberto: uma ruptura central desfaz qualquer ataque de flanco.',
      porQueFunciona:
        'Centro travado tira a mobilidade das peças e entrega a partida aos peões. Cada lado ataca onde tem mais espaço, e a Índia do Rei dá às pretas a maioria na ala do rei — exatamente onde o rei branco costuma estar.',
      preparacao:
        'O centro trancado por d5 e as peças pretas reagrupadas: o cavalo de f6 costuma sair para e8 ou d7 para liberar o peão de f.',
      oQueOAdversarioTenta:
        'Chegar primeiro na ala da dama com c5 e b4, ou abrir o centro no meio da corrida para invalidar o ataque preto.',
      arrows: [{ from: 'f7', to: 'f5' }],
    },
    {
      id: 'kid-bispo',
      name: 'Manter o bispo de g7 vivo',
      positionNodeId: 'root',
      positionPly: 6,
      objective: 'Preservar a diagonal longa e não trocar a peça que dá nome à defesa.',
      when: 'Sempre — é o fio que liga toda a Índia do Rei.',
      risk: 'Trocar o bispo por conveniência tática: sem ele, o ataque preto na ala do rei perde o dono.',
      porQueFunciona:
        'O bispo de g7 pressiona d4 sem se expor e vira a peça mais forte do tabuleiro quando o centro abre. Toda a estrutura preta — ...d6, ...e5, ...f5 — existe para que essa diagonal um dia se abra.',
      preparacao:
        'Evitar ...e5 seguido de trocas que fechem a diagonal com peões pretos, e não permitir Bh6 trocando o bispo de graça.',
      oQueOAdversarioTenta:
        'Trocar o bispo com Bh6, ou travar a diagonal com peões em d4 e e5 sustentados por peças.',
    },
  ],
  structures: [
    {
      name: 'Centro travado da Índia do Rei',
      description:
        'Peões brancos em c4, d5 e e4 contra peões pretos em d6, e5 e f7. O centro não anda, e as duas partidas correm em alas opostas.',
      pawnBreaks: ['f5', 'c5', 'b4'],
      weakSquares: ['f5', 'c6'],
      openFiles: ['f', 'c'],
    },
  ],
  mistakes: [
    {
      id: 'kid-erro-centro-cedo',
      nodeId: 'root',
      /*
        PLY 3, E NÃO 4 — e este passou no portão por COINCIDÊNCIA.

        Com quatro plies é a vez das brancas, e `d5` também é lance branco
        (d4-d5), então a legalidade passava enquanto a explicação falava de um
        lance PRETO. O portão media o que podia medir; o texto é que estava
        descrito do lado errado. Com três plies a vez é das pretas, e ...d5 é o
        lance que a explicação de fato comenta.
      */
      positionPly: 3,
      moveSan: 'd5',
      explanation:
        'Disputar o centro de frente com ...d5 contradiz a ideia da defesa: a Índia do Rei cede o centro de propósito para atacá-lo depois com peças.',
      principle:
        'Escolher uma defesa é escolher um plano — jogar contra o próprio plano custa mais que jogar contra o adversário.',
    },
  ],
  version: 1,
})

const nimzoIndian = course({
  id: 'nimzo-india',
  slug: 'nimzo-india',
  name: 'Defesa Nimzo-Índia',
  side: 'black',
  ecoCodes: ['E20', 'E32', 'E40', 'E46'],
  description:
    'Controlar e4 cravando quem o defende: a cravada em b4, o par de bispos como moeda e os peões dobrados como alvo.',
  philosophy:
    'Estrutura contra bispos. As pretas entregam uma peça boa para deixar uma fraqueza que não anda.',
  difficulty: 3,
  prerequisites: [],
  tags: ['closed', 'positional'],
  transitionToMiddlegame:
    'A abertura termina quando as pretas decidem se trocam em c3 e com que estrutura. A partir daí a pergunta é se os bispos brancos chegam antes de os peões dobrados pesarem.',
  mainline: nimzoMain,
  /*
    TODOS OS RAMOS BIFURCAM NO MESMO PONTO — o quarto lance branco — e isso é
    exigência do bot de sparring, não estética. Ele percorre as alternativas de
    um ponto por rodada; ramos espalhados por pontos diferentes fazem o mais
    raso afastar do mais fundo, e o fundo nunca é jogado. Ver a Índia do Rei.
  */
  variations: [
    {
      /*
        A CLÁSSICA (4.Dc2) É A LINHA MAIS AMBICIOSA: as brancas recusam os peões
        dobrados e apostam tudo no par de bispos. Core porque ela desfaz a ideia
        central da defesa, e o aluno precisa de outro plano.
      */
      id: 'nimzo-classica',
      importancia: 'core',
      eco: 'E32',
      conceitos: ['concept.bishop-pair', 'concept.break-c5', 'concept.space-vs-counterplay'],
      estrutura: 'structure.slav-triangle',
      erroComum: {
        lance: 'Bxc3+',
        porque:
          'Trocar em c3 quando a dama recaptura não cria peões dobrados nenhum — as pretas entregam o par de bispos de graça. Contra 4.Dc2, o bispo fica e o jogo é no centro com ...d5 ou ...c5.',
      },
      fronteira: { type: 'handoff', planId: 'nimzo-estrutura' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se recusar a estrutura danificada e converter o par de bispos em vantagem de longo prazo.',
      intencaoDoAdversario:
        'Recapturar em c3 com a DAMA e não com o peão, ficando com os dois bispos e nenhuma fraqueza.',
      objetivoDoAluno:
        'Não trocar de graça: com a dama em c2, a cravada perde valor e o jogo passa a ser central.',
      name: 'Variante Clássica',
      description: 'As brancas põem a dama em c2 para recapturar em c3 sem dobrar peões.',
      rootNodeId: '',
      line: [
        ...nimzoMain.slice(0, 6),
        lesson(
          7,
          'Qc2',
          'A dama prepara a recaptura em c3 com peça, recusando os peões dobrados que a defesa procura.',
          {
            strategicIdea:
              'Quem recusa a fraqueza paga em tempo: a dama sai antes das peças menores.',
            resultingPlan: 'a3 no momento certo, forçando a decisão do bispo.',
          },
        ),
        lesson(
          8,
          'd5',
          'As pretas mudam de plano e disputam o centro, já que a cravada perdeu a função.',
          { resultingPlan: '...c5 depois, atacando a base do centro branco.' },
        ),
      ],
    },
    {
      /*
        A SÄMISCH (4.a3) COMPRA OS PEÕES DOBRADOS DE PROPÓSITO: as brancas
        aceitam a fraqueza em troca dos dois bispos e do centro. Core porque é
        a linha que mais testa se o aluno entendeu a troca.
      */
      id: 'nimzo-samisch',
      importancia: 'core',
      eco: 'E24',
      conceitos: ['concept.bishop-pair', 'concept.backward-pawn', 'concept.break-c5'],
      estrutura: 'structure.slav-triangle',
      motivos: ['motif.fork-on-d5'],
      erroComum: {
        lance: 'Be7',
        porque:
          'Recuar o bispo devolve o tempo de a3 e deixa as brancas com centro e desenvolvimento de graça. Quando o adversário pergunta ao bispo com a3, a resposta é trocar: é por isso que ele foi para b4.',
      },
      fronteira: { type: 'handoff', planId: 'nimzo-estrutura' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se pagar por estrutura para ganhar bispos e centro, e abrir a posição antes que os peões pesem.',
      intencaoDoAdversario:
        'Forçar a troca em c3 já, aceitando os peões dobrados em troca do par de bispos e de um centro grande.',
      objetivoDoAluno:
        'Trocar e depois fechar o jogo: peões dobrados só viram fraqueza em posição travada, e bispos só valem em posição aberta.',
      name: 'Variante Sämisch',
      description: 'As brancas jogam a3 e compram os peões dobrados em troca dos bispos.',
      rootNodeId: '',
      line: [
        ...nimzoMain.slice(0, 6),
        lesson(
          7,
          'a3',
          'O peão pergunta ao bispo e força a decisão: trocar em c3 ou recuar perdendo tempo.',
          {
            strategicIdea: 'Perguntar sempre ganha alguma coisa — aqui, a estrutura ou o tempo.',
            resultingPlan: 'bxc3 e e3, com dois bispos e um centro grande.',
          },
        ),
        lesson(
          8,
          'Bxc3',
          'As pretas trocam: era para isso que o bispo foi a b4, e os peões dobrados são permanentes.',
          { resultingPlan: '...c5 e ...d6, travando a posição para que os bispos não respirem.' },
        ),
      ],
    },
    {
      /*
        A LENINGRADO (4.Bg5) pressiona antes de resolver o centro. `secondary`
        porque é menos comum em clube que as duas acima, mas ela entra para o
        aluno não estranhar a cravada dupla.
      */
      id: 'nimzo-leningrado',
      importancia: 'secondary',
      intencaoDoAdversario:
        'Cravar o cavalo de f6 antes de decidir a estrutura, somando pressão sobre d5 e e4.',
      objetivoDoAluno:
        'Responder com ...h6 e ...c5, atacando o centro enquanto o bispo branco está longe da defesa.',
      name: 'Variante Leningrado',
      description: 'As brancas cravam o cavalo de f6 antes de tocar no centro.',
      rootNodeId: '',
      line: [
        ...nimzoMain.slice(0, 6),
        lesson(
          7,
          'Bg5',
          'O bispo crava o cavalo de f6 e aumenta a pressão sobre o centro sem mover peão nenhum.',
          {
            strategicIdea:
              'Duas cravadas ao mesmo tempo: a das brancas em f6 e a das pretas em c3.',
            resultingPlan: 'e3 e Bd3 depois, com a tensão mantida.',
          },
        ),
        lesson(
          8,
          'h6',
          'A pergunta de sempre: o bispo troca em f6 e ajuda a estrutura preta, ou recua perdendo tempo.',
          { resultingPlan: '...c5 em seguida, atacando o centro.' },
        ),
      ],
    },
  ],
  plans: [
    {
      id: 'nimzo-estrutura',
      name: 'Travar a posição contra os bispos',
      positionNodeId: 'root',
      positionPly: 6,
      objective: 'Fechar o jogo com ...c5 e ...d6 para que o par de bispos não tenha diagonais.',
      when: 'Sempre que a troca em c3 já tiver acontecido.',
      risk: 'Travar sem ter criado os peões dobrados: aí é só uma posição sem espaço.',
      porQueFunciona:
        'Peões dobrados são fraqueza permanente e os bispos são vantagem condicional: eles só valem em posição aberta. Quem tem a estrutura melhor joga para fechar; quem tem os bispos joga para abrir. As duas metades da mesma conta.',
      preparacao:
        'A troca em c3 feita e o centro sob controle. Trocar antes de ter com que fechar entrega os bispos sem cobrar nada.',
      oQueOAdversarioTenta:
        'Abrir o centro com e4 e f4, ou avançar d5 para dar ar aos bispos antes de a estrutura pesar.',
      arrows: [{ from: 'c7', to: 'c5' }],
    },
    {
      id: 'nimzo-e4',
      name: 'Disputar a casa e4',
      positionNodeId: 'root',
      positionPly: 6,
      objective: 'Impedir e4 com peças, e não com peões.',
      when: 'Em toda a Nimzo — é a razão de a cravada existir.',
      risk: 'Esquecer a casa e concentrar-se nos peões: o centro branco completo desfaz a defesa.',
      porQueFunciona:
        'A Nimzo nunca ocupa e4; ela controla a casa cravando o cavalo que a defende e somando ...d5, ...Cbd7 e ...b6 com ...Bb7. Quando e4 fica impossível, o espaço branco vira estrutura parada.',
      preparacao:
        'O bispo já em b4 e o cavalo de f6 no jogo. Sem a cravada, o controle vira torcida.',
      oQueOAdversarioTenta: 'Desfazer a cravada com a3 ou Dc2 e então jogar e4 com tudo defendido.',
    },
    {
      id: 'nimzo-bispo-b7',
      name: 'O bispo por b7',
      positionNodeId: 'root',
      positionPly: 8,
      objective: 'Resolver o bispo de c8 pela diagonal longa, mirando e4 de longe.',
      when: 'Nas estruturas em que ...d5 não é possível ou não é desejável.',
      risk: 'Gastar dois lances com o bispo enquanto o centro branco avança.',
      porQueFunciona:
        'Com ...b6 e ...Bb7 o bispo aponta para e4 — a mesma casa que a cravada disputa. As duas peças fazem a mesma pergunta de lados diferentes, e é essa soma que trava o centro branco.',
      preparacao:
        'Rei rocado e a cravada ainda de pé: sem ela, o bispo em b7 pressiona sozinho e não basta.',
      oQueOAdversarioTenta:
        'Jogar d5 fechando a diagonal, ou trocar o bispo de b7 com Bf3 e Cd2 antes de o centro abrir.',
    },
  ],
  structures: [
    {
      name: 'Peões dobrados em c',
      description:
        'Depois de ...Bxc3 bxc3, as brancas ficam com peões em c3 e c4. São fraqueza fixa em posição fechada e irrelevantes em posição aberta — a mesma estrutura vale coisas opostas conforme o jogo.',
      pawnBreaks: ['c5', 'e4', 'd5'],
      weakSquares: ['c4', 'a4'],
      openFiles: ['b'],
    },
  ],
  mistakes: [
    {
      id: 'nimzo-erro-troca-cedo',
      nodeId: 'root',
      /* Ply 7: depois de e3 e a vez das PRETAS, e ...Bxc3+ e lance preto. */
      positionPly: 7,
      moveSan: 'Bxc3+',
      explanation:
        'Trocar em c3 sem ser perguntado entrega o par de bispos e deixa as brancas escolherem com que peça recapturar — o tempo da troca é parte do valor dela.',
      principle:
        'Não troque uma peça ativa antes de o adversário pedir: quem troca cedo perde o direito de escolher a estrutura.',
    },
  ],
  version: 1,
})

const catalan = course({
  id: 'catala',
  slug: 'catala',
  name: 'Abertura Catalã',
  side: 'white',
  ecoCodes: ['E01', 'E04', 'E06'],
  description:
    'O centro de 1.d4 com o fianchetto da Inglesa: pressão de longo prazo pela diagonal a8-h1.',
  philosophy: 'Um gambito posicional. O peão de c4 pode esperar; a diagonal não.',
  difficulty: 3,
  prerequisites: ['gambito-da-dama-recusado'],
  tags: ['closed', 'positional'],
  transitionToMiddlegame:
    'A abertura termina quando as pretas decidem entre segurar o peão de c4 e devolvê-lo. A partir daí a pergunta é se a diagonal vale mais que o material.',
  mainline: catalaMain,
  /*
    OS DOIS RAMOS BIFURCAM NO MESMO PONTO — o quarto lance preto — pela regra
    que a Índia do Rei estabeleceu: o bot percorre as alternativas de um ponto
    de decisão por rodada, e ramos espalhados deixam o mais fundo inalcançável.

    A CATALÃ É TAMBÉM O TESTE DE TRANSPOSIÇÃO DO CATÁLOGO (§24): ela nasce do
    Gambito da Dama Recusado por outra ordem de lances, e a ligação está
    declarada em vez de a explicação ser copiada nos dois cursos.
  */
  variations: [
    {
      /*
        A CATALÃ ABERTA É A LINHA PRINCIPAL DA FAMÍLIA: as pretas capturam em c4
        e as brancas jogam o gambito posicional de verdade. Core porque é ela
        que define a abertura.
      */
      id: 'catala-aberta',
      importancia: 'core',
      eco: 'E04',
      conceitos: ['concept.material-vs-initiative', 'concept.open-file', 'concept.break-c5'],
      estrutura: 'structure.open-center',
      erroComum: {
        lance: 'Qa4',
        porque:
          'Correr atrás do peão com a dama devolve o tempo: nesta posição Da4 nem xeque é, as pretas respondem ...Cbd7 ou ...Bd7 desenvolvendo, e a dama volta para casa. Na Catalã o peão se recupera com Ce5 e Cc3, sem pressa.',
      },
      fronteira: { type: 'handoff', planId: 'catala-diagonal' },
      transposicoes: ['qgd-tres-cavalos'],
      politicaDoLadoInverso:
        'Pelas pretas, demonstra-se aceitar o peão e devolvê-lo na hora certa, usando o tempo para ...c5.',
      intencaoDoAdversario:
        'Ficar com o peão de c4 e usar os tempos para completar o desenvolvimento antes que a diagonal pese.',
      objetivoDoAluno:
        'Recuperar o peão sem pressa, com peças: cada lance gasto atrás do material é um lance a menos de pressão.',
      name: 'Catalã Aberta',
      description: 'As pretas capturam em c4 e as brancas apostam na diagonal em vez do material.',
      rootNodeId: '',
      line: [
        ...catalaMain.slice(0, 7),
        lesson(
          8,
          'dxc4',
          'As pretas aceitam o peão e desobstruem a diagonal longa — é este o negócio da Catalã.',
          {
            strategicIdea: 'Elas ganham material; as brancas ganham a diagonal e o tempo.',
            resultingPlan: '...a6 e ...b5 tentando segurar, ou ...c5 devolvendo com jogo.',
          },
        ),
        lesson(
          9,
          'Nf3',
          'Desenvolvimento antes de material: o cavalo vai a e5 recuperar o peão sem pressa.',
          { resultingPlan: 'Ce5 e Cxc4, com todas as peças no jogo.' },
        ),
      ],
    },
    {
      /*
        A CATALÃ FECHADA COM ...c6 é a resposta mais sólida e a mais comum em
        clube. Core porque ela fecha a diagonal e obriga as brancas a mudar de
        plano — sem isso o aluno joga a Catalã no automático.
      */
      id: 'catala-fechada',
      importancia: 'core',
      eco: 'E06',
      conceitos: ['concept.space-vs-counterplay', 'concept.break-e5', 'concept.bad-bishop'],
      estrutura: 'structure.slav-triangle',
      erroComum: {
        lance: 'cxd5',
        porque:
          'Trocar em d5 resolve a tensão a favor das PRETAS: a diagonal do bispo de g2 fica bloqueada por um peão que agora está defendido pelo peão de c6. A Catalã mantém a tensão o máximo possível.',
      },
      fronteira: { type: 'handoff', planId: 'catala-e4' },
      politicaDoLadoInverso:
        'Pelas pretas, demonstra-se fechar a diagonal com peões e preparar ...dxc4 só quando ...b5 estiver garantido.',
      intencaoDoAdversario:
        'Sustentar d5 com o peão de c6 e fechar a diagonal longa, aceitando menos espaço em troca de solidez.',
      objetivoDoAluno:
        'Preparar a ruptura e4: contra uma estrutura fechada, a diagonal só volta a valer quando o centro abrir.',
      name: 'Catalã Fechada',
      description: 'As pretas sustentam d5 com ...c6 e fecham a diagonal do bispo de g2.',
      rootNodeId: '',
      line: [
        ...catalaMain.slice(0, 7),
        lesson(
          8,
          'c6',
          'O peão sustenta d5 e tranca a diagonal longa, que é o principal ativo das brancas.',
          {
            strategicIdea: 'Fechar a diagonal é a forma mais direta de desarmar a Catalã.',
            resultingPlan: '...Cbd7, ...O-O e ...b6, com uma posição sólida e sem alvos.',
          },
        ),
        lesson(
          9,
          'Nf3',
          'As brancas completam o desenvolvimento e preparam a ruptura que reabre a diagonal.',
          { resultingPlan: 'O-O, Cbd2 e e4 no momento certo.' },
        ),
      ],
    },
  ],
  plans: [
    {
      id: 'catala-diagonal',
      name: 'A diagonal a8-h1',
      positionNodeId: 'root',
      positionPly: 6,
      objective: 'Manter o bispo de g2 mirando d5, c6 e a torre de a8.',
      when: 'Sempre — é o ativo permanente da abertura.',
      risk: 'Trocar o bispo por conveniência: sem ele, a Catalã vira um Gambito da Dama sem ideia.',
      porQueFunciona:
        'O bispo em g2 pressiona três alvos ao mesmo tempo sem se expor, e a pressão dura a partida inteira. É por isso que o peão de c4 pode ser oferecido: o que se compra é o tempo de manter essa diagonal aberta.',
      preparacao:
        'O fianchetto completo e o peão de e ainda em e2, para que a diagonal não se feche por dentro.',
      oQueOAdversarioTenta:
        'Fechar a diagonal com ...c6 e ...d5 sustentado, ou trocar o bispo com ...Ba6 e ...Bb7.',
      arrows: [{ from: 'g2', to: 'a8' }],
    },
    {
      id: 'catala-e4',
      name: 'A ruptura e4',
      positionNodeId: 'root',
      positionPly: 6,
      objective: 'Abrir o centro para que a diagonal volte a valer.',
      when: 'Contra estruturas fechadas com ...c6, depois do roque e de Cbd2.',
      risk: 'Romper antes de a peça de apoio chegar: e4 sem Cbd2 costuma só perder um peão.',
      porQueFunciona:
        'Quando as pretas fecham a diagonal com ...c6 e ...d5, o bispo de g2 fica olhando para um muro. A ruptura e4 desfaz o muro — e como as brancas têm mais espaço, a abertura do centro favorece quem manobra melhor.',
      preparacao:
        'Rei rocado, cavalo em d2 e torre em e1. São três lances de preparação para um lance de peão, e é essa a proporção correta.',
      oQueOAdversarioTenta:
        'Sustentar d5 com ...Cbd7 e ...b6, ou romper antes com ...c5 para abrir o centro nos próprios termos.',
      arrows: [{ from: 'e2', to: 'e4' }],
    },
    {
      id: 'catala-peao-c4',
      name: 'Recuperar c4 sem pressa',
      positionNodeId: 'root',
      positionPly: 8,
      objective: 'Trazer o peão de volta com peças, e não com a dama.',
      when: 'Na Catalã Aberta, depois de ...dxc4.',
      risk: 'Correr atrás do peão: cada lance gasto nele é um lance a menos de desenvolvimento.',
      porQueFunciona:
        'O peão de c4 é difícil de segurar para as pretas: sustentá-lo exige ...a6 e ...b5, que enfraquecem a ala da dama justamente onde a diagonal aponta. Quem espera recupera o material e a posição junto.',
      preparacao:
        'Cavalo em f3 pronto para e5, e o rei já rocado. Recuperar com a dama antes disso é entregar o tempo que o gambito comprou.',
      oQueOAdversarioTenta:
        'Segurar com ...a6 e ...b5, ou devolver o peão na hora certa com ...c5 para igualar o desenvolvimento.',
    },
  ],
  structures: [
    {
      name: 'Centro catalão',
      description:
        'Peão branco em d4 com o bispo em g2 contra peões pretos em d5 e e6. A tensão em c4/d5 é o coração da abertura: quem a resolve primeiro costuma resolvê-la a favor do outro.',
      pawnBreaks: ['e4', 'c5', 'b5'],
      weakSquares: ['c6', 'b7'],
      openFiles: ['c', 'd'],
    },
  ],
  mistakes: [
    {
      id: 'catala-erro-trocar-cedo',
      nodeId: 'root',
      positionPly: 6,
      moveSan: 'cxd5',
      explanation:
        'Resolver a tensão cedo entrega às pretas exatamente o que elas querem: um peão em d5 defendido e a diagonal do bispo de g2 bloqueada.',
      principle: 'Quem tem pressão de longo prazo não troca cedo — a tensão é o próprio ativo.',
    },
  ],
  version: 1,
})

const english = course({
  id: 'inglesa',
  slug: 'inglesa',
  name: 'Abertura Inglesa',
  side: 'white',
  ecoCodes: ['A20', 'A30', 'A34'],
  description:
    'Abrir no flanco e decidir o centro depois: a abertura mais flexível do repertório de 1.d4 e 1.c4.',
  philosophy:
    'Controlar d5 de longe e escolher a estrutura depois que o adversário já escolheu a dele.',
  difficulty: 2,
  prerequisites: [],
  tags: ['flank', 'positional', 'flexible'],
  transitionToMiddlegame:
    'A abertura termina quando a estrutura central se define — e ela pode se definir como Siciliana invertida, como Índia ou até como Gambito da Dama. A partir daí vale o plano da estrutura que apareceu.',
  mainline: inglesaMain,
  /*
    OS RAMOS BIFURCAM NO PRIMEIRO LANCE PRETO, que é o ponto de decisão mais
    raso que existe — e também o mais honesto para esta abertura. A Inglesa não
    é uma sequência: ela é uma resposta ao que o adversário escolhe, e a
    primeira escolha dele já muda tudo.

    Ramos no mesmo ponto convivem; ramos espalhados por pontos diferentes fazem
    o raso afastar do fundo. Ver a Índia do Rei.
  */
  variations: [
    {
      /*
        A SIMÉTRICA É A RESPOSTA MAIS COMUM e a que produz as posições mais
        equilibradas. Core porque quem só estudou a invertida não sabe o que
        fazer quando o espelho aparece.
      */
      id: 'inglesa-simetrica',
      importancia: 'core',
      eco: 'A30',
      conceitos: ['concept.space-vs-counterplay', 'concept.break-d4', 'concept.open-file'],
      estrutura: 'structure.open-center',
      erroComum: {
        lance: 'd4',
        porque:
          'Romper cedo desfaz a flexibilidade que a abertura comprou: depois de cxd4 a posição fica simétrica e sem alvos, e o tempo de vantagem das brancas desaparece com a simplificação.',
      },
      fronteira: { type: 'handoff', planId: 'inglesa-d5' },
      politicaDoLadoInverso:
        'Pelas pretas, demonstra-se espelhar sem medo: a simetria só é passiva para quem não tem plano.',
      intencaoDoAdversario:
        'Espelhar a sua estrutura e apostar que uma posição sem desequilíbrio não dá vantagem a ninguém.',
      objetivoDoAluno:
        'Usar o tempo de vantagem para quebrar a simetria primeiro, com g3 e Bg2 antes de qualquer ruptura.',
      name: 'Inglesa Simétrica',
      description: 'As pretas respondem com ...c5 e espelham a estrutura branca.',
      rootNodeId: '',
      line: [
        ...inglesaMain.slice(0, 1),
        lesson(
          2,
          'c5',
          'As pretas espelham: a posição fica simétrica e ninguém se compromete com o centro.',
          {
            strategicIdea:
              'Simetria não é empate — quem quebrar o espelho primeiro escolhe o jogo.',
            resultingPlan: '...Cc6, ...g6 e ...Bg7, com um fianchetto de cada lado.',
          },
        ),
        lesson(3, 'Nf3', 'As brancas desenvolvem e mantêm as duas rupturas centrais disponíveis.', {
          resultingPlan: 'g3, Bg2 e O-O antes de decidir entre d4 e e3.',
        }),
      ],
    },
    {
      /*
        A ANGLO-ÍNDIA É A PONTE PARA TODO O RESTO DO REPERTÓRIO DE 1.d4: depois
        de ...Cf6 a partida pode virar Nimzo, Índia da Dama, Índia do Rei ou
        Gambito da Dama. Core porque essa transposição é o principal argumento
        da Inglesa.
      */
      id: 'inglesa-anglo-india',
      importancia: 'core',
      eco: 'A34',
      conceitos: ['concept.space-vs-counterplay', 'concept.break-d4', 'concept.bishop-pair'],
      estrutura: 'structure.slav-triangle',
      erroComum: {
        lance: 'e4',
        porque:
          'Ocupar o centro com o peão de e entrega a flexibilidade da Inglesa e convida ...Bb4 com pressão: a abertura existe justamente para não se comprometer antes do adversário.',
      },
      fronteira: { type: 'handoff', planId: 'inglesa-transposicao' },
      transposicoes: ['nimzo-classica', 'catala-fechada'],
      politicaDoLadoInverso:
        'Pelas pretas, demonstra-se escolher a defesa indiana preferida sem enfrentar a ordem de lances de 1.d4.',
      intencaoDoAdversario:
        'Manter todas as defesas indianas abertas e escolher a estrutura depois que as brancas se comprometerem.',
      objetivoDoAluno:
        'Escolher a transposição que favorece o seu repertório: com d4 a partida vira Índia, com g3 vira Catalã.',
      name: 'Anglo-Índia',
      description: 'As pretas respondem com ...Cf6 e a partida pode transpor para várias defesas.',
      rootNodeId: '',
      line: [
        ...inglesaMain.slice(0, 1),
        lesson(
          2,
          'Nf6',
          'As pretas desenvolvem sem se comprometer e mantêm todas as defesas indianas em aberto.',
          {
            strategicIdea:
              'Flexibilidade contra flexibilidade: quem ceder primeiro escolhe a partida.',
            resultingPlan: '...e6 ou ...g6, conforme as brancas montarem o centro.',
          },
        ),
        lesson(3, 'Nc3', 'As brancas disputam d5 e mantêm as duas ordens de lances possíveis.', {
          resultingPlan: 'd4 transpondo para as Índias, ou g3 indo para a Catalã.',
        }),
      ],
    },
  ],
  plans: [
    {
      id: 'inglesa-d5',
      name: 'Disputar a casa d5',
      positionNodeId: 'root',
      positionPly: 4,
      objective: 'Somar controle sobre d5 com o peão de c4, o cavalo de c3 e o bispo de g2.',
      when: 'Em toda a Inglesa — é o fio que liga a abertura inteira.',
      risk: 'Ocupar d5 cedo com um peão: a casa vale mais controlada que ocupada.',
      porQueFunciona:
        'O peão em c4 nunca ocupa o centro; ele nega a casa d5 ao adversário. Quando o cavalo de c3 e o bispo de g2 somam, as pretas não conseguem jogar ...d5 sem concessão — e sem ...d5 a posição delas fica sem ar.',
      preparacao:
        'O fianchetto completo, que é o terceiro atacante da casa. Com dois só, ...d5 costuma ser possível.',
      oQueOAdversarioTenta:
        'Preparar ...d5 com ...e6 e ...Bb4, ou desistir da casa e jogar por ...f5 e espaço no outro lado.',
    },
    {
      id: 'inglesa-transposicao',
      name: 'Escolher a transposição',
      positionNodeId: 'root',
      positionPly: 2,
      objective: 'Levar a partida para a estrutura que o seu repertório já conhece.',
      when: 'Sempre que as pretas jogarem ...Cf6 ou ...e6 sem se comprometer.',
      risk: 'Transpor no automático para uma posição que você não estudou, só porque é possível.',
      porQueFunciona:
        'A Inglesa adia o centro, e adiar significa escolher depois. Com d4 a partida vira uma Índia; com g3 e d4 vira a Catalã; sem d4 continua Inglesa. É o mesmo tabuleiro com três repertórios.',
      preparacao:
        'Saber qual das três você joga melhor. A flexibilidade só é vantagem para quem tem para onde ir.',
      oQueOAdversarioTenta:
        'Transpor primeiro, levando a partida para a defesa dele em vez da abertura sua.',
    },
    {
      id: 'inglesa-fianchetto',
      name: 'O fianchetto do rei',
      positionNodeId: 'root',
      positionPly: 4,
      objective: 'Pôr o bispo em g2 antes de decidir qualquer coisa no centro.',
      when: 'Em quase toda linha da Inglesa — é o lance que não se arrepende.',
      risk: 'Adiar o roque para completar o fianchetto num momento em que o centro já abriu.',
      porQueFunciona:
        'O bispo em g2 pressiona d5 e a diagonal longa sem se expor, e serve a todas as estruturas que a Inglesa pode gerar. É o desenvolvimento que não precisa saber ainda como a partida vai ser.',
      preparacao: 'Nada além de g3. É essa a vantagem: um lance útil em qualquer futuro.',
      oQueOAdversarioTenta:
        'Fechar a diagonal com ...d5 sustentado por ...c6, ou trocar o bispo com ...Bh3 depois do próprio fianchetto.',
      arrows: [{ from: 'f1', to: 'g2' }],
    },
  ],
  structures: [
    {
      name: 'Siciliana invertida',
      description:
        'Peão preto em e5 contra peão branco em c4, com um tempo a mais para as brancas. É a Siciliana com as cores trocadas — e o tempo extra vale mais do que parece numa estrutura assimétrica.',
      pawnBreaks: ['d4', 'd5', 'f5'],
      weakSquares: ['d5', 'd4'],
      openFiles: ['c', 'd'],
    },
  ],
  mistakes: [
    {
      id: 'inglesa-erro-centro-cedo',
      nodeId: 'root',
      positionPly: 2,
      moveSan: 'e4',
      explanation:
        'Ocupar o centro com o peão de e no segundo lance desfaz a ideia da Inglesa: a abertura existe para decidir a estrutura DEPOIS do adversário.',
      principle:
        'Flexibilidade é um ativo que se gasta uma vez — gastá-la cedo é abrir mão dela sem cobrar nada.',
    },
  ],
  version: 1,
})

const scandinavian = course({
  id: 'escandinava',
  slug: 'escandinava',
  name: 'Defesa Escandinava',
  side: 'black',
  ecoCodes: ['B01'],
  description:
    'Atacar o centro no primeiro lance e aceitar perder um tempo em troca de uma estrutura sem fraquezas.',
  philosophy: 'Poucas variações para decorar, um plano claro e o bispo de c8 resolvido cedo.',
  difficulty: 1,
  prerequisites: [],
  tags: ['semi-open', 'simple', 'positional'],
  transitionToMiddlegame:
    'A abertura termina quando a dama chega a uma casa estável e o bispo de c8 sai. A partir daí a posição parece uma Caro-Kann com um tempo a menos e uma preocupação a menos.',
  mainline: escandinavaMain,
  /*
    OS DOIS RAMOS BIFURCAM NO SEGUNDO LANCE PRETO — o mesmo ponto de decisão,
    pela regra que a Índia do Rei estabeleceu.
  */
  variations: [
    {
      /*
        A MODERNA (2...Cf6) É A LINHA QUE EVITA PERDER O TEMPO: em vez de
        recuperar com a dama, o cavalo vai buscar o peão. Core porque ela é a
        outra metade da defesa, e a escolha entre as duas é o conteúdo do curso.
      */
      id: 'escandinava-moderna',
      importancia: 'core',
      eco: 'B01',
      conceitos: [
        'concept.material-vs-initiative',
        'concept.space-vs-counterplay',
        'concept.bad-bishop',
      ],
      estrutura: 'structure.open-center',
      erroComum: {
        lance: 'Nxd5',
        porque:
          'Capturar em d5 no segundo lance permite c4 com tempo sobre o cavalo, e as pretas ficam sem o peão E sem desenvolvimento. A ordem correta é ...Cf6 primeiro e a recaptura só depois.',
      },
      fronteira: { type: 'handoff', planId: 'escandinava-bispo' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se segurar o peão com c4 e d4, aceitando ficar com um centro que precisa ser defendido.',
      intencaoDoAdversario:
        'Segurar o peão de d5 com c4 e provar que o cavalo preto perdeu mais tempo do que a dama teria perdido.',
      objetivoDoAluno:
        'Recuperar o peão sem perder tempo com a dama, aceitando uma posição mais dinâmica e menos simples.',
      name: 'Variante Moderna',
      description: 'As pretas recuperam o peão com o cavalo em vez da dama.',
      rootNodeId: '',
      line: [
        ...escandinavaMain.slice(0, 3),
        lesson(
          4,
          'Nf6',
          'O cavalo vai buscar o peão em vez da dama, evitando o tempo que Cc3 ganharia.',
          {
            strategicIdea: 'Trocar simplicidade por dinamismo: menos tempo perdido, mais teoria.',
            resultingPlan: '...Cxd5 depois, quando c4 não vier com tempo.',
          },
        ),
        lesson(5, 'd4', 'As brancas sustentam o peão de d5 e ocupam o centro enquanto podem.', {
          resultingPlan: 'c4 no próximo lance, se as pretas deixarem.',
        }),
      ],
    },
    {
      /*
        A QUALIDADE DA ESCANDINAVA ESTÁ NA CASA DA DAMA, e ...Dd6 é a
        alternativa moderna a ...Da5. Core porque muda o plano inteiro: a dama
        em d6 defende o centro em vez de pressionar a diagonal.
      */
      id: 'escandinava-qd6',
      importancia: 'core',
      eco: 'B01',
      conceitos: [
        'concept.king-safety-timing',
        'concept.space-vs-counterplay',
        'concept.open-file',
      ],
      estrutura: 'structure.caro-advance-chain',
      erroComum: {
        lance: 'Qd8',
        porque:
          'Recuar a dama para casa desfaz tudo o que a defesa comprou: as pretas ficam com um tempo a menos e a mesma posição inicial, sem nenhuma compensação pela abertura do centro.',
      },
      fronteira: { type: 'handoff', planId: 'escandinava-bispo' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se ganhar espaço com d4 e Cf3 enquanto a dama preta procura casa.',
      intencaoDoAdversario:
        'Ganhar tempo sobre a dama e ocupar o centro antes que as pretas completem o desenvolvimento.',
      objetivoDoAluno:
        'Pôr a dama numa casa que defende o centro e não atrapalha as peças, e só então desenvolver.',
      name: 'Variante com Dama em d6',
      description: 'A dama recua para d6 em vez de a5, defendendo o centro de perto.',
      rootNodeId: '',
      line: [
        ...escandinavaMain.slice(0, 5),
        lesson(
          6,
          'Qd6',
          'A dama recua para uma casa central: ela defende e não fica exposta a b4 ou Bd2.',
          {
            strategicIdea: 'A casa da dama é a decisão que define a Escandinava inteira.',
            resultingPlan: '...Cf6, ...c6 e ...Bf5, com estrutura sólida e a dama útil.',
          },
        ),
        lesson(
          7,
          'd4',
          'As brancas montam o centro completo, aproveitando os tempos que ganharam.',
          { resultingPlan: 'Cf3 e Bd3, com espaço e desenvolvimento rápido.' },
        ),
      ],
    },
  ],
  plans: [
    {
      id: 'escandinava-bispo',
      name: 'O bispo de c8 sai antes de ...e6',
      positionNodeId: 'root',
      positionPly: 6,
      objective: 'Pôr o bispo em f5 ou g4 antes de fechar a diagonal com o peão de e.',
      when: 'Em toda linha da Escandinava — é a razão de ela ser mais fácil que a Francesa.',
      risk: 'Jogar ...e6 primeiro por hábito: o bispo fica preso e a defesa perde a vantagem.',
      porQueFunciona:
        'A troca em d5 abriu a diagonal c8-h3 de graça. Diferente da Francesa e da Ortodoxa, aqui a peça problemática das defesas fechadas sai de casa antes de qualquer peão trancar o caminho.',
      preparacao: 'A dama já numa casa estável. Com ela exposta, o bispo sai e a dama apanha.',
      oQueOAdversarioTenta:
        'Expulsar o bispo com Cf3 e Ce5, ou trocá-lo com Bd3 antes de ele encontrar diagonal estável.',
      arrows: [{ from: 'c8', to: 'f5' }],
    },
    {
      id: 'escandinava-estrutura',
      name: 'A estrutura de Caro-Kann sem a Caro-Kann',
      positionNodeId: 'root',
      positionPly: 6,
      objective: 'Montar ...c6, ...Bf5 e ...e6 na ordem certa.',
      when: 'Depois de a dama achar casa.',
      risk: 'Montar a estrutura sem completar o desenvolvimento: solidez sem peças é só lentidão.',
      porQueFunciona:
        'A Escandinava chega à mesma estrutura da Caro-Kann por um caminho mais curto e sem teoria. O peão em c6 sustenta d5 no futuro, o bispo já saiu, e ...e6 fecha a caixa sem prender nada.',
      preparacao: 'O bispo de c8 já fora. É a ORDEM que faz esta estrutura valer a pena.',
      oQueOAdversarioTenta:
        'Ganhar espaço com d4 e c4 antes de a estrutura preta se completar, ou atacar a dama de novo com Cd5.',
    },
    {
      id: 'escandinava-tempo',
      name: 'Aceitar perder o tempo',
      positionNodeId: 'root',
      positionPly: 4,
      objective: 'Não gastar mais lances defendendo a dama do que o necessário.',
      when: 'Logo depois de ...Dxd5, quando Cc3 vem com ataque.',
      risk: 'Mover a dama duas ou três vezes: o preço combinado era UM tempo, não três.',
      porQueFunciona:
        'A defesa aceita perder um tempo em troca de uma estrutura sem fraquezas e de um bispo resolvido. A conta fecha enquanto o preço for um tempo; cada lance extra da dama transforma um negócio justo num prejuízo.',
      preparacao:
        'Escolher a casa da dama ANTES de capturar, olhando para b4, Bd2 e Cd5 — as três ameaças que a expulsariam de novo.',
      oQueOAdversarioTenta:
        'Perseguir a dama com Cd5, Bd2 e b4, cobrando um tempo a cada lance de desenvolvimento.',
    },
  ],
  structures: [
    {
      name: 'Estrutura escandinava',
      description:
        'Peões pretos em c6 e e6 com o bispo JÁ FORA em f5. É a estrutura da Caro-Kann sem o problema do bispo — e é isso que a defesa compra com o tempo que perde.',
      pawnBreaks: ['c5', 'e5'],
      weakSquares: ['d5', 'b7'],
      openFiles: ['d'],
    },
  ],
  mistakes: [
    {
      id: 'escandinava-erro-dama-passeia',
      nodeId: 'root',
      positionPly: 5,
      moveSan: 'Qe5+',
      explanation:
        'Sair com a dama para o meio do tabuleiro convida Be2, Cf3 e Cd5 com ataque: cada xeque custa um tempo de desenvolvimento e não ganha nada.',
      principle:
        'Xeque não é ameaça: se ele não muda a posição a seu favor, é só um lance a menos para você.',
    },
  ],
  version: 1,
})

const pirc = course({
  id: 'pirc',
  slug: 'pirc',
  name: 'Defesa Pirc',
  side: 'black',
  ecoCodes: ['B07', 'B08', 'B09'],
  description:
    'Ceder o centro para atacá-lo com peças: fianchetto, roque rápido e a ruptura no momento certo.',
  philosophy: 'A Índia do Rei contra 1.e4 — menos espaço, mais flexibilidade, uma ruptura marcada.',
  difficulty: 2,
  prerequisites: [],
  tags: ['semi-open', 'closed', 'flexible'],
  transitionToMiddlegame:
    'A abertura termina quando as pretas escolhem entre ...c5 e ...e5. A partir daí a pergunta é se o centro branco vira força ou alvo.',
  mainline: pircMain,
  /*
    OS DOIS RAMOS BIFURCAM NO QUARTO LANCE BRANCO — o mesmo ponto de decisão.
    Ver a Índia do Rei para a razão.
  */
  variations: [
    {
      /*
        O ATAQUE AUSTRÍACO É A LINHA MAIS AGRESSIVA CONTRA A PIRC: quatro peões
        no centro e f4 mirando o roque. Core porque é a punição de quem cede o
        centro sem plano de ruptura.
      */
      id: 'pirc-austriaco',
      importancia: 'core',
      eco: 'B09',
      conceitos: ['concept.space-vs-counterplay', 'concept.break-c5', 'concept.king-safety-timing'],
      estrutura: 'structure.benoni-center',
      motivos: ['motif.pin-on-d-file'],
      erroComum: {
        lance: 'e5',
        porque:
          'Romper com o peão de e contra quatro peões centrais abre a coluna f para a torre branca justamente onde o rei preto acabou de rocar. Contra o Austríaco, a ruptura correta é ...c5, na ala em que as brancas não têm peças.',
      },
      fronteira: { type: 'handoff', planId: 'pirc-c5' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se converter espaço em ataque: f4-f5 e e5 com peças prontas.',
      intencaoDoAdversario:
        'Ocupar o máximo de espaço com f4 e atacar o roque preto antes que a ruptura chegue.',
      objetivoDoAluno:
        'Atacar na ala da dama com ...c5, onde as brancas gastaram nenhum lance — cada peão que avança na ala do rei é um defensor a menos lá.',
      name: 'Ataque Austríaco',
      description: 'As brancas jogam f4 e montam quatro peões centrais mirando o roque preto.',
      rootNodeId: '',
      line: [
        ...pircMain.slice(0, 6),
        lesson(
          7,
          'f4',
          'O quarto peão central entra e as brancas apostam no ataque direto ao roque preto.',
          {
            arrows: [{ from: 'f2', to: 'f4' }],
            strategicIdea:
              'Centro grande é força e alvo: ele precisa de peças que ainda não chegaram.',
            resultingPlan: 'Cf3, Bd3 e a corrida com e5 e f5.',
          },
        ),
        lesson(
          8,
          'Bg7',
          'As pretas completam o fianchetto: contra um ataque de peões, a defesa começa pelo contrajogo.',
          { resultingPlan: '...O-O e ...c5 imediatamente, sem esperar o ataque chegar.' },
        ),
      ],
    },
    {
      /*
        O ATAQUE 150 É O SISTEMA MAIS PRÁTICO contra a Pirc em nível de clube:
        Be3, Dd2 e Bh6 trocando o bispo que dá nome à defesa. Core porque a
        resposta certa não é natural.
      */
      id: 'pirc-150',
      importancia: 'core',
      eco: 'B07',
      conceitos: ['concept.bad-bishop', 'concept.king-safety-timing', 'concept.break-c5'],
      estrutura: 'structure.kid-locked-center',
      motivos: ['motif.greek-gift'],
      erroComum: {
        lance: 'O-O',
        porque:
          'Rocar no automático entrega o rei ao ataque que Dd2 e Bh6 preparam, com h4-h5 vindo em seguida. Contra o 150, as pretas atrasam o roque e resolvem primeiro a troca do bispo de g7.',
      },
      fronteira: { type: 'handoff', planId: 'pirc-bispo' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se trocar o bispo de g7 e atacar as casas escuras que sobraram.',
      intencaoDoAdversario:
        'Trocar o bispo de g7 com Bh6 e atacar as casas escuras ao redor do rei preto com h4 e h5.',
      objetivoDoAluno:
        'Evitar a troca do bispo ou cobrá-la caro: sem ele, o roque preto fica sem o defensor das casas escuras.',
      name: 'Ataque 150',
      description: 'As brancas jogam Be3 e Dd2 mirando a troca do bispo de g7 com Bh6.',
      rootNodeId: '',
      line: [
        ...pircMain.slice(0, 6),
        lesson(
          7,
          'Be3',
          'O bispo prepara Dd2 e Bh6, mirando a troca da peça que defende as casas escuras pretas.',
          {
            strategicIdea:
              'Trocar o bispo bom do adversário vale mais que desenvolver mais uma peça.',
            resultingPlan: 'Dd2, Bh6 e h4-h5 contra o roque.',
          },
        ),
        lesson(
          8,
          'Bg7',
          'O bispo ocupa a diagonal — e agora o roque fica POSSÍVEL, que é exatamente a armadilha.',
          { resultingPlan: 'Decidir o rei só depois de resolver a ameaça de troca em h6.' },
        ),
        lesson(
          9,
          'Qd2',
          'A dama arma Bh6: a troca do bispo de g7 é a ideia inteira deste sistema.',
          { resultingPlan: 'Bh6 e depois h4-h5 contra o roque preto.' },
        ),
        lesson(
          10,
          'c6',
          'As pretas preparam ...b5 e atrasam o roque: sem rei na ala do rei, o ataque perde o alvo.',
          { resultingPlan: '...b5 e ...Da5, jogando na ala da dama antes de decidir o rei.' },
        ),
      ],
    },
  ],
  plans: [
    {
      id: 'pirc-c5',
      name: 'A ruptura ...c5',
      positionNodeId: 'root',
      positionPly: 8,
      objective: 'Atacar a base do centro branco na ala em que ele tem menos peças.',
      when: 'Contra centros grandes, e sempre que as brancas comprometerem peões na ala do rei.',
      risk: 'Romper sem ter completado o desenvolvimento: um centro que abre favorece quem tem mais peças.',
      porQueFunciona:
        'A Pirc cede o centro para que ele fique grande demais para ser sustentado. Com ...c5 as pretas atacam d4 enquanto o bispo de g7 pressiona a mesma casa pela diagonal — dois atacantes com um lance de peão.',
      preparacao:
        'O bispo em g7 já na diagonal e o rei decidido. A ruptura é o fim da preparação, e não o começo dela.',
      oQueOAdversarioTenta:
        'Avançar d5 travando o centro, ou trocar em c5 para abrir a posição enquanto tem mais espaço.',
      arrows: [{ from: 'c7', to: 'c5' }],
    },
    {
      id: 'pirc-bispo',
      name: 'O bispo de g7 é a defesa',
      positionNodeId: 'root',
      positionPly: 8,
      objective: 'Não deixar o bispo de g7 ser trocado de graça.',
      when: 'Sempre que as brancas jogarem Be3 e Dd2 mirando Bh6.',
      risk: 'Gastar lances demais evitando a troca e ficar sem desenvolvimento nenhum.',
      porQueFunciona:
        'O bispo em g7 faz duas coisas ao mesmo tempo: pressiona d4 e defende as casas escuras ao redor do rei. Trocá-lo tira as duas de uma vez, e é por isso que o Ataque 150 existe.',
      preparacao:
        'Decidir o rei ANTES: com o roque adiado, Bh6 perde o sentido, porque não há rei atrás do bispo.',
      oQueOAdversarioTenta:
        'Forçar a troca com Bh6 logo depois do roque preto, e então avançar h4-h5 contra o rei desprotegido.',
    },
    {
      id: 'pirc-e5',
      name: 'A ruptura ...e5',
      positionNodeId: 'root',
      positionPly: 8,
      objective: 'Disputar o centro de frente quando as brancas não avançaram na ala do rei.',
      when: 'Contra sistemas tranquilos com Cf3 e Be2, e nunca contra o Austríaco.',
      risk: 'Romper com a coluna f já aberta ou prestes a abrir: o rei preto paga a conta.',
      porQueFunciona:
        'Quando as brancas jogam sem f4, o centro delas é sustentado por peças e não por peões. ...e5 obriga d4 a decidir, e qualquer decisão dá às pretas a casa d4 ou a coluna aberta.',
      preparacao: 'Roque feito, torre em e8 e um cavalo em d7 ou c6 apontando para e5.',
      oQueOAdversarioTenta:
        'Trocar em e5 para simplificar, ou avançar d5 travando o centro e correndo na ala da dama.',
      arrows: [{ from: 'e7', to: 'e5' }],
    },
  ],
  structures: [
    {
      name: 'Centro cedido da Pirc',
      description:
        'Peões brancos em d4 e e4 contra peões pretos em d6 e g6, com o bispo em g7. As brancas têm espaço e as pretas têm duas rupturas marcadas — a escolha entre elas é o conteúdo da defesa.',
      pawnBreaks: ['c5', 'e5', 'f5'],
      weakSquares: ['d4', 'f4'],
      openFiles: ['c', 'e'],
    },
  ],
  mistakes: [
    {
      id: 'pirc-erro-sem-ruptura',
      nodeId: 'root',
      positionPly: 7,
      moveSan: 'Nbd7',
      explanation:
        'Desenvolver sem preparar ruptura nenhuma deixa as pretas com menos espaço e nenhum plano: a Pirc só funciona se o centro branco um dia for atacado.',
      principle: 'Ceder o centro é um empréstimo — quem nunca cobra fica apenas com menos espaço.',
    },
  ],
  version: 1,
})

const grunfeld = course({
  id: 'grunfeld',
  slug: 'grunfeld',
  name: 'Defesa Grünfeld',
  side: 'black',
  ecoCodes: ['D80', 'D85', 'D90'],
  description:
    'Deixar as brancas montarem o centro para transformá-lo em alvo: o bispo de g7 e a ruptura ...c5.',
  philosophy:
    'Um centro grande não é vantagem enquanto não estiver defendido — e defendê-lo custa tempo.',
  difficulty: 3,
  prerequisites: ['india-do-rei'],
  tags: ['closed', 'sharp', 'dynamic'],
  transitionToMiddlegame:
    'A abertura termina quando a ruptura ...c5 encontra o centro branco. A partir daí a pergunta é se ele vira rolo compressor ou fraqueza.',
  mainline: grunfeldMain,
  /* Os dois ramos bifurcam no quarto lance branco — o mesmo ponto de decisão. */
  variations: [
    {
      /*
        O SISTEMA RUSSO (4.Cf3 e 5.Db3) pressiona d5 antes de montar o centro.
        Core porque ele evita a Troca e obriga outro plano.
      */
      id: 'grunfeld-russo',
      importancia: 'core',
      eco: 'D90',
      conceitos: ['concept.break-c5', 'concept.space-vs-counterplay', 'concept.open-file'],
      estrutura: 'structure.open-center',
      erroComum: {
        lance: 'dxc4',
        porque:
          'Capturar em c4 sem preparo devolve o centro e dá tempo: as brancas recuperam o peão com Dxc4 desenvolvendo e ficam com espaço de graça. Na Grünfeld, a troca em c4 só vale quando ...c5 já estiver pronto.',
      },
      fronteira: { type: 'handoff', planId: 'grunfeld-c5' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se pressionar d5 com peças antes de montar o centro, evitando a Troca.',
      intencaoDoAdversario:
        'Pressionar d5 com peças em vez de trocar, mantendo o centro flexível e as pretas sem alvo.',
      objetivoDoAluno:
        'Sustentar d5 e preparar ...c5 com peças: contra pressão de peça, a resposta é desenvolvimento, não captura.',
      name: 'Sistema Russo',
      description: 'As brancas desenvolvem o cavalo e pressionam d5 antes de decidir o centro.',
      rootNodeId: '',
      line: [
        ...grunfeldMain.slice(0, 6),
        lesson(
          7,
          'Nf3',
          'O cavalo desenvolve e as brancas adiam a troca em d5, mantendo a tensão central.',
          {
            strategicIdea: 'Quem adia a troca escolhe a estrutura depois do adversário.',
            resultingPlan: 'Db3 pressionando d5, ou cxd5 mais tarde em melhores condições.',
          },
        ),
        lesson(
          8,
          'Bg7',
          'As pretas completam o fianchetto sem resolver a tensão — o bispo já aponta para d4.',
          { resultingPlan: '...O-O e ...c5, com o centro ainda por decidir.' },
        ),
      ],
    },
    {
      /*
        O SISTEMA COM Bf4 é a resposta prática mais comum em clube: desenvolve
        e evita a teoria da Troca. Core porque a resposta natural das pretas
        está errada.
      */
      id: 'grunfeld-bf4',
      importancia: 'core',
      eco: 'D83',
      conceitos: ['concept.break-c5', 'concept.bishop-pair', 'concept.space-vs-counterplay'],
      estrutura: 'structure.open-center',
      erroComum: {
        lance: 'Bg7',
        porque:
          'Completar o fianchetto no automático ignora a ameaça concreta: com o bispo em f4 e a tensão em d5, as brancas jogam cxd5 e Cxd5 com tempo. A ordem correta passa por resolver a tensão primeiro.',
      },
      fronteira: { type: 'handoff', planId: 'grunfeld-c5' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se desenvolver com ameaça e evitar a teoria pesada da Troca.',
      intencaoDoAdversario:
        'Desenvolver o bispo fora da cadeia e manter a pressão sobre d5 sem entrar na teoria da Troca.',
      objetivoDoAluno:
        'Resolver a tensão central antes de completar o desenvolvimento, para que o bispo em f4 não ganhe tempo.',
      name: 'Sistema com Bf4',
      description: 'As brancas desenvolvem o bispo para f4 antes de tocar no centro.',
      rootNodeId: '',
      line: [
        ...grunfeldMain.slice(0, 6),
        lesson(
          7,
          'Bf4',
          'O bispo sai da cadeia e pressiona a casa c7, somando à tensão que já existe em d5.',
          {
            strategicIdea: 'Desenvolver com ameaça vale dois lances: um de peça, um de tempo.',
            resultingPlan: 'e3 e Tc1, com pressão na coluna c.',
          },
        ),
        lesson(
          8,
          'dxc4',
          'Agora a captura faz sentido: ela resolve a tensão antes de o bispo cobrar por ela.',
          { resultingPlan: '...Bg7 e ...c5, com o centro já definido.' },
        ),
      ],
    },
  ],
  plans: [
    {
      id: 'grunfeld-c5',
      name: 'A ruptura ...c5',
      positionNodeId: 'root',
      positionPly: 8,
      objective: 'Atacar a base do centro branco enquanto o bispo de g7 pressiona a mesma casa.',
      when: 'Assim que o fianchetto estiver completo e o rei decidido.',
      risk: 'Romper antes do roque: num centro que abre, o rei no meio é o alvo mais caro.',
      porQueFunciona:
        'A Grünfeld convida o centro a crescer para que ele fique indefensável. O bispo de g7 mira d4 desde o quarto lance, e ...c5 acrescenta um segundo atacante — o peão que sustenta tudo passa a ter dois inimigos e um defensor.',
      preparacao: 'Bispo em g7, rei rocado e, quando possível, ...Cc6 apontando para d4 também.',
      oQueOAdversarioTenta:
        'Avançar d5 para travar o centro, ou completar o desenvolvimento com Be3 e Tc1 antes de a ruptura chegar.',
      arrows: [{ from: 'c7', to: 'c5' }],
    },
    {
      id: 'grunfeld-diagonal',
      name: 'A diagonal do bispo de g7',
      positionNodeId: 'root',
      positionPly: 6,
      objective: 'Manter a diagonal a1-h8 aberta, apontando para d4 e além.',
      when: 'Em toda a Grünfeld — é o ativo que a defesa monta antes de qualquer peão.',
      risk: 'Trocar o bispo ou fechar a diagonal com os próprios peões.',
      porQueFunciona:
        'O bispo de g7 é a única peça preta que ataca o centro branco desde o começo, e ele faz isso de fora do alcance de qualquer peão. Toda a defesa existe para que a diagonal um dia se abra por completo.',
      preparacao: 'Não pôr peões pretos em e5 ou d4, que bloqueariam a própria diagonal.',
      oQueOAdversarioTenta:
        'Trocar o bispo com Bh6, ou avançar d5 e e5 travando a diagonal com peões sustentados.',
      arrows: [{ from: 'g7', to: 'd4' }],
    },
    {
      id: 'grunfeld-cavalo-c3',
      name: 'Pressionar o cavalo de c3',
      positionNodeId: 'root',
      positionPly: 8,
      objective: 'Somar ataques sobre c3 até que a estrutura branca ceda.',
      when: 'Logo depois de ...Cxd5, quando o cavalo já está atacando.',
      risk: 'Trocar em c3 cedo: os peões dobrados só pesam se a posição fechar depois.',
      porQueFunciona:
        'O cavalo em d5 ataca c3 desde a recaptura, e o bispo de g7 aponta para a mesma região pela diagonal. Quando as brancas jogam e4 expulsando o cavalo, elas ganham centro e perdem o defensor de d4 — as duas coisas no mesmo lance.',
      preparacao:
        'O bispo já em g7. Sem ele, a pressão sobre c3 é de uma peça só e some com um lance de defesa.',
      oQueOAdversarioTenta:
        'Expulsar o cavalo com e4 ganhando tempo e espaço, ou defender c3 com Bd2 antes de a pressão somar.',
    },
  ],
  structures: [
    {
      name: 'Centro branco grande',
      description:
        'Peões brancos em d4 e e4 contra peões pretos em c7 e e7, com o bispo em g7. É força enquanto avança e alvo no instante em que para — a Grünfeld inteira é uma aposta em qual dos dois acontece primeiro.',
      pawnBreaks: ['c5', 'e5', 'd5'],
      weakSquares: ['d4', 'c3'],
      openFiles: ['c', 'd'],
    },
  ],
  mistakes: [
    {
      id: 'grunfeld-erro-e5-cedo',
      nodeId: 'root',
      positionPly: 8,
      moveSan: 'e4',
      explanation:
        'Expulsar o cavalo com e4 é o plano certo na hora errada: sem Bd2 ou Tc1, o centro branco fica sem defensores e ...c5 vem com força total.',
      principle:
        'Ganhar espaço e perder defensores é a mesma jogada — o que decide é qual das duas coisas importa mais naquela posição.',
    },
  ],
  version: 1,
})

const dutch = course({
  id: 'holandesa',
  slug: 'holandesa',
  name: 'Defesa Holandesa',
  side: 'black',
  ecoCodes: ['A80', 'A85', 'A88'],
  description:
    'Disputar e4 com o peão de f e jogar na ala do rei: espaço e iniciativa em troca de uma casa frágil.',
  philosophy:
    'Escolher desequilíbrio desde o primeiro lance, e aceitar o preço em segurança do rei.',
  difficulty: 3,
  prerequisites: [],
  tags: ['closed', 'sharp', 'asymmetric'],
  transitionToMiddlegame:
    'A abertura termina quando as pretas escolhem entre ...e5 e ...c5 e o rei está rocado. A partir daí a pergunta é se a coluna f vira ataque ou fraqueza.',
  mainline: holandesaMain,
  /* Os dois ramos bifurcam no segundo lance branco — o mesmo ponto de decisão. */
  variations: [
    {
      /*
        O GAMBITO STAUNTON É A PUNIÇÃO CLÁSSICA de ...f5: as brancas entregam um
        peão para abrir linhas contra o rei que acabou de se enfraquecer. Core
        porque quem não sabe o que fazer com ele perde cedo.
      */
      id: 'holandesa-staunton',
      importancia: 'core',
      eco: 'A82',
      conceitos: [
        'concept.material-vs-initiative',
        'concept.king-safety-timing',
        'concept.open-file',
      ],
      estrutura: 'structure.open-center',
      motivos: ['motif.pin-on-d-file'],
      erroComum: {
        lance: 'd5',
        porque:
          'Fechar o centro com o peão de d permite Bxf6 e Dh5+ com o rei preto ainda no meio. Contra um gambito, a resposta é desenvolvimento e devolução do peão — nunca um lance de peão que abre a diagonal do rei.',
      },
      fronteira: { type: 'handoff', planId: 'holandesa-rei' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se pagar um peão para abrir a posição contra um rei que ...f5 deixou mais frágil.',
      intencaoDoAdversario:
        'Entregar um peão para abrir a coluna e a diagonal contra o rei preto antes de ele rocar.',
      objetivoDoAluno:
        'Devolver o peão e completar o desenvolvimento: contra iniciativa, material devolvido no tempo certo é a melhor defesa.',
      name: 'Gambito Staunton',
      description: 'As brancas entregam um peão em e4 para abrir linhas contra o rei preto.',
      rootNodeId: '',
      line: [
        ...holandesaMain.slice(0, 2),
        lesson(
          3,
          'e4',
          'O peão é oferecido para abrir a posição enquanto o rei preto ainda está no meio.',
          {
            arrows: [{ from: 'e2', to: 'e4' }],
            strategicIdea: 'Um peão por duas linhas abertas e um rei sem roque.',
            resultingPlan: 'Cc3 e Bg5, com desenvolvimento e ameaça a cada lance.',
          },
        ),
        lesson(
          4,
          'fxe4',
          'Aceitar é correto: recusar deixaria as brancas com centro grande E o peão.',
          { resultingPlan: '...Cf6 e ...e6, devolvendo o peão para completar o desenvolvimento.' },
        ),
      ],
    },
    {
      /*
        A STONEWALL É A OUTRA HOLANDESA: em vez de fianchetar, as pretas montam
        um muro de peões. Core porque as duas estruturas pedem planos opostos, e
        escolher entre elas é o conteúdo do curso.
      */
      id: 'holandesa-stonewall',
      importancia: 'core',
      eco: 'A85',
      conceitos: ['concept.bad-bishop', 'concept.space-vs-counterplay', 'concept.backward-pawn'],
      estrutura: 'structure.french-chain',
      erroComum: {
        lance: 'g6',
        porque:
          'Fianchetar dentro da Stonewall é misturar dois planos: com peões em d5 e e6, o bispo de g7 fica olhando para a própria estrutura. A Stonewall resolve o bispo por d7-e8-h5, não pela diagonal longa.',
      },
      fronteira: { type: 'handoff', planId: 'holandesa-e5' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se atacar a casa e5 e trocar o bispo mau preto antes que ele se resolva.',
      intencaoDoAdversario:
        'Ocupar e5 com peça e trocar o bispo de casas claras das pretas, que é a peça presa da estrutura.',
      objetivoDoAluno:
        'Montar o muro d5-e6-f5 e resolver o bispo de c8 pela rota d7-e8-h5, que é a única que a estrutura permite.',
      name: 'Stonewall',
      description: 'As pretas montam um muro de peões em d5, e6 e f5 em vez de fianchetar.',
      rootNodeId: '',
      line: [
        ...holandesaMain.slice(0, 2),
        lesson(
          3,
          'c4',
          'As brancas ocupam o centro do lado da dama antes de decidir o fianchetto.',
          {
            strategicIdea: 'Contra a Holandesa, disputar d5 vale mais que correr para o rei.',
            resultingPlan: 'Cc3 ou g3, conforme a estrutura preta se definir.',
          },
        ),
        lesson(
          4,
          'e6',
          'As pretas preparam o muro: ...d5 vem em seguida e a estrutura fica travada.',
          { resultingPlan: '...d5 e ...c6, com a casa e4 negada às brancas para sempre.' },
        ),
      ],
    },
  ],
  plans: [
    {
      id: 'holandesa-e5',
      name: 'A ruptura ...e5',
      positionNodeId: 'root',
      positionPly: 6,
      objective: 'Abrir o centro pela casa que o peão de f e o cavalo já disputam.',
      when: 'Na Leningrado, depois do roque e de ...d6.',
      risk: 'Romper com a coluna e aberta para o adversário: a mesma abertura serve aos dois.',
      porQueFunciona:
        'A Holandesa nega e4 às brancas desde o primeiro lance, e ...e5 é a cobrança: as pretas ocupam o centro que negaram. Com o bispo em g7 e a torre em f8, a ruptura vem com três peças apontando para o mesmo lugar.',
      preparacao:
        'Rei rocado, ...d6 jogado e o cavalo de b8 em d7 ou c6. São três lances para um — e é essa a proporção correta.',
      oQueOAdversarioTenta:
        'Ocupar e5 primeiro com Cf3-e5, ou avançar d5 travando o centro antes de a ruptura chegar.',
      arrows: [{ from: 'e7', to: 'e5' }],
    },
    {
      id: 'holandesa-rei',
      name: 'O preço de ...f5',
      positionNodeId: 'root',
      positionPly: 2,
      objective: 'Rocar rápido e não deixar a diagonal e8-h5 aberta mais tempo que o necessário.',
      when: 'Sempre — é o custo fixo da abertura.',
      risk: 'Gastar lances demais com a segurança e perder a iniciativa que ...f5 comprou.',
      porQueFunciona:
        'O lance ...f5 ganha espaço e enfraquece a diagonal que leva ao rei. Todo gambito contra a Holandesa mira essa diagonal, e o roque a fecha. Quem roca cedo paga o preço uma vez; quem adia paga a cada lance.',
      preparacao: 'O cavalo em f6 antes do bispo: ele tapa a diagonal e permite rocar sem sustos.',
      oQueOAdversarioTenta:
        'Abrir a diagonal com e4 e Bg5, ou provocar ...g6 para depois atacar as casas escuras.',
    },
    {
      id: 'holandesa-bispo',
      name: 'O bispo de c8 na Stonewall',
      positionNodeId: 'root',
      positionPly: 4,
      objective: 'Levar o bispo para h5 pela rota d7-e8, já que a diagonal normal está trancada.',
      when: 'Em toda estrutura Stonewall, depois de ...d5 e ...e6.',
      risk: 'Deixar o bispo em c8 a partida inteira: uma peça que não joga é material a menos.',
      porQueFunciona:
        'Peões em d5, e6 e f5 trancam o bispo de casas claras por dentro e por fora. A única saída é por trás: ...Bd7, ...Be8 e ...Bh5, onde ele troca o bispo branco ou pressiona a ala do rei.',
      preparacao:
        'Rei rocado e a torre de f8 já saída de f8, para que o bispo passe por e8 sem tropeçar.',
      oQueOAdversarioTenta:
        'Trocar o bispo antes de ele chegar, com Ba3 ou Bd3, ou ocupar e5 para que a manobra não tenha tempo.',
    },
  ],
  structures: [
    {
      name: 'Muro da Stonewall',
      description:
        'Peões pretos em c6, d5, e6 e f5. O muro nega e4 e e5 para sempre, e cobra um bispo de casas claras que precisa dar a volta pelo próprio campo.',
      pawnBreaks: ['e5', 'c5', 'g5'],
      weakSquares: ['e5', 'e4'],
      openFiles: ['f'],
    },
  ],
  mistakes: [
    {
      id: 'holandesa-erro-roque-tarde',
      nodeId: 'root',
      positionPly: 5,
      moveSan: 'd6',
      explanation:
        'Jogar ...d6 antes de completar o desenvolvimento da ala do rei deixa a diagonal e8-h5 aberta um lance a mais — e é exatamente nela que todo ataque contra a Holandesa mira.',
      principle:
        'Quando a abertura enfraquece uma diagonal que leva ao rei, a ordem dos lances deixa de ser detalhe.',
    },
  ],
  version: 1,
})

const semiEslava = course({
  id: 'semi-eslava',
  slug: 'semi-eslava',
  name: 'Defesa Semi-Eslava',
  side: 'black',
  ecoCodes: ['D43', 'D45', 'D47'],
  description:
    'Defender d5 com dois peões e cobrar o preço depois: ...dxc4 e ...b5 libertam o bispo trancado.',
  philosophy: 'Aceitar uma peça ruim por alguns lances em troca de um centro que ninguém derruba.',
  difficulty: 3,
  prerequisites: ['defesa-eslava'],
  tags: ['closed', 'solid', 'sharp'],
  transitionToMiddlegame:
    'A abertura termina quando as pretas jogam ...dxc4 e ...b5. A partir daí a pergunta é se o bispo de c8 chega a tempo de valer o atraso.',
  mainline: semiEslavaMain,
  /* Os dois ramos bifurcam no quinto lance branco — o mesmo ponto de decisão. */
  variations: [
    {
      /*
        O MERAN É A LINHA PRINCIPAL: as brancas jogam e3 e Bd3, e as pretas
        cobram com ...dxc4 e ...b5. Core porque é o plano que dá sentido a ...e6.
      */
      id: 'semi-eslava-meran',
      importancia: 'core',
      eco: 'D47',
      conceitos: ['concept.bad-bishop', 'concept.space-vs-counterplay', 'concept.break-c5'],
      estrutura: 'structure.french-chain',
      erroComum: {
        lance: 'Be7',
        porque:
          'Desenvolver o bispo de f8 antes de ...dxc4 devolve a iniciativa: as brancas jogam e4 e o bispo de c8 fica trancado a partida inteira. Na Semi-Eslava, a ordem é primeiro capturar em c4, depois desenvolver.',
      },
      fronteira: { type: 'handoff', planId: 'semi-eslava-b5' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se montar o centro com e4 antes que ...b5 ganhe espaço.',
      intencaoDoAdversario:
        'Desenvolver com e3 e Bd3 e preparar e4, montando o centro grande antes de as pretas se soltarem.',
      objetivoDoAluno:
        'Jogar ...dxc4 no momento em que o bispo branco chega a d3, ganhando um tempo com a captura.',
      name: 'Variante Meran',
      description: 'As brancas jogam e3 e Bd3; as pretas respondem com ...dxc4 e ...b5.',
      rootNodeId: '',
      line: [
        ...semiEslavaMain.slice(0, 8),
        lesson(9, 'e3', 'As brancas liberam o bispo de f1 e sustentam d4.', {
          strategicIdea: 'Desenvolvimento sólido antes de decidir onde jogar o centro.',
          resultingPlan: 'Bd3, O-O e e4 no momento certo.',
        }),
        lesson(
          10,
          'Nbd7',
          'O cavalo prepara ...dxc4 apoiando a casa c5 e o avanço ...b5 que vem depois.',
          { resultingPlan: '...dxc4 e ...b5, com espaço na ala da dama e o bispo livre.' },
        ),
      ],
    },
    {
      /*
        O ANTI-MERAN COM Bg5 É A LINHA MAIS AGUDA do xadrez de abertura: as
        brancas cravam o cavalo e as pretas respondem com o Botvinnik ou o
        Moscou. Core porque a resposta natural é a mais passiva da posição.
      */
      id: 'semi-eslava-bg5',
      importancia: 'core',
      eco: 'D43',
      conceitos: [
        'concept.material-vs-initiative',
        'concept.king-safety-timing',
        'concept.open-file',
      ],
      estrutura: 'structure.open-center',
      motivos: ['motif.pin-on-d-file'],
      erroComum: {
        lance: 'Be7',
        porque:
          'Desfazer a cravada com ...Be7 é o lance natural e o mais passivo da posição: as brancas jogam e3 e Bd3 com tudo pronto e as pretas ficam sem contrajogo nenhum. Contra Bg5 a resposta ativa é ...dxc4 ou ...h6.',
      },
      fronteira: { type: 'handoff', planId: 'semi-eslava-cravada' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se cravar antes de e3, cobrando a casa d5 com uma peça a mais.',
      intencaoDoAdversario:
        'Cravar o cavalo de f6 antes de fechar a diagonal com e3, somando pressão sobre d5.',
      objetivoDoAluno:
        'Responder à cravada com atividade — ...dxc4 ou ...h6 — em vez de desfazê-la passivamente.',
      name: 'Anti-Meran com Bg5',
      description: 'As brancas cravam o cavalo de f6 antes de desenvolver o resto.',
      rootNodeId: '',
      line: [
        ...semiEslavaMain.slice(0, 8),
        lesson(
          9,
          'Bg5',
          'A cravada entra antes de e3: o bispo sai da cadeia enquanto ainda pode.',
          {
            arrows: [{ from: 'c1', to: 'g5' }],
            strategicIdea: 'Um bispo que sai antes de e3 é um bispo que não fica preso.',
            resultingPlan: 'e3 em seguida, com pressão sobre d5 e f6.',
          },
        ),
        lesson(
          10,
          'dxc4',
          'As pretas capturam e o peão de c4 vira o problema das brancas — o Botvinnik começa aqui.',
          {
            resultingPlan: '...b5 sustentando o peão, com espaço e o bispo de c8 finalmente livre.',
          },
        ),
      ],
    },
  ],
  plans: [
    {
      id: 'semi-eslava-b5',
      name: 'O avanço ...b5',
      positionNodeId: 'root',
      positionPly: 8,
      objective: 'Sustentar o peão de c4 capturado e abrir a diagonal do bispo de c8.',
      when: 'Logo depois de ...dxc4, e nunca antes.',
      risk: 'Avançar na ala da dama com o centro ainda aberto: a4 e e4 chegam antes.',
      porQueFunciona:
        'O lance ...e6 tranca o bispo de c8 de propósito, e ...b5 é a fatura: com peões em b5 e c6, o bispo sai por b7 para a diagonal mais longa do tabuleiro. O peão a mais na ala da dama também ganha espaço onde as brancas não gastaram lance nenhum.',
      preparacao: 'O cavalo em d7 primeiro: sem ele, a4 quebra a corrente antes de ela existir.',
      oQueOAdversarioTenta:
        'Quebrar a cadeia com a4 imediatamente, ou montar o centro com e4 e e5 antes de o bispo chegar a b7.',
      arrows: [{ from: 'b7', to: 'b5' }],
    },
    {
      id: 'semi-eslava-cravada',
      name: 'Responder à cravada com atividade',
      positionNodeId: 'root',
      positionPly: 8,
      objective: 'Não desfazer a cravada com um lance passivo, e sim contra-atacar.',
      when: 'Sempre que as brancas jogarem Bg5 antes de e3.',
      risk: 'Entrar em linhas de cálculo longo sem conhecê-las: o Botvinnik pune quem improvisa.',
      porQueFunciona:
        'A cravada só machuca se ela custar tempo às pretas. ...dxc4 e ...h6 devolvem a pergunta: as brancas precisam decidir o que fazer com o bispo E com o peão, e cada decisão custa um lance que elas não tinham.',
      preparacao:
        'Saber de antemão qual das duas respostas se vai jogar. Escolher no tabuleiro é tarde demais nesta linha.',
      oQueOAdversarioTenta:
        'Manter a cravada e somar pressão com e3 e Bd3, ou recuperar c4 com e4 ganhando o centro inteiro.',
    },
    {
      id: 'semi-eslava-bispo',
      name: 'O bispo de c8 é o relógio da abertura',
      positionNodeId: 'root',
      positionPly: 8,
      objective: 'Medir cada plano pelo que ele faz com o bispo de casas claras.',
      when: 'Em toda a Semi-Eslava, do quarto lance ao meio-jogo.',
      risk: 'Libertar o bispo às custas do centro: a defesa deixa de ter razão de existir.',
      porQueFunciona:
        'Peões em c6, d5 e e6 fazem da posição preta uma fortaleza e do bispo de c8 um refém. Toda a teoria da Semi-Eslava é sobre quantos lances as pretas podem gastar antes de precisarem libertá-lo — e quem perde essa conta joga com uma peça a menos.',
      preparacao:
        'Centro defendido duas vezes, cavalo em d7 e a captura em c4 disponível a qualquer momento.',
      oQueOAdversarioTenta:
        'Fechar a posição de vez com e4-e5, deixando o bispo de c8 sem nenhuma diagonal aberta.',
    },
  ],
  structures: [
    {
      name: 'Triângulo c6-d5-e6',
      description:
        'Três peões pretos sustentando um ao outro. Nenhuma peça branca derruba d5, e nenhum bispo preto de casas claras respira enquanto a formação estiver inteira.',
      pawnBreaks: ['c5', 'e5', 'b5'],
      weakSquares: ['c5', 'e5'],
      openFiles: ['c'],
    },
  ],
  mistakes: [
    {
      id: 'semi-eslava-erro-bispo-cedo',
      nodeId: 'root',
      positionPly: 7,
      moveSan: 'Bf5',
      explanation:
        'Sair com o bispo antes de ...e6 é a Eslava, e não a Semi-Eslava: aqui as brancas já têm Cc3 e Cf3, e Db3 ataca b7 e d5 ao mesmo tempo com o bispo longe de casa.',
      principle:
        'A mesma peça no mesmo lugar é boa ou má conforme a ordem de lances que a levou até lá.',
    },
  ],
  version: 1,
})

const indiaDaDama = course({
  id: 'india-da-dama',
  slug: 'india-da-dama',
  name: 'Defesa Índia da Dama',
  side: 'black',
  ecoCodes: ['E12', 'E15', 'E17'],
  description:
    'Negar a casa e4 com peças: cavalo em f6, bispo em b7 e um centro que as brancas nunca completam.',
  philosophy: 'Uma casa bem disputada vale mais que um peão avançado sem futuro.',
  difficulty: 3,
  prerequisites: ['nimzo-india'],
  tags: ['closed', 'solid', 'positional'],
  transitionToMiddlegame:
    'A abertura termina quando as pretas rocam e escolhem entre ...d5 e ...Ce4. A partir daí a pergunta é quem consegue jogar no centro primeiro.',
  mainline: indiaDaDamaMain,
  /* Os dois ramos bifurcam no quarto lance branco — o mesmo ponto de decisão. */
  variations: [
    {
      /*
        O FIANCHETTO (4.g3) É A LINHA PRINCIPAL: bispo contra bispo na mesma
        diagonal. Core porque o duelo dos dois bispos de casas claras é o
        assunto inteiro da defesa.
      */
      id: 'india-da-dama-fianchetto',
      importancia: 'core',
      eco: 'E15',
      conceitos: ['concept.bishop-pair', 'concept.space-vs-counterplay', 'concept.open-file'],
      estrutura: 'structure.open-center',
      erroComum: {
        lance: 'Bb7',
        porque:
          'Pôr o bispo em b7 contra um bispo em g2 é aceitar o duelo em condições piores: as brancas trocam quando quiserem e sobram com a casa e4. Contra 4.g3 as pretas jogam ...Ba6 primeiro, atacando o peão de c4 antes de o bispo branco chegar.',
      },
      fronteira: { type: 'handoff', planId: 'india-da-dama-e4' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se disputar a diagonal longa com o próprio bispo antes de tocar no centro.',
      intencaoDoAdversario:
        'Neutralizar o bispo de b7 com um bispo em g2 e então ocupar e4 com peça ou peão.',
      objetivoDoAluno:
        'Atacar c4 com ...Ba6 antes de o bispo branco chegar a g2: um peão indefeso vale mais que uma diagonal simétrica.',
      name: 'Variante do Fianchetto',
      description: 'As brancas fiancham para disputar a diagonal longa com o bispo preto.',
      rootNodeId: '',
      line: [
        ...indiaDaDamaMain.slice(0, 6),
        lesson(7, 'g3', 'As brancas preparam Bg2 para anular o bispo que ainda nem saiu.', {
          strategicIdea: 'Quem ocupa a diagonal primeiro escolhe as condições da troca.',
          resultingPlan: 'Bg2 e O-O, com a casa e4 novamente disponível.',
        }),
        lesson(
          8,
          'Ba6',
          'O bispo vai à casa em que ataca c4 — e não à diagonal em que seria trocado.',
          {
            arrows: [{ from: 'c8', to: 'a6' }],
            resultingPlan:
              '...Bb4+ ou ...d5, cobrando a fraqueza antes de completar o desenvolvimento.',
          },
        ),
      ],
    },
    {
      /*
        O SISTEMA PETROSIAN (4.a3) GASTA UM TEMPO para garantir Cc3 sem cravada.
        Core porque ele mostra quanto vale a casa e4: as brancas pagam um lance
        inteiro por ela.
      */
      id: 'india-da-dama-petrosian',
      importancia: 'core',
      eco: 'E12',
      conceitos: ['concept.space-vs-counterplay', 'concept.open-file', 'concept.bad-bishop'],
      estrutura: 'structure.open-center',
      erroComum: {
        lance: 'Ba6',
        porque:
          'A manobra que funciona contra o fianchetto não funciona aqui: sem bispo branco em g2, o de b7 não corre risco nenhum, e ...Ba6 apenas tira a peça da melhor diagonal. Contra 4.a3 as pretas jogam ...Bb7 e disputam d5.',
      },
      fronteira: { type: 'handoff', planId: 'india-da-dama-d5' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se pagar um tempo por Cc3 sem cravada, para então ocupar e4.',
      intencaoDoAdversario:
        'Garantir Cc3 sem a cravada ...Bb4 e ocupar e4 com o cavalo apoiado pelo peão.',
      objetivoDoAluno:
        'Disputar d5 e e4 com peças enquanto as brancas gastam tempo com lances de peão na borda.',
      name: 'Sistema Petrosian',
      description: 'As brancas jogam a3 para garantir Cc3 sem a cravada ...Bb4.',
      rootNodeId: '',
      line: [
        ...indiaDaDamaMain.slice(0, 6),
        lesson(
          7,
          'a3',
          'Um lance de peão na borda para garantir Cc3: as brancas medem em tempo o preço da casa e4.',
          {
            strategicIdea: 'Um tempo por uma casa central é um preço que grandes mestres pagam.',
            resultingPlan: 'Cc3 e e4, com o centro inteiro e sem cravada nenhuma.',
          },
        ),
        lesson(
          8,
          'Bb7',
          'O bispo ocupa a diagonal: sem bispo branco em g2, ele não tem rival e disputa e4 sozinho.',
          { resultingPlan: '...d5 em seguida, somando um peão à disputa central.' },
        ),
      ],
    },
  ],
  plans: [
    {
      id: 'india-da-dama-e4',
      name: 'Negar a casa e4',
      positionNodeId: 'root',
      positionPly: 6,
      objective: 'Manter mais atacantes que defensores sobre e4 até as brancas desistirem dela.',
      when: 'Do segundo lance em diante — é a razão de ser da defesa.',
      risk: 'Cuidar tanto de e4 que ...d5 nunca sai, e as pretas ficam sem espaço nenhum.',
      porQueFunciona:
        'Cavalo em f6, bispo em b7 e, quando preciso, ...d5 e ...Ce4: são três ou quatro disputas sobre a mesma casa. As brancas têm um centro que só fica bom se e4 sair, e a Índia da Dama é o argumento de que ele não sai.',
      preparacao:
        'O bispo em b7 antes de qualquer decisão no centro. Ele é o segundo atacante e o mais difícil de expulsar.',
      oQueOAdversarioTenta:
        'Trocar o bispo de b7 com Bg2, ou gastar a3 e Cc3 para empurrar e4 com apoio de peão.',
      arrows: [{ from: 'b7', to: 'e4' }],
    },
    {
      id: 'india-da-dama-d5',
      name: 'A ruptura ...d5',
      positionNodeId: 'root',
      positionPly: 6,
      objective: 'Somar um peão à disputa central quando as peças já não bastam.',
      when: 'Depois do roque, e sempre que as brancas ameaçarem completar o centro com e4.',
      risk: 'Romper cedo demais: ...d5 tranca a diagonal do próprio bispo de b7.',
      porQueFunciona:
        'A Índia da Dama disputa e4 com peças por quantos lances der. Quando as brancas juntam apoio suficiente, ...d5 muda a natureza da disputa: a casa deixa de ser controlada e passa a ser ocupada, e o centro trava num formato que favorece quem tem as peças melhor colocadas.',
      preparacao:
        'Rei rocado e o bispo de f8 já em e7 ou d6. Com o rei no meio, abrir o centro é o risco errado.',
      oQueOAdversarioTenta:
        'Capturar em d5 e ocupar a casa com o cavalo, ou avançar c5 travando a estrutura antes da ruptura.',
      arrows: [{ from: 'd7', to: 'd5' }],
    },
    {
      id: 'india-da-dama-ba6',
      name: 'O bispo por a6',
      positionNodeId: 'root',
      positionPly: 6,
      objective: 'Atacar o peão de c4 em vez de entrar num duelo simétrico de bispos.',
      when: 'Sempre que as brancas jogarem g3 antes de proteger c4.',
      risk: 'Deixar o bispo em a6 sem alvo depois de as brancas defenderem c4 com Db3 ou Cbd2.',
      porQueFunciona:
        'A casa b7 só vale se houver algo para atacar na diagonal. Quando as brancas preparam Bg2, esse algo desaparece — mas c4 fica momentaneamente sem defensor, e a6 é a única casa de onde o bispo cobra isso. É a mesma peça escolhendo o alvo que ainda existe.',
      preparacao: 'O lance ...b6 já jogado, que é o que abre a casa a6 para o bispo passar.',
      oQueOAdversarioTenta:
        'Defender c4 com Dc2, Cbd2 ou Db3, devolvendo o bispo preto a uma diagonal sem alvo.',
      arrows: [{ from: 'a6', to: 'c4' }],
    },
  ],
  structures: [
    {
      name: 'Ouriço da Índia da Dama',
      description:
        'Peões pretos em a6, b6, d6 e e6, com peças atrás da terceira fileira. Parece passivo e não é: toda a formação existe para que ...d5 e ...b5 saiam de uma vez quando as brancas se esticarem.',
      pawnBreaks: ['d5', 'b5', 'c5'],
      weakSquares: ['d5', 'c6'],
      openFiles: ['c', 'd'],
    },
  ],
  mistakes: [
    {
      id: 'india-da-dama-erro-bb4-sem-cavalo',
      nodeId: 'root',
      positionPly: 5,
      moveSan: 'Bb4+',
      explanation:
        'A cravada da Nimzo-Índia sem cavalo em c3 não crava nada: as brancas respondem Bd2 e o bispo preto precisa trocar ou recuar, tendo gasto dois lances para nada.',
      principle:
        'Cravar é prender uma peça contra outra: sem a peça de trás, o mesmo lance é só um bispo exposto.',
    },
  ],
  version: 1,
})

const moderna = course({
  id: 'moderna',
  slug: 'moderna',
  name: 'Defesa Moderna',
  side: 'black',
  ecoCodes: ['B06', 'A41'],
  description:
    'Ceder o centro sem dar alvo: fianchetto primeiro, cavalos depois, ruptura no momento que as pretas escolherem.',
  philosophy:
    'Não estar em lugar nenhum é uma vantagem enquanto o adversário precisa decidir tudo.',
  difficulty: 3,
  prerequisites: ['pirc'],
  tags: ['semi-open', 'flexible', 'hypermodern'],
  transitionToMiddlegame:
    'A abertura termina quando as pretas escolhem entre ...c5, ...e5 e ...b5. A partir daí a pergunta é se o centro branco é força ou peso morto.',
  mainline: modernaMain,
  /* Os dois ramos bifurcam no quarto lance branco — o mesmo ponto de decisão. */
  variations: [
    {
      /*
        OS QUATRO PEÕES (4.f4) SÃO A PUNIÇÃO ÓBVIA de quem cede tudo: espaço
        máximo. Core porque a resposta natural (deixar acontecer) perde a
        partida sem uma única imprecisão tática.
      */
      id: 'moderna-quatro-peoes',
      importancia: 'core',
      eco: 'B06',
      conceitos: ['concept.space-vs-counterplay', 'concept.break-c5', 'concept.king-safety-timing'],
      estrutura: 'structure.benoni-center',
      erroComum: {
        lance: 'Nf6',
        porque:
          'Pôr o cavalo em f6 contra quatro peões centrais entrega o tempo que a Moderna existe para poupar: e5 expulsa a peça com ganho de espaço. Aqui o cavalo vai para d7 ou c6, e nunca para a casa que o peão de e pode atacar.',
      },
      fronteira: { type: 'handoff', planId: 'moderna-c5' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se ocupar o máximo de espaço e provar que o contrajogo preto chega tarde.',
      intencaoDoAdversario:
        'Ocupar as quatro casas centrais e sufocar as pretas antes que qualquer ruptura fique pronta.',
      objetivoDoAluno:
        'Romper com ...c5 imediatamente: contra uma massa de peões, cada lance de espera é um peão a mais na frente.',
      name: 'Ataque dos Quatro Peões',
      description: 'As brancas jogam f4 e ocupam o centro inteiro com peões.',
      rootNodeId: '',
      line: [
        ...modernaMain.slice(0, 6),
        lesson(7, 'f4', 'O terceiro peão entra: as brancas apostam tudo no espaço.', {
          arrows: [{ from: 'f2', to: 'f4' }],
          strategicIdea: 'Uma massa de peões avança ou vira alvo — ela não fica parada.',
          resultingPlan: 'Cf3 e Bd3, com e5 e f5 no horizonte.',
        }),
        lesson(
          8,
          'c5',
          'A ruptura vem antes do desenvolvimento: contra peões, o tempo vale mais que a peça.',
          {
            arrows: [{ from: 'c7', to: 'c5' }],
            resultingPlan: 'Depois de dxc5 dxc5, a dama troca e o centro branco desaparece.',
          },
        ),
      ],
    },
    {
      /*
        O SISTEMA COM Be3 E Dd2 é o que o adversário de clube realmente joga.
        Core porque a resposta certa — ...a6 e ...b5 — é a menos intuitiva do
        repertório inteiro.
      */
      id: 'moderna-150',
      importancia: 'core',
      eco: 'B06',
      conceitos: [
        'concept.king-safety-timing',
        'concept.open-file',
        'concept.space-vs-counterplay',
      ],
      estrutura: 'structure.kid-locked-center',
      motivos: ['motif.greek-gift'],
      erroComum: {
        lance: 'Nf6',
        porque:
          'Desenvolver o cavalo para f6 e rocar dá ao ataque branco o alvo que ele precisa: Bh6, h4 e h5 chegam com o rei preto já no canto. Na Moderna, a ala da dama é onde as pretas jogam, e o rei costuma ficar no meio mais tempo do que parece confortável.',
      },
      fronteira: { type: 'handoff', planId: 'moderna-b5' },
      politicaDoLadoInverso:
        'Pelas brancas, demonstra-se preparar Bh6 e h4-h5 antes de o contrajogo preto existir.',
      intencaoDoAdversario:
        'Trocar o bispo de g7 com Bh6 e abrir a coluna h contra o rei preto com h4 e h5.',
      objetivoDoAluno:
        'Correr na ala da dama com ...a6 e ...b5 e adiar o roque: sem rei no canto, o ataque não tem endereço.',
      name: 'Sistema com Be3 e Dd2',
      description: 'As brancas preparam Bh6 e o avanço h4-h5 contra o fianchetto preto.',
      rootNodeId: '',
      line: [
        ...modernaMain.slice(0, 6),
        lesson(7, 'Be3', 'O bispo prepara Dd2 e Bh6, mirando a troca do bispo de g7.', {
          strategicIdea: 'Trocar o defensor das casas escuras vale mais que ganhar espaço.',
          resultingPlan: 'Dd2, Bh6 e h4-h5 contra o roque preto.',
        }),
        lesson(
          8,
          'a6',
          'As pretas começam pela ala da dama e deixam o rei indeciso de propósito.',
          { resultingPlan: '...b5, ...Cd7 e ...Bb7, com iniciativa onde as brancas não olham.' },
        ),
      ],
    },
  ],
  plans: [
    {
      id: 'moderna-c5',
      name: 'A ruptura ...c5',
      positionNodeId: 'root',
      positionPly: 6,
      objective: 'Atacar a base do centro branco assim que ele se comprometer.',
      when: 'Contra centros de três ou quatro peões, e quanto antes melhor.',
      risk: 'Romper e trocar damas numa posição em que as brancas ficam com espaço e peças ativas.',
      porQueFunciona:
        'Quatro peões avançados têm uma base só: d4. O bispo de g7 já aponta para lá desde o segundo lance, e ...c5 acrescenta o segundo atacante. Se as brancas capturam, o centro encolhe; se avançam, deixam casas para trás.',
      preparacao:
        'O bispo em g7 e a casa d7 livre para o cavalo. Quase nada — e é esse o ponto: a ruptura precisa vir cedo.',
      oQueOAdversarioTenta:
        'Avançar d5 travando o centro, ou capturar em c5 e devolver o peão para manter o espaço.',
      arrows: [{ from: 'c7', to: 'c5' }],
    },
    {
      id: 'moderna-b5',
      name: 'A expansão ...a6 e ...b5',
      positionNodeId: 'root',
      positionPly: 6,
      objective: 'Ganhar espaço na ala em que as brancas não gastaram nenhum lance.',
      when: 'Contra sistemas de ataque na ala do rei, principalmente com Be3 e Dd2.',
      risk: 'Enfraquecer a ala da dama com o centro ainda aberto: a4 e e5 chegam antes de ...b5.',
      porQueFunciona:
        'Quem ataca de um lado fica fraco do outro — é a regra mais antiga do xadrez posicional. Com Be3, Dd2 e h4, as brancas comprometem três lances na ala do rei; ...a6 e ...b5 cobram isso no lado oposto, e o bispo de g7 já está apontado para a diagonal que leva até lá.',
      preparacao: 'Roque adiado. Sem rei no canto, cada lance branco na ala do rei ataca ar.',
      oQueOAdversarioTenta:
        'Parar a expansão com a4, ou abrir o centro com e5 para provar que o rei preto no meio é o problema maior.',
      arrows: [{ from: 'b7', to: 'b5' }],
    },
    {
      id: 'moderna-sem-alvo',
      name: 'Não dar alvo',
      positionNodeId: 'root',
      positionPly: 4,
      objective: 'Adiar ...Cf6 enquanto o peão de e branco puder ganhar tempo com e5.',
      when: 'Contra qualquer centro branco de dois ou mais peões.',
      risk: 'Adiar o desenvolvimento a ponto de nunca conseguir rocar nem romper.',
      porQueFunciona:
        'A diferença entre a Moderna e a Pirc é exatamente um cavalo. Em f6 ele é uma peça desenvolvida e também um alvo: e5 o expulsa com ganho de espaço. Em d7 ou c6 ele apoia as rupturas ...c5 e ...e5 sem nunca oferecer um tempo de graça.',
      preparacao:
        'Fianchetto completo primeiro. O bispo de g7 é a peça que faz o trabalho que o cavalo em f6 faria.',
      oQueOAdversarioTenta:
        'Ocupar tanto espaço que as pretas precisem desenvolver o cavalo para f6 por falta de casas.',
    },
  ],
  structures: [
    {
      name: 'Centro cedido sem alvo',
      description:
        'Peões brancos em d4 e e4 contra peões pretos em d6 e g6, sem cavalo preto em f6. É a Pirc com um tempo a mais para as pretas e um alvo a menos para as brancas — e essa diferença decide qual lado precisa se comprometer primeiro.',
      pawnBreaks: ['c5', 'e5', 'b5'],
      weakSquares: ['d4', 'f6'],
      openFiles: ['c', 'b'],
    },
  ],
  mistakes: [
    {
      id: 'moderna-erro-roque-cedo',
      nodeId: 'root',
      positionPly: 6,
      moveSan: 'h4',
      explanation:
        'Para as brancas, avançar h4 antes de Be3 e Dd2 é atacar sem ter preparado nada: as pretas respondem ...h5 e o peão de h4 vira uma fraqueza permanente numa posição ainda fechada.',
      principle:
        'Avanço de peão na frente do rei adversário só é ataque quando há peças atrás dele.',
    },
  ],
  version: 1,
})

const reti = course({
  id: 'reti',
  slug: 'reti',
  name: 'Abertura Réti',
  side: 'white',
  ecoCodes: ['A09', 'A13', 'A14'],
  description:
    'Atacar o centro sem ocupá-lo: cavalo em f3, peão em c4 e um bispo em g2 apontado para d5.',
  philosophy: 'Deixar o adversário montar o centro e então provar que ele é difícil de sustentar.',
  difficulty: 3,
  prerequisites: ['inglesa'],
  tags: ['flank', 'flexible', 'hypermodern'],
  transitionToMiddlegame:
    'A abertura termina quando as brancas decidem entre d4 e a expansão b4. A partir daí a pergunta é se o centro preto virou alvo ou fortaleza.',
  mainline: retiMain,
  /* Os dois ramos bifurcam no segundo lance preto — o mesmo ponto de decisão. */
  variations: [
    {
      /*
        O GAMBITO RÉTI (2...dxc4) É A RESPOSTA QUE MAIS APARECE em clube, porque
        parece ganhar um peão. Core porque a recuperação exige um plano e não um
        lance.
      */
      id: 'reti-gambito',
      importancia: 'core',
      eco: 'A09',
      conceitos: [
        'concept.material-vs-initiative',
        'concept.open-file',
        'concept.space-vs-counterplay',
      ],
      estrutura: 'structure.open-center',
      erroComum: {
        lance: 'Qa4+',
        porque:
          'Correr atrás do peão com a dama recupera material e perde a razão da abertura: a dama fica exposta, as pretas desenvolvem com tempo e o bispo de g2 nunca chega. A recuperação correta passa por e3 e Bxc4, com desenvolvimento em cada lance.',
      },
      fronteira: { type: 'handoff', planId: 'reti-recuperar' },
      politicaDoLadoInverso:
        'Pelas pretas, demonstra-se aceitar o peão e devolvê-lo no momento em que ele custar mais que vale.',
      intencaoDoAdversario:
        'Ficar com o peão de c4 e sustentá-lo com ...b5, ganhando espaço na ala da dama.',
      objetivoDoAluno:
        'Recuperar o peão desenvolvendo — e3 e Bxc4 — em vez de perseguir material com a dama.',
      name: 'Gambito Réti aceito',
      description: 'As pretas capturam em c4 e as brancas recuperam o peão desenvolvendo.',
      rootNodeId: '',
      line: [
        ...retiMain.slice(0, 3),
        lesson(4, 'dxc4', 'As pretas aceitam: o peão de c4 está longe de casa e parece de graça.', {
          strategicIdea: 'Um peão ganho no flanco custa tempo para ser sustentado.',
        }),
        lesson(
          5,
          'e3',
          'O lance quieto que resolve tudo: o bispo de f1 vai recuperar o peão desenvolvendo.',
          {
            arrows: [{ from: 'f1', to: 'c4' }],
            strategicIdea:
              'Recuperar material com um lance que também desenvolve é recuperar duas vezes.',
            resultingPlan: 'Bxc4, O-O e d4, com centro e desenvolvimento completos.',
          },
        ),
      ],
    },
    {
      /*
        O SISTEMA SIMÉTRICO (2...c6) É O QUE O JOGADOR SÓLIDO joga: sustenta d5
        e espera. Core porque contra ele o plano das brancas muda de ataque ao
        centro para expansão na ala da dama.
      */
      id: 'reti-eslava',
      importancia: 'core',
      eco: 'A13',
      conceitos: ['concept.minority-attack', 'concept.open-file', 'concept.space-vs-counterplay'],
      estrutura: 'structure.slav-triangle',
      erroComum: {
        lance: 'cxd5',
        porque:
          'Trocar em d5 resolve a tensão a favor das pretas: elas recapturam com o peão de c6 e ficam com um centro sólido e a coluna c semiaberta. A Réti vive da tensão — quem a desfaz primeiro entrega a iniciativa.',
      },
      fronteira: { type: 'handoff', planId: 'reti-b4' },
      politicaDoLadoInverso:
        'Pelas pretas, demonstra-se sustentar d5 com ...c6 e esperar as brancas se comprometerem.',
      intencaoDoAdversario:
        'Sustentar d5 com um peão que não tranca nenhuma peça e esperar as brancas definirem o centro.',
      objetivoDoAluno:
        'Manter a tensão e expandir com b4, atacando a base c6 em vez de trocar em d5.',
      name: 'Estrutura eslava',
      description: 'As pretas sustentam d5 com ...c6 e esperam.',
      rootNodeId: '',
      line: [
        ...retiMain.slice(0, 3),
        lesson(4, 'c6', 'O defensor sólido: ...c6 sustenta d5 sem trancar nenhuma peça preta.', {
          highlights: ['d5'],
          strategicIdea: 'Contra pressão de flanco, o defensor certo é o peão que menos atrapalha.',
        }),
        lesson(
          5,
          'b3',
          'As brancas preparam Bb2 e b4: se o centro preto não cai, ataca-se a base dele.',
          {
            arrows: [{ from: 'c1', to: 'b2' }],
            resultingPlan: 'Bb2, g3, Bg2 e b4, com dois bispos apontados para o centro preto.',
          },
        ),
      ],
    },
  ],
  plans: [
    {
      id: 'reti-recuperar',
      name: 'Recuperar c4 desenvolvendo',
      positionNodeId: 'root',
      positionPly: 3,
      objective: 'Trazer o peão de volta com um lance que também põe uma peça em jogo.',
      when: 'Sempre que as pretas capturarem em c4.',
      risk: 'Gastar dois ou três lances de dama atrás de um peão que valia um.',
      porQueFunciona:
        'O peão em c4 está longe de qualquer defensor preto, e sustentá-lo custa ...b5 e ...a6 — dois lances de peão que não desenvolvem nada. As brancas jogam e3 e Bxc4 e recuperam com a peça já no lugar em que ela ia ficar de qualquer forma.',
      preparacao: 'Nenhuma. É por isso que o lance é e3 e não Da4+: a recuperação já está pronta.',
      oQueOAdversarioTenta:
        'Sustentar o peão com ...b5 e ...Bb7, transformando o material extra em espaço permanente.',
      arrows: [{ from: 'f1', to: 'c4' }],
    },
    {
      id: 'reti-b4',
      name: 'A expansão b4',
      positionNodeId: 'root',
      positionPly: 5,
      objective: 'Atacar a base c6 do centro preto em vez de trocar em d5.',
      when: 'Contra estruturas com ...c6, depois de Bb2 e do roque.',
      risk: 'Avançar na ala da dama com o centro instável: ...e5 chega antes de b4-b5.',
      porQueFunciona:
        'Um centro preto sustentado por ...c6 é sólido enquanto c6 existir. Como as brancas não vão derrubar d5 de frente, elas atacam o defensor: b4-b5 obriga o peão de c6 a decidir, e qualquer decisão dele afrouxa d5.',
      preparacao:
        'Bispo em b2, rei rocado e a torre de a1 pronta para a coluna que b4-b5 vai abrir.',
      oQueOAdversarioTenta:
        'Romper no centro com ...e5 antes de a expansão chegar, ou parar b4 com ...a5.',
      arrows: [{ from: 'b2', to: 'b4' }],
    },
    {
      id: 'reti-tensao',
      name: 'Manter a tensão em d5',
      positionNodeId: 'root',
      positionPly: 3,
      objective: 'Não trocar em d5 enquanto as pretas ainda precisarem cuidar da casa.',
      when: 'Em toda a Réti, do terceiro lance ao meio-jogo.',
      risk: 'Manter a tensão tanto tempo que as pretas resolvem a posição com ...dxc4 em boa hora.',
      porQueFunciona:
        'Enquanto o peão de c4 ameaça d5, cada peça preta que defende a casa é uma peça que não faz outra coisa. No instante em que as brancas trocam, essas peças ficam livres e o centro preto vira uma fortaleza recapturada. A tensão é a vantagem — a troca é o fim dela.',
      preparacao:
        'O bispo em g2 somando um atacante a d5, para que a tensão pese mais do lado das brancas.',
      oQueOAdversarioTenta:
        'Desfazer a tensão em termos favoráveis com ...dxc4, ou avançar ...d4 ganhando espaço de vez.',
    },
  ],
  structures: [
    {
      name: 'Centro preto sob pressão de flanco',
      description:
        'Peão preto em d5 sustentado por ...e6 ou ...c6, contra peão branco em c4 e bispo em g2. Nenhum peão branco no centro — a pressão vem toda de longe, e é por isso que ela não vira alvo.',
      pawnBreaks: ['b4', 'd4', 'e4'],
      weakSquares: ['d5', 'c6'],
      openFiles: ['c', 'b'],
    },
  ],
  mistakes: [
    {
      id: 'reti-erro-d4-cedo',
      nodeId: 'root',
      positionPly: 4,
      moveSan: 'd4',
      explanation:
        'Jogar d4 cedo transforma a Réti num Gambito da Dama comum e devolve às pretas toda a teoria que a abertura existia para evitar — com um tempo a menos, porque o cavalo já saiu para f3.',
      principle:
        'Uma abertura de flanco que ocupa o centro cedo perde a única vantagem que tinha: a de não estar comprometida.',
    },
  ],
  version: 1,
})

const viena = course({
  id: 'viena',
  slug: 'viena',
  name: 'Abertura Vienense',
  side: 'white',
  ecoCodes: ['C25', 'C26', 'C29'],
  description:
    'Desenvolver o cavalo por c3 para guardar o lance f4: o mesmo gambito do Rei, mas com uma peça a mais em jogo.',
  philosophy: 'A ordem dos lances é uma arma: Cc3 antes de Cf3 muda o que a abertura permite.',
  difficulty: 2,
  prerequisites: ['italiana'],
  tags: ['open', 'sharp', 'gambit'],
  transitionToMiddlegame:
    'A abertura termina quando a coluna f abre e o rei branco roca. A partir daí a pergunta é se a torre em f1 chega ao rei preto antes de o centro se resolver.',
  mainline: vienaMain,
  /* Os dois ramos bifurcam no segundo lance preto — o mesmo ponto de decisão. */
  variations: [
    {
      /*
        2...Cc6 É A RESPOSTA CLÁSSICA e a mais comum em clube. Core porque o
        gambito segue valendo e a posição fica mais aberta que a principal.
      */
      id: 'viena-cavalo-c6',
      importancia: 'core',
      eco: 'C25',
      conceitos: [
        'concept.material-vs-initiative',
        'concept.open-file',
        'concept.king-safety-timing',
      ],
      estrutura: 'structure.open-center',
      motivos: ['motif.f7-pressure'],
      erroComum: {
        lance: 'Nf3',
        porque:
          'Desenvolver o cavalo para f3 desiste do gambito: com a casa ocupada, o peão de f nunca sai e a Viena vira um Quatro Cavalos qualquer. Se o plano era f4, o cavalo do rei espera.',
      },
      fronteira: { type: 'handoff', planId: 'viena-coluna-f' },
      politicaDoLadoInverso:
        'Pelas pretas, demonstra-se devolver o peão a tempo e desenvolver contra um rei ainda no meio.',
      intencaoDoAdversario:
        'Defender e5 com peça e manter o centro sólido, sem dar às brancas a ruptura que elas querem.',
      objetivoDoAluno:
        'Jogar f4 mesmo assim: o peão de e5 está defendido uma vez e atacado uma vez, e a coluna vale o peão.',
      name: 'Defesa 2...Cc6',
      description: 'As pretas defendem e5 com o cavalo antes de desenvolver o resto.',
      rootNodeId: '',
      line: [
        ...vienaMain.slice(0, 3),
        lesson(4, 'Nc6', 'O cavalo defende e5 — a resposta mais natural e a mais jogada.', {
          highlights: ['e5'],
          strategicIdea: 'Defender o centro com peça, para que o gambito custe um peão de verdade.',
          resultingPlan: '...Bc5 ou ...exf4, conforme as brancas insistirem no gambito.',
        }),
        lesson(5, 'f4', 'O gambito entra do mesmo jeito: a coluna f vale mais que o peão.', {
          arrows: [{ from: 'f2', to: 'f4' }],
          strategicIdea: 'Um peão por uma coluna aberta apontada para f7 é troca a favor.',
          resultingPlan: 'Cf3, Bc4 e O-O, com a torre chegando em f1 antes do rei preto sair.',
        }),
      ],
    },
    {
      /*
        2...Bc5 PARECE ATIVO E NÃO DEFENDE NADA. Core porque o castigo é um
        lance de desenvolvimento simples, e reconhecer isso vale mais que
        decorar dez lances de gambito.
      */
      id: 'viena-bispo-c5',
      importancia: 'core',
      eco: 'C26',
      conceitos: [
        'concept.material-vs-initiative',
        'concept.open-file',
        'concept.space-vs-counterplay',
      ],
      estrutura: 'structure.open-center',
      erroComum: {
        lance: 'f4',
        porque:
          'O gambito automático é pior aqui: depois de f4 exf4 o bispo preto em c5 já vigia a diagonal do rei branco, e o roque fica difícil. Com e5 indefeso, existe um lance melhor — atacá-lo.',
      },
      fronteira: { type: 'handoff', planId: 'viena-centro' },
      politicaDoLadoInverso:
        'Pelas pretas, demonstra-se que sair com o bispo antes de defender o centro custa a casa e5.',
      intencaoDoAdversario:
        'Desenvolver com atividade e mirar f2, sem gastar lance nenhum defendendo o peão de e5.',
      objetivoDoAluno:
        'Atacar o peão indefeso com Cf3: quando o adversário não defende o centro, o lance certo é cobrá-lo.',
      name: 'Defesa 2...Bc5',
      description: 'As pretas desenvolvem o bispo e deixam o peão de e5 sem defensor.',
      rootNodeId: '',
      line: [
        ...vienaMain.slice(0, 3),
        lesson(4, 'Bc5', 'O bispo sai com atividade — e deixa o peão de e5 sem nenhum defensor.', {
          highlights: ['e5'],
          strategicIdea: 'Mirar f2 e apostar que as brancas gastem o lance seguinte com o gambito.',
          resultingPlan: '...d6 ou ...Cc6 depois, tapando o buraco que o bispo deixou em e5.',
        }),
        lesson(
          5,
          'Nf3',
          'O cavalo desenvolve atacando um peão que ninguém defende: as pretas perdem o tempo que acabaram de ganhar.',
          {
            arrows: [{ from: 'f3', to: 'e5' }],
            strategicIdea: 'Desenvolver com ameaça vale dois lances; desenvolver sem ela, um.',
            resultingPlan: 'Depois de ...d6 ou ...Cc6, as brancas jogam d4 com o centro inteiro.',
          },
        ),
      ],
    },
  ],
  plans: [
    {
      id: 'viena-coluna-f',
      name: 'A coluna f é o gambito',
      positionNodeId: 'root',
      positionPly: 5,
      objective: 'Abrir a coluna f e pôr a torre atrás dela antes de o rei preto se resolver.',
      when: 'Sempre que f4 for jogado e as pretas capturarem ou trocarem em f4.',
      risk: 'Abrir a coluna com o próprio rei ainda em e1: ela serve aos dois lados.',
      porQueFunciona:
        'A casa f7 é defendida só pelo rei preto no começo da partida. Uma torre em f1 com a coluna aberta ataca essa casa de longe, e cada peça branca que se soma a ela custa às pretas um lance de defesa pura. É por isso que vale um peão.',
      preparacao:
        'Roque curto primeiro. A coluna aberta é uma vantagem enquanto só a torre branca estiver nela.',
      oQueOAdversarioTenta:
        'Devolver o peão para trocar peças, ou contra-atacar no centro com ...d5 antes de a torre chegar.',
      arrows: [{ from: 'f1', to: 'f7' }],
    },
    {
      id: 'viena-centro',
      name: 'Cobrar o centro indefeso',
      positionNodeId: 'root',
      positionPly: 3,
      objective: 'Atacar e5 com peça sempre que as pretas não o defenderem.',
      when: 'Contra ...Bc5, ...g6 e qualquer segundo lance preto que não seja ...Cc6 ou ...d6.',
      risk: 'Atacar o peão com uma peça que precise recuar: o tempo ganho volta para o adversário.',
      porQueFunciona:
        'A Viena adia Cf3 de propósito, e essa espera vira arma quando as pretas esquecem do centro. Cf3 ataca e5 uma vez a mais do que ele está defendido, e as pretas precisam gastar um lance sem desenvolver nada — ou perder o peão.',
      preparacao:
        'O peão em e4 e o cavalo em c3 já defendendo-o. O cavalo do rei entra por último, e é essa ordem que dá o lance de graça.',
      oQueOAdversarioTenta:
        'Defender com ...d6, fechando a própria diagonal do bispo, ou com ...Cc6, entrando na linha principal.',
      arrows: [{ from: 'g1', to: 'f3' }],
    },
    {
      id: 'viena-d4',
      name: 'A ruptura d4',
      positionNodeId: 'root',
      positionPly: 5,
      objective: 'Somar o segundo peão central depois que a coluna f já abriu.',
      when: 'Depois do roque, e sempre que o peão de e5 preto tiver saído ou caído.',
      risk: 'Romper com o rei no meio: um centro aberto castiga quem ainda não rocou.',
      porQueFunciona:
        'O gambito troca um peão de flanco por linhas. O lance d4 transforma essas linhas em vantagem permanente: com peões em d4 e e4 e a coluna f aberta, as brancas têm espaço e ataque ao mesmo tempo, e as pretas defendem os dois com as mesmas peças.',
      preparacao:
        'Roque feito, cavalo em f3 e bispo em c4. A ruptura vem quando as peças já estão prontas para o que ela abre.',
      oQueOAdversarioTenta:
        'Ocupar a casa e4 com o cavalo, ou travar o centro com ...d5 antes de d4 sair.',
      arrows: [{ from: 'd2', to: 'd4' }],
    },
  ],
  structures: [
    {
      name: 'Coluna f aberta do Gambito de Viena',
      description:
        'Peão branco em e4, coluna f aberta e torre em f1 apontada para f7. O peão a menos só importa se o ataque não chegar — e o ataque chega pela mesma coluna que o gambito abriu.',
      pawnBreaks: ['d4', 'e5', 'f5'],
      weakSquares: ['f7', 'e4'],
      openFiles: ['f'],
    },
  ],
  mistakes: [
    {
      id: 'viena-erro-exd5',
      nodeId: 'root',
      positionPly: 6,
      moveSan: 'exd5',
      explanation:
        'Capturar com o peão de e devolve o centro: as pretas jogam ...e4 e o cavalo de c3 fica sem casas boas enquanto o peão preto avançado sufoca a posição. A captura certa é fxe5, que abre a coluna f e mantém a tensão.',
      principle:
        'Num gambito, a captura certa é a que abre a linha pela qual se vai atacar — e não a que recupera material mais rápido.',
    },
  ],
  version: 1,
})

const gambitoDoRei = course({
  id: 'gambito-do-rei',
  slug: 'gambito-do-rei',
  name: 'Gambito do Rei',
  side: 'white',
  ecoCodes: ['C30', 'C31', 'C33'],
  description:
    'Entregar um peão no segundo lance por centro, coluna aberta e desenvolvimento — e saber o preço disso.',
  philosophy: 'Iniciativa vale um peão enquanto o adversário não conseguir devolvê-lo e respirar.',
  difficulty: 3,
  prerequisites: ['italiana'],
  tags: ['open', 'sharp', 'gambit'],
  transitionToMiddlegame:
    'A abertura termina quando as brancas rocam e a coluna f fica aberta. A partir daí a pergunta é se o peão volta antes de o ataque acabar.',
  mainline: gambitoDoReiMain,
  /* Os dois ramos bifurcam no segundo lance preto — o mesmo ponto de decisão. */
  variations: [
    {
      /*
        O GAMBITO RECUSADO COM 2...Bc5 É O QUE MAIS APARECE em clube, e carrega
        a armadilha mais cara da abertura: fxe5?? Dh4+. Core porque errar aqui é
        perder no quarto lance.
      */
      id: 'gambito-do-rei-recusado',
      importancia: 'core',
      eco: 'C30',
      conceitos: [
        'concept.king-safety-timing',
        'concept.material-vs-initiative',
        'concept.open-file',
      ],
      estrutura: 'structure.open-center',
      motivos: ['motif.f7-pressure'],
      erroComum: {
        lance: 'fxe5',
        porque:
          'Capturar em e5 com a diagonal e1-h4 aberta perde a partida: ...Dh4+ dá xeque, o rei branco precisa ir a e2 e as pretas ganham material com xeques. Com f4 jogado, o primeiro dever das brancas é tapar h4 — e só o cavalo em f3 faz isso.',
      },
      fronteira: { type: 'handoff', planId: 'gambito-do-rei-h4' },
      politicaDoLadoInverso:
        'Pelas pretas, demonstra-se recusar o peão e mirar a diagonal que f4 acabou de abrir.',
      intencaoDoAdversario:
        'Recusar o peão e apontar o bispo para f2 e para a diagonal que o avanço f4 enfraqueceu.',
      objetivoDoAluno:
        'Fechar a diagonal com Cf3 antes de qualquer outra coisa: material só importa depois que o rei está seguro.',
      name: 'Gambito recusado (2...Bc5)',
      description: 'As pretas recusam o peão e apontam o bispo para a diagonal do rei branco.',
      rootNodeId: '',
      line: [
        ...gambitoDoReiMain.slice(0, 3),
        lesson(
          4,
          'Bc5',
          'As pretas recusam e desenvolvem mirando f2 — e a casa g1 fica presa à diagonal.',
          {
            highlights: ['f2'],
            strategicIdea: 'Recusar o peão e cobrar a diagonal que f4 acabou de abrir.',
            resultingPlan: '...d6 e ...Cf6, com a ameaça ...Dh4+ sempre no horizonte.',
          },
        ),
        lesson(
          5,
          'Nf3',
          'O cavalo tapa h4 antes de tudo. Aqui fxe5 perderia por ...Dh4+, e é por isso que este lance vem primeiro.',
          {
            highlights: ['h4'],
            strategicIdea:
              'Numa abertura que abre a própria diagonal, o primeiro lance é fechá-la.',
            resultingPlan: 'Cc3, Bc4 e d3, com desenvolvimento sólido e f4 ainda disponível.',
          },
        ),
      ],
    },
    {
      /*
        O CONTRAGAMBITO FALKBEER devolve gambito com gambito: em vez de pegar o
        peão, as pretas abrem o centro. Core porque a captura instintiva em e5
        deixa as brancas piores.
      */
      id: 'gambito-do-rei-falkbeer',
      importancia: 'core',
      eco: 'C31',
      conceitos: [
        'concept.material-vs-initiative',
        'concept.open-file',
        'concept.king-safety-timing',
      ],
      estrutura: 'structure.open-center',
      erroComum: {
        lance: 'fxe5',
        porque:
          'Aceitar o segundo peão dá às pretas ...e4, que sufoca o cavalo de g1 e deixa o centro branco travado com o rei ainda em e1. A captura correta é exd5, que devolve a pergunta e mantém a coluna f como assunto.',
      },
      fronteira: { type: 'handoff', planId: 'gambito-do-rei-recuperar' },
      politicaDoLadoInverso:
        'Pelas pretas, demonstra-se responder a um gambito de flanco com uma ruptura central.',
      intencaoDoAdversario:
        'Abrir o centro imediatamente, antes de as brancas desenvolverem, e provar que f4 enfraqueceu o rei.',
      objetivoDoAluno:
        'Capturar em d5 e não em e5: contra um contragambito, a captura certa é a que não trava a própria posição.',
      name: 'Contragambito Falkbeer',
      description: 'As pretas respondem com ...d5, abrindo o centro em vez de pegar o peão.',
      rootNodeId: '',
      line: [
        ...gambitoDoReiMain.slice(0, 3),
        lesson(
          4,
          'd5',
          'Gambito contra gambito: as pretas abrem o centro em vez de aceitar material.',
          {
            arrows: [{ from: 'd7', to: 'd5' }],
            strategicIdea: 'Quem abriu a própria posição não quer que o centro abra também.',
          },
        ),
        lesson(
          5,
          'exd5',
          'A captura certa: ela abre a coluna e para as pretas, mas não tranca nenhuma peça branca.',
          {
            strategicIdea:
              'Entre duas capturas, escolhe-se a que deixa as próprias peças respirando.',
            resultingPlan: 'Cf3 e d4 em seguida, devolvendo o peão em troca de desenvolvimento.',
          },
        ),
      ],
    },
  ],
  plans: [
    {
      id: 'gambito-do-rei-h4',
      name: 'Quebrar a corrente com h4',
      positionNodeId: 'root',
      positionPly: 6,
      objective: 'Desfazer os peões pretos em g5 e f4 antes que eles virem uma muralha.',
      when: 'Logo depois de ...g5, e nunca antes de Cf3 estar jogado.',
      risk: 'Abrir a coluna h com o próprio rei sem roque: ela aponta para os dois lados.',
      porQueFunciona:
        'Os peões pretos em f4 e g5 seguram o material extra e, ao mesmo tempo, são os peões que deveriam estar defendendo o rei preto. O lance h4 obriga a corrente a decidir, e qualquer decisão deixa uma coluna aberta apontada para um rei que ainda não rocou.',
      preparacao: 'O cavalo em f3, que é o que impede ...Dh4+ e sustenta o avanço de peão.',
      oQueOAdversarioTenta:
        'Sustentar com ...h6 e ...Bg7, ou devolver o peão e rocar antes de a coluna abrir.',
      arrows: [{ from: 'h2', to: 'h4' }],
    },
    {
      id: 'gambito-do-rei-recuperar',
      name: 'Recuperar o peão com d4',
      positionNodeId: 'root',
      positionPly: 5,
      objective: 'Trazer o peão de volta sem perder a iniciativa que ele comprou.',
      when: 'Quando o ataque direto não estiver disponível e o desenvolvimento já estiver feito.',
      risk: 'Recuperar cedo demais e devolver, junto com o peão, todas as linhas abertas.',
      porQueFunciona:
        'O Gambito do Rei não é uma aposta de tudo ou nada. Com d4 e Bxf4, as brancas recuperam o material tendo ficado com o centro maior e a coluna f aberta — que é exatamente o que elas queriam comprar. O peão volta e a vantagem fica.',
      preparacao:
        'Cavalo em f3, bispo em c4 e roque feito. Recuperar antes disso é trocar iniciativa por um peão.',
      oQueOAdversarioTenta:
        'Segurar f4 com ...g5 e ...h6, ou devolver o peão em termos próprios trocando peças.',
      arrows: [{ from: 'd2', to: 'd4' }],
    },
    {
      id: 'gambito-do-rei-diagonal',
      name: 'A diagonal e1-h4 é o custo fixo',
      positionNodeId: 'root',
      positionPly: 3,
      objective: 'Fechar a diagonal com Cf3 antes de qualquer captura ou desenvolvimento.',
      when: 'Sempre — desde o instante em que f4 é jogado.',
      risk: 'Tratar a regra como decorada e esquecê-la na primeira posição diferente.',
      porQueFunciona:
        'O avanço f4 tira o peão que tapava a diagonal que leva ao rei branco. Enquanto ela estiver aberta, ...Dh4+ é uma ameaça real em quase toda posição da abertura, e o rei precisa ir para e2 ou perder material. O cavalo em f3 resolve isso de uma vez — e é por isso que ele é o terceiro lance.',
      preparacao: 'Nenhuma. É o lance que vem antes de tudo.',
      oQueOAdversarioTenta:
        'Provocar uma captura em e5 ou um lance de peão qualquer que deixe a diagonal aberta mais um lance.',
      arrows: [{ from: 'g1', to: 'f3' }],
    },
  ],
  structures: [
    {
      name: 'Centro do Gambito do Rei',
      description:
        'Peões brancos em d4 e e4, coluna f aberta e um peão preto em f4 ou já recuperado. As brancas têm mais espaço e mais linhas; as pretas têm um peão e um rei que precisa achar abrigo antes de o ataque chegar.',
      pawnBreaks: ['d4', 'h4', 'e5'],
      weakSquares: ['f7', 'e1'],
      openFiles: ['f'],
    },
  ],
  mistakes: [
    {
      id: 'gambito-do-rei-erro-dama-cedo',
      nodeId: 'root',
      positionPly: 4,
      moveSan: 'Qh5',
      explanation:
        'Sair com a dama para h5 no lugar de Cf3 ataca f7 e nada mais: as pretas jogam ...g6 ou ...Ce7 e ganham tempo atrás de tempo enquanto a dama branca corre pelo tabuleiro.',
      principle:
        'Ameaça de uma peça só não é ataque — e uma dama exposta financia o desenvolvimento do adversário.',
    },
  ],
  version: 1,
})

export const OPENING_COURSES: readonly OpeningDefinition[] = [
  italian,
  scotch,
  london,
  caroKann,
  qgd,
  slav,
  ruyLopez,
  french,
  sicilianFoundation,
  qga,
  kingsIndian,
  nimzoIndian,
  catalan,
  english,
  scandinavian,
  pirc,
  grunfeld,
  dutch,
  semiEslava,
  indiaDaDama,
  moderna,
  reti,
  viena,
  gambitoDoRei,
]
export const OPENING_COURSE_BY_SLUG = new Map(
  OPENING_COURSES.map((opening) => [opening.slug, opening]),
)
