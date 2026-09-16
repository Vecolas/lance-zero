# ADR-0016 — Uma etapa por vez, e todo conteúdo sempre aberto

- **Estado:** aceito
- **Data:** 2026-09-16
- **Relacionado:** ADR-0011 (estágio antes da cobrança), ADR-0014 (tabuleiro dominante)

## Contexto

A casca das jornadas de Aberturas e Finais imprimia **todos os rótulos de etapa
ao mesmo tempo**, numa faixa horizontal. Numa jornada de final são dez: `Visão |
Reconhecer | Princípio | Demonstrar | Progredir | Defender | Posições típicas |
Dois lados | Guiada | Treino`.

Três problemas, e o terceiro decide:

1. a faixa come a largura que o tabuleiro deveria ter — numa tela em que o
   tabuleiro **é** o conteúdo;
2. dez nomes competindo transformam um curso numa coleção de abas: o aluno passa
   a escolher entre rótulos em vez de seguir uma sequência;
3. as etapas não alcançadas eram anunciadas como **"ainda não aberta"**, e isso
   era literalmente verdade — `voltarParaEtapa` recusava qualquer etapa que não
   fosse a atual ou uma já concluída.

Em paralelo, quatro etapas da jornada de Finais (`reconhecer`, `demonstracao`,
`progredir`, `defender`) empilhavam tabuleiro e texto dentro da coluna única da
casca. Em desktop o resultado era tabuleiro à esquerda, texto embaixo dele e
**metade da tela vazia à direita**.

## Decisão

### 1. A tela principal mostra UMA etapa

`StudyStageHeader` imprime nome + posição: `Reconhecer — 2/10`. Avançar troca o
texto **deste** componente e nada mais na moldura da página — é o que dá sensação
de curso contínuo em vez de troca de tela.

A contagem por extenso continua existindo como `role="status"` invisível: sem
ela, avançar seria silencioso para quem não vê a tela.

### 2. A exploração muda de lugar, não some

`StudyContentIndex` — o **Mapa do estudo** — lista todas as etapas com o estado
de cada uma. Ele é **pedido**: ocupa a tela por um momento e sai. É por isso que
ver dez etapas juntas funciona ali e não funcionava na faixa fixa, onde elas
disputavam largura com o tabuleiro o tempo inteiro.

Fecha com Escape e recebe o foco ao abrir, como o `FiltroSuspenso`.

### 3. Progressão define recomendação, nunca visibilidade

`voltarParaEtapa` virou `abrirEtapa` e aceita **qualquer** etapa da jornada. O
estado `futura` virou `disponivel`, e a frase "ainda não aberta" saiu do produto.

**O que não afrouxou:** `jornadaConcluida` continua exigindo a regra de cada
etapa cumprida, inclusive a cobertura do treino. Abrir o treino cedo mostra o
conteúdo e não marca nada — e há teste afirmando exatamente isso.

Quando o aluno se adianta, o Mapa mostra _"Recomendado depois das anteriores"_ e
o botão continua clicável. O sistema orienta; não aprisiona.

### 4. Tabuleiro à esquerda, instrução à direita — em toda etapa com posição

As quatro etapas que empilhavam passaram a usar `MesaDeEstudo`, o mesmo
componente da lição e da jornada de abertura. Uma regra, um componente.

## O portão que faltava

`tests/e2e/jornada-etapa-unica.spec.ts` mede o desenho em vez de confiar na
descrição:

- conta os rótulos de etapa visíveis fora do Mapa e reprova se a faixa voltar;
- compara as caixas do tabuleiro e do painel: o painel tem de **começar depois**
  do tabuleiro no eixo X e **antes** do fim dele no eixo Y;
- exige que o tabuleiro continue acima de 360 px — nunca reduzido a miniatura
  para caber duas colunas;
- afirma que a palavra "ainda não aberta" não existe mais.

Ele já mordeu na primeira execução: apontou o layout empilhado de `/finais` que
nenhum outro teste via.

## Consequências

- `StudyProgressRail` e seu CSS foram apagados.
- `voltarParaEtapa` continua exportado como alias de `abrirEtapa` enquanto os
  chamadores migram — o nome antigo prometia "só volta", e a regra deixou de ser
  essa.
- Três chaves novas no dicionário (`journey.studyMap`, `journey.stageCounter`,
  `journey.stageStates.*`), PT e EN.

## O que este ADR NÃO cobre

O plano V5.1 pede mais, e o resto é trabalho à parte, com escopo próprio:

- fundir a etapa **"Respostas"** da abertura à linha principal e às variações
  (a jornada tem 9 etapas hoje; o plano prevê 8);
- transformar **Variações** numa biblioteca real, com mini tabuleiro, ponto de
  ramificação e tabuleiro jogável por variação;
- transformar **Posições típicas** dos Finais no equivalente dessa biblioteca.

São mudanças de CONTEÚDO pedagógico, não de casca, e misturá-las aqui faria um
diff em que nem a arquitetura nem o currículo seriam revisáveis.
