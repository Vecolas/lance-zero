import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  cruzarInventarios,
  type EntradaPublica,
  type ProblemaDeInventario,
  type TipoDeProblema,
} from '@/lib/legal/inventario-cruzamento'
import { lerInventarioDoDocumento } from '@/lib/legal/inventario-doc'
import { NAO_EXIBIDOS_NA_PAGINA } from '@/lib/legal/inventario-divida'
import { plannedDependencies, runtimeDependencies } from '@/lib/legal/licenses'

/**
 * Portão entre os dois inventários de licença.
 *
 * A mesma verdade mora em `docs/LICENSES.md` (a tabela completa, com versão
 * exata e fase prevista) e em `src/lib/legal/licenses.ts` (o recorte que a
 * página pública `/licenses` mostra). Nada cruzava os dois, e eles já
 * divergiram: a API de tablebase da Lichess ficou só no documento, e a fonte
 * que o app EXIBE AO PÚBLICO era a incompleta.
 *
 * COMO SE CRUZA — a decisão que veio antes do teste:
 *
 * Não dá para cruzar por nome: os dois lados chamam a mesma coisa de nomes
 * diferentes de propósito (`next` no documento, `Next.js` na página, porque a
 * página fala com gente e o documento fala com o `package.json`). Também não dá
 * para cruzar por URL: três linhas apontam para `https://lichess.org/api`
 * (partidas, tablebase, opening explorer) e a URL não as distingue.
 *
 * Então cada linha ganhou um **id estável**: coluna `ID` no documento, campo
 * `ids` em `licenses.ts`. `ids` é lista porque uma entrada pública pode cobrir
 * várias linhas do inventário — `react` e `react-dom` são duas linhas de
 * `package.json` e uma linha só na página.
 *
 * O portão varre a FONTE (o documento inteiro, não uma lista escrita à mão) e
 * morde dos TRÊS lados:
 *
 * 1. linha do documento tem de estar na página OU em `NAO_EXIBIDOS_NA_PAGINA`;
 * 2. entrada da página tem de ter linha no documento — afirmação pública de
 *    licença sem inventário é afirmação que ninguém revisou;
 * 3. id na lista de dívida tem de continuar FORA da página. Sem esta terceira
 *    metade, a linha cobriria em silêncio o dia em que alguém adicionasse a
 *    entrada, e o portão viraria decoração.
 *
 * O QUE ESTE PORTÃO NÃO PROVA: que a licença declarada está CORRETA, que a
 * versão do documento bate com a do `pnpm-lock.yaml`, e que toda dependência
 * instalada tem linha no documento. Ele cruza os dois inventários entre si —
 * uma dependência que não entrou em nenhum dos dois continua invisível aqui.
 */

const DOCUMENTO = join(process.cwd(), 'docs/LICENSES.md')

function lerDocumento() {
  return lerInventarioDoDocumento(readFileSync(DOCUMENTO, 'utf8'))
}

function comoEntradasPublicas(deps: typeof runtimeDependencies): EntradaPublica[] {
  return deps.map((d) => ({ name: d.name, ids: d.ids }))
}

const paginaReal = comoEntradasPublicas([...runtimeDependencies, ...plannedDependencies])

function tipos(problemas: ProblemaDeInventario[]): TipoDeProblema[] {
  return problemas.map((p) => p.tipo)
}

function descrever(problemas: ProblemaDeInventario[]): string {
  return problemas.map((p) => `[${p.tipo}] ${p.mensagem}`).join('\n')
}

describe('leitura de docs/LICENSES.md', () => {
  const documento = lerDocumento()

  // Regra 3 dos portões: varredura que não varreu nada não é aprovação.
  // Sem estas duas afirmações, apagar a tabela imprimiria "tudo certo".
  it('a varredura encontrou tabelas de inventário', () => {
    expect(documento.tabelas.length).toBeGreaterThan(0)
  })

  it('a varredura encontrou linhas de inventário', () => {
    expect(documento.entradas.length).toBeGreaterThan(0)
  })

  it('toda tabela do documento tem coluna ID', () => {
    const semId = documento.tabelas.filter((t) => !t.temColunaId)
    expect(semId.map((t) => `${t.secao} (linha ${t.linha})`)).toEqual([])
  })

  it('nenhuma linha lida ficou sem id', () => {
    const semId = documento.entradas.filter((e) => e.id.length === 0)
    expect(semId.map((e) => `linha ${e.linha}: ${e.pacote}`)).toEqual([])
  })

  it('a leitura preserva o conteúdo da linha, sem a marcação do markdown', () => {
    const stockfish = documento.entradas.find((e) => e.id === 'stockfish-js')
    expect(stockfish).toBeDefined()
    // O documento escreve **GPL-3.0** em negrito; o id e a licença saem limpos.
    expect(stockfish?.licenca).toBe('GPL-3.0')
    expect(stockfish?.fonte).toBe('https://github.com/nmrugg/stockfish.js')
  })
})

