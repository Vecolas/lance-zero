# ADR-0011 — Estágio de aprendizado antes da cobrança

- **Estado:** aceito
- **Data:** 2026-09-14
- **Substitui:** nada. **Altera:** o planner (ADR-0006 continua valendo para as camadas).

## Contexto

O produto prometia **diagnosticar → explicar → praticar guiado → recuperar
sozinho → revisar → aplicar em partida**. O que existia era outra coisa.

As abas **Hoje** e **Treinar** abriam uma posição e perguntavam, em substância,
"qual é o melhor lance?". Faziam isso para qualquer aluno, em qualquer ponto,
inclusive para quem nunca tinha recebido o conceito que a posição cobra. Diante
disso o aluno só tem um caminho: tentar, errar, tentar de novo. O produto
chamava isso de treino; é tentativa e erro, e o que ele ensina é força bruta.

O defeito não era um bug. Era **estrutural**: não existia, em lugar nenhum do
código, a informação "este aluno já recebeu este conceito". Sem ela, o planner
não tinha como perguntar, e a tela não tinha como decidir diferente.

Três consequências que se sustentavam sozinhas:

1. **`SkillMastery` era lido como se fosse conhecimento.** Ele mede ACERTO.
   Acertar muito não prova que alguém ensinou — e não acertar não prova que o
   aluno não sabe, se ninguém explicou o que se pedia.
2. **O FSRS mandava sozinho.** Um card vencido virava cobrança, mesmo quando o
   tema nunca tinha sido ensinado por aqui.
3. **Concluir dependia de acertar.** A saída da atividade exigia sucesso, o que
   transforma "sair da tela" no incentivo e o chute na estratégia.

## Decisão

Introduzir um **estágio de aprendizagem por habilidade**, separado da maestria,
e torná-lo obrigatório no caminho de toda seleção de atividade.

```text
unseen → introduced → guided → independent → review → transfer
```

Quatro decisões carregam o resto:

### 1. Estágio e maestria são campos separados, juntados na LEITURA

`SkillState` (novo, em `@/domain/aprendizado`) guarda **só** o que nenhuma outra
tabela tem: o degrau, a separação guiado/independente, e `precisaDeReensino`.

`recentAccuracy`, `hintUsageRate` e `masteryEstimate` — que o plano original
punha dentro de `SkillState` — **não existem lá**. Eles já são de `SkillMastery`.
`visaoDaHabilidade` junta os dois na leitura.

**Custo:** duas leituras em vez de uma, e um tradutor
(`registrarTentativa`) que precisa existir e ser o único caminho de escrita.
**Ganho:** não há duas fontes para a mesma verdade, então não há o dia em que
elas discordam sobre a mesma tentativa.

### 2. A escada NUNCA desce

Errar não rebaixa estágio. O que erro move é a maestria (que cai) e o
agendamento (que encurta) — dois números que já existem, em dois lugares que já
são deles.

**Custo declarado:** um aluno que aprendeu e esqueceu continua marcado como
`independent`, e o app vai cobrá-lo sem apoio. **Por que mesmo assim:** rebaixar
por desempenho recria, pela porta dos fundos, o "erre até o app ficar mais
fácil". O tratamento do esquecimento é do FSRS, que é feito para isso.

### 3. Nenhuma atividade do dia depende de outra do MESMO dia

O planner é proibido de pôr no mesmo plano uma atividade cujo pré-requisito ele
está apresentando hoje. É o que torna "faça na ordem que quiser" verdadeiro por
construção, e não por sorte.

A regra é **direcional** e foi corrigida durante a implementação: a primeira
versão rejeitava toda atividade cujo pré-requisito estivesse no plano, o que era
largo demais (praticar garfo e peça pendurada juntos é válido quando as duas já
foram ensinadas) e estreito demais ao mesmo tempo — só olhava para trás, então
escolher o dependente ANTES do pré-requisito passava batido. Um teste sobre o
grafo inteiro pegou; um teste sobre um par escolhido a dedo não teria.

### 4. Concluir não é dominar

`CompletionRule` **não tem como ler acerto**: a forma tem `tipo` e `total`, e
nada mais. `registrarItem` não recebe `acertou`. Quem quisesse prender a saída
no desempenho teria de mudar o TIPO, que é visível numa revisão — diferente de
um `if` escondido num componente.

