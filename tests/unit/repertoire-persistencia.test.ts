/**
 * Portão de "o repertório é do ALUNO, e não do conteúdo que veio com o app".
 *
 * O DEFEITO QUE ISTO FECHA. `repertoriosDoAluno()` lia
 * `@/content/openings/repertorio` e chamava aquilo de "do aluno". Não havia
 * persistência: a tela mostrava um repertório que ele nunca escolheu, as lacunas
 * apontavam buracos de um conteúdo que não era dele, e a Fase 9 prometia o
 * contrário. Nada disso dava erro — é o falso verde clássico, uma função com o
 * nome certo lendo a fonte errada.
 *
 * O QUE ESTE ARQUIVO PROVA:
 *
 * 1. sem gravação, vale a SEMENTE, e a tela sabe que é a semente;
 * 2. com gravação, vale o que o aluno gravou;
 * 3. a semente não é copiada para o banco por ninguém que só LEU — melhoria de
 *    conteúdo ainda chega a quem nunca editou;
 * 4. semear card continua idempotente depois de editar a ideia.
 *
 * O QUE ELE NÃO PROVA: que os ids de card sobrevivem à edição (é
 * `repertoire-edicao.test.ts`, e é lá que a mutação mora), que as duas
 * implementações de repositório concordam (é `storage-repository.test.ts`) e que
 * a tela chama tudo isto (é `repertoire-tela.test.tsx`).
 */

import { describe, expect, it } from 'vitest'
import { REPERTORIO_BRANCAS, REPERTORIO_PRETAS } from '@/content/openings'
import { MemoryTrainingRepository } from '@/lib/storage/memory-repository'
import {
  repertoriosDeFabrica,
  repertoriosDoAluno,
  salvarIdeiaDoRepertorio,
  semearCardsDeRepertorio,
} from '@/lib/training/repertorio-no-treino'
import { noDaPosicao, type ArvoreDeRepertorio } from '@/domain/repertoire'
import { identidadeDePosicao, START_FEN } from '@/lib/chess'

const AGORA = new Date('2026-05-04T08:00:00.000Z')
const DEPOIS = new Date('2026-05-05T08:00:00.000Z')
const RAIZ = identidadeDePosicao(START_FEN)
const PRIMEIRO_SAN = REPERTORIO_BRANCAS.linhas[0].lances[0].san
const IDEIA_DO_ALUNO = 'Eu jogo assim porque é o único começo que eu entendo até o fim.'

function arvoreDe(repertorios: { arvores: readonly ArvoreDeRepertorio[] }, id: string) {
  const arvore = repertorios.arvores.find((item) => item.id === id)
  if (arvore === undefined) {
    throw new Error(`repertório ausente: ${id}`)
  }
  return arvore
}

/** A ideia do primeiro lance, lida da ÁRVORE — que é o que a tela desenha. */
function ideiaDoPrimeiroLance(arvore: ArvoreDeRepertorio): string {
  const no = noDaPosicao(arvore, START_FEN)
  const ramo = no?.ramos.find((item) => item.san === PRIMEIRO_SAN)
  if (ramo === undefined) {
    throw new Error('o repertório perdeu o primeiro lance')
  }
  return ramo.ideia
}

async function gravarIdeia(repo: MemoryTrainingRepository, texto = IDEIA_DO_ALUNO) {
  return salvarIdeiaDoRepertorio(
    repo,
    REPERTORIO_BRANCAS.id,
    { origem: RAIZ, san: PRIMEIRO_SAN },
    texto,
    { agora: AGORA },
  )
}

describe('sem gravacao, vale a semente — e a tela sabe disso', () => {
  it('devolve os repertorios de fabrica', async () => {
    const repo = new MemoryTrainingRepository()
    const lidos = await repertoriosDoAluno(repo)
    expect(lidos.arvores.map((a) => a.id)).toEqual(repertoriosDeFabrica().arvores.map((a) => a.id))
    expect(lidos.comConflito).toEqual([])
  })

  it('marca TODOS como de fabrica', async () => {
    const repo = new MemoryTrainingRepository()
    const lidos = await repertoriosDoAluno(repo)
    // A varredura sai das próprias árvores lidas, e não de uma lista escrita
    // aqui: repertório novo no conteúdo entra sozinho neste portão.
    expect([...lidos.deFabrica].sort()).toEqual(lidos.arvores.map((a) => a.id).sort())
  })

  it('LER nao grava nada — a semente nao e copiada para o banco', async () => {
    // Se ler semeasse, o conteúdo de fábrica ficaria congelado no dia da
    // instalação: uma linha nova escrita depois nunca chegaria a quem já abriu a
    // tela uma vez, e ninguém veria erro nenhum.
    const repo = new MemoryTrainingRepository()
    await repertoriosDoAluno(repo)
    await repertoriosDoAluno(repo)
    expect(await repo.listRepertorios()).toEqual([])
  })
})

