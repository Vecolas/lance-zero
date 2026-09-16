/**
 * Os portões da internacionalização.
 *
 * O QUE ELES PROTEGEM, e por que cada um existe:
 *
 * 1. LOCALE É ENTRADA NÃO CONFIÁVEL. Ele chega por URL, cookie e cabeçalho —
 *    três fontes que o app não controla. Se `normalizarLocale` deixasse passar um
 *    valor arbitrário, ele viraria caminho de import e a preferência de idioma
 *    passaria a escolher qual arquivo o servidor lê.
 * 2. A TROCA DE IDIOMA NÃO PODE PERDER O LUGAR. É a regra final do plano, e a
 *    parte dela que se testa sem navegador mora em `traduzirRota`.
 * 3. ID NÃO SE TRADUZ. `italiana`, `opposition`, `tactics.fork` são os mesmos nos
 *    dois idiomas — é o que faz o progresso do aluno sobreviver à troca.
 * 4. AS DUAS TABELAS DE MENSAGEM TÊM AS MESMAS CHAVES. Chave só em português
 *    vira, em inglês, ou um erro em desenvolvimento ou um fallback silencioso em
 *    produção; as duas coisas são piores que o teste vermelho.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  caminhoComLocale,
  caminhoSemLocale,
  isAppLocale,
  localeDoCaminho,
  normalizarLocale,
} from '@/lib/i18n/locales'
import { caminhoInterno, traduzirRota, traduzirSegmento } from '@/lib/i18n/rotas'
import { criarTradutor, dicionario } from '@/lib/i18n/mensagens'
import {
  nomeDaAbertura,
  nomeDaHabilidade,
  nomeDoFinal,
  nomesSemIngles,
} from '@/lib/i18n/nomes-de-conteudo'
import { nosSemIngles, textoDoNo } from '@/lib/i18n/nos-do-roadmap'
import { ROADMAP_DEFINITION } from '@/domain/roadmap'
import { lerModo } from '@/lib/training/modo-de-aprendizado'

/* --------------------------------------------- LOCALE COMO ENTRADA SUJA --- */

describe('o locale é validado contra a allowlist', () => {
  it('aceita só os dois idiomas do produto', () => {
    expect(SUPPORTED_LOCALES).toEqual(['pt-BR', 'en'])
    expect(DEFAULT_LOCALE).toBe('pt-BR')
    expect(isAppLocale('pt-BR')).toBe(true)
    expect(isAppLocale('en')).toBe(true)
    expect(isAppLocale('de')).toBe(false)
  })

  it('variante regional cai no idioma base', () => {
    expect(normalizarLocale('en-US')).toBe('en')
    expect(normalizarLocale('en-GB')).toBe('en')
    expect(normalizarLocale('pt')).toBe('pt-BR')
    expect(normalizarLocale('pt-PT')).toBe('pt-BR')
  })

  /**
   * O TESTE QUE IMPORTA. Um locale montado por quem manda a requisição não pode
   * virar caminho: é assim que uma preferência de idioma vira leitura de arquivo
   * arbitrária.
   */
  it('lixo vira o padrão, nunca um caminho', () => {
    for (const entrada of [
      '../../etc/passwd',
      '../../../messages/secret',
      'pt-BR/../../',
      '',
      null,
      undefined,
      42,
      {},
    ]) {
      expect(normalizarLocale(entrada)).toBe(DEFAULT_LOCALE)
    }
  })
})

/* ------------------------------------------------------ PREFIXO DE ROTA --- */

describe('o prefixo de idioma no caminho', () => {
  it('o português não tem prefixo, e é isso que preserva as URLs de hoje', () => {
    expect(localeDoCaminho('/aberturas')).toBeNull()
    expect(caminhoComLocale('/aberturas', 'pt-BR')).toBe('/aberturas')
  })

  it('o inglês tem', () => {
    expect(localeDoCaminho('/en/openings')).toBe('en')
    expect(caminhoSemLocale('/en/openings')).toBe('/openings')
    expect(caminhoComLocale('/aberturas', 'en')).toBe('/en/aberturas')
  })

  it('a raiz não vira caminho vazio', () => {
    expect(caminhoSemLocale('/en')).toBe('/')
    expect(caminhoComLocale('/', 'en')).toBe('/en')
    expect(caminhoComLocale('/en', 'pt-BR')).toBe('/')
  })
})

/* ------------------------------------- A TROCA NÃO PODE PERDER O LUGAR --- */

