import { describe, expect, it } from 'vitest'
import manifest from '@/app/manifest'

describe('manifesto PWA', () => {
  it('declara instalação em português com ícone público', () => {
    const resultado = manifest()

    expect(resultado.name).toContain('LanceZero')
    expect(resultado.lang).toBe('pt-BR')
    expect(resultado.display).toBe('standalone')
    expect(resultado.start_url).toBe('/')
    expect(resultado.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: '/marca/lancezero-icon.png',
          type: 'image/png',
        }),
      ]),
    )
  })
})
