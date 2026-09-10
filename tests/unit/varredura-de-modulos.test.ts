import { describe, expect, it } from 'vitest'

/**
 * Varredura de carregamento: todo módulo de `src/` precisa ser IMPORTÁVEL.
 *
 * Existe porque `tsc` e `eslint` provam que o arquivo compila e obedece às
 * regras, e nenhum dos dois prova que ele **carrega**. Um módulo que lança na
 * primeira linha, um barril que reexporta um caminho que não existe mais, ou um
 * arquivo que nenhum outro importa e apodreceu em silêncio: nada disso aparece
 * no verde do CI.
 *
 * A varredura lê a FONTE (o diretório), nunca uma lista escrita à mão — lista
 * não acusa o que nunca entrou nela.
 */

const modulos = import.meta.glob('../../src/**/*.{ts,tsx}')

/**
 * Módulos que NÃO carregam fora do ambiente deles, com o motivo.
 *
 * Esta lista morde dos dois lados: nome fora dela tem de carregar, e nome
 * DENTRO dela tem de continuar falhando. Se um deles passar a carregar, o teste
 * reprova pedindo que a linha saia — senão ela ficaria para sempre cobrindo em
 * silêncio o dia em que aquele módulo se perder.
 */
const NAO_CARREGA_FORA_DO_AMBIENTE: Record<string, string> = {
  'app/layout.tsx': 'usa next/font/google, que só resolve no build do Next',
  'server/profile-service.ts': "importa 'server-only': lançar aqui é a fronteira funcionando",
  'server/profile-store-supabase.ts':
    "importa 'server-only': lançar aqui é a fronteira funcionando",
  'server/supabase.ts': "importa 'server-only': lançar aqui é a fronteira funcionando",
  'workers/stockfish.worker.ts': 'usa importScripts, que só existe dentro de um Worker',
}

function nomeCurto(caminho: string): string {
  return caminho.replace('../../src/', '')
}

async function tentarCarregar(caminho: string): Promise<Error | null> {
  try {
    await modulos[caminho]()
    return null
  } catch (e) {
    return e instanceof Error ? e : new Error(String(e))
  }
}

describe('varredura de módulos', () => {
  const caminhos = Object.keys(modulos).sort()

  // Regra 3 dos portões: tabela vazia não é aprovação. Uma varredura que não
  // varreu nada imprimiria "tudo certo" sem ter olhado nenhum arquivo.
  it('a varredura encontrou módulos para checar', () => {
    expect(caminhos.length).toBeGreaterThan(50)
  })

  it('toda exceção declarada aponta para um arquivo que existe', () => {
    const existentes = new Set(caminhos.map(nomeCurto))
    for (const nome of Object.keys(NAO_CARREGA_FORA_DO_AMBIENTE)) {
      expect(existentes, `${nome} está na lista de exceções mas não existe em src/`).toContain(nome)
    }
  })

  /**
   * O TEMPO AQUI NÃO É FOLGA GRATUITA, é o custo da varredura.
   *
   * Este caso carrega TODO módulo de `src/` — hoje 171, e o número só cresce.
   * Medido em 2026-09-10: 4,6 s só de importação, contra o limite padrão de 5 s
   * do vitest. Sob carga paralela ele estourava, e o sintoma era `Test timed
   * out` — que se lê como código quebrado e não como suíte que cresceu.
   *
   * O limite generoso é deliberado: portão que reprova por motivo alheio ao que
   * ele mede treina todo mundo a reexecutar até passar, e aí ele para de valer
   * quando estiver certo. Se um dia isto estourar de novo, a resposta NÃO é
   * subir o número: é medir o que passou a demorar. O maior custo hoje é
   * `src/app/**`, porque cada página arrasta a árvore de componentes dela.
   */
  it('todo módulo fora da lista de exceções carrega', { timeout: 60_000 }, async () => {
    const falhas: string[] = []
    for (const caminho of caminhos) {
      const nome = nomeCurto(caminho)
      if (nome in NAO_CARREGA_FORA_DO_AMBIENTE) continue
      const erro = await tentarCarregar(caminho)
      if (erro) falhas.push(`${nome}: ${erro.message.split('\n')[0]}`)
    }
    expect(falhas, `módulos que não carregam:\n${falhas.join('\n')}`).toEqual([])
  })

  it('toda exceção declarada CONTINUA falhando', async () => {
    const passaramAgora: string[] = []
    for (const [nome, motivo] of Object.entries(NAO_CARREGA_FORA_DO_AMBIENTE)) {
      const erro = await tentarCarregar(`../../src/${nome}`)
      if (!erro) passaramAgora.push(`${nome} (motivo declarado: ${motivo})`)
    }
    expect(
      passaramAgora,
      `estes módulos passaram a carregar — tire-os de NAO_CARREGA_FORA_DO_AMBIENTE:\n${passaramAgora.join('\n')}`,
    ).toEqual([])
  })

  it('a fronteira server-only realmente barra import no cliente', async () => {
    const erro = await tentarCarregar('../../src/server/supabase.ts')
    expect(erro).not.toBeNull()
    expect(erro?.message).toMatch(/cannot be imported from a Client Component/i)
  })
})
