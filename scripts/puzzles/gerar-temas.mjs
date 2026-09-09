#!/usr/bin/env node
/**
 * LanceZero — gera `src/domain/puzzles/temas-suportados.json` a partir de
 * `src/domain/puzzles/themes.ts`.
 *
 * ===========================================================================
 * COMO RODAR
 * ===========================================================================
 *
 *     node scripts/puzzles/gerar-temas.mjs
 *
 *     --fonte <arquivo.ts>     Padrão: src/domain/puzzles/themes.ts
 *     --out <arquivo.json>     Padrão: src/domain/puzzles/temas-suportados.json
 *     --quiet                  Sem mensagem de sucesso no stderr
 *
 * Rode isto SEMPRE que mexer em `LICHESS_THEME_SKILLS`. Se esquecer, o portão
 * `tests/unit/puzzles-paridade.test.ts` reprova dizendo este comando.
 *
 * ===========================================================================
 * QUAL DECISÃO ESTE ARQUIVO CARREGA
 * ===========================================================================
 *
 * O mapa tema→habilidade existia em DOIS lugares: em TypeScript no domínio e
 * copiado à mão dentro de `build-dataset.mjs` (um `.mjs` não importa `.ts` sem
 * etapa de build). Duas fontes para a mesma verdade divergem, e a que vale
 * costuma ser a errada: um tema novo acrescentado só no domínio deixaria o
 * pipeline descartando puzzles em silêncio.
 *
 * A decisão é DERIVAR em vez de duplicar. A AUTORIDADE continua sendo
 * `themes.ts`; o JSON é ARTEFATO GERADO — não se edita à mão — e o pipeline
 * passa a lê-lo.
 *
 * A extração é por leitura de TEXTO de propósito: aceitar `tsx`/`ts-node` só
 * para ler um objeto literal acrescentaria dependência e etapa de build a um
 * script que hoje roda em Node puro.
 *
 * O preço dessa escolha é que a extração depende do FORMATO do arquivo. Por
 * isso ela é estrita e barulhenta: qualquer linha do bloco que não case com
 * `tema: ['skill', ...],` derruba o gerador com a linha citada. Extração
 * silenciosa que devolve vazio seria o pior caso possível — o pipeline
 * passaria a filtrar TODOS os puzzles e ninguém veria erro.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const RAIZ = new URL('../../', import.meta.url)

/**
 * Caminhos e formato do artefato. Não são botões de tuning: são o contrato
 * entre `themes.ts`, este gerador, `build-dataset.mjs` e o portão de paridade.
 */
export const CONFIGURACAO = {
  /** Onde mora a autoridade. */
  fonteRelativa: 'src/domain/puzzles/themes.ts',
  /** Artefato gerado, lido por `build-dataset.mjs`. */
  saidaRelativa: 'src/domain/puzzles/temas-suportados.json',
  /** Nome da constante exportada de onde o mapa é extraído. */
  constante: 'LICHESS_THEME_SKILLS',
  /** Comando que regenera o artefato. Citado nas mensagens de erro. */
  comando: 'node scripts/puzzles/gerar-temas.mjs',
  /** Aviso gravado dentro do JSON: JSON não aceita comentário. */
  aviso: 'ARTEFATO GERADO — não edite à mão. Edite a fonte e rode o comando abaixo.',
}

/** Formato aceito para um identificador de habilidade nossa: `grupo.nome-composto`. */
const SKILL_ID = /^[a-z]+(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/

/** Uma entrada do mapa, exatamente como o Prettier formata este projeto. */
const ENTRADA = /^([A-Za-z_$][\w$]*)\s*:\s*\[([^\]]*)\]\s*,?$/

/** Um item da lista: string entre aspas simples. */
const ITEM = /^'([^']+)'$/

/** Erro de extração. Tipo próprio para o portão poder afirmar a causa. */
export class ErroDeExtracao extends Error {
  constructor(mensagem) {
    super(mensagem)
    this.name = 'ErroDeExtracao'
  }
}

