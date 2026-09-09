import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LICHESS_THEME_SKILLS } from '@/domain/puzzles/themes'

/**
 * Portão de paridade entre a AUTORIDADE (`src/domain/puzzles/themes.ts`) e o
 * ARTEFATO GERADO (`src/domain/puzzles/temas-suportados.json`), que é o mapa
 * que `scripts/puzzles/build-dataset.mjs` de fato usa.
 *
 * QUAL DECISÃO ESTE ARQUIVO CARREGA
 *
 * O portão anterior comparava script e domínio rodando o pipeline sobre o
 * fixture. Ele só enxergava os temas que APARECIAM no fixture: um tema novo
 * acrescentado só no `.ts` sumia da conta — e sumir é pior que reprovar,
 * porque o pipeline passaria a descartar aqueles puzzles em silêncio.
 *
 * A correção é varrer a FONTE, não a lista: as duas pontas são percorridas
 * inteiras, nos dois sentidos, sem nenhuma lista de temas escrita à mão neste
 * arquivo. O fixture deixou de ter voto.
 *
 * O portão também conta as próprias verificações: zero comparações REPROVA.
 * Um `Object.entries` sobre um objeto vazio imprimiria "tudo certo" sem ter
 * olhado nada.
 */

const RAIZ = process.cwd()
const GERADOR = join(RAIZ, 'scripts', 'puzzles', 'gerar-temas.mjs')
const CAMINHO_JSON = join(RAIZ, 'src', 'domain', 'puzzles', 'temas-suportados.json')
const COMANDO_GERADOR = 'node scripts/puzzles/gerar-temas.mjs'

interface ArtefatoDeTemas {
  _aviso?: string
  fonte?: string
  comando?: string
  temas: Record<string, string[]>
}

type MapaDeTemas = Readonly<Record<string, readonly string[]>>

/** Normaliza CRLF: o artefato tem de ser idêntico em qualquer checkout. */
function normalizar(texto: string): string {
  return texto.replace(/\r\n/g, '\n')
}

function lerArtefato(): ArtefatoDeTemas {
  return JSON.parse(readFileSync(CAMINHO_JSON, 'utf8')) as ArtefatoDeTemas
}

/**
 * Compara os dois mapas nos DOIS sentidos e devolve quantas comparações fez.
 *
 * Função pura de propósito: é o que permite alimentar o portão com divergência
 * fabricada e provar que ele reprova. Régua que nunca reprova é carimbo.
 */
export function compararMapas(
  daFonte: MapaDeTemas,
  doArtefato: MapaDeTemas,
): { comparacoes: number; problemas: string[] } {
  const problemas: string[] = []
  let comparacoes = 0

  for (const [tema, skills] of Object.entries(daFonte)) {
    comparacoes += 1
    const noArtefato = doArtefato[tema]
    if (noArtefato === undefined) {
      problemas.push(`"${tema}" está em themes.ts e falta no JSON`)
      continue
    }
    if (noArtefato.join('|') !== skills.join('|')) {
      problemas.push(
        `"${tema}": themes.ts diz [${skills.join(', ')}] e o JSON diz [${noArtefato.join(', ')}]`,
      )
    }
  }

  for (const tema of Object.keys(doArtefato)) {
    comparacoes += 1
    if (daFonte[tema] === undefined) {
      problemas.push(`"${tema}" está no JSON e não existe em themes.ts`)
    }
  }

  return { comparacoes, problemas }
}

