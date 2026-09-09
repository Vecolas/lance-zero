/**
 * Legalidade de uma posição de treino.
 *
 * POR QUE EXISTE: `isValidFen` (e portanto o `chess.js` por trás dele) só
 * responde "este texto descreve um tabuleiro". Ele aceita alegremente uma
 * posição em que o lado que NÃO tem a vez está em xeque — posição que nunca
 * poderia ter acontecido numa partida. O sintoma não é um erro de validação: é
 * o gerador de lances devolvendo a captura do rei adversário, e a primeira
 * exceção aparece três camadas abaixo, dentro do adapter.
 *
 * Este arquivo foi escrito depois de o portão do currículo cair exatamente
 * assim, com um FEN escrito à mão em que a dama dava xeque com as brancas a
 * jogar. O detector óbvio mentiu; este é o que não mente.
 *
 * Deveria morar em `@/lib/chess`, junto de `isValidFen`. Está aqui porque esta
 * frente não pode editar aquele diretório — dívida declarada na entrega.
 */

import { isValidFen, positionStatus } from '@/lib/chess'

/**
 * A posição pode ter surgido de uma partida legal e é jogável?
 *
 * Devolve `false` para FEN inválido e para posição em que o lado sem a vez está
 * em xeque. Não lança: quem chama é um portão que quer listar todas as posições
 * quebradas de uma vez.
 */
export function posicaoEhJogavel(fen: string): boolean {
  if (!isValidFen(fen)) {
    return false
  }
  const invertido = comAVezTrocada(fen)
  if (invertido === null || !isValidFen(invertido)) {
    return false
  }
  // Com a vez trocada, "está em xeque" responde pelo lado que no FEN original
  // não tinha a vez — que é exatamente a pergunta.
  return !positionStatus(invertido).inCheck
}

/**
 * Troca de quem é a vez, zerando en passant e contadores.
 *
 * A casa de en passant depende de quem acabou de jogar; mantê-la depois da
 * troca produziria um FEN que descreve outra coisa.
 */
function comAVezTrocada(fen: string): string | null {
  const campos = fen.trim().split(/\s+/)
  if (campos.length < 3) {
    return null
  }
  const vez = campos[1] === 'w' ? 'b' : 'w'
  return [campos[0], vez, campos[2], '-', '0', '1'].join(' ')
}
