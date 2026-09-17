/**
 * A amarra entre o que uma etapa COBRA e o que a tela OFERECE.
 *
 * O QUE MORA AQUI: a regra de que nenhuma etapa pode exigir o que não existe, e
 * o varredor que acusa quem a viola.
 *
 * O DEFEITO QUE ESTE ARQUIVO EXISTE PARA TORNAR IMPOSSÍVEL, e ele foi real nos
 * vinte finais do catálogo: `descritores()` declarava
 * `regra: { tipo: 'itens', total: 1 }` para `reconhecer`, `variacoes` e
 * `dois-lados`, e a tela dessas três etapas renderizava só prosa e tabuleiro
 * estático. `itensRespondidos[stage.id]` nunca era escrito, `etapaCumprida`
 * devolvia `false` para sempre, o "Continuar" nascia desabilitado e
 * `concluirEtapa` recusava avançar por dentro. O aluno ficava preso na etapa 2
 * de 10, e a tela dizia apenas "Faltam 1 de 1 exercícios para seguir."
 *
 * NADA DISSO ERRAVA. Não havia exceção, log, tela branca nem teste vermelho —
 * uma porta trancada por dentro tem exatamente a aparência de uma porta. É o
 * falso verde do lado do produto, e a única defesa contra ele é um portão que
 * varra a FONTE e compare as duas metades do contrato.
 *
 * A REGRA, em uma frase: **o total de uma etapa de itens nasce da CONTAGEM dos
 * itens que existem, nunca de um número escrito à mão.** O formato
 * `Math.max(conteudo, PISO)` é a assinatura do defeito — o piso promete o que o
 * conteúdo não tem — e é por isso que `regraDeItens` recebe a LISTA e não um
 * número: quem chama não tem onde enfiar um piso.
 *
 * PUREZA: nada aqui sabe o que é final, abertura, tablebase ou React. Os itens
 * chegam por uma função que quem tem o conteúdo na mão fornece.
 */

import type { RegraDeEtapa, StudyStage } from './jornada'

/**
 * O contrato mínimo de um item de etapa: um id.
 *
 * ELE PRECISA SER ESTÁVEL E ÚNICO DENTRO DA ETAPA, e as duas exigências são a
 * mesma armadilha vista de dois lados. `registrarItem` deduplica por id
 * (`jornada.ts`), então dois itens com o mesmo id contam como um só e a etapa
 * nunca fecha; e um id que muda a cada render — um índice de um contador
 * paralelo à lista, por exemplo — faz a retomada gravar itens que não existem
 * mais. Por isso o id vem do ITEM, e não da posição dele numa contagem.
 */
export interface ItemDeEtapa {
  id: string
}

/**
 * A regra de conclusão que esta lista de itens sustenta.
 *
 * LISTA VAZIA VIRA `leitura`, e não `{ tipo: 'itens', total: 0 }`.
 *
 * Zero de zero seria "cumprida" por acidente e o aluno passaria — mas a jornada
 * passaria a descrever a etapa errado para todo mundo que a lesse, inclusive
 * para `textoDoPendente`, para o Mapa do estudo e para o portão. Uma etapa sem
 * item É uma etapa de leitura; dizer isso é mais honesto que confiar numa
 * comparação que dá certo por sorte.
 *
 * Recebe a LISTA de propósito. Se recebesse o total, o chamador teria onde
 * escrever `Math.max(total, 1)` — que é exatamente o defeito que este arquivo
 * veio matar.
 */
export function regraDeItens(itens: readonly ItemDeEtapa[]): RegraDeEtapa {
  return itens.length > 0 ? { tipo: 'itens', total: itens.length } : { tipo: 'leitura' }
}

/**
 * De onde saem os itens de uma etapa. Quem tem o conteúdo implementa.
 *
 * Função e não mapa pronto: o conteúdo de uma jornada é grande (posições, lição,
 * mainline) e montar todos os itens de todas as etapas para conferir uma seria
 * trabalho jogado fora em toda renderização.
 */
export type ItensDaEtapa = (stageId: string) => readonly ItemDeEtapa[]

/**
 * O mínimo que se precisa saber de uma etapa para conferir a exigência.
 *
 * `Pick` e não `StudyStage` porque quem monta a jornada quer conferir os
 * DESCRITORES, antes de eles virarem etapas — e pedir a etapa pronta obrigaria a
 * montar duas vezes ou a conferir tarde demais. `StudyStage` satisfaz isto, então
 * o portão continua podendo varrer jornadas já construídas.
 */
export type EtapaComRegra = Pick<StudyStage, 'id' | 'regra'>

/**
 * O que impede estas etapas de serem cumpríveis.
 *
 * ERRO COMO VALOR, e não exceção, porque quem chama isto é um portão que quer
 * listar TODOS os conteúdos quebrados de uma vez — a primeira exceção esconderia
 * os outros dezenove finais.
 *
 * MORDE DOS DOIS LADOS, e o segundo lado é o que quase ninguém escreve:
 *
 * 1. etapa que COBRA mais do que a tela oferece — o beco sem saída;
 * 2. etapa que cobra itens de ids repetidos — fecha em menos do que promete;
 * 3. treino que exige cobertura vazia — aprovaria quem não jogou;
 * 4. etapa de LEITURA que oferece itens — o inverso silencioso: o aluno responde
 *    exercício que não conta para nada, e ninguém nota porque o "Continuar"
 *    funciona.
 */
export function problemasDeExigencia(
  stages: readonly EtapaComRegra[],
  itensDaEtapa: ItensDaEtapa,
): string[] {
  const problemas: string[] = []

  for (const stage of stages) {
    const itens = itensDaEtapa(stage.id)

    switch (stage.regra.tipo) {
      case 'itens': {
        if (itens.length < stage.regra.total) {
          problemas.push(
            `etapa ${stage.id} cobra ${stage.regra.total} ${
              stage.regra.total === 1 ? 'item' : 'itens'
            } e a tela oferece ${itens.length}: beco sem saída`,
          )
        }
        const ids = new Set(itens.map((item) => item.id))
        if (ids.size < itens.length) {
          problemas.push(
            `etapa ${stage.id} tem id de item repetido: registrarItem deduplica, e a etapa ` +
              'fecharia em menos itens do que promete',
          )
        }
        break
      }

      case 'cobertura':
        // Lista vazia NÃO é cobertura completa em `coberturaDoFinal`, então uma
        // etapa assim fica eternamente incompleta. Acusar aqui é o que separa
        // "conteúdo incompleto" de "aluno preso".
        if (stage.regra.alvosExigidos.length === 0) {
          problemas.push(`etapa ${stage.id} é de cobertura e não exige alvo nenhum`)
        }
        break

      case 'leitura':
        if (itens.length > 0) {
          problemas.push(
            `etapa ${stage.id} é de leitura e a tela oferece ${itens.length} ` +
              `${itens.length === 1 ? 'item' : 'itens'}: responder não conta para nada`,
          )
        }
        break
    }
  }

  return problemas
}
