import { expect, test } from '@playwright/test'

/**
 * As jornadas de Aberturas e Finais, medidas no navegador.
 *
 * O QUE ESTES TESTES AFIRMAM, e quase tudo é AUSÊNCIA — que é o que ninguém
 * nota faltando:
 *
 * 1. as duas abas continuam SEPARADAS e não aparece uma terceira agregando;
 * 2. abrir um conteúdo abre a JORNADA, e não um menu de abas pedagógicas;
 * 3. o treino não é a primeira etapa de uma jornada nova;
 * 4. uma rodada que termina em erro NUNCA escreve "Atividade concluída".
 *
 * O item 4 é o bug que este trabalho veio matar. Ele não aparece como tela
 * quebrada nem como exceção: aparece como ELOGIO depois de um erro. Nada mais
 * no app discorda dele, e por isso ele precisa de portão.
 */

const FRASES_DE_CONCLUSAO = /atividade conclu[íi]da|jornada conclu[íi]da|abertura conclu[íi]da/i

test('Aberturas e Finais continuam abas separadas, sem uma terceira agregando', async ({
  page,
}) => {
  await page.goto('/aberturas')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Aberturas')
  // Nenhum final vaza para a aba de aberturas.
  await expect(page.getByText(/oposi[çc][ãa]o|lucena|philidor/i)).toHaveCount(0)

  await page.goto('/finais')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Finais/)

  // E não existe uma terceira aba juntando os dois assuntos.
  const nav = page.getByRole('navigation').first()
  await expect(nav.getByRole('link', { name: /aberturas e finais|estudos|jornadas/i })).toHaveCount(
    0,
  )
})

test('abrir uma abertura abre a JORNADA, não um menu de abas pedagógicas', async ({ page }) => {
  await page.goto('/aberturas')

  const primeiro = page.getByRole('link', { name: /Estudar|Continuar estudo|Treinar novamente/i })
  await expect(primeiro.first()).toBeVisible()
  await primeiro.first().click()

  // A jornada se apresenta: etapa 1 de N, com o objetivo escrito.
  await expect(page.getByText(/Etapa 1 de \d+/)).toBeVisible()

  /*
    AS ABAS PEDAGÓGICAS NÃO EXISTEM MAIS NO CAMINHO PRINCIPAL. Elas eram o
    defeito: para aprender a Italiana o aluno precisava primeiro entender a
    arquitetura da interface e escolher sozinho a ordem correta.
  */
  for (const aba of ['Visão geral', 'Aprender', 'Erros comuns']) {
    await expect(page.getByRole('button', { name: aba, exact: true })).toHaveCount(0)
  }

  /*
    O CABEÇALHO INFORMA ONDE O ALUNO ESTÁ — e mostra UMA etapa, não dez.

    Antes esta asserção procurava o trilho com todos os rótulos. Ele saiu: a
    faixa comia a largura do tabuleiro e transformava o curso numa coleção de
    abas. O que ficou é nome + posição, e o Mapa do estudo ao lado.
  */
  await expect(page.getByRole('heading', { level: 2 }).first()).toContainText(/—\s*\d+\/\d+/)
  await expect(page.getByRole('button', { name: /Mapa do estudo/ })).toBeVisible()
})

test('o treino NÃO é a primeira etapa de uma jornada nova', async ({ page }) => {
  await page.goto('/aberturas')
  await page
    .getByRole('link', { name: /Estudar|Continuar estudo/i })
    .first()
    .click()

  await expect(page.getByText(/Etapa 1 de \d+/)).toBeVisible()
  // A etapa 1 é de leitura: nenhum tabuleiro pedindo lance, nenhum "sem dicas".
  await expect(page.getByText('TREINO · sem dicas')).toHaveCount(0)
})

test('a jornada avança sozinha de etapa em etapa, sem voltar a um menu', async ({ page }) => {
  await page.goto('/aberturas')
  await page
    .getByRole('link', { name: /Estudar|Continuar estudo/i })
    .first()
    .click()

  await expect(page.getByText('Etapa 1 de 8')).toBeVisible()
  await page.getByRole('button', { name: /Continuar/ }).click()

  // Etapa 2 abre direto. Sem menu no meio — é a diferença entre uma jornada e
  // um índice.
  await expect(page.getByText('Etapa 2 de 8')).toBeVisible()
})

test('voltar para uma etapa concluída NÃO perde progresso', async ({ page }) => {
  await page.goto('/aberturas')
  await page
    .getByRole('link', { name: /Estudar|Continuar estudo/i })
    .first()
    .click()

  await page.getByRole('button', { name: /Continuar/ }).click()
  await expect(page.getByText('Etapa 2 de 8')).toBeVisible()

  // O MAPA deixa voltar ao que já foi visto — e agora também ir adiante.
  await page.getByRole('button', { name: /Mapa do estudo/ }).click()
  const mapa = page.getByRole('dialog', { name: 'Mapa do estudo' })
  await mapa
    .getByRole('button')
    .filter({ hasNotText: /Fechar/ })
    .first()
    .click()
  await expect(page.getByText('Etapa 1 de 8')).toBeVisible()

  // E o avanço não foi desfeito: continuar leva de volta à etapa 2.
  await page.getByRole('button', { name: /Continuar/ }).click()
  await expect(page.getByText('Etapa 2 de 8')).toBeVisible()
})

