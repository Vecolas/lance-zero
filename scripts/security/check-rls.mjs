/**
 * Falha se alguém desabilitar RLS ou afrouxar uma policy.
 *
 * Regra 1 do ADR-0008: nunca desabilitar RLS, nem "temporariamente". Tabela nova
 * com `user_id` sem RLS é release blocker. Este script existe para que a regra
 * não dependa de alguém lembrar dela na revisão.
 *
 * Roda sem banco: lê o SQL como texto.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DIR = 'supabase'

function* sqlFiles(dir) {
  let entradas
  try {
    entradas = readdirSync(dir)
  } catch {
    return
  }
  for (const entrada of entradas) {
    const caminho = join(dir, entrada)
    if (statSync(caminho).isDirectory()) yield* sqlFiles(caminho)
    else if (entrada.endsWith('.sql')) yield caminho
  }
}

const arquivos = [...sqlFiles(DIR)]
if (arquivos.length === 0) {
  console.log('OK: ainda não há migrations em supabase/. Nada a verificar.')
  process.exit(0)
}

const problemas = []
let sqlCompleto = ''

for (const arquivo of arquivos) {
  const texto = readFileSync(arquivo, 'utf8')
  sqlCompleto += '\n' + texto
  const semComentario = texto.replace(/--[^\n]*/g, '')

  if (/disable\s+row\s+level\s+security/i.test(semComentario)) {
    problemas.push(`${arquivo}: desabilita RLS`)
  }
  if (/using\s*\(\s*true\s*\)/i.test(semComentario)) {
    problemas.push(`${arquivo}: policy com using (true)`)
  }
  if (/with\s+check\s*\(\s*true\s*\)/i.test(semComentario)) {
    problemas.push(`${arquivo}: policy com with check (true)`)
  }
  if (/grant\s+all[\s\S]{0,80}?to\s+anon/i.test(semComentario)) {
    problemas.push(`${arquivo}: grant all para anon`)
  }
}

// Toda tabela com user_id precisa aparecer num enable row level security.
const semComentarios = sqlCompleto.replace(/--[^\n]*/g, '')
const comRls = new Set(
  [
    ...semComentarios.matchAll(
      /alter\s+table\s+(?:public\.)?(\w+)\s+enable\s+row\s+level\s+security/gi,
    ),
  ].map((m) => m[1].toLowerCase()),
)

for (const criacao of semComentarios.matchAll(
  /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)\s*\(([\s\S]*?)\n\s*\);/gi,
)) {
  const tabela = criacao[1].toLowerCase()
  const corpo = criacao[2]
  if (/\buser_id\b/.test(corpo) && !comRls.has(tabela)) {
    problemas.push(`tabela "${tabela}" tem user_id e não habilita RLS`)
  }
}

if (problemas.length > 0) {
  console.error('Violação das regras de RLS do ADR-0008:')
  for (const p of problemas) console.error('  ' + p)
  process.exit(1)
}
console.log(`OK: ${arquivos.length} arquivo(s) SQL, ${comRls.size} tabela(s) com RLS habilitada.`)
