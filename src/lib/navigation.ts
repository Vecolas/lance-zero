import type { ChaveDeMensagem } from '@/lib/i18n/mensagens'

/**
 * Mapa de rotas do app. Fica em `lib` (e não dentro de um componente) para que
 * testes e futuras telas possam consumir a mesma lista.
 */
export interface NavItem {
  /** Rota Next.js. */
  href: string
  /**
   * Rótulo PT-BR. Continua aqui porque é a fonte do texto e o que os testes de
   * catálogo leem; quem MOSTRA usa `labelKey`, que é traduzido.
   */
  label: string
  /**
   * A chave de tradução do rótulo.
   *
   * DUAS COLUNAS E NÃO UMA: apagar `label` e deixar só a chave tiraria do
   * catálogo a única forma de ler o texto sem carregar o dicionário — e é isso
   * que o portão de rotas faz. A chave é a que aparece na tela.
   */
  labelKey: ChaveDeMensagem
  /** Frase curta usada em estados vazios e na landing. */
  description: string
  /** Fase do roadmap que entrega a tela de verdade. */
  phase: number
  /** Aparece na bottom navigation do mobile. */
  primaryMobile?: boolean
}

export const HOME_ROUTE = '/dashboard'

export const mainNav: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Hoje',
    labelKey: 'navigation.today',
    description: 'Seu treino do dia, montado a partir dos seus próprios erros.',
    phase: 5,
    primaryMobile: true,
  },
  {
    href: '/train',
    label: 'Treinar',
    labelKey: 'navigation.training',
    // "Sessão só" descrevia o desenho antigo, em que abrir a aba já jogava o
    // aluno numa posição. Agora são quatro coisas com nomes diferentes, e a
    // descrição precisa dizer isso — ela aparece na landing e nos estados
    // vazios, que é onde o aluno forma a expectativa antes de clicar.
    description: 'Aprender, praticar, revisar e analisar — cada coisa com o seu nome.',
    phase: 5,
    primaryMobile: true,
  },
  {
    href: '/games',
    label: 'Partidas',
    labelKey: 'navigation.games',
    description: 'Importe suas partidas e revise primeiro sem a engine.',
    phase: 6,
    primaryMobile: true,
  },
  {
    href: '/aberturas',
    label: 'Aberturas',
    labelKey: 'navigation.openings',
    description: 'Ideias, planos, variações e treino de aberturas no tabuleiro.',
    phase: 9,
  },
  {
    href: '/finais',
    label: 'Finais',
    labelKey: 'navigation.endgames',
    description: 'Reconheça princípios, pratique posições variadas e converta finais.',
    phase: 8,
  },
  {
    href: '/roadmap',
    label: 'Roadmap',
    labelKey: 'navigation.roadmap',
    description: 'Forças, prioridades e retenção — sem métricas de vaidade.',
    phase: 5,
  },
  {
    href: '/lessons',
    label: 'Biblioteca',
    labelKey: 'navigation.library',
    description: 'Microlições curtas que sempre terminam em recuperação ativa.',
    phase: 10,
  },
]

export const secondaryNav: NavItem[] = [
  {
    href: '/account',
    label: 'Conta',
    labelKey: 'navigation.account',
    description: 'Login, exportação, sincronização e controle dos seus dados.',
    phase: 5,
  },
  {
    href: '/puzzles',
    label: 'Puzzles',
    labelKey: 'navigation.puzzles',
    description: 'Treinador de táticas com dicas graduais e explicação depois da resposta.',
    phase: 3,
  },
  {
    href: '/calculate',
    label: 'Cálculo',
    labelKey: 'navigation.calculate',
    description: 'Xeques, capturas e ameaças: treino de visualização e candidatos.',
    phase: 4,
  },
  {
    href: '/onboarding',
    label: 'Diagnóstico',
    labelKey: 'navigation.diagnostic',
    description: 'Onboarding curto que estima seu ponto de partida.',
    phase: 10,
  },
  {
    href: '/settings',
    label: 'Ajustes',
    labelKey: 'navigation.settings',
    description: 'Preferências, dados locais e backup.',
    phase: 4,
  },
]

export const allNav: NavItem[] = [...mainNav, ...secondaryNav]

export const mobilePrimaryNav: NavItem[] = mainNav.filter((item) => item.primaryMobile)
