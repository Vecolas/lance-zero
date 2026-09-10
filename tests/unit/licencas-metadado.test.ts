import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { lerInventarioDoDocumento } from '@/lib/legal/inventario-doc'
import { lerDependenciasDiretas } from '@/lib/legal/inventario-lockfile'
import {
  conferirLicencasDeclaradas,
  GRUPOS_FORA_DO_NODE_MODULES,
  type MetadadoDoPacote,
  type ProblemaDeLicenca,
  type TipoDeProblemaDeLicenca,
} from '@/lib/legal/inventario-licenca-real'

/**
 * Portão entre a licença que o projeto DECLARA e a que o pacote AFIRMA.
 *
 * Os outros dois portões de licença cruzam fontes do próprio projeto: o do `ID`
 * cruza `docs/LICENSES.md` com `licenses.ts`, e o das instaladas cruza o
 * `pnpm-lock.yaml` com o documento. Nenhum dos dois abre o pacote. Se as fontes
 * do projeto concordarem em "MIT" para algo que é GPL, as duas ficam verdes
 * (issue #59, item 1).
 *
 * Este portão é o único que lê o `node_modules`, e lê porque não há alternativa:
 * o lockfile guarda integridade e versão, nunca licença. A dependência da
 * instalação local é o preço, e ela NÃO é paga com tolerância — pacote que não
 * está no disco REPROVA, com a mensagem de rodar `pnpm install`. Um portão que
 * se cala quando não acha o que conferir é falso verde.
 *
 * O QUE ESTE PORTÃO NÃO PROVA:
 *
 * - que a licença é COMPATÍVEL com o projeto. Ele compara dois textos SPDX;
 *   julgar compatibilidade é decisão humana e mora em ADR;
 * - nada sobre dependências transitivas — mesmo critério de corte do portão das
 *   instaladas;
 * - nada sobre o `pnpm`, que se instala fora do `node_modules` do projeto. Isso
 *   está nomeado em `GRUPOS_FORA_DO_NODE_MODULES`, não pulado em silêncio;
 * - nada sobre licenças de dado aberto e de API de terceiro, que não são
 *   pacotes npm e não têm `package.json` para conferir.
 */

const RAIZ = process.cwd()

function lerLockfileReal() {
  return lerDependenciasDiretas(readFileSync(join(RAIZ, 'pnpm-lock.yaml'), 'utf8'))
}

function lerDocumentoReal() {
  return lerInventarioDoDocumento(readFileSync(join(RAIZ, 'docs/LICENSES.md'), 'utf8'))
}

/**
 * Lê o `package.json` de cada dependência direta. Ausência não é tratada aqui:
 * quem decide se ela importa é o cruzamento, que sabe quais grupos estão fora
 * do alcance.
 */
function lerMetadadosDoDisco(nomes: string[]): Map<string, MetadadoDoPacote> {
  const metadados = new Map<string, MetadadoDoPacote>()
  for (const nome of nomes) {
    try {
      const bruto = readFileSync(join(RAIZ, 'node_modules', nome, 'package.json'), 'utf8')
      metadados.set(nome, { licenca: (JSON.parse(bruto) as { license?: unknown }).license })
    } catch {
      // Ausente de propósito: o cruzamento reprova por `pacote-nao-encontrado`.
    }
  }
  return metadados
}

function tipos(problemas: ProblemaDeLicenca[]): TipoDeProblemaDeLicenca[] {
  return problemas.map((p) => p.tipo)
}

function descrever(problemas: ProblemaDeLicenca[]): string {
  return problemas.map((p) => `[${p.tipo}] ${p.mensagem}`).join('\n')
}

describe('a licença declarada bate com a que o pacote afirma', () => {
  const lockfile = lerLockfileReal()
  const documento = lerDocumentoReal()
  const metadados = lerMetadadosDoDisco(lockfile.diretas.map((d) => d.nome))

  it('há metadado de pacote para conferir', () => {
    expect(metadados.size).toBeGreaterThan(0)
  })

  it('nenhuma licença do documento diverge do pacote', () => {
    const problemas = conferirLicencasDeclaradas({ lockfile, documento, metadados })
    expect(problemas, `\n${descrever(problemas)}\n`).toEqual([])
  })

  it('todo grupo fora do alcance tem motivo escrito', () => {
    const semMotivo = Object.entries(GRUPOS_FORA_DO_NODE_MODULES)
      .filter(([, motivo]) => motivo.trim().length === 0)
      .map(([grupo]) => grupo)
    expect(semMotivo).toEqual([])
  })

  it('todo grupo fora do alcance existe mesmo no lockfile', () => {
    // Sem isto, a lista sobreviveria ao grupo que a justificou e passaria a
    // cobrir em silêncio um grupo que ninguém mais usa.
    const gruposDoLockfile = new Set(lockfile.diretas.map((d) => d.grupo))
    const fantasmas = Object.keys(GRUPOS_FORA_DO_NODE_MODULES).filter(
      (grupo) => !gruposDoLockfile.has(grupo),
    )
    expect(fantasmas).toEqual([])
  })
})

