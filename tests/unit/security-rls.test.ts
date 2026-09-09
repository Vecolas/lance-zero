/**
 * Rede de seguranca da RLS.
 *
 * Nao existe banco provisionado, entao este teste nao prova que a RLS funciona:
 * isso e o teste Alice/Bob com duas sessoes reais (secao 29 do plano), que
 * continua sendo release blocker.
 *
 * O que este teste faz e ler as migrations como TEXTO e travar as regras do
 * ADR-0008 e das secoes 14 a 19 do plano, para que ninguem afrouxe a RLS sem
 * que o PR fique vermelho.
 *
 * Os arquivos sao descobertos varrendo supabase/**, nao por lista fixa:
 * migration nova entra na cobertura sozinha. A varredura e recursiva e feita
 * com readdirSync para nao precisar de dependencia nova so para casar `**`.
 *
 * Autenticacao e Supabase Auth (alternativa B da secao 4 do plano). A ponte
 * antiga de JWT de terceiro, `auth.jwt()->>'sub'`, nao pode sobrar em lugar
 * nenhum: a identidade agora e `auth.uid()`, uuid nativo. Um arquivo que ainda
 * use a forma antiga compila, aplica e falha em silencio comparando texto com
 * uuid — por isso o resquicio e testado, nao apenas a forma nova.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const RAIZ_SUPABASE = join(process.cwd(), 'supabase')

const PAPEIS_DE_CLIENTE = ['anon', 'authenticated']

/** Privilegios que o papel anonimo nunca pode receber. */
const PRIVILEGIOS_PROIBIDOS_PARA_ANON = ['all', 'insert', 'update', 'delete', 'truncate']

// ---------------------------------------------------------------------------
// Leitura dos arquivos
// ---------------------------------------------------------------------------

function listarArquivosSql(diretorio: string): string[] {
  const encontrados: string[] = []

  for (const entrada of readdirSync(diretorio, { withFileTypes: true })) {
    const caminho = join(diretorio, entrada.name)

    if (entrada.isDirectory()) {
      encontrados.push(...listarArquivosSql(caminho))
      continue
    }

    if (entrada.name.toLowerCase().endsWith('.sql')) {
      encontrados.push(caminho)
    }
  }

  return encontrados.sort()
}

// ---------------------------------------------------------------------------
// Tokenizacao minima de SQL
//
// Nao e um parser de Postgres. E o suficiente para nao se enganar com ponto e
// virgula dentro de string, comentario dentro de corpo de funcao e afins, que e
// exatamente onde uma checagem por regex ingenua erraria.
// ---------------------------------------------------------------------------

/** Indice logo apos o delimitador de fechamento, tratando aspas duplicadas. */
function fimDelimitado(sql: string, inicio: number, delimitador: string): number {
  let i = inicio + 1

  while (i < sql.length) {
    if (sql[i] === delimitador) {
      if (sql[i + 1] === delimitador) {
        i += 2
        continue
      }
      return i + 1
    }
    i += 1
  }

  return sql.length
}

/** Indice logo apos o `$$` de fechamento de um corpo de funcao. */
function fimDolarDuplo(sql: string, inicio: number): number {
  const fim = sql.indexOf('$$', inicio + 2)
  return fim === -1 ? sql.length : fim + 2
}

function removerComentarios(sql: string): string {
  let saida = ''
  let i = 0

  while (i < sql.length) {
    const par = sql.slice(i, i + 2)
    const atual = sql[i]

    if (par === '--') {
      while (i < sql.length && sql[i] !== '\n') {
        i += 1
      }
      continue
    }

    if (par === '/*') {
      i += 2
      while (i < sql.length && sql.slice(i, i + 2) !== '*/') {
        i += 1
      }
      i += 2
      continue
    }

    if (par === '$$') {
      const fim = fimDolarDuplo(sql, i)
      saida += sql.slice(i, fim)
      i = fim
      continue
    }

    if (atual === "'" || atual === '"') {
      const fim = fimDelimitado(sql, i, atual)
      saida += sql.slice(i, fim)
      i = fim
      continue
    }

    saida += atual
    i += 1
  }

  return saida
}

