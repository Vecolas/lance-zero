import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { lerInventarioDoDocumento } from '@/lib/legal/inventario-doc'
import {
  IMPORTADOR_RAIZ,
  lerDependenciasDiretas,
  versaoSemPeers,
} from '@/lib/legal/inventario-lockfile'
import {
  cruzarInstaladasComInventario,
  nomesNpmDaCelula,
  type ProblemaDeInstalada,
  type TipoDeProblemaInstalado,
} from '@/lib/legal/inventario-instalado'
import { DEPENDENCIAS_FORA_DO_INVENTARIO } from '@/lib/legal/inventario-divida'

/**
 * Portão entre o que está INSTALADO e o que está inventariado.
 *
 * O portão irmão (`licencas-inventario.test.ts`) cruza `docs/LICENSES.md` com
 * `src/lib/legal/licenses.ts`. Ele prova que as duas listas concordam — e não
 * prova nada sobre a dependência que nunca entrou em nenhuma das duas. Uma
 * verificação que percorre "o que está na lista" nunca acusa o que nunca entrou
 * nela, e é exatamente assim que uma dependência nova entra sem ninguém reparar
 * (issue #59).
 *
 * Este portão parte da FONTE do que está instalado — o `pnpm-lock.yaml`, que é
 * versionado e igual para todo mundo — e exige o caminho de volta até o
 * documento. Ele NÃO lê `node_modules`: um portão que dependesse da instalação
 * local reprovaria por cache diferente, e não por defeito.
 *
 * CRITÉRIO DE CORTE, decidido depois de medir: **dependência direta**. No
 * lockfile de hoje são 537 pacotes resolvidos, cerca de 113 nomes só no fecho
 * transitivo das dependências de produção, e 25 diretas. Lista de dívida com
 * centenas de nomes transitivos é formulário, não portão. A direta é a que
 * alguém escolheu, e é a que muda quando se roda `pnpm add`.
 *
 * O portão morde dos TRÊS lados:
 *
 * 1. dependência direta do lockfile tem de ter linha no documento — ou entrada
 *    em `DEPENDENCIAS_FORA_DO_INVENTARIO` com motivo escrito;
 * 2. linha do documento que nomeia um pacote npm tem de ser dependência direta
 *    — senão a dependência saiu do projeto e a linha ficou para trás;
 * 3. entrada de dívida que já não desculpa nada REPROVA, senão a lista cobre em
 *    silêncio o dia em que o caso voltar.
 *
 * E a versão do documento é conferida contra a versão RESOLVIDA do lockfile,
 * nunca contra um número cravado aqui.
 *
 * O QUE ESTE PORTÃO NÃO PROVA:
 *
 * - que a licença escrita no documento é a que o pacote realmente declara. O
 *   lockfile não carrega metadado de licença; essa conferência é o portão
 *   `licencas-metadado.test.ts`, separado porque precisa do `node_modules`;
 * - nada sobre dependências transitivas, por escolha de critério;
 * - nada sobre linhas do documento que não nomeiam pacote npm — dado aberto e
 *   API de terceiro estão fora do alcance dele por construção;
 * - nada sobre importadores além da raiz. Se um aparecer, o portão reprova em
 *   vez de ignorar.
 */

const RAIZ = process.cwd()

function lerLockfileReal() {
  return lerDependenciasDiretas(readFileSync(join(RAIZ, 'pnpm-lock.yaml'), 'utf8'))
}

function lerDocumentoReal() {
  return lerInventarioDoDocumento(readFileSync(join(RAIZ, 'docs/LICENSES.md'), 'utf8'))
}

function tipos(problemas: ProblemaDeInstalada[]): TipoDeProblemaInstalado[] {
  return problemas.map((p) => p.tipo)
}

function descrever(problemas: ProblemaDeInstalada[]): string {
  return problemas.map((p) => `[${p.tipo}] ${p.mensagem}`).join('\n')
}