/**
 * Canários: o portão alimentado com casos que DEVEM reprovar.
 */
describe('o portão morde', () => {
  const lockfileMinimo = [
    "lockfileVersion: '9.0'",
    '',
    'importers:',
    '',
    '  .:',
    '    dependencies:',
    '      next:',
    '        specifier: 16.3.4',
    '        version: 16.3.4',
    '    devDependencies:',
    '      typescript:',
    '        specifier: 5.9.3',
    '        version: 5.9.3',
  ].join('\n')

  const documentoMinimo = [
    '## Em uso',
    '',
    '| ID           | Pacote       | Versão | Licença    | Fonte                  |',
    '| ------------ | ------------ | ------ | ---------- | ---------------------- |',
    '| `next`       | `next`       | 16.3.4 | MIT        | https://next.dev       |',
    '| `typescript` | `typescript` | 5.9.3  | Apache-2.0 | https://typescript.dev |',
  ].join('\n')

  function conferir(metadados: Record<string, unknown>, doc = documentoMinimo) {
    return conferirLicencasDeclaradas({
      lockfile: lerDependenciasDiretas(lockfileMinimo),
      documento: lerInventarioDoDocumento(doc),
      metadados: new Map(Object.entries(metadados).map(([nome, licenca]) => [nome, { licenca }])),
    })
  }

  const metadadosCertos = { next: 'MIT', typescript: 'Apache-2.0' }

  it('o caso de controle passa', () => {
    const problemas = conferir(metadadosCertos)
    expect(problemas, descrever(problemas)).toEqual([])
  })

  it('licença do documento diferente da do pacote reprova', () => {
    const problemas = conferir({ ...metadadosCertos, next: 'GPL-3.0' })
    expect(tipos(problemas)).toEqual(['licenca-divergente'])
    expect(problemas[0].pacote).toBe('next')
  })

  it('diferença só de caixa passa — reprovar por caixa seria reprovar o certo', () => {
    const problemas = conferir({ next: 'mit', typescript: 'APACHE-2.0' })
    expect(problemas, descrever(problemas)).toEqual([])
  })

  it('pacote sem metadado no disco reprova', () => {
    const problemas = conferir({ next: 'MIT' })
    expect(tipos(problemas)).toEqual(['pacote-nao-encontrado'])
    expect(problemas[0].pacote).toBe('typescript')
  })

  it('campo license ausente reprova', () => {
    const problemas = conferir({ ...metadadosCertos, typescript: undefined })
    expect(tipos(problemas)).toEqual(['licenca-do-pacote-ilegivel'])
    expect(problemas[0].pacote).toBe('typescript')
  })

  it('campo license que não é texto reprova', () => {
    // Formato antigo do npm: `license: { type, url }`.
    const problemas = conferir({ ...metadadosCertos, typescript: { type: 'Apache-2.0' } })
    expect(tipos(problemas)).toEqual(['licenca-do-pacote-ilegivel'])
  })

  it('nenhuma licença conferida reprova, não aprova', () => {
    // Documento sem nenhuma linha de pacote npm: há metadado, mas nada com que
    // compará-lo. Sem esta afirmação, apagar a tabela imprimiria "tudo certo".
    const semPacotes = [
      '## Dados',
      '',
      '| ID                  | Pacote                  | Versão | Licença | Fonte               |',
      '| ------------------- | ----------------------- | ------ | ------- | ------------------- |',
      '| `lichess-puzzle-db` | Lichess puzzle database | 2026   | CC0-1.0 | https://lichess.org |',
    ].join('\n')
    const problemas = conferir(metadadosCertos, semPacotes)
    expect(tipos(problemas)).toEqual(['nada-a-conferir'])
  })
})