describe('trocar de idioma continua no mesmo lugar', () => {
  it('traduz o nome da seção e preserva o resto', () => {
    expect(traduzirRota('/dashboard', 'en')).toBe('/en/today')
    expect(traduzirRota('/en/today', 'pt-BR')).toBe('/dashboard')
    expect(traduzirRota('/revisao/sessao', 'en')).toBe('/en/review/session')
  })

  /**
   * O SLUG NÃO É TRADUZIDO, e é decisão declarada: `italiana` identifica o curso
   * nos dois idiomas. Traduzi-lo exigiria um mapa por conteúdo, mantido à mão, e
   * o dia em que ele divergisse do catálogo produziria um link para a abertura
   * errada — que é pior que um slug em português numa URL inglesa.
   */
  it('o identificador do conteúdo NÃO é traduzido', () => {
    expect(traduzirRota('/aberturas/italiana', 'en')).toBe('/en/aberturas/italiana')
    expect(traduzirSegmento('italiana', 'en')).toBe('italiana')
    expect(traduzirSegmento('tactics.fork', 'en')).toBe('tactics.fork')
  })

  /**
   * ABERTURAS E FINAIS NÃO SÃO TRADUZIDOS, e o teste existe para que a decisão
   * não seja revertida por parecer inacabada.
   *
   * As duas grafias já existem como rotas DIFERENTES: `/aberturas` é a jornada e
   * `/openings` é a bancada de repertório; `/finais` é a jornada e `/endgames` é
   * a biblioteca antiga. Traduzir o segmento sequestrava duas telas — uma
   * respondia 404 e a outra abria a errada.
   */
  it('não traduz segmento cuja grafia já é outra rota do app', () => {
    expect(traduzirRota('/aberturas', 'en')).toBe('/en/aberturas')
    expect(traduzirRota('/finais/oposicao', 'en')).toBe('/en/finais/oposicao')
    expect(traduzirSegmento('openings', 'pt-BR')).toBe('openings')
    expect(traduzirSegmento('endgames', 'pt-BR')).toBe('endgames')
  })

  /**
   * A QUERY CARREGA O CHECKPOINT. `?etapa=` e `?modo=` são onde o aluno parou;
   * perdê-los na troca de idioma é a mesma falha de mandar para a home, só que
   * mais difícil de notar.
   */
  it('a query e o fragmento viajam inteiros', () => {
    expect(traduzirRota('/aberturas/italiana?etapa=treino-final&modo=continuar', 'en')).toBe(
      '/en/aberturas/italiana?etapa=treino-final&modo=continuar',
    )
    expect(traduzirRota('/finais/oposicao?modo=reaprender#nota', 'en')).toBe(
      '/en/finais/oposicao?modo=reaprender#nota',
    )
  })

  it('a ida e a volta devolvem o mesmo caminho', () => {
    for (const caminho of [
      '/',
      '/dashboard',
      '/aberturas/italiana',
      '/finais/oposicao',
      '/lessons/jornada/candidatos',
      '/revisao/sessao',
    ]) {
      expect(traduzirRota(traduzirRota(caminho, 'en'), 'pt-BR'), caminho).toBe(caminho)
    }
  })

  it('o caminho interno leva sempre à árvore portuguesa', () => {
    expect(caminhoInterno('/en/today', 'en')).toBe('/en/dashboard')
    expect(caminhoInterno('/aberturas/italiana', 'pt-BR')).toBe('/pt-BR/aberturas/italiana')
    expect(caminhoInterno('/', 'pt-BR')).toBe('/pt-BR')
  })
})

/* ------------------------------------------------------------ MENSAGENS --- */

describe('as duas tabelas de mensagem têm as MESMAS chaves', () => {
  function chaves(objeto: unknown, prefixo = ''): string[] {
    if (typeof objeto !== 'object' || objeto === null) return [prefixo]
    return Object.entries(objeto).flatMap(([chave, valor]) =>
      chaves(valor, prefixo ? `${prefixo}.${chave}` : chave),
    )
  }

  it('nenhuma chave existe só num idioma', () => {
    const pt = new Set(chaves(dicionario('pt-BR')))
    const en = new Set(chaves(dicionario('en')))

    const soEmPortugues = [...pt].filter((chave) => !en.has(chave))
    const soEmIngles = [...en].filter((chave) => !pt.has(chave))

    expect(soEmPortugues, 'chaves sem tradução em inglês').toEqual([])
    expect(soEmIngles, 'chaves que só existem em inglês').toEqual([])
  })

  it('nenhuma mensagem em inglês ficou igual ao português por esquecimento', () => {
    const pt = dicionario('pt-BR')
    // Alguns textos são legitimamente iguais — "Roadmap", "Status", "Puzzles",
    // nomes próprios. O portão não é "tudo diferente"; é que a MAIORIA mudou.
    const planoPt = chaves(pt)
    const iguais = planoPt.filter((chave) => {
      const t1 = criarTradutor('pt-BR')
      const t2 = criarTradutor('en')
      try {
        return t1(chave as never) === t2(chave as never)
      } catch {
        return false
      }
    })
    expect(iguais.length / planoPt.length).toBeLessThan(0.2)
  })
})

