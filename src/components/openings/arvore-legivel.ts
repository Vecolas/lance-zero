/**
 * A árvore de repertório na forma que a tela consegue desenhar.
 *
 * O DOMÍNIO GUARDA UM GRAFO, NÃO UMA LISTA. `ArvoreDeRepertorio.nos` é um mapa
 * de posições, e transposição faz dele um DAG: `italiana-giuoco-piano` e
 * `italiana-dois-cavalos` chegam ao MESMO nó por ordens diferentes. Desenhar um
 * DAG recursivamente sem cuidado duplica a subárvore inteira, e o aluno leria a
 * mesma continuação duas vezes achando que são linhas diferentes.
 *
 * DECISÃO 1 — TRANSPOSIÇÃO É DITA, NÃO REPETIDA. Quando a varredura reencontra
 * uma posição já desenhada, o ramo aparece uma vez e a linha para ali, com o
 * caminho por onde aquela posição já apareceu. É informação de produto, não
 * economia de pixels: "você também chega aqui por 3...Bc5 4.d3 Nf6" é
 * exatamente o que faz o aluno entender que não são duas coisas para decorar.
 *
 * DECISÃO 2 — INDENTAÇÃO SIGNIFICA ESCOLHA, NÃO PROFUNDIDADE. Uma corrente sem
 * ramificação sai no mesmo nível: `1.e4 e5 2.Nf3 Nc6 3.Bc4` é UMA linha, e
 * escalonar isso em cinco degraus gastaria a largura toda de um aparelho de
 * 360px para não dizer nada. Só onde há mais de uma continuação a lista aninha —
 * ali o degrau significa "aqui a partida se divide".
 *
 * DECISÃO 3 — A IDEIA VEM DO RAMO, e o ramo é a fonte única dela (DECISÃO 2 de
 * `domain/repertoire/arvore.ts`: a ideia é declarada uma vez, no par posição +
 * lance). Esta camada não copia texto nenhum e não inventa texto nenhum. Ramo
 * com ideia vazia existe apenas quando o repertório tem conflito — e aí a tela
 * MOSTRA o buraco em vez de desenhar um espaço em branco, porque um espaço em
 * branco é indistinguível de "ainda não carregou".
 *
 * DECISÃO 4 — O NOME DA ABERTURA APARECE QUANDO MUDA. Repetir "Abertura do Peão
 * do Rei" em cinco lances seguidos treina o aluno a não ler mais a linha. O nome
 * sai do nó de DESTINO, e só quando é diferente do nó de origem.
 *
 * Tudo aqui é função pura sobre a árvore: nada de React, nada de relógio.
 */

import type { ArvoreDeRepertorio, NoDeRepertorio, RamoDeRepertorio } from '@/domain/repertoire'
import type { Abertura } from '@/domain/types'

/** Um lance desenhável, com o que a tela precisa dizer sobre ele. */
export interface RamoLegivel {
  /** Chave estável para o React: identidade de origem + lance. */
  chave: string
  /**
   * Identidade da posição de ONDE o lance sai.
   *
   * Sai daqui como campo próprio, e não recortado de `chave`, porque é o
   * endereço com que a tela pede ao domínio para trocar a ideia deste lance
   * (`editarIdeiaDoRepertorio`). Recortar o texto da chave faria a regra do
   * separador `|` viver em dois lugares.
   */
  origem: string
  /** Meios-lances jogados ANTES deste. 0 é o primeiro lance das brancas. */
  nivel: number
  san: string
  /** Por que este lance. Vazia só quando o repertório tem conflito declarado. */
  ideia: string
  /** `true` quando é lance do dono do repertório. */
  doUsuario: boolean
  /** Identidade da posição a que o lance leva. */
  destino: string
  /** Abertura reconhecida no destino, quando MUDOU em relação à origem. */
  aberturaNova: Abertura | null
  /**
   * Caminho por onde esta posição já tinha aparecido, quando é transposição.
   * `null` quando o ramo é a primeira visita à posição.
   */
  transposicaoDe: readonly string[] | null
  /** Continuações. Só é preenchido em ponto de escolha — ver DECISÃO 2. */
  filhos: readonly RamoLegivel[]
}

function mesmaAbertura(a: Abertura | null, b: Abertura | null): boolean {
  if (a === null || b === null) {
    return a === b
  }
  return a.eco === b.eco && a.nome === b.nome
}

/**
 * Desenha a árvore inteira a partir da raiz.
 *
 * `visitados` é UM conjunto para a varredura toda, e não um por ramo: é o que
 * transforma o DAG em desenho sem duplicata. Um conjunto por caminho faria a
 * transposição voltar a ser desenhada duas vezes, e o sintoma seria mudo — a
 * tela ficaria só mais longa.
 */
export function arvoreLegivel(arvore: ArvoreDeRepertorio): readonly RamoLegivel[] {
  const visitados = new Set<string>([arvore.raiz])

  function expandir(no: NoDeRepertorio | undefined, nivel: number): RamoLegivel[] {
    if (no === undefined || no.ramos.length === 0) {
      return []
    }
    const semRamificacao = no.ramos.length === 1
    const saida: RamoLegivel[] = []

    for (const ramo of no.ramos) {
      const destino = arvore.nos.get(ramo.destino)
      const jaVisto = visitados.has(ramo.destino)
      const legivel = montar(no, ramo, destino, nivel, jaVisto)

      if (jaVisto) {
        saida.push(legivel)
        continue
      }
      visitados.add(ramo.destino)
      const filhos = expandir(destino, nivel + 1)

      if (semRamificacao) {
        // Corrente de lance único: os filhos seguem no MESMO nível.
        saida.push(legivel, ...filhos)
      } else {
        saida.push({ ...legivel, filhos })
      }
    }

    return saida
  }

  return expandir(arvore.nos.get(arvore.raiz), 0)
}

function montar(
  origem: NoDeRepertorio,
  ramo: RamoDeRepertorio,
  destino: NoDeRepertorio | undefined,
  nivel: number,
  jaVisto: boolean,
): RamoLegivel {
  const aberturaDoDestino = destino?.abertura ?? null
  return {
    chave: `${ramo.origem}|${ramo.san}`,
    origem: ramo.origem,
    nivel,
    san: ramo.san,
    ideia: ramo.ideia,
    doUsuario: ramo.doUsuario,
    destino: ramo.destino,
    aberturaNova: mesmaAbertura(aberturaDoDestino, origem.abertura) ? null : aberturaDoDestino,
    transposicaoDe: jaVisto ? (destino?.caminhos[0] ?? null) : null,
    filhos: [],
  }
}

/** Percorre o desenho inteiro, em ordem. Existe para o portão e para contagens. */
export function todosOsRamos(ramos: readonly RamoLegivel[]): RamoLegivel[] {
  const saida: RamoLegivel[] = []
  for (const ramo of ramos) {
    saida.push(ramo)
    saida.push(...todosOsRamos(ramo.filhos))
  }
  return saida
}
