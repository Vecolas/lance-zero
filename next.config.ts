import type { NextConfig } from 'next'
import { buildSecurityHeaders, cspReportOnlyFromEnv } from './src/lib/security/headers'

const emDesenvolvimento = process.env.NODE_ENV !== 'production'

const nextConfig: NextConfig = {
  /**
   * Headers de segurança em toda resposta (seções 60 a 64 do plano).
   *
   * A política vive em `src/lib/security/headers.ts` para poder ser testada em
   * unidade; aqui só se decide o estágio do rollout e o ambiente.
   *
   * A CSP sai como `Content-Security-Policy-Report-Only` por padrão. Virar
   * enforcing é uma decisão explícita: `LANCEZERO_CSP_ENFORCING=true`.
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: buildSecurityHeaders({
          reportOnly: cspReportOnlyFromEnv(process.env),
          development: emDesenvolvimento,
        }),
      },
    ]
  },
}

export default nextConfig
