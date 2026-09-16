/**
 * A palavra de cada verbo de retomada.
 *
 * O domínio devolve a ESCOLHA (`estudar`, `continuar`, `treinar-de-novo`) e
 * quem escreve a palavra é a tela. Esta tabela existe para que as três telas que
 * mostram o verbo — catálogo de aberturas, catálogo de finais e Roadmap — leiam
 * do MESMO lugar. Três cópias divergiriam no primeiro ajuste de texto, e aí os
 * dois catálogos passariam a dizer coisas diferentes no mesmo estado, que é
 * exatamente o que `retomadaDaJornada` existe para impedir.
 */

import type { RetomadaDaJornada } from '@/domain/jornada'
import type { ChaveDeMensagem } from './mensagens'

export const CHAVE_DA_RETOMADA: Record<RetomadaDaJornada, ChaveDeMensagem> = {
  estudar: 'common.actions.study',
  continuar: 'common.actions.continueStudy',
  'treinar-de-novo': 'common.actions.trainAgain',
}
