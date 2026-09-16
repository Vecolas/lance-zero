/**
 * Portões da identidade visual (issue #16, ADR-0007).
 *
 * O que estes testes defendem, e por quê:
 *
 * 1. Todo estado visual carrega o trio cor + ícone + texto. A varredura
 *    percorre a FONTE (as chaves de `moveQualityTokens`, dos catálogos e de
 *    `SEVERITY_LABEL`), nunca uma lista escrita à mão: lista não acusa o que
 *    nunca entrou nela.
 * 2. Toda cor referenciada por um catálogo existe nos TRÊS blocos do
 *    `tokens.css` — claro, escuro por preferência do sistema e escuro
 *    explícito. Variável definida só no claro some no escuro e ninguém vê.
 * 3. A leitura da barra de avaliação obedece à REGRA (o lado acompanha o sinal,
 *    a perspectiva inverte, mate satura), e não a números cravados, que no dia
 *    de uma recalibração passariam a defender o defeito.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SEVERITY_LABEL } from '@/domain/games/comparison'
import { EVALUATION_BAR_CONFIG, readEvaluation } from '@/lib/design/evaluation-bar'
import { feedbackToneCatalog } from '@/lib/design/feedback'
import {
  describeMoveQuality,
  moveQualityCatalog,
  moveQualityFromSeverity,
} from '@/lib/design/move-quality'
import { readSkill, SKILL_CARD_CONFIG, skillStatusCatalog } from '@/lib/design/skill-card'
import { moveQualityTokens, type MoveQuality } from '@/lib/design/tokens'

const tokensCss = readFileSync(join(process.cwd(), 'src/app/tokens.css'), 'utf8')

/** Extrai o corpo de um seletor contando chaves, para não parar cedo demais. */
function corpoDoSeletor(css: string, seletor: string): string {
  const inicio = css.indexOf(`${seletor} {`)
  if (inicio < 0) throw new Error(`seletor não encontrado em tokens.css: ${seletor}`)
  const abre = css.indexOf('{', inicio)
  let profundidade = 0
  for (let i = abre; i < css.length; i += 1) {
    if (css[i] === '{') profundidade += 1
    if (css[i] === '}') {
      profundidade -= 1
      if (profundidade === 0) return css.slice(abre + 1, i)
    }
  }
  throw new Error(`bloco não fechado em tokens.css: ${seletor}`)
}

const BLOCOS: Record<string, string> = {
  claro: corpoDoSeletor(tokensCss, ':root'),
  'escuro por preferência do sistema': corpoDoSeletor(tokensCss, ":root:not([data-theme='light'])"),
  'escuro explícito': corpoDoSeletor(tokensCss, ":root[data-theme='dark']"),
}

function declara(bloco: string, variavel: string): boolean {
  return new RegExp(`^\\s*${variavel}\\s*:`, 'm').test(bloco)
}

interface EstadoVisual {
  label: string
  colorVar: string
  icon: { viewBox: string; path: string }
}

/** Todos os catálogos de estado do projeto, varridos pela chave. */
const CATALOGOS: Record<string, Record<string, EstadoVisual>> = {
  'classificação de lance': moveQualityCatalog,
  'feedback de puzzle': feedbackToneCatalog,
  'estado de habilidade': skillStatusCatalog,
}

