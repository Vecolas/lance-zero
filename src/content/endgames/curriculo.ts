/**
 * Currículo inicial de finais.
 *
 * As sete unidades são as do CLAUDE.md: mate de dama, mate de torre, oposição,
 * casas-chave, regra do quadrado, peão passado e conceitos básicos de torre.
 *
 * DECISÃO: currículo com posição inválida é pior que currículo vazio — a lição
 * aparece na tela, o aluno tenta, e o objetivo não pode ser cumprido. Por isso
 * cada posição carrega uma linha modelo em UCI e um portão
 * (`tests/unit/endgames-curriculo.test.ts`) varre o currículo INTEIRO conferindo
 * legalidade do FEN, legalidade da linha, não-trivialidade do objetivo e, nos
 * mates, que o mate é forçado no prazo declarado.
 *
 * Toda habilidade de final de `SKILL_IDS` é ensinada por alguma lição daqui, e
 * o portão varre `SKILL_IDS` para cobrar isso. Habilidade sem lição não é erro
 * de compilação nem quebra nenhuma tela: ela simplesmente nunca seria treinada,
 * e o modelo de maestria ficaria com uma coluna que nunca enche.
 */

import type { LicaoDeFinal } from '@/domain/endgames'
import type { SkillId } from '@/domain/types'

/**
 * Números do portão do currículo.
 *
 * `mateMaximoVerificavel` é LIMITE DE DESIGN, não botão de ajuste: a busca de
 * mate forçado é exponencial e roda dentro de um teste unitário. Subir este
 * número exige medir o tempo do portão antes, não depois.
 *
 * `linhaModeloMinima` é heurística de produto: uma linha de um lance só ainda é
 * um exemplo resolvido válido (mate em 1), então o piso é 1.
 */
export const CURRICULO_CONFIG = {
  /** Maior `lancesMaximos` que o portão aceita num objetivo de mate. */
  mateMaximoVerificavel: 2,
  /** Menor linha modelo aceita, em meios-lances. */
  linhaModeloMinima: 1,
} as const

/**
 * Lições cuja habilidade é a mais próxima, não a certa.
 *
 * Chave: id da lição. Valor: qual habilidade faltaria em `SKILL_IDS`.
 */
const MATE_DE_DAMA: LicaoDeFinal = {
  id: 'mate-de-dama',
  titulo: 'Mate de rei e dama',
  habilidade: 'endgame.basic-mates' satisfies SkillId,
  conceito:
    'A dama sozinha não dá mate: quem dá é a dama apoiada pelo rei. Empurre o rei adversário ' +
    'para a borda e só então entregue o xeque, sempre com a dama defendida.',
  posicoes: [
    {
      id: 'dama-mate-em-1',
      fen: '7k/8/6K1/8/8/8/8/1Q6 w - - 0 1',
      ladoDoAluno: 'w',
      objetivo: { tipo: 'mate-em', lancesMaximos: 1 },
      enunciado: 'O rei preto já está no canto e o seu rei cobre a fuga. Dê mate em um lance.',
      linhaModelo: ['b1b8'],
      dicas: [
        'Procure o xeque que o rei adversário não tem como responder.',
        'A oitava fileira inteira está livre para a sua dama.',
        'Dama para b8.',
      ],
    },
    {
      id: 'dama-mate-em-2',
      fen: '7k/8/5K2/8/8/8/2Q5/8 w - - 0 1',
      ladoDoAluno: 'w',
      objetivo: { tipo: 'mate-em', lancesMaximos: 2 },
      enunciado: 'Tire a casa de fuga primeiro, dê o mate depois. Mate em dois lances.',
      linhaModelo: ['c2c7', 'h8g8', 'c7g7'],
      dicas: [
        'O xeque imediato não é mate: encontre o lance que tira casas antes de dar xeque.',
        'A sétima fileira é a linha que prende o rei preto.',
        'Dama para c7.',
      ],
    },
  ],
}

