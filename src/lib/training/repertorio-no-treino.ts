/**
 * O repertório do ALUNO, do jeito que o treino e a tela precisam dele.
 *
 * Três coisas moram aqui:
 *
 * 1. `repertoriosDeFabrica()` — a SEMENTE que acompanha o app;
 * 2. `repertoriosDoAluno(repo)` — o que vale: o que ele gravou, com a semente
 *    preenchendo o que ele ainda não editou;
 * 3. `semearCardsDeRepertorio()` e `salvarIdeiaDoRepertorio()` — a escrita.
 *
 * DECISÃO 1 — A SEMENTE NÃO É A VERDADE, E O NOME DIZ ISSO. Até esta rodada
 * `repertoriosDoAluno()` lia `@/content/openings/repertorio` e chamava aquilo de
 * "do aluno": a tela mostrava um repertório que ele não escolheu e as lacunas
 * apontavam buracos de um conteúdo que não era dele. Agora existem DUAS funções
 * com nomes que não se confundem, e a de fábrica é usada num lugar só — como
 * preenchimento de quem nunca editou, dentro da outra.
 *
 * DECISÃO 2 — QUEM NUNCA EDITOU NÃO TEM NADA GRAVADO, e isso é de propósito.
 * Semear o banco na primeira leitura congelaria o conteúdo de fábrica no dia da
 * instalação: uma linha nova escrita depois nunca chegaria a ninguém. Grava-se
 * na primeira EDIÇÃO, e aí o repertório inteiro passa a ser do aluno — com o
 * ponto cego que `RepertorioDoAluno` declara em `@/domain/types`.
 *
 * DECISÃO 3 — NADA DE MEMÓRIA DE MÓDULO. A versão anterior guardava o resultado
 * porque ele vinha de conteúdo constante. Agora vem do repositório, e um valor
 * derivado guardado é um valor que não muda quando a fonte muda: o aluno
 * salvaria a ideia e continuaria lendo a antiga, sem erro nenhum no caminho. As
 * árvores são reconstruídas a cada leitura. Custo medido em ordem de grandeza:
 * duas dezenas de `applyMove` por repertório, contra o PGN inteiro de até 500
 * partidas que a mesma tela já percorre para a frequência.
 *
 * DECISÃO 4 — SEMEAR CARD É IDEMPOTENTE, E É O ID DERIVADO QUE PERMITE ISSO. O
 * id de um card de repertório é `repertorio:{repertório}:{identidade da
 * posição}`, estável sob transposição e montado por uma função só. Então "já
 * existe" é uma pergunta que se responde por id: só os AUSENTES são gravados, e
 * o agendamento de quem já foi revisado nunca é sobrescrito por um card novo em
 * folha. Editar a IDEIA não mexe em identidade nenhuma, então também não mexe em
 * card nenhum — é o que o portão `repertoire-edicao` prova.
 *
 * DECISÃO 5 — REPERTÓRIO COM CONFLITO NÃO VIRA CARD. Uma árvore com conflitos
 * tem lance sem ideia, ideia em branco ou duas respostas para a mesma posição.
 * Card tirado dali perguntaria algo que o próprio conteúdo não sabe responder.
 * Ela é RECUSADA e o id dela volta em `comConflito` — a recusa é dado, não
 * silêncio. Vale para o conteúdo de fábrica (que tem portão próprio exigindo
 * lista vazia) e para o que o aluno gravou (que não tem, e por isso precisa mais
 * ainda desta rede).
 */

import { REPERTORIOS_INICIAIS } from '@/content/openings/repertorio'
import { INDICE_ECO } from '@/content/openings/indice'
import {
  cardsDeRepertorio,
  construirRepertorio,
  editarIdeiaDoRepertorio,
  type AlvoDaIdeia,
  type ArvoreDeRepertorio,
  type MotivoDaRecusa,
} from '@/domain/repertoire'
import type { DefinicaoDeRepertorio, TrainingRepository } from '@/domain/types'

export interface RepertoriosDoAluno {
  /** Árvores utilizáveis: construídas e sem conflito. */
  arvores: readonly ArvoreDeRepertorio[]
  /** Ids das que foram recusadas por conflito. Ver DECISÃO 5. */
  comConflito: readonly string[]
  /**
   * Ids dos que ainda são a semente — ninguém editou.
   *
   * A tela usa isto para dizer ao aluno que as ideias que ele está lendo não são
   * dele ainda. Sem essa frase, o repertório de fábrica se passa pelo dele, que
   * é exatamente o problema que este arquivo veio resolver.
   */
  deFabrica: readonly string[]
}

/** Monta as árvores, separando as que têm conflito. Pura sobre as definições. */
function montar(
  definicoes: readonly DefinicaoDeRepertorio[],
  idsDeFabrica: ReadonlySet<string>,
): RepertoriosDoAluno {
  const arvores: ArvoreDeRepertorio[] = []
  const comConflito: string[] = []
  const deFabrica: string[] = []
  for (const definicao of definicoes) {
    const arvore = construirRepertorio(definicao, { indiceEco: INDICE_ECO })
    if (arvore.conflitos.length > 0) {
      comConflito.push(arvore.id)
      continue
    }
    arvores.push(arvore)
    if (idsDeFabrica.has(definicao.id)) {
      deFabrica.push(definicao.id)
    }
  }
  return { arvores, comConflito, deFabrica }
}

