/**
 * Objetivo de um exercício posicional, e a sua verificação por código.
 *
 * ONDE ISTO MORA, e por quê: em `@/domain/exercicios`. O objetivo é o
 * vocabulário compartilhado entre o banco de diagnóstico e a etapa de
 * recuperação das lições — os dois precisam da MESMA prova. Morava em
 * `@/domain/diagnostic` só porque aquele era o único diretório que a rodada que
 * o escreveu podia criar. Ver a issue #74.
 *
 * DECISÃO CENTRAL, herdada de `@/domain/endgames/objetivo`: um exercício
 * posicional só pode afirmar o que o código sabe conferir. "Este é o melhor
 * lance" e "este lance é mais natural" não entram aqui. Um diagnóstico cuja
 * chave de correção é opinião de quem escreveu mede o autor, não o aluno — e o
 * erro nunca aparece, porque um item com resposta errada continua devolvendo um
 * número.
 *
 * São três tipos, e são três porque cada um é conferível com as ferramentas que
 * já existem no repositório:
 *
 * - `mate-em` — `existeMateForcadoEm` prova que o mate sai contra QUALQUER
 *   defesa, não só contra a que o autor escolheu;
 * - `ganha-material` — `saldoForcadoApos` prova que o ganho sobrevive a toda
 *   resposta do adversário (ver lá o que ele NÃO prova);
 * - `evita-mate` — a mesma busca de mate, apontada para o ADVERSÁRIO: o lance
 *   certo é o que tira o mate forçado da mesa. Este tipo carrega um piso de
 *   material junto de propósito: sem ele, entregar a dama também "evita o mate"
 *   e passaria como resposta certa.
 *
 * Nada aqui chama engine nem rede. Tudo é puro e roda em milissegundos, para o
 * portão poder varrer o banco inteiro sem depender de serviço externo.
 */

import { existeMateForcadoEm } from '@/domain/endgames'
import {
  applyMove,
  legalMoves,
  normalizeUci,
  parseUci,
  posicaoEhJogavel,
  positionStatus,
} from '@/lib/chess'
import type { Side } from '@/domain/types'
import { adversarioDe, saldoForcadoApos } from './material'

/**
 * Os tipos de objetivo que existem.
 *
 * É a FONTE que o portão varre: um tipo novo que entre aqui e não seja tratado
 * em `avaliarLance` reprova. Lista escrita à mão em outro lugar nunca acusaria
 * o que nunca entrou nela.
 */
export const TIPOS_DE_OBJETIVO_DIAGNOSTICO = ['mate-em', 'ganha-material', 'evita-mate'] as const

export type TipoDeObjetivoDiagnostico = (typeof TIPOS_DE_OBJETIVO_DIAGNOSTICO)[number]

/** Dar mate em no máximo `lances` lances do aluno, contra qualquer defesa. */
export interface ObjetivoMateEm {
  tipo: 'mate-em'
  lances: number
}

/** Ganhar pelo menos `saldoMinimo` centipeões, contra qualquer resposta. */
export interface ObjetivoGanhaMaterial {
  tipo: 'ganha-material'
  saldoMinimo: number
}

/**
 * Tirar da mesa o mate forçado que o adversário tem em `emLances`.
 *
 * `perdaMaximaTolerada` é o piso de material do lance defensivo, em centipeões,
 * e vem POSITIVO (quanto se aceita perder). Zero significa "defender sem
 * entregar nada".
 */
export interface ObjetivoEvitaMate {
  tipo: 'evita-mate'
  emLances: number
  perdaMaximaTolerada: number
}

export type ObjetivoDeDiagnostico = ObjetivoMateEm | ObjetivoGanhaMaterial | ObjetivoEvitaMate

/**
 * Veredito sobre um lance.
 *
 * O motivo vem SEMPRE preenchido, inclusive quando o lance cumpre: o portão
 * relata o banco inteiro de uma vez, e "não cumpriu" sem causa obriga quem lê a
 * reconstruir a análise na mão.
 */
export interface VereditoDeLance {
  cumpre: boolean
  motivo: string
}

/**
 * O lance `uci` cumpre o objetivo, na posição `fen`, jogando de `ladoDoAluno`?
 *
 * LANÇA quando a posição não é jogável ou não é a vez do aluno: os dois são
 * erro de quem escreveu o conteúdo, e devolver `false` faria um item quebrado
 * parecer apenas um item difícil — a causa sumiria.
 */
