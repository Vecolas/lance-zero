/**
 * Portão da TELA de finais.
 *
 * O que ele cobra, e por quê:
 *
 * 1. TRADUÇÃO SEM BURACO. A varredura parte da FONTE do domínio
 *    (`MOTIVOS_DE_OBJETIVO`, `FONTES_DE_RESPOSTA`, o currículo inteiro), nunca
 *    de uma lista escrita à mão aqui — lista escrita à mão nunca acusa o que
 *    nunca entrou nela. E cobra nos DOIS sentidos: motivo sem frase reprova, e
 *    frase sem motivo correspondente também.
 *
 * 2. STATUS NUNCA SÓ POR COR. Toda apresentação tem de trazer ícone e texto
 *    além do tom. É regra de acessibilidade do projeto, e é invisível numa
 *    revisão de código: só um portão pega.
 *
 * 3. A DEGRADAÇÃO DA DEFESA. É o comportamento que a tela promete ao aluno e o
 *    mais difícil de ver na mão: a tablebase silenciosa não pode virar "defesa
 *    perfeita" com outro lance dentro. Cada degrau tem caso próprio, incluindo
 *    o degrau em que a sonda LANÇA.
 *
 * O QUE ESTE PORTÃO NÃO PROVA: que a tela renderiza o que ele mede. A ligação
 * entre estes módulos e o que aparece no navegador é coberta por
 * `tests/e2e/finais.spec.ts`, e só por ele.
 */

import { describe, expect, it } from 'vitest'
import { CURRICULO_FINAIS } from '@/content/endgames'
import { MOTIVOS_DE_OBJETIVO, REGRAS_DE_EMPATE, type PosicaoDeFinal } from '@/domain/endgames'
import { parseUci } from '@/lib/chess'
import { applyMove, legalMoves } from '@/lib/chess'
import type { TablebaseResult } from '@/domain/types'
import { descreverLinhaModelo } from '@/components/endgames/linha-modelo-legivel'
import {
  escolherRespostaDoAdversario,
  FONTES_DE_RESPOSTA,
  type Sonda,
} from '@/components/endgames/resposta-do-adversario'
import {
  APRESENTACAO_POR_ESTADO,
  APRESENTACAO_POR_FONTE,
  APRESENTACAO_POR_REGRA_DE_EMPATE,
  descreverObjetivo,
  FRASE_POR_MOTIVO,
  ressalvaDaDefesa,
} from '@/components/endgames/textos'

function posicaoPorId(id: string): PosicaoDeFinal {
  for (const licao of CURRICULO_FINAIS) {
    for (const posicao of licao.posicoes) {
      if (posicao.id === id) {
        return posicao
      }
    }
  }
  throw new Error(
    `Posição ${id} saiu do currículo: este teste precisa ser reescrito, não removido.`,
  )
}

/** Aplica um UCI e devolve o FEN, falhando alto se o lance for ilegal. */
function depoisDe(fen: string, uci: string): string {
  const entrada = parseUci(uci)
  const aplicado = entrada === null ? null : applyMove(fen, entrada)
  if (aplicado === null) {
    throw new Error(`Lance ${uci} é ilegal em ${fen}`)
  }
  return aplicado.fenAfter
}

function respostaDaTablebase(fen: string, uci: string): TablebaseResult {
  return {
    fen,
    categoria: 'loss',
    resultado: 'derrota',
    dtz: -1,
    dtm: -2,
    xequeMate: false,
    afogamento: false,
    lances: [{ uci, san: null, categoria: 'win', resultado: 'vitoria', dtz: 1, dtm: 2 }],
    doCache: false,
  }
}

const SONDA_MUDA: Sonda = async () => null

