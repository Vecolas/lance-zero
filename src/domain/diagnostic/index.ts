/**
 * Barril do domínio do diagnóstico.
 *
 * DÍVIDA DECLARADA: `material.ts` e `objetivo.ts` não são "do diagnóstico" —
 * saldo de material forçado e verificação de objetivo servem a qualquer
 * exercício posicional do app, e o esquema de lição em `@/content/lessons` já
 * os consome. A casa certa deles é um módulo próprio de exercícios; eles moram
 * aqui porque esta rodada de trabalho só podia criar `src/domain/diagnostic/`.
 * Está relatado na entrega e vira issue.
 */

export * from './material'
export * from './objetivo'
export * from './item'
export * from './estimativa'
export * from './primeira-semana'
