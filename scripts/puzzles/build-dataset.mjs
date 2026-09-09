#!/usr/bin/env node
/**
 * LanceZero — pipeline de ingestão do dump de puzzles do Lichess.
 *
 * ===========================================================================
 * COMO OBTER O DUMP (o script NÃO baixa nada)
 * ===========================================================================
 *
 * O arquivo oficial é publicado sob CC0 em:
 *
 *     https://database.lichess.org/#puzzles
 *     https://database.lichess.org/lichess_db_puzzle.csv.zst
 *
 * Baixe e descompacte à mão, fora deste script:
 *
 *     curl -O https://database.lichess.org/lichess_db_puzzle.csv.zst
 *     zstd -d lichess_db_puzzle.csv.zst
 *
 * Anote a data em que baixou e passe em `--source-date`. O sha256 do arquivo
 * é calculado aqui e vai para os metadados do artefato: sem isso não dá para
 * reproduzir um build antigo nem auditar de onde veio um puzzle.
 *
 * ===========================================================================
 * USO
 * ===========================================================================
 *
 *     node scripts/puzzles/build-dataset.mjs <arquivo.csv> [opções]
 *
 *     --out <arquivo.json>     Saída. Padrão: public/data/puzzles.json
 *     --min-rating <n>         Padrão 500
 *     --max-rating <n>         Padrão 2000
 *     --min-popularity <n>     Padrão 70   (o campo vai de -100 a 100)
 *     --min-plays <n>          Padrão 50
 *     --per-bucket <n>         Máximo por (faixa de rating × habilidade). Padrão 4000
 *     --max-total <n>          Teto do artefato. Padrão 300000
 *     --source-date <ISO>      Data do dump baixado. Padrão: hoje
 *     --limit <n>              Só lê as N primeiras linhas. Para teste.
 *     --temas <arquivo.json>   Mapa tema→habilidade. Padrão: o artefato gerado.
 *                              Existe para o portão poder exercitar a recusa.
 *     --pretty                 JSON indentado
 *     --quiet                  Sem progresso no stderr
 *
 * ===========================================================================
 * AVISOS
 * ===========================================================================
 *
 * - Este script roda em Node puro. NUNCA no navegador: o dump tem alguns GB.
 * - A semântica do dataset (o primeiro lance de `Moves` é do ADVERSÁRIO, e o
 *   jogador resolve a partir do segundo) está implementada em
 *   `toSolvable()` mais abaixo. Ela é um ESPELHO de
 *   `src/domain/puzzles/parser.ts`. Um script `.mjs` não consegue importar
 *   TypeScript sem etapa de build, então a regra existe em dois lugares.
 *   A AUTORIDADE é o domínio, e o teste
 *   `tests/unit/puzzles-parser.test.ts` roda este script sobre o fixture e
 *   compara o resultado com o do domínio, justamente para pegar divergência.
 * - O mapa tema→habilidade NÃO é espelhado aqui: ele é LIDO de
 *   `src/domain/puzzles/temas-suportados.json`, artefato derivado de
 *   `src/domain/puzzles/themes.ts` por `scripts/puzzles/gerar-temas.mjs`.
 *   Ter uma cópia do mapa neste arquivo já foi o desenho anterior, e o defeito
 *   dele era silencioso: um tema novo acrescentado só no domínio fazia o
 *   pipeline descartar aqueles puzzles sem erro nenhum. Se o JSON estiver
 *   ausente ou vazio, este script MORRE em vez de filtrar tudo fora.
 * - Mesma entrada + mesmas opções = mesma saída. A amostragem por bucket usa
 *   um hash do PuzzleId, não `Math.random`, e não depende da ordem do arquivo.
 */