function dividirStatements(sql: string): string[] {
  const statements: string[] = []
  let acumulado = ''
  let i = 0

  while (i < sql.length) {
    const par = sql.slice(i, i + 2)
    const atual = sql[i]

    if (par === '$$') {
      const fim = fimDolarDuplo(sql, i)
      acumulado += sql.slice(i, fim)
      i = fim
      continue
    }

    if (atual === "'" || atual === '"') {
      const fim = fimDelimitado(sql, i, atual)
      acumulado += sql.slice(i, fim)
      i = fim
      continue
    }

    if (atual === ';') {
      statements.push(acumulado)
      acumulado = ''
      i += 1
      continue
    }

    acumulado += atual
    i += 1
  }

  statements.push(acumulado)

  return statements.map((texto) => texto.trim()).filter((texto) => texto !== '')
}

// ---------------------------------------------------------------------------
// Modelo do que foi lido
// ---------------------------------------------------------------------------

type Statement = {
  arquivo: string
  /** Texto original do statement, sem comentarios. */
  texto: string
  /** Minusculas e espacos colapsados, para casar padrao sem depender de layout. */
  normalizado: string
}

type Tabela = {
  arquivo: string
  nome: string
  temUserId: boolean
  /** Corpo do `create table`, normalizado, para checar tipo e referencia. */
  normalizado: string
}

type Policy = {
  arquivo: string
  nome: string
  tabela: string
  comando: string
  papeis: string[]
  normalizado: string
}

type Grant = {
  arquivo: string
  privilegios: string[]
  alvo: string
  papeis: string[]
  normalizado: string
}

/** Remove aspas e o schema `public.`, que e implicito no resto do projeto. */
function normalizarNomeDeTabela(bruto: string): string {
  const semAspas = bruto.replaceAll('"', '').toLowerCase()
  return semAspas.startsWith('public.') ? semAspas.slice('public.'.length) : semAspas
}

function separarLista(bruto: string): string[] {
  return bruto
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '')
}

const arquivosSql = listarArquivosSql(RAIZ_SUPABASE)

const conteudoBruto = new Map(
  arquivosSql.map((caminho) => [relative(process.cwd(), caminho), readFileSync(caminho, 'utf8')]),
)

const statements: Statement[] = []

for (const [arquivo, bruto] of conteudoBruto) {
  for (const texto of dividirStatements(removerComentarios(bruto))) {
    statements.push({
      arquivo,
      texto,
      normalizado: texto.replace(/\s+/g, ' ').toLowerCase(),
    })
  }
}

const tabelas: Tabela[] = []

