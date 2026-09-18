# ADR-0031 — Família grande vira um Foundation e cursos filhos

- **Estado:** aceito
- **Data:** 2026-09-18
- **Relacionado:** ADR-0022 (o ramo é a unidade), ADR-0025 (a cobertura é matriz
  ramo × papel), plano de expansão §4 (curso pai e curso filho) e §16 (Sicilian
  Defense — Foundation)

## Contexto

A Siciliana tem mais teoria publicada que qualquer outra abertura. Um curso que
tentasse cobri-la inteira precisaria de quinze ramos `core` ou mais — e o
ADR-0025 já estabeleceu que **só o core bloqueia o treino final**.

Quinze ramos core não é um curso grande: é um curso que ninguém termina. O aluno
que abre a Siciliana para aprender a jogá-la recebe uma cobrança de cobertura que
não cabe numa semana, e o efeito prático é abandono na etapa 8.

O plano de expansão §4 nomeia a saída e o §16 a aplica à Siciliana.

## Decisão

### 1. O Foundation ensina o território; o filho ensina a decisão

`siciliana-foundation` (slug `siciliana`) cobre **o que a Aberta propõe e o que
muda quando as brancas recusam entrar nela** — Alapin, Fechada, Smith-Morra. Ele
não ensina Najdorf, Dragão nem Sveshnikov, e a ausência é a decisão central do
curso, escrita no próprio arquivo.

`siciliana-najdorf`, `siciliana-dragao` e `siciliana-sveshnikov` são cursos
próprios, cada um com o Foundation em `prerequisites`.

### 2. O gatilho é editorial, e é heurística — não verdade universal

A regra prática: **se uma família precisaria de mais de ~15 ramos `core`, ela se
divide.** O número é uma heurística de hoje, calibrada em uma família só. Ele não
deve ser tratado como constante do domínio, e mudá-lo não exige ADR novo — exige
observar mais famílias grandes primeiro.

O sinal mais confiável que o número é o seguinte: _o Foundation ainda ensina algo
coerente sem os filhos?_ Se sim, a divisão está certa. Se o pai vira um índice
sem conteúdo, ela está errada.

### 3. O id do pai carrega o sufixo; o slug, não

`id: 'siciliana-foundation'` e `slug: 'siciliana'`. O endereço público é
`/aberturas/siciliana`, porque é o que o aluno digita e espera; o id é distinto
porque os filhos precisam de ids irmãos e o pai não pode ocupar o nome da
família.

Um portão de i18n já pegou essa divergência uma vez: a chave do nome em inglês é
o **id**, e não o slug.

### 4. O pré-requisito é informação, não trava

`prerequisites: ['siciliana-foundation']` no filho descreve a ordem recomendada.
Ele **não** bloqueia a abertura do curso: o local-first do projeto e o princípio
de "conteúdo sempre aberto" (ADR-0016) valem aqui também. O aluno que quer abrir
a Najdorf direto abre; o produto diz de onde ela vem.

## Consequências

**Boas.** A Siciliana virou quatro cursos termináveis em vez de um
interminável. A cobertura do treino final de cada um fecha. O Roadmap pode
recomendar o Foundation a quem escolhe a Siciliana sem obrigar ninguém aos três
filhos.

**Ruins, e aceitas.** Há repetição: os primeiros lances da Aberta aparecem no
Foundation e nos três filhos. É repetição deliberada — cada filho precisa ser
jogável sozinho — e ela custa linhas de conteúdo, não coerência.

**Em aberto.** A regra vale hoje para a Siciliana. Índia do Rei, Nimzo-Índia e
Francesa são as próximas candidatas naturais, e nenhuma foi avaliada contra o
gatilho. Avaliar antes da próxima expansão evita descobrir o problema com o curso
já escrito.