describe('todo estado visual sai como cor + ícone + texto', () => {
  it('a varredura encontrou catálogos, e nenhum deles está vazio', () => {
    // Portão com zero verificações tem de reprovar: sem esta afirmação, um
    // catálogo que virasse `{}` deixaria os testes abaixo verdes e vazios.
    const catalogos = Object.entries(CATALOGOS)
    expect(catalogos.length).toBeGreaterThan(0)
    for (const [nome, catalogo] of catalogos) {
      expect(Object.keys(catalogo).length, `catálogo "${nome}" vazio`).toBeGreaterThan(0)
    }
  })

  it('cada estado tem rótulo, cor e ícone', () => {
    for (const [nome, catalogo] of Object.entries(CATALOGOS)) {
      for (const [chave, descritor] of Object.entries(catalogo)) {
        const onde = `${nome} / ${chave}`
        expect(descritor.label.trim(), `${onde}: rótulo`).not.toBe('')
        expect(descritor.colorVar, `${onde}: cor`).toMatch(/^var\(--[a-z-]+\)$/)
        expect(descritor.icon.path.trim(), `${onde}: ícone`).not.toBe('')
        expect(descritor.icon.viewBox, `${onde}: viewBox`).toMatch(/^\d+ \d+ \d+ \d+$/)
      }
    }
  })

  it('a cor de cada estado existe nos três blocos do tokens.css', () => {
    for (const [nome, catalogo] of Object.entries(CATALOGOS)) {
      for (const [chave, descritor] of Object.entries(catalogo)) {
        const variavel = descritor.colorVar.slice('var('.length, -1)
        for (const [tema, bloco] of Object.entries(BLOCOS)) {
          expect(
            declara(bloco, variavel),
            `${nome} / ${chave}: ${variavel} não está declarada no tema ${tema}`,
          ).toBe(true)
        }
      }
    }
  })

  it('estados do mesmo catálogo têm silhuetas distintas', () => {
    // Se dois estados compartilhassem o ícone, a distinção voltaria a depender
    // de cor. Imprecisão e erro compartilham a COR de propósito (ver o
    // cabeçalho de move-quality.ts) — é o ícone que os separa.
    for (const [nome, catalogo] of Object.entries(CATALOGOS)) {
      const caminhos = Object.values(catalogo).map((d) => d.icon.path)
      expect(new Set(caminhos).size, `${nome}: ícones repetidos`).toBe(caminhos.length)
    }
  })
})

describe('classificação de lance', () => {
  it('o catálogo cobre exatamente as classificações da fonte', () => {
    const chaves = Object.keys(moveQualityTokens)
    expect(chaves.length).toBeGreaterThan(0)
    expect(Object.keys(moveQualityCatalog).sort()).toEqual([...chaves].sort())
  })

  it('rótulo e token de preenchimento são DERIVADOS da fonte, não recopiados', () => {
    const entradas = Object.entries(moveQualityTokens)
    expect(entradas.length).toBeGreaterThan(0)
    for (const [chave, base] of entradas) {
      const descritor = describeMoveQuality(chave as MoveQuality)
      expect(descritor.label, chave).toBe(base.label)
      expect(descritor.fillToken, chave).toBe(base.token)
    }
  })

  it('toda severidade do domínio tem classificação visual', () => {
    const severidades = Object.keys(SEVERITY_LABEL) as Array<keyof typeof SEVERITY_LABEL>
    expect(severidades.length).toBeGreaterThan(0)
    for (const severidade of severidades) {
      expect(moveQualityCatalog[moveQualityFromSeverity(severidade)], severidade).toBeDefined()
    }
  })

  it('severidade pior nunca vira classificação mais branda', () => {
    const ordem: MoveQuality[] = ['excelente', 'bom', 'imprecisao', 'erro', 'blunder']
    const posicao = (s: keyof typeof SEVERITY_LABEL) => ordem.indexOf(moveQualityFromSeverity(s))
    expect(posicao('ok')).toBeLessThan(posicao('imprecisao'))
    expect(posicao('imprecisao')).toBeLessThan(posicao('erro'))
    expect(posicao('erro')).toBeLessThan(posicao('erro-grave'))
  })

  it('`ok` não vira "excelente": não perder avaliação não é ter achado o melhor lance', () => {
    expect(moveQualityFromSeverity('ok')).not.toBe('excelente')
  })
})

