/**
 * Leitura de `ImportQuery.since` pelos importadores.
 *
 * A DECISÃO QUE ESTE ARQUIVO CARREGA: os dois importadores leem o `since` pela
 * MESMA porta. Antes cada um tinha o seu jeito — o do Chess.com comparava
 * `playedAt >= since` como TEXTO e o do Lichess fazia `Date.parse` — e a mesma
 * pergunta ("esta partida está dentro da janela?") tinha duas respostas
 * possíveis para a mesma entrada (issue #57).
 *
 * Desde que `ImportQuery.since` virou `Date`, o instante é `getTime()` e não há
 * mais regra de conversão a possuir (essa é de `@/lib/tempo`, que lê TEXTO). O
 * que sobrou para ter dono é a outra metade: **o que fazer com um `since`
 * inválido**.
 *
 * `new Date('26/08/2026')` é um `Date` legítimo para o compilador e `NaN` para
 * o relógio. Comparar contra `NaN` devolve `false` sempre: a importação
 * traria ZERO partidas, sem exceção e sem log, e o usuário veria "nenhuma
 * partida encontrada" — uma mentira plausível. É exatamente o formato de
 * defeito da issue #53 numa roupa nova, então aqui ele GRITA. Quem monta o
 * `since` é código nosso; `since` quebrado é defeito de programação.
 */

/** `since` inválido: defeito de programação, não condição de rede. */
export class ImportQueryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportQueryError'
  }
}

/**
 * Instante de um `since`, ou `null` quando não há recorte.
 *
 * Lê o instante NA ENTRADA e descarta a referência: `Date` é mutável, e guardar
 * o objeto deixaria o chamador mudar o recorte depois da chamada.
 *
 * @throws {ImportQueryError} quando o `Date` recebido é inválido.
 */
export function instanteDoSince(since: Date | undefined): number | null {
  if (since === undefined) {
    return null
  }
  const instante = since.getTime()
  if (Number.isNaN(instante)) {
    throw new ImportQueryError(
      `ImportQuery.since precisa ser uma data legível; recebi "${String(since)}".`,
    )
  }
  return instante
}
