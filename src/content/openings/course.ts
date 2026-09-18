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
        lance: 'Bb4',
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

export const OPENING_COURSES: readonly OpeningDefinition[] = [
  italian,
  scotch,
  london,
  caroKann,
  qgd,
  slav,
  ruyLopez,
  french,
]
export const OPENING_COURSE_BY_SLUG = new Map(
  OPENING_COURSES.map((opening) => [opening.slug, opening]),
)