describe('barra de avaliação', () => {
  const daVezBrancas = { perspectiva: 'brancas' as const }

  it('vantagem das brancas enche mais da metade; das pretas, menos', () => {
    const boa = readEvaluation({ scoreCp: 300, mateIn: null, ...daVezBrancas })
    const ruim = readEvaluation({ scoreCp: -300, mateIn: null, ...daVezBrancas })
    expect(boa.fracaoBrancas).toBeGreaterThan(0.5)
    expect(ruim.fracaoBrancas).toBeLessThan(0.5)
    expect(boa.lado).toBe('brancas')
    expect(ruim.lado).toBe('pretas')
  })

  it('é monotônica: mais centipeões nunca dão menos barra', () => {
    const amostras = [-900, -300, -100, -20, 0, 20, 100, 300, 900]
    expect(amostras.length).toBeGreaterThan(0)
    const fracoes = amostras.map(
      (cp) => readEvaluation({ scoreCp: cp, mateIn: null, ...daVezBrancas }).fracaoBrancas,
    )
    for (let i = 1; i < fracoes.length; i += 1) {
      expect(fracoes[i], `cp ${amostras[i]}`).toBeGreaterThanOrEqual(fracoes[i - 1])
    }
  })

  it('a perspectiva inverte o lado — o mesmo número muda de dono', () => {
    const brancas = readEvaluation({ scoreCp: 250, mateIn: null, perspectiva: 'brancas' })
    const pretas = readEvaluation({ scoreCp: 250, mateIn: null, perspectiva: 'pretas' })
    expect(brancas.lado).toBe('brancas')
    expect(pretas.lado).toBe('pretas')
    expect(brancas.fracaoBrancas).toBeGreaterThan(pretas.fracaoBrancas)
  })

  it('mate satura a barra sem apagar o lado perdedor', () => {
    const branco = readEvaluation({ scoreCp: null, mateIn: 3, ...daVezBrancas })
    const preto = readEvaluation({ scoreCp: null, mateIn: -3, ...daVezBrancas })
    expect(branco.numero).toBe('M3')
    expect(branco.lado).toBe('brancas')
    expect(preto.lado).toBe('pretas')
    expect(branco.fracaoBrancas).toBeGreaterThan(preto.fracaoBrancas)
    for (const leitura of [branco, preto]) {
      expect(leitura.fracaoBrancas).toBeGreaterThan(0)
      expect(leitura.fracaoBrancas).toBeLessThan(1)
    }
  })

  it('mate vale pelo menos tanto quanto qualquer vantagem material', () => {
    const mate = readEvaluation({ scoreCp: null, mateIn: 8, ...daVezBrancas })
    const material = readEvaluation({ scoreCp: 5000, mateIn: null, ...daVezBrancas })
    expect(mate.fracaoBrancas).toBeGreaterThanOrEqual(material.fracaoBrancas)
  })

  it('sem avaliação a barra NÃO finge equilíbrio', () => {
    const vazia = readEvaluation({ scoreCp: null, mateIn: null, ...daVezBrancas })
    expect(vazia.avaliado).toBe(false)
    expect(vazia.numero).toBe('—')
    expect(vazia.rotulo).toMatch(/não avaliada/i)
  })

  it('dentro do limiar o lado é equilíbrio, mas o número continua o da engine', () => {
    const cp = EVALUATION_BAR_CONFIG.limiarDeEquilibrioCp - 1
    const leitura = readEvaluation({ scoreCp: cp, mateIn: null, ...daVezBrancas })
    expect(leitura.lado).toBe('equilibrio')
    expect(leitura.numero).not.toBe('—')
    expect(leitura.numero.startsWith('+')).toBe(true)
  })

  it('nenhum rótulo apresenta a avaliação como chance de vitória', () => {
    // O CLAUDE.md proíbe transformar número de engine em probabilidade humana.
    // A varredura passa por todas as formas de saída, não por uma frase
    // escolhida a dedo.
    const casos = [
      { scoreCp: 400, mateIn: null, ...daVezBrancas },
      { scoreCp: -400, mateIn: null, ...daVezBrancas },
      { scoreCp: 0, mateIn: null, ...daVezBrancas },
      { scoreCp: 10, mateIn: null, perspectiva: 'pretas' as const },
      { scoreCp: null, mateIn: 2, ...daVezBrancas },
      { scoreCp: null, mateIn: -2, ...daVezBrancas },
      { scoreCp: null, mateIn: 0, ...daVezBrancas },
      { scoreCp: null, mateIn: null, ...daVezBrancas },
    ]
    expect(casos.length).toBeGreaterThan(0)
    for (const caso of casos) {
      const { rotulo } = readEvaluation(caso)
      expect(rotulo, `rótulo: ${rotulo}`).not.toMatch(/chance|probabilidade|% de vit/i)
      expect(rotulo.trim()).not.toBe('')
    }
  })
})