describe('cruzamento entre o documento e a página pública', () => {
  const documento = lerDocumento()

  it('há o que cruzar dos dois lados', () => {
    expect(documento.entradas.length).toBeGreaterThan(0)
    expect(paginaReal.length).toBeGreaterThan(0)
  })

  it('toda entrada da página declara pelo menos um id', () => {
    const semId = paginaReal.filter((e) => e.ids.length === 0)
    expect(semId.map((e) => e.name)).toEqual([])
  })

  it('os dois inventários batem', () => {
    const problemas = cruzarInventarios({
      documento,
      pagina: paginaReal,
      divida: NAO_EXIBIDOS_NA_PAGINA,
    })
    expect(problemas, `\n${descrever(problemas)}\n`).toEqual([])
  })

  it('toda linha de dívida tem motivo escrito', () => {
    const semMotivo = Object.entries(NAO_EXIBIDOS_NA_PAGINA)
      .filter(([, motivo]) => motivo.trim().length === 0)
      .map(([id]) => id)
    expect(semMotivo).toEqual([])
  })
})

/**
 * Canários: o portão alimentado com casos que DEVEM reprovar.
 *
 * Um portão que só foi visto passando é um carimbo. Cada caso aqui é a mesma
 * quebra que se faria à mão nos arquivos reais, em miniatura e sem sujar a
 * árvore.
 */
