import type { MetadataRoute } from 'next'

/**
 * Manifesto mínimo de instalação do LanceZero.
 *
 * A decisão desta fronteira é deliberada: a instalação e o shell offline são
 * públicos; nenhum dado de treino, resposta de API ou conteúdo privado entra
 * no cache do navegador por este arquivo.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LanceZero — Treine o que perde suas partidas.',
    short_name: 'LanceZero',
    description: 'Treino de xadrez orientado pelos erros das suas partidas.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F7F9FB',
    theme_color: '#071521',
    lang: 'pt-BR',
    icons: [
      {
        src: '/marca/lancezero-icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
