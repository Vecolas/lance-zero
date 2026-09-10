/**
 * Leitura das dependências DIRETAS declaradas em `pnpm-lock.yaml`.
 *
 * O QUE ESTE ARQUIVO FAZ: transforma o texto do lockfile na lista de pacotes
 * que o projeto pede por conta própria — nome, o que o `package.json` pede
 * (`specifier`) e a versão que de fato ficou instalada (`version`).
 *
 * DECISÕES QUE ESTE ARQUIVO CARREGA:
 *
 * 1. A FONTE é o `pnpm-lock.yaml`, não o `node_modules` e não o `package.json`.
 *    O `node_modules` varia com o cache de cada máquina e faria um portão
 *    reprovar por instalação diferente. O `package.json` não sabe a versão
 *    resolvida — só a faixa pedida —, e é justamente a versão resolvida que o
 *    inventário precisa declarar. O lockfile é versionado, igual para todo
 *    mundo, e é o único dos três que tem as duas informações.
 *
 * 2. Só o importador RAIZ (`.`). Um lockfile de workspace pode ter vários
 *    importadores; hoje o projeto tem um só. Se um segundo aparecer, ele é
 *    IGNORADO por este módulo, e essa é uma limitação declarada, não um acaso:
 *    `importadoresVistos` devolve todos os que foram encontrados, para que um
 *    portão possa reprovar quando surgir um importador que ninguém previu.
 *
 * 3. TODO grupo do importador raiz conta como direto — `dependencies`,
 *    `devDependencies`, `packageManagerDependencies` e qualquer grupo que o
 *    pnpm venha a criar. Aceitar grupo desconhecido erra para o lado de exigir
 *    linha no inventário a mais, que é o lado seguro; uma lista fechada de
 *    grupos abriria exatamente o ponto cego que este módulo existe para fechar.
 *
 * 4. Leitura por indentação, sem biblioteca de YAML. Não há dependência de
 *    YAML no projeto e adicionar uma para ler um arquivo de formato fixo custa
 *    mais do que resolve. O preço é declarado: se o pnpm mudar o formato, esta
 *    leitura devolve ZERO dependências — e portão que varreu zero tem de
 *    reprovar. A falha é ruidosa, não silenciosa.
 *
 * 5. O arquivo pode conter MAIS DE UM documento YAML (o pnpm grava o lockfile
 *    do próprio gerenciador de pacotes antes do lockfile do projeto). Todos são
 *    lidos e o resultado é a união.
 *
 * O módulo é puro: recebe o texto e devolve a leitura. Quem lê o disco é o
 * portão.
 */

/** Nome do importador do próprio projeto dentro do lockfile. */
export const IMPORTADOR_RAIZ = '.'

/**
 * Indentação de cada nível dentro de `importers:` no lockfile do pnpm (v9).
 * LIMITE DE FORMATO, não heurística de produto: é o formato que o pnpm grava.
 */
export const INDENTACAO = {
  importador: 2,
  grupo: 4,
  pacote: 6,
  campo: 8,
} as const

export interface DependenciaInstalada {
  /** Nome npm, exatamente como o lockfile o escreve. */
  nome: string
  /** Grupo do importador: `dependencies`, `devDependencies`, etc. */
  grupo: string
  /** O que o `package.json` pede. Pode ser faixa (`^14.6.7`). */
  especificador: string
  /** Versão realmente instalada, sem o sufixo de peers que o pnpm anexa. */
  versaoResolvida: string
  /** Linha no arquivo, 1-based, só para a mensagem de erro. */
  linha: number
}

export interface LeituraDoLockfile {
  diretas: DependenciaInstalada[]
  /** Todos os importadores encontrados, inclusive os que não são a raiz. */
  importadoresVistos: string[]
  /** Grupos encontrados no importador raiz, inclusive os vazios. */
  gruposVistos: string[]
  /** Quantos documentos YAML o arquivo continha. */
  documentos: number
}

const SEPARADOR_DE_DOCUMENTO = /^---\s*$/
const CHAVE_DE_TOPO = /^([A-Za-z][\w-]*):/

function nivel(linha: string): number {
  return linha.length - linha.trimStart().length
}

function semAspas(chave: string): string {
  return chave.replace(/^'(.*)'$/, '$1').replace(/^"(.*)"$/, '$1')
}