import { createHash } from 'node:crypto'
import { createReadStream, readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { Chess } from 'chess.js'
import { CONFIGURACAO as CONFIGURACAO_TEMAS } from './gerar-temas.mjs'

// ---------------------------------------------------------------------------
// Configuração. Heurísticas de produto, a calibrar com dados reais de uso.
// ---------------------------------------------------------------------------

const PADROES = {
  out: 'public/data/puzzles.json',
  minRating: 500,
  maxRating: 2000,
  minPopularity: 70,
  minPlays: 50,
  perBucket: 4000,
  maxTotal: 300000,
}

/** Faixas de rating usadas na estratificação. O último limite é aberto. */
const FAIXAS_DE_RATING = [
  { id: '0-799', min: 0, max: 799 },
  { id: '800-999', min: 800, max: 999 },
  { id: '1000-1199', min: 1000, max: 1199 },
  { id: '1200-1399', min: 1200, max: 1399 },
  { id: '1400-1599', min: 1400, max: 1599 },
  { id: '1600-1999', min: 1600, max: 1999 },
  { id: '2000+', min: 2000, max: Number.POSITIVE_INFINITY },
]

/**
 * Caminho e comando vêm do próprio gerador: se eles ficassem escritos aqui
 * também, seriam a segunda fonte da mesma verdade — e mudar o caminho lá
 * deixaria este script apontando para um arquivo que não existe mais.
 */
const CAMINHO_TEMAS = fileURLToPath(
  new URL(`../../${CONFIGURACAO_TEMAS.saidaRelativa}`, import.meta.url),
)
const COMANDO_GERADOR = CONFIGURACAO_TEMAS.comando

/**
 * Lê o mapa tema→habilidade do artefato gerado.
 *
 * Toda condição inválida é FATAL, e nenhuma delas devolve mapa vazio: um mapa
 * vazio faria o pipeline recusar todo puzzle por "sem tema suportado" e
 * terminar com sucesso escrevendo um artefato zerado. Falha barulhenta custa
 * uma tarde; essa passaria semanas.
 */
function carregarTemaParaSkills(caminho) {
  let bruto
  try {
    bruto = readFileSync(caminho, 'utf8')
  } catch (causa) {
    throw new Error(
      `Não consegui ler ${caminho}. Rode: ${COMANDO_GERADOR} — ${
        causa instanceof Error ? causa.message : String(causa)
      }`,
    )
  }

  let artefato
  try {
    artefato = JSON.parse(bruto)
  } catch (causa) {
    throw new Error(
      `${caminho} não é JSON válido. Rode: ${COMANDO_GERADOR} — ${
        causa instanceof Error ? causa.message : String(causa)
      }`,
    )
  }

  const temas = artefato === null || typeof artefato !== 'object' ? undefined : artefato.temas
  if (typeof temas !== 'object' || temas === null || Array.isArray(temas)) {
    throw new Error(`${caminho} não tem o objeto "temas". Rode: ${COMANDO_GERADOR}`)
  }

  const chaves = Object.keys(temas)
  if (chaves.length === 0) {
    throw new Error(
      `${caminho} não tem nenhum tema: o pipeline filtraria TODOS os puzzles. ` +
        `Rode: ${COMANDO_GERADOR}`,
    )
  }

  for (const chave of chaves) {
    const skills = temas[chave]
    const valida =
      Array.isArray(skills) &&
      skills.length > 0 &&
      skills.every((skill) => typeof skill === 'string' && skill !== '')
    if (!valida) {
      throw new Error(
        `${caminho}: o tema "${chave}" não tem uma lista de habilidades. Rode: ${COMANDO_GERADOR}`,
      )
    }
  }

  return temas
}

const COLUNAS = 10
const UCI = /^[a-h][1-8][a-h][1-8][nbrq]?$/

// ---------------------------------------------------------------------------
// Espelho mínimo do domínio
// ---------------------------------------------------------------------------

function skillIdsForThemes(themes, temaParaSkills) {
  const resultado = []
  for (const tema of themes) {
    const skills = temaParaSkills[tema]
    if (skills === undefined) continue
    for (const skill of skills) if (!resultado.includes(skill)) resultado.push(skill)
  }
  return resultado
}

function parseUci(uci) {
  if (!UCI.test(uci)) return null
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length === 5 ? uci[4] : undefined,
  }
}

