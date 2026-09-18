import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

/*
  O PORTÃO DAS REFERÊNCIAS NORMATIVAS.

  Comentários em `src/` e `tests/` citam os planos na forma `§N`, e um arquivo de
  teste inteiro se apresenta como "o checklist do §61". Enquanto os documentos
  não estavam todos no repositório, essas citações eram links mortos conceituais:
  ninguém conseguia conferir se o código cumpre o que o § manda, e nada avisava
  que o destino não existia.

  Este portão fecha os dois buracos:

  1. os documentos citados precisam existir;
  2. toda seção citada precisa existir em algum deles.

  DUAS COISAS QUE SÓ APARECERAM QUANDO ELE RODOU:

  - são TRÊS planos, e o código cita os três com a mesma notação `§N`. A primeira
    versão deste portão conhecia um só e acusou 80 órfãs — a maioria era citação
    legítima ao plano errado. Um portão estreito demais produz alarme falso, e
    alarme falso é como um portão morre;

  - os três documentos usam formatos de numeração diferentes, porque foram
    escritos em épocas diferentes: o VNext e o da lógica de aprendizado usam
    cabeçalho Markdown (`### 38.2 …`), o de expansão usa linha simples
    (`52. PlanLibrary`). O portão aceita os dois e NÃO normaliza nenhum —
    reformatar um plano sem atualizar as citações é o que ele existe para
    impedir.
*/

/*
  ENDEREÇOS SEM DESTINO CONHECIDO, DECLARADOS E CONGELADOS.

  Estas seções são citadas por comentários que o trabalho de Aberturas NÃO
  escreveu — jornada, lições, i18n e finais — e não existem em nenhum dos três
  planos versionados. A numeração delas passa de §101, que é onde o plano mais
  longo termina, então provavelmente endereçam uma versão mais completa do plano
  da lógica de aprendizado que nunca entrou no repositório.

  ELAS FICAM AQUI EM VEZ DE SEREM APAGADAS por duas razões. Apagar o endereço
  destruiria a pista de que o documento existiu, e o §22 do plano de quitação é
  explícito em não misturar dívida de outras frentes nesta. Declaradas, elas
  ficam visíveis, contadas, e o portão passa a impedir que a lista CRESÇA: uma
  citação órfã nova reprova na hora.

  Resolver isto é achar o documento e versioná-lo, ou reescrever os comentários
  sem endereço. As duas coisas são decisão de outra frente, não desta.
*/
const SEM_DESTINO_CONHECIDO = new Set([
  '129',
  '134',
  '135',
  '144',
  '148',
  '151',
  '153',
  '158',
  '159',
  '161',
  '180',
  '204',
  '224',
  '13.5',
  '13.6',
  // Citada pelo ADR-0013, e da mesma família: passa de §101.
  '169',
])

const PLANOS = [
  'docs/LanceZero_Plano_Aberturas_VNext_Pesquisa_Implementacao.md',
  'docs/LanceZero_Plano_Expansao_Conteudo_Aberturas.md',
  'docs/LanceZero_Plano_Definitivo_Logica_Aprendizado.md',
] as const

/*
  ONDE UM COMENTÁRIO NORMATIVO PODE MORAR.

  `docs/adr` entrou aqui depois: os ADRs citam os planos 70 vezes, e um plano
  renumerado quebraria essas citações exatamente como quebraria as do código.
  Um ADR com endereço morto é pior que um comentário com endereço morto, porque
  ele é a memória da decisão.
*/
const RAIZES = ['src', 'tests', 'docs/adr']

const EXTENSOES = ['.ts', '.tsx', '.md']

function arquivos(dir: string): string[] {
  const achados: string[] = []
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) {
      achados.push(...arquivos(caminho))
      continue
    }
    if (EXTENSOES.some((ext) => nome.endsWith(ext))) achados.push(caminho)
  }
  return achados
}

