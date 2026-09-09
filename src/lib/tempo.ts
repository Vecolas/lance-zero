/**
 * Leitura de data ISO-8601 como INSTANTE.
 *
 * A DECISÃO QUE ESTE ARQUIVO CARREGA: comparar data como texto e comparar data
 * como instante só dão o mesmo resultado enquanto todo mundo escrever em UTC.
 * `Game.playedAt` vem de fora — importador, backup restaurado — e pode chegar
 * com deslocamento (`2026-08-26T06:00:00-03:00`). Aí as duas comparações
 * discordam, e discordam **em silêncio**: nenhuma exceção, nenhum registro, a
 * partida apenas some de um lado e aparece do outro.
 *
 * Foi assim que uma partida dentro da janela era cortada pela tela e aceita
 * pelo domínio, e o efeito visível era o plano do dia treinar outra coisa.
 *
 * Este módulo existe para que a regra tenha UM dono. Antes ela vivia duas
 * vezes: um ajudante local em `src/lib/storage/query.ts` e um `Date.parse` solto
 * dentro de `src/domain/planning/erros-recentes.ts`. Duas cópias da mesma regra
 * divergem, e a que vale costuma ser a errada.
 */

/**
 * Instante de uma data ISO-8601, ou `null` quando não dá para ler.
 *
 * `null` em vez de `NaN` de propósito: `NaN` se propaga por comparações que
 * devolvem `false` sem nunca falhar, e o chamador não é obrigado a perceber.
 * `null` obriga a decidir o que fazer com "ilegível".
 */
export function instanteDe(iso: string): number | null {
  const ms = Date.parse(iso)
  return Number.isNaN(ms) ? null : ms
}