const MATE_DE_TORRE: LicaoDeFinal = {
  id: 'mate-de-torre',
  titulo: 'Mate de rei e torre',
  habilidade: 'endgame.basic-mates' satisfies SkillId,
  conceito:
    'A torre corta o rei adversário numa faixa do tabuleiro e o seu rei empurra. O mate sai ' +
    'quando os dois reis estão em oposição e a torre dá o xeque pela borda.',
  posicoes: [
    {
      id: 'torre-mate-em-1',
      fen: '7k/8/6K1/8/8/8/8/R7 w - - 0 1',
      ladoDoAluno: 'w',
      objetivo: { tipo: 'mate-em', lancesMaximos: 1 },
      enunciado: 'Os reis estão em oposição. Dê mate em um lance.',
      linhaModelo: ['a1a8'],
      dicas: [
        'Seu rei já cobre g7, g8 e h7. Falta o xeque.',
        'A torre precisa alcançar a oitava fileira.',
        'Torre para a8.',
      ],
    },
    {
      id: 'torre-mate-em-2',
      fen: '7k/8/5K2/8/8/8/8/R7 w - - 0 1',
      ladoDoAluno: 'w',
      objetivo: { tipo: 'mate-em', lancesMaximos: 2 },
      enunciado: 'Falta um passo do rei para a oposição. Mate em dois lances.',
      linhaModelo: ['f6g6', 'h8g8', 'a1a8'],
      dicas: [
        'O xeque agora deixa o rei preto escapar por h7. Conserte isso primeiro.',
        'Quem tem de se mexer é o seu rei, não a torre.',
        'Rei para g6.',
      ],
    },
  ],
}

const OPOSICAO: LicaoDeFinal = {
  id: 'oposicao',
  titulo: 'Oposição em finais de rei e peão',
  habilidade: 'endgame.king-pawn-opposition' satisfies SkillId,
  conceito:
    'Reis na mesma coluna, com uma casa entre eles: quem tem de jogar perde a oposição e cede ' +
    'passagem. Defendendo, tome a oposição; atacando, chegue à sexta fileira à frente do peão.',
  posicoes: [
    {
      id: 'oposicao-defender',
      fen: '4k3/8/8/4K3/4P3/8/8/8 b - - 0 1',
      ladoDoAluno: 'b',
      objetivo: { tipo: 'empate-defendido' },
      enunciado: 'Você joga de pretas e está perdido se recuar errado. Segure o empate.',
      linhaModelo: [
        'e8e7',
        'e5d5',
        'e7d7',
        'e4e5',
        'd7e7',
        'e5e6',
        'e7e8',
        'd5d6',
        'e8d8',
        'e6e7',
        'd8e8',
        'd6e6',
      ],
      dicas: [
        'Não fuja para o lado errado: existe uma casa só que segura o empate.',
        'Fique sempre na mesma coluna do peão, de frente para o rei branco.',
        'Rei para e7.',
      ],
    },
    {
      id: 'oposicao-conquistar',
      fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1',
      ladoDoAluno: 'w',
      objetivo: { tipo: 'promocao', peca: 'q', quantidadeMinima: 1 },
      enunciado: 'Seu rei já está na sexta fileira à frente do peão. Promova.',
      linhaModelo: ['e6d6', 'e8f7', 'd6d7', 'f7f8', 'e5e6', 'f8g7', 'e6e7', 'g7f7', 'e7e8q'],
      dicas: [
        'Rei na frente do peão ganha; empurrar o peão cedo demais empata.',
        'Ande com o rei para o lado, não com o peão.',
        'Rei para d6.',
      ],
    },
  ],
}

const CASAS_CHAVE: LicaoDeFinal = {
  id: 'casas-chave',
  titulo: 'Casas-chave e a exceção do peão de torre',
  habilidade: 'endgame.key-squares' satisfies SkillId,
  conceito:
    'Casas-chave são as casas que, ocupadas pelo seu rei, garantem a promoção mesmo sem a ' +
    'oposição. O peão de torre não tem nenhuma: com o rei defensor no canto, o final é empate.',
  posicoes: [
    {
      id: 'casas-chave-peao-de-torre',
      fen: 'k7/8/K7/P7/8/8/8/8 b - - 0 1',
      ladoDoAluno: 'b',
      objetivo: { tipo: 'empate-defendido' },
      enunciado: 'Você joga de pretas, com um peão a menos e o rei no canto. Segure o empate.',
      linhaModelo: ['a8b8', 'a6b6', 'b8a8', 'a5a6', 'a8b8', 'a6a7', 'b8a8', 'b6a6'],
      dicas: [
        'Peão de torre é a exceção de todo final de rei e peão.',
        'O canto a8 é a casa que o rei branco nunca consegue disputar.',
        'Rei para b8, e volte para a8 no lance seguinte.',
      ],
    },
  ],
}

