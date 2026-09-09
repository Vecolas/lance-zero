/**
 * Cruzamento entre os dois inventários de licença.
 *
 * A mesma verdade mora em dois lugares mantidos à mão: `docs/LICENSES.md` (a
 * tabela completa) e `src/lib/legal/licenses.ts` (o que a página `/licenses`
 * mostra ao público). Eles já divergiram — a API de tablebase da Lichess ficou
 * só no documento, e a fonte que o app EXIBE era a incompleta. Este módulo é a
 * regra que os cruza; o portão que a executa está em
 * `tests/unit/licencas-inventario.test.ts`.
 *
 * DECISÕES QUE ESTE ARQUIVO CARREGA:
 *
 * 1. Cruza-se por **id estável**, não por nome nem por URL. Os nomes divergem
 *    de propósito (`next` no documento é `Next.js` na página, porque a página
 *    fala com gente e não com o `package.json`) e a URL não desempata: três
 *    linhas apontam para `https://lichess.org/api`.
 * 2. Uma entrada da página pode cobrir VÁRIAS linhas do documento — `ids` é
 *    lista. `react` e `react-dom` são duas linhas de inventário e uma linha só
 *    na página, e forçar a página a espelhar a granularidade do `package.json`
 *    pioraria a página sem melhorar o inventário.
 * 3. Entrada na página que NÃO existe no documento REPROVA. É o risco mais
 *    caro dos dois: uma afirmação pública de licença sem linha no inventário é
 *    uma afirmação que ninguém revisou — e é exatamente assim que se credita
 *    errado, ou se credita algo que já saiu do projeto.
 * 4. Inventário vazio REPROVA. Tabela vazia não é aprovação: um portão que não
 *    varreu nada imprimiria "tudo certo" sem ter olhado uma linha.
 *
 * O módulo é puro: recebe as duas leituras e devolve a lista de problemas. Não
 * lê disco, não usa relógio.
 */
import type { LeituraDoInventario } from './inventario-doc'

/** Formato do id: minúsculas, dígitos e hífen. Escolhido por ser estável e
 *  digitável dos dois lados sem acento nem espaço para errar. */
export const FORMATO_DO_ID = /^[a-z0-9][a-z0-9-]*$/

export type TipoDeProblema =
  | 'documento-sem-tabela'
  | 'tabela-sem-coluna-id'
  | 'inventario-vazio'
  | 'pagina-vazia'
  | 'id-fora-do-formato'
  | 'id-repetido-no-documento'
  | 'id-repetido-na-pagina'
  | 'entrada-publica-sem-id'
  | 'fora-da-pagina-e-fora-da-divida'
  | 'na-pagina-e-fora-do-inventario'
  | 'divida-que-a-pagina-ja-mostra'
  | 'divida-fantasma'
  | 'divida-sem-motivo'

export interface ProblemaDeInventario {
  tipo: TipoDeProblema
  id?: string
  mensagem: string
}

/** O mínimo que o cruzamento precisa saber de uma entrada da página pública. */
export interface EntradaPublica {
  name: string
  ids: string[]
}

export interface EntradaDoCruzamento {
  documento: LeituraDoInventario
  pagina: EntradaPublica[]
  divida: Record<string, string>
}

