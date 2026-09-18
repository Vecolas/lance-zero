# ADR-0030 — O vocabulário compartilhado é contrato, e não uma lista de sugestões

- **Estado:** aceito
- **Data:** 2026-09-18
- **Relacionado:** ADR-0022 (o ramo é a unidade), ADR-0024 (o plano tem posição e
  decisão), plano de expansão §49–§51 (Shared Concepts, Shared Pawn Structures,
  Typical tactical motifs) e §61 (checklist por core branch)

## Contexto

O catálogo saiu de 6 para 35 cursos. Antes disso, cada curso descrevia as
próprias ideias com as próprias palavras, e isso funcionava porque eram seis e o
mesmo autor os escreveu na mesma semana.

Com 35, a mesma ideia passa a aparecer em dez cursos. "Peão isolado" é o mesmo
conceito na Tarrasch, na Catalã, na Nimzo e no Gambito da Dama Aceito — e se cada
curso o nomear à sua maneira, três coisas quebram de uma vez:

1. **o aluno não reconhece.** Ele estuda um conceito quatro vezes achando que são
   quatro assuntos;
2. **o produto não consegue ligar cursos.** Sem identidade estável não há "você
   já viu isso na Tarrasch", nem revisão que atravesse aberturas;
3. **a tradução multiplica.** Cada sinônimo novo é mais uma entrada PT e EN.

O plano de expansão §49–§51 antecipou isso e definiu três vocabulários fechados
antes de qualquer curso novo ser escrito.

## Decisão

### 1. `src/content/openings/compartilhado.ts` é a autoridade

Ele publica três conjuntos com id estável:

- `CONCEITOS_DE_ABERTURA` (§49) — hoje 13;
- `ESTRUTURAS_DE_PEOES` (§50) — hoje 9;
- `MOTIVOS_TATICOS` (§51) — hoje 6.

Os ids são prefixados por tipo (`concept.`, `structure.`, `motif.`) porque os
três convivem no mesmo ramo e a leitura do conteúdo precisa dizer, sem consultar
o índice, de qual vocabulário aquele id veio.

### 2. Um curso não inventa id

Todo `conceitos`, `estrutura` e `motivos` de um ramo `core` cita id existente. Um
id ad hoc não é erro de digitação: é uma tela que mostra vazio sem avisar
ninguém, porque a resolução falha em silêncio.

O portão vive em `tests/unit/openings-onda0.test.ts` e falha nomeando o curso, o
ramo e o id.

### 3. Ampliar o vocabulário é uma decisão, e é barata

Quando um conceito aparece em **três cursos ou mais** e nenhum id existente o
cobre sem distorção, ele entra em `compartilhado.ts`. Isso é edição normal e não
precisa de ADR.

O que precisa de decisão é o contrário: criar um id para **um ramo só**. Isso não
é vocabulário compartilhado — é um campo de texto com cara de taxonomia, e ele
polui o conjunto para quem vier depois.

### 4. Renomear e remover exigem migração

Os ids vazam para o progresso gravado no aparelho do aluno. Renomear um id sem
migrar apaga a evidência de que ele estudou aquilo.

Portanto: **um id publicado é permanente**. Remover exige migração explícita, do
mesmo tipo que o ADR-0022 fez ao preservar `variacoes` como id de etapa.

## Consequências

**Boas.** Um conceito estudado na Tarrasch é reconhecível na Catalã. A tradução
tem um lugar só. O portão de ids transforma um erro silencioso de tela em um
vermelho com nome.

**Ruins, e aceitas.** O vocabulário fechado às vezes aperta: um ramo pode ter uma
ideia que nenhum id cobre bem, e o autor precisa escolher entre o id mais próximo
e propor um novo. É o custo de ter vocabulário, e é menor que o de não ter.

**Em aberto.** Hoje 52 dos 80 ramos `core` não declaram motivo tático nenhum, e o
campo é opcional. O vocabulário existe; o contrato de quando usá-lo, não. É a
dívida D-05, e ela se fecha com um contrato que obriga o ramo a declarar
_motivo presente_ ou _ausência justificada_ — nunca silêncio.
