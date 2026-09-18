/**
 * O VOCABULÁRIO COMPARTILHADO DAS ABERTURAS: conceitos, estruturas e motivos.
 *
 * POR QUE ISTO EXISTE ANTES DE QUALQUER CURSO NOVO (plano de expansão §49–§51).
 * O peão dama isolado é o mesmo peão dama isolado no Panov-Botvinnik, na Tarrasch
 * e no Gambito da Dama Aceito. A estrutura de Carlsbad é a mesma na Variante da
 * Troca do QGD e na Caro-Kann de Troca. O ataque de minoria é um só.
 *
 * SEM ISTO, TRINTA CURSOS ESCREVEM TRINTA VEZES A MESMA EXPLICAÇÃO — e, o que é
 * pior, escrevem trinta explicações LIGEIRAMENTE diferentes. O aluno que
 * aprendeu "IQP" na Escocesa não reconheceria o mesmo conceito na Catalã, porque
 * o texto mudou de palavra. O conceito é o que transfere entre aberturas; é
 * exatamente ele que não pode ser duplicado.
 *
 * O QUE MORA AQUI: o nome e a explicação GERAL. O que cada curso acrescenta é
 * "como isso aparece AQUI" — e isso mora no curso, porque é dele.
 *
 * PT É A FONTE, como em todo o conteúdo do projeto; o inglês entra em
 * `nomes-de-conteudo.ts`, onde um portão cobra o que falta.
 */

/* -------------------------------------------------------------------------- */
/* Conceitos                                                                   */
/* -------------------------------------------------------------------------- */

export interface ConceitoDeAbertura {
  id: string
  nome: string
  /** O que é, em uma ou duas frases, sem depender de nenhuma abertura. */
  explicacao: string
}

/**
 * Os conceitos que atravessam aberturas.
 *
 * A LISTA É CURTA DE PROPÓSITO. O CLAUDE.md manda não criar centenas de
 * habilidades antes de a telemetria pedir, e a mesma regra vale aqui: conceito
 * que aparece numa abertura só não é conceito compartilhado — é conteúdo do
 * curso.
 */
export const CONCEITOS_DE_ABERTURA: readonly ConceitoDeAbertura[] = [
  {
    id: 'concept.iqp',
    nome: 'Peão dama isolado',
    explicacao:
      'Um peão central sem peões vizinhos que o defendam. Ele dá espaço e casas ativas para as peças no meio-jogo, e vira alvo fixo no final — quem o tem joga para atacar antes das trocas; quem enfrenta joga para trocar peças.',
  },
  {
    id: 'concept.minority-attack',
    nome: 'Ataque de minoria',
    explicacao:
      'Avançar dois peões contra três na ala em que se está em minoria, para criar uma fraqueza permanente na estrutura adversária. Não é ataque ao rei: é cirurgia na estrutura.',
  },
  {
    id: 'concept.bishop-pair',
    nome: 'Par de bispos',
    explicacao:
      'Dois bispos cobrem as duas cores e crescem quando o centro abre. Vale entregar tempo ou estrutura por eles quando a posição tende a abrir, e não quando ela tende a travar.',
  },
  {
    id: 'concept.space-vs-counterplay',
    nome: 'Espaço contra contrajogo',
    explicacao:
      'Quem tem mais espaço manobra melhor e sufoca; quem tem menos precisa de uma ruptura marcada. A pergunta prática não é quem está melhor, é quem tem um plano concreto agora.',
  },
  {
    id: 'concept.material-vs-initiative',
    nome: 'Material contra iniciativa',
    explicacao:
      'Um peão a mais vale no final; um tempo a mais vale agora. Gambitos trocam o primeiro pelo segundo, e a conta só fecha se a iniciativa virar algo concreto antes de o adversário se desenvolver.',
  },
  {
    id: 'concept.break-d4',
    nome: 'Ruptura d4',
    explicacao:
      'O avanço que abre o centro para quem já se desenvolveu. Feito cedo, abre linhas para o rei que ainda está no meio; feito tarde, o adversário já consolidou.',
  },
  {
    id: 'concept.break-e5',
    nome: 'Ruptura e5',
    explicacao:
      'O avanço que ganha espaço e fecha a diagonal do bispo adversário, ou abre a coluna quando é trocado. Decide o caráter da posição mais que qualquer lance de peça.',
  },
  {
    id: 'concept.break-c5',
    nome: 'Ruptura c5',
    explicacao:
      'O golpe padrão contra um centro de peões em d4: ataca a base em vez da cabeça. Quase toda defesa fechada de 1.d4 existe para preparar este lance.',
  },
  {
    id: 'concept.open-file',
    nome: 'Coluna aberta',
    explicacao:
      'A estrada das torres. Quem a ocupa primeiro e a sustenta com a segunda torre costuma decidir onde a partida acontece.',
  },
  {
    id: 'concept.backward-pawn',
    nome: 'Peão atrasado',
    explicacao:
      'Um peão que não pode mais avançar sem ser capturado e que nenhum peão vizinho defende. A casa à frente dele vale mais que o peão.',
  },
  {
    id: 'concept.hanging-pawns',
    nome: 'Peões pendentes',
    explicacao:
      'Dois peões centrais lado a lado sem peões vizinhos. São força enquanto avançam juntos e fraqueza no instante em que um deles é obrigado a andar sozinho.',
  },
  {
    id: 'concept.bad-bishop',
    nome: 'Bispo ruim',
    explicacao:
      'O bispo preso atrás dos próprios peões. Resolvê-lo — trocando, ativando ou mudando a cadeia — costuma ser o plano inteiro de uma abertura fechada.',
  },
  {
    id: 'concept.king-safety-timing',
    nome: 'A hora de rocar',
    explicacao:
      'Rocar cedo é regra; rocar no lado certo é decisão. Quando os dois lados rocam em alas opostas, a corrida de peões começa e os tempos passam a valer mais que a estrutura.',
  },
] as const

