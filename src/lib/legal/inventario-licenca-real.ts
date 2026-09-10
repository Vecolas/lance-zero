/**
 * Conferência da licença DECLARADA contra a licença que o pacote afirma.
 *
 * O portão do `ID` cruza `docs/LICENSES.md` com `src/lib/legal/licenses.ts`. O
 * portão das instaladas cruza `pnpm-lock.yaml` com `docs/LICENSES.md`. Nenhum
 * dos dois olha o pacote: se as fontes do projeto disserem "MIT" para algo que
 * é GPL, as duas ficam verdes (issue #59, item 1). Este módulo fecha isso — a
 * terceira fonte é o campo `license` do `package.json` do próprio pacote.
 *
 * DECISÕES QUE ESTE ARQUIVO CARREGA:
 *
 * 1. A fonte é o `node_modules`, e não tinha como ser outra: o `pnpm-lock.yaml`
 *    guarda integridade e versão, nunca licença. O preço é que esta é a única
 *    verificação de licença do projeto que depende de a instalação existir. Ela
 *    NÃO vira tolerante por isso: pacote fora do alcance REPROVA com a mensagem
 *    de rodar `pnpm install`. Verificação que se cala quando não acha o que
 *    conferir é falso verde, que é pior do que não existir.
 *
 * 2. O que fica fora do alcance fica NOMEADO, nunca pulado em silêncio. O pnpm
 *    se instala fora do `node_modules` do projeto, e é o único caso hoje:
 *    `GRUPOS_FORA_DO_NODE_MODULES` diz qual grupo do lockfile está fora e por
 *    quê. Grupo que não está nessa lista e não está no disco REPROVA.
 *
 * 3. A comparação é entre textos SPDX, sem interpretar compatibilidade. Este
 *    módulo não sabe se Apache-2.0 é compatível com o projeto; ele só grita
 *    quando o documento e o pacote dizem coisas diferentes. Julgar
 *    compatibilidade é decisão humana e mora em ADR, não em portão.
 *
 * 4. Compara sem diferenciar maiúsculas. `Apache-2.0` e `apache-2.0` são a
 *    mesma licença, e reprovar por caixa seria reprovar o código certo.
 *
 * O módulo é puro: recebe as leituras e devolve a lista de problemas. Quem lê o
 * disco é o portão.
 */
import type { LeituraDoInventario } from './inventario-doc'
import type { LeituraDoLockfile } from './inventario-lockfile'
import { nomesNpmDaCelula } from './inventario-instalado'

/**
 * Grupos do lockfile cujos pacotes não moram no `node_modules` do projeto, com
 * o motivo escrito. Válvula estreita de propósito: a chave é o GRUPO, não o
 * pacote, porque o que está fora do alcance é a forma de instalar, não a
 * escolha de um pacote específico.
 */
export const GRUPOS_FORA_DO_NODE_MODULES: Record<string, string> = {
  packageManagerDependencies:
    'O pnpm se instala fora do node_modules do projeto (store próprio), então o package.json dele não está ao alcance desta leitura.',
}

export interface MetadadoDoPacote {
  /** Campo `license` do `package.json` do pacote, como veio. */
  licenca: unknown
}

export type TipoDeProblemaDeLicenca =
  | 'nada-a-conferir'
  | 'pacote-nao-encontrado'
  | 'licenca-do-pacote-ilegivel'
  | 'licenca-divergente'
  | 'grupo-fora-do-alcance-sem-motivo'

export interface ProblemaDeLicenca {
  tipo: TipoDeProblemaDeLicenca
  pacote?: string
  mensagem: string
}

export interface EntradaDaConferenciaDeLicenca {
  lockfile: LeituraDoLockfile
  documento: LeituraDoInventario
  /** Metadado lido do disco, por nome npm. Ausente = não encontrado. */
  metadados: Map<string, MetadadoDoPacote>
}

function mesmaLicenca(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

export function conferirLicencasDeclaradas({
  lockfile,
  documento,
  metadados,
}: EntradaDaConferenciaDeLicenca): ProblemaDeLicenca[] {
  const problemas: ProblemaDeLicenca[] = []

  const licencaNoDocumento = new Map<string, { id: string; licenca: string; linha: number }>()
  for (const entrada of documento.entradas) {
    for (const nome of nomesNpmDaCelula(entrada.pacote)) {
      if (licencaNoDocumento.has(nome)) continue
      licencaNoDocumento.set(nome, {
        id: entrada.id,
        licenca: entrada.licenca,
        linha: entrada.linha,
      })
    }
  }

  for (const [grupo, motivo] of Object.entries(GRUPOS_FORA_DO_NODE_MODULES)) {
    if (motivo.trim().length > 0) continue
    problemas.push({
      tipo: 'grupo-fora-do-alcance-sem-motivo',
      mensagem: `o grupo "${grupo}" está em GRUPOS_FORA_DO_NODE_MODULES sem motivo escrito`,
    })
  }

  let conferidos = 0

  for (const dependencia of lockfile.diretas) {
    if (dependencia.grupo in GRUPOS_FORA_DO_NODE_MODULES) continue

    const metadado = metadados.get(dependencia.nome)
    if (metadado === undefined) {
      problemas.push({
        tipo: 'pacote-nao-encontrado',
        pacote: dependencia.nome,
        mensagem: `"${dependencia.nome}" (${dependencia.grupo}) não foi encontrado em node_modules — rode \`pnpm install\`. Se ele legitimamente não mora ali, o grupo "${dependencia.grupo}" precisa entrar em GRUPOS_FORA_DO_NODE_MODULES com o motivo escrito`,
      })
      continue
    }

    if (typeof metadado.licenca !== 'string' || metadado.licenca.trim().length === 0) {
      problemas.push({
        tipo: 'licenca-do-pacote-ilegivel',
        pacote: dependencia.nome,
        mensagem: `o package.json de "${dependencia.nome}" não traz um campo \`license\` em texto: ${JSON.stringify(metadado.licenca)}. Sem ele, a licença do documento não é conferível e alguém precisa olhar o pacote à mão`,
      })
      continue
    }

    const noDocumento = licencaNoDocumento.get(dependencia.nome)
    if (noDocumento === undefined) {
      // A falta da linha já é reprovada pelo portão das instaladas; repetir
      // aqui seria dois portões gritando a mesma coisa.
      continue
    }

    conferidos += 1

    if (!mesmaLicenca(noDocumento.licenca, metadado.licenca)) {
      problemas.push({
        tipo: 'licenca-divergente',
        pacote: dependencia.nome,
        mensagem: `"${dependencia.nome}": docs/LICENSES.md (linha ${noDocumento.linha}) diz "${noDocumento.licenca}" e o próprio pacote declara "${metadado.licenca}"`,
      })
    }
  }

  // Varredura que não conferiu nada não é aprovação.
  if (conferidos === 0) {
    problemas.push({
      tipo: 'nada-a-conferir',
      mensagem:
        'nenhuma licença foi conferida contra o metadado do pacote — a varredura não olhou nada, e não olhar nada não é aprovar',
    })
  }

  return problemas
}