const REGRA_DO_QUADRADO: LicaoDeFinal = {
  id: 'regra-do-quadrado',
  titulo: 'Regra do quadrado',
  habilidade: 'endgame.rule-of-square' satisfies SkillId,
  conceito:
    'Desenhe o quadrado que vai do peão até a casa de promoção. Se o rei adversário está dentro ' +
    'dele na vez dele, alcança o peão; se está fora, não alcança e não adianta correr.',
  posicoes: [
    {
      id: 'quadrado-rei-fora',
      fen: '7k/8/8/P7/8/8/8/7K w - - 0 1',
      ladoDoAluno: 'w',
      objetivo: { tipo: 'promocao', peca: 'q', quantidadeMinima: 1 },
      enunciado: 'Conte o quadrado antes de mover. Promova o peão.',
      linhaModelo: ['a5a6', 'h8g7', 'a6a7', 'g7f6', 'a7a8q'],
      dicas: [
        'Não traga o rei: conte primeiro se o peão chega sozinho.',
        'O quadrado do peão de a5 vai de a5 a d5, d8 e a8.',
        'Peão para a6.',
      ],
    },
    {
      id: 'quadrado-rei-dentro',
      fen: '3k4/8/8/P7/8/8/8/K7 b - - 0 1',
      ladoDoAluno: 'b',
      objetivo: { tipo: 'empate-defendido' },
      enunciado: 'Você joga de pretas. O rei branco está longe: alcance o peão e faça empate.',
      linhaModelo: ['d8c7', 'a5a6', 'c7b6', 'a6a7', 'b6a7'],
      dicas: [
        'Você está no canto do quadrado: dá tempo.',
        'Corte a diagonal em direção à coluna do peão, sem perder um lance sequer.',
        'Rei para c7.',
      ],
    },
  ],
}

const PEAO_PASSADO: LicaoDeFinal = {
  id: 'peao-passado',
  titulo: 'Criar um peão passado',
  habilidade: 'endgame.passed-pawn' satisfies SkillId,
  conceito:
    'Três peões contra três, sem reis por perto, ainda podem produzir um peão passado: entregue ' +
    'o peão do meio para abrir caminho ao peão da ponta.',
  posicoes: [
    {
      id: 'passado-rompimento',
      fen: '7k/ppp5/8/PPP5/8/8/8/7K w - - 0 1',
      ladoDoAluno: 'w',
      objetivo: { tipo: 'promocao', peca: 'q', quantidadeMinima: 1 },
      enunciado: 'Os reis não chegam a tempo. Crie um peão passado e promova.',
      linhaModelo: ['b5b6', 'a7b6', 'c5c6', 'b7c6', 'a5a6', 'h8g7', 'a6a7', 'g7f6', 'a7a8q'],
      dicas: [
        'Contar lances aqui vale mais que contar peças.',
        'Um dos três peões brancos tem de ser sacrificado para abrir a coluna.',
        'Peão para b6.',
      ],
    },
  ],
}

const TORRE_BASICA: LicaoDeFinal = {
  id: 'torre-basica',
  titulo: 'Torre e peão: a ponte de Lucena',
  habilidade: 'endgame.rook-endgames' satisfies SkillId,
  conceito:
    'Com o peão na sétima e o rei adversário cortado, o rei branco sai do caminho e leva xeques ' +
    'pelo lado. A ponte é a torre na quarta fileira, que bloqueia o xeque e libera a promoção.',
  posicoes: [
    {
      id: 'lucena-ponte',
      fen: '2K5/2P1k3/8/8/8/8/r7/3R4 w - - 0 1',
      ladoDoAluno: 'w',
      objetivo: { tipo: 'promocao', peca: 'q', quantidadeMinima: 1 },
      enunciado: 'O rei preto está cortado pela coluna d. Construa a ponte e promova.',
      linhaModelo: [
        'd1d4',
        'a2a1',
        'c8b7',
        'a1b1',
        'b7c6',
        'b1c1',
        'c6b5',
        'c1b1',
        'd4b4',
        'b1a1',
        'c7c8q',
      ],
      dicas: [
        'Antes de sair com o rei, prepare o escudo contra os xeques laterais.',
        'A torre precisa estar na quarta fileira quando o rei descer.',
        'Torre para d4.',
      ],
    },
  ],
}

/**
 * O currículo, na ordem em que o aluno o encontra.
 *
 * É a FONTE que o portão varre. Lição nova entra aqui e é conferida no mesmo
 * momento; não existe lista paralela onde ela possa ficar de fora.
 */
export const CURRICULO_FINAIS: readonly LicaoDeFinal[] = [
  MATE_DE_DAMA,
  MATE_DE_TORRE,
  OPOSICAO,
  CASAS_CHAVE,
  REGRA_DO_QUADRADO,
  PEAO_PASSADO,
  TORRE_BASICA,
]
