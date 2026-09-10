/**
 * Repertórios iniciais: um de brancas, um de pretas.
 *
 * O QUE ESTE CONTEÚDO RECUSA A SER. Não é um livro de variantes. Nenhuma linha
 * passa de cinco lances de cada lado, e o portão `REPERTORIO_CONFIG.
 * profundidadeMaxima` impede que passe. Para ~1100 a partida não é decidida na
 * abertura: é decidida por uma peça pendurada no lance 12. Um repertório que
 * ocupasse o tempo de estudo com a décima linha da Italiana estaria treinando a
 * coisa errada com muita competência.
 *
 * O QUE ELE É. Um princípio por repertório, meia dúzia de linhas curtas, e uma
 * IDEIA escrita em cada lance — inclusive nos lances do adversário, porque saber
 * o que o outro lado está tentando é metade do que falta a este jogador.
 *
 * DECISÃO QUE PARECE UM BURACO E É O DESENHO: o repertório de brancas responde
 * a 1...e5 e mais nada. Siciliana, Francesa e Caro-Kann ficam de fora de
 * propósito. Não é conteúdo faltando — é a recusa a escrever teoria antes de
 * saber o que este aluno enfrenta. Quando ele importar as partidas dele,
 * `frequenciaDoRepertorio` devolve essas respostas como LACUNAS, ordenadas por
 * quantas vezes apareceram de verdade, e a próxima linha a escrever é a primeira
 * da lista. Escrever as três agora seria adivinhar; deixar a lacuna aparecer é
 * medir.
 *
 * A TRANSPOSIÇÃO ESTÁ AQUI DENTRO, não só no teste: `italiana-giuoco-piano` e
 * `italiana-dois-cavalos` chegam à MESMA posição por ordens diferentes
 * (3...Bc5 4.d3 Nf6 e 3...Nf6 4.d3 Bc5), e por isso o roque curto tem a ideia
 * escrita UMA vez só — na primeira linha. A segunda apenas passa por ele. Se
 * alguém repetir a ideia lá, o portão reprova, e é para isso que ele existe.
 */

import type { DefinicaoDeRepertorio } from '@/domain/repertoire'

/**
 * Brancas: 1.e4 e a Italiana com d3.
 *
 * A escolha do d3 (Giuoco Pianissimo) em vez do c3 é pedagógica: sustenta o
 * bispo, prepara o roque e não abre nenhuma linha tática que o aluno ainda não
 * saiba calcular. Repertório de iniciante deve dar posições jogáveis, não
 * posições afiadas.
 */
export const REPERTORIO_BRANCAS: DefinicaoDeRepertorio = {
  id: 'brancas-italiana',
  titulo: 'Brancas: 1.e4 e a Italiana com d3',
  lado: 'w',
  principio:
    'Ocupe o centro, desenvolva as peças menores para casas onde elas olham o centro, ' +
    'e role o rei antes de começar qualquer plano. Nesta abertura os três acontecem nos ' +
    'cinco primeiros lances, e é por isso que ela serve para aprender.',
  habilidades: ['opening.development', 'opening.center', 'opening.king-safety'],
  linhas: [
    {
      id: 'italiana-giuoco-piano',
      lances: [
        {
          san: 'e4',
          ideia:
            'Ocupa o centro e abre as duas peças que você mais precisa: o bispo de f1 e a dama.',
        },
        {
          san: 'e5',
          ideia:
            'O adversário faz o mesmo e disputa o centro de igual para igual. É a resposta mais comum abaixo de 1600.',
        },
        {
          san: 'Nf3',
          ideia: 'Desenvolve atacando o peão de e5. Desenvolver com ameaça ganha tempo de graça.',
        },
        {
          san: 'Nc6',
          ideia: 'Ele defende e5 desenvolvendo. É a defesa natural, e você deve esperá-la.',
        },
        {
          san: 'Bc4',
          ideia:
            'O bispo vai para a diagonal que aponta f7, a casa mais frágil do lado dele porque só o rei a defende.',
        },
        {
          san: 'Bc5',
          ideia: 'Ele espelha a sua ideia e mira f2. A posição é simétrica: ninguém tem vantagem.',
        },
        {
          san: 'd3',
          ideia:
            'Sustenta o peão de e4 e abre o bispo de c1. Lance modesto de propósito: mantém a posição fechada o bastante para você terminar o desenvolvimento sem cálculo pesado.',
        },
        {
          san: 'Nf6',
          ideia:
            'Ele desenvolve o último cavalo e passa a olhar e4. A pressão sobre e4 é o plano dele.',
        },
        {
          san: 'O-O',
          ideia:
            'Rei seguro e torre ativada num lance só. Antes de qualquer plano, o rei sai do centro.',
        },
      ],
    },
    {
      id: 'italiana-dois-cavalos',
      lances: [
        { san: 'e4' },
        { san: 'e5' },
        { san: 'Nf3' },
        { san: 'Nc6' },
        { san: 'Bc4' },
        {
          san: 'Nf6',
          ideia:
            'Em vez de espelhar, ele ataca e4 primeiro. É a Defesa dos Dois Cavalos e é tão comum quanto a outra.',
        },
        {
          san: 'd3',
          ideia:
            'A mesma resposta de sempre: defende e4 e mantém a posição calma. Não caia na tentação de 4.Ng5, que leva a complicações que você ainda não precisa calcular.',
        },
        {
          san: 'Bc5',
          ideia:
            'Ele acaba desenvolvendo o bispo para c5 assim mesmo — e a posição vira a mesma da outra ordem de lances. É transposição: mesma posição, caminho diferente.',
        },
        { san: 'O-O' },
      ],
    },
    {
      id: 'contra-philidor',
      lances: [
        { san: 'e4' },
        { san: 'e5' },
        { san: 'Nf3' },
        {
          san: 'd6',
          ideia:
            'Ele defende e5 com o peão em vez do cavalo. É sólido, mas tranca o próprio bispo de f8.',
        },
        {
          san: 'd4',
          ideia:
            'Contra uma defesa passiva, abra o centro. Você tem mais peças prontas para se beneficiar da abertura das linhas.',
        },
      ],
    },
    {
      id: 'contra-petrov',
      lances: [
        { san: 'e4' },
        { san: 'e5' },
        { san: 'Nf3' },
        {
          san: 'Nf6',
          ideia: 'Ele ignora a ameaça e contra-ataca e4. É a Defesa Petrov, e é resposta séria.',
        },
        {
          san: 'Nxe5',
          ideia: 'Aceite o peão. O cavalo em e5 está seguro por enquanto.',
        },
        {
          san: 'd6',
          ideia: 'Ele expulsa o cavalo antes de recapturar em e4. Esta é a ordem correta dele.',
        },
        {
          san: 'Nf3',
          ideia:
            'Recue. A armadilha aqui é 4.Nxf7, que ganha um peão e entrega o cavalo: depois de 4...Rxf7 as pretas ficam com peça a mais. Recuar não é lance fraco quando a alternativa perde material.',
        },
      ],
    },
  ],
}