/* -------------------------------------------------------------------------- */
/* Estruturas de peões                                                         */
/* -------------------------------------------------------------------------- */

export interface EstruturaDePeoes {
  id: string
  nome: string
  explicacao: string
  /** As rupturas que esta estrutura autoriza, em SAN genérico. */
  rupturas: readonly string[]
}

export const ESTRUTURAS_DE_PEOES: readonly EstruturaDePeoes[] = [
  {
    id: 'structure.carlsbad',
    nome: 'Estrutura de Carlsbad',
    explicacao:
      'Nasce da troca cxd5 exd5 no Gambito da Dama. As brancas jogam o ataque de minoria na ala da dama; as pretas jogam no centro e no rei. É a estrutura em que o plano de cada lado está escrito na própria posição.',
    rupturas: ['b4-b5', 'e4', 'f5'],
  },
  {
    id: 'structure.iqp',
    nome: 'Centro com peão isolado',
    explicacao:
      'Um peão em d4 ou d5 sem vizinhos. Dá a casa avançada à frente dele para o adversário e as casas ativas ao redor para quem o tem.',
    rupturas: ['d5', 'd4'],
  },
  {
    id: 'structure.french-chain',
    nome: 'Cadeia da Francesa',
    explicacao:
      'Peões brancos em d4 e e5 contra pretos em d5 e e6. O bispo de c8 fica atrás da cadeia, e as pretas atacam a base com ...c5 e ...f6.',
    rupturas: ['c5', 'f6', 'f4-f5'],
  },
  {
    id: 'structure.caro-advance-chain',
    nome: 'Cadeia da Caro-Kann avançada',
    explicacao:
      'A mesma cadeia da Francesa, com uma diferença que decide a abertura: o bispo de c8 saiu ANTES de ...e6. É por isso que a Caro-Kann existe.',
    rupturas: ['c5', 'f6'],
  },
  {
    id: 'structure.slav-triangle',
    nome: 'Triângulo da Eslava',
    explicacao:
      'Peões em c6, d5 e e6. Sólido ao ponto de ser difícil de quebrar, ao custo de o bispo de c8 precisar de uma solução.',
    rupturas: ['c5', 'e5', 'dxc4'],
  },
  {
    id: 'structure.benoni-center',
    nome: 'Centro de Benoni',
    explicacao:
      'Peão branco em d5 contra peões pretos em c5 e d6, com maioria preta na ala da dama. Espaço contra contrajogo, na forma mais pura.',
    rupturas: ['e5', 'b5', 'f5'],
  },
  {
    id: 'structure.kid-locked-center',
    nome: 'Centro travado da Índia do Rei',
    explicacao:
      'Peões trancados em d5/e5 e as duas partidas correndo em alas opostas. Quem chega primeiro ganha, e a estrutura decide por onde cada um corre.',
    rupturas: ['f5', 'c5', 'b4'],
  },
  {
    id: 'structure.open-center',
    nome: 'Centro aberto',
    explicacao:
      'Sem peões centrais travados. As peças valem mais que a estrutura, o desenvolvimento vale mais que o material, e o rei no meio vira alvo imediato.',
    rupturas: ['d4', 'e4'],
  },
  {
    id: 'structure.hanging-pawns',
    nome: 'Peões pendentes em c e d',
    explicacao:
      'Dois peões centrais lado a lado sem vizinhos, tipicamente em c5 e d5. Força enquanto avançam juntos; alvo no instante em que param.',
    rupturas: ['d4', 'c4'],
  },
] as const