/** Aplica um lance. Devolve o FEN resultante ou `null` se for ilegal. */
function aplicar(fen, uci) {
  const entrada = parseUci(uci)
  if (entrada === null) return null
  let chess
  try {
    chess = new Chess(fen)
  } catch {
    return null
  }
  try {
    const feito = chess.move(entrada)
    if (!feito) return null
  } catch {
    return null
  }
  return chess.fen()
}

/**
 * Espelho de `parsePuzzleCsvLine`. Devolve `{ puzzle }` ou `{ erro }`.
 *
 * O mapa entra por PARÂMETRO: assim ele é sempre o que `main` carregou nesta
 * execução, e não uma cópia congelada em variável de módulo.
 */
function parseLinha(linha, temaParaSkills) {
  const conteudo = linha.replace(/\r$/, '').trim()
  if (conteudo === '') return { erro: 'linha vazia' }

  const colunas = conteudo.split(',')
  const id = (colunas[0] ?? '').trim()

  if (colunas.length !== COLUNAS) {
    return { erro: `${id || '(sem id)'}: esperava ${COLUNAS} colunas, encontrei ${colunas.length}` }
  }
  if (id === '') return { erro: 'linha sem PuzzleId' }

  const fen = (colunas[1] ?? '').trim()
  try {
    new Chess(fen)
  } catch {
    return { erro: `${id}: FEN inválido` }
  }

  const moves = (colunas[2] ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((m) => m.toLowerCase())
  if (moves.length < 2) return { erro: `${id}: menos de dois lances` }
  if (moves.some((m) => !UCI.test(m))) return { erro: `${id}: lance fora do formato UCI` }

  const rating = Number((colunas[3] ?? '').trim())
  if (!Number.isFinite(rating)) return { erro: `${id}: Rating não numérico` }

  const numeroOuNull = (valor) => {
    const n = Number((valor ?? '').trim())
    return Number.isFinite(n) ? n : null
  }

  const themes = (colunas[7] ?? '').trim().split(/\s+/).filter(Boolean)

  return {
    puzzle: {
      id,
      fen,
      moves,
      rating,
      ratingDeviation: numeroOuNull(colunas[4]),
      popularity: numeroOuNull(colunas[5]),
      nbPlays: numeroOuNull(colunas[6]),
      themes,
      skillIds: skillIdsForThemes(themes, temaParaSkills),
      gameUrl: (colunas[8] ?? '').trim() || null,
      openingTags: (colunas[9] ?? '').trim().split(/\s+/).filter(Boolean),
    },
  }
}

/**
 * Espelho de `toSolvable`.
 *
 * `moves[0]` é o lance preparatório do ADVERSÁRIO. Quem resolve é o lado que
 * joga DEPOIS dele. Errar isso inverte o tabuleiro inteiro.
 */
function toSolvable(puzzle) {
  const setupMoveUci = puzzle.moves[0]
  const startFen = aplicar(puzzle.fen, setupMoveUci)
  if (startFen === null) return null
  const solutionUci = puzzle.moves.slice(1)
  if (solutionUci.length === 0) return null
  return {
    startFen,
    playerColor: startFen.split(' ')[1],
    setupMoveUci,
    solutionUci,
  }
}

/** Espelho de `validateSolution`: a linha inteira, lance a lance. */
function validateSolution(solvable) {
  const { solutionUci } = solvable
  if (solutionUci.length === 0) return { valido: false, motivo: 'solução vazia' }
  if (solutionUci.length % 2 === 0) {
    return { valido: false, motivo: `solução com ${solutionUci.length} lances (par)` }
  }
  let fen = solvable.startFen
  for (let i = 0; i < solutionUci.length; i += 1) {
    const proximo = aplicar(fen, solutionUci[i])
    if (proximo === null) {
      return { valido: false, motivo: `lance ${i + 1} da solução é ilegal` }
    }
    fen = proximo
  }
  return { valido: true, fenFinal: fen }
}

// ---------------------------------------------------------------------------
// Amostragem determinística
// ---------------------------------------------------------------------------

/** FNV-1a de 32 bits, o mesmo de `src/domain/puzzles/rng.ts`. */
function hashSeed(texto) {
  let hash = 0x811c9dc5
  for (let i = 0; i < texto.length; i += 1) {
    hash ^= texto.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/**
 * Bucket que guarda os `capacidade` puzzles de menor hash.
 *
 * Escolher pelos menores hashes é uma amostra determinística e independente da
 * ordem do arquivo: reprocessar o mesmo dump dá exatamente o mesmo artefato, e
 * acrescentar linhas no fim não reembaralha o que já estava dentro.
 */
function criarBucket(capacidade) {
  const itens = []
  return {
    itens,
    oferecer(puzzle) {
      const peso = hashSeed(puzzle.id)
      if (itens.length >= capacidade && peso >= itens[itens.length - 1].peso) return false
      let i = itens.length
      while (i > 0 && itens[i - 1].peso > peso) i -= 1
      itens.splice(i, 0, { peso, puzzle })
      if (itens.length > capacidade) itens.pop()
      return true
    },
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function lerArgumentos(argv) {
  const opcoes = {
    ...PADROES,
    entrada: null,
    sourceDate: null,
    limit: null,
    temas: CAMINHO_TEMAS,
    pretty: false,
    quiet: false,
  }
  const numericas = {
    '--min-rating': 'minRating',
    '--max-rating': 'maxRating',
    '--min-popularity': 'minPopularity',
    '--min-plays': 'minPlays',
    '--per-bucket': 'perBucket',
    '--max-total': 'maxTotal',
    '--limit': 'limit',
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') return { ajuda: true }
    if (arg === '--pretty') {
      opcoes.pretty = true
      continue
    }
    if (arg === '--quiet') {
      opcoes.quiet = true
      continue
    }
    if (arg === '--out') {
      i += 1
      opcoes.out = argv[i]
      continue
    }
    if (arg === '--source-date') {
      i += 1
      opcoes.sourceDate = argv[i]
      continue
    }
    if (arg === '--temas') {
      i += 1
      opcoes.temas = argv[i]
      continue
    }
    if (numericas[arg] !== undefined) {
      i += 1
      const valor = Number(argv[i])
      if (!Number.isFinite(valor)) throw new Error(`Valor inválido para ${arg}`)
      opcoes[numericas[arg]] = valor
      continue
    }
    if (arg.startsWith('-')) throw new Error(`Opção desconhecida: ${arg}`)
    if (opcoes.entrada !== null) throw new Error('Informe apenas um arquivo CSV.')
    opcoes.entrada = arg
  }

  if (opcoes.entrada === null) throw new Error('Falta o caminho do CSV. Use --help.')
  return { ajuda: false, opcoes }
}

const AJUDA = `
build-dataset — filtra e estratifica o dump de puzzles do Lichess (CC0).

  node scripts/puzzles/build-dataset.mjs <arquivo.csv> [opções]

  --out <arquivo>        saída JSON (padrão ${PADROES.out})
  --min-rating <n>       padrão ${PADROES.minRating}
  --max-rating <n>       padrão ${PADROES.maxRating}
  --min-popularity <n>   padrão ${PADROES.minPopularity}
  --min-plays <n>        padrão ${PADROES.minPlays}
  --per-bucket <n>       máximo por faixa de rating × habilidade (padrão ${PADROES.perBucket})
  --max-total <n>        teto do artefato (padrão ${PADROES.maxTotal})
  --source-date <ISO>    data em que o dump foi baixado
  --limit <n>            lê só as N primeiras linhas (teste)
  --temas <arquivo>      mapa tema→habilidade (padrão ${CONFIGURACAO_TEMAS.saidaRelativa})
  --pretty               JSON indentado
  --quiet                sem progresso

O dump NÃO é baixado por este script. Veja o cabeçalho do arquivo.
`

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

async function sha256(caminho) {
  const hash = createHash('sha256')
  let bytes = 0
  await new Promise((ok, falha) => {
    const stream = createReadStream(caminho)
    stream.on('data', (pedaco) => {
      bytes += pedaco.length
      hash.update(pedaco)
    })
    stream.on('end', ok)
    stream.on('error', falha)
  })
  return { sha256: hash.digest('hex'), bytes }
}

function faixaDe(rating) {
  return FAIXAS_DE_RATING.find((faixa) => rating >= faixa.min && rating <= faixa.max) ?? null
}

async function main() {
  const lido = lerArgumentos(process.argv.slice(2))
  if (lido.ajuda) {
    process.stdout.write(AJUDA)
    return
  }
  const opcoes = lido.opcoes
  const entrada = resolve(process.cwd(), opcoes.entrada)
  const saida = resolve(process.cwd(), opcoes.out)
  const log = (texto) => {
    if (!opcoes.quiet) process.stderr.write(`${texto}\n`)
  }

  // Carrega ANTES de abrir o dump: se o mapa estiver inutilizável, morrer aqui
  // custa um segundo; morrer depois custa a leitura inteira de alguns GB.
  const temaParaSkills = carregarTemaParaSkills(resolve(process.cwd(), opcoes.temas))
  log(`${Object.keys(temaParaSkills).length} temas suportados`)

  log(`Lendo ${entrada}`)
  const fonte = await sha256(entrada)
  log(`sha256 ${fonte.sha256} (${fonte.bytes} bytes)`)

  const contagens = {
    linhasLidas: 0,
    cabecalhoPulado: 0,
    linhasInvalidas: 0,
    foraDoFiltro: 0,
    semTemaSuportado: 0,
    reprovadasNaValidacao: 0,
    aceitas: 0,
  }
  const amostraDeErros = []
  /** Um bucket por (faixa de rating × habilidade). */
  const buckets = new Map()

  const leitor = createInterface({
    input: createReadStream(entrada, { encoding: 'utf8' }),
    crlfDelay: Number.POSITIVE_INFINITY,
  })

  let primeira = true
  for await (const linha of leitor) {
    if (primeira) {
      primeira = false
      if (linha.startsWith('PuzzleId')) {
        contagens.cabecalhoPulado = 1
        continue
      }
    }
    if (linha.trim() === '') continue
    if (opcoes.limit !== null && contagens.linhasLidas >= opcoes.limit) break
    contagens.linhasLidas += 1

    const resultado = parseLinha(linha, temaParaSkills)
    if (resultado.erro !== undefined) {
      contagens.linhasInvalidas += 1
      if (amostraDeErros.length < 50) amostraDeErros.push(resultado.erro)
      continue
    }

    const puzzle = resultado.puzzle
    const faixa = faixaDe(puzzle.rating)

    if (
      faixa === null ||
      puzzle.rating < opcoes.minRating ||
      puzzle.rating > opcoes.maxRating ||
      (puzzle.popularity !== null && puzzle.popularity < opcoes.minPopularity) ||
      (puzzle.nbPlays !== null && puzzle.nbPlays < opcoes.minPlays)
    ) {
      contagens.foraDoFiltro += 1
      continue
    }

    if (puzzle.skillIds.length === 0) {
      contagens.semTemaSuportado += 1
      continue
    }

    const solvable = toSolvable(puzzle)
    const validacao =
      solvable === null
        ? { valido: false, motivo: 'lance preparatório ilegal' }
        : validateSolution(solvable)
    if (!validacao.valido) {
      contagens.reprovadasNaValidacao += 1
      if (amostraDeErros.length < 50) amostraDeErros.push(`${puzzle.id}: ${validacao.motivo}`)
      continue
    }

    // Estratifica por faixa de rating E por habilidade: um puzzle com duas
    // habilidades concorre nos dois buckets, mas só entra uma vez no artefato.
    let entrou = false
    for (const skill of puzzle.skillIds) {
      const chave = `${faixa.id}|${skill}`
      let bucket = buckets.get(chave)
      if (bucket === undefined) {
        bucket = criarBucket(opcoes.perBucket)
        buckets.set(chave, bucket)
      }
      if (bucket.oferecer(puzzle)) entrou = true
    }
    if (entrou) contagens.aceitas += 1

    if (!opcoes.quiet && contagens.linhasLidas % 250000 === 0) {
      log(`  ${contagens.linhasLidas} linhas lidas...`)
    }
  }

  // Dedup: o mesmo puzzle pode estar em mais de um bucket.
  const porId = new Map()
  const porFaixa = {}
  const porSkill = {}
  for (const [chave, bucket] of buckets) {
    const [faixaId, skill] = chave.split('|')
    porFaixa[faixaId] = (porFaixa[faixaId] ?? 0) + bucket.itens.length
    porSkill[skill] = (porSkill[skill] ?? 0) + bucket.itens.length
    for (const item of bucket.itens) porId.set(item.puzzle.id, item)
  }

  // Ordem final estável: pelo hash, depois pelo id. Não depende do arquivo.
  const selecionados = [...porId.values()]
    .sort((a, b) => (a.peso !== b.peso ? a.peso - b.peso : a.puzzle.id.localeCompare(b.puzzle.id)))
    .slice(0, opcoes.maxTotal)
    .map((item) => item.puzzle)

  const porTema = {}
  for (const puzzle of selecionados) {
    for (const tema of puzzle.themes) porTema[tema] = (porTema[tema] ?? 0) + 1
  }

  const artefato = {
    meta: {
      formato: 'lancezero.puzzles.v1',
      geradoEm: new Date().toISOString(),
      fonte: {
        nome: 'Lichess open puzzle database',
        licenca: 'CC0-1.0',
        url: 'https://database.lichess.org/#puzzles',
        arquivo: opcoes.entrada,
        sha256: fonte.sha256,
        bytes: fonte.bytes,
        dataInformada: opcoes.sourceDate ?? new Date().toISOString().slice(0, 10),
      },
      filtros: {
        minRating: opcoes.minRating,
        maxRating: opcoes.maxRating,
        minPopularity: opcoes.minPopularity,
        minPlays: opcoes.minPlays,
        perBucket: opcoes.perBucket,
        maxTotal: opcoes.maxTotal,
        faixasDeRating: FAIXAS_DE_RATING.map((faixa) => faixa.id),
      },
      contagens: { ...contagens, selecionadas: selecionados.length },
      estratificacao: { porFaixaDeRating: porFaixa, porHabilidade: porSkill, porTema },
      amostraDeErros,
    },
    puzzles: selecionados,
  }

  await mkdir(dirname(saida), { recursive: true })
  await writeFile(saida, JSON.stringify(artefato, null, opcoes.pretty ? 2 : 0), 'utf8')

  log(`Escrito ${saida}`)
  log(
    `  lidas ${contagens.linhasLidas} | inválidas ${contagens.linhasInvalidas} | ` +
      `fora do filtro ${contagens.foraDoFiltro} | sem tema ${contagens.semTemaSuportado} | ` +
      `reprovadas ${contagens.reprovadasNaValidacao} | selecionadas ${selecionados.length}`,
  )
}

main().catch((erro) => {
  process.stderr.write(`${erro instanceof Error ? erro.message : String(erro)}\n`)
  process.exitCode = 1
})