/** Roda o gerador contra uma fonte de mentira e devolve stderr + código de saída. */
function rodarGerador(fonteTs: string): { codigo: number; stderr: string } {
  const pasta = mkdtempSync(join(tmpdir(), 'lancezero-temas-'))
  const fonte = join(pasta, 'themes.ts')
  const saida = join(pasta, 'temas.json')
  writeFileSync(fonte, fonteTs, 'utf8')

  try {
    execFileSync(process.execPath, [GERADOR, '--fonte', fonte, '--out', saida, '--quiet'], {
      cwd: RAIZ,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { codigo: 0, stderr: '' }
  } catch (erro) {
    const falha = erro as { status?: number; stderr?: string }
    return { codigo: falha.status ?? -1, stderr: falha.stderr ?? '' }
  }
}

const CABECALHO_FONTE = "import type { SkillId } from '@/domain/types'\n\n"

describe('paridade tema→habilidade entre themes.ts e o JSON gerado', () => {
  it('há o que comparar dos dois lados', () => {
    // Regra 3 dos portões: tabela vazia não é aprovação.
    expect(Object.keys(LICHESS_THEME_SKILLS).length).toBeGreaterThan(0)
    expect(Object.keys(lerArtefato().temas).length).toBeGreaterThan(0)
  })

  it('todo tema de themes.ts está no JSON e todo tema do JSON está em themes.ts', () => {
    const { comparacoes, problemas } = compararMapas(LICHESS_THEME_SKILLS, lerArtefato().temas)

    // Cada tema é olhado uma vez em cada sentido.
    const esperadas =
      Object.keys(LICHESS_THEME_SKILLS).length + Object.keys(lerArtefato().temas).length
    expect(comparacoes, 'o portão não comparou nada').toBe(esperadas)
    expect(comparacoes).toBeGreaterThan(0)

    expect(
      problemas,
      `themes.ts e o JSON divergem. Rode: ${COMANDO_GERADOR}\n${problemas.join('\n')}`,
    ).toEqual([])
  })

  it('o JSON no disco está atualizado em relação a themes.ts', () => {
    const pasta = mkdtempSync(join(tmpdir(), 'lancezero-temas-'))
    const saida = join(pasta, 'temas.json')

    execFileSync(process.execPath, [GERADOR, '--out', saida, '--quiet'], {
      cwd: RAIZ,
      encoding: 'utf8',
    })

    const regerado = normalizar(readFileSync(saida, 'utf8'))
    const noDisco = normalizar(readFileSync(CAMINHO_JSON, 'utf8'))
    expect(
      noDisco,
      `src/domain/puzzles/temas-suportados.json está desatualizado. Rode: ${COMANDO_GERADOR}`,
    ).toBe(regerado)
  })

  it('o JSON se declara artefato gerado e aponta a fonte e o comando', () => {
    const artefato = lerArtefato()
    // O aviso mora DENTRO do arquivo porque JSON não aceita comentário — e um
    // artefato gerado sem aviso é editado à mão na primeira oportunidade.
    expect(artefato._aviso).toMatch(/ARTEFATO GERADO/)
    expect(artefato.fonte).toBe('src/domain/puzzles/themes.ts')
    expect(artefato.comando).toBe(COMANDO_GERADOR)
  })
})

/**
 * A metade que transforma o portão acima em régua: alimentada com divergência
 * fabricada, ela tem de REPROVAR. Sem estes casos, um `compararMapas` que
 * devolvesse `[]` sempre passaria despercebido para sempre.
 */
describe('o portão de paridade morde dos dois lados', () => {
  const fonteFalsa: MapaDeTemas = { fork: ['tactics.fork'], pin: ['tactics.pin'] }

  it('acusa tema que existe só em themes.ts', () => {
    const { problemas } = compararMapas(fonteFalsa, { fork: ['tactics.fork'] })
    expect(problemas).toEqual(['"pin" está em themes.ts e falta no JSON'])
  })

  it('acusa tema que existe só no JSON', () => {
    const { problemas } = compararMapas(fonteFalsa, {
      ...fonteFalsa,
      temaInventado: ['tactics.fork'],
    })
    expect(problemas).toEqual(['"temaInventado" está no JSON e não existe em themes.ts'])
  })

  it('acusa tema presente nos dois lados com habilidades diferentes', () => {
    const { problemas } = compararMapas(fonteFalsa, {
      ...fonteFalsa,
      pin: ['tactics.skewer'],
    })
    expect(problemas).toHaveLength(1)
    expect(problemas[0]).toContain('"pin"')
  })

  it('dois mapas vazios não produzem problema NENHUM — por isso a contagem é obrigatória', () => {
    const { comparacoes, problemas } = compararMapas({}, {})
    expect(problemas).toEqual([])
    expect(comparacoes).toBe(0)
  })

  it('aprova quando os dois lados são iguais', () => {
    const { comparacoes, problemas } = compararMapas(fonteFalsa, { ...fonteFalsa })
    expect(problemas).toEqual([])
    expect(comparacoes).toBe(4)
  })
})

/**
 * O gerador extrai por leitura de texto. O risco dessa escolha é a extração
 * silenciosa: devolver `{}` porque o formato mudou faria `build-dataset.mjs`
 * descartar TODOS os puzzles sem erro nenhum. Estes casos provam que cada
 * forma de "não entendi" derruba o gerador em vez de emitir um mapa vazio.
 */
describe('o gerador falha ruidosamente quando não entende a fonte', () => {
  it('aceita uma fonte no formato esperado (o controle)', () => {
    const { codigo } = rodarGerador(
      `${CABECALHO_FONTE}export const LICHESS_THEME_SKILLS: Readonly<Record<string, readonly SkillId[]>> = {\n  // comentário\n  fork: ['tactics.fork'],\n}\n`,
    )
    expect(codigo).toBe(0)
  })

  it('recusa fonte sem a constante', () => {
    const { codigo, stderr } = rodarGerador(`${CABECALHO_FONTE}export const OUTRA_COISA = {}\n`)
    expect(codigo).not.toBe(0)
    expect(stderr).toContain('LICHESS_THEME_SKILLS')
  })

  it('recusa mapa vazio em vez de emitir um JSON sem temas', () => {
    const { codigo, stderr } = rodarGerador(
      `${CABECALHO_FONTE}export const LICHESS_THEME_SKILLS: Readonly<Record<string, readonly SkillId[]>> = {\n  // só comentário\n}\n`,
    )
    expect(codigo).not.toBe(0)
    expect(stderr).toContain('nenhum tema')
  })

  it('recusa entrada em formato que não sabe ler (lista quebrada em várias linhas)', () => {
    const { codigo, stderr } = rodarGerador(
      `${CABECALHO_FONTE}export const LICHESS_THEME_SKILLS: Readonly<Record<string, readonly SkillId[]>> = {\n  fork: [\n    'tactics.fork',\n  ],\n}\n`,
    )
    expect(codigo).not.toBe(0)
    expect(stderr).toContain('formato')
  })

  it('recusa valor que não parece um SkillId', () => {
    const { codigo, stderr } = rodarGerador(
      `${CABECALHO_FONTE}export const LICHESS_THEME_SKILLS: Readonly<Record<string, readonly SkillId[]>> = {\n  fork: ['Tactics Fork'],\n}\n`,
    )
    expect(codigo).not.toBe(0)
    expect(stderr).toContain('SkillId')
  })

  it('recusa a constante declarada duas vezes', () => {
    const bloco =
      "export const LICHESS_THEME_SKILLS: Readonly<Record<string, readonly SkillId[]>> = {\n  fork: ['tactics.fork'],\n}\n"
    const { codigo, stderr } = rodarGerador(`${CABECALHO_FONTE}${bloco}${bloco}`)
    expect(codigo).not.toBe(0)
    expect(stderr).toContain('mais de uma vez')
  })
})

/**
 * `build-dataset.mjs` é o consumidor do artefato. Um consumidor que aceitasse
 * mapa vazio terminaria com sucesso escrevendo um dataset zerado — exatamente
 * o falso verde que esta issue veio fechar.
 */
describe('build-dataset.mjs recusa um artefato de temas inutilizável', () => {
  const PIPELINE = join(RAIZ, 'scripts', 'puzzles', 'build-dataset.mjs')
  const CABECALHO_CSV = 'PuzzleId,FEN,Moves,Rating,RD,Popularity,NbPlays,Themes,GameUrl,Tags\n'

  /**
   * `--temas` existe para isto: sem um jeito de apontar o pipeline para um mapa
   * quebrado, toda a validação acima seria código que nenhum caminho alcança —
   * e código que ninguém roda apodrece.
   */
  function rodarPipeline(temas: string | null): { codigo: number; stderr: string } {
    const pasta = mkdtempSync(join(tmpdir(), 'lancezero-pipeline-'))
    const csv = join(pasta, 'fixture.csv')
    writeFileSync(csv, CABECALHO_CSV, 'utf8')

    const argumentos = [PIPELINE, csv, '--out', join(pasta, 'out.json'), '--quiet']
    if (temas !== null) {
      const arquivo = join(pasta, 'temas.json')
      writeFileSync(arquivo, temas, 'utf8')
      argumentos.push('--temas', arquivo)
    }

    try {
      execFileSync(process.execPath, argumentos, {
        cwd: RAIZ,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      return { codigo: 0, stderr: '' }
    } catch (erro) {
      const falha = erro as { status?: number; stderr?: string }
      return { codigo: falha.status ?? -1, stderr: falha.stderr ?? '' }
    }
  }

  it('carrega o artefato real sem reclamar (o controle)', () => {
    const { codigo, stderr } = rodarPipeline(null)
    expect(stderr).toBe('')
    expect(codigo).toBe(0)
  })

  it('morre quando o mapa está vazio, em vez de descartar todos os puzzles', () => {
    const { codigo, stderr } = rodarPipeline('{ "temas": {} }')
    expect(codigo).not.toBe(0)
    expect(stderr).toContain('nenhum tema')
    expect(stderr).toContain(COMANDO_GERADOR)
  })

  it('morre quando o objeto "temas" não existe', () => {
    const { codigo, stderr } = rodarPipeline('{ "outraCoisa": {} }')
    expect(codigo).not.toBe(0)
    expect(stderr).toContain('temas')
  })

  it('morre quando um tema não tem lista de habilidades', () => {
    const { codigo, stderr } = rodarPipeline('{ "temas": { "fork": [] } }')
    expect(codigo).not.toBe(0)
    expect(stderr).toContain('fork')
  })

  it('morre quando o arquivo não é JSON', () => {
    const { codigo, stderr } = rodarPipeline('isto não é json')
    expect(codigo).not.toBe(0)
    expect(stderr).toContain('JSON')
  })

  it('morre quando o arquivo apontado não existe', () => {
    const pasta = mkdtempSync(join(tmpdir(), 'lancezero-pipeline-'))
    const csv = join(pasta, 'fixture.csv')
    writeFileSync(csv, CABECALHO_CSV, 'utf8')

    let codigo = 0
    let stderr = ''
    try {
      execFileSync(
        process.execPath,
        [
          PIPELINE,
          csv,
          '--out',
          join(pasta, 'out.json'),
          '--temas',
          join(pasta, 'nao-existe.json'),
          '--quiet',
        ],
        { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      )
    } catch (erro) {
      const falha = erro as { status?: number; stderr?: string }
      codigo = falha.status ?? -1
      stderr = falha.stderr ?? ''
    }
    expect(codigo).not.toBe(0)
    expect(stderr).toContain(COMANDO_GERADOR)
  })
})
