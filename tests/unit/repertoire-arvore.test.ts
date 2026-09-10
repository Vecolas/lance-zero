import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import { identidadeDePosicao } from '@/lib/chess'
import {
  construirRepertorio,
  lanceDoRepertorio,
  noDaPosicao,
  nosDeEstudo,
  nosTranspostos,
  REPERTORIO_CONFIG,
  type ConflitoDeRepertorio,
  type DefinicaoDeRepertorio,
  type TipoDeConflito,
} from '@/domain/repertoire'
import { INDICE_ECO, REPERTORIOS_INICIAIS } from '@/content/openings'

/**
 * Portão da árvore de repertório.
 *
 * Duas metades. A primeira varre a FONTE — os repertórios de conteúdo, não uma
 * cópia escrita aqui — e exige zero conflitos, toda ideia escrita e nenhuma
 * linha mais longa que o teto do produto. A segunda alimenta o construtor com o
 * que DEVE reprovar, um defeito por vez.
 *
 * O QUE ESTE PORTÃO NÃO PROVA: que as ideias escritas são boas ou corretas do
 * ponto de vista de xadrez. Ele prova que existem, que são únicas e que os
 * lances são legais. A qualidade do texto é revisão humana.
 */

const indice = INDICE_ECO

function tipos(conflitos: readonly ConflitoDeRepertorio[]): TipoDeConflito[] {
  return conflitos.map((c) => c.tipo)
}

function descrever(conflitos: readonly ConflitoDeRepertorio[]): string {
  return conflitos.map((c) => `[${c.tipo}] ${c.mensagem}`).join('\n')
}

function fenDe(lancesSan: readonly string[]): string {
  const chess = new Chess()
  for (const san of lancesSan) {
    chess.move(san)
  }
  return chess.fen()
}