describe('tradução dos códigos do domínio', () => {
  it('tem frase para todo motivo que o domínio sabe devolver', () => {
    expect(MOTIVOS_DE_OBJETIVO.length).toBeGreaterThan(0)
    for (const motivo of MOTIVOS_DE_OBJETIVO) {
      expect(FRASE_POR_MOTIVO[motivo], `motivo sem frase: ${motivo}`).toBeTruthy()
      expect(FRASE_POR_MOTIVO[motivo].trim().length).toBeGreaterThan(0)
    }
  })

  it('não tem frase órfã: toda chave traduzida existe no domínio', () => {
    const doDominio = new Set<string>(MOTIVOS_DE_OBJETIVO)
    for (const chave of Object.keys(FRASE_POR_MOTIVO)) {
      expect(doDominio.has(chave), `frase para motivo inexistente: ${chave}`).toBe(true)
    }
  })

  it('tem rótulo e explicação para toda regra de empate', () => {
    // "Cumprido" mudo não ensina nada, e as quatro regras ensinam coisas
    // diferentes. A varredura parte da FONTE do domínio: regra nova sem frase
    // reprova aqui antes de aparecer em branco na tela.
    expect(REGRAS_DE_EMPATE.length).toBeGreaterThan(0)
    for (const regra of REGRAS_DE_EMPATE) {
      const apresentacao = APRESENTACAO_POR_REGRA_DE_EMPATE[regra]
      expect(apresentacao, `regra sem apresentação: ${regra}`).toBeTruthy()
      expect(apresentacao.rotulo.trim().length, regra).toBeGreaterThan(0)
      expect(apresentacao.explicacao.trim().length, regra).toBeGreaterThan(0)
    }
  })

  it('não tem apresentação órfã de regra de empate', () => {
    const doDominio = new Set<string>(REGRAS_DE_EMPATE)
    for (const chave of Object.keys(APRESENTACAO_POR_REGRA_DE_EMPATE)) {
      expect(doDominio.has(chave), `apresentação para regra inexistente: ${chave}`).toBe(true)
    }
  })

  it('cada regra de empate tem rótulo próprio: duas regras não podem ler igual', () => {
    // Rótulos repetidos seriam o "cumprido mudo" com outra roupa: a tela
    // mostraria uma frase e o aluno não saberia distinguir repetição de 50
    // lances, que é exatamente a diferença que ele precisa aprender.
    const rotulos = REGRAS_DE_EMPATE.map((regra) => APRESENTACAO_POR_REGRA_DE_EMPATE[regra].rotulo)
    expect(new Set(rotulos).size).toBe(REGRAS_DE_EMPATE.length)
  })

  it('descreve o objetivo de toda posição do currículo', () => {
    const posicoes = CURRICULO_FINAIS.flatMap((licao) => [...licao.posicoes])
    expect(posicoes.length).toBeGreaterThan(0)
    for (const posicao of posicoes) {
      expect(descreverObjetivo(posicao.objetivo).trim().length, posicao.id).toBeGreaterThan(0)
    }
  })
})

describe('status nunca depende só de cor', () => {
  it('todo estado traz tom, ícone e texto', () => {
    const estados = Object.values(APRESENTACAO_POR_ESTADO)
    expect(estados.length).toBeGreaterThan(0)
    for (const apresentacao of estados) {
      expect(apresentacao.icone.trim().length, apresentacao.rotulo).toBeGreaterThan(0)
      expect(apresentacao.rotulo.trim().length, apresentacao.icone).toBeGreaterThan(0)
      expect(apresentacao.tom).toBeTruthy()
    }
  })

  it('toda fonte de resposta tem apresentação completa', () => {
    expect(FONTES_DE_RESPOSTA.length).toBeGreaterThan(0)
    for (const fonte of FONTES_DE_RESPOSTA) {
      const apresentacao = APRESENTACAO_POR_FONTE[fonte]
      expect(apresentacao, `fonte sem apresentação: ${fonte}`).toBeTruthy()
      expect(apresentacao.icone.trim().length, fonte).toBeGreaterThan(0)
      expect(apresentacao.rotulo.trim().length, fonte).toBeGreaterThan(0)
      expect(apresentacao.explicacao.trim().length, fonte).toBeGreaterThan(0)
    }
  })

  it('só a tablebase é apresentada como defesa perfeita', () => {
    const perfeitas = FONTES_DE_RESPOSTA.filter((fonte) => APRESENTACAO_POR_FONTE[fonte].perfeita)
    expect(perfeitas).toEqual(['tablebase'])
  })
})

describe('ressalva sobre a qualidade da defesa', () => {
  it('não inventa ressalva quando não houve resposta nenhuma', () => {
    expect(ressalvaDaDefesa([])).toBeNull()
  })

  it('não inventa ressalva quando tudo veio da tablebase', () => {
    expect(ressalvaDaDefesa(['tablebase', 'tablebase'])).toBeNull()
  })

  it('conta as respostas imperfeitas quando houve mistura', () => {
    const ressalva = ressalvaDaDefesa(['tablebase', 'linha-modelo'])
    expect(ressalva).not.toBeNull()
    expect(ressalva).toContain('1 de 2')
  })
})

