/**
 * Catálogo de microlições.
 *
 * DOZE lições, no esquema V2, cobrindo as habilidades que a §31 do plano
 * definitivo manda escrever primeiro: peças indefesas, ameaças do adversário,
 * varredura de xeques/capturas/ameaças, garfo, cravada, última fileira, rede de
 * mate, lances candidatos, mates básicos, oposição, regra do quadrado e
 * desenvolvimento.
 *
 * O NÚMERO ESTÁ DECLARADO COMO O QUE É: um começo. A issue #11 pede de 30 a 40,
 * e escrever trinta lições de xadrez em uma rodada de máquina produziria
 * exatamente o conteúdo que este produto não quer — texto genérico, posição não
 * conferida, explicação que soa certa. O que fecha aqui é o ESQUEMA e o PORTÃO:
 * as que faltam entram pelo mesmo molde e passam pela mesma prova.
 *
 * ESTE ARQUIVO NÃO CONTÉM LIÇÃO. Ele só JUNTA os lotes. A razão é de escrita,
 * não de arrumação: um catálogo de 12 lições no esquema V2 passa de três mil
 * linhas num arquivo só, e quatro pessoas (ou quatro agentes) escrevendo lições
 * ao mesmo tempo colidiriam em cada linha. Cada lote tem o seu arquivo, e a
 * ORDEM aqui é a do currículo — fundamentos primeiro, aberturas por último —
 * porque a biblioteca mostra nesta ordem e o aluno lê de cima para baixo.
 *
 * Toda lição termina em recuperação porque o ESQUEMA não deixa terminar de
 * outro jeito (ver `@/domain/lessons/schema`), e
 * `tests/unit/lessons-catalogo.test.ts` varre o catálogo inteiro conferindo
 * posição, linha, contraste e chave de correção.
 */

import type { Licao } from '@/domain/lessons'
import { LICOES_FUNDAMENTOS } from './licoes/fundamentos'
import { LICOES_PROCESSO } from './licoes/processo'
import { LICOES_TATICA_E_CALCULO } from './licoes/tatica-e-calculo'
import { LICOES_FINAIS_E_ABERTURAS } from './licoes/finais-e-aberturas'

export const CATALOGO_DE_LICOES: readonly Licao[] = [
  ...LICOES_FUNDAMENTOS,
  ...LICOES_PROCESSO,
  ...LICOES_TATICA_E_CALCULO,
  ...LICOES_FINAIS_E_ABERTURAS,
]

/** Quantas lições a issue #11 pede no total. O catálogo é um começo declarado. */
export const LICOES_PLANEJADAS = { minimo: 30, maximo: 40 } as const