for (const statement of statements) {
  const criacao = /^create table (?:if not exists )?([a-z0-9_."]+) ?\(/.exec(statement.normalizado)

  if (criacao === null) {
    continue
  }

  tabelas.push({
    arquivo: statement.arquivo,
    nome: normalizarNomeDeTabela(criacao[1]),
    temUserId: /\buser_id\b/.test(statement.normalizado),
    normalizado: statement.normalizado,
  })
}

const tabelasComUserId = tabelas.filter((tabela) => tabela.temUserId)

const tabelasComRlsLigada = new Set(
  statements
    .map((statement) =>
      /^alter table (?:if exists )?([a-z0-9_."]+) enable row level security$/.exec(
        statement.normalizado,
      ),
    )
    .filter((casado): casado is RegExpExecArray => casado !== null)
    .map((casado) => normalizarNomeDeTabela(casado[1])),
)

const policies: Policy[] = []

for (const statement of statements) {
  const cabecalho = /^create policy ("[^"]+"|[a-z0-9_]+) on ([a-z0-9_."]+) /.exec(
    statement.normalizado,
  )

  if (cabecalho === null) {
    continue
  }

  const comando = / for (select|insert|update|delete|all) /.exec(statement.normalizado)
  const papeis = / to ([a-z0-9_, ]+?) (?:using|with check)/.exec(statement.normalizado)

  policies.push({
    arquivo: statement.arquivo,
    nome: cabecalho[1].replaceAll('"', ''),
    tabela: normalizarNomeDeTabela(cabecalho[2]),
    comando: comando === null ? 'desconhecido' : comando[1],
    papeis: papeis === null ? [] : separarLista(papeis[1]),
    normalizado: statement.normalizado,
  })
}

const grants: Grant[] = []

for (const statement of statements) {
  const casado = /^grant ([a-z, ]+?) on (.+?) to ([a-z0-9_, ]+)$/.exec(statement.normalizado)

  if (casado === null) {
    continue
  }

  grants.push({
    arquivo: statement.arquivo,
    privilegios: separarLista(casado[1]),
    alvo: casado[2].trim(),
    papeis: separarLista(casado[3]),
    normalizado: statement.normalizado,
  })
}

function policiesDaTabela(tabela: string, comando: string): Policy[] {
  return policies.filter((policy) => policy.tabela === tabela && policy.comando === comando)
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('migrations do Supabase', () => {
  it('encontra os arquivos .sql varrendo o diretorio', () => {
    // Se a varredura voltar vazia, todo o resto passaria por vacuidade.
    expect(arquivosSql.length).toBeGreaterThan(0)
    expect(statements.length).toBeGreaterThan(0)
  })

  it('cobre as migrations esperadas de perfil, RLS, storage e sincronizacao', () => {
    const nomes = [...conteudoBruto.keys()].map((caminho) => caminho.replaceAll('\\', '/'))

    expect(nomes).toContain('supabase/migrations/0001_perfil.sql')
    expect(nomes).toContain('supabase/migrations/0002_rls.sql')
    expect(nomes).toContain('supabase/migrations/0003_storage_avatar.sql')
    expect(nomes).toContain('supabase/migrations/0004_sync.sql')
  })

  it('cria pelo menos uma tabela com user_id', () => {
    expect(tabelasComUserId.map((tabela) => tabela.nome)).toEqual(
      expect.arrayContaining(['profiles', 'user_settings', 'linked_chess_accounts', 'user_state']),
    )
  })
})

describe('identidade vem do Supabase Auth', () => {
  it('nenhum arquivo ainda usa a ponte de JWT do provedor anterior', () => {
    // Resquicio da arquitetura Clerk. Se sobrar, o SQL aplica sem erro e a
    // policy passa a comparar texto com uuid — falha silenciosa, o pior caso.
    const culpados: string[] = []

    for (const [arquivo, bruto] of conteudoBruto) {
      // Texto bruto de proposito: nem comentado isso pode ficar, porque
      // comentario vira codigo com uma tecla.
      if (/auth\.jwt\s*\(/i.test(bruto)) {
        culpados.push(arquivo)
      }
    }

    expect(culpados).toEqual([])
  })

  it('toda coluna user_id e uuid e referencia auth.users', () => {
    // Sem a FK, um user_id pode apontar para conta inexistente e a linha
    // sobrevive a exclusao do usuario. Com ela, o cascade limpa tudo junto.
    const soltas = tabelasComUserId
      .filter(
        (tabela) =>
          !/\buser_id uuid\b[^,]*\breferences auth\.users ?\( ?id ?\)/.test(tabela.normalizado),
      )
      .map((tabela) => `${tabela.nome} (${tabela.arquivo})`)

    expect(soltas).toEqual([])
  })

  it('a exclusao do usuario propaga para as tabelas com user_id', () => {
    const semCascade = tabelasComUserId
      .filter(
        (tabela) =>
          !/\breferences auth\.users ?\( ?id ?\) on delete cascade/.test(tabela.normalizado),
      )
      .map((tabela) => `${tabela.nome} (${tabela.arquivo})`)

    expect(semCascade).toEqual([])
  })
})

describe('RLS ligada', () => {
  it('toda tabela criada com user_id tem enable row level security', () => {
    const semRls = tabelasComUserId
      .filter((tabela) => !tabelasComRlsLigada.has(tabela.nome))
      .map((tabela) => `${tabela.nome} (${tabela.arquivo})`)

    // Tabela com user_id sem RLS e release blocker (ADR-0008, regra 1).
    expect(semRls).toEqual([])
  })

  it('nenhum arquivo desliga RLS', () => {
    const culpados: string[] = []

    for (const [arquivo, bruto] of conteudoBruto) {
      // Busca no texto bruto de proposito: nem comentado isso pode aparecer,
      // porque comentario vira codigo com uma tecla.
      if (/disable\s+row\s+level\s+security/i.test(bruto)) {
        culpados.push(arquivo)
      }
    }

    expect(culpados).toEqual([])
  })

  it('nenhum arquivo desliga a RLS por atributo de papel', () => {
    const culpados: string[] = []

    for (const [arquivo, bruto] of conteudoBruto) {
      if (/\bbypassrls\b/i.test(bruto)) {
        culpados.push(arquivo)
      }
    }

    expect(culpados).toEqual([])
  })
})

describe('policies', () => {
  it('cada tabela com user_id tem policy de select, insert e update', () => {
    const faltando: string[] = []

    for (const tabela of tabelasComUserId) {
      for (const comando of ['select', 'insert', 'update']) {
        if (policiesDaTabela(tabela.nome, comando).length === 0) {
          faltando.push(`${tabela.nome}: falta policy de ${comando}`)
        }
      }
    }

    expect(faltando).toEqual([])
  })

  it('nenhuma tabela com user_id libera delete para o cliente', () => {
    // Secao 18: exclusao de conta e operacao sensivel de servidor.
    const liberadas = policies
      .filter((policy) => policy.comando === 'delete' || policy.comando === 'all')
      .filter((policy) => policy.papeis.some((papel) => PAPEIS_DE_CLIENTE.includes(papel)))
      .map((policy) => `${policy.tabela}.${policy.nome} (${policy.arquivo})`)

    expect(liberadas).toEqual([])
  })

  it('nenhuma policy usa using (true) ou with check (true)', () => {
    const permissivas = policies
      .filter((policy) =>
        /\b(?:using|with check) \(\s*(?:true|1 ?= ?1)\s*\)/.test(policy.normalizado),
      )
      .map((policy) => `${policy.tabela}.${policy.nome} (${policy.arquivo})`)

    expect(permissivas).toEqual([])
  })

  it('toda policy compara com auth.uid(), nunca com identificador do cliente', () => {
    const semUid = policies
      .filter((policy) => !policy.normalizado.includes('auth.uid()'))
      .map((policy) => `${policy.tabela}.${policy.nome} (${policy.arquivo})`)

    expect(semUid).toEqual([])
  })

  it('nenhuma policy usa auth.jwt(), que era a ponte do provedor anterior', () => {
    const antigas = policies
      .filter((policy) => policy.normalizado.includes('auth.jwt('))
      .map((policy) => `${policy.tabela}.${policy.nome} (${policy.arquivo})`)

    expect(antigas).toEqual([])
  })

  it('policy de tabela com user_id casa a coluna com o dono da sessao', () => {
    // Nao basta mencionar auth.uid() em algum lugar da expressao: a linha
    // alcancada precisa ser a do dono.
    const nomesComUserId = new Set(tabelasComUserId.map((tabela) => tabela.nome))

    const frouxas = policies
      .filter((policy) => nomesComUserId.has(policy.tabela))
      .filter((policy) => !policy.normalizado.includes('user_id = (select auth.uid())'))
      .map((policy) => `${policy.tabela}.${policy.nome} (${policy.arquivo})`)

    expect(frouxas).toEqual([])
  })

  it('nenhuma policy le a identidade de current_setting ou de parametro solto', () => {
    // current_setting('request.*') e cabecalho controlavel pelo cliente em
    // varias configuracoes. A identidade vem do JWT verificado, ponto.
    const suspeitas = policies
      .filter(
        (policy) =>
          policy.normalizado.includes('current_setting(') ||
          policy.normalizado.includes('request.header') ||
          /\$\d/.test(policy.normalizado),
      )
      .map((policy) => `${policy.tabela}.${policy.nome} (${policy.arquivo})`)

    expect(suspeitas).toEqual([])
  })

  it('toda policy declara explicitamente o papel a que se aplica', () => {
    // Sem `to <papel>`, a policy vale para PUBLIC, inclusive anon.
    const semPapel = policies
      .filter((policy) => policy.papeis.length === 0 || policy.papeis.includes('public'))
      .map((policy) => `${policy.tabela}.${policy.nome} (${policy.arquivo})`)

    expect(semPapel).toEqual([])
  })

  it('nenhuma policy de tabela com user_id se aplica ao papel anonimo', () => {
    const nomesComUserId = new Set(tabelasComUserId.map((tabela) => tabela.nome))

    const expostas = policies
      .filter((policy) => nomesComUserId.has(policy.tabela))
      .filter((policy) => policy.papeis.includes('anon'))
      .map((policy) => `${policy.tabela}.${policy.nome} (${policy.arquivo})`)

    expect(expostas).toEqual([])
  })

  it('policy de update tambem tem with check', () => {
    // So com USING, o usuario poderia reescrever user_id e doar a linha.
    const semWithCheck = policies
      .filter((policy) => policy.comando === 'update')
      .filter((policy) => !policy.normalizado.includes('with check'))
      .map((policy) => `${policy.tabela}.${policy.nome} (${policy.arquivo})`)

    expect(semWithCheck).toEqual([])
  })
})

describe('grants', () => {
  it('nao existe grant all para anon', () => {
    const largos = grants
      .filter((grant) => grant.papeis.includes('anon'))
      .filter((grant) => grant.privilegios.some((privilegio) => privilegio.startsWith('all')))
      .map((grant) => `${grant.alvo} (${grant.arquivo})`)

    expect(largos).toEqual([])
  })

  it('anon nunca recebe privilegio de escrita', () => {
    const escritas = grants
      .filter((grant) => grant.papeis.includes('anon'))
      .filter((grant) =>
        grant.privilegios.some((privilegio) =>
          PRIVILEGIOS_PROIBIDOS_PARA_ANON.some((proibido) => privilegio.startsWith(proibido)),
        ),
      )
      .map((grant) => `${grant.alvo} (${grant.arquivo})`)

    expect(escritas).toEqual([])
  })

  it('nao existe grant all para authenticated', () => {
    // RLS nao substitui grant: o papel autenticado recebe so o necessario.
    const largos = grants
      .filter((grant) => grant.papeis.includes('authenticated'))
      .filter((grant) => grant.privilegios.some((privilegio) => privilegio.startsWith('all')))
      .map((grant) => `${grant.alvo} (${grant.arquivo})`)

    expect(largos).toEqual([])
  })

  it('nenhum grant de delete para papel de cliente', () => {
    const deletes = grants
      .filter((grant) => grant.papeis.some((papel) => PAPEIS_DE_CLIENTE.includes(papel)))
      .filter((grant) => grant.privilegios.includes('delete'))
      .map((grant) => `${grant.alvo} (${grant.arquivo})`)

    expect(deletes).toEqual([])
  })

  it('cada tabela com user_id revoga tudo dos papeis de cliente antes de conceder', () => {
    const faltando: string[] = []

    for (const tabela of tabelasComUserId) {
      for (const papel of PAPEIS_DE_CLIENTE) {
        const revogou = statements.some((statement) =>
          new RegExp(`^revoke all on (?:public\\.)?${tabela.nome}\\b.* from .*\\b${papel}\\b`).test(
            statement.normalizado,
          ),
        )

        if (!revogou) {
          faltando.push(`${tabela.nome}: falta revoke all de ${papel}`)
        }
      }
    }

    expect(faltando).toEqual([])
  })
})

describe('regras de schema do plano', () => {
  const perfil = conteudoBruto.get(join('supabase', 'migrations', '0001_perfil.sql')) ?? ''

  it('encontra a migration de perfil', () => {
    expect(perfil).not.toBe('')
  })

  it('limita rating_estimate entre 100 e 4000', () => {
    expect(perfil.replace(/\s+/g, ' ')).toContain('rating_estimate between 100 and 4000')
  })

  it('restringe username a 3-24 caracteres ASCII seguros', () => {
    expect(perfil).toContain("'^[A-Za-z0-9_-]{3,24}$'")
  })

  it('nasce privado por padrao', () => {
    expect(perfil.replace(/\s+/g, ' ')).toContain(
      "profile_visibility text not null default 'private'",
    )
  })

  it('reserva os usernames da secao 10', () => {
    const reservados = [
      'admin',
      'administrator',
      'support',
      'staff',
      'moderator',
      'lancezero',
      'security',
      'api',
    ]

    for (const reservado of reservados) {
      expect(perfil, `username reservado ausente: ${reservado}`).toContain(`('${reservado}')`)
    }
  })

  it('bloqueia username reservado por trigger', () => {
    const normalizado = perfil.replace(/\s+/g, ' ').toLowerCase()

    expect(normalizado).toContain('before insert or update of username on public.profiles')
    expect(normalizado).toContain('execute function public.assert_username_permitido()')
  })

  it('mantem updated_at por trigger, nao pelo cliente', () => {
    const normalizado = perfil.replace(/\s+/g, ' ').toLowerCase()

    expect(normalizado).toContain('execute function public.set_updated_at()')
  })

  it('nao guarda credencial em tabela de perfil', () => {
    // Secao 13: nada de senha, sessao, token ou segredo no banco de perfil.
    const proibidos = [
      'password',
      'password_hash',
      'refresh_token',
      'session_token',
      'mfa_secret',
      'secret_key',
    ]

    for (const [arquivo, bruto] of conteudoBruto) {
      const semComentarios = removerComentarios(bruto).toLowerCase()

      for (const proibido of proibidos) {
        expect(semComentarios, `${arquivo} menciona ${proibido}`).not.toContain(proibido)
      }
    }
  })
})

describe('user_state — sincronizacao entre aparelhos', () => {
  const sync = tabelas.find((tabela) => tabela.nome === 'user_state')

  it('existe a tabela de sincronizacao', () => {
    expect(sync).toBeDefined()
  })

  it('tem teto de tamanho do payload', () => {
    // 500 MB de banco no plano gratuito e recurso finito. Sem teto, um cliente
    // com bug enche o banco de todo mundo e a falha aparece para quem nao errou.
    expect(sync?.normalizado ?? '').toContain('pg_column_size(payload)')

    const temLimite = /pg_column_size\(payload\) <= \d+/.test(sync?.normalizado ?? '')

    expect(temLimite).toBe(true)
  })

  it('guarda um documento por usuario, com user_id como chave primaria', () => {
    // Sem id de linha proprio nao existe identificador para trocar na URL: a
    // chave primaria e a policy dizem a mesma coisa.
    expect(sync?.normalizado ?? '').toContain('user_id uuid primary key')
  })

  it('guarda a versao do schema junto do payload', () => {
    // Cliente antigo precisa poder recusar um documento futuro em vez de
    // adivinhar o formato.
    expect(sync?.normalizado ?? '').toContain('schema_version integer not null')
  })

  it('registra o momento da ultima escrita para a UI avisar do conflito', () => {
    // Ultima escrita vence e decisao de produto; updated_at e o que permite
    // avisar antes de sobrescrever.
    expect(sync?.normalizado ?? '').toContain('updated_at timestamptz not null')
  })
})

describe('funcoes e views', () => {
  it('nao usa SECURITY DEFINER sem revisao', () => {
    // Secao 130: evitar. Se algum dia for necessario, o teste falha e obriga a
    // decisao a passar por revisao explicita em vez de entrar de carona.
    const culpados: string[] = []

    for (const [arquivo, bruto] of conteudoBruto) {
      if (/security\s+definer/i.test(removerComentarios(bruto))) {
        culpados.push(arquivo)
      }
    }

    expect(culpados).toEqual([])
  })

  it('toda funcao criada fixa o search_path', () => {
    const semSearchPath = statements
      .filter((statement) => /^create (?:or replace )?function /.test(statement.normalizado))
      .filter((statement) => !statement.normalizado.includes('set search_path'))
      .map((statement) => statement.arquivo)

    expect(semSearchPath).toEqual([])
  })

  it('nao cria view sem security_invoker', () => {
    // Secao 129: view pode contornar a RLS esperada da tabela de base.
    const inseguras = statements
      .filter((statement) => /^create (?:or replace )?view /.test(statement.normalizado))
      .filter((statement) => !statement.normalizado.includes('security_invoker'))
      .map((statement) => statement.arquivo)

    expect(inseguras).toEqual([])
  })
})
