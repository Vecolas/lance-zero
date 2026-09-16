/**
 * O MODO com que o aluno chegou a um conteúdo, lido da URL.
 *
 * POR QUE O MODO PRECISA APARECER NA TELA. "Reaprender" e "Aprender" abrem o
 * mesmo conteúdo — é isso que faz o deep link ser um só. Se a tela não disser
 * nada, o aluno que pediu para rever o que esqueceu recebe a aula de estreia,
 * sem nenhum sinal de que o app entendeu o pedido. A promessa quebra em
 * silêncio: nada erra, e mesmo assim a resposta não é a que foi pedida.
 *
 * LEITURA DEFENSIVA. Um valor desconhecido no parâmetro devolve `null` em vez de
 * um modo inventado: URL é entrada de fora, e a tela não pode afirmar um
 * enquadramento que ninguém pediu.
 */

import { PARAM_DO_MODO, type ModoDeAprendizado } from '@/domain/roadmap/learning-target'

const MODOS: readonly ModoDeAprendizado[] = ['aprender', 'continuar', 'revisar', 'reaprender']

export function lerModo(busca: string): ModoDeAprendizado | null {
  const valor = new URLSearchParams(busca).get(PARAM_DO_MODO)
  return MODOS.find((modo) => modo === valor) ?? null
}

/** O modo da URL do navegador. `null` no servidor e sem parâmetro. */
export function modoDaUrl(): ModoDeAprendizado | null {
  if (typeof window === 'undefined') return null
  return lerModo(window.location.search)
}

/**
 * A frase que a tela mostra ao chegar em cada modo.
 *
 * `aprender` não tem frase: é o caso padrão, e um aviso dizendo "você está
 * aprendendo" na tela de aprender é ruído que ensina a ignorar avisos.
 */
export const AVISO_DO_MODO: Record<Exclude<ModoDeAprendizado, 'aprender'>, string> = {
  continuar: 'Você retomou de onde parou. As etapas já vencidas continuam vencidas.',
  revisar:
    'Você já concluiu este conteúdo. Está revendo — nada aqui derruba o que você já conquistou.',
  reaprender:
    'Este conteúdo voltou a falhar nas suas partidas, então ele é ensinado de novo. Não é punição: é o app admitindo que a primeira passagem não fixou.',
}
