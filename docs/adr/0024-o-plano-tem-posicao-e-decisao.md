# ADR-0024 — O plano tem posição própria, e uma decisão quando o conteúdo permite

- **Estado:** aceito
- **Data:** 2026-09-17
- **Relacionado:** ADR-0023 (a linha principal se completa), ADR-0022 (o ramo é a
  unidade), plano VNext §24 e §57

## Contexto

A etapa "Planos e estruturas" empilhava todos os planos num scroll, abertos ao
mesmo tempo, cada um com três linhas de prosa — objetivo, quando, risco — sobre
**uma única posição**: a característica da abertura.

Isso tinha um defeito que nenhuma captura de tela mostra: os sete planos do
curso apontam para **sete momentos diferentes** da linha principal, e a tela
mostrava a mesma posição em todos. O aluno lia "Ruptura d4" olhando uma posição
em que d4 não era o assunto, e a tela não mudava entre um plano e outro — então
nada nela dizia que o assunto tinha mudado.

E o conteúdo respondia duas perguntas das quatro que executar um plano exige.

## Decisão

### 1. Cada plano é um card, com a posição em que ele acontece

`positionPly` já existia no conteúdo e não era usado para nada visível. Agora é
ele que escolhe o mini-tabuleiro de cada card, com as setas da rota desenhadas.

A razão é a mesma do ADR-0022 para os ramos: **é a posição que aparece numa
partida**, não o nome do plano.

### 2. As quatro perguntas do §24.2

| Pergunta                       | De onde vem                       |
| ------------------------------ | --------------------------------- |
| Quando usar?                   | `when`, que já existia            |
| Por que funciona?              | `porQueFunciona` — **novo**       |
| O que precisa estar preparado? | `preparacao` — **novo**           |
| O que o adversário tenta?      | `oQueOAdversarioTenta` — **novo** |

As duas primeiras já eram o conteúdo antigo sob outros nomes. **As duas últimas
são as que faltavam**, e cada uma corrige um erro de execução diferente: sem
"o que precisa estar preparado" o aluno joga a ruptura cedo; sem "o que o
adversário tenta" ele executa o plano como se o outro lado não existisse.

Um portão exige as quatro, com piso de tamanho — string vazia satisfaria
qualquer teste de presença.

### 3. A microdecisão tem ply próprio, e é opcional

```ts
microdecisao?: { ply: number; san: string; pergunta?: string; porque: string }
```

**O ply é próprio e não reaproveita `positionPly`.** A razão é de conteúdo:
`positionPly` é a posição que **ilustra** o plano, e quase nunca é a posição em
que o primeiro lance já é correto. Forçar as duas a serem a mesma produziria
perguntas que contradizem a condição do próprio plano — "jogue a ruptura" numa
posição em que o plano diz "só depois do roque".

### 4. Dois dos sete planos têm microdecisão, e os cinco restantes dizem por quê

O plano VNext §24.3 escreve "quando possível", e aqui isso é literal:

| Plano                | Tem? | Por quê                                                     |
| -------------------- | ---- | ----------------------------------------------------------- |
| `caro-bispo`         | sim  | `Bf5` é o lance da linha e o plano inteiro                  |
| `escocesa-atividade` | sim  | `d4` é o lance que dá nome à abertura e o que abre o centro |
| `italiana-d4`        | não  | exige o roque, e a principal roca no último lance           |
| `italiana-f7`        | não  | a seta `c4→f7` é uma linha de pressão, não um lance         |
| `qgd-c5`             | não  | `c5` só é legal no terceiro lance, e ali é outra defesa     |
| `slava-bispo`        | não  | o lance do repertório naquela posição é `Nf6`, não o bispo  |
| `london-e4`          | não  | **`e2-e4` é legal ali e perde um peão**                     |

A última linha é a que justifica o desenho todo.

## O defeito que isto evita

A implementação óbvia da microdecisão é **"pergunte pelo lance da seta"** — todo
plano já tem `arrows`, e a maioria delas é um lance legal.

No Sistema Londres a seta é `e2→e4`. Na posição do plano esse lance é legal e
**perde um peão**: `d5` e o cavalo de `f6` já vigiam a casa, e é exatamente por
isso que o Londres joga `e3` primeiro. Uma microdecisão derivada da seta
ensinaria ali um erro de material, com o app afirmando "✓ correto" — e nada na
tela avisaria.

Três portões fecham isso: o lance autorado é **legal** na posição declarada, a
pergunta é feita **na vez do aluno**, e o enunciado **nunca contém o SAN** da
resposta. Nenhum deles julga se o lance é _bom_ — isso nenhum teste consegue —
mas os três juntos impedem o degrau anterior.

Um quarto portão exige que **pelo menos um** plano do curso tenha microdecisão.
Sem esse piso, apagar a última deixaria todos os outros testes verdes — eles
pulam quem não tem — e a etapa voltaria a ser só leitura sem nenhum vermelho.

## Na tela

- as **setas somem** enquanto a pergunta está aberta: uma rota desenhada durante
  a pergunta é o gabarito no enunciado;
- a **rota em texto** continua, e continua sendo regra de acessibilidade, mas
  aparece **depois** da resposta pelo mesmo motivo;
- lance errado faz **snapback** — a posição não anda, como na linha principal e
  no ramo;
- um plano sem microdecisão mostra o tabuleiro **passivo**, sem pergunta
  inventada.

## Ponto cego declarado

1. **A microdecisão não grava nada.** Ela não alimenta `itensRespondidos` nem o
   modelo de domínio — a etapa de planos continua sendo de leitura. O que dela
   vira estado pertence à fase do `OpeningDecisionState` (VNext §40).
2. **Cinco de sete planos ficam sem decisão.** Isso é limite do conteúdo atual,
   não do mecanismo: escrever um plano com posição própria e lance correto é
   trabalho de autoria, e fazê-lo errado é pior que não fazê-lo.
3. **`porQueFunciona`, `preparacao` e `oQueOAdversarioTenta` são opcionais no
   tipo** e exigidos pelo portão. O opcional existe para o tipo não quebrar
   conteúdo de terceiros; quem manda é o portão.
