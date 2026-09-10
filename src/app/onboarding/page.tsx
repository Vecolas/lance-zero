import type { Metadata } from 'next'
import { DiagnosticoWizard } from '@/components/onboarding/DiagnosticoWizard'
import { BANCO_DE_DIAGNOSTICO } from '@/content/diagnostic'

export const metadata: Metadata = { title: 'Diagnóstico' }

export default function OnboardingPage() {
  // Derivado do banco: um número escrito à mão aqui viraria mentira no dia em
  // que o banco crescesse, e ninguém repara em copy desatualizada.
  const posicoes = BANCO_DE_DIAGNOSTICO.length

  return (
    <>
      <h1>Diagnóstico</h1>
      <p>
        {posicoes} posições para estimar de onde você parte e montar a sua primeira semana. Sem
        conta, sem envio de dados: o resultado fica neste navegador. Leva poucos minutos, e no fim
        você recebe uma faixa de rating — não um número exato, porque {posicoes} posições não
        sustentam isso.
      </p>
      <DiagnosticoWizard />
    </>
  )
}