/**
 * Recorta o corpo do objeto literal atribuído à constante.
 *
 * Percorre caractere a caractere ignorando strings e comentários porque uma
 * chave dentro de qualquer um dos dois desalinharia a contagem de profundidade
 * — e um recorte desalinhado erra em silêncio, que é o que não pode acontecer.
 */
export function recortarBloco(fonte, constante = CONFIGURACAO.constante) {
  const marcador = `export const ${constante}`
  const inicio = fonte.indexOf(marcador)
  if (inicio === -1) {
    throw new ErroDeExtracao(`não encontrei "${marcador}" na fonte`)
  }
  if (fonte.indexOf(marcador, inicio + marcador.length) !== -1) {
    throw new ErroDeExtracao(`"${marcador}" aparece mais de uma vez: não sei qual vale`)
  }

  const abre = fonte.indexOf('{', inicio)
  if (abre === -1) {
    throw new ErroDeExtracao(`"${marcador}" não é seguido de um objeto literal`)
  }
  if (!fonte.slice(inicio, abre).includes('=')) {
    throw new ErroDeExtracao(`"${marcador}" não é uma atribuição de objeto literal`)
  }

  let profundidade = 0
  let aspas = null
  for (let i = abre; i < fonte.length; i += 1) {
    const c = fonte[i]

    if (aspas !== null) {
      if (c === '\\') {
        i += 1
        continue
      }
      if (c === aspas) aspas = null
      continue
    }
    if (c === "'" || c === '"' || c === '`') {
      aspas = c
      continue
    }
    if (c === '/' && fonte[i + 1] === '/') {
      const fim = fonte.indexOf('\n', i)
      i = fim === -1 ? fonte.length : fim
      continue
    }
    if (c === '/' && fonte[i + 1] === '*') {
      const fim = fonte.indexOf('*/', i + 2)
      if (fim === -1) throw new ErroDeExtracao('comentário de bloco sem fechamento')
      i = fim + 1
      continue
    }

    if (c === '{') profundidade += 1
    else if (c === '}') {
      profundidade -= 1
      if (profundidade === 0) return fonte.slice(abre + 1, i)
    }
  }
  throw new ErroDeExtracao(`não encontrei o "}" que fecha "${marcador}"`)
}

/**
 * Lê o corpo recortado e devolve `{ tema: [skillId, ...] }` na ordem da fonte.
 *
 * Estrito de propósito: linha que não é vazia, nem comentário, nem entrada no
 * formato esperado derruba a extração citando o número da linha. Ignorar o que
 * não entendeu seria devolver um mapa incompleto sem uma linha no console.
 */
export function extrairEntradas(corpo) {
  const mapa = {}
  const linhas = corpo.split('\n')

  for (let i = 0; i < linhas.length; i += 1) {
    const linha = linhas[i].trim()
    const numero = i + 1

    if (linha === '' || linha.startsWith('//')) continue

    const casou = ENTRADA.exec(linha)
    if (casou === null) {
      throw new ErroDeExtracao(
        `linha ${numero} do bloco não está no formato "tema: ['skill'],": ${linha}`,
      )
    }

    const tema = casou[1]
    if (mapa[tema] !== undefined) {
      throw new ErroDeExtracao(`tema "${tema}" aparece duas vezes no bloco (linha ${numero})`)
    }

    const itens = casou[2]
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item !== '')
    if (itens.length === 0) {
      throw new ErroDeExtracao(`tema "${tema}" com lista vazia (linha ${numero})`)
    }

    const skills = itens.map((item) => {
      const comAspas = ITEM.exec(item)
      if (comAspas === null) {
        throw new ErroDeExtracao(
          `tema "${tema}": item ${item} não é string simples (linha ${numero})`,
        )
      }
      if (!SKILL_ID.test(comAspas[1])) {
        throw new ErroDeExtracao(
          `tema "${tema}": "${comAspas[1]}" não parece um SkillId (linha ${numero})`,
        )
      }
      return comAspas[1]
    })

    mapa[tema] = skills
  }

  // Regra dos portões: tabela vazia não é aprovação. Um bloco que não rendeu
  // nada quase certamente é mudança de formato, e escrever `{}` faria o
  // pipeline descartar TODOS os puzzles sem erro nenhum.
  if (Object.keys(mapa).length === 0) {
    throw new ErroDeExtracao('a extração não encontrou nenhum tema: o formato da fonte mudou?')
  }

  return mapa
}

