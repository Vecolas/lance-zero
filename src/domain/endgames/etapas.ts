/**
 * Os ids das dez etapas da jornada de um final, na ordem em que se aprende.
 *
 * ARQUIVO PRÓPRIO, e a razão é um ciclo de importação que o desenho antigo
 * escondia: as etapas são lidas por quem MONTA a jornada (`jornada.ts`) e por
 * quem monta os ITENS de cada etapa (`itens-da-etapa.ts`), e agora a montagem da
 * jornada depende da contagem dos itens. Com a lista dentro de `jornada.ts`, os
 * dois módulos se importariam em círculo.
 *
 * É a FONTE da sequência — ninguém redeclara a ordem em outro lugar.
 */

export const ETAPAS_DA_JORNADA_DE_FINAL = [
  'visao',
  'reconhecer',
  'principio',
  'demonstracao',
  'progredir',
  'defender',
  'variacoes',
  'dois-lados',
  'pratica-guiada',
  'treino-final',
] as const

export type EtapaDeFinal = (typeof ETAPAS_DA_JORNADA_DE_FINAL)[number]