export function avaliarLance(
  fen: string,
  ladoDoAluno: Side,
  uci: string,
  objetivo: ObjetivoDeDiagnostico,
): VereditoDeLance {
  if (!posicaoEhJogavel(fen)) {
    throw new Error(`Posição impossível ou FEN inválido: ${fen}`)
  }
  if (positionStatus(fen).turn !== ladoDoAluno) {
    throw new Error(`Não é a vez de ${ladoDoAluno} em ${fen}`)
  }

  const entrada = parseUci(normalizeUci(uci))
  const aplicado = entrada === null ? null : applyMove(fen, entrada)
  if (aplicado === null) {
    return { cumpre: false, motivo: `lance ${uci} é ilegal em ${fen}` }
  }

  switch (objetivo.tipo) {
    case 'mate-em':
      return avaliarMate(aplicado.fenAfter, ladoDoAluno, uci, objetivo)
    case 'ganha-material':
      return avaliarMaterial(fen, ladoDoAluno, uci, objetivo)
    case 'evita-mate':
      return avaliarDefesa(fen, aplicado.fenAfter, ladoDoAluno, uci, objetivo)
  }
}

function avaliarMate(
  fenApos: string,
  ladoDoAluno: Side,
  uci: string,
  objetivo: ObjetivoMateEm,
): VereditoDeLance {
  const estado = positionStatus(fenApos)
  if (estado.isCheckmate) {
    return { cumpre: true, motivo: `${uci} dá mate imediato` }
  }
  if (estado.isGameOver) {
    return { cumpre: false, motivo: `${uci} termina a partida sem mate (${estado.outcome})` }
  }
  const restantes = objetivo.lances - 1
  if (restantes < 1) {
    return { cumpre: false, motivo: `${uci} não dá mate e o prazo de ${objetivo.lances} acabou` }
  }

  // Toda resposta do adversário tem de cair no mate dentro do prazo. Basta uma
  // escapar para o lance não ser mate forçado.
  for (const resposta of legalMoves(fenApos)) {
    const depois = applyMove(fenApos, {
      from: resposta.from,
      to: resposta.to,
      promotion: resposta.promotion,
    })
    if (depois === null) {
      throw new Error(`Lance legal virou ilegal ao ser reaplicado: ${resposta.uci} em ${fenApos}`)
    }
    const estadoDepois = positionStatus(depois.fenAfter)
    if (estadoDepois.isGameOver) {
      return {
        cumpre: false,
        motivo: `depois de ${uci}, ${resposta.san} termina a partida sem mate`,
      }
    }
    if (!existeMateForcadoEm(depois.fenAfter, ladoDoAluno, restantes)) {
      return {
        cumpre: false,
        motivo: `depois de ${uci}, ${resposta.san} escapa do mate em ${restantes}`,
      }
    }
  }

  return { cumpre: true, motivo: `${uci} força o mate em ${objetivo.lances}` }
}

function avaliarMaterial(
  fen: string,
  ladoDoAluno: Side,
  uci: string,
  objetivo: ObjetivoGanhaMaterial,
): VereditoDeLance {
  const saldo = saldoForcadoApos(fen, ladoDoAluno, uci)
  if (saldo === null) {
    return { cumpre: false, motivo: `lance ${uci} é ilegal em ${fen}` }
  }
  if (saldo < objetivo.saldoMinimo) {
    return {
      cumpre: false,
      motivo: `${uci} garante ${saldo} centipeões, abaixo dos ${objetivo.saldoMinimo} exigidos`,
    }
  }
  return { cumpre: true, motivo: `${uci} garante ${saldo} centipeões` }
}

function avaliarDefesa(
  fen: string,
  fenApos: string,
  ladoDoAluno: Side,
  uci: string,
  objetivo: ObjetivoEvitaMate,
): VereditoDeLance {
  const estado = positionStatus(fenApos)
  if (estado.isCheckmate) {
    // O aluno deu mate primeiro. Não há mate do adversário a evitar.
    return { cumpre: true, motivo: `${uci} dá mate antes` }
  }
  if (estado.isGameOver) {
    // Empate defendido é outro objetivo, com outra régua. Aceitá-lo aqui em
    // silêncio faria um item de defesa aprovar uma resposta que ele não mede.
    return { cumpre: false, motivo: `${uci} termina a partida em ${estado.outcome}` }
  }

  const adversario = adversarioDe(ladoDoAluno)
  if (existeMateForcadoEm(fenApos, adversario, objetivo.emLances)) {
    return { cumpre: false, motivo: `depois de ${uci} o mate em ${objetivo.emLances} continua` }
  }

  const saldo = saldoForcadoApos(fen, ladoDoAluno, uci)
  if (saldo === null) {
    return { cumpre: false, motivo: `lance ${uci} é ilegal em ${fen}` }
  }
  if (saldo < -objetivo.perdaMaximaTolerada) {
    return {
      cumpre: false,
      motivo: `${uci} tira o mate mas perde ${-saldo} centipeões`,
    }
  }
  return {
    cumpre: true,
    motivo: `${uci} tira o mate em ${objetivo.emLances} sem entregar material`,
  }
}
