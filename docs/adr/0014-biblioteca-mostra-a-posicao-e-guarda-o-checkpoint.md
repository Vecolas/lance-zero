# ADR-0014 — A biblioteca mostra a posição, e a lição guarda onde o aluno parou

- **Estado:** aceito
- **Data:** 2026-09-16
- **Relacionado:** ADR-0011 (estágio antes da cobrança), ADR-0012 (Roadmap aponta
  para o conteúdo exato)

## Contexto

A biblioteca de lições era uma lista de títulos com um botão "Abrir lição". Três
problemas, e os três eram silenciosos — nada errava, nada aparecia em teste:

1. **O aluno não sabia do que se tratava antes de abrir.** "A peça que ninguém
   está defendendo" é um título honesto e ainda assim opaco. Num app de xadrez,
   onde toda lição É uma posição e a posição já existe no conteúdo, pedir que o
   aluno abra para descobrir é desperdiçar a informação mais rápida que existe.

2. **A lição não era um lugar.** O botão não navegava: trocava o miolo da própria
   página pelo player. O link não se compartilhava, o voltar do navegador saía da
   biblioteca inteira, e recarregar devolvia o aluno à lista.

3. **O tabuleiro era o elemento menor da tela da lição.** A coluna do tabuleiro
   estava presa em 20 rem ao lado de um texto que levava o resto da largura. A
   tela dizia "lição de xadrez" e mostrava um artigo com uma ilustração.

E havia um quarto, mais grave porque o modelo já o previa e o app nunca o
produzia: o estado **"Em andamento"** existia em `EstadoDaLicao` e nunca
acontecia. `SkillState` só registra o FIM de uma lição. Entre a etapa 1 e a etapa
9 — nove etapas, alguns minutos — nada era gravado. Quem fechava a aba na etapa 6
voltava para a etapa 1, e o card oferecia "Aprender" a quem já estava no meio.

## Decisão

### 1. O card mostra a posição do exemplo resolvido

`CardDeLicao` carrega uma `PreviaDaLicao`, e a posição é a do `exemploResolvido` —
não uma escolhida à mão. Ela é, por construção, a posição que a lição usa para
ensinar o conceito. Um campo novo no conteúdo exigiria que alguém o preenchesse
para doze lições e o esquecesse na décima terceira.

A prévia **não é interativa**. Um tabuleiro que aceita o arraste e não responde
ensina que o app às vezes ignora o que o aluno faz.

### 2. A lição tem endereço: `/lessons/{id}`

O card inteiro é o link. Não um botão dentro do card: o alvo de clique pequeno no
celular era o sintoma, e a causa era o card não ser um destino.

### 3. O tabuleiro é a coluna dominante — na lição E nas jornadas

A partir de 52 rem a lição é `1.6fr` de tabuleiro contra `24rem` de instrução: o
painel ganha largura de LEITURA e para de crescer, o tabuleiro fica com o resto.
Abaixo disso, coluna única com o tabuleiro primeiro — a prioridade dele não muda
com a largura da tela.

A MESMA regra vale para as jornadas de Aberturas e de Finais, via `MesaDeEstudo`.
Elas desenham o tabuleiro dentro do conteúdo em vez de usar o slot da casca, e
por isso a casca passou a abrir duas colunas **só quando o slot é usado** — antes
ela reservava uma segunda coluna vazia e o tabuleiro da jornada herdava uma fração
de uma fração: 312 px numa tela de 1440.

Isto é medido, e a medida é o ponto: "tabuleiro em destaque" é uma frase que todo
mundo aprova e ninguém confere.

### 4. O checkpoint da lição é persistido (schema V6)

Store `lessonProgress`, chaveada por `lessonId`:

```ts
interface LessonProgress {
  lessonId: string
  stepIndex: number // a PRÓXIMA etapa a mostrar
  contentVersion: number
  updatedAt: string
}
```

Quatro decisões dentro desta:

- **`null` e `stepIndex: 0` são respostas diferentes.** Quem nunca abriu não tem
  registro e vê "Aprender"; quem abriu e fechou na primeira tela tem registro zero
  e vê "Continuar". Um repositório que devolvesse zero para os dois apagaria a
  distinção em silêncio.
- **`contentVersion` descarta checkpoint velho.** Retomar na etapa 7 de uma lição
  reescrita é retomar no lugar errado com cara de acerto. Recomeçar é honesto.
- **O índice inicial é saneado no player**, não em quem grava: um checkpoint fora
  de faixa abriria a lição numa etapa inexistente e renderizaria vazio — o falso
  verde perfeito.
- **Entra no backup**, como campo opcional e sem subir `BACKUP_VERSION`. Subir a
  versão faria o app recusar todo arquivo já baixado, e `validateBackupFile` exige
  a versão exata.

## Consequências

- A biblioteca faz UMA leitura para a grade inteira, em duas chaves: por
  habilidade (o que já foi ensinado) e por lição (onde ele parou). São perguntas
  diferentes e uma chave só faria abrir uma lição mover o marcador de outra da
  mesma habilidade.
- `LicaoAberta` precisa ler o checkpoint ANTES de montar o player, porque o índice
  inicial é estado inicial de `useState` — um valor que chegasse depois seria
  ignorado. Daí o estado de carregamento explícito.
- As jornadas de Aberturas e Finais herdaram a regra do tabuleiro grande sem
  mudar nenhuma regra de domínio: `MesaDeEstudo` é apresentação.
- O que continua de fora do backup são as **jornadas de estudo**
  (`studyJourneys`). É uma lacuna anterior a esta decisão e não foi fechada aqui
  para não misturar dois assuntos; fica registrada.