describe('o tradutor', () => {
  const t = criarTradutor('en')

  it('interpola valores', () => {
    expect(t('journey.stageOf', { current: 2, total: 9 })).toBe('Stage 2 of 9')
  })

  it('resolve plural pela regra do idioma', () => {
    expect(criarTradutor('pt-BR')('roadmap.contentCount', { count: 1 })).toBe('1 conteúdo')
    expect(criarTradutor('pt-BR')('roadmap.contentCount', { count: 6 })).toBe('6 conteúdos')
    expect(t('roadmap.contentCount', { count: 1 })).toBe('1 topic')
    expect(t('roadmap.contentCount', { count: 6 })).toBe('6 topics')
  })

  /**
   * CHAVE AUSENTE LANÇA EM DESENVOLVIMENTO. Mostrar `roadmap.filters.all` para o
   * aluno é o encanamento aparecendo; o §159 do plano proíbe, e a única forma de
   * garantir é falhar cedo, onde quem escreveu ainda está olhando.
   */
  it('chave inexistente é ERRO, não texto na tela', () => {
    expect(() => t('roadmap.naoExiste' as never)).toThrow(/Mensagem ausente/)
  })
})

/* ------------------------------------------- NOMES: ID × APRESENTAÇÃO --- */

describe('o id é canônico; o nome é apresentação', () => {
  it('a mesma abertura, dois nomes, um id', () => {
    expect(nomeDaAbertura('italiana', 'pt-BR')).toBe('Abertura Italiana')
    expect(nomeDaAbertura('italiana', 'en')).toBe('Italian Game')
  })

  it('o mesmo final, dois nomes, um id', () => {
    expect(nomeDoFinal('opposition', 'pt-BR')).toBe('Oposição')
    expect(nomeDoFinal('opposition', 'en')).toBe('Opposition')
  })

  it('a mesma habilidade, dois nomes, um id', () => {
    expect(nomeDaHabilidade('tactics.fork', 'pt-BR')).toBe('Garfo')
    expect(nomeDaHabilidade('tactics.fork', 'en')).toBe('Fork')
  })

  /** "final" em inglês é `endgame`. É o erro de tradução mais provável do domínio. */
  it('FINAL é endgame, nunca "final"', () => {
    const t = criarTradutor('en')
    expect(t('navigation.endgames')).toBe('Endgames')
    expect(t('roadmap.areas.finais.title')).toBe('Endgames')
  })

  it('todo conteúdo do catálogo tem nome em inglês', () => {
    expect(nomesSemIngles(), 'conteúdo sem nome em inglês').toEqual([])
  })

  it('todo nó do Roadmap tem texto em inglês', () => {
    expect(nosSemIngles(), 'nós do Roadmap sem texto em inglês').toEqual([])
  })

  it('o nó traduzido continua sendo o MESMO nó', () => {
    const garfo = ROADMAP_DEFINITION.nodes.find((n) => n.id === 'skill.tactics.fork')!
    expect(textoDoNo(garfo, 'pt-BR').title).toBe('Garfo')
    expect(textoDoNo(garfo, 'en').title).toBe('Fork')
    // O id e o objeto de aprendizagem não mudam: é o que preserva o progresso.
    expect(garfo.id).toBe('skill.tactics.fork')
    expect(garfo.learningObjectId).toBe('skill:tactics.fork')
  })
})

/* --------------------------------------------------------- MODO NA URL --- */

describe('o modo lido da URL', () => {
  it('aceita só os modos conhecidos', () => {
    expect(lerModo('?modo=reaprender')).toBe('reaprender')
    expect(lerModo('?modo=continuar')).toBe('continuar')
    expect(lerModo('?modo=inventado')).toBeNull()
    expect(lerModo('')).toBeNull()
  })
})

/* ---------------------------------------------- NADA DE `locale === ` --- */

describe('a tradução não é espalhada pelo código', () => {
  const TELAS = [
    'src/components/roadmap/RoadmapView.tsx',
    'src/components/ui/SiteNav.tsx',
    'src/components/ui/AppShell.tsx',
    'src/components/lessons/JornadaDeLicoes.tsx',
    'src/components/jornada/StudyJourneyShell.tsx',
  ]

  /**
   * O §7 do plano proíbe `locale === 'en' ? 'Learn' : 'Aprender'` espalhado pelos
   * componentes, e a proibição não é de estilo: cada condicional dessas é uma
   * string que nunca vai para o arquivo de mensagens, e que ninguém encontra
   * quando chega o terceiro idioma.
   */
  it('nenhuma tela decide texto por comparação de locale', () => {
    const infracoes: string[] = []
    for (const caminho of TELAS) {
      const fonte = readFileSync(caminho, 'utf8')
      const codigo = fonte
        .split('\n')
        .filter((linha) => !/^\s*(\/\/|\*|\/\*)/.test(linha))
        .join('\n')
      if (/locale\s*===\s*['"]en['"]\s*\?/.test(codigo)) infracoes.push(caminho)
      if (/locale\s*===\s*['"]pt-BR['"]\s*\?/.test(codigo)) infracoes.push(caminho)
    }
    expect(infracoes, 'texto escolhido por `locale === ...` na tela').toEqual([])
  })
})