export function cruzarInventarios({
  documento,
  pagina,
  divida,
}: EntradaDoCruzamento): ProblemaDeInventario[] {
  const problemas: ProblemaDeInventario[] = []

  if (documento.tabelas.length === 0) {
    problemas.push({
      tipo: 'documento-sem-tabela',
      mensagem:
        'nenhuma tabela encontrada em docs/LICENSES.md — o portão não varreu nada, e não varrer nada não é aprovar',
    })
  }

  for (const tabela of documento.tabelas) {
    if (tabela.temColunaId) continue
    problemas.push({
      tipo: 'tabela-sem-coluna-id',
      mensagem: `tabela na seção "${tabela.secao}" (linha ${tabela.linha}) não tem coluna ID: sem id as linhas dela ficam fora de qualquer cruzamento`,
    })
  }

  if (documento.entradas.length === 0) {
    problemas.push({
      tipo: 'inventario-vazio',
      mensagem: 'docs/LICENSES.md não tem nenhuma linha de inventário para conferir',
    })
  }

  if (pagina.length === 0) {
    problemas.push({
      tipo: 'pagina-vazia',
      mensagem: 'src/lib/legal/licenses.ts não declara nenhuma entrada para a página /licenses',
    })
  }

  const idsDoDocumento = new Set<string>()
  for (const entrada of documento.entradas) {
    if (!FORMATO_DO_ID.test(entrada.id)) {
      problemas.push({
        tipo: 'id-fora-do-formato',
        id: entrada.id,
        mensagem: `id "${entrada.id}" (linha ${entrada.linha}, "${entrada.pacote}") não bate com ${FORMATO_DO_ID}`,
      })
      continue
    }
    if (idsDoDocumento.has(entrada.id)) {
      problemas.push({
        tipo: 'id-repetido-no-documento',
        id: entrada.id,
        mensagem: `id "${entrada.id}" aparece mais de uma vez em docs/LICENSES.md (linha ${entrada.linha}): id repetido faz duas linhas diferentes se cruzarem com a mesma entrada`,
      })
      continue
    }
    idsDoDocumento.add(entrada.id)
  }

  const idsDaPagina = new Map<string, string>()
  for (const entrada of pagina) {
    if (entrada.ids.length === 0) {
      problemas.push({
        tipo: 'entrada-publica-sem-id',
        mensagem: `"${entrada.name}" está na página pública sem declarar a que linha de docs/LICENSES.md corresponde`,
      })
      continue
    }
    for (const id of entrada.ids) {
      const jaReivindicado = idsDaPagina.get(id)
      if (jaReivindicado !== undefined) {
        problemas.push({
          tipo: 'id-repetido-na-pagina',
          id,
          mensagem: `id "${id}" é reivindicado por "${jaReivindicado}" e por "${entrada.name}" em licenses.ts`,
        })
        continue
      }
      idsDaPagina.set(id, entrada.name)
    }
  }

  // Lado 1: toda linha do documento está coberta pela página OU declarada como
  // dívida com motivo escrito.
  for (const id of idsDoDocumento) {
    if (idsDaPagina.has(id)) continue
    if (id in divida) continue
    problemas.push({
      tipo: 'fora-da-pagina-e-fora-da-divida',
      id,
      mensagem: `"${id}" está em docs/LICENSES.md e não aparece em /licenses. Ou entra em licenses.ts, ou entra em NAO_EXIBIDOS_NA_PAGINA com o motivo escrito`,
    })
  }

  // Lado 2: nada aparece na página sem linha no inventário. Afirmação pública
  // de licença sem inventário é afirmação que ninguém revisou.
  for (const [id, nome] of idsDaPagina) {
    if (idsDoDocumento.has(id)) continue
    problemas.push({
      tipo: 'na-pagina-e-fora-do-inventario',
      id,
      mensagem: `"${nome}" (id "${id}") aparece em /licenses e não tem linha em docs/LICENSES.md`,
    })
  }

  // Lado 3: a dívida também morde. Nome DENTRO dela tem de continuar fora da
  // página, senão a linha cobre em silêncio o dia em que a entrada for criada.
  for (const [id, motivo] of Object.entries(divida)) {
    const nomeNaPagina = idsDaPagina.get(id)
    if (nomeNaPagina !== undefined) {
      problemas.push({
        tipo: 'divida-que-a-pagina-ja-mostra',
        id,
        mensagem: `"${id}" está em NAO_EXIBIDOS_NA_PAGINA mas a página mostra "${nomeNaPagina}" — tire a linha da dívida`,
      })
    }
    if (!idsDoDocumento.has(id)) {
      problemas.push({
        tipo: 'divida-fantasma',
        id,
        mensagem: `"${id}" está em NAO_EXIBIDOS_NA_PAGINA e não existe em docs/LICENSES.md — dívida de algo que não está no inventário`,
      })
    }
    if (motivo.trim().length === 0) {
      problemas.push({
        tipo: 'divida-sem-motivo',
        id,
        mensagem: `"${id}" está em NAO_EXIBIDOS_NA_PAGINA sem motivo escrito`,
      })
    }
  }

  return problemas
}