/** Texto da fonte → mapa tema→habilidades. */
export function extrairMapa(fonte) {
  return extrairEntradas(recortarBloco(fonte))
}

/**
 * Serializa no formato que o Prettier deste projeto produz: dois espaços de
 * indentação, listas curtas em linha única e quebra de linha no fim. Assim o
 * artefato gerado passa em `prettier --check` sem tratamento especial.
 */
export function serializar(mapa) {
  const chaves = Object.keys(mapa)
  const linhas = [
    '{',
    `  "_aviso": ${JSON.stringify(CONFIGURACAO.aviso)},`,
    `  "fonte": ${JSON.stringify(CONFIGURACAO.fonteRelativa)},`,
    `  "comando": ${JSON.stringify(CONFIGURACAO.comando)},`,
    '  "temas": {',
  ]
  chaves.forEach((chave, i) => {
    const virgula = i === chaves.length - 1 ? '' : ','
    linhas.push(`    ${JSON.stringify(chave)}: ${JSON.stringify(mapa[chave])}${virgula}`)
  })
  linhas.push('  }', '}')
  return `${linhas.join('\n')}\n`
}

/** Normaliza CRLF: o artefato tem de ser idêntico em qualquer checkout. */
export function normalizar(texto) {
  return texto.replace(/\r\n/g, '\n')
}

/** Fonte em texto → conteúdo final do JSON. Sem tocar em disco: o portão usa isto. */
export function gerarConteudo(fonte) {
  return serializar(extrairMapa(normalizar(fonte)))
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const AJUDA = `
gerar-temas — deriva ${CONFIGURACAO.saidaRelativa} de ${CONFIGURACAO.fonteRelativa}.

  ${CONFIGURACAO.comando} [opções]

  --fonte <arquivo.ts>   padrão ${CONFIGURACAO.fonteRelativa}
  --out <arquivo.json>   padrão ${CONFIGURACAO.saidaRelativa}
  --quiet                sem mensagem de sucesso

O JSON é ARTEFATO GERADO. Edite ${CONFIGURACAO.fonteRelativa} e rode este comando.
`

function lerArgumentos(argv) {
  const opcoes = {
    fonte: fileURLToPath(new URL(CONFIGURACAO.fonteRelativa, RAIZ)),
    out: fileURLToPath(new URL(CONFIGURACAO.saidaRelativa, RAIZ)),
    quiet: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') return { ajuda: true }
    if (arg === '--quiet') {
      opcoes.quiet = true
      continue
    }
    if (arg === '--fonte' || arg === '--out') {
      i += 1
      const valor = argv[i]
      if (valor === undefined) throw new Error(`Falta o caminho depois de ${arg}`)
      opcoes[arg === '--fonte' ? 'fonte' : 'out'] = valor
      continue
    }
    throw new Error(`Opção desconhecida: ${arg}`)
  }

  return { ajuda: false, opcoes }
}

function main() {
  const lido = lerArgumentos(process.argv.slice(2))
  if (lido.ajuda) {
    process.stdout.write(AJUDA)
    return
  }
  const { fonte, out, quiet } = lido.opcoes

  const texto = readFileSync(fonte, 'utf8')
  const conteudo = gerarConteudo(texto)
  writeFileSync(out, conteudo, 'utf8')

  if (!quiet) {
    const total = Object.keys(JSON.parse(conteudo).temas).length
    process.stderr.write(`${out}: ${total} temas derivados de ${fonte}\n`)
  }
}

// Só executa como CLI. Importado (pelo portão), o módulo apenas expõe as funções.
if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main()
  } catch (erro) {
    process.stderr.write(`${erro instanceof Error ? erro.message : String(erro)}\n`)
    process.exitCode = 1
  }
}
