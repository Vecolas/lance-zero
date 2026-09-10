/**
 * Banco de posições do diagnóstico.
 *
 * QUINZE itens, entre os 12 e 20 que a issue #11 pede. Cada um mede UMA
 * habilidade do catálogo e carrega um objetivo que o código sabe conferir —
 * `tests/unit/diagnostic-banco.test.ts` varre o banco inteiro provando que todo
 * lance aceito cumpre o objetivo e que toda alternativa apresentada como errada
 * REALMENTE falha. Item com chave de correção errada não é um item difícil: é
 * um item que mede o autor em vez do aluno, e ele não aparece em lugar nenhum.
 *
 * A ESCADA DE DIFICULDADE É O PONTO, e é o critério de aceite mais fácil de
 * furar: um diagnóstico só de posições elementares empurra todo mundo para a
 * trilha elementar, e o aluno de 1100 abandona na primeira sessão. Por isso as
 * âncoras vão de 700 a 1450, com itens acima e abaixo do público-alvo, e o
 * portão cobra essa dispersão em vez de contar apenas quantos itens existem.
 *
 * O QUE ESTE BANCO NÃO MEDE, declarado em vez de disfarçado: cravada, ataque
 * descoberto por peça menor, desvio, peça sobrecarregada, lances candidatos,
 * todos os finais que não são mate básico, e as três habilidades de abertura.
 * São treze das vinte e duas habilidades. O motivo é um só: só entra aqui
 * objetivo que `avaliarLance` sabe julgar sem engine, e "oposição" ou
 * "desenvolvimento" não cabem em mate forçado nem em saldo de material a um
 * lance. Essas habilidades entram no plano pelo caminho honesto — o planner já
 * sabe dizer "ainda há pouco dado sobre isto" — em vez de receberem uma
 * estimativa inventada logo na primeira tela. `EstimativaDeDiagnostico.naoMedidas`
 * é derivado do banco, então esta lista nunca fica desatualizada em silêncio.
 *
 * TETO DECLARADO: a âncora mais difícil é 1450, abaixo do topo da faixa-alvo do
 * produto (1600). Quem estiver acima disso acerta tudo e a estimativa satura no
 * teto da grade — a faixa devolvida fica larga de propósito, e é isso que a tela
 * mostra. Fechar essa lacuna é escrever itens de 1500 a 1800, não mexer no
 * estimador.
 */

import type { ItemDeDiagnostico } from '@/domain/diagnostic'