/**
 * Pretas: 1...e5 contra 1.e4 e 1...d5 contra 1.d4.
 *
 * A escolha é deliberadamente simétrica à do repertório de brancas: o aluno
 * estuda UMA estrutura e a encontra dos dois lados do tabuleiro. Aprender a
 * Siciliana e o Gambito da Dama ao mesmo tempo dobra o conteúdo e divide o
 * tempo de treino, sem dobrar o entendimento.
 */
export const REPERTORIO_PRETAS: DefinicaoDeRepertorio = {
  id: 'pretas-classico',
  titulo: 'Pretas: 1...e5 e 1...d5',
  lado: 'b',
  principio:
    'Responda ao centro com centro. Você não precisa de uma defesa especial: precisa ' +
    'desenvolver rápido, disputar as casas do meio e rolar o rei antes que as linhas abram.',
  habilidades: ['opening.development', 'opening.center', 'opening.king-safety'],
  linhas: [
    {
      id: 'contra-e4-italiana',
      lances: [
        { san: 'e4', ideia: 'A abertura mais jogada do mundo. Ele ocupa o centro.' },
        {
          san: 'e5',
          ideia:
            'Ocupe o centro também. Enquanto o peão de e5 estiver de pé, ele não consegue montar dois peões no meio.',
        },
        { san: 'Nf3', ideia: 'Ele desenvolve atacando o seu peão de e5.' },
        {
          san: 'Nc6',
          ideia:
            'Defenda desenvolvendo. Sempre que puder resolver uma ameaça com um lance de desenvolvimento, resolva assim.',
        },
        { san: 'Bc4', ideia: 'O bispo dele mira f7, a casa que só o seu rei defende.' },
        {
          san: 'Bc5',
          ideia:
            'Espelhe: o seu bispo mira f2 pelo mesmo motivo. E fique atento a f7 durante toda a abertura.',
        },
      ],
    },
    {
      id: 'contra-e4-espanhola',
      lances: [
        { san: 'e4' },
        { san: 'e5' },
        { san: 'Nf3' },
        { san: 'Nc6' },
        {
          san: 'Bb5',
          ideia:
            'A Espanhola. O bispo prende o cavalo que defende e5 — a ameaça é indireta, não imediata.',
        },
        {
          san: 'a6',
          ideia:
            'Pergunte ao bispo o que ele quer. Se ele capturar em c6, você recupera com o peão e ganha os dois bispos; se recuar, você ganhou espaço de graça.',
        },
      ],
    },
    {
      id: 'contra-e4-escocesa',
      lances: [
        { san: 'e4' },
        { san: 'e5' },
        { san: 'Nf3' },
        { san: 'Nc6' },
        {
          san: 'd4',
          ideia: 'A Escocesa. Ele abre o centro cedo para trocar o seu peão central.',
        },
        {
          san: 'exd4',
          ideia:
            'Capture. Recusar deixaria ele com dois peões no centro e você sem nenhum — é justamente o que ele quer.',
        },
      ],
    },
    {
      id: 'contra-d4-recusado',
      lances: [
        { san: 'd4', ideia: 'A outra abertura que você vai enfrentar toda semana.' },
        {
          san: 'd5',
          ideia: 'Mesma lógica de 1...e5: ocupe o centro e não deixe ele ocupar sozinho.',
        },
        {
          san: 'c4',
          ideia:
            'O Gambito da Dama. Ele oferece um peão de flanco para tirar o seu peão do centro. Não é um gambito de verdade: tentar segurar o peão custa caro.',
        },
        {
          san: 'e6',
          ideia:
            'Sustente d5 com o peão e abra o bispo de f8. Você aceita ficar com o bispo de c8 preso por alguns lances em troca de um centro firme.',
        },
      ],
    },
    {
      id: 'contra-d4-cavalo',
      lances: [
        { san: 'd4' },
        { san: 'd5' },
        { san: 'Nf3', ideia: 'Ele desenvolve antes de decidir a estrutura. Linha calma.' },
        {
          san: 'Nf6',
          ideia:
            'Desenvolva também e controle e4. Nesta posição não há ameaça nenhuma: responda desenvolvimento com desenvolvimento.',
        },
      ],
    },
  ],
}

/** Os dois repertórios iniciais. É a FONTE que o portão de conteúdo varre. */
export const REPERTORIOS_INICIAIS: readonly DefinicaoDeRepertorio[] = [
  REPERTORIO_BRANCAS,
  REPERTORIO_PRETAS,
]
