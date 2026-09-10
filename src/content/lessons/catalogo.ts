/**
 * Catálogo de microlições.
 *
 * SEIS lições, e o número está declarado como o que é: um começo. A issue #11
 * pede de 30 a 40, e escrever trinta lições de xadrez em uma rodada de máquina
 * produziria exatamente o conteúdo que este produto não quer — texto genérico,
 * posição não conferida, explicação que soa certa. O que esta entrega fecha é o
 * ESQUEMA e o PORTÃO: as vinte e poucas lições que faltam entram pelo mesmo
 * molde, e cada uma passa pela mesma prova. Faltam de 24 a 34.
 *
 * As seis cobrem as habilidades que o diagnóstico mais mede e que mais decidem
 * partida em ~1100: peça pendurada, garfo, última fileira, varredura de
 * capturas, resposta do adversário e mate básico.
 *
 * Toda lição termina em recuperação porque o ESQUEMA não deixa terminar de
 * outro jeito (ver `./schema`), e `tests/unit/lessons-catalogo.test.ts` varre o
 * catálogo inteiro conferindo posição, linha e chave de correção.
 */

import { definirLicao, type Licao } from './schema'

const PECA_PENDURADA = definirLicao({
  id: 'peca-pendurada',
  titulo: 'A peça que ninguém está defendendo',
  habilidade: 'tactics.hanging-piece',
  conceito:
    'Antes de qualquer plano, olhe quais peças do adversário estão sem nenhum defensor. É a ' +
    'busca mais barata do xadrez e a que decide mais partidas até 1400. Uma peça sem defesa ao ' +
    'alcance de uma peça sua é material de graça.',
  exemploResolvido: {
    fen: '4k3/8/2n5/8/8/8/8/2R1K3 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 250 },
    linhaModelo: ['c1c6'],
    comentario:
      'O cavalo em c6 não tem peão, peça nem rei defendendo. A torre da coluna c chega nele ' +
      'direto. Não há variante a calcular: há uma pergunta a fazer.',
  },
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
})

const GARFO = definirLicao({
  id: 'garfo',
  titulo: 'Um lance, dois alvos',
  habilidade: 'tactics.fork',
  conceito:
    'Garfo é um lance que ataca duas coisas ao mesmo tempo. O adversário só salva uma. Cavalo e ' +
    'peão são os melhores garfadores porque valem pouco: o alvo não pode simplesmente capturar ' +
    'o atacante e ficar bem.',
  exemploResolvido: {
    fen: '3r3k/8/8/4N3/8/8/8/6K1 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 400 },
    linhaModelo: ['e5f7', 'h8g8', 'f7d8'],
    comentario:
      'De f7 o cavalo dá xeque ao rei e ataca a torre de d8 no mesmo lance. O xeque é o que ' +
      'transforma o ataque duplo em ganho: o rei precisa responder, e a torre fica para depois.',
  },
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
})

const ULTIMA_FILEIRA = definirLicao({
  id: 'ultima-fileira',
  titulo: 'A fileira que os próprios peões fecharam',
  habilidade: 'tactics.back-rank',
  conceito:
    'Depois do roque, os três peões que protegem o rei também o prendem. Uma torre ou dama que ' +
    'entre na última fileira dá mate se o rei não tiver casa de fuga. Vale para os dois lados: ' +
    'confira a sua fileira com a mesma frequência com que ataca a dele.',
  exemploResolvido: {
    fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'mate-em', lances: 1 },
    linhaModelo: ['a1a8'],
    comentario:
      'O rei preto tem cinco casas ao redor e nenhuma serve: três estão ocupadas pelos próprios ' +
      'peões e duas ficam na fileira que a torre acabou de tomar.',
  },
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
})

const VARREDURA = definirLicao({
  id: 'varredura-de-capturas',
  titulo: 'Xeques, capturas e ameaças',
  habilidade: 'calculation.checks-captures-threats',
  conceito:
    'Antes de escolher um lance, liste os lances forçantes: quais xeques você tem, quais ' +
    'capturas, quais ameaças. São poucos e a lista se faz em segundos. Capturar nem sempre é ' +
    'certo — a varredura serve para você DECIDIR, não para capturar por reflexo.',
  exemploResolvido: {
    fen: '4k3/2p5/1n4b1/8/8/8/8/1R2K1R1 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 250 },
    linhaModelo: ['g1g6'],
    comentario:
      'As duas capturas aparecem na varredura, e só uma presta: o cavalo de b6 está defendido ' +
      'pelo peão c7, então Txb6 devolve cinco pontos por três. O bispo de g6 não tem ninguém.',
  },
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
})

const RESPOSTA_DO_ADVERSARIO = definirLicao({
  id: 'resposta-do-adversario',
  titulo: 'O que ele quer jogar?',
  habilidade: 'calculation.opponent-best-response',
  conceito:
    'Depois de escolher o seu lance e antes de jogá-lo, pergunte o que o adversário responderia. ' +
    'A maioria das partidas perdidas até 1400 não se perde por não achar um plano: perde-se por ' +
    'não olhar a ameaça que já estava na mesa.',
  exemploResolvido: {
    fen: '3r2k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'evita-mate', emLances: 1, perdaMaximaTolerada: 0 },
    linhaModelo: ['h2h3'],
    comentario:
      'A torre preta entra em d1 no próximo lance e é mate. Nenhuma peça branca chega a tempo de ' +
      'impedir isso; o que resolve é dar ao rei uma casa de fuga com um lance de peão.',
  },
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
})

const MATE_DE_DAMA = definirLicao({
  id: 'mate-de-dama',
  titulo: 'Mate com rei e dama',
  habilidade: 'endgame.basic-mates',
  conceito:
    'A dama sozinha não dá mate. Quem dá é a dama apoiada pelo rei: ela tira as casas, ele ' +
    'defende a casa em que ela entra. Empurre o rei adversário para a borda antes de dar o ' +
    'xeque, e confira as casas de fuga antes de cada lance para não afogar.',
  exemploResolvido: {
    fen: '7k/8/6K1/8/8/8/8/3Q4 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'mate-em', lances: 1 },
    linhaModelo: ['d1d8'],
    comentario:
      'O rei branco já tira g7 e h7 do rei preto. A dama só precisa fechar a oitava fileira, e ' +
      'faz isso de longe: chegar ao lado do rei sem o apoio dele seria entregar a dama.',
  },
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
})

export const CATALOGO_DE_LICOES: readonly Licao[] = [
  PECA_PENDURADA,
  GARFO,
  ULTIMA_FILEIRA,
  VARREDURA,
  RESPOSTA_DO_ADVERSARIO,
  MATE_DE_DAMA,
]

/** Quantas lições a issue #11 pede no total. O catálogo é um começo declarado. */
export const LICOES_PLANEJADAS = { minimo: 30, maximo: 40 } as const