export const BANCO_DE_DIAGNOSTICO: readonly ItemDeDiagnostico[] = [
  {
    id: 'peca-pendurada-1',
    skillId: 'tactics.hanging-piece',
    dificuldade: 700,
    fen: 'r3k3/pp3ppp/8/3b4/8/8/PP3PPP/3R2K1 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 250 },
    enunciado: 'Brancas jogam. Há material a ganhar agora, sem nenhuma complicação.',
    lancesAceitos: ['d1d5'],
    alternativas: ['d1d4', 'd1a1', 'g1f1'],
    explicacao:
      'O bispo em d5 não tem nenhuma peça defendendo. A torre da coluna d chega nele em um ' +
      'lance. Antes de calcular variantes, vale a varredura mais barata que existe: quais peças ' +
      'do adversário estão sem defesa?',
  },
  {
    id: 'peca-pendurada-2',
    skillId: 'tactics.hanging-piece',
    dificuldade: 950,
    fen: 'r1bqkbnr/ppp2ppp/2np4/4N3/2B1P3/8/PPPP1PPP/R1BQK2R b KQkq - 0 1',
    ladoDoAluno: 'b',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 250 },
    enunciado: 'Pretas jogam. O cavalo avançado das brancas está atacando f7 — e está sozinho.',
    lancesAceitos: ['d6e5', 'c6e5'],
    alternativas: ['c8g4', 'e8g8', 'g8f6'],
    explicacao:
      'O cavalo em e5 ataca f7, e a ameaça assusta o suficiente para muita gente defender antes ' +
      'de conferir quem defende o cavalo. Ninguém defende: nem peão, nem dama, nem bispo. As duas ' +
      'capturas ganham a peça, e o ataque a f7 morre junto com ela.',
  },
  {
    id: 'mate-basico-dama',
    skillId: 'endgame.basic-mates',
    dificuldade: 750,
    fen: '6k1/8/6K1/8/8/8/8/2Q5 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'mate-em', lances: 1 },
    enunciado: 'Brancas jogam e dão mate em um lance.',
    lancesAceitos: ['c1c8'],
    alternativas: ['c1c7', 'c1c4', 'g6h6'],
    explicacao:
      'O rei branco já cobre f7, g7 e h7. Falta a dama fechar a oitava fileira, e ela faz isso ' +
      'de longe — não precisa chegar perto. Dama sozinha não dá mate: quem dá é a dama com o rei.',
  },
  {
    id: 'mate-basico-torre',
    skillId: 'endgame.basic-mates',
    dificuldade: 1000,
    fen: '7k/8/6K1/8/8/8/8/6R1 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'mate-em', lances: 2 },
    enunciado: 'Brancas jogam e dão mate em dois lances.',
    lancesAceitos: ['g1a1', 'g1e1'],
    alternativas: ['g1f1', 'g6f6', 'g1g5'],
    explicacao:
      'A torre está atrapalhada pelo próprio rei na coluna g. Saindo dela, o rei preto só tem g8, ' +
      'e a torre dá mate na oitava fileira. Repare em f1: dali o mate em f8 seria ao lado do rei ' +
      'preto, que simplesmente captura a torre. A distância é o que torna o xeque seguro.',
  },
  {
    id: 'garfo-cavalo',
    skillId: 'tactics.fork',
    dificuldade: 900,
    fen: '2r3k1/5ppp/8/3N4/8/8/5PPP/6K1 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 400 },
    enunciado: 'Brancas jogam. O cavalo alcança uma casa que ataca duas peças ao mesmo tempo.',
    lancesAceitos: ['d5e7'],
    alternativas: ['d5c7', 'd5f6', 'd5b6'],
    explicacao:
      'Em e7 o cavalo dá xeque ao rei e ataca a torre de c8. O xeque obriga o rei a se mexer, e ' +
      'só então a torre é capturada — é a ordem que faz o garfo funcionar. Em c7 a torre ' +
      'simplesmente come o cavalo; em f6 o peão come.',
  },
  {
    id: 'garfo-peao',
    skillId: 'tactics.fork',
    dificuldade: 1250,
    fen: 'r2qkb1r/ppp2ppp/2npb3/8/3P4/8/PP3PPP/RNBQKB1R w KQkq - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 150 },
    enunciado: 'Brancas jogam. Um avanço de peão ataca duas peças de uma vez.',
    lancesAceitos: ['d4d5'],
    alternativas: ['f1b5', 'b1c3', 'd1d3'],
    explicacao:
      'O peão em d5 ataca o cavalo de c6 e o bispo de e6. As duas peças valem mais que ele, e ' +
      'não dá para salvar as duas. Garfo de peão é o mais barato do jogo e o mais fácil de não ' +
      'ver, porque a peça que ataca é a que ninguém está olhando.',
  },
  {
    id: 'ultima-fileira',
    skillId: 'tactics.back-rank',
    dificuldade: 1150,
    fen: '2r3k1/5ppp/8/8/8/8/4RPPP/4R1K1 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'mate-em', lances: 2 },
    enunciado: 'Brancas jogam e dão mate em dois lances.',
    lancesAceitos: ['e2e8'],
    alternativas: ['e2e7', 'e2e5', 'g1h1'],
    explicacao:
      'A torre entra na oitava fileira mesmo com a torre preta olhando para lá. A captura é ' +
      'obrigatória — o rei não tem casa —, e a segunda torre repete o lance com mate. Duas torres ' +
      'na mesma coluna valem mais que duas torres soltas.',
  },
  {
    id: 'varredura-captura-dama',
    skillId: 'calculation.checks-captures-threats',
    dificuldade: 1050,
    fen: '3r2k1/3q1ppp/8/8/8/8/5PPP/3RQ1K1 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 350 },
    enunciado: 'Brancas jogam. Vale a pena varrer as capturas antes de qualquer plano.',
    lancesAceitos: ['d1d7'],
    alternativas: ['e1e8', 'd1d5', 'g1h1'],
    explicacao:
      'A dama preta está defendida pela torre, e é justamente por isso que a captura passa ' +
      'batida. A conta é simples: torre por dama, com a torre preta recapturando. Sobram cinco ' +
      'pontos de vantagem. Varrer capturas custa dez segundos e devolve isto.',
  },
  {
    id: 'varredura-contagem',
    skillId: 'calculation.checks-captures-threats',
    dificuldade: 1100,
    fen: '2r3k1/5ppp/2n5/8/1N6/8/5PPP/2R3K1 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 250 },
    enunciado: 'Brancas jogam. Duas peças atacam c6 e uma defende. Vale a pena capturar?',
    lancesAceitos: ['b4c6', 'c1c6'],
    alternativas: ['b4d5', 'b4d3', 'b4a6'],
    explicacao:
      'Dois atacantes contra um defensor: a captura ganha a peça, e a recaptura da torre preta é ' +
      'respondida pela segunda peça branca. A conta que decide isto é de contar atacantes e ' +
      'defensores, não de calcular variantes longas. Começar pela peça mais barata rende mais.',
  },
  {
    id: 'raio-x-torre',
    skillId: 'tactics.skewer',
    dificuldade: 1200,
    fen: '4k2r/p4ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 400 },
    enunciado: 'Brancas jogam. O rei preto e a torre dele estão na mesma fileira.',
    lancesAceitos: ['b1b8'],
    alternativas: ['b1b7', 'b1e1', 'g1f1'],
    explicacao:
      'O xeque na oitava fileira obriga o rei a sair da linha, e a torre atrás dele fica exposta. ' +
      'É o inverso da cravada: aqui a peça valiosa está na frente e tem de se mexer. Duas peças ' +
      'na mesma linha é o sinal que dispara a busca.',
  },
  {
    id: 'rede-de-mate-canto',
    skillId: 'tactics.mating-net',
    dificuldade: 1250,
    fen: '6rk/6pp/7N/3Q4/8/8/8/6K1 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'mate-em', lances: 1 },
    enunciado: 'Brancas jogam e dão mate em um lance.',
    lancesAceitos: ['d5g8', 'h6f7'],
    alternativas: ['d5d8', 'h6g4', 'd5h5'],
    explicacao:
      'O rei preto está preso pelas próprias peças: g7 e h7 são dele, e g8 está ocupada pela ' +
      'torre. Sobram dois mates — capturar em g8, porque o cavalo defende a casa, ou o cavalo em ' +
      'f7, que ninguém alcança. Rei sem casa de fuga é a condição, não o xeque.',
  },
  {
    id: 'rede-de-mate-arabe',
    skillId: 'tactics.mating-net',
    dificuldade: 1450,
    fen: '7k/R7/8/7p/6N1/8/8/6K1 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'mate-em', lances: 2 },
    enunciado: 'Brancas jogam e dão mate em dois lances.',
    lancesAceitos: ['g4f6'],
    alternativas: ['a7h7', 'a7a8', 'g4e5'],
    explicacao:
      'O cavalo em f6 tira g8 e passa a defender h7. Depois disso a torre entra em h7 sem poder ' +
      'ser capturada. O xeque imediato em h7 perde a torre; o xeque em a8 só empurra o rei. ' +
      'Primeiro fecha-se a rede, depois se dá o xeque.',
  },
  {
    id: 'resposta-do-adversario-f7',
    skillId: 'calculation.opponent-best-response',
    dificuldade: 1000,
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 1',
    ladoDoAluno: 'b',
    objetivo: { tipo: 'evita-mate', emLances: 1, perdaMaximaTolerada: 0 },
    enunciado: 'Pretas jogam. Antes de escolher, pergunte o que as brancas querem jogar agora.',
    lancesAceitos: ['g7g6', 'd8e7'],
    alternativas: ['g8f6', 'b7b6', 'd7d6'],
    explicacao:
      'A dama e o bispo miram f7 ao mesmo tempo, e o rei é o único defensor. Qualquer lance que ' +
      'não trate disso perde no lance seguinte. Não é um truque a decorar: é a pergunta ' +
      '"o que ele joga se eu não fizer nada?" feita antes de escolher.',
  },
  {
    id: 'resposta-do-adversario-fileira',
    skillId: 'calculation.opponent-best-response',
    dificuldade: 1300,
    fen: '2rr2k1/R4ppp/8/8/8/8/5PPP/6K1 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'evita-mate', emLances: 1, perdaMaximaTolerada: 0 },
    enunciado: 'Brancas jogam. Antes de melhorar a sua torre, veja o que as pretas ameaçam.',
    lancesAceitos: ['h2h3', 'g2g3'],
    alternativas: ['a7a8', 'a7b7', 'g1h1'],
    explicacao:
      'A primeira fileira branca está fechada pelos próprios peões, e uma torre preta entra lá no ' +
      'lance seguinte com mate. Ativar a torre, dar xeque na oitava fileira ou mexer o rei para ' +
      'h1 não muda nada. O lance que resolve é o mais modesto do tabuleiro: abrir a casa de fuga.',
  },
  {
    id: 'descoberta-cavalo',
    skillId: 'tactics.discovered-attack',
    dificuldade: 1350,
    fen: '3q1rk1/5p1p/6p1/3NP3/8/8/5PPP/3R2K1 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 350 },
    enunciado:
      'Brancas jogam. A torre de d1 está olhando para a dama preta — e há algo no caminho.',
    lancesAceitos: ['d5f6'],
    alternativas: ['d5c7', 'd5f4', 'd5e7'],
    explicacao:
      'O cavalo é quem bloqueia a coluna d. Saindo com xeque, ele abre a linha da torre contra a ' +
      'dama e obriga o adversário a tratar do xeque primeiro. Sair sem xeque também abre a ' +
      'coluna — só que aí é a dama preta que captura a torre antes.',
  },
]