describe('leitura do pnpm-lock.yaml', () => {
  const lockfile = lerLockfileReal()

  // Varredura que não varreu nada não é aprovação. Sem esta afirmação, uma
  // mudança de formato do lockfile faria o portão imprimir "tudo certo".
  it('a varredura encontrou dependências diretas', () => {
    expect(lockfile.diretas.length).toBeGreaterThan(0)
  })

  it('o importador raiz existe no lockfile', () => {
    expect(lockfile.importadoresVistos).toContain(IMPORTADOR_RAIZ)
  })

  it('as dependências lidas cobrem produção e desenvolvimento', () => {
    expect(lockfile.gruposVistos).toContain('dependencies')
    expect(lockfile.gruposVistos).toContain('devDependencies')
  })

  it('toda dependência lida tem nome, grupo e versão resolvida', () => {
    const incompletas = lockfile.diretas.filter(
      (d) => d.nome.length === 0 || d.grupo.length === 0 || d.versaoResolvida.length === 0,
    )
    expect(incompletas.map((d) => `linha ${d.linha}: ${d.nome}`)).toEqual([])
  })

  it('nenhuma versão resolvida carrega o sufixo de peers do pnpm', () => {
    const comSufixo = lockfile.diretas.filter((d) => d.versaoResolvida.includes('('))
    expect(comSufixo.map((d) => `${d.nome}: ${d.versaoResolvida}`)).toEqual([])
  })

  it('a versão resolvida é lida do lockfile, não da faixa pedida', () => {
    // O `package.json` pede `@testing-library/user-event` por faixa (`^…`). O
    // que o inventário precisa declarar é a versão que ficou instalada, e é
    // essa que o portão confere. A regra é afirmada sem cravar o número: basta
    // que exista uma faixa e que ela tenha virado versão exata.
    const porFaixa = lockfile.diretas.filter((d) => /^[\^~]/.test(d.especificador))
    expect(porFaixa.length).toBeGreaterThan(0)
    for (const dependencia of porFaixa) {
      expect(dependencia.versaoResolvida).not.toMatch(/^[\^~]/)
      expect(dependencia.versaoResolvida).toMatch(/^\d+\.\d+\.\d+/)
    }
  })

  it('o lockfile do gerenciador de pacotes também é lido', () => {
    // O pnpm grava dois documentos YAML no mesmo arquivo: o do próprio
    // gerenciador e o do projeto. Ler só o primeiro deixaria 24 dependências
    // invisíveis; ler só o segundo deixaria o pnpm invisível.
    expect(lockfile.documentos).toBeGreaterThan(1)
    expect(lockfile.gruposVistos).toContain('packageManagerDependencies')
  })
})

describe('a coluna Pacote do documento vira nome npm', () => {
  it('reconhece nome simples, com ponto e com escopo', () => {
    expect(nomesNpmDaCelula('next')).toEqual(['next'])
    expect(nomesNpmDaCelula('chess.js')).toEqual(['chess.js'])
    expect(nomesNpmDaCelula('@testing-library/user-event')).toEqual(['@testing-library/user-event'])
  })

  it('separa vários pacotes na mesma célula', () => {
    expect(nomesNpmDaCelula('@types/node, @types/react')).toEqual(['@types/node', '@types/react'])
  })

  it('descarta o que não é pacote npm', () => {
    // As três formas que o documento usa para o que não vem do npm.
    expect(nomesNpmDaCelula('Lichess puzzle database')).toEqual([])
    expect(nomesNpmDaCelula('Inter (via next/font/google)')).toEqual([])
    expect(nomesNpmDaCelula('lichess-org/chess-openings')).toEqual([])
  })

  it('o Stockfish, que é vendorizado e não instalado, não vira nome npm', () => {
    expect(nomesNpmDaCelula('stockfish (stockfish.js)')).toEqual([])
  })
})