/**
 * A SEMENTE: o conteúdo que acompanha o app, sem nada do aluno.
 *
 * Existe para a tela ter o que desenhar ANTES de o banco responder, e para
 * continuar tendo quando o banco não responde nunca — aba anônima, permissão
 * negada. Não use isto para decidir treino: o que vale é `repertoriosDoAluno`.
 */
export function repertoriosDeFabrica(): RepertoriosDoAluno {
  return montar(
    REPERTORIOS_INICIAIS,
    new Set(REPERTORIOS_INICIAIS.map((definicao) => definicao.id)),
  )
}

/**
 * O repertório que vale: o gravado, com a semente onde ele ainda não editou.
 *
 * A ordem é a do conteúdo de fábrica primeiro, e depois o que o aluno tiver que
 * não corresponde a nenhuma semente — para que a tela não reordene sozinha no
 * dia em que ele editar o segundo repertório antes do primeiro.
 */
export async function repertoriosDoAluno(repo: TrainingRepository): Promise<RepertoriosDoAluno> {
  const salvos = new Map(
    (await repo.listRepertorios()).map((item) => [item.definicao.id, item.definicao]),
  )
  const idsDeFabrica = new Set(REPERTORIOS_INICIAIS.map((definicao) => definicao.id))

  const definicoes: DefinicaoDeRepertorio[] = REPERTORIOS_INICIAIS.map(
    (fabrica) => salvos.get(fabrica.id) ?? fabrica,
  )
  for (const [id, definicao] of salvos) {
    if (!idsDeFabrica.has(id)) {
      definicoes.push(definicao)
    }
  }

  // `deFabrica` é só quem NÃO tem gravação: o id estar na semente não basta.
  const semGravacao = new Set([...idsDeFabrica].filter((id) => !salvos.has(id)))
  return montar(definicoes, semGravacao)
}

export type ResultadoDeSalvarIdeia =
  { ok: true } | { ok: false; motivo: MotivoDaRecusa | 'repertorio-desconhecido'; mensagem: string }

/**
 * Grava a ideia que o aluno escreveu para um lance.
 *
 * Lê a definição ATUAL (gravada, ou a semente se for a primeira edição), aplica
 * a troca pelo domínio e grava a definição inteira. Ler na hora, e não receber a
 * definição do chamador, é o que impede a tela de gravar por cima de uma edição
 * feita em outra aba com a cópia velha que ela tinha em mãos.
 *
 * `agora` entra por parâmetro — relógio em lógica deste projeto é sempre
 * parâmetro — e só carimba `atualizadoEm`.
 */
export async function salvarIdeiaDoRepertorio(
  repo: TrainingRepository,
  repertorioId: string,
  alvo: AlvoDaIdeia,
  ideia: string,
  options: { agora: Date },
): Promise<ResultadoDeSalvarIdeia> {
  const salvos = new Map(
    (await repo.listRepertorios()).map((item) => [item.definicao.id, item.definicao]),
  )
  const atual =
    salvos.get(repertorioId) ??
    REPERTORIOS_INICIAIS.find((definicao) => definicao.id === repertorioId)

  if (atual === undefined) {
    return {
      ok: false,
      motivo: 'repertorio-desconhecido',
      mensagem: `Não encontrei o repertório "${repertorioId}".`,
    }
  }

  const editado = editarIdeiaDoRepertorio(atual, alvo, ideia)
  if (!editado.ok) {
    return editado
  }

  await repo.saveRepertorio({
    definicao: editado.definicao,
    atualizadoEm: options.agora.toISOString(),
  })
  return { ok: true }
}

export interface SemeaduraDeRepertorio {
  /** Cards que não existiam e passaram a existir agora. */
  criados: number
  /** Cards que já estavam gravados e foram deixados como estavam. */
  mantidos: number
  comConflito: readonly string[]
}

/**
 * Garante que existe um card gravado para cada nó de estudo do repertório.
 *
 * `agora` entra por parâmetro e só é usado para os cards que NASCEM nesta
 * chamada.
 */
export async function semearCardsDeRepertorio(
  repo: TrainingRepository,
  options: { agora: Date },
): Promise<SemeaduraDeRepertorio> {
  const { arvores, comConflito } = await repertoriosDoAluno(repo)
  const existentes = new Set((await repo.listReviewCards()).map((card) => card.id))

  let criados = 0
  let mantidos = 0

  for (const arvore of arvores) {
    for (const card of cardsDeRepertorio(arvore, options.agora)) {
      if (existentes.has(card.id)) {
        mantidos += 1
        continue
      }
      await repo.saveReviewCard(card)
      existentes.add(card.id)
      criados += 1
    }
  }

  return { criados, mantidos, comConflito }
}
