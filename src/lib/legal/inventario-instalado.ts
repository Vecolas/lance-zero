/**
 * Cruzamento entre o que está INSTALADO e o que está inventariado.
 *
 * O portão de `licencas-inventario.test.ts` cruza `docs/LICENSES.md` com
 * `src/lib/legal/licenses.ts` — duas listas escritas à mão, uma contra a outra.
 * Ele não acusa a dependência que nunca entrou em NENHUMA das duas, e é
 * exatamente assim que uma dependência nova entra sem ninguém reparar
 * (issue #59, item 3). Verificação que percorre "o que está na lista" nunca
 * acusa o que nunca entrou nela.
 *
 * Este módulo troca o ponto de partida: parte da FONTE do que está instalado —
 * o `pnpm-lock.yaml` — e exige o caminho de volta até o documento.
 *
 * DECISÕES QUE ESTE ARQUIVO CARREGA:
 *
 * 1. O CRITÉRIO DE CORTE é **dependência direta**: tudo que o importador raiz
 *    do lockfile declara. Medido antes de escolher, no lockfile de hoje:
 *    537 pacotes resolvidos no total, cerca de 113 nomes no fecho transitivo só
 *    das dependências de produção, e 25 diretas. Uma lista de dívida com
 *    centenas de nomes transitivos não seria portão, seria formulário — e
 *    ninguém leria. A dependência direta é a que alguém ESCOLHEU: é a que muda
 *    quando se roda `pnpm add`, que é justamente o evento que este portão
 *    existe para pegar. A transitiva entra porque uma direta a puxou, e a
 *    obrigação sobre ela nasce da licença da direta.
 *    O critério "chega ao bundle do cliente" foi considerado e recusado: além
 *    dos 113 nomes, ele NÃO é derivável do lockfile — exigiria rodar o build, e
 *    portão não roda build.
 *
 * 2. A LIGAÇÃO entre lockfile e documento é o **nome npm**, derivado da coluna
 *    `Pacote`. Não se cria uma segunda tabela de-para: o documento já escreve o
 *    nome do pacote, e derivar é melhor que duplicar. Uma célula que não é um
 *    nome npm (`Lichess puzzle database`, `Inter (via next/font/google)`)
 *    simplesmente não contribui nome nenhum — este portão fala sobre pacotes
 *    npm, e dado aberto ou serviço de terceiro está fora do alcance dele **por
 *    construção**. Isso é limitação declarada, não descuido.
 *
 * 3. A VERSÃO do documento é conferida contra a versão RESOLVIDA do lockfile,
 *    não contra o `specifier` (issue #59, item 2). `^14.6.7` no `package.json`
 *    resolve para uma versão exata; é a exata que o inventário declara, e é a
 *    exata que precisa bater. Nenhum número fica cravado no portão: a regra é
 *    "as duas fontes dizem a mesma coisa".
 *
 * 4. O que este módulo NÃO faz: conferir se a licença DECLARADA está correta
 *    (issue #59, item 1). O lockfile não carrega metadado de licença — a única
 *    fonte que carrega é o `package.json` do próprio pacote. Essa conferência
 *    mora em `inventario-licenca-real.ts`, separada porque depende de o
 *    `node_modules` existir, e este módulo de propósito não depende.
 *
 * O módulo é puro: recebe as duas leituras e devolve a lista de problemas. Não
 * lê disco, não usa relógio.
 */
import type { LeituraDoInventario } from './inventario-doc'
import type { LeituraDoLockfile } from './inventario-lockfile'
import { IMPORTADOR_RAIZ } from './inventario-lockfile'

/**
 * Nome de pacote npm: minúsculas, opcionalmente com escopo `@escopo/`.
 * LIMITE DE FORMATO, não heurística de produto — é a regra do registro npm,
 * recortada no que o inventário precisa distinguir. Serve de peneira: uma
 * célula `Pacote` que não bate com isto não é um pacote npm.
 */
export const FORMATO_DO_NOME_NPM = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/

/** Versão exata, do jeito que o lockfile resolve. Faixa (`^1.2.3`) não passa. */
export const FORMATO_DA_VERSAO = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/

export type TipoDeProblemaInstalado =
  | 'lockfile-sem-dependencias-diretas'
  | 'importador-nao-previsto'
  | 'inventario-sem-pacote-npm'
  | 'instalada-e-fora-do-inventario'
  | 'no-inventario-e-nao-instalada'
  | 'pacote-repetido-no-inventario'
  | 'versao-do-documento-ausente'
  | 'versao-do-documento-divergente'
  | 'divida-sem-motivo'
  | 'divida-resolvida'

export interface ProblemaDeInstalada {
  tipo: TipoDeProblemaInstalado
  /** Nome npm envolvido, quando o problema é de um pacote. */
  pacote?: string
  mensagem: string
}

export interface EntradaDoCruzamentoInstalado {
  lockfile: LeituraDoLockfile
  documento: LeituraDoInventario
  divida: Record<string, string>
}

/**
 * Nomes npm que uma célula `Pacote` do documento declara.
 *
 * A célula pode listar mais de um pacote separado por vírgula. O que não for
 * nome npm é descartado de propósito — é assim que linhas de dado aberto e de
 * API de terceiro convivem na mesma tabela sem virar exceção.
 */
