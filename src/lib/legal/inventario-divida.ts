/**
 * As listas de dívida dos portões de licença.
 *
 * Cada portão de inventário exige um par: uma linha de um lado, a
 * correspondente do outro. Quando o par não existe de propósito, a exceção mora
 * aqui, com motivo escrito — nunca dentro do portão. Toda lista deste arquivo
 * MORDE DE VOLTA: entrada que já não desculpa nada REPROVA, senão a lista vira
 * depósito e o portão vira decoração.
 *
 * São duas listas com vocabulários diferentes de propósito:
 *
 * - `DEPENDENCIAS_FORA_DO_INVENTARIO` é chaveada pelo **nome npm**, porque o
 *   que ela desculpa é um pacote INSTALADO, e o lockfile só o conhece assim;
 * - `NAO_EXIBIDOS_NA_PAGINA` é chaveada pelo **id do inventário**, porque o que
 *   ela desculpa é uma LINHA de `docs/LICENSES.md`.
 *
 * Nenhuma das duas é isenção de licença. Elas dizem apenas onde a informação
 * mora, nunca que ela pode faltar.
 */

/**
 * Pacotes npm que, de propósito, NÃO têm linha em `docs/LICENSES.md` — ou que
 * têm linha sem serem dependência direta.
 *
 * Válvula de escape do portão em `tests/unit/licencas-instaladas.test.ts`, que
 * parte do `pnpm-lock.yaml` e exige linha no documento para toda dependência
 * direta. Sem a válvula, o portão seria contornado por fora; com ela, contornar
 * deixa rastro escrito.
 *
 * Ela está VAZIA hoje, e esse é o estado desejado: toda dependência direta tem
 * linha no documento. Vazia ela não some — é o que separa "não há exceção" de
 * "não há portão".
 */
export const DEPENDENCIAS_FORA_DO_INVENTARIO: Record<string, string> = {}

/**
 * Linhas de `docs/LICENSES.md` que de propósito NÃO aparecem em `/licenses`.
 *
 * DECISÃO QUE ESTA LISTA CARREGA: a página pública credita o que chega às mãos
 * de quem usa o LanceZero — o que é distribuído no bundle, servido de `public/`,
 * ou consumido como serviço de terceiro em nome da pessoa. Ferramenta que só
 * existe na máquina de quem desenvolve não é distribuída, e listá-la na página
 * pública confundiria em vez de informar.
 *
 * A lista MORDE DOS DOIS LADOS (portão em `tests/unit/licencas-inventario.test.ts`):
 *
 * - id fora daqui tem de estar coberto por uma entrada de `licenses.ts`;
 * - id DENTRO daqui tem de continuar FORA da página pública.
 *
 * Sem a segunda metade, a linha ficaria para sempre cobrindo em silêncio o dia
 * em que alguém adicionasse a entrada.
 *
 * Isto NÃO é uma lista de isenção de licença: toda linha aqui continua com
 * pacote, versão, licença, motivo e origem no documento. O que ela declara é
 * apenas onde a informação é publicada.
 */
export const NAO_EXIBIDOS_NA_PAGINA: Record<string, string> = {
  'vitejs-plugin-react': 'Transform de JSX só nos testes; não entra no bundle distribuído.',
  jsdom: 'Ambiente DOM só nos testes; não entra no bundle distribuído.',
  'fake-indexeddb': 'Dublê de IndexedDB só nos testes; não entra no bundle distribuído.',
  'types-node': 'Pacote de tipos: apagado na compilação, não existe em runtime.',
  'types-react': 'Pacote de tipos: apagado na compilação, não existe em runtime.',
  'types-react-dom': 'Pacote de tipos: apagado na compilação, não existe em runtime.',
  pnpm: 'Gerenciador de pacotes; roda na máquina de quem desenvolve e não é distribuído.',
  'supabase-agent-skills':
    'Instruções de agente para quem desenvolve. Não é código nem dado do produto.',
}
