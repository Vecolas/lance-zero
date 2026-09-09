/**
 * A CSP é o tipo de configuração que falha em silêncio: erra-se uma diretiva e
 * ninguém percebe até um XSS acontecer, ou até a engine parar de carregar em
 * produção. Estes testes travam as garantias que não podem regredir por
 * descuido — a parte que só o navegador prova está em
 * `tests/e2e/seguranca-headers.spec.ts`.
 */

import { describe, expect, it } from 'vitest'
import {
  buildContentSecurityPolicy,
  buildCspHeader,
  buildSecurityHeaders,
  contentSecurityPolicyHeaderName,
  cspReportOnlyFromEnv,
  CSP_HEADER_ENFORCING,
  CSP_HEADER_REPORT_ONLY,
  HSTS_HEADER,
  ORIGENS_EXTERNAS,
  SECURITY_HEADERS,
} from '@/lib/security/headers'

/** Quebra a política em `diretiva -> fontes`, do jeito que o browser lê. */
function diretivas(policy: string): Map<string, string[]> {
  const mapa = new Map<string, string[]>()
  for (const bloco of policy.split(';')) {
    const partes = bloco.trim().split(/\s+/).filter(Boolean)
    if (partes.length === 0) continue
    mapa.set(partes[0], partes.slice(1))
  }
  return mapa
}

const politicaProducao = buildContentSecurityPolicy({ reportOnly: false })
const politicaDev = buildContentSecurityPolicy({ reportOnly: false, development: true })

describe('conteúdo da CSP', () => {
  it('define todas as diretivas exigidas pelo plano', () => {
    const mapa = diretivas(politicaProducao)
    for (const diretiva of [
      'default-src',
      'script-src',
      'style-src',
      'img-src',
      'font-src',
      'connect-src',
      'worker-src',
      'object-src',
      'frame-ancestors',
      'base-uri',
      'form-action',
    ]) {
      expect(mapa.has(diretiva), `faltou ${diretiva}`).toBe(true)
    }
  })

  it('fecha o padrão e nega o que não é usado', () => {
    const mapa = diretivas(politicaProducao)
    expect(mapa.get('default-src')).toEqual(["'self'"])
    expect(mapa.get('object-src')).toEqual(["'none'"])
    expect(mapa.get('frame-ancestors')).toEqual(["'none'"])
    expect(mapa.get('base-uri')).toEqual(["'self'"])
    expect(mapa.get('form-action')).toEqual(["'self'"])
  })

  it('permite o Web Worker e o WASM do Stockfish', () => {
    const mapa = diretivas(politicaProducao)
    expect(mapa.get('worker-src')).toContain("'self'")
    expect(mapa.get('worker-src')).toContain('blob:')
    expect(mapa.get('script-src')).toContain("'wasm-unsafe-eval'")
  })

  it('connect-src libera exatamente as origens declaradas, e nada além', () => {
    // Deriva de `ORIGENS_EXTERNAS` em vez de cravar a lista. A versão anterior
    // cravava as duas APIs de importação à mão e, por isso, DEFENDIA a omissão:
    // quem acrescentasse a origem que faltava veria este teste ficar vermelho e
    // teria motivo para achar que a correção é que estava errada.
    const externas = (diretivas(politicaProducao).get('connect-src') ?? []).filter((fonte) =>
      fonte.startsWith('http'),
    )
    expect(externas.length).toBeGreaterThan(0)
    expect(externas).toEqual([...ORIGENS_EXTERNAS])
  })

  it('toda origem que algum adapter chama está em ORIGENS_EXTERNAS', () => {
    // VARRE A FONTE — os `baseUrl` dos adapters em `src/lib/` — em vez de uma
    // lista escrita à mão, que nunca acusaria o adapter que nunca entrou nela.
    //
    // Foi assim que `tablebase.lichess.ovh` ficou de fora: um adapter novo
    // apontava para um host que a CSP não autoriza, e o sintoma era MUDO —
    // enquanto Report-Only, a requisição ainda sai; ao virar enforcing, o
    // bloqueio vira `null`, o mesmo valor de "sem resposta para esta posição".
    //
    // PONTO CEGO DECLARADO: a varredura reconhece o padrão da casa,
    // `baseUrl: 'https://…'`. Um adapter que nomeie o host de outro jeito
    // escapa. É por isso que a regra vale para o padrão E existe o teste de
    // contra-prova abaixo, que confirma que a varredura acha alguma coisa.
    const arquivos = import.meta.glob('/src/lib/**/*.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>

    const encontradas = new Map<string, string>()
    for (const [caminho, texto] of Object.entries(arquivos)) {
      for (const achado of texto.matchAll(/baseUrl:\s*'(https:\/\/[^']+)'/g)) {
        encontradas.set(new URL(achado[1]).origin, caminho)
      }
    }

    // Portão com zero verificações tem de REPROVAR: se o padrão mudar e a
    // varredura passar a achar nada, isto grita em vez de imprimir "tudo certo".
    expect(encontradas.size, 'a varredura não encontrou nenhum baseUrl').toBeGreaterThan(0)

    for (const [origem, caminho] of encontradas) {
      expect(
        (ORIGENS_EXTERNAS as readonly string[]).includes(origem),
        `${caminho} chama ${origem}, que não está em ORIGENS_EXTERNAS — a CSP vai bloquear em silêncio`,
      ).toBe(true)
    }
  })

  it('não usa curinga em nenhuma diretiva de script', () => {
    expect(politicaProducao).not.toContain('script-src *')
    for (const [diretiva, fontes] of diretivas(politicaProducao)) {
      expect(fontes, `curinga em ${diretiva}`).not.toContain('*')
      expect(fontes, `http: cru em ${diretiva}`).not.toContain('http:')
      expect(fontes, `https: cru em ${diretiva}`).not.toContain('https:')
    }
  })

  it("não libera 'unsafe-eval' cru — só o 'wasm-unsafe-eval' do WASM", () => {
    const fontes = diretivas(politicaProducao).get('script-src') ?? []
    expect(fontes).not.toContain("'unsafe-eval'")
    // `wasm-unsafe-eval` termina com o mesmo sufixo: a checagem por substring
    // solta daria falso positivo, por isso a comparação é por fonte inteira.
    expect(fontes.filter((fonte) => fonte === "'unsafe-eval'")).toHaveLength(0)
  })

  it('não deixa vazar para produção o afrouxamento de desenvolvimento', () => {
    expect(politicaProducao).not.toContain('ws:')
    expect(politicaProducao).not.toContain('wss:')
    // O dev só acrescenta; nunca remove uma restrição.
    const producao = diretivas(politicaProducao)
    const dev = diretivas(politicaDev)
    for (const [diretiva, fontes] of producao) {
      for (const fonte of fontes) {
        expect(dev.get(diretiva), `dev perdeu ${fonte} em ${diretiva}`).toContain(fonte)
      }
    }
    expect(dev.get('connect-src')).toContain('ws:')
  })
})

