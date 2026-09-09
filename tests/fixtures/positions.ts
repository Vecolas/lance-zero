/** Posições de borda usadas pelos testes do domínio de xadrez. */
export const positions = {
  inicial: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',

  /** Brancas podem capturar en passant em d6. */
  enPassant: 'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3',

  /** Peão branco em b7 pronto para promover. */
  promocao: '6k1/1P6/8/8/8/8/6K1/8 w - - 0 1',

  /** Brancas com direito de roque dos dois lados, caminho livre. */
  roqueLivre: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',

  /** Bispo em b4 dá xeque em e1: o roque fica indisponível. */
  roqueEmXeque: 'r3k2r/pppp1ppp/8/8/1b6/8/PPP2PPP/R3K2R w KQkq - 0 1',

  /** Mate em 1: Qxf7#. */
  mateEmUm: 'rnbqkbnr/pppp1ppp/8/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1',

  /** Rei preto afogado: pretas no lance, sem lance legal e sem xeque. */
  afogamento: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1',

  /** Só os dois reis. */
  materialInsuficiente: '8/8/4k3/8/8/4K3/8/8 w - - 0 1',
} as const
