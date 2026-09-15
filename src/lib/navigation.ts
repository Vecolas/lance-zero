/**
 * Mapa de rotas do app. Fica em `lib` (e não dentro de um componente) para que
 * testes e futuras telas possam consumir a mesma lista.
 */
export interface NavItem {
  /** Rota Next.js. */
  href: string
  /** Rótulo PT-BR mostrado na navegação. */
  label: string
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
    description: 'Seu treino do dia, montado a partir dos seus próprios erros.',
    phase: 5,
    primaryMobile: true,
  },
  {
    href: '/train',
    label: 'Treinar',
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
    description: 'Importe suas partidas e revise primeiro sem a engine.',
    phase: 6,
    primaryMobile: true,
  },
  {
    href: '/openings',
    label: 'Aberturas',
    description: 'Princípios, repertório enxuto e as linhas que você realmente enfrenta.',
    phase: 9,
  },
  {
    href: '/endgames',
    label: 'Finais',
    description: 'Currículo básico de finais com posições treináveis.',
    phase: 8,
  },
  {
    href: '/progress',
    label: 'Progresso',
    description: 'Forças, prioridades e retenção — sem métricas de vaidade.',
    phase: 5,
  },
  {
    href: '/lessons',
    label: 'Biblioteca',
    description: 'Microlições curtas que sempre terminam em recuperação ativa.',
    phase: 10,
  },
]

export const secondaryNav: NavItem[] = [
  {
    href: '/account',
    label: 'Conta',
    description: 'Login, exportação, sincronização e controle dos seus dados.',
    phase: 5,
  },
  {
    href: '/puzzles',
    label: 'Puzzles',
    description: 'Treinador de táticas com dicas graduais e explicação depois da resposta.',
    phase: 3,
  },
  {
    href: '/calculate',
    label: 'Cálculo',
    description: 'Xeques, capturas e ameaças: treino de visualização e candidatos.',
    phase: 4,
  },
  {
    href: '/onboarding',
    label: 'Diagnóstico',
    description: 'Onboarding curto que estima seu ponto de partida.',
    phase: 10,
  },
  {
    href: '/settings',
    label: 'Ajustes',
    description: 'Preferências, dados locais e backup.',
    phase: 4,
  },
]

export const allNav: NavItem[] = [...mainNav, ...secondaryNav]

export const mobilePrimaryNav: NavItem[] = mainNav.filter((item) => item.primaryMobile)