test('a jornada retoma exatamente onde parou depois de recarregar', async ({ page }) => {
  await page.goto('/aberturas')
  await page
    .getByRole('link', { name: /Estudar|Continuar estudo/i })
    .first()
    .click()

  await page.getByRole('button', { name: /Continuar/ }).click()
  await page.getByRole('button', { name: /Continuar/ }).click()
  await expect(page.getByText('Etapa 3 de 8')).toBeVisible()

  await page.reload()
  // Retomada EXATA: sem isto, sair no meio custaria o estudo inteiro, e o aluno
  // aprenderia a não sair — que é a forma errada de manter alguém na tela.
  await expect(page.getByText('Etapa 3 de 8')).toBeVisible()
})

test('o card da abertura mostra o estado da jornada e o CTA certo', async ({ page }) => {
  await page.goto('/aberturas')
  await expect(page.getByText(/\d+ de \d+ etapas|\d+ etapas/).first()).toBeVisible()
  await expect(page.getByText('Estudar →').first()).toBeVisible()

  await page
    .getByRole('link', { name: /Estudar/i })
    .first()
    .click()
  await page.getByRole('button', { name: /Continuar/ }).click()

  /*
    ESPERA A ETAPA AVANÇAR ANTES DE SAIR DA PÁGINA.

    Clicar em Continuar dispara a gravação da jornada no IndexedDB, e navegar no
    mesmo instante corre com ela. No Windows passava; no runner do Linux, com
    menos folga de CPU, o card voltava dizendo "Estudar" porque o avanço ainda
    não tinha sido gravado. O cabeçalho mudando é o sinal de que a etapa nova
    está em vigor.
  */
  await expect(page.getByRole('heading', { level: 2 }).first()).toContainText(/—\s*2\/\d+/)

  await page.goto('/aberturas')
  // Começou: o CTA muda, e o aluno não precisa lembrar onde parou.
  await expect(page.getByText('Continuar estudo →').first()).toBeVisible()
})

test('NENHUMA tela de jornada escreve "Atividade concluída" — o bug de origem', async ({
  page,
}) => {
  await page.goto('/aberturas')
  await page
    .getByRole('link', { name: /Estudar|Continuar estudo/i })
    .first()
    .click()

  /*
    Percorre as etapas de LEITURA da jornada, conferindo a cada uma.

    O `if (await continuar.isDisabled()) break` que morava aqui foi removido uma
    vez, e a remoção é a correção de um portão desligado: ele fazia este teste
    desistir em silêncio na primeira etapa travada e continuar verde. Foi assim
    que três becos sem saída nas jornadas de Finais atravessaram a suíte inteira.

    E ENTÃO O MESMO DEFEITO VOLTOU POR OUTRA PORTA. O `if (count() === 0) break`
    que sobrou faz exatamente o que o outro fazia: quando a página ainda não
    pintou o botão, a contagem dá zero, o laço termina e o teste passa sem ter
    percorrido nada. Foi por isso que ele ficou verde em duas de três execuções
    e reprovou na terceira — a única em que a página carregou rápido o bastante
    para o laço chegar à "Prática guiada".

    O que ele achou lá não era um beco: era o produto CERTO. A prática guiada
    tem `regra: itens` e o `Continuar` fica desabilitado até o aluno jogar os
    lances. Exigir `toBeEnabled()` ali era exigir que o portão da etapa não
    existisse.

    Então a divisa passou a ser explícita: o laço anda pelas etapas de leitura e
    PARA na primeira que cobra prática. Se alguma etapa de leitura travar, ele
    para antes — e a asserção final, que exige ter chegado à prática guiada,
    reprova dizendo em qual etapa parou. O portão continua mordendo; ele só
    deixou de morder o lugar errado.
  */
  let ultimoTitulo = '(nenhuma etapa)'
  for (let i = 0; i < 8; i += 1) {
    await expect(page.locator('main')).not.toContainText(FRASES_DE_CONCLUSAO)
    const continuar = page.getByRole('button', { name: /Continuar/ })
    // `toBeAttached` e não `count()`: esperar o botão aparecer, em vez de tratar
    // "ainda não pintou" como "a jornada acabou".
    await expect(continuar).toBeAttached()
    ultimoTitulo = (await page.getByRole('heading', { level: 2 }).first().textContent()) ?? ''
    if (await continuar.isDisabled()) break
    await continuar.click()
  }

  /*
    A PROVA DE QUE O LAÇO ANDOU. Sem ela, qualquer travamento numa etapa de
    leitura sairia daqui em silêncio — que é o defeito original deste teste,
    pela terceira porta.
  */
  expect(ultimoTitulo, `o laço parou em "${ultimoTitulo}" antes da prática guiada`).toMatch(
    /Prática guiada/i,
  )
  await expect(page.locator('main')).not.toContainText(FRASES_DE_CONCLUSAO)
})

