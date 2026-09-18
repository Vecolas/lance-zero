/**
 * O PORTÃO DA EXPANSÃO: o que um ramo `core` precisa ter para existir.
 *
 * ELE É ESCRITO ANTES DO CONTEÚDO, de propósito. O plano de expansão §61 lista
 * quinze itens obrigatórios por ramo core, e a única forma de essa lista não
 * virar decoração é um teste que reprove enquanto ela não for cumprida.
 *
 * A REGRA QUE ESTE ARQUIVO DEFENDE (§73): "adicionar 30 aberturas" é fácil e é
 * o defeito. O difícil — e o que o produto promete — é que cada abertura ensine
 * a RECONHECER, ENTENDER, JOGAR, VARIAR, LEMBRAR e APLICAR. Um ramo sem
 * conceito, sem plano e sem fronteira é um nome no catálogo, não uma lição.
 *
 * POR QUE CORE E NÃO TODOS: `secondary` e `optional` existem justamente para o
 * curso poder mostrar mais do que exige. Cobrar de todos o mesmo rigor
 * empurraria o autor a não escrever o conteúdo opcional — e o §3 quer o
 * contrário.
 */

import { describe, expect, it } from 'vitest'
import { OPENING_COURSES } from '@/content/openings/course'
import { ramosCore } from '@/domain/openings/ramos'
import { CONCEITO_POR_ID, ESTRUTURA_POR_ID, MOTIVO_POR_ID } from '@/content/openings/compartilhado'
import { nomeDaAbertura } from '@/lib/i18n/nomes-de-conteudo'
import { applyMove } from '@/lib/chess'

/** Todo ramo core de todo curso, com o curso junto para a mensagem de erro. */
const CORE = OPENING_COURSES.flatMap((opening) =>
  ramosCore(opening).map((ramo) => ({ opening, ramo })),
)

describe('o vocabulário compartilhado', () => {
  it('não tem id repetido', () => {
    // Dois conceitos com o mesmo id fariam um deles ficar inalcançável, e o
    // curso que o citasse mostraria a explicação errada — sem erro nenhum.
    for (const mapa of [CONCEITO_POR_ID, ESTRUTURA_POR_ID, MOTIVO_POR_ID]) {
      for (const [id, item] of mapa) {
        expect(item.id, `id ${id}`).toBe(id)
      }
    }
  })

  it('toda explicação diz o que a coisa é, e não só o nome dela', () => {
    /*
      O PISO DE TAMANHO É GROSSEIRO E SERVE. "Peão isolado: um peão isolado" é
      uma entrada que passa em qualquer teste de presença e não ensina nada.
    */
    for (const mapa of [CONCEITO_POR_ID, ESTRUTURA_POR_ID, MOTIVO_POR_ID]) {
      for (const [id, item] of mapa) {
        expect(item.explicacao.length, `${id}`).toBeGreaterThan(60)
        expect(item.explicacao, `${id}`).not.toBe(item.nome)
      }
    }
  })
})