function chaveNoNivel(linha: string, indentacao: number): string | null {
  if (nivel(linha) !== indentacao) return null
  const conteudo = linha.trim()
  const fim = conteudo.lastIndexOf(':')
  if (fim < 0) return null
  const depois = conteudo.slice(fim + 1).trim()
  // `configDependencies: {}` é um grupo vazio; `specifier: 1.2.3` é campo.
  if (depois.length > 0 && depois !== '{}') return null
  return semAspas(conteudo.slice(0, fim).trim())
}

function campoNoNivel(linha: string, indentacao: number): [string, string] | null {
  if (nivel(linha) !== indentacao) return null
  const conteudo = linha.trim()
  const fim = conteudo.indexOf(':')
  if (fim < 0) return null
  const valor = conteudo.slice(fim + 1).trim()
  if (valor.length === 0) return null
  return [conteudo.slice(0, fim).trim(), semAspas(valor)]
}

/**
 * O pnpm anexa os peers resolvidos à versão:
 * `19.2.8(react@19.2.8)` é a versão `19.2.8`. Corta no primeiro parêntese.
 */
export function versaoSemPeers(versao: string): string {
  const abre = versao.indexOf('(')
  return (abre < 0 ? versao : versao.slice(0, abre)).trim()
}

export function lerDependenciasDiretas(lockfile: string): LeituraDoLockfile {
  const linhas = lockfile.split(/\r?\n/)
  const diretas: DependenciaInstalada[] = []
  const importadoresVistos: string[] = []
  const gruposVistos: string[] = []
  let documentos = 1

  let dentroDeImporters = false
  let importador: string | null = null
  let grupo: string | null = null
  let pacote: { nome: string; linha: number } | null = null
  let especificador = ''
  let versao = ''

  function fechaPacote() {
    if (pacote === null || importador !== IMPORTADOR_RAIZ || grupo === null) {
      pacote = null
      return
    }
    diretas.push({
      nome: pacote.nome,
      grupo,
      especificador,
      versaoResolvida: versaoSemPeers(versao),
      linha: pacote.linha,
    })
    pacote = null
    especificador = ''
    versao = ''
  }

  for (let i = 0; i < linhas.length; i += 1) {
    const linha = linhas[i]

    if (SEPARADOR_DE_DOCUMENTO.test(linha)) {
      fechaPacote()
      documentos += 1
      dentroDeImporters = false
      importador = null
      grupo = null
      continue
    }

    if (linha.trim().length === 0) continue

    const topo = CHAVE_DE_TOPO.exec(linha)
    if (topo) {
      fechaPacote()
      dentroDeImporters = topo[1] === 'importers'
      importador = null
      grupo = null
      continue
    }

    if (!dentroDeImporters) continue

    const novoImportador = chaveNoNivel(linha, INDENTACAO.importador)
    if (novoImportador !== null) {
      fechaPacote()
      importador = novoImportador
      grupo = null
      if (!importadoresVistos.includes(importador)) importadoresVistos.push(importador)
      continue
    }

    const novoGrupo = chaveNoNivel(linha, INDENTACAO.grupo)
    if (novoGrupo !== null) {
      fechaPacote()
      grupo = novoGrupo
      if (importador === IMPORTADOR_RAIZ && !gruposVistos.includes(grupo)) gruposVistos.push(grupo)
      continue
    }

    const novoPacote = chaveNoNivel(linha, INDENTACAO.pacote)
    if (novoPacote !== null) {
      fechaPacote()
      pacote = { nome: novoPacote, linha: i + 1 }
      especificador = ''
      versao = ''
      continue
    }

    const campo = campoNoNivel(linha, INDENTACAO.campo)
    if (campo !== null && pacote !== null) {
      if (campo[0] === 'specifier') especificador = campo[1]
      if (campo[0] === 'version') versao = campo[1]
    }
  }

  fechaPacote()

  // O separador conta documentos; um `---` na primeira linha não abre um
  // documento novo, só marca o começo do primeiro.
  if (SEPARADOR_DE_DOCUMENTO.test(linhas[0] ?? '')) documentos -= 1

  return { diretas, importadoresVistos, gruposVistos, documentos }
}
