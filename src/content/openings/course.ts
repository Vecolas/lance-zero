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
      id: 'italiana-giuoco-piano',
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
      id: 'caro-classica',
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
      id: 'caro-bispo',
      name: 'Libertar o bispo',
      positionNodeId: 'root',
      positionPly: 5,
      objective: 'Colocar o bispo de c8 fora da cadeia de peões.',
      when: 'Antes de jogar e6 em posições em que o bispo ficaria preso.',
      risk: 'Ficar passivo e sem desenvolvimento.',
      arrows: [{ from: 'c8', to: 'f5' }],
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
      id: 'qgd-troca',
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
      id: 'qgd-c5',
      name: 'Ruptura c5',
      positionNodeId: 'root',
      positionPly: 3,
      objective: 'Questionar a cadeia branca e buscar liberdade.',
      when: 'Após desenvolvimento e rei seguro.',
      risk: 'Abrir linhas sem terminar o desenvolvimento.',
      arrows: [{ from: 'c7', to: 'c5' }],
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
      id: 'escocesa-schmidt',
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
      id: 'escocesa-atividade',
      name: 'Atividade no centro',
      positionNodeId: 'root',
      positionPly: 4,
      objective: 'Usar linhas abertas para desenvolver com tempo.',
      when: 'Quando a troca central abriu diagonais.',
      risk: 'Sacrificar desenvolvimento por um peão.',
      arrows: [{ from: 'd2', to: 'd4' }],
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
      id: 'londres-bf5',
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
      id: 'london-e4',
      name: 'Ruptura e4',
      positionNodeId: 'root',
      positionPly: 6,
      objective: 'Expandir no centro quando as peças estão prontas.',
      when: 'Após o roque e desenvolvimento.',
      risk: 'Fechar o bispo sem necessidade.',
      arrows: [{ from: 'e2', to: 'e4' }],
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
      id: 'eslava-troca',
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
      id: 'slava-bispo',
      name: 'Bispo fora da cadeia',
      positionNodeId: 'root',
      positionPly: 5,
      objective: 'Desenvolver o bispo antes de e6.',
      when: 'Quando a estrutura permite Af5 ou Ag4.',
      risk: 'Deixar a dama sair cedo para defender peões.',
      arrows: [{ from: 'c8', to: 'f5' }],
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

export const OPENING_COURSES: readonly OpeningDefinition[] = [
  italian,
  scotch,
  london,
  caroKann,
  qgd,
  slav,
]
export const OPENING_COURSE_BY_SLUG = new Map(
  OPENING_COURSES.map((opening) => [opening.slug, opening]),
)
