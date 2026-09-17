/**
 * Barril da infraestrutura de jornada de estudo.
 *
 * O QUE MORA AQUI: a FORMA de uma jornada — etapas em ordem, retomada exata,
 * progresso, os quatro níveis de conclusão que impedem "rodada encerrada" de
 * virar "atividade concluída", e a amarra entre o que uma etapa cobra e o que a
 * tela oferece.
 *
 * O QUE NUNCA VAI MORAR AQUI, e é a fronteira do plano §158 e §161: regra de
 * domínio. Nada neste diretório sabe o que é repertório, grafo de abertura,
 * tablebase ou WDL. Aberturas validam lance em `@/domain/openings`; finais, em
 * `@/domain/endgames`. Compartilhar a casca e separar as regras é deliberado —
 * um trainer genérico com condicionais para os dois domínios seria a forma mais
 * rápida de fazer as duas experiências piorarem juntas.
 */

export * from './niveis'
export * from './jornada'
export * from './exigencia'
export * from './integracao'