describe('todo ramo core cumpre o checklist do §61', () => {
  it('existe pelo menos um ramo core em cada curso', () => {
    for (const opening of OPENING_COURSES) {
      expect(ramosCore(opening).length, `${opening.slug}`).toBeGreaterThan(0)
    }
  })

  it('declara o ECO', () => {
    /*
      O ECO vem do dataset CC0 e serve para NOMEAR e VALIDAR. Sem ele, o mesmo
      nome pode designar duas linhas diferentes entre cursos, e a expansão
      perderia a única âncora externa que ela tem.
    */
    for (const { opening, ramo } of CORE) {
      expect(ramo.eco, `${opening.slug} / ${ramo.nome}`).toBeTruthy()
      expect(ramo.eco, `${opening.slug} / ${ramo.nome}`).toMatch(/^[A-E]\d{2}$/)
    }
  })

  it('cita pelo menos um conceito, e todo conceito citado existe', () => {
    /*
      O CONCEITO É O QUE TRANSFERE. Uma linha sem conceito ensina uma sequência
      que serve naquela abertura e em lugar nenhum — que é exatamente a
      memorização sem contexto que o produto recusa.
    */
    for (const { opening, ramo } of CORE) {
      const onde = `${opening.slug} / ${ramo.nome}`
      expect(ramo.conceitos?.length ?? 0, onde).toBeGreaterThan(0)
      for (const id of ramo.conceitos ?? []) {
        expect(CONCEITO_POR_ID.has(id), `${onde}: conceito ${id} não existe`).toBe(true)
      }
    }
  })

  it('declara a estrutura de peões, e ela existe', () => {
    for (const { opening, ramo } of CORE) {
      const onde = `${opening.slug} / ${ramo.nome}`
      expect(ramo.estrutura, onde).toBeTruthy()
      expect(ESTRUTURA_POR_ID.has(ramo.estrutura ?? ''), `${onde}: ${ramo.estrutura}`).toBe(true)
    }
  })

  it('todo motivo tático citado existe', () => {
    // Motivo é opcional — nem toda linha produz tática típica. O que não pode é
    // citar um id que não existe: a tela mostraria vazio sem nada avisar.
    for (const { opening, ramo } of CORE) {
      for (const id of ramo.motivos ?? []) {
        expect(MOTIVO_POR_ID.has(id), `${opening.slug} / ${ramo.nome}: motivo ${id}`).toBe(true)
      }
    }
  })

  it('traz o erro comum DESTA linha, com o porquê', () => {
    /*
      POR RAMO, E NÃO POR CURSO. "Não saia com a dama cedo" é conselho genérico
      que ninguém aplica; "...Nf6 aqui perde o tempo que a linha existe para
      ganhar" só faz sentido dentro da linha.
    */
    for (const { opening, ramo } of CORE) {
      const onde = `${opening.slug} / ${ramo.nome}`
      expect(ramo.erroComum?.lance, onde).toBeTruthy()
      expect(ramo.erroComum?.porque?.length ?? 0, onde).toBeGreaterThan(40)
    }
  })

  it('o erro comum é um lance LEGAL em algum ponto da linha', () => {
    /*
      O PORTÃO QUE EVITA ENSINAR NOTAÇÃO ERRADA. Um "erro comum" que não é
      jogável em lugar nenhum da linha não é erro de ninguém — é erro nosso, e o
      aluno passaria a duvidar da própria leitura do tabuleiro.

      ELE JÁ FOI MAIS ESTRITO, E ESTAVA ERRADO: media só a posição da
      bifurcação. O erro característico de um ramo nem sempre mora nela. No
      Panov, o desvio é `exd5` e o erro que define a linha é `...dxc4`, três
      plies depois — cobrar os dois no mesmo ponto reprovaria conteúdo correto e
      empurraria o autor a inventar um erro raso só para passar.

      A regra certa é mais fraca e ainda pega o defeito real: o lance tem de
      existir em ALGUM ponto da linha do ramo.
    */
    for (const { opening, ramo } of CORE) {
      const lance = ramo.erroComum?.lance
      if (!lance) continue
      let fen = opening.rootFen
      let achou = applyMove(fen, lance) !== null
      for (const item of ramo.ramificacao.variacao.line) {
        const aplicado = applyMove(fen, item.san)
        if (!aplicado) break
        fen = aplicado.fenAfter
        if (applyMove(fen, lance)) achou = true
      }
      expect(achou, `${opening.slug} / ${ramo.nome}: "${lance}" é ilegal em toda a linha`).toBe(
        true,
      )
    }
  })

  it('declara onde a teoria acaba e o plano começa', () => {
    /*
      §54. Sem fronteira, o treino continua cobrando lance de repertório numa
      posição em que a habilidade correta já é planejar — e o aluno que "sabe 8
      lances e depois não sabe o que fazer" é produzido exatamente aí.
    */
    for (const { opening, ramo } of CORE) {
      expect(ramo.fronteira, `${opening.slug} / ${ramo.nome}`).toBeTruthy()
    }
  })

  it('diz o que o aluno demonstra jogando pelo outro lado', () => {
    for (const { opening, ramo } of CORE) {
      const onde = `${opening.slug} / ${ramo.nome}`
      expect(ramo.politicaDoLadoInverso?.length ?? 0, onde).toBeGreaterThan(30)
    }
  })

  it('a intenção do adversário e o objetivo do aluno continuam obrigatórios', () => {
    // Herdado do ADR-0022: a pergunta que sobrevive à mudança de ordem dos
    // lances é "o que ele está tentando fazer?".
    for (const { opening, ramo } of CORE) {
      const onde = `${opening.slug} / ${ramo.nome}`
      expect(ramo.intencaoDoAdversario?.length ?? 0, onde).toBeGreaterThan(20)
      expect(ramo.objetivoDoAluno?.length ?? 0, onde).toBeGreaterThan(20)
    }
  })
})

describe('o curso inteiro', () => {
  it('tem nome em inglês', () => {
    for (const opening of OPENING_COURSES) {
      const en = nomeDaAbertura(opening.id, 'en')
      expect(en, `${opening.slug}`).toBeTruthy()
      // Cair no português significa que o inglês não foi escrito — e o aluno
      // em inglês veria "Abertura Italiana" no meio de uma tela traduzida.
      expect(en, `${opening.slug}: inglês caiu no português`).not.toBe(opening.name)
    }
  })

  it('não passa de cinco ramos core', () => {
    /*
      §3: "se um curso precisa de 15 branches core, ele está grande demais —
      criar curso filho". O teto existe para a Siciliana não virar um curso
      monstruoso, e para nenhum outro virar também.
    */
    for (const opening of OPENING_COURSES) {
      expect(ramosCore(opening).length, `${opening.slug}`).toBeLessThanOrEqual(5)
    }
  })

  it('tem pelo menos três planos', () => {
    // §52 pede de 3 a 6. Um curso com um plano só não tem PlanLibrary — tem uma
    // frase, e o aluno sai sabendo o que fazer numa posição e em nenhuma outra.
    for (const opening of OPENING_COURSES) {
      expect(opening.plans.length, `${opening.slug}`).toBeGreaterThanOrEqual(3)
    }
  })
})