/* -------------------------------------------------------------------------- */
/* Motivos táticos                                                             */
/* -------------------------------------------------------------------------- */

export interface MotivoTatico {
  id: string
  nome: string
  explicacao: string
}

/**
 * Os motivos táticos que as aberturas produzem.
 *
 * ELES NÃO SÃO "ARMADILHAS" (§51 e §73). Uma armadilha ensinada solta treina o
 * aluno a esperar que o adversário erre; um motivo ligado ao conceito ensina por
 * que a posição o produz. A regra editorial é que toda tática aqui tem de estar
 * amarrada a uma ideia da abertura.
 */
export const MOTIVOS_TATICOS: readonly MotivoTatico[] = [
  {
    id: 'motif.f7-pressure',
    nome: 'Pressão em f7',
    explicacao:
      'A casa mais fraca do campo preto antes do roque, porque só o rei a defende. Aparece sempre que o bispo chega a c4 com um cavalo pronto para g5 ou e5.',
  },
  {
    id: 'motif.greek-gift',
    nome: 'Sacrifício em h7',
    explicacao:
      'Bxh7+ seguido de Cg5+ e dama em h5, contra um roque cujo peão de h está desguarnecido. Depende de detalhes concretos — não é um padrão que sempre funciona.',
  },
  {
    id: 'motif.exchange-sac-c3',
    nome: 'Sacrifício de qualidade em c3',
    explicacao:
      'Torre por cavalo em c3 para desfazer a proteção do rei branco na Siciliana. Troca material por linhas abertas contra o rei.',
  },
  {
    id: 'motif.back-rank',
    nome: 'Última fileira',
    explicacao:
      'O rei rocado sem casa de fuga. Nasce na abertura toda vez que os peões do roque não se mexem e as torres saem da primeira fileira.',
  },
  {
    id: 'motif.pin-on-d-file',
    nome: 'Cravada na coluna d',
    explicacao:
      'Depois de uma troca central, a dama ou a torre na coluna d crava a peça que está à frente do rei. É o motivo que faz o centro aberto ser perigoso para quem não rocou.',
  },
  {
    id: 'motif.fork-on-d5',
    nome: 'Garfo na casa avançada',
    explicacao:
      'O cavalo na casa que nenhum peão pode expulsar — d5 ou e5, tipicamente. A casa vem da estrutura; o garfo vem de graça depois.',
  },
] as const

/* -------------------------------------------------------------------------- */
/* Índices                                                                     */
/* -------------------------------------------------------------------------- */

export const CONCEITO_POR_ID = new Map(CONCEITOS_DE_ABERTURA.map((item) => [item.id, item]))
export const ESTRUTURA_POR_ID = new Map(ESTRUTURAS_DE_PEOES.map((item) => [item.id, item]))
export const MOTIVO_POR_ID = new Map(MOTIVOS_TATICOS.map((item) => [item.id, item]))
