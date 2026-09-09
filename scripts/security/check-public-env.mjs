/**
 * Falha se um segredo puder vazar para o bundle do navegador.
 *
 * `NEXT_PUBLIC_` é embutido no JavaScript entregue ao usuário. Qualquer chave
 * secreta com esse prefixo é pública, ainda que o nome diga o contrário.
 * Seção 41 do plano de segurança; regra 4 do ADR-0008.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const RAIZES = ['src', 'scripts', '.github']
const PALAVRAS_DE_SEGREDO = [
  'SECRET',
  'SERVICE_ROLE',
  'PRIVATE',
  'PASSWORD',
  'TOKEN',
  'API_KEY',
]
/** Chaves publicáveis de propósito, apesar do nome parecer sensível. */
const PERMITIDAS = new Set(['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_URL'])

function* arquivos(dir) {
  let entradas
  try {
    entradas = readdirSync(dir)
  } catch {
    return
  }
  for (const entrada of entradas) {
    const caminho = join(dir, entrada)
    if (statSync(caminho).isDirectory()) {
      yield* arquivos(caminho)
    } else if (/\.(ts|tsx|mjs|js|yml|yaml)$/.test(entrada)) {
      yield caminho
    }
  }
}

/**
 * Remove comentários antes de varrer.
 *
 * Sem isto, o verificador acusa a própria documentação da regra: os arquivos
 * que explicam "nunca use NEXT_PUBLIC_ em segredo" precisam citar exemplos
 * proibidos no texto. Ferramenta que dispara em falso positivo é ferramenta que
 * as pessoas aprendem a ignorar — e aí ela deixa de proteger no dia que importa.
 */
function semComentarios(texto, arquivo) {
  if (/\.ya?ml$/.test(arquivo)) {
    return texto.replace(/(^|\s)#[^\r\n]*/g, ' ')
  }
  return texto.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\r\n]*/g, ' ')
}

const problemas = []
for (const raiz of RAIZES) {
  for (const arquivo of arquivos(raiz)) {
    const texto = semComentarios(readFileSync(arquivo, 'utf8'), arquivo)
    for (const achado of texto.matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g)) {
      const nome = achado[0]
      if (PERMITIDAS.has(nome)) continue
      if (PALAVRAS_DE_SEGREDO.some((palavra) => nome.includes(palavra))) {
        problemas.push(`${arquivo}: ${nome}`)
      }
    }
  }
}

if (problemas.length > 0) {
  console.error('Segredo com prefixo NEXT_PUBLIC_ — isso vai para o bundle do navegador:')
  for (const p of problemas) console.error('  ' + p)
  process.exit(1)
}
console.log('OK: nenhum segredo com prefixo NEXT_PUBLIC_.')
