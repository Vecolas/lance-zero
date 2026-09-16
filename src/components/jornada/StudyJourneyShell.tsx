'use client'

/**
 * A casca da jornada de estudo — compartilhada por Aberturas e Finais.
 *
 * O QUE ELA COMPARTILHA: apresentação. Cabeçalho, trilho de progresso, área de
 * conteúdo, e a navegação voltar/continuar.
 *
 * O QUE ELA NÃO COMPARTILHA, e é a fronteira que o plano §158 e §161 cravam:
 * regra de domínio. Esta casca não sabe o que é repertório nem o que é
 * tablebase. Ela recebe as etapas prontas e renderiza o que o domínio mandar
 * como `children`. Um `GenericChessTrainer` que soubesse dos dois domínios
 * pioraria as duas experiências juntas na primeira condicional.
 *
 * O BOTÃO CONTINUAR é a peça mais importante daqui (plano §134): numa etapa
 * interativa ele só habilita quando a regra da etapa foi cumprida. Sem isso, a
 * sequência automática seria decorativa — o aluno atravessaria o treino final
 * sem cobrir nada e o app registraria uma jornada concluída que não aconteceu.
 */

import type { ReactNode } from 'react'
import {
  etapaCumprida,
  progressoDaJornada,
  type StudyJourney,
  type StudyStage,
} from '@/domain/jornada'
import { StudyProgressRail } from './StudyProgressRail'
import styles from './StudyJourneyShell.module.css'

export interface StudyJourneyShellProps {
  /** Nome do conteúdo: "Abertura Italiana", "Oposição". */
  /**
   * O nome do conteúdo, para leitor de tela.
   *
   * NÃO vira `h1` — a página já o renderiza no servidor. Ele fica aqui só como
   * rótulo do `nav`/`section`, para quem chega pelo trilho saber de que estudo
   * este progresso é.
   */
  titulo: string
  jornada: StudyJourney
  stages: readonly StudyStage[]
  /** O tabuleiro, quando a etapa tem um. Fica em cima no celular. */
  tabuleiro?: ReactNode
  /** O conteúdo da etapa atual. */
  children: ReactNode
  aoVoltarEtapa?: (stageId: string) => void
  aoContinuar?: () => void
  /**
   * Esconde a navegação de rodapé.
   *
   * O treino usa isto: enquanto uma rodada está ativa não pode haver "Continuar"
   * (plano §135), senão o aluno sai da rodada pelo caminho errado e o desfecho
   * nunca é registrado.
   */
  rodapeOculto?: boolean
  aoSair?: () => void
}

export function StudyJourneyShell({
  titulo,
  jornada,
  stages,
  tabuleiro,
  children,
  aoVoltarEtapa,
  aoContinuar,
  rodapeOculto,
  aoSair,
}: StudyJourneyShellProps) {
  const stage = stages.find((item) => item.id === jornada.currentStageId) ?? stages[0]
  if (!stage) return null

  const progresso = progressoDaJornada(jornada, stages)
  const indice = stages.findIndex((item) => item.id === stage.id)
  const anterior = indice > 0 ? stages[indice - 1] : null

  // Leitura avança pelo próprio ato de continuar; as demais precisam da regra.
  const podeContinuar = stage.regra.tipo === 'leitura' || etapaCumprida(jornada, stage)

  return (
    <div className={styles.pagina} aria-label={`Estudo de ${titulo}`}>
      <header className={styles.cabecalho}>
        {/*
          O `h1` NÃO MORA AQUI, e a ausência é a correção.

          Ele é o nome do conteúdo ("Abertura Italiana") e é renderizado pela
          PÁGINA, no servidor. Duas razões, e a segunda foi um defeito real:

          1. um `h1` que muda a cada Continuar tira da página a identidade do que
             está sendo estudado — quem navega por cabeçalhos perde a âncora;
          2. a jornada só existe depois de ler o IndexedDB. Com o `h1` aqui, a
             página ficava SEM cabeçalho nenhum até a hidratação, e o contrato
             ARIA do projeto reprovou — corretamente. Identidade de página não
             pode depender de leitura de banco local.

          A etapa é uma seção DENTRO do estudo, e por isso é `h2`.
        */}
        <h2 className={styles.etapa}>{stage.titulo}</h2>
        {/*
          A contagem por extenso é a fonte acessível do progresso. O trilho é o
          reforço visual; se ele sumir no celular, esta linha continua dizendo
          onde o aluno está.
        */}
        <p className={styles.passo} role="status">
          Etapa {progresso.atual} de {progresso.total} — {stage.objetivo}
        </p>
      </header>

      <StudyProgressRail jornada={jornada} stages={stages} aoEscolher={aoVoltarEtapa} />

      <div className={styles.area}>
        {tabuleiro ? <div className={styles.tabuleiro}>{tabuleiro}</div> : null}
        <div className={styles.painel}>{children}</div>
      </div>

      {rodapeOculto ? null : (
        <footer className={styles.rodape}>
          {anterior && aoVoltarEtapa ? (
            <button
              type="button"
              className={styles.secundario}
              onClick={() => aoVoltarEtapa(anterior.id)}
            >
              ← {anterior.rotuloCurto}
            </button>
          ) : (
            <span />
          )}

          <div className={styles.direita}>
            {aoSair ? (
              <button type="button" className={styles.discreto} onClick={aoSair}>
                Sair
              </button>
            ) : null}
            {aoContinuar ? (
              <button
                type="button"
                className={styles.primario}
                onClick={aoContinuar}
                disabled={!podeContinuar}
              >
                Continuar →
              </button>
            ) : null}
          </div>
        </footer>
      )}

      {!podeContinuar && aoContinuar ? (
        <p className={styles.pendente}>{textoDoPendente(stage, jornada)}</p>
      ) : null}
    </div>
  )
}

/**
 * Por que o Continuar está desabilitado.
 *
 * Um botão inerte sem explicação é a forma mais rápida de o aluno achar que o
 * app travou. A frase é derivada da REGRA da etapa, então uma regra nova entra
 * aqui em vez de aparecer como silêncio.
 */
function textoDoPendente(stage: StudyStage, jornada: StudyJourney): string {
  switch (stage.regra.tipo) {
    case 'leitura':
      return ''
    case 'itens': {
      const feitos = jornada.itensRespondidos[stage.id]?.length ?? 0
      return `Faltam ${stage.regra.total - feitos} de ${stage.regra.total} exercícios para seguir.`
    }
    case 'cobertura': {
      const cobertos = new Set(jornada.alvosCobertos[stage.id] ?? [])
      const faltando = stage.regra.alvosExigidos.filter((alvo) => !cobertos.has(alvo)).length
      return `Faltam ${faltando} ${faltando === 1 ? 'linha' : 'linhas'} para concluir o treino.`
    }
  }
}
