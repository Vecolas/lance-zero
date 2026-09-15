# PEDAGOGY — as regras de aprendizado do LanceZero

> Base e referências completas em [`RESEARCH.md`](./RESEARCH.md), seções 3 e 7.

## O que a pesquisa sustenta

- **Prática deliberada**: atividade com objetivo explícito e feedback imediato bate volume solto.
- **Reconhecimento de padrões**: parte central da expertise em xadrez; exige exposição repetida e variada.
- **Recuperação ativa**: tentar responder ensina mais do que reler a solução.
- **Revisão espaçada**: intervalos crescentes melhoram retenção de longo prazo.
- **Exemplos resolvidos**: no início do aprendizado de um conceito, ver a solução funciona melhor que sofrer sozinho.
- **Feedback explicativo**: dizer _por que_ supera dizer apenas _certo/errado_.

## O que NÃO deve ser concluído da pesquisa

- Não existe número mágico de puzzles por dia.
- Não existe prova de que um app específico sobe X pontos de rating.
- "Estilo de aprendizagem" não é base válida de design.
- Gamificação agressiva pode aumentar uso e reduzir aprendizado.

## O Learning Loop

Toda habilidade atravessa o mesmo ciclo:

1. **Detectar** — diagnóstico ou erro em partida real.
2. **Explicar** — conceito curto, posição resolvida, linguagem visual.
3. **Imitar** — resolver posição semelhante com orientação.
4. **Recuperar** — resolver sem dica.
5. **Espaçar** — reapresentar via FSRS.
6. **Aplicar** — verificar em partida real.
7. **Reavaliar** — o erro voltou? A prioridade sobe ou cai.

## A regra que está acima de todas as outras

> **O LanceZero nunca cobra como conhecimento adquirido algo que ainda não
> ensinou.**

A única exceção é o diagnóstico, e só porque ele se declara como tal: ele diz ao
aluno que não saber é esperado, e o resultado serve para calibrar o plano.

Isto não é orientação: é **estrutura**. Cada habilidade tem um ESTÁGIO gravado
(`unseen → introduced → guided → independent → review → transfer`), e o estágio
está no caminho de toda seleção de atividade — não existe caminho no código que
produza prática independente para uma habilidade em `unseen`. Ver o ADR-0011 e
`src/domain/aprendizado`.

Ela existe porque foi violada. O app abria uma posição e perguntava "qual é o
melhor lance?" para quem nunca tinha recebido o conceito, e o aluno só podia
responder por tentativa e erro. O produto chamava isso de treino.

**Acertar não prova que alguém ensinou.** É por isso que estágio e maestria são
duas coisas separadas, em dois lugares separados.

## Regras operacionais

### Fading de ajuda

Primeira exposição a um conceito pode ter exemplo resolvido e dicas. A partir da
terceira exposição bem-sucedida, dicas somem por padrão.

A lição inteira é construída sobre isso: nove etapas em que a ajuda só diminui —
objetivo, conceito, processo mental, exemplo resolvido, contraste, completion,
prática guiada, recuperação sem dica, resumo. Nenhuma etapa oferece MAIS apoio
que a anterior, e a ordem vem de uma lista só (`ETAPAS_DA_LICAO`), não do JSX.

Dicas escalam em **quatro** níveis e nunca começam pelo lance:

1. direção — o processo ("procure xeques, capturas e ameaças");
2. área — onde olhar;
3. ideia — o padrão em jogo;
4. candidato — um lance a considerar.

O primeiro degrau fala de PROCESSO e não da posição, de propósito: uma dica que
já aponta a peça ensina aquele problema; uma que começa no hábito ensina algo
que o aluno leva para a partida.

### Errar aumenta a ajuda — nunca repete a pergunta

O laço `errou → tente novamente → errou → tente novamente` está **proibido**. Ele
não é apenas inútil: ensina força bruta, e o aluno descobre que clicar até o app
aceitar é uma estratégia que funciona — inclusive na partida, onde ninguém valida
o lance antes de ele valer.

No lugar:

1. primeiro erro — feedback curto e a dica conceitual;
2. segundo erro — decompor o problema numa pergunta intermediária;
3. terceiro erro — mostrar o raciocínio e a solução;
4. depois disso — **posição nova** equivalente, nunca a mesma pergunta.

### Concluir não é dominar

Terminar uma atividade e demonstrar domínio são duas perguntas diferentes, e são
respondidas por dois tipos diferentes. A regra de conclusão **não tem como ler
acerto**: quem quisesse prender a saída no desempenho teria de mudar o tipo.

Um aluno que faz cinco exercícios e erra três termina a atividade com ✓ e fica
com a habilidade marcada como precisando de reforço. O planner agenda o reforço
depois. Exigir 80% para poder sair da tela é o desenho que produz o chute.

### Recuperação antes de explicação

No modo misto, o tema **não** aparece antes da resposta. Mostrar "garfo" antes do
exercício destrói o valor de recuperação.

### Feedback depois da resposta

Sempre nesta ordem:

1. o que aconteceu;
2. qual sinal estava visível no tabuleiro;
3. qual hábito de pensamento teria evitado;
4. qual treino foi gerado a partir disso.

### Explicação determinística

Detectores de motivo têm limiar de confiança. **`unknown` é melhor que um tema
inventado.** A taxa de `unknown` é medida, não escondida.

### Tom

Analítico, calmo, direto. Explica o erro sem humilhar. Sem confete, sem moedas,
sem "energia". Nunca patronizante.

### Severidade acessível

Severidade nunca é comunicada só por cor. Sempre cor + ícone + texto.

### Honestidade estatística

WDL do Stockfish é calibrado em autojogo da engine. Serve para comparar
severidade internamente. Nunca é rotulado como "sua chance humana de vitória".