describe('rollout report-only', () => {
  it('o toggle muda o nome do header, não a política', () => {
    expect(contentSecurityPolicyHeaderName(true)).toBe(CSP_HEADER_REPORT_ONLY)
    expect(contentSecurityPolicyHeaderName(false)).toBe(CSP_HEADER_ENFORCING)

    const relatorio = buildCspHeader({ reportOnly: true })
    const aplicando = buildCspHeader({ reportOnly: false })
    expect(relatorio.key).not.toBe(aplicando.key)
    // O ponto da seção 62: observa-se exatamente a política que será aplicada.
    expect(relatorio.value).toBe(aplicando.value)
  })

  it('o padrão é report-only e enforcing exige decisão explícita', () => {
    expect(cspReportOnlyFromEnv({})).toBe(true)
    expect(cspReportOnlyFromEnv({ LANCEZERO_CSP_ENFORCING: '' })).toBe(true)
    expect(cspReportOnlyFromEnv({ LANCEZERO_CSP_ENFORCING: '1' })).toBe(true)
    expect(cspReportOnlyFromEnv({ LANCEZERO_CSP_ENFORCING: 'false' })).toBe(true)
    expect(cspReportOnlyFromEnv({ LANCEZERO_CSP_ENFORCING: 'true' })).toBe(false)
  })
})

describe('headers da seção 63', () => {
  it('traz os quatro headers com os valores do plano', () => {
    const mapa = new Map(SECURITY_HEADERS.map((header) => [header.key, header.value]))
    expect(mapa.get('X-Content-Type-Options')).toBe('nosniff')
    expect(mapa.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(mapa.get('X-Frame-Options')).toBe('DENY')
    expect(mapa.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()')
  })
})

describe('HSTS', () => {
  it('tem um ano e subdomínios, e não pede preload', () => {
    expect(HSTS_HEADER.key).toBe('Strict-Transport-Security')
    expect(HSTS_HEADER.value).toBe('max-age=31536000; includeSubDomains')
    // `preload` é praticamente irreversível e vale para o domínio inteiro:
    // o plano (seção 64) exige avaliação antes.
    expect(HSTS_HEADER.value).not.toContain('preload')
  })

  it('fica de fora do desenvolvimento, onde o browser o ignoraria', () => {
    const chaves = (dev: boolean) =>
      buildSecurityHeaders({ reportOnly: true, development: dev }).map((header) => header.key)
    expect(chaves(true)).not.toContain('Strict-Transport-Security')
    expect(chaves(false)).toContain('Strict-Transport-Security')
  })
})

describe('conjunto completo de headers', () => {
  it('inclui a CSP com o nome coerente com o modo', () => {
    const chaves = buildSecurityHeaders({ reportOnly: true, development: false }).map(
      (header) => header.key,
    )
    expect(chaves).toContain(CSP_HEADER_REPORT_ONLY)
    expect(chaves).not.toContain(CSP_HEADER_ENFORCING)

    const enforcando = buildSecurityHeaders({ reportOnly: false, development: false }).map(
      (header) => header.key,
    )
    expect(enforcando).toContain(CSP_HEADER_ENFORCING)
    expect(enforcando).not.toContain(CSP_HEADER_REPORT_ONLY)
  })

  it('não repete header nem monta valor vazio', () => {
    const headers = buildSecurityHeaders({ reportOnly: true, development: false })
    expect(new Set(headers.map((header) => header.key)).size).toBe(headers.length)
    for (const header of headers) expect(header.value.trim().length).toBeGreaterThan(0)
  })
})
