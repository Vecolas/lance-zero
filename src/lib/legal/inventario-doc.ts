/**
 * Leitura das tabelas de inventário de `docs/LICENSES.md`.
 *
 * DECISÃO QUE ESTE ARQUIVO CARREGA: o documento é a fonte mais completa do
 * inventário (tem versão exata e fase prevista, que a página pública não
 * mostra), então ele é VARRIDO, e não gerado. O cruzamento com a página
 * pública se faz por um **id estável** declarado em cada linha, porque os dois
 * lados chamam a mesma coisa por nomes diferentes (`next` × `Next.js`) e a URL
 * não desempata — três linhas compartilham `https://lichess.org/api`.
 *
 * Segunda decisão: **toda** tabela do documento precisa ter coluna `ID`. Pular
 * em silêncio a tabela sem `ID` seria abrir o ponto cego que este portão
 * existe para fechar — bastaria alguém criar uma tabela nova sem a coluna para
 * uma dependência inteira sumir da conta. Quem precisar de uma tabela que não
 * é inventário toma essa decisão de propósito, e o portão a obriga a aparecer.
 *
 * O módulo é puro: recebe o texto e devolve a leitura. Quem lê o disco é o
 * portão, não o domínio.
 */

export interface EntradaDoInventario {
  /** Identificador estável, único no documento. É por ele que se cruza. */
  id: string
  /** Nome como o documento o escreve, só para a mensagem de erro. */
  pacote: string
  licenca: string
  fonte: string
  /** Título da seção em que a linha está, só para a mensagem de erro. */
  secao: string
  /** Linha no arquivo, 1-based, só para a mensagem de erro. */
  linha: number
}

export interface TabelaDoInventario {
  secao: string
  linha: number
  colunas: string[]
  temColunaId: boolean
  totalDeLinhas: number
}

export interface LeituraDoInventario {
  entradas: EntradaDoInventario[]
  tabelas: TabelaDoInventario[]
}

const CABECALHO = /^#{1,6}\s+(.*)$/
const CERCA_DE_CODIGO = /^\s*(```|~~~)/
const SEPARADOR_DE_TABELA = /^\|[\s:|-]*-[\s:|-]*\|$/

function celulas(linha: string): string[] {
  const semBordas = linha.trim().replace(/^\|/, '').replace(/\|$/, '')
  return semBordas.split('|').map((c) => c.trim())
}

/** Tira a marcação inline que só existe para o olho: `código` e **forte**. */
function textoLimpo(celula: string): string {
  return celula.replace(/`/g, '').replace(/\*\*/g, '').trim()
}

function indiceDaColuna(colunas: string[], prefixo: string): number {
  return colunas.findIndex((c) => c.toLowerCase().startsWith(prefixo))
}

function ehLinhaDeTabela(linha: string): boolean {
  return linha.trim().startsWith('|')
}

export function lerInventarioDoDocumento(markdown: string): LeituraDoInventario {
  const linhas = markdown.split(/\r?\n/)
  const entradas: EntradaDoInventario[] = []
  const tabelas: TabelaDoInventario[] = []

  let secao = '(sem seção)'
  let dentroDeCodigo = false

  for (let i = 0; i < linhas.length; i += 1) {
    const linha = linhas[i]

    if (CERCA_DE_CODIGO.test(linha)) {
      dentroDeCodigo = !dentroDeCodigo
      continue
    }
    if (dentroDeCodigo) continue

    const cabecalho = CABECALHO.exec(linha)
    if (cabecalho) {
      secao = cabecalho[1].trim()
      continue
    }

    const proxima = linhas[i + 1]
    const abreTabela =
      ehLinhaDeTabela(linha) && proxima !== undefined && SEPARADOR_DE_TABELA.test(proxima.trim())
    if (!abreTabela) continue

    const colunas = celulas(linha).map(textoLimpo)
    const colunaId = indiceDaColuna(colunas, 'id')
    const colunaPacote = indiceDaColuna(colunas, 'pacote')
    const colunaLicenca = indiceDaColuna(colunas, 'licen')
    const colunaFonte = indiceDaColuna(colunas, 'fonte')

    let corpo = i + 2
    let totalDeLinhas = 0
    while (corpo < linhas.length && ehLinhaDeTabela(linhas[corpo])) {
      const valores = celulas(linhas[corpo])
      totalDeLinhas += 1
      if (colunaId >= 0) {
        entradas.push({
          id: textoLimpo(valores[colunaId] ?? ''),
          pacote: textoLimpo(valores[colunaPacote] ?? valores[0] ?? ''),
          licenca: textoLimpo(valores[colunaLicenca] ?? ''),
          fonte: textoLimpo(valores[colunaFonte] ?? ''),
          secao,
          linha: corpo + 1,
        })
      }
      corpo += 1
    }

    tabelas.push({
      secao,
      linha: i + 1,
      colunas,
      temColunaId: colunaId >= 0,
      totalDeLinhas,
    })

    i = corpo - 1
  }

  return { entradas, tabelas }
}
