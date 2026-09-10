/**
 * Barril do domínio de exercícios posicionais.
 *
 * O QUE MORA AQUI: o que vale para QUALQUER exercício de posição — o objetivo
 * conferível (`avaliarLance`), o saldo de material forçado que sustenta um dos
 * objetivos, e o contrato do exercício com a sua verificação.
 *
 * Quem consome: o banco de diagnóstico (`@/domain/diagnostic`, que acrescenta o
 * enunciado, a habilidade e a dificuldade) e a etapa de recuperação das lições.
 * Os dois usam a MESMA prova, e é por isso que ela não mora na casa de nenhum
 * dos dois. Ver a issue #74.
 */

export * from './material'
export * from './objetivo'
export * from './exercicio'
