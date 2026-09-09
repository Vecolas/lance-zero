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

## Regras operacionais

### Fading de ajuda

Primeira exposição a um conceito pode ter exemplo resolvido e dicas. A partir da
terceira exposição bem-sucedida, dicas somem por padrão.

Dicas escalam em três níveis e nunca começam pelo lance:

1. categoria de pensamento ("há uma peça desprotegida");
2. peça ou casa relevante;
3. primeiro lance.

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