describe('repertórios de conteúdo', () => {
  // Regra 3 dos portões: varredura vazia não é aprovação.
  it('a varredura encontrou repertórios', () => {
    expect(REPERTORIOS_INICIAIS.length).toBeGreaterThan(0)
    expect(REPERTORIOS_INICIAIS.some((r) => r.lado === 'w')).toBe(true)
    expect(REPERTORIOS_INICIAIS.some((r) => r.lado === 'b')).toBe(true)
  })

  it('nenhum repertório tem conflito', () => {
    for (const definicao of REPERTORIOS_INICIAIS) {
      const arvore = construirRepertorio(definicao, { indiceEco: indice })
      expect(arvore.conflitos, `${definicao.id}:\n${descrever(arvore.conflitos)}`).toEqual([])
    }
  })

  it('todo ramo tem ideia escrita — repertório sem ideia é memorização', () => {
    const semIdeia: string[] = []
    for (const definicao of REPERTORIOS_INICIAIS) {
      const arvore = construirRepertorio(definicao)
      for (const no of arvore.nos.values()) {
        for (const ramo of no.ramos) {
          if (ramo.ideia.trim().length === 0) {
            semIdeia.push(`${definicao.id}: ${ramo.san} em ${no.identidade}`)
          }
        }
      }
    }
    expect(semIdeia).toEqual([])
  })

  it('a ideia cobre também os lances do adversário', () => {
    const arvore = construirRepertorio(REPERTORIOS_INICIAIS[0])
    const ramosDoAdversario = [...arvore.nos.values()]
      .flatMap((no) => no.ramos)
      .filter((ramo) => !ramo.doUsuario)
    expect(ramosDoAdversario.length).toBeGreaterThan(0)
    expect(ramosDoAdversario.every((ramo) => ramo.ideia.trim().length > 0)).toBe(true)
  })

  it('nenhuma linha passa do teto de profundidade do produto', () => {
    const longas: string[] = []
    for (const definicao of REPERTORIOS_INICIAIS) {
      for (const linha of definicao.linhas) {
        if (linha.lances.length > REPERTORIO_CONFIG.profundidadeMaxima) {
          longas.push(`${definicao.id}/${linha.id}: ${linha.lances.length}`)
        }
      }
    }
    expect(longas).toEqual([])
  })

  it('todo repertório declara princípio, habilidades de abertura e id sem ":"', () => {
    const problemas: string[] = []
    for (const definicao of REPERTORIOS_INICIAIS) {
      if (definicao.principio.trim().length === 0) problemas.push(`${definicao.id}: sem princípio`)
      if (definicao.habilidades.length === 0) problemas.push(`${definicao.id}: sem habilidade`)
      if (definicao.id.includes(':')) problemas.push(`${definicao.id}: id com ":"`)
      for (const skill of definicao.habilidades) {
        if (!skill.startsWith('opening.')) {
          problemas.push(`${definicao.id}: habilidade fora de abertura — ${skill}`)
        }
      }
    }
    expect(problemas).toEqual([])
  })

  it('os ids dos repertórios são únicos', () => {
    const ids = REPERTORIOS_INICIAIS.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('o índice ECO nomeia as posições conhecidas da árvore', () => {
    const arvore = construirRepertorio(REPERTORIOS_INICIAIS[0], { indiceEco: indice })
    const italiana = noDaPosicao(arvore, fenDe(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']))
    expect(italiana?.abertura?.nomePt).toBe('Abertura Italiana')
  })

  it('sem índice, a abertura fica null em vez de inventar nome', () => {
    const arvore = construirRepertorio(REPERTORIOS_INICIAIS[0])
    const italiana = noDaPosicao(arvore, fenDe(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']))
    expect(italiana?.abertura).toBeNull()
  })
})

/**
 * O CRITÉRIO DE ACEITE DA ISSUE: "transposição não cria nós duplicados
 * incompatíveis".
 */
describe('transposição', () => {
  const arvore = construirRepertorio(REPERTORIOS_INICIAIS[0], { indiceEco: indice })
  const posicaoComum = fenDe(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'Nf6'])

  it('as duas ordens de lances do conteúdo chegam à mesma posição', () => {
    const outraOrdem = fenDe(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'Bc5'])
    expect(identidadeDePosicao(outraOrdem)).toBe(identidadeDePosicao(posicaoComum))
  })

  it('a posição comum é UM nó, alcançado por dois caminhos diferentes', () => {
    const no = noDaPosicao(arvore, posicaoComum)
    expect(no).not.toBeNull()
    expect(no?.caminhos).toHaveLength(2)
    const comoTexto = no?.caminhos.map((c) => c.join(' ')) ?? []
    expect(new Set(comoTexto).size).toBe(2)
  })

  it('o lance seguinte é um ramo só, compartilhado pelas duas linhas', () => {
    const no = noDaPosicao(arvore, posicaoComum)
    const roques = no?.ramos.filter((ramo) => ramo.san === 'O-O') ?? []
    expect(roques).toHaveLength(1)
    expect([...roques[0].linhaIds].sort()).toEqual([
      'italiana-dois-cavalos',
      'italiana-giuoco-piano',
    ])
  })

  it('a árvore reporta a transposição em vez de escondê-la', () => {
    const transpostos = nosTranspostos(arvore).map((no) => no.identidade)
    expect(transpostos).toContain(identidadeDePosicao(posicaoComum))
  })

  /**
   * O caso que quebraria uma chave feita de FEN inteiro.
   *
   * Aqui os dois FEN completos DIFEREM (o contador de meios-lances depende do
   * caminho) e o tabuleiro é o mesmo. Se a identidade voltasse a incluir os
   * contadores, esta árvore teria um nó a mais e a asserção do tamanho reprova.
   */
  it('ordens de lances com contadores diferentes ainda são um nó só', () => {
    // Repertório de PRETAS: o adversário é quem escolhe a ordem, e as pretas
    // respondem Nf6 nas duas. Sem isso o caso viraria "dois lances do usuário
    // na mesma posição", que é outro conflito — e mascararia este.
    const definicao: DefinicaoDeRepertorio = {
      id: 'teste-contadores',
      titulo: 'Teste',
      lado: 'b',
      principio: 'teste',
      habilidades: ['opening.development'],
      linhas: [
        {
          id: 'cavalo-primeiro',
          lances: [
            { san: 'Nf3', ideia: 'a' },
            { san: 'Nf6', ideia: 'b' },
            { san: 'e4', ideia: 'c' },
          ],
        },
        {
          id: 'peao-primeiro',
          lances: [
            { san: 'e4', ideia: 'd' },
            { san: 'Nf6', ideia: 'e' },
            { san: 'Nf3', ideia: 'f' },
          ],
        },
      ],
    }
    const a = fenDe(['Nf3', 'Nf6', 'e4'])
    const b = fenDe(['e4', 'Nf6', 'Nf3'])
    expect(a).not.toBe(b)

    const arvoreTeste = construirRepertorio(definicao)
    expect(arvoreTeste.conflitos, descrever(arvoreTeste.conflitos)).toEqual([])
    // Inicial + 3 da primeira linha + 2 exclusivas da segunda = 6 posições.
    expect(arvoreTeste.nos.size).toBe(6)
    expect(noDaPosicao(arvoreTeste, a)?.caminhos).toHaveLength(2)
  })
})

describe('leitura da árvore', () => {
  const arvore = construirRepertorio(REPERTORIOS_INICIAIS[0])

  it('o lance prescrito é o do usuário', () => {
    const no = noDaPosicao(arvore, fenDe(['e4', 'e5']))
    expect(lanceDoRepertorio(arvore, no!)?.san).toBe('Nf3')
  })

  it('não há lance prescrito quando a vez é do adversário', () => {
    const no = noDaPosicao(arvore, fenDe(['e4']))
    expect(no?.vez).toBe('b')
    expect(lanceDoRepertorio(arvore, no!)).toBeNull()
  })

  it('os nós de estudo são só os do usuário e vêm em ordem determinística', () => {
    const nos = nosDeEstudo(arvore)
    expect(nos.length).toBeGreaterThan(0)
    expect(nos.every((no) => no.vez === arvore.lado)).toBe(true)
    const profundidades = nos.map((no) => no.profundidade)
    expect([...profundidades].sort((x, y) => x - y)).toEqual(profundidades)
    expect(nosDeEstudo(arvore).map((n) => n.identidade)).toEqual(nos.map((n) => n.identidade))
  })

  it('o FEN do nó é carregável e descreve a posição do nó', () => {
    for (const no of arvore.nos.values()) {
      expect(() => new Chess(no.fen)).not.toThrow()
      expect(identidadeDePosicao(no.fen)).toBe(no.identidade)
    }
  })
})

/**
 * Canários: o construtor alimentado com o que DEVE virar conflito.
 */
describe('o portão morde', () => {
  const base = (linhas: DefinicaoDeRepertorio['linhas']): DefinicaoDeRepertorio => ({
    id: 'canario',
    titulo: 'Canário',
    lado: 'w',
    principio: 'teste',
    habilidades: ['opening.development'],
    linhas,
  })

  it('o caso de controle passa', () => {
    const arvore = construirRepertorio(
      base([
        {
          id: 'ok',
          lances: [
            { san: 'e4', ideia: 'centro' },
            { san: 'e5', ideia: 'centro' },
          ],
        },
      ]),
    )
    expect(arvore.conflitos, descrever(arvore.conflitos)).toEqual([])
  })

  it('lance sem ideia reprova', () => {
    const arvore = construirRepertorio(base([{ id: 'x', lances: [{ san: 'e4' }] }]))
    expect(tipos(arvore.conflitos)).toEqual(['ideia-ausente'])
  })

  it('ideia em branco reprova — string vazia não é ideia', () => {
    const arvore = construirRepertorio(base([{ id: 'x', lances: [{ san: 'e4', ideia: '   ' }] }]))
    expect(tipos(arvore.conflitos)).toEqual(['ideia-vazia'])
  })

  it('ideia declarada duas vezes reprova, mesmo com texto idêntico', () => {
    const arvore = construirRepertorio(
      base([
        {
          id: 'a',
          lances: [
            { san: 'e4', ideia: 'centro' },
            { san: 'e5', ideia: 'centro' },
          ],
        },
        {
          id: 'b',
          lances: [
            { san: 'e4', ideia: 'centro' },
            { san: 'c5', ideia: 'siciliana' },
          ],
        },
      ]),
    )
    expect(tipos(arvore.conflitos)).toEqual(['ideia-repetida'])
    expect(arvore.conflitos[0].linhaId).toBe('b')
  })

  it('linha que só passa por ramo já declarado não precisa repetir a ideia', () => {
    const arvore = construirRepertorio(
      base([
        {
          id: 'a',
          lances: [
            { san: 'e4', ideia: 'centro' },
            { san: 'e5', ideia: 'centro' },
          ],
        },
        { id: 'b', lances: [{ san: 'e4' }, { san: 'c5', ideia: 'siciliana' }] },
      ]),
    )
    expect(arvore.conflitos, descrever(arvore.conflitos)).toEqual([])
  })

  it('lance ilegal reprova', () => {
    const arvore = construirRepertorio(
      base([
        {
          id: 'x',
          lances: [
            { san: 'e4', ideia: 'a' },
            { san: 'e9', ideia: 'b' },
          ],
        },
      ]),
    )
    expect(tipos(arvore.conflitos)).toEqual(['lance-ilegal'])
  })

  /**
   * A definição de "nó duplicado incompatível": duas respostas do usuário para
   * a mesma posição. O aluno não saberia qual das duas conta como acerto.
   */
  it('dois lances do usuário na mesma posição reprova', () => {
    const arvore = construirRepertorio(
      base([
        { id: 'a', lances: [{ san: 'e4', ideia: 'centro' }] },
        { id: 'b', lances: [{ san: 'd4', ideia: 'outro centro' }] },
      ]),
    )
    expect(tipos(arvore.conflitos)).toEqual(['dois-lances-do-usuario'])
    expect(arvore.conflitos[0].identidade).toBe(arvore.raiz)
  })

  it('vários lances do ADVERSÁRIO na mesma posição são o desenho, não conflito', () => {
    const arvore = construirRepertorio(
      base([
        {
          id: 'a',
          lances: [
            { san: 'e4', ideia: 'centro' },
            { san: 'e5', ideia: 'simétrico' },
          ],
        },
        { id: 'b', lances: [{ san: 'e4' }, { san: 'c5', ideia: 'siciliana' }] },
      ]),
    )
    expect(arvore.conflitos, descrever(arvore.conflitos)).toEqual([])
    expect(noDaPosicao(arvore, fenDe(['e4']))?.ramos).toHaveLength(2)
  })

  it('linha mais profunda que o teto é recusada inteira, não pela metade', () => {
    const arvore = construirRepertorio(
      base([
        {
          id: 'longa',
          lances: [
            { san: 'e4', ideia: 'a' },
            { san: 'e5', ideia: 'b' },
            { san: 'Nf3', ideia: 'c' },
          ],
        },
      ]),
      { profundidadeMaxima: 2 },
    )
    expect(tipos(arvore.conflitos)).toEqual(['linha-profunda-demais'])
    // Só a posição inicial: nada da linha entrou.
    expect(arvore.nos.size).toBe(1)
  })

  it('linha vazia reprova', () => {
    const arvore = construirRepertorio(base([{ id: 'x', lances: [] }]))
    expect(tipos(arvore.conflitos)).toEqual(['linha-vazia'])
  })

  it('linha declarada duas vezes reprova', () => {
    const arvore = construirRepertorio(
      base([
        { id: 'x', lances: [{ san: 'e4', ideia: 'a' }] },
        { id: 'x', lances: [{ san: 'd4', ideia: 'b' }] },
      ]),
    )
    expect(tipos(arvore.conflitos)).toEqual(['linha-repetida'])
  })

  it('repertório sem linha nenhuma tem só a raiz e nenhum nó de estudo', () => {
    const arvore = construirRepertorio(base([]))
    expect(arvore.nos.size).toBe(1)
    expect(nosDeEstudo(arvore)).toEqual([])
  })
})
