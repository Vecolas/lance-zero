/**
 * Barril do domínio do diagnóstico.
 *
 * O que é do diagnóstico mora aqui: o item (habilidade, dificuldade, enunciado),
 * a estimativa de rating e maestria a partir das respostas, e a montagem da
 * primeira semana.
 *
 * O que vale para QUALQUER exercício posicional — objetivo, saldo de material
 * forçado, contrato do exercício e a verificação dele — mora em
 * `@/domain/exercicios`, e é de lá que o esquema de lição também consome.
 */

export * from './item'
export * from './estimativa'
export * from './primeira-semana'
