/**
 * PRATICAR A ABERTURA CONTRA O COMPUTADOR.
 *
 * O QUE ELA OFERECE que a jornada não oferecia: repetição livre. A jornada
 * ensina uma vez, em sequência, e termina — quem quer jogar a Italiana dez vezes
 * seguidas, que é como um repertório entra na cabeça, não tinha onde.
 *
 * O CASO MAIS IMPORTANTE é `TESTE FORA DO REPERTÓRIO`. Ele afirma que o app NÃO
 * chama de errado um lance que ele não conferiu: sair da abertura estudada pode
 * ser um lance excelente, e o que o app sabe é só que o bot não sabe respondê-lo
 * por ali. Chamar isso de erro seria a explicação inventada que o projeto
 * proíbe.
 */

import { expect, test } from '@playwright/test'

/*
  O AJUDANTE QUE ATRAVESSAVA A JORNADA SAIU JUNTO COM OS CASOS QUE O USAVAM.

  Ele existia para os dois testes do estado concluído, que hoje moram em
  `tests/unit/sparring-tela.test.tsx` (o motivo está no rodapé deste arquivo).
  Mantê-lo aqui deixaria trinta linhas de travessia que nada executa —
  e a próxima pessoa gastaria tempo entendendo um caminho morto.
*/

test('TESTE SPARRING — a prática só aparece depois de concluir', async ({ page }) => {
  await page.goto('/aberturas/italiana')

  // Na primeira etapa ele não existe: o estudo vem antes da repetição livre.
  await expect(page.getByRole('heading', { name: 'Praticar contra o computador' })).toHaveCount(0)
})

/*
  OS CASOS DO ESTADO CONCLUÍDO MORAM EM `tests/unit/sparring-tela.test.tsx`.

  Eles estiveram aqui e ficavam PULADOS: chegar ao fim da jornada pelo e2e exige
  cumprir a cobertura do treino final, e o ajudante que atravessa etapas não tem
  como fazer isso jogando lances arbitrários. Um teste que nunca roda passa para
  sempre sem provar nada — pior que não existir, porque parece coberto.

  O que ficou aqui é o que só o e2e consegue afirmar: que o sparring NÃO aparece
  antes da conclusão.
*/
