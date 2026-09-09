/**
 * Linhas de `docs/LICENSES.md` que de propósito NÃO aparecem em `/licenses`.
 *
 * DECISÃO QUE ESTE ARQUIVO CARREGA: a página pública credita o que chega às
 * mãos de quem usa o LanceZero — o que é distribuído no bundle, servido de
 * `public/`, ou consumido como serviço de terceiro em nome da pessoa. Ferramenta
 * que só existe na máquina de quem desenvolve não é distribuída, e listá-la na
 * página pública confundiria em vez de informar.
 *
 * A lista MORDE DOS DOIS LADOS (portão em `tests/unit/licencas-inventario.test.ts`):
 *
 * - id fora daqui tem de estar coberto por uma entrada de `licenses.ts`;
 * - id DENTRO daqui tem de continuar FORA da página pública.
 *
 * Sem a segunda metade, a linha ficaria para sempre cobrindo em silêncio o dia
 * em que alguém adicionasse a entrada — e o portão viraria decoração.
 *
 * Isto NÃO é uma lista de isenção de licença: toda linha aqui continua com
 * pacote, versão, licença, motivo e origem no documento. O que ela declara é
 * apenas onde a informação é publicada.
 */
export const NAO_EXIBIDOS_NA_PAGINA: Record<string, string> = {
  'vitejs-plugin-react': 'Transform de JSX só nos testes; não entra no bundle distribuído.',
  jsdom: 'Ambiente DOM só nos testes; não entra no bundle distribuído.',
  'fake-indexeddb': 'Dublê de IndexedDB só nos testes; não entra no bundle distribuído.',
  'tipos-definitelytyped': 'Pacotes de tipos: apagados na compilação, não existem em runtime.',
  'supabase-agent-skills':
    'Instruções de agente para quem desenvolve. Não é código nem dado do produto.',
}