describe('depois de gravar, vale o que o aluno escreveu', () => {
  it('a ideia lida e a do aluno, e nao a de fabrica', async () => {
    const repo = new MemoryTrainingRepository()
    const antes = ideiaDoPrimeiroLance(
      arvoreDe(await repertoriosDoAluno(repo), REPERTORIO_BRANCAS.id),
    )

    expect(await gravarIdeia(repo)).toEqual({ ok: true })

    const depois = ideiaDoPrimeiroLance(
      arvoreDe(await repertoriosDoAluno(repo), REPERTORIO_BRANCAS.id),
    )
    expect(depois).toBe(IDEIA_DO_ALUNO)
    expect(depois).not.toBe(antes)
  })

  it('o repertorio editado deixa de ser "de fabrica"; o OUTRO continua sendo', async () => {
    const repo = new MemoryTrainingRepository()
    await gravarIdeia(repo)
    const lidos = await repertoriosDoAluno(repo)
    expect(lidos.deFabrica).not.toContain(REPERTORIO_BRANCAS.id)
    expect(lidos.deFabrica).toContain(REPERTORIO_PRETAS.id)
  })

  it('a ordem dos repertorios nao muda por causa da gravacao', async () => {
    // Sem ordem fixa, editar o segundo repertório o traria para o topo da tela e
    // o aluno acharia que o outro sumiu.
    const repo = new MemoryTrainingRepository()
    const antes = (await repertoriosDoAluno(repo)).arvores.map((a) => a.id)
    await salvarIdeiaDoRepertorio(
      repo,
      REPERTORIO_PRETAS.id,
      { origem: RAIZ, san: REPERTORIO_PRETAS.linhas[0].lances[0].san },
      IDEIA_DO_ALUNO,
      { agora: AGORA },
    )
    expect((await repertoriosDoAluno(repo)).arvores.map((a) => a.id)).toEqual(antes)
  })

  it('regravar substitui, e carimba o instante que RECEBEU', async () => {
    const repo = new MemoryTrainingRepository()
    await gravarIdeia(repo, 'primeira versão da minha ideia')
    await salvarIdeiaDoRepertorio(
      repo,
      REPERTORIO_BRANCAS.id,
      { origem: RAIZ, san: PRIMEIRO_SAN },
      'segunda versão da minha ideia',
      { agora: DEPOIS },
    )

    const gravados = await repo.listRepertorios()
    expect(gravados).toHaveLength(1)
    expect(gravados[0].atualizadoEm).toBe(DEPOIS.toISOString())
    expect(
      ideiaDoPrimeiroLance(arvoreDe(await repertoriosDoAluno(repo), REPERTORIO_BRANCAS.id)),
    ).toBe('segunda versão da minha ideia')
  })

  it('a segunda edicao parte do que ja estava GRAVADO, e nao da semente', async () => {
    // Editar a ideia do lance A e depois a do lance B não pode desfazer A.
    const repo = new MemoryTrainingRepository()
    await gravarIdeia(repo)

    const segundoSan = REPERTORIO_BRANCAS.linhas[0].lances[1].san
    // A identidade de destino sai da PRÓPRIA árvore, e não de um FEN escrito
    // aqui: é assim que a tela a obtém, e é a única forma de o portão continuar
    // apontando para a posição certa se o conteúdo mudar.
    const raiz = arvoreDe(await repertoriosDoAluno(repo), REPERTORIO_BRANCAS.id).nos.get(RAIZ)
    const destino = raiz?.ramos.find((r) => r.san === PRIMEIRO_SAN)?.destino
    expect(destino, 'o repertório perdeu o primeiro lance').toBeTruthy()

    await salvarIdeiaDoRepertorio(
      repo,
      REPERTORIO_BRANCAS.id,
      { origem: destino as string, san: segundoSan },
      'a ideia do lance do adversário, com as minhas palavras',
      { agora: DEPOIS },
    )

    const arvore = arvoreDe(await repertoriosDoAluno(repo), REPERTORIO_BRANCAS.id)
    expect(ideiaDoPrimeiroLance(arvore)).toBe(IDEIA_DO_ALUNO)
    expect(arvore.nos.get(destino as string)?.ramos.find((r) => r.san === segundoSan)?.ideia).toBe(
      'a ideia do lance do adversário, com as minhas palavras',
    )
  })

  it('recusa motivo por motivo, sem gravar nada', async () => {
    const repo = new MemoryTrainingRepository()

    expect(await gravarIdeia(repo, '   ')).toMatchObject({ ok: false, motivo: 'ideia-vazia' })
    expect(
      await salvarIdeiaDoRepertorio(
        repo,
        REPERTORIO_BRANCAS.id,
        { origem: RAIZ, san: 'Na3' },
        IDEIA_DO_ALUNO,
        { agora: AGORA },
      ),
    ).toMatchObject({ ok: false, motivo: 'lance-nao-encontrado' })
    expect(
      await salvarIdeiaDoRepertorio(
        repo,
        'nao-existe',
        { origem: RAIZ, san: PRIMEIRO_SAN },
        IDEIA_DO_ALUNO,
        { agora: AGORA },
      ),
    ).toMatchObject({ ok: false, motivo: 'repertorio-desconhecido' })

    expect(await repo.listRepertorios()).toEqual([])
  })
})

describe('editar a ideia nao mexe na fila de revisao', () => {
  it('semear depois de editar mantem TODOS os cards e nao cria nenhum', async () => {
    const repo = new MemoryTrainingRepository()
    const primeira = await semearCardsDeRepertorio(repo, { agora: AGORA })
    expect(primeira.criados).toBeGreaterThan(0)

    await gravarIdeia(repo)

    const segunda = await semearCardsDeRepertorio(repo, { agora: DEPOIS })
    expect(segunda.criados).toBe(0)
    expect(segunda.mantidos).toBe(primeira.criados)
  })

  it('nenhum card fica orfao depois da edicao', async () => {
    const repo = new MemoryTrainingRepository()
    await semearCardsDeRepertorio(repo, { agora: AGORA })
    const antes = (await repo.listReviewCards()).map((card) => card.id).sort()

    await gravarIdeia(repo)
    await semearCardsDeRepertorio(repo, { agora: DEPOIS })

    expect((await repo.listReviewCards()).map((card) => card.id).sort()).toEqual(antes)
  })
})