describe('versaoSemPeers', () => {
  it('corta o sufixo de peers que o pnpm anexa', () => {
    expect(versaoSemPeers('19.2.8(react@19.2.8)')).toBe('19.2.8')
  })

  it('deixa a versão simples intacta', () => {
    expect(versaoSemPeers('5.9.3')).toBe('5.9.3')
  })
})

describe('cruzamento entre o lockfile e o documento', () => {
  const lockfile = lerLockfileReal()
  const documento = lerDocumentoReal()

  it('há o que cruzar dos dois lados', () => {
    expect(lockfile.diretas.length).toBeGreaterThan(0)
    expect(documento.entradas.length).toBeGreaterThan(0)
  })

  it('toda dependência instalada tem linha em docs/LICENSES.md', () => {
    const problemas = cruzarInstaladasComInventario({
      lockfile,
      documento,
      divida: DEPENDENCIAS_FORA_DO_INVENTARIO,
    })
    expect(problemas, `\n${descrever(problemas)}\n`).toEqual([])
  })

  it('toda linha de dívida tem motivo escrito', () => {
    const semMotivo = Object.entries(DEPENDENCIAS_FORA_DO_INVENTARIO)
      .filter(([, motivo]) => motivo.trim().length === 0)
      .map(([nome]) => nome)
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
  const lockfileMinimo = [
    "lockfileVersion: '9.0'",
    '',
    'importers:',
    '',
    '  .:',
    '    dependencies:',
    '      next:',
    '        specifier: 16.3.4',
    '        version: 16.3.4(react@19.2.8)',
    '    devDependencies:',
    '      typescript:',
    '        specifier: 5.9.3',
    '        version: 5.9.3',
    '',
    'packages:',
    '',
    '  next@16.3.4:',
    '    resolution: {integrity: sha512-irrelevante}',
  ].join('\n')

  const documentoMinimo = [
    '## Em uso',
    '',
    '| ID           | Pacote       | Versão | Licença    | Fonte                  |',
    '| ------------ | ------------ | ------ | ---------- | ---------------------- |',
    '| `next`       | `next`       | 16.3.4 | MIT        | https://next.dev       |',
    '| `typescript` | `typescript` | 5.9.3  | Apache-2.0 | https://typescript.dev |',
  ].join('\n')

  function cruzar(lock: string, doc: string, divida: Record<string, string> = {}) {
    return cruzarInstaladasComInventario({
      lockfile: lerDependenciasDiretas(lock),
      documento: lerInventarioDoDocumento(doc),
      divida,
    })
  }

  it('o caso de controle passa', () => {
    const problemas = cruzar(lockfileMinimo, documentoMinimo)
    expect(problemas, descrever(problemas)).toEqual([])
  })

  it('(a) dependência instalada sem linha no documento reprova', () => {
    const comSharp = lockfileMinimo.replace(
      '    devDependencies:',
      [
        '      sharp:',
        '        specifier: 0.35.4',
        '        version: 0.35.4',
        '    devDependencies:',
      ].join('\n'),
    )
    const problemas = cruzar(comSharp, documentoMinimo)
    expect(tipos(problemas)).toEqual(['instalada-e-fora-do-inventario'])
    expect(problemas[0].pacote).toBe('sharp')
  })

  it('(a) a mesma dependência declarada como dívida passa', () => {
    const comSharp = lockfileMinimo.replace(
      '    devDependencies:',
      [
        '      sharp:',
        '        specifier: 0.35.4',
        '        version: 0.35.4',
        '    devDependencies:',
      ].join('\n'),
    )
    const problemas = cruzar(comSharp, documentoMinimo, {
      sharp: 'entra só pelo pipeline de imagem do Next; a licença vem com ele',
    })
    expect(problemas, descrever(problemas)).toEqual([])
  })

  it('(b) linha no documento de pacote que não é dependência direta reprova', () => {
    const comLinhaOrfa = `${documentoMinimo}\n| \`vitest\` | \`vitest\` | 5.0.0 | MIT | https://vitest.dev |`
    const problemas = cruzar(lockfileMinimo, comLinhaOrfa)
    expect(tipos(problemas)).toEqual(['no-inventario-e-nao-instalada'])
    expect(problemas[0].pacote).toBe('vitest')
  })

  it('(c) dívida que já não desculpa nada reprova', () => {
    const problemas = cruzar(lockfileMinimo, documentoMinimo, {
      sharp: 'saiu do projeto e ninguém tirou a linha',
    })
    expect(tipos(problemas)).toEqual(['divida-resolvida'])
    expect(problemas[0].pacote).toBe('sharp')
  })

  it('(d) lockfile sem dependências diretas reprova, não aprova', () => {
    const problemas = cruzar("lockfileVersion: '9.0'\n\npackages:\n", documentoMinimo)
    expect(tipos(problemas)).toContain('lockfile-sem-dependencias-diretas')
  })

  it('documento sem nenhum pacote npm reprova', () => {
    const soDadoAberto = [
      '## Dados',
      '',
      '| ID                  | Pacote                  | Versão | Licença | Fonte                 |',
      '| ------------------- | ----------------------- | ------ | ------- | --------------------- |',
      '| `lichess-puzzle-db` | Lichess puzzle database | 2026   | CC0-1.0 | https://lichess.org   |',
    ].join('\n')
    const problemas = cruzar(lockfileMinimo, soDadoAberto)
    expect(tipos(problemas)).toContain('inventario-sem-pacote-npm')
  })

  it('versão desatualizada no documento reprova', () => {
    const versaoVelha = documentoMinimo.replace('| 16.3.4 |', '| 16.3.3 |')
    const problemas = cruzar(lockfileMinimo, versaoVelha)
    expect(tipos(problemas)).toEqual(['versao-do-documento-divergente'])
    expect(problemas[0].pacote).toBe('next')
  })

  it('versão não exata no documento reprova em vez de ser pulada', () => {
    const semVersao = documentoMinimo.replace('| 16.3.4 |', '| —      |')
    const problemas = cruzar(lockfileMinimo, semVersao)
    expect(tipos(problemas)).toEqual(['versao-do-documento-ausente'])
    expect(problemas[0].pacote).toBe('next')
  })

  it('faixa no lugar da versão exata no documento reprova', () => {
    const comFaixa = documentoMinimo.replace('| 16.3.4 |', '| ^16.3.4 |')
    const problemas = cruzar(lockfileMinimo, comFaixa)
    expect(tipos(problemas)).toEqual(['versao-do-documento-ausente'])
  })

  it('o mesmo pacote em duas linhas do documento reprova', () => {
    const repetido = `${documentoMinimo}\n| \`next-de-novo\` | \`next\` | 16.3.4 | MIT | https://next.dev |`
    const problemas = cruzar(lockfileMinimo, repetido)
    expect(tipos(problemas)).toEqual(['pacote-repetido-no-inventario'])
    expect(problemas[0].pacote).toBe('next')
  })

  it('importador além da raiz reprova em vez de ser ignorado', () => {
    const comWorkspace = lockfileMinimo.replace(
      '\npackages:',
      [
        '',
        '  pacotes/app:',
        '    dependencies:',
        '      lodash:',
        '        specifier: 4.17.21',
        '        version: 4.17.21',
        '',
        'packages:',
      ].join('\n'),
    )
    const problemas = cruzar(comWorkspace, documentoMinimo)
    expect(tipos(problemas)).toContain('importador-nao-previsto')
  })

  it('dívida sem motivo reprova', () => {
    const comSharp = lockfileMinimo.replace(
      '    devDependencies:',
      [
        '      sharp:',
        '        specifier: 0.35.4',
        '        version: 0.35.4',
        '    devDependencies:',
      ].join('\n'),
    )
    const problemas = cruzar(comSharp, documentoMinimo, { sharp: '   ' })
    expect(tipos(problemas)).toEqual(['divida-sem-motivo'])
  })
})