export function nomesNpmDaCelula(pacote: string): string[] {
  return pacote
    .split(',')
    .map((parte) => parte.replace(/`/g, '').trim())
    .filter((parte) => FORMATO_DO_NOME_NPM.test(parte))
}

export function cruzarInstaladasComInventario({
  lockfile,
  documento,
  divida,
}: EntradaDoCruzamentoInstalado): ProblemaDeInstalada[] {
  const problemas: ProblemaDeInstalada[] = []

  // Varredura que não varreu nada não é aprovação.
  if (lockfile.diretas.length === 0) {
    problemas.push({
      tipo: 'lockfile-sem-dependencias-diretas',
      mensagem:
        'nenhuma dependência direta lida do pnpm-lock.yaml — ou o arquivo mudou de formato, ou a leitura quebrou; nos dois casos o portão não olhou nada',
    })
  }

  for (const importador of lockfile.importadoresVistos) {
    if (importador === IMPORTADOR_RAIZ) continue
    problemas.push({
      tipo: 'importador-nao-previsto',
      mensagem: `o lockfile tem o importador "${importador}" além da raiz "${IMPORTADOR_RAIZ}", e este portão só confere a raiz — as dependências dele ficariam invisíveis`,
    })
  }

  // Lado do documento: nome npm -> a linha que o declara.
  const linhaDoPacote = new Map<string, { id: string; versao: string; linha: number }>()
  for (const entrada of documento.entradas) {
    for (const nome of nomesNpmDaCelula(entrada.pacote)) {
      const jaDeclarado = linhaDoPacote.get(nome)
      if (jaDeclarado !== undefined) {
        problemas.push({
          tipo: 'pacote-repetido-no-inventario',
          pacote: nome,
          mensagem: `o pacote "${nome}" é declarado pela linha "${jaDeclarado.id}" (linha ${jaDeclarado.linha}) e pela linha "${entrada.id}" (linha ${entrada.linha}) de docs/LICENSES.md`,
        })
        continue
      }
      linhaDoPacote.set(nome, { id: entrada.id, versao: entrada.versao, linha: entrada.linha })
    }
  }

  if (linhaDoPacote.size === 0) {
    problemas.push({
      tipo: 'inventario-sem-pacote-npm',
      mensagem:
        'nenhuma linha de docs/LICENSES.md declara um nome de pacote npm na coluna Pacote — não há o que cruzar com o lockfile',
    })
  }

  const semLinhaNoDocumento = new Set<string>()
  const semInstalacaoDireta = new Set<string>()
  const instaladas = new Set(lockfile.diretas.map((d) => d.nome))

  // Lado 1 — a direção que a issue #59 abriu: tudo que está instalado tem de
  // ter linha no documento.
  for (const dependencia of lockfile.diretas) {
    const linha = linhaDoPacote.get(dependencia.nome)
    if (linha === undefined) {
      semLinhaNoDocumento.add(dependencia.nome)
      if (dependencia.nome in divida) continue
      problemas.push({
        tipo: 'instalada-e-fora-do-inventario',
        pacote: dependencia.nome,
        mensagem: `"${dependencia.nome}" (${dependencia.grupo} ${dependencia.versaoResolvida}, pnpm-lock.yaml linha ${dependencia.linha}) está instalada e não tem linha em docs/LICENSES.md. Ou entra no documento, ou entra em DEPENDENCIAS_FORA_DO_INVENTARIO com o motivo escrito`,
      })
      continue
    }

    if (!FORMATO_DA_VERSAO.test(linha.versao)) {
      problemas.push({
        tipo: 'versao-do-documento-ausente',
        pacote: dependencia.nome,
        mensagem: `"${dependencia.nome}" está instalada em ${dependencia.versaoResolvida}, mas a linha "${linha.id}" (docs/LICENSES.md linha ${linha.linha}) não declara uma versão exata: "${linha.versao}"`,
      })
      continue
    }

    if (linha.versao !== dependencia.versaoResolvida) {
      problemas.push({
        tipo: 'versao-do-documento-divergente',
        pacote: dependencia.nome,
        mensagem: `"${dependencia.nome}": docs/LICENSES.md (linha ${linha.linha}) diz "${linha.versao}" e o pnpm-lock.yaml resolve "${dependencia.versaoResolvida}"`,
      })
    }
  }

  // Lado 2 — a volta: linha do documento que nomeia um pacote npm que não é
  // dependência direta. Ou a dependência saiu e a linha ficou, ou a linha
  // documenta uma transitiva; as duas coisas precisam ser ditas em voz alta.
  for (const [nome, linha] of linhaDoPacote) {
    if (instaladas.has(nome)) continue
    semInstalacaoDireta.add(nome)
    if (nome in divida) continue
    problemas.push({
      tipo: 'no-inventario-e-nao-instalada',
      pacote: nome,
      mensagem: `"${nome}" tem linha em docs/LICENSES.md ("${linha.id}", linha ${linha.linha}) e não é dependência direta no pnpm-lock.yaml. Ou saiu do projeto e a linha ficou, ou é transitiva e precisa de DEPENDENCIAS_FORA_DO_INVENTARIO com o motivo escrito`,
    })
  }

  // Lado 3 — a dívida morde de volta. Nome que já não desculpa nada tem de sair
  // da lista, senão ela cobre em silêncio o dia em que o caso voltar.
  for (const [nome, motivo] of Object.entries(divida)) {
    if (motivo.trim().length === 0) {
      problemas.push({
        tipo: 'divida-sem-motivo',
        pacote: nome,
        mensagem: `"${nome}" está em DEPENDENCIAS_FORA_DO_INVENTARIO sem motivo escrito`,
      })
    }
    if (semLinhaNoDocumento.has(nome) || semInstalacaoDireta.has(nome)) continue
    problemas.push({
      tipo: 'divida-resolvida',
      pacote: nome,
      mensagem: `"${nome}" está em DEPENDENCIAS_FORA_DO_INVENTARIO e já não desculpa nada — tire a linha da dívida`,
    })
  }

  return problemas
}
