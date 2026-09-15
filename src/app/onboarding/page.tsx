import type { Metadata } from 'next'
import { DiagnosticoWizard } from '@/components/onboarding/DiagnosticoWizard'
import { BANCO_DE_DIAGNOSTICO } from '@/content/diagnostic'
import { PageHeader } from '@/components/ui/primitives'

export const metadata: Metadata = { title: 'Diagnóstico' }

export default function OnboardingPage() {
  // Derivado do banco: um número escrito à mão aqui viraria mentira no dia em
  // que o banco crescesse, e ninguém repara em copy desatualizada.
  const posicoes = BANCO_DE_DIAGNOSTICO.length

  return (
    <>
      <PageHeader
        title="Diagnóstico"
        description={`${posicoes} posições para estimar de onde você parte e montar sua primeira semana. Sem conta ou envio de dados: o resultado fica neste navegador.`}
      />
      <DiagnosticoWizard />
    </>
  )
}
