import type { Metadata } from 'next'
import { BibliotecaDeLicoes } from '@/components/lessons/BibliotecaDeLicoes'
import { CabecalhoDaBiblioteca } from '@/components/lessons/CabecalhoDaBiblioteca'

export const metadata: Metadata = { title: 'Biblioteca' }

/**
 * A biblioteca: uma página de ESCOLHA.
 *
 * O link "treino de hoje" saiu do parágrafo de abertura. Ele existia para dizer
 * que o app funciona sem as lições que faltam — e continua dizendo, no estado
 * vazio do filtro, que é onde a frase tem uso. No meio da primeira linha da
 * página ele era um convite a sair da tela que o aluno acabou de abrir.
 */
export default function LessonsPage() {
  return (
    <>
      <CabecalhoDaBiblioteca />
      <BibliotecaDeLicoes />
    </>
  )
}