describe('o portão morde', () => {
  const documentoMinimo = [
    '## Em uso',
    '',
    '| ID     | Pacote  | Licença | Fonte             |',
    '| ------ | ------- | ------- | ----------------- |',
    '| `next` | `next`  | MIT     | https://next.dev  |',
    '| `zod`  | `zod`   | MIT     | https://zod.dev   |',
  ].join('\n')

  const paginaMinima: EntradaPublica[] = [
    { name: 'Next.js', ids: ['next'] },
    { name: 'Zod', ids: ['zod'] },
  ]

  it('o caso de controle passa', () => {
    const problemas = cruzarInventarios({
      documento: lerInventarioDoDocumento(documentoMinimo),
      pagina: paginaMinima,
      divida: {},
    })
    expect(problemas, descrever(problemas)).toEqual([])
  })

  it('(a) dependência só no documento reprova', () => {
    const problemas = cruzarInventarios({
      documento: lerInventarioDoDocumento(
        `${documentoMinimo}\n| \`sharp\` | \`sharp\` | Apache-2.0 | https://sharp.dev |`,
      ),
      pagina: paginaMinima,
      divida: {},
    })
    expect(tipos(problemas)).toEqual(['fora-da-pagina-e-fora-da-divida'])
    expect(problemas[0].id).toBe('sharp')
  })

  it('(a) a mesma dependência declarada como dívida passa', () => {
    const problemas = cruzarInventarios({
      documento: lerInventarioDoDocumento(
        `${documentoMinimo}\n| \`sharp\` | \`sharp\` | Apache-2.0 | https://sharp.dev |`,
      ),
      pagina: paginaMinima,
      divida: { sharp: 'só no pipeline de build de imagem, não vai para o bundle' },
    })
    expect(problemas).toEqual([])
  })

  it('(b) dependência só na página pública reprova', () => {
    const problemas = cruzarInventarios({
      documento: lerInventarioDoDocumento(documentoMinimo),
      pagina: [...paginaMinima, { name: 'Alguma lib', ids: ['alguma-lib'] }],
      divida: {},
    })
    expect(tipos(problemas)).toEqual(['na-pagina-e-fora-do-inventario'])
    expect(problemas[0].id).toBe('alguma-lib')
  })

  it('(c) id na dívida que a página mostra reprova', () => {
    const problemas = cruzarInventarios({
      documento: lerInventarioDoDocumento(documentoMinimo),
      pagina: paginaMinima,
      divida: { zod: 'motivo qualquer' },
    })
    expect(tipos(problemas)).toEqual(['divida-que-a-pagina-ja-mostra'])
    expect(problemas[0].id).toBe('zod')
  })

  it('(d) tabela vazia reprova, não aprova', () => {
    const soCabecalho = documentoMinimo.split('\n').slice(0, 4).join('\n')
    const problemas = cruzarInventarios({
      documento: lerInventarioDoDocumento(soCabecalho),
      pagina: paginaMinima,
      divida: {},
    })
    expect(tipos(problemas)).toContain('inventario-vazio')
  })

  it('documento sem nenhuma tabela reprova', () => {
    const problemas = cruzarInventarios({
      documento: lerInventarioDoDocumento('# LICENSES\n\nnada aqui.\n'),
      pagina: paginaMinima,
      divida: {},
    })
    expect(tipos(problemas)).toContain('documento-sem-tabela')
  })

  it('página vazia reprova', () => {
    const problemas = cruzarInventarios({
      documento: lerInventarioDoDocumento(documentoMinimo),
      pagina: [],
      divida: {},
    })
    expect(tipos(problemas)).toContain('pagina-vazia')
  })

  it('tabela sem coluna ID reprova em vez de ser pulada', () => {
    const semColunaId = [
      documentoMinimo,
      '',
      '## Outra',
      '',
      '| Pacote | Licença |',
      '| ------ | ------- |',
      '| `oops` | MIT     |',
    ].join('\n')
    const problemas = cruzarInventarios({
      documento: lerInventarioDoDocumento(semColunaId),
      pagina: paginaMinima,
      divida: {},
    })
    expect(tipos(problemas)).toEqual(['tabela-sem-coluna-id'])
  })

  it('dívida de algo que não está no inventário reprova', () => {
    const problemas = cruzarInventarios({
      documento: lerInventarioDoDocumento(documentoMinimo),
      pagina: paginaMinima,
      divida: { fantasma: 'saiu do projeto e ninguém tirou a linha' },
    })
    expect(tipos(problemas)).toEqual(['divida-fantasma'])
  })

  it('dívida sem motivo reprova', () => {
    const problemas = cruzarInventarios({
      documento: lerInventarioDoDocumento(
        `${documentoMinimo}\n| \`sharp\` | \`sharp\` | Apache-2.0 | https://sharp.dev |`,
      ),
      pagina: paginaMinima,
      divida: { sharp: '   ' },
    })
    expect(tipos(problemas)).toEqual(['divida-sem-motivo'])
  })

  it('id repetido no documento reprova', () => {
    const problemas = cruzarInventarios({
      documento: lerInventarioDoDocumento(
        `${documentoMinimo}\n| \`zod\` | \`zod-outro\` | MIT | https://zod.dev |`,
      ),
      pagina: paginaMinima,
      divida: {},
    })
    expect(tipos(problemas)).toEqual(['id-repetido-no-documento'])
  })

  it('id reivindicado por duas entradas da página reprova', () => {
    const problemas = cruzarInventarios({
      documento: lerInventarioDoDocumento(documentoMinimo),
      pagina: [...paginaMinima, { name: 'Zod de novo', ids: ['zod'] }],
      divida: {},
    })
    expect(tipos(problemas)).toEqual(['id-repetido-na-pagina'])
  })

  it('id fora do formato reprova', () => {
    const problemas = cruzarInventarios({
      documento: lerInventarioDoDocumento(
        `${documentoMinimo}\n| Sharp Imagens | \`sharp\` | Apache-2.0 | https://sharp.dev |`,
      ),
      pagina: paginaMinima,
      divida: {},
    })
    expect(tipos(problemas)).toEqual(['id-fora-do-formato'])
  })

  it('entrada da página sem id declarado reprova', () => {
    const problemas = cruzarInventarios({
      documento: lerInventarioDoDocumento(documentoMinimo),
      pagina: [...paginaMinima, { name: 'Sem id', ids: [] }],
      divida: {},
    })
    expect(tipos(problemas)).toEqual(['entrada-publica-sem-id'])
  })
})
