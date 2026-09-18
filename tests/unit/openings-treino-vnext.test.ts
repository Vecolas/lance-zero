/**
 * O TREINO FINAL: de onde a rodada parte, e onde ela termina.
 *
 * DUAS DECISÕES QUE O PLANO VNext SEPARA e que o código tratava como uma só.
 *
 * A PRIMEIRA (§33): toda rodada de ramo começava EXATAMENTE na posição do
 * desvio. Isso é treinar uma FEN isolada — o aluno reconhece o quadro e não o
 * caminho, e numa partida a posição nunca chega sozinha. O plano §33.3 proíbe os
 * dois extremos: nem sempre da posição inicial, nem sempre de uma FEN isolada.
 *
 * A SEGUNDA (§22–§23): chegar ao fim da linha era "linha concluída". Isso produz
 * exatamente o efeito que o plano nomeia — "sei 8 lances e depois não sei o que
 * fazer". O fim da linha é ter alcançado o TIPO DE POSIÇÃO que a abertura
 * procura, e a tela precisa dizer isso.
 */

import { describe, expect, it } from 'vitest'
import { OPENING_COURSES } from '@/content/openings/course'
import {
  ALVO_MAINLINE,
  ALVO_PERSPECTIVA_REVERSA,
  ABERTURA_TREINO_CONFIG,
  alvoReverso,
  fronteiraDaAbertura,
  iniciarRodadaDeAbertura,
  ladoDoAlvo,
  tipoDaRodada,
} from '@/domain/openings/jornada'
import { ramosCore } from '@/domain/openings/ramos'

const ITALIANA = OPENING_COURSES.find((o) => o.slug === 'italiana')!
/** Um ramo que de fato bifurca — é nele que a distinção de tipo tem efeito. */
const RAMO = ramosCore(ITALIANA).find((r) => r.ramificacao.indiceDaDivergencia !== null)!

describe('de onde a rodada parte', () => {
  it('a linha principal é SEMPRE contexto, nos dois papéis', () => {
    /*
      Ela não tem bifurcação de onde recuar — ela É a linha. Um "recuo" aqui
      abriria a rodada no meio da própria principal, sem razão nenhuma.
    */
    expect(tipoDaRodada(ALVO_MAINLINE, [])).toBe('contexto')
    expect(tipoDaRodada(ALVO_MAINLINE, [ALVO_MAINLINE])).toBe('contexto')
    expect(tipoDaRodada(ALVO_PERSPECTIVA_REVERSA, [ALVO_PERSPECTIVA_REVERSA])).toBe('contexto')
  })

  it('a PRIMEIRA vez de um ramo é contexto; depois vira rodada de ramo', () => {
    expect(tipoDaRodada(RAMO.id, [])).toBe('contexto')
    expect(tipoDaRodada(RAMO.id, [RAMO.id])).toBe('ramo')
    // E o papel reverso conta separado: enfrentar não é o mesmo que jogar.
    expect(tipoDaRodada(alvoReverso(RAMO.id), [RAMO.id])).toBe('contexto')
  })

  it('a rodada de CONTEXTO de um ramo começa na posição inicial da abertura', () => {
    const rodada = iniciarRodadaDeAbertura(ITALIANA, RAMO.id, ITALIANA.side, 'contexto')
    expect(rodada.startFen).toBe(ITALIANA.rootFen)
    expect(rodada.ply).toBe(0)
    expect(rodada.tipo).toBe('contexto')
  })

  it('a rodada de RAMO começa antes do desvio, e não NELE', () => {
    /*
      O DEFEITO QUE ISTO PEGA não dá erro: a rodada abria na posição exata da
      bifurcação e o aluno respondia certo sem nunca ter visto o adversário
      escolher. Ele decorava o quadro.
    */
    const divergencia = RAMO.ramificacao.indiceDaDivergencia
    expect(divergencia).not.toBeNull()

    const doRamo = iniciarRodadaDeAbertura(ITALIANA, RAMO.id, ITALIANA.side, 'ramo')

    expect(doRamo.tipo).toBe('ramo')
    // Antes do desvio…
    expect(doRamo.ply).toBeLessThan((divergencia ?? 0) + 1)
    // …e depois do início: senão seria rodada de contexto com outro nome.
    expect(doRamo.ply).toBeGreaterThan(0)
  })

  it('recuar NÃO troca de quem é a vez', () => {
    /*
      ESTE TESTE JÁ ME CORRIGIU UMA VEZ, e a correção vale registrar.
      Eu tinha escrito que a rodada de ramo deveria abrir na vez do ALUNO. É
      falso: ela abre na vez de QUEM FAZ O LANCE QUE BIFURCA. Num ramo autorado
      do adversário — a Defesa dos Dois Cavalos, por exemplo — quem joga
      primeiro é o computador, e é justamente ver o desvio acontecer que dá
      sentido à resposta.

      O que de fato precisa valer é que o RECUO não mude a fase da rodada.
      Recuar um número ímpar de plies entregaria a vez ao outro lado, e a tela
      passaria a pedir um lance a quem não é de jogar.
    */
    for (const opening of OPENING_COURSES) {
      for (const ramo of ramosCore(opening)) {
        if (ramo.ramificacao.indiceDaDivergencia === null) continue
        const lado = ladoDoAlvo(opening, ramo.id)
        const semRecuo = iniciarRodadaDeAbertura(opening, ramo.id, lado, 'ramo', {
          ...ABERTURA_TREINO_CONFIG,
          decisoesDeContextoNoRamo: 0,
        })
        const comRecuo = iniciarRodadaDeAbertura(opening, ramo.id, lado, 'ramo')
        expect(comRecuo.startFen.split(' ')[1], `${opening.slug} / ${ramo.nome}`).toBe(
          semRecuo.startFen.split(' ')[1],
        )
      }
    }
  })

  it('recuar zero decisões devolve exatamente a raiz do ramo', () => {
    // O config em zero tem de ser indistinguível do comportamento anterior —
    // é o que permite calibrar o número sem medo de estar mudando outra coisa.
    const semRecuo = iniciarRodadaDeAbertura(ITALIANA, RAMO.id, ITALIANA.side, 'ramo', {
      ...ABERTURA_TREINO_CONFIG,
      decisoesDeContextoNoRamo: 0,
    })
    expect(semRecuo.startNodeId).toBe(RAMO.ramificacao.variacao.rootNodeId)
  })

  it('o alvo da rodada não muda com o tipo: o que muda é de onde se parte', () => {
    const contexto = iniciarRodadaDeAbertura(ITALIANA, RAMO.id, ITALIANA.side, 'contexto')
    const ramo = iniciarRodadaDeAbertura(ITALIANA, RAMO.id, ITALIANA.side, 'ramo')
    expect(contexto.branchScopeId).toBe(RAMO.id)
    expect(ramo.branchScopeId).toBe(RAMO.id)
    // E as duas cobram a mesma profundidade: a linha ensinada é a mesma.
    expect(ramo.targetPly).toBe(contexto.targetPly)
  })

  it('as duas rodadas do mesmo alvo têm ids distintos', () => {
    // O id nomeia O QUE a rodada treina. Duas rodadas que partem de posições
    // diferentes não são a mesma coisa, e um id repetido as confundiria em
    // qualquer registro futuro.
    const contexto = iniciarRodadaDeAbertura(ITALIANA, RAMO.id, ITALIANA.side, 'contexto')
    const ramo = iniciarRodadaDeAbertura(ITALIANA, RAMO.id, ITALIANA.side, 'ramo')
    expect(ramo.id).not.toBe(contexto.id)
  })
})