/** Os endereços que os comentários podem usar, somando os três planos. */
function secoesDosPlanos(): Set<string> {
  const secoes = new Set<string>()
  const cabecalho = /^[ \t]*(?:#{1,6}[ \t]*)?(\d{1,3}(?:\.\d+)*)[.)]?[ \t]+\S/gm
  for (const plano of PLANOS) {
    for (const m of readFileSync(plano, 'utf8').matchAll(cabecalho)) secoes.add(m[1])
  }
  return secoes
}

/** Uma citação: o endereço pedido, e onde ele foi escrito. */
interface Citacao {
  secao: string
  arquivo: string
  linha: number
}

function citacoes(): Citacao[] {
  const achadas: Citacao[] = []
  for (const raiz of RAIZES) {
    for (const arquivo of arquivos(raiz)) {
      // O próprio portão cita §N nos comentários; ele não se mede.
      if (arquivo.includes('docs-referencias-normativas')) continue
      readFileSync(arquivo, 'utf8')
        .split('\n')
        .forEach((texto, i) => {
          // `§49–§51` e `§4 e §16` contam como duas citações cada.
          for (const m of texto.matchAll(/§\s*(\d{1,3}(?:\.\d+)*)/g)) {
            achadas.push({
              secao: m[1],
              arquivo: relative(process.cwd(), arquivo).replace(/\\/g, '/'),
              linha: i + 1,
            })
          }
        })
    }
  }
  return achadas
}

describe('referências normativas aos planos', () => {
  it('os documentos citados existem no repositório', () => {
    for (const plano of PLANOS) expect(() => readFileSync(plano, 'utf8'), plano).not.toThrow()
  })

  it('os planos preservam a numeração que os comentários endereçam', () => {
    const secoes = secoesDosPlanos()
    // Não é contagem exata de propósito: um plano pode ganhar seções. O que ele
    // não pode é perder a faixa que as citações já usam.
    expect(secoes.size, 'os planos perderam a numeração de seções').toBeGreaterThan(180)
    expect(secoes.has('74'), 'sumiu a última seção do plano de expansão').toBe(true)
    expect(secoes.has('101'), 'sumiu a última seção do plano VNext').toBe(true)
  })

  it('toda seção citada em src/ e tests/ existe em algum plano', () => {
    const secoes = secoesDosPlanos()
    const orfas = citacoes().filter(
      (c) => !secoes.has(c.secao) && !SEM_DESTINO_CONHECIDO.has(c.secao),
    )
    expect(
      orfas.map((c) => `${c.arquivo}:${c.linha} cita §${c.secao}, que não existe em plano nenhum`),
    ).toEqual([])
  })

  it('a lista de endereços sem destino não cresce, e não encolhe em silêncio', () => {
    /*
      O PORTÃO MORDE NAS DUAS DIREÇÕES. Para cima, uma citação órfã nova reprova
      no teste acima. Para baixo, quando alguém achar o documento e as citações
      passarem a resolver, este teste reprova pedindo que a entrada saia da lista
      — senão a exceção sobreviveria ao problema que a justificava.
    */
    const secoes = secoesDosPlanos()
    const aindaOrfas = new Set(
      citacoes()
        .filter((c) => SEM_DESTINO_CONHECIDO.has(c.secao))
        .map((c) => c.secao),
    )
    const resolvidas = [...SEM_DESTINO_CONHECIDO].filter((s) => secoes.has(s) || !aindaOrfas.has(s))
    expect(
      resolvidas.map((s) => `§${s} nao precisa mais de excecao: tire-a de SEM_DESTINO_CONHECIDO`),
    ).toEqual([])
  })

  it('há citações de verdade para medir — o portão não passa por lista vazia', () => {
    /*
      Sem este piso, apagar todos os comentários normativos deixaria o teste
      acima verde para sempre. É a mesma classe de defeito do portão de
      microdecisão, que media o catálogo inteiro e passava com dois planos.
    */
    expect(citacoes().length).toBeGreaterThan(20)
  })
})