test('abrir um final abre a jornada do final, com reconhecimento antes do lance', async ({
  page,
}) => {
  await page.goto('/finais')

  const primeiro = page.getByRole('link', { name: /Estudar|Continuar estudo|Treinar novamente/i })
  // `toBeVisible` e NÃO `count()`: `count()` não espera, então media a página
  // antes da hidratação e o teste se pulava sozinho. Um skip assim é pior que
  // uma falha — ele parece "ainda não implementado" e era só corrida.
  await expect(primeiro.first()).toBeVisible()

  await primeiro.first().click()
  await expect(page.getByText(/Etapa 1 de \d+/)).toBeVisible()

  // A jornada de finais NÃO usa vocabulário de repertório: "fora do repertório"
  // é conceito de abertura, e aplicá-lo a um final seria reprovar um lance bom.
  await expect(page.locator('main')).not.toContainText(/fora do repert[óo]rio/i)
})

test('consultar outra etapa pelo Mapa NÃO altera o progresso', async ({ page }) => {
  /*
    O "MODO REFERÊNCIA" SAIU, e este caso passou a afirmar a mesma garantia pelo
    caminho que sobrou.

    Ele era uma página que empilhava TODAS as etapas com a interação desligada —
    tabuleiros que apareciam e não respondiam a nada. E era redundante: o Mapa do
    estudo abre qualquer etapa desde o primeiro acesso, e o conteúdo da jornada É
    o que está sendo ensinado.

    O QUE PRECISAVA SOBREVIVER é a garantia: consultar não desfaz progresso.
  */
  await page.goto('/aberturas/italiana')
  await expect(page.getByText('Etapa 1 de 8')).toBeVisible()

  // Avança uma etapa para haver progresso que possa ser perdido.
  await page.getByRole('button', { name: /Continuar →/ }).click()
  await expect(page.getByText('Etapa 2 de 8')).toBeVisible()

  // Vai para a PRIMEIRA etapa pelo Mapa e volta: o contador de concluídas não
  // pode cair, porque reler não é desfazer.
  await page.getByRole('button', { name: /Mapa do estudo/ }).click()
  const mapa = page.getByRole('dialog', { name: 'Mapa do estudo' })
  await mapa
    .getByRole('button')
    .filter({ hasNotText: /Fechar/ })
    .first()
    .click()
  await expect(page.getByText('Etapa 1 de 8')).toBeVisible()
  await expect(page.getByText(/1 de \d+ etapas/)).toBeVisible()
})

test('o roadmap mostra o progresso da jornada e leva para ela', async ({ page }) => {
  await page.goto('/aberturas/italiana')
  await page.getByRole('button', { name: /Continuar →/ }).click()
  await expect(page.getByText('Etapa 2 de 8')).toBeVisible()

  await page.goto('/roadmap')
  const card = page.locator('article').filter({ hasText: 'Abertura Italiana' }).first()
  await expect(card).toContainText(/\d+ de 8 etapas/)
  // O card leva à JORNADA, e não à biblioteca de lições — que não tem nada
  // sobre a Italiana.
  await expect(card.getByRole('link')).toHaveAttribute('href', '/aberturas/italiana')
})

test('o deep link do treino ABRE o treino, e não conclui nada', async ({ page }) => {
  /*
    A REGRA MUDOU COM O V5.1, e a mudança é deliberada.

    Antes este caso afirmava que a URL era RECUSADA: pedir o treino numa jornada
    nova devolvia a etapa 1. O contrato novo separa as duas coisas — progressão
    define RECOMENDAÇÃO e CONCLUSÃO, nunca visibilidade. O aluno pode espiar o
    treino, e espiar não ensina nem conclui.

    O QUE PRECISA CONTINUAR VERDADEIRO é a segunda metade: a jornada segue sem
    nenhuma etapa concluída depois do salto. Sem essa asserção, "abrir é livre"
    viraria "abrir é concluir" — que é exatamente o defeito que o ADR-0011
    corrigiu, de volta por outra porta.
  */
  await page.goto('/aberturas/italiana?etapa=treino-final')

  const cabecalho = page.getByRole('heading', { level: 2 }).first()
  await expect(cabecalho).toContainText(/—\s*\d+\/\d+/)

  // Zero concluídas: o contador de progresso do cabeçalho não se moveu.
  await expect(page.getByText(/0 de \d+ etapas/)).toBeVisible()
})
