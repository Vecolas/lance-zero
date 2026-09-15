/**
 * Portão da escada de ajuda e do grafo de currículo.
 *
 * O TESTE QUE JUSTIFICA O ARQUIVO é `nunca devolve "tente de novo"`. Ele afirma
 * uma AUSÊNCIA, e ausências são o que ninguém nota faltando: se um dia alguém
 * acrescentar um ramo de repetição a `responderAoErro`, nada no app quebra —
 * a tela volta a pedir o mesmo lance, o aluno volta a chutar, e o produto volta
 * a treinar força bruta sem nenhum erro aparecer em lugar nenhum.
 *
 * Do lado do currículo, o portão que mais importa é o de CICLO. Um ciclo no
 * grafo não gera exceção: ele faz o planner procurar para sempre um conceito
 * ensinável que não existe, e o sintoma seria "o Hoje ficou vazio".
 */

import { describe, expect, it } from 'vitest'
import {
  AJUDA_CONFIG,
  DEGRAUS_DE_DICA,
  NIVEIS_DE_APOIO,
  estagioAlcanca,
  feedbackGenerico,
  foiIndependente,
  nivelDeApoio,
  ordemDoCurriculo,
  prerequisitosDe,
  prerequisitosTransitivos,
  profundidadeNoCurriculo,
  responderAoErro,
  verificarCurriculo,
  type RespostaAoErro,
} from '@/domain/aprendizado'
import { SKILL_IDS } from '@/domain/types'

describe('a escada de dicas', () => {
  it('vai do processo para a resposta, nessa ordem', () => {
    // A ordem é o conteúdo: o primeiro degrau ensina um hábito que serve a
    // qualquer posição; o último entrega um lance que só serve a esta.
    expect([...DEGRAUS_DE_DICA]).toEqual(['direcao', 'area', 'ideia', 'candidato'])
  })

  it('o nível de apoio acompanha quantas dicas foram abertas', () => {
    expect(nivelDeApoio(0, false)).toBe('sem-dica')
    expect(nivelDeApoio(1, false)).toBe('dica-1')
    expect(nivelDeApoio(4, false)).toBe('dica-4')
    // Revelar a solução domina qualquer contagem de dicas.
    expect(nivelDeApoio(0, true)).toBe('solucao-revelada')
    expect(nivelDeApoio(9, true)).toBe('solucao-revelada')
  })

  it('não estoura a lista com contagens absurdas', () => {
    for (const dicas of [-3, 0, 1, 7, 100]) {
      expect(NIVEIS_DE_APOIO).toContain(nivelDeApoio(dicas, false))
    }
  })

  it('só conta como independente quem não abriu dica nenhuma', () => {
    expect(foiIndependente('sem-dica')).toBe(true)
    for (const nivel of NIVEIS_DE_APOIO.filter((n) => n !== 'sem-dica')) {
      expect(foiIndependente(nivel), `${nivel} passou por independente`).toBe(false)
    }
  })
})

describe('o que acontece quando o aluno erra', () => {
  it('a assistência CRESCE a cada erro, e nunca diminui', () => {
    const peso: Record<RespostaAoErro['acao'], number> = {
      dica: 1,
      decompor: 2,
      'mostrar-solucao': 3,
      'trocar-posicao': 4,
    }

    let anterior = 0
    for (let erros = 1; erros <= 6; erros += 1) {
      const atual = peso[responderAoErro(erros, 0).acao]
      expect(atual, `o erro ${erros} reduziu a ajuda`).toBeGreaterThanOrEqual(anterior)
      anterior = atual
    }
  })

  it('NUNCA devolve "tente de novo" — a escada termina em trocar de posição', () => {
    // A afirmação de ausência. Vinte erros seguidos, e em nenhum deles a
    // resposta é repetir a mesma pergunta.
    const acoes = new Set<string>()
    for (let erros = 1; erros <= 20; erros += 1) {
      acoes.add(responderAoErro(erros, 0).acao)
    }
    expect([...acoes].sort()).toEqual(['decompor', 'dica', 'mostrar-solucao', 'trocar-posicao'])

    // E o estado final é estável: do quarto erro em diante, sempre trocar.
    for (let erros = AJUDA_CONFIG.errosAteMostrarSolucao + 1; erros <= 20; erros += 1) {
      expect(responderAoErro(erros, 0).acao).toBe('trocar-posicao')
    }
  })

  it('o primeiro erro abre a dica de PROCESSO, não a que aponta a peça', () => {
    const resposta = responderAoErro(1, 0)
    expect(resposta.acao).toBe('dica')
    expect(resposta.acao === 'dica' ? resposta.degrau : null).toBe('direcao')
  })

  it('cada erro seguinte abre o degrau seguinte, sem pular nem estourar', () => {
    for (let abertas = 0; abertas < DEGRAUS_DE_DICA.length + 3; abertas += 1) {
      const resposta = responderAoErro(1, abertas)
      if (resposta.acao !== 'dica') continue
      expect(DEGRAUS_DE_DICA).toContain(resposta.degrau)
    }
  })

  it('mostra a solução no erro configurado, e só uma vez', () => {
    expect(responderAoErro(AJUDA_CONFIG.errosAteMostrarSolucao, 0).acao).toBe('mostrar-solucao')
    expect(responderAoErro(AJUDA_CONFIG.errosAteMostrarSolucao + 1, 0).acao).toBe('trocar-posicao')
  })
})