describe('card de habilidade', () => {
  it('amostra pequena não vira percentual', () => {
    const leitura = readSkill({ mastery: 0.31, attempts: SKILL_CARD_CONFIG.minimoDeTentativas - 1 })
    expect(leitura.percentual).toBeNull()
    expect(leitura.fracao).toBeNull()
    expect(leitura.status).toBe('sem-amostra')
    expect(leitura.nota.trim()).not.toBe('')
  })

  it('a partir do mínimo o número aparece, e é inteiro', () => {
    const leitura = readSkill({ mastery: 0.317, attempts: SKILL_CARD_CONFIG.minimoDeTentativas })
    expect(leitura.percentual).toBe(32)
  })

  it('o status acompanha a maestria pela REGRA, não por número cravado', () => {
    const attempts = SKILL_CARD_CONFIG.minimoDeTentativas + 10
    expect(readSkill({ mastery: SKILL_CARD_CONFIG.faixaFirme, attempts }).status).toBe('firme')
    expect(readSkill({ mastery: SKILL_CARD_CONFIG.faixaFirme - 0.01, attempts }).status).toBe(
      'em-treino',
    )
    expect(readSkill({ mastery: SKILL_CARD_CONFIG.faixaEmTreino, attempts }).status).toBe(
      'em-treino',
    )
    expect(readSkill({ mastery: SKILL_CARD_CONFIG.faixaEmTreino - 0.01, attempts }).status).toBe(
      'prioridade',
    )
  })

  it('maestria fora de 0..1 não vaza para a barra', () => {
    const attempts = SKILL_CARD_CONFIG.minimoDeTentativas
    expect(readSkill({ mastery: 1.4, attempts }).percentual).toBe(100)
    expect(readSkill({ mastery: -0.2, attempts }).percentual).toBe(0)
  })
})

/**
 * NENHUMA FOLHA DE COMPONENTE INVENTA COR.
 *
 * `RoadmapView.module.css` tinha vinte e nove hexadecimais escritos à mão, de
 * uma paleta que não é a da marca. Como hexadecimal não troca com o tema, o
 * título da tela ficava em `#102a43` sobre `#07131c` no modo escuro: 1.28:1 —
 * invisível, não "pouco contraste". Os filtros davam 2.17:1 e a legenda 2.91:1.
 *
 * A varredura de contraste renderizada pega o EFEITO, mas só depois de subir o
 * app inteiro em dois temas e duas larguras. Este teste pega a CAUSA, em
 * milissegundos, e diz o que fazer: a cor vem do token.
 *
 * O QUE CONTINUA PERMITIDO, porque não é cor de tema: sombra e contorno em
 * `rgba()`, e hexadecimal dentro de gradiente decorativo. A regra mira `color` e
 * `background` — o que o aluno lê, e o que fica atrás do que ele lê.
 */
describe('as folhas de componente não inventam cor', () => {
  const FOLHAS = readdirSync('src', { recursive: true, encoding: 'utf8' })
    .filter((caminho) => caminho.endsWith('.module.css'))
    .map((caminho) => join('src', caminho))

  it('a varredura encontrou folhas de estilo', () => {
    // Piso grosseiro de propósito: afirma que HOUVE varredura. Um glob que
    // parasse de casar deixaria este portão verde por vacuidade.
    expect(FOLHAS.length).toBeGreaterThan(20)
  })

  it('`color` e `background` saem de token, nunca de hexadecimal cravado', () => {
    const infracoes: string[] = []

    for (const caminho of FOLHAS) {
      readFileSync(caminho, 'utf8')
        .split('\n')
        .forEach((linha, i) => {
          const semComentario = linha.replace(/\/\*.*?\*\//g, '')
          if (/^\s*(color|background(-color)?)\s*:\s*[^;]*#[0-9a-fA-F]{3,8}/.test(semComentario)) {
            infracoes.push(`${caminho}:${i + 1} — ${linha.trim()}`)
          }
        })
    }

    expect(infracoes, `cor cravada fora dos tokens:\n${infracoes.join('\n')}`).toEqual([])
  })
})