O plano do dia também deixa de ser derivado a cada renderização e passa a ser
**gravado**: gera uma vez, persiste, depois só lê.

## O que NÃO muda

- **O núcleo continua funcionando sem conta** (ADR-0009). As duas stores novas
  são locais, e a migração roda no navegador.
- **O FSRS continua sendo o agendador.** Ele não virou modelo de domínio, e o
  estágio não reimplementa agendamento. O que mudou é que um card vencido de
  tema nunca ensinado vira lição antes de virar cobrança.
- **A maestria continua sendo a mesma função**, com os mesmos pesos.
- **O grafo de pré-requisitos não vira cadeado na interface.** Ele serve ao
  planner. O aluno continua podendo abrir qualquer lição da biblioteca no
  primeiro dia.
- **A versão do arquivo de backup não subiu.** Ver `BACKUP_VERSION`.

## Custos e pontos cegos declarados

- **Só há prática para habilidade com lição escrita.** Os exercícios saem do
  catálogo de lições, que é conteúdo verificado pelo portão. O catálogo cobre 12
  das 22 habilidades; as outras caem num estado vazio que diz a verdade em vez
  de oferecer um exercício qualquer. Puxar de um banco não verificado traria de
  volta, por outra porta, o problema de cobrar o que não se conferiu.
- **A migração dos usuários existentes é conservadora e pode incomodar.**
  Habilidade com card agendado e sem exposição registrada é marcada
  `precisaDeReensino` — ou seja, quem já treinava vai receber lições de temas que
  talvez já domine. Na dúvida o plano §42 manda preferir `introduced` a presumir
  domínio, e é o que foi feito. O botão "já conheço este conceito" com
  verificação curta (plano §15) **não foi implementado** nesta entrega, e é o que
  tornaria esse custo pequeno. Fica declarado como o principal débito.
- **Os limiares de subida de degrau nunca foram calibrados.** Dois acertos
  guiados, dois independentes, três ocorrências limpas em partida: são palpites
  sobre um aluno de ~1100, não achados. Estão em `SKILL_STATE_CONFIG`, fora do
  código que os usa, para poderem ser girados com telemetria.
- **A revisão de repertório escapa da regra, e escapa de propósito.** O app
  semeia os nós do repertório de FÁBRICA como cards de revisão, e eles nascem
  vencidos — então um aluno no primeiro dia pode receber "Revisar" de uma linha
  que ele nunca abriu. Pela §50 do plano, a pergunta "o app já ensinou a este
  aluno as ferramentas para tentar isto?" tem resposta **não** nesse caso.

  Ficou assim por duas razões, e nenhuma delas é distração: o card de repertório
  pergunta o lance que o próprio aluno escolheu para a linha dele, o que é outra
  coisa que cobrar um conceito; e mudar isso é mexer no comportamento do
  repertório, entregue duas semanas antes por outra frente. É decisão de produto
  separada, não ajuste desta entrega. Está afirmado no e2e
  (`tests/e2e/treino.spec.ts`) como exceção nomeada — o teste continua proibindo
  qualquer PRÁTICA para aluno novo, sem exceção.

- **O feedback explicativo específico por posição ainda não existe.** A estrutura
  das quatro perguntas (§18) está no tipo e é obrigatória, mas o texto entregue
  hoje é o genérico, que diz explicitamente que não sabe qual foi a falha em vez
  de inventar uma. É pior que um feedback específico e melhor que um motivo
  inventado — a regra do CLAUDE.md.

## Alternativas consideradas

- **Derivar o estágio da maestria** (por exemplo, `mastery > 0,6` ⇒
  `independent`). Descartada: é exatamente a confusão que produziu a dívida.
  Acerto não é evidência de ensino.
- **Guardar tudo num `SkillState` só**, como o plano original desenhava.
  Descartada pela regra das duas fontes: a cópia divergiria na primeira
  gravação por um caminho que atualiza só uma das duas.
- **Bloquear a navegação pelo grafo de pré-requisitos.** Descartada: o plano §24
  pede explicitamente uma interface sem cadeados, e travar a biblioteca puniria
  o aluno curioso para resolver um problema que é do planner.