describe('a fronteira: onde o repertório acaba e o plano começa', () => {
  it('toda abertura declara o que a fase de abertura buscava', () => {
    for (const opening of OPENING_COURSES) {
      const fronteira = fronteiraDaAbertura(opening)
      expect(fronteira.transicao.length, `${opening.slug}`).toBeGreaterThan(20)
    }
  })

  it('a fronteira aponta um plano real do conteúdo, e não inventa um', () => {
    /*
      Se o conteúdo não declarar plano, a tela mostra MENOS — nunca algo falso.
      Um "plano sugerido" gerado por heurística seria o app ensinando uma ideia
      que ninguém escreveu nem revisou.
    */
    for (const opening of OPENING_COURSES) {
      const fronteira = fronteiraDaAbertura(opening)
      if (fronteira.planoId === null) {
        expect(fronteira.planoNome, `${opening.slug}`).toBeNull()
        continue
      }
      expect(
        opening.plans.some((plano) => plano.id === fronteira.planoId),
        `${opening.slug}: plano ${fronteira.planoId} não existe no conteúdo`,
      ).toBe(true)
    }
  })

  it('toda abertura do catálogo tem plano na fronteira', () => {
    /*
      O NOME DIZIA "AS SEIS ABERTURAS" e o corpo já percorria o catálogo
      inteiro. Com 35 cursos, o nome passou a subestimar o que o portão cobre em
      quase seis vezes — e um portão cuja etiqueta mente sobre o alcance é um
      portão que ninguém sabe se pode remover. Achado na auditoria de escopo do
      ADR-0032.

      Não é exigência do tipo — é medida do conteúdo atual. Se um curso novo
      entrar sem plano, este teste avisa antes de a tela ficar muda.
    */
    for (const opening of OPENING_COURSES) {
      expect(fronteiraDaAbertura(opening).planoNome, `${opening.slug}`).not.toBeNull()
    }
  })
})