describe('resposta do adversário', () => {
  const posicao = posicaoPorId('dama-mate-em-2')
  const primeiroDoAluno = posicao.linhaModelo[0]
  const fenDepoisDoAluno = depoisDe(posicao.fen, primeiroDoAluno)

  it('usa a tablebase quando ela responde com lance legal', async () => {
    const sonda: Sonda = async (fen) => respostaDaTablebase(fen, 'h8g8')
    const resposta = await escolherRespostaDoAdversario({
      fen: fenDepoisDoAluno,
      linhaModelo: posicao.linhaModelo,
      lancesJogados: [primeiroDoAluno],
      probe: sonda,
    })
    expect(resposta).toEqual({ uci: 'h8g8', fonte: 'tablebase' })
  })

  it('cai para a linha modelo quando a tablebase fica muda', async () => {
    const resposta = await escolherRespostaDoAdversario({
      fen: fenDepoisDoAluno,
      linhaModelo: posicao.linhaModelo,
      lancesJogados: [primeiroDoAluno],
      probe: SONDA_MUDA,
    })
    expect(resposta?.fonte).toBe('linha-modelo')
    expect(resposta?.uci).toBe(posicao.linhaModelo[1])
  })

  it('não quebra quando a sonda LANÇA: degrada em vez de propagar', async () => {
    const sonda: Sonda = async () => {
      throw new Error('rede caiu no meio do treino')
    }
    const resposta = await escolherRespostaDoAdversario({
      fen: fenDepoisDoAluno,
      linhaModelo: posicao.linhaModelo,
      lancesJogados: [primeiroDoAluno],
      probe: sonda,
    })
    expect(resposta?.fonte).toBe('linha-modelo')
  })

  it('recusa lance da tablebase que é ilegal na posição', async () => {
    // Resposta com forma válida e conteúdo impossível: sem o filtro de
    // legalidade isto viraria uma exceção lá dentro do adapter de xadrez.
    const sonda: Sonda = async (fen) => respostaDaTablebase(fen, 'a1a2')
    const resposta = await escolherRespostaDoAdversario({
      fen: fenDepoisDoAluno,
      linhaModelo: posicao.linhaModelo,
      lancesJogados: [primeiroDoAluno],
      probe: sonda,
    })
    expect(resposta?.fonte).not.toBe('tablebase')
    expect(resposta?.uci).not.toBe('a1a2')
  })

  it('fora do roteiro e sem tablebase, joga um lance legal e diz que é isso', async () => {
    const foraDoRoteiro = 'c2c3'
    const fen = depoisDe(posicao.fen, foraDoRoteiro)
    const entrada = {
      fen,
      linhaModelo: posicao.linhaModelo,
      lancesJogados: [foraDoRoteiro],
      probe: SONDA_MUDA,
    }
    const resposta = await escolherRespostaDoAdversario(entrada)
    expect(resposta?.fonte).toBe('lance-legal')

    const legais = legalMoves(fen).map((lance) => lance.uci)
    expect(legais).toContain(resposta?.uci)

    // Determinístico: a mesma entrada devolve a mesma resposta. O rei preto tem
    // dois lances (h8g8 e h8h7) e o degrau escolhe o menor em ordem de UCI.
    const denovo = await escolherRespostaDoAdversario(entrada)
    expect(denovo).toEqual(resposta)
    expect(resposta?.uci).toBe('h8g8')
  })

  it('devolve nulo quando a posição não tem lance legal', async () => {
    const posicaoDeMate = posicaoPorId('dama-mate-em-1')
    const fenComMate = depoisDe(posicaoDeMate.fen, posicaoDeMate.linhaModelo[0])
    const resposta = await escolherRespostaDoAdversario({
      fen: fenComMate,
      linhaModelo: posicaoDeMate.linhaModelo,
      lancesJogados: [posicaoDeMate.linhaModelo[0]],
      probe: SONDA_MUDA,
    })
    expect(resposta).toBeNull()
  })
})

describe('linha modelo legível', () => {
  it('descreve a linha inteira de toda posição do currículo', () => {
    const posicoes = CURRICULO_FINAIS.flatMap((licao) => [...licao.posicoes])
    expect(posicoes.length).toBeGreaterThan(0)
    for (const posicao of posicoes) {
      const linha = descreverLinhaModelo(posicao)
      expect(linha.erro, posicao.id).toBeNull()
      expect(linha.lances.length, posicao.id).toBe(posicao.linhaModelo.length)
      // O aluno abre a linha: é a vez dele no FEN inicial de toda posição.
      expect(linha.lances[0].doAluno, posicao.id).toBe(true)
      // Quem joga alterna, e isso sai do tabuleiro, não da paridade do índice.
      for (const [indice, lance] of linha.lances.entries()) {
        expect(lance.doAluno, `${posicao.id} lance ${indice + 1}`).toBe(indice % 2 === 0)
        expect(lance.san.trim().length, posicao.id).toBeGreaterThan(0)
      }
    }
  })
})