describe('o feedback explicativo', () => {
  it('as quatro perguntas da §18 são obrigatórias no tipo', () => {
    const feedback = feedbackGenerico()
    expect(Object.keys(feedback).sort()).toEqual([
      'oQueAconteceu',
      'oQuePassouBatido',
      'perguntaQueEvitaria',
      'porQueParecia',
    ])
    for (const [campo, texto] of Object.entries(feedback)) {
      expect(texto.length, `${campo} vazio`).toBeGreaterThan(20)
    }
  })

  it('o genérico não INVENTA um motivo sobre a posição', () => {
    // A regra do CLAUDE.md: motivo inventado é pior que `unknown`. O texto
    // genérico diz explicitamente que não sabe, em vez de afirmar qual peça
    // ficou pendurada numa posição que ele não olhou.
    expect(feedbackGenerico().oQuePassouBatido).toMatch(/ainda não sei|não inventar/i)
  })

  it('a pergunta que evita o erro é reutilizável, e não fala desta posição', () => {
    const pergunta = feedbackGenerico().perguntaQueEvitaria
    expect(pergunta).toMatch(/\?/)
    expect(pergunta).not.toMatch(/\b[a-h][1-8]\b/)
  })
})

describe('o grafo de currículo', () => {
  it('não tem ciclo, aresta repetida nem pré-requisito fora do catálogo', () => {
    expect(verificarCurriculo().map((f) => `${f.skillId}: ${f.problema}`)).toEqual([])
  })

  it('cobre o catálogo inteiro', () => {
    // Uma habilidade nova sem entrada no grafo passaria despercebida: ela
    // simplesmente nunca seria oferecida pelo currículo, e o sintoma seria
    // "esse tema nunca aparece".
    for (const skillId of SKILL_IDS) {
      expect(() => prerequisitosDe(skillId)).not.toThrow()
    }
    expect(ordemDoCurriculo().length).toBe(SKILL_IDS.length)
  })

  it('tem pelo menos uma raiz, senão nada seria ensinável', () => {
    const raizes = SKILL_IDS.filter((id) => prerequisitosDe(id).length === 0)
    expect(raizes.length).toBeGreaterThan(0)
    expect(raizes).toContain('tactics.hanging-piece')
  })

  it('os transitivos vêm em ordem topológica: raiz antes de quem depende dela', () => {
    for (const skillId of SKILL_IDS) {
      const transitivos = prerequisitosTransitivos(skillId)
      expect(new Set(transitivos).size, `${skillId} repete um pré-requisito`).toBe(
        transitivos.length,
      )
      expect(transitivos, `${skillId} é pré-requisito de si mesma`).not.toContain(skillId)

      transitivos.forEach((pai, indice) => {
        for (const avô of prerequisitosDe(pai)) {
          expect(
            transitivos.indexOf(avô),
            `${skillId}: ${avô} aparece depois de ${pai}`,
          ).toBeLessThan(indice)
        }
      })
    }
  })

  it('a ordem do currículo põe todo pré-requisito antes de quem depende dele', () => {
    const ordem = ordemDoCurriculo()
    for (const skillId of SKILL_IDS) {
      for (const pai of prerequisitosDe(skillId)) {
        expect(ordem.indexOf(pai), `${pai} vem depois de ${skillId}`).toBeLessThan(
          ordem.indexOf(skillId),
        )
      }
    }
  })

  it('a profundidade é coerente com as arestas', () => {
    for (const skillId of SKILL_IDS) {
      const pais = prerequisitosDe(skillId)
      if (pais.length === 0) {
        expect(profundidadeNoCurriculo(skillId)).toBe(0)
        continue
      }
      expect(profundidadeNoCurriculo(skillId)).toBe(
        1 + Math.max(...pais.map(profundidadeNoCurriculo)),
      )
    }
  })

  it('a ordem do currículo é determinística', () => {
    expect(ordemDoCurriculo()).toEqual(ordemDoCurriculo())
  })

  it('estagioAlcanca continua coerente com o uso do planner', () => {
    expect(estagioAlcanca('guided', 'guided')).toBe(true)
    expect(estagioAlcanca('introduced', 'guided')).toBe(false)
  })
})
