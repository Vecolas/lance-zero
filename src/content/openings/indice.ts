/**
 * O índice ECO já montado a partir da fixture.
 *
 * POR QUE ELE EXISTE, e não é conveniência: dois motivos, e o segundo foi
 * descoberto quebrando o código de propósito.
 *
 * 1. UMA FONTE SÓ DO ÍNDICE. Sem isto, cada tela e cada teste chamaria
 *    `construirIndiceEco(FIXTURE_ECO)` por conta própria — a mesma verdade
 *    montada em cinco lugares, e cinco lugares para alguém esquecer de passar a
 *    fixture certa no dia em que houver mais de uma.
 *
 * 2. O ÍNDICE É MONTADO NO CARREGAMENTO DO MÓDULO, e isso transforma
 *    `tests/unit/varredura-de-modulos.test.ts` num portão de CONTEÚDO de graça:
 *    `construirIndiceEco` lança quando algum `pgn` da fixture é ilegal, então
 *    uma fixture quebrada passa a derrubar a varredura.
 *
 *    Antes deste arquivo, a fixture era só dado inerte: um `pgn` ilegal
 *    carregava sem reclamar e só aparecia no portão específico das aberturas. O
 *    cabeçalho de `eco.ts` já AFIRMAVA que a varredura pegava isso, e a
 *    afirmação era falsa — descoberta ao quebrar a fixture de propósito e ver a
 *    varredura passar. Comentário que descreve um portão que não existe é pior
 *    que comentário nenhum: ele convence a próxima pessoa a não escrever o teste.
 */

import { construirIndiceEco, type IndiceEco } from '@/lib/openings'
import { FIXTURE_ECO } from './eco-fixture'

/** Índice de aberturas do produto. Lança no import se a fixture estiver torta. */
export const INDICE_ECO: IndiceEco = construirIndiceEco(FIXTURE_ECO)
