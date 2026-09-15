# LanceZero — Pesquisa, metodologia de ensino e plano completo de desenvolvimento

> **Status:** especificação de produto e implementação para Claude Code  
> **Público inicial:** jogadores aproximadamente entre 800 e 1600 de rating, com experiência inicial calibrada para 1100  
> **Idioma inicial:** português do Brasil  
> **Princípio do produto:** aprendizado guiado, adaptativo e gratuito; o motor e os dados essenciais não dependem de APIs pagas.

---

## 1. Resumo executivo

A oportunidade não é construir “mais um site com tabuleiro, puzzles e Stockfish”. Lichess já oferece gratuitamente quase todas essas peças de forma isolada, enquanto outras plataformas restringem parte do treinamento atrás de assinaturas. A lacuna mais interessante é **organizar as ferramentas gratuitas em um sistema de ensino fechado**, no qual cada atividade alimenta a próxima:

**diagnóstico → explicação → exercício guiado → prática independente → feedback → revisão espaçada → aplicação em partidas → análise das próprias partidas → novo diagnóstico**.

Esse desenho combina princípios razoavelmente bem estabelecidos da ciência da aprendizagem com resultados específicos da pesquisa sobre expertise no xadrez. Estudos com enxadristas mostram que estudo sério e deliberado se correlaciona fortemente com força de jogo [S1]. A literatura de expertise no xadrez também indica que jogadores fortes reconhecem e armazenam padrões estruturados (“chunks/templates”), em vez de simplesmente calcular tudo do zero [S2]. Fora do xadrez, prática de recuperação/teste melhora retenção tardia [S3], prática distribuída supera sessões massivas para retenção em muitos contextos [S4], exemplos resolvidos são especialmente úteis para iniciantes [S5], e feedback funciona melhor quando contém informação útil sobre o erro e como corrigi-lo [S6].

A proposta é transformar isso em um produto chamado provisoriamente **LanceZero**, com a promessa:

> **Treine o que perde suas partidas.**

A plataforma deve ser local-first no MVP, funcionar como PWA, analisar partidas no próprio navegador com Stockfish 18 via WebAssembly, usar `chess.js` para regras/PGN, `react-chessboard` para o tabuleiro, `ts-fsrs` para revisão espaçada, puzzles públicos do Lichess e APIs/dados públicos para abertura e finais. Stockfish 18 é a versão estável oficial mais recente em setembro de 2026 [S7], e `stockfish.js` disponibiliza builds WASM, incluindo uma variante “lite single-threaded” de cerca de 7 MB recomendada pelo próprio projeto para a maioria dos sites [S8].

O resultado desejado é um “coach” estruturado, não um painel de ferramentas. Um usuário de 1100 deve abrir o site e ver **“Treino de hoje — 35 min”**, e não ter de decidir entre 15 menus desconectados.

---

## 2. Problema do usuário e posicionamento

### 2.1 Problema real

O jogador intermediário inicial costuma encontrar três situações:

1. **Ferramentas excelentes, mas fragmentadas.** Há puzzles em um site, análise em outro, abertura em outro e revisão manual em outro.
2. **Recursos guiados atrás de assinatura.** Por exemplo, em setembro de 2026 a conta Basic do Chess.com continua limitada a três puzzles classificados por dia, além de uma sessão diária de Puzzle Rush/Battle [S9].
3. **Uso passivo de engines.** O jogador vê “-3.7” ou uma seta verde, mas não aprende necessariamente qual padrão não reconheceu, qual processo de pensamento falhou nem como evitar o erro.

O Lichess demonstra que o problema não é falta de recursos gratuitos: oferece puzzles ilimitados, análise, exploração de aberturas e tablebases gratuitamente [S10]. Portanto, copiar sua lista de funções não cria vantagem relevante. A oportunidade é a **orquestração pedagógica**.

### 2.2 Proposta de valor

**LanceZero** deve responder diariamente a quatro perguntas:

- O que eu deveria treinar agora?
- Por que isso é a minha prioridade?
- Como eu treino sem apenas decorar respostas?
- Como sei se a habilidade apareceu nas minhas partidas reais?

### 2.3 Diferencial central

A unidade principal do produto não é o “puzzle”. É a **habilidade**.

Exemplos de habilidades:

- peça solta / hanging piece;
- garfo;
- cravada;
- raio-X;
- remoção do defensor;
- ataque duplo;
- mate na última fileira;
- cálculo de lances forçados;
- troca quando está à frente;
- oposição em finais de rei e peão;
- desenvolvimento antes de ataques prematuros;
- reconhecer quebra central típica de uma estrutura.

Cada puzzle, erro de partida, aula e revisão deve atualizar uma representação de domínio dessas habilidades.

---

## 3. O que a pesquisa sugere sobre aprender xadrez

### 3.1 Prática deliberada: atividade precisa ter objetivo e feedback

Charness e colaboradores analisaram atividades de enxadristas avaliados em torneios. Entre as atividades medidas, **estudo sério individual** foi o melhor preditor da habilidade em ambos os grandes grupos examinados; uma combinação de atividades explicou aproximadamente 40% da variância de rating [S1]. Isso não significa que horas de treino determinam sozinhas o rating, nem que exista uma fórmula universal, mas apoia uma conclusão de produto: tempo gasto deve ser **focado em uma deficiência identificável**.

**Implicação de UX:** não entregar “50 puzzles aleatórios”. Entregar “8 posições de garfo/peça solta porque esse grupo gerou 42% dos seus erros táticos recentes”.

### 3.2 Reconhecimento de padrões é parte essencial da expertise

Gobet e Simon encontraram suporte para a ideia de que enxadristas experientes armazenam relações estruturadas entre peças em unidades de memória de longo prazo (“chunks”), posteriormente ampliadas por teorias de templates [S2]. O ponto de produto não é ensinar o usuário a “memorizar tabuleiros”, mas expô-lo repetidamente a **famílias de padrões** em posições variadas.

**Implicação:** o treinador tático deve permitir blocos temáticos curtos para formação de padrão, mas depois misturar temas para forçar reconhecimento sem pistas explícitas.

### 3.3 Recuperação ativa é melhor que apenas reler

Roediger e Karpicke mostraram que testes de recuperação podem produzir retenção tardia superior à releitura, apesar de a releitura muitas vezes gerar maior sensação subjetiva de domínio no curto prazo [S3].

**Implicação:** toda lição deve terminar com uma posição que o aluno precisa resolver **sem a explicação visível**. A plataforma não deve deixar o usuário simplesmente clicar “entendi”.

### 3.4 Revisão espaçada

A meta-análise de Cepeda et al. reuniu 839 avaliações em 317 experimentos e encontrou benefício robusto da distribuição da prática, com o espaçamento ideal dependente do intervalo de retenção [S4].

**Implicação:** erros importantes, padrões frágeis, posições de finais e nós de repertório devem voltar em dias apropriados. `ts-fsrs` fornece uma implementação TypeScript moderna de FSRS sob licença MIT [S11].

### 3.5 Exemplos resolvidos antes de exigir independência total

A literatura de “worked examples” indica que, para aprendizes novatos em um domínio/tipo de problema, estudar exemplos resolvidos reduz carga cognitiva improdutiva e pode melhorar aprendizagem e transferência [S5]. Conforme a experiência cresce, orientação excessiva deve ser retirada.

**Implicação no LanceZero:** uma habilidade nova segue a sequência:

1. posição resolvida com explicação;
2. posição semelhante com uma dica sobre candidatos;
3. posição semelhante com dica opcional;
4. posição independente;
5. posição misturada com outros temas;
6. reaparecimento espaçado.

### 3.6 Feedback precisa explicar, não apenas julgar

Uma meta-análise de 435 estudos (mais de 61 mil participantes) encontrou efeito médio de feedback no aprendizado, mas com forte heterogeneidade; o conteúdo informacional do feedback altera substancialmente sua eficácia [S6].

**Implicação:** “Blunder: -2.1” é feedback ruim. Melhor:

> “Você permitiu um garfo em e4 porque dama e torre ficaram alinhadas com a casa de salto do cavalo. Antes do seu lance, havia um lance forçado do adversário com cheque. Na próxima posição, primeiro liste cheques, capturas e ameaças do oponente.”

### 3.7 O que NÃO deve ser concluído da pesquisa

- Não existe evidência que justifique uma distribuição universal exata de “35% tática, 20% finais...” para todo jogador de 1100.
- Rating online varia por plataforma e ritmo; “1100” não é uma competência absoluta.
- WDL do Stockfish não é probabilidade humana de vitória; é calibrado a partir de autojogo do motor [S12].
- Melhorar no treinador de puzzles não garante transferência automática para partidas.

Por isso, os pesos propostos abaixo são **heurísticas de produto que devem ser calibradas com telemetria e testes**, não alegações científicas.

---

## 4. Currículo proposto para um jogador em torno de 1100

### 4.1 Prioridade inicial sugerida

Para o perfil inicial de 1100, o sistema começa com:

| Área | Peso inicial | Objetivo |
|---|---:|---|
| Padrões táticos | 35% | reconhecer rapidamente ameaças e oportunidades frequentes |
| Cálculo | 20% | criar candidatos, calcular lances forçados e parar antes de mover |
| Análise das próprias partidas | 20% | ligar treinamento aos erros reais |
| Finais essenciais | 15% | converter vantagens básicas e defender posições simples |
| Aberturas | 10% | princípios, repertório estreito e estruturas, sem decorar dezenas de lances |

Esses pesos mudam após 2–4 semanas de dados. Se o jogador perde muito material antes do lance 15, abertura não deve receber 40% só porque ele “quer estudar teoria”. Se a abertura está estável e finais simples estão sendo perdidos, o plano desloca tempo.

### 4.2 Sessão diária selecionável

**20 minutos**
- 4 min revisões vencidas (FSRS)
- 10 min tática/cálculo
- 6 min microlição ou final

**40 minutos — padrão recomendado**
- 5 min revisões vencidas
- 15 min tática
- 10 min cálculo estruturado
- 10 min final/abertura/análise de erro recente

**60 minutos**
- 10 min revisão
- 15 min tática
- 15 min cálculo
- 20 min análise de partida ou lição profunda

Partidas de treino devem existir em dias específicos. Para aprendizado, a interface deve recomendar ritmos que deixem tempo para pensar (por exemplo 10+5 ou 15+10), sem proibir blitz/bullet.

### 4.3 Processo mental ensinado

Antes de cada lance crítico, o aluno aprende um checklist curto:

1. O que o último lance do adversário mudou?
2. Tenho algum cheque forçado?
3. Tenho alguma captura forçada?
4. Existe ameaça imediata contra mim?
5. Quais são 2–3 lances candidatos?
6. Para cada candidato, qual é a resposta mais forte do oponente?
7. Depois da linha calculada, alguma peça fica solta?

O site não deve manter esse checklist permanentemente na tela. A orientação deve “sumir” à medida que a habilidade melhora.

---

## 5. Ecossistema gratuito e open source

### 5.1 Componentes recomendados para o núcleo

| Necessidade | Ferramenta/fonte | Licença / condição | Uso no LanceZero |
|---|---|---|---|
| Engine | Stockfish 18 | GPL-3.0 [S7] | análise local, melhores linhas, MultiPV, WDL |
| Stockfish no navegador | `nmrugg/stockfish.js` | GPL-3.0 [S8] | Web Worker WASM; build lite single-thread no MVP |
| Regras, FEN, PGN | `chess.js` | BSD-2-Clause [S13] | legalidade de movimentos, importação/exportação |
| Tabuleiro React | `react-chessboard` | MIT [S14] | UI do tabuleiro, drag/drop, mobile e acessibilidade |
| Revisão espaçada | `ts-fsrs` | MIT [S11] | agendamento de posições/repertório/erros |
| Puzzles | Lichess Open Database | CC0 [S15] | corpus de treino, pré-processado offline |
| Nomes de aberturas | `lichess-org/chess-openings` | CC0 [S16] | ECO, nome e transposições |
| Opening Explorer | Lichess Opening Explorer API | API pública [S17] | frequência e resultados de movimentos |
| Finais perfeitos | Lichess Tablebase/Syzygy API | API pública; servidor AGPL [S18] | validação de finais com poucas peças |
| Importar partidas Lichess | Lichess API | pública, respeitar limites [S19] | histórico por usuário |
| Importar Chess.com | Chess.com PubAPI | REST somente leitura [S20] | partidas públicas por username |
| Oponente humanoide opcional | Maia-3 | AGPL-3.0 [S21] | fase futura; jogadas por nível humano |

### 5.2 Escala dos dados gratuitos

Em 2 de agosto de 2026, o banco aberto do Lichess informava mais de **394 milhões de posições avaliadas pelo Stockfish** e disponibilizava seus exports sob CC0 [S15]. O mesmo repositório disponibiliza milhões de puzzles classificados por rating, temas, popularidade, número de tentativas e tags de abertura.

O produto não deve carregar milhões de puzzles no navegador. O caminho correto é um **pipeline offline** que seleciona e compacta um subconjunto de alta qualidade.

### 5.3 O que evitar no MVP

**Chessground:** tecnicamente excelente, mas seu próprio README declara GPL-3.0 e afirma que, ao usá-lo em um website, o trabalho combinado deve ser distribuído sob GPL com código-fonte disponibilizado [S22]. Se a intenção é manter liberdade de licenciamento do aplicativo, `react-chessboard` é uma escolha mais simples.

**Maia-3 no primeiro release:** interessante para simular decisões humanas por nível, mas adiciona modelo, runtime e obrigações AGPL. Stockfish resolve o problema pedagógico principal com muito menos infraestrutura.

**Lc0 no browser:** excelente engine neural, mas pesada e desnecessária para o objetivo de ensinar um jogador de 1100. Pode ser uma ferramenta de pesquisa/desktop, não uma dependência do MVP.

**API de LLM como requisito:** não usar. O produto deve continuar funcional sem custo variável de IA. Explicações iniciais devem ser geradas por regras, templates e classificadores determinísticos. Um LLM pode ser plug-in opcional no futuro.

---

## 6. Identidade própria — LanceZero

### 6.1 Nome e conceito

**Nome de trabalho:** LanceZero  
**Tagline principal:** **Treine o que perde suas partidas.**  
**Tagline secundária:** **Do próximo lance ao próximo nível.**

“Zero” comunica ponto de partida, reset do erro e busca por zero descuidos graves. “Lance” ancora imediatamente em xadrez sem depender de palavra inglesa.

> O nome é uma proposta criativa. Uma busca web superficial não substitui busca de marca no INPI nem verificação de domínio/social antes do lançamento comercial.

### 6.2 Personalidade

- analítico, mas não frio;
- sério, sem parecer curso escolar antigo;
- competitivo sem humilhar o usuário;
- direto: mostra o erro e o próximo treino;
- evita excesso de confete, moedas e “energia”.

### 6.3 Símbolo

Logomarca sugerida:

- um **0 geométrico**;
- dentro/atravessando o zero, uma trajetória de cavalo em “L” com dois segmentos;
- opcionalmente, o espaço negativo sugere a cabeça de um cavalo sem desenhar uma peça clássica completa;
- deve continuar legível em 16×16 px.

### 6.4 Paleta

| Token | Cor | Uso |
|---|---|---|
| `ink-950` | `#101318` | fundo escuro e texto forte |
| `ink-800` | `#20252C` | painéis escuros |
| `paper-50` | `#F6F1E8` | fundo claro quente |
| `paper-200` | `#E5DED2` | bordas e casas claras |
| `signal-500` | `#FF6B4A` | CTA, erro acionável, foco da marca |
| `sage-500` | `#7FA68A` | sucesso, progresso, casas escuras opcionais |
| `slate-500` | `#68707D` | texto secundário |

O coral não deve significar automaticamente “blunder”; severidade deve ter combinação de cor + ícone + texto para acessibilidade.

### 6.5 Tipografia

- Interface: **Inter** ou equivalente sans-serif livre, com fallback de sistema.
- Títulos editoriais: **Source Serif 4** opcional, para dar aspecto de “caderno de estudo”.
- Números/eval/relógio: família monoespaçada do sistema quando útil.

Não é necessário carregar duas fontes no MVP; desempenho é mais importante.

### 6.6 Board design

Evitar copiar a estética verde padrão do Lichess ou marrom do Chess.com. Duas opções próprias:

**LanceZero Paper**
- clara: `#E8E0D3`
- escura: `#778276`

**LanceZero Graphite**
- clara: `#C9C9C2`
- escura: `#555F64`

Destaques:
- último lance: borda/overlay âmbar suave;
- candidato do usuário: ponto coral;
- engine: azul/cinza neutro, nunca a mesma cor do lance do aluno;
- ameaça: padrão de contorno, não preenchimento vermelho agressivo.

---

## 7. Arquitetura pedagógica do produto

### 7.1 O “Learning Loop”

Cada habilidade deve atravessar o mesmo ciclo:

1. **Detectar** — diagnóstico ou erro em partida.
2. **Explicar** — conceito curto, posição resolvida, linguagem visual.
3. **Imitar** — resolver posição semelhante com orientação.
4. **Recuperar** — resolver sem dica.
5. **Intercalar** — misturar com outros temas.
6. **Revisar** — reapresentar em intervalo calculado.
7. **Transferir** — detectar se a habilidade aparece numa partida real.
8. **Atualizar domínio** — aumentar ou reduzir prioridade.

O produto deve medir não só “acertou uma vez”, mas **retenção e transferência**.

### 7.2 Skill Graph

Criar uma taxonomia inicial pequena e expansível:

```
tactics/
  hanging-piece
  fork
  pin
  skewer
  discovered-attack
  removal-of-defender
  deflection
  attraction
  overloaded-piece
  back-rank
  mating-net
  zwischenzug
calculation/
  checks-captures-threats
  candidate-moves
  forcing-line-2ply
  forcing-line-4ply
  opponent-best-response
strategy/
  development
  king-safety
  open-file
  weak-square
  good-bad-piece
  pawn-break
endgame/
  basic-mates
  king-pawn-opposition
  key-squares
  outside-passed-pawn
  rook-behind-passed-pawn
opening/
  development
  center
  king-safety
  repertoire-node
```

Evitar uma ontologia de centenas de tags no começo. O mapa de habilidades deve ser compreensível para o usuário.

### 7.3 Mastery Score

Cada habilidade possui:

- `exposures`
- `attempts`
- `correct`
- `firstTryCorrect`
- `medianThinkTimeMs`
- `hintRate`
- `recentAccuracy`
- `retentionAccuracy`
- `realGameOccurrences`
- `realGameErrors`
- `mastery` de 0 a 1
- `confidence` de 0 a 1

Heurística inicial:

```
accuracyComponent = EWMA(últimas tentativas)
retentionComponent = acertos em cards vencidos
speedComponent = velocidade normalizada por dificuldade
transferComponent = 1 - erros_reais / ocorrencias_reais

mastery =
  0.45 * accuracyComponent +
  0.25 * retentionComponent +
  0.10 * speedComponent +
  0.20 * transferComponent
```

Quando ainda não houver partidas suficientes, redistribuir o peso de transferência proporcionalmente. Exibir intervalos de confiança ou simplesmente um estado textual (“poucos dados”, “em formação”, “estável”), em vez de fingir precisão.

### 7.4 Seleção adaptativa de exercício

Pontuação candidata para cada puzzle:

```
selectionScore =
  0.35 * difficultyFit +
  0.30 * weaknessPriority +
  0.20 * dueReviewPriority +
  0.10 * novelty +
  0.05 * recentGameRelevance
```

- `difficultyFit`: máximo perto do rating tático estimado + 0 a +100, com queda fora de ±200.
- `weaknessPriority`: maior para temas de baixa maestria.
- `dueReviewPriority`: alta para cards vencidos.
- `novelty`: reduz repetição excessiva do mesmo FEN/abertura.
- `recentGameRelevance`: sobe se o usuário acabou de cometer erro com o mesmo motivo.

Esses pesos são configuração, não constantes enterradas no código.

---

## 8. Módulos funcionais

### 8.1 Onboarding e diagnóstico

**Tela 1 — Onde você joga?**
- Lichess
- Chess.com
- Tenho PGN
- Quero começar sem importar nada

**Tela 2 — Nível e objetivo**
- rating atual
- ritmo mais jogado
- objetivo: geral / parar de entregar peças / cálculo / finais / abertura
- tempo diário: 20, 40 ou 60 min

**Tela 3 — Diagnóstico**
- 12–20 posições;
- mistura de tática, cálculo, princípios e final;
- dificuldade adaptativa simples;
- não revelar o tema antes da tentativa.

**Resultado:**
- três fraquezas prioritárias;
- estimativa de rating tático separada do rating de jogo;
- primeiro plano de sete dias.

**Critério de sucesso:** onboarding completo em menos de 8 minutos para quem já informa o rating; diagnóstico pode ser retomado.

### 8.2 Dashboard — Treino de hoje

A home autenticada/local deve ser deliberadamente simples:

```
Bom dia.
Treino de hoje · 38 min

[ 5 min ] Revisões vencidas        6 posições
[15 min ] Tática: peças soltas     prioridade alta
[10 min ] Cálculo                  3 posições
[ 8 min ] Final: oposição          1 microlição

[ Começar treino ]

Por que este plano?
→ 4 de seus últimos 7 erros graves começaram com peça sem defesa.
```

Abaixo:
- tendência de erros graves por partida;
- mapa de habilidades;
- próxima partida a revisar;
- progresso semanal.

### 8.3 Treinador de tática

Modos:

1. **Treino diário** — escolhido pelo planner.
2. **Por tema** — formação deliberada de padrão.
3. **Misto** — tema oculto, teste de reconhecimento.
4. **Revisão** — cards FSRS.
5. **Meus erros** — posições geradas das próprias partidas.

Durante tentativa:
- sem engine visível;
- relógio opcional, nunca obrigatório;
- botão “Dica” com custo apenas analítico (registrar uso), não moedas;
- primeira dica: categoria de pensamento (“há um lance forçado”);
- segunda: destaque de uma peça relevante;
- terceira: mostrar primeiro lance.

Depois:
- mostrar solução;
- nome do padrão;
- uma explicação curta;
- variação principal;
- botão “por que meu lance falha?”;
- permitir jogar a linha no tabuleiro.

### 8.4 Treino de cálculo

Diferente de puzzle tático rápido. Fluxo:

1. usuário vê posição;
2. não pode mover imediatamente por padrão — primeiro registra 2–3 candidatos ou escolhe “já pensei”;
3. seleciona a linha principal imaginada, lance a lance, sem mover peças opcionalmente (“modo visualização”);
4. envia linha;
5. engine compara candidatos e PVs;
6. sistema mostra **onde a linha do aluno divergiu da melhor defesa**.

Métricas:
- profundidade correta;
- primeiro erro da linha;
- qualidade dos candidatos;
- quantidade de respostas do adversário subestimadas.

### 8.5 Análise das próprias partidas

Fluxo recomendado:

**Etapa A — análise humana primeiro**
- ocultar engine;
- marcar “onde você acha que a partida mudou?”;
- usuário anota 1–3 momentos.

**Etapa B — engine**
- Stockfish percorre a partida;
- detecta quedas relevantes de WDL/eval;
- agrupa erros parecidos;
- marca apenas momentos pedagógicos, evitando pintar metade da partida de vermelho.

**Etapa C — transformar erro em treino**
- “Salvar como posição de revisão”;
- associar skill tags;
- agendar no FSRS;
- se for tático, gerar exercício a partir do FEN anterior ao erro.

**Etapa D — resumo**

```
Você perdeu 2,1 pontos de score esperado em 3 decisões.
2/3 vieram de peças sem defesa.
1/3 veio de cálculo de uma resposta forçada.

Próximo treino: peças soltas + cheques do adversário.
```

Evitar clones de “91.4% accuracy” como métrica principal. O objetivo é ação.

### 8.6 Classificação de erro com Stockfish

Usar orçamento fixo de nós ou profundidade controlada para comparabilidade. Para cada posição crítica:

1. analisar posição antes do lance do usuário;
2. guardar melhor linha, `score cp/mate`, MultiPV e `wdl`;
3. aplicar lance do usuário;
4. analisar a posição resultante do ponto de vista consistente;
5. calcular perda de score esperado WDL;
6. classificar severidade.

Heurística inicial, a calibrar:

- **imprecisão:** perda esperada ~3–8 pontos percentuais;
- **erro:** ~8–18 pp;
- **erro grave:** >18 pp;
- overrides para mate forçado, entrega direta de material e transição win→draw/loss.

**Importante:** os números WDL do Stockfish são derivados de um modelo baseado em autojogo do motor, não de jogadores humanos daquele rating [S12]. Portanto, usar essa escala para **comparar gravidade internamente**, não exibir “você tinha 73% de chance humana de vencer”.

### 8.7 Explicador determinístico de erros

Antes de pensar em LLM, construir regras:

- `hungPiece`: peça ficou atacada e sem defesa suficiente;
- `missedCapture`: captura de material limpa ignorada;
- `forkAllowed`: resposta cria ataque múltiplo;
- `pinTactic`: peça não pode mover por exposição de rei/dama;
- `backRank`: rei sem casa de fuga + ameaça de torre/dama;
- `missedMate`: engine encontra mate curto;
- `kingSafety`: abertura de linhas contra rei após roque/rei central;
- `openingPrinciple`: repetição de peça / dama precoce / rei no centro, somente quando contextual;
- `endgameTechnique`: consultar tablebase quando aplicável.

Template:

```
TÍTULO: Você deixou o cavalo criar um ataque duplo
O QUE ACONTECEU: após {userMove}, {opponentMove} ataca {pieceA} e {pieceB}.
SINAL QUE VOCÊ PODIA VER: a casa {square} estava disponível e a peça tinha salto com tempo.
PROCESSO PARA A PRÓXIMA: antes de finalizar seu lance, procure cheques e ataques duplos do adversário.
TREINO GERADO: 4 posições de ataque duplo em dificuldade semelhante.
```

### 8.8 Finais

Trilhas iniciais:

1. mate de dama;
2. mate de torre;
3. rei + peão: oposição;
4. casas-chave;
5. peão passado;
6. regra do quadrado;
7. finais básicos de torre;
8. conversão com peça a mais.

Cada unidade:
- conceito em 2–4 telas curtas;
- exemplo resolvido;
- posição jogável contra defesa ótima;
- teste sem dica;
- revisão futura.

Quando a posição estiver em alcance da tablebase, usar resposta perfeita do serviço Syzygy/Lichess [S18]. Implementar cache e fallback: a lição deve continuar utilizável se a API externa estiver fora.

### 8.9 Aberturas

O módulo de abertura não deve virar um “decorador de 25 lances” para 1100.

Três camadas:

**1. Princípios**
- centro;
- desenvolvimento;
- rei seguro;
- não mover a mesma peça repetidamente sem razão;
- entender quando uma regra pode ser quebrada.

**2. Repertório estreito**
- 1 sistema principal de brancas;
- resposta a `1.e4`;
- resposta a `1.d4`;
- ramos mais comuns primeiro.

**3. Estruturas e planos**
- posição típica;
- quebra de peões;
- casas boas para peças;
- troca desejável.

Dados:
- `lichess-org/chess-openings` para ECO/nome [S16];
- Opening Explorer para frequência e resultados [S17];
- próprias partidas do usuário para priorizar linhas que ele realmente enfrenta.

Treino de repertório usa FSRS, mas cada card inclui uma nota de **ideia**, não só “jogue Cf3”.

### 8.10 Biblioteca de lições

Formato MDX/JSON estruturado, não HTML hardcoded.

Schema aproximado:

```ts
type Lesson = {
  id: string
  slug: string
  title: string
  level: { min: number; max: number }
  skills: SkillId[]
  estimatedMinutes: number
  steps: Array<
    | { type: 'text'; markdown: string }
    | { type: 'board'; fen: string; arrows?: Arrow[]; highlights?: Square[] }
    | { type: 'worked-example'; fen: string; line: string[]; explanation: string[] }
    | { type: 'question'; fen: string; expected: string[]; hints?: Hint[] }
  >
}
```

Conteúdo inicial sugerido: 30–40 microlições, não 300. Qualidade e ligação com o planner importam mais que catálogo.

---

## 9. Pipeline de puzzles Lichess

### 9.1 Fonte

O banco de dados do Lichess é CC0 [S15]. O formato público de puzzles inclui, entre outros campos, FEN, movimentos UCI, rating, desvio de rating, popularidade, número de jogos, temas, URL da partida e tags de abertura.

Há um detalhe de implementação importante: no dataset, o FEN representa a posição **antes do lance anterior que conduz ao puzzle**; deve-se aplicar o primeiro movimento do campo `Moves` e então o lado do usuário inicia a solução a partir do segundo movimento. Essa regra deve ter teste automatizado com fixtures reais.

### 9.2 Não importar tudo no MVP

Criar script offline:

```
scripts/puzzles/download-lichess.ts
scripts/puzzles/parse-zst.ts
scripts/puzzles/filter.ts
scripts/puzzles/export-sqlite.ts
```

Filtro inicial:
- rating 600–2200;
- popularidade mínima configurável;
- excluir puzzles com dados inválidos;
- incluir pelo menos temas táticos nucleares;
- balancear por buckets de 100 rating;
- limitar repetição extrema de um tema;
- manter `sourceId` para rastreabilidade.

Meta inicial: **100 mil a 300 mil puzzles** curados. É mais do que suficiente para testar o produto e muito mais simples que servir o corpus completo.

### 9.3 Build de desenvolvimento

Não versionar centenas de MB no Git.

- `data/fixtures/puzzles.sample.json` com ~100 puzzles;
- script oficial baixa o dump;
- produção gera banco/arquivo separado;
- registrar data e hash do dump processado.

---

## 10. Arquitetura técnica

### 10.1 Stack recomendada

- **Next.js + React + TypeScript**, versão estável no momento da implementação;
- App Router;
- Tailwind CSS ou CSS variables + modules; escolher um padrão e não misturar;
- `react-chessboard`;
- `chess.js`;
- `ts-fsrs`;
- Web Worker para Stockfish;
- IndexedDB atrás de um repositório próprio;
- Vitest para unitários;
- Playwright para E2E;
- PWA instalável.

Pin das versões deve ocorrer no primeiro bootstrap e o lockfile entra no repositório.

### 10.2 Local-first no MVP

Motivos:
- custo de servidor quase zero;
- Stockfish roda no dispositivo;
- usuário pode testar sem conta;
- protótipo pode ser hospedado como aplicação web estática/híbrida;
- privacidade: PGNs podem permanecer localmente.

Criar interface de persistência para não acoplar domínio ao IndexedDB:

```ts
interface TrainingRepository {
  getProfile(): Promise<UserProfile | null>
  saveProfile(profile: UserProfile): Promise<void>
  saveGame(game: Game): Promise<void>
  listGames(query?: GameQuery): Promise<Game[]>
  saveAttempt(attempt: PuzzleAttempt): Promise<void>
  getDueCards(now: Date): Promise<ReviewCard[]>
  saveAnalysis(analysis: PositionAnalysis[]): Promise<void>
}
```

Uma futura implementação `RemoteTrainingRepository` pode sincronizar com PostgreSQL sem reescrever os módulos pedagógicos.

### 10.3 Estrutura sugerida

```
lancezero/
├─ CLAUDE.md
├─ README.md
├─ docs/
│  ├─ PRODUCT.md
│  ├─ PEDAGOGY.md
│  ├─ LICENSES.md
│  ├─ DATA_SOURCES.md
│  ├─ adr/
│  │  ├─ 001-local-first.md
│  │  ├─ 002-stockfish-worker.md
│  │  └─ 003-licensing-boundaries.md
├─ public/
│  ├─ brand/
│  ├─ pieces/
│  └─ engine/stockfish/
│     ├─ stockfish-18-lite-single.js
│     ├─ stockfish-18-lite-single.wasm
│     ├─ COPYING.txt
│     └─ SOURCE.txt
├─ src/
│  ├─ app/
│  │  ├─ page.tsx
│  │  ├─ onboarding/
│  │  ├─ dashboard/
│  │  ├─ train/
│  │  ├─ puzzles/
│  │  ├─ calculate/
│  │  ├─ games/
│  │  ├─ openings/
│  │  ├─ endgames/
│  │  ├─ lessons/
│  │  └─ settings/
│  ├─ components/
│  │  ├─ chess/
│  │  ├─ training/
│  │  ├─ analysis/
│  │  └─ ui/
│  ├─ domain/
│  │  ├─ skills/
│  │  ├─ planning/
│  │  ├─ puzzles/
│  │  ├─ games/
│  │  └─ repertoire/
│  ├─ lib/
│  │  ├─ chess/
│  │  ├─ engine/
│  │  ├─ fsrs/
│  │  ├─ importers/
│  │  └─ storage/
│  ├─ workers/
│  │  └─ stockfish.worker.ts
│  └─ content/
│     └─ lessons/
├─ scripts/
│  └─ puzzles/
├─ tests/
│  ├─ fixtures/
│  ├─ unit/
│  └─ e2e/
└─ package.json
```

### 10.4 Engine abstraction

Nunca chamar Stockfish diretamente dentro de componentes React.

```ts
export interface EngineProvider {
  init(): Promise<void>
  analyzePosition(
    fen: string,
    options: {
      nodes?: number
      depth?: number
      multiPv?: number
      showWdl?: boolean
    }
  ): Promise<EngineAnalysis>
  stop(): Promise<void>
  dispose(): Promise<void>
}
```

`StockfishWebProvider` roda em Worker.

Requisitos:
- fila serial de comandos UCI;
- `uci` → `uciok`;
- `isready` → `readyok`;
- cancelamento com `stop`;
- ignorar respostas antigas por `analysisId`;
- timeout e reinicialização se Worker travar;
- não manter engine calculando em página oculta sem necessidade.

### 10.5 Build Stockfish do MVP

Usar inicialmente `stockfish-18-lite-single` (~7 MB) [S8]. O README do projeto o recomenda para a maioria dos usos web por evitar configuração complexa de threads e manter força muito acima da humana.

Fase posterior:
- detectar `crossOriginIsolated`;
- oferecer build multithread em desktop;
- configurar COOP/COEP corretamente;
- manter fallback single-thread.

### 10.6 Orçamento de análise

Preferir **nodes** a profundidade como orçamento principal porque torna custo mais previsível entre posições.

Valores iniciais de produto — calibrar em dispositivos reais:
- puzzle feedback curto: 80k–150k nodes;
- comparação de candidato: 150k–300k;
- análise pós-partida rápida: 100k–250k por posição crítica;
- análise profunda manual: 500k–1M+.

Não analisar cada ply profundamente por padrão. Fazer passagem rasa para detectar candidatos a momentos críticos e aprofundar apenas neles.

### 10.7 Importadores

**Lichess**
- username;
- baixar jogos recentes por API;
- uma requisição de cada vez;
- em HTTP 429, esperar um minuto antes de retomar, conforme orientação oficial [S19];
- cache por ID de partida.

**Chess.com**
- usar PubAPI oficial, somente leitura, para dados públicos [S20];
- respeitar `ETag`/`Last-Modified` quando disponíveis;
- identificação de User-Agent conforme documentação;
- nunca fazer scraping HTML.

**PGN**
- colar texto;
- upload `.pgn`;
- validar com `chess.js`;
- permitir múltiplas partidas com seletor.

### 10.8 APIs externas e cache

Criar adapters:

```ts
interface OpeningExplorerProvider { getStats(fen: string, filters: ExplorerFilters): Promise<ExplorerStats> }
interface TablebaseProvider { probe(fen: string): Promise<TablebaseResult | null> }
interface GameImportProvider { listGames(identity: string, cursor?: string): Promise<GamePage> }
```

Nunca espalhar URL de terceiros pela UI.

Cache local:
- explorer: chave `fen + filtros`, TTL longo;
- tablebase: praticamente imutável; cache permanente por FEN;
- imports: incremental por último jogo/data.

### 10.9 Modelo de dados

```ts
type UserProfile = {
  id: string
  locale: 'pt-BR' | string
  currentRating?: number
  ratingProvider?: 'lichess' | 'chesscom' | 'other'
  preferredTimeControl?: string
  dailyMinutes: 20 | 40 | 60
  goals: string[]
  createdAt: string
}

type Game = {
  id: string
  source: 'lichess' | 'chesscom' | 'pgn'
  sourceId?: string
  pgn: string
  playedAt?: string
  userColor?: 'white' | 'black'
  result?: string
  rating?: number
  opponentRating?: number
  timeControl?: string
  eco?: string
  openingName?: string
}

type PositionAnalysis = {
  id: string
  gameId: string
  ply: number
  fenBefore: string
  userMoveUci: string
  bestMoveUci: string
  bestPv: string[]
  cpBefore?: number
  cpAfter?: number
  mateBefore?: number
  mateAfter?: number
  wdlBefore?: [number, number, number]
  wdlAfter?: [number, number, number]
  scoreLoss?: number
  severity: 'ok' | 'inaccuracy' | 'mistake' | 'blunder'
  skills: string[]
  explanationCode?: string
}

type Puzzle = {
  id: string
  source: 'lichess' | 'generated' | 'lesson'
  sourceId?: string
  fen: string
  movesUci: string[]
  rating?: number
  ratingDeviation?: number
  popularity?: number
  themes: string[]
  openingTags?: string[]
}

type PuzzleAttempt = {
  id: string
  puzzleId: string
  attemptedAt: string
  correct: boolean
  firstTryCorrect: boolean
  thinkTimeMs: number
  hintsUsed: number
  movesPlayed: string[]
}

type ReviewCard = {
  id: string
  kind: 'puzzle' | 'mistake' | 'opening' | 'endgame' | 'concept'
  contentId: string
  due: string
  stability: number
  difficulty: number
  elapsedDays: number
  scheduledDays: number
  reps: number
  lapses: number
  state: number
}
```

---

## 11. Plano diário e algoritmo do coach

### 11.1 Entradas do planner

A função `buildDailyPlan()` recebe:

- minutos disponíveis;
- cards FSRS vencidos;
- mastery por skill;
- diagnóstico inicial;
- erros das partidas dos últimos 14–30 dias;
- tempo desde a última sessão de cada área;
- preferências do usuário;
- fadiga/repetição recente (não repetir sempre o mesmo tema).

### 11.2 Regras de prioridade

Ordem inicial:

1. reviews vencidos com alto valor pedagógico;
2. habilidade responsável por erros reais recentes;
3. habilidade fraca com alta frequência no nível do usuário;
4. cálculo;
5. final/abertura para manter currículo balanceado;
6. exploração livre somente após o treino principal.

Pseudocódigo:

```ts
function buildDailyPlan(ctx: PlannerContext): TrainingPlan {
  const budget = ctx.dailyMinutes
  const items: PlanItem[] = []

  allocateDueReviews(items, budget * 0.20, ctx)
  allocateWeaknessDrill(items, budget * 0.35, ctx)
  allocateCalculation(items, budget * 0.20, ctx)
  allocateRotatingCurriculum(items, budget * 0.25, ctx)

  return normalizeToBudget(items, budget)
}
```

O planner deve ser puro/determinístico quando recebe um seed. Isso facilita testes.

### 11.3 Adaptação semanal

Uma vez por semana:

- recalcular top 3 fraquezas;
- comparar métricas com semana anterior;
- reduzir treino de habilidade já estável;
- aumentar habilidade com erros reais;
- sugerir um foco principal e um secundário.

Exemplo de relatório:

> **Foco da semana: visão tática defensiva.** Você reduziu peças entregues de 1,8 para 1,1 por partida, mas ainda falhou em 5 de 12 posições onde o adversário tinha cheque forçado. Nesta semana, cálculo começa sempre pela resposta mais forte do oponente.

---

## 12. Métricas de progresso

### 12.1 Métricas que realmente importam

- rating em janela móvel, separado por plataforma/ritmo;
- erros graves por 100 lances;
- perda média de score/WDL por decisão crítica;
- taxa de peças entregues sem compensação;
- acerto em puzzles a dificuldade constante;
- retenção de cards vencidos;
- mastery por skill;
- desempenho em finais padronizados;
- aderência ao repertório até certo ply;
- transferência: frequência de um erro treinado em partidas posteriores.

### 12.2 Métricas motivacionais secundárias

- dias treinados na semana;
- sessões completas;
- tempo focado;
- “sequência flexível” que não pune brutalmente um dia perdido.

Evitar gamificação que gere comportamento de grind sem reflexão.

### 12.3 North star de produto

**Sessões de treino de alta qualidade concluídas com revisão de erro.**

Rating é objetivo final, mas é lento e ruidoso demais para ser a única métrica de produto.

---

## 13. UX detalhada por tela

### 13.1 Landing page

Estrutura:

1. hero: “Treine o que perde suas partidas.”
2. demonstração visual: partida → erro → treino gerado → revisão;
3. “100% funcional sem assinatura para o núcleo”;
4. explicação de análise local;
5. CTA “Montar meu primeiro treino”.

Não usar linguagem “IA que vai transformar seu xadrez”. O valor é metodologia + ferramentas abertas.

### 13.2 Navegação

Desktop:

- Hoje
- Treinar
- Partidas
- Aberturas
- Finais
- Progresso
- Biblioteca

Mobile: bottom navigation com 4 itens principais e “Mais”.

### 13.3 Tela de puzzle

Layout desktop:

```
┌──────────── tabuleiro ────────────┐  ┌─ contexto ──────────────┐
│                                   │  │ Treino diário · 4/10    │
│                                   │  │                         │
│                                   │  │ Pense primeiro.         │
│                                   │  │                         │
└───────────────────────────────────┘  │ [Dica] [Desistir]       │
                                       └─────────────────────────┘
```

Após resposta, painel troca para “explicação” sem abrir modal que esconda o tabuleiro.

### 13.4 Tela de revisão de partida

Timeline inferior ou lateral:
- somente momentos críticos destacados;
- alternador “Minha análise / Engine”;
- comentários do usuário persistidos;
- CTA “Treinar este erro”.

### 13.5 Progresso

Evitar radar chart como única leitura. Mostrar:

- 3 habilidades fortes;
- 3 prioridades;
- série temporal de erros;
- retenção;
- tabelas simples por tema.

Radar pode existir como visual secundário.

---

## 14. Acessibilidade e responsividade

Requisitos de primeira classe:

- navegação por teclado no tabuleiro onde a biblioteca permitir;
- alternativa textual para movimentos;
- foco visível;
- contraste WCAG AA;
- nunca depender somente de vermelho/verde;
- `prefers-reduced-motion`;
- tamanho mínimo de alvo touch;
- orientação do tabuleiro configurável;
- notação algébrica e coordenadas opcionais;
- suporte a zoom 200%;
- telas de treino funcionais a partir de ~360 px.

`react-chessboard` declara suporte a responsividade, mobile e acessibilidade, mas isso não elimina a necessidade de testes próprios [S14].

---

## 15. Privacidade e segurança

### MVP local-first

- nenhuma conta obrigatória;
- PGN/progresso armazenados no dispositivo;
- botão de exportar backup JSON;
- botão apagar todos os dados;
- explicar claramente quando uma importação consulta Lichess/Chess.com.

### Se houver sync futuro

- autenticação segura;
- dados mínimos;
- criptografia em trânsito;
- política de retenção;
- exclusão de conta e dados;
- não armazenar tokens de terceiros no cliente sem necessidade;
- CSP;
- rate limiting;
- validação server-side de uploads PGN;
- sanitização de conteúdo Markdown/MDX.

Não enviar PGN a serviços de IA externos sem opt-in explícito.

---

## 16. Licenças — ponto crítico

### 16.1 Stockfish

Stockfish é GPL-3.0 [S7]. `stockfish.js` também é GPL-3.0 [S8]. Ao redistribuir binários/WASM, o projeto precisa cumprir as obrigações da GPL, incluindo disponibilizar licença e código-fonte correspondente ou meio válido de obtê-lo conforme aplicável.

**Estratégia técnica recomendada:**

- manter o engine em diretório isolado;
- não modificar Stockfish no MVP;
- incluir `COPYING.txt`;
- incluir `SOURCE.txt` apontando para a versão/fonte exata distribuída;
- registrar hash/tag do build;
- documentar a fronteira entre aplicação e worker;
- antes de lançamento comercial, revisar a interpretação de trabalho derivado com profissional de licenciamento se o restante do app não for GPL.

Esta especificação não fornece aconselhamento jurídico.

### 16.2 UI e regras

`react-chessboard`: MIT [S14].  
`chess.js`: BSD-2-Clause [S13].  
`ts-fsrs`: MIT [S11].

Essas licenças são permissivas e simplificam a aplicação principal.

### 16.3 Por que não Chessground

O README oficial do Chessground declara explicitamente que, ao ser usado no website, o trabalho combinado só pode ser distribuído sob GPL e o fonte precisa ser liberado [S22]. É perfeitamente aceitável se o LanceZero decidir ser GPL, mas não é a opção mais flexível se a estratégia de produto ainda não definiu isso.

### 16.4 Dados Lichess

Os exports da base Lichess são CC0 e podem ser usados, modificados e redistribuídos [S15]. O dataset `chess-openings` também é CC0 [S16]. Mesmo quando atribuição não é exigida, manter “Fontes de dados” no app é boa prática.

### 16.5 APIs Lichess

Não tratar serviço público como infraestrutura garantida. Criar cache, limites e fallback. Seguir a regra publicada de uma requisição por vez e, após 429, aguardar um minuto [S19].

---

## 17. Estratégia de testes

### 17.1 Unitários

Obrigatórios:

- parser PGN;
- normalização FEN;
- conversão SAN/UCI;
- aplicação correta da primeira jogada do puzzle Lichess;
- classificação de resultado do puzzle;
- scheduler FSRS adapter;
- `buildDailyPlan()`;
- cálculo de mastery;
- score loss/WDL orientation;
- detecção de mate e severidade;
- regras dos explicadores determinísticos;
- Opening Explorer adapter;
- Tablebase adapter.

### 17.2 Engine contract tests

Fixtures com FENs conhecidos:

- mate em 1;
- vantagem material óbvia;
- posição igual;
- posição com MultiPV;
- cancelamento de análise;
- worker reiniciado.

Não testar “Stockfish precisa retornar exatamente +1.37”, pois versões/builds podem variar. Testar propriedades e intervalos.

### 17.3 E2E

Playwright:

1. onboarding sem conta;
2. completar puzzle;
3. errar puzzle e gerar revisão;
4. recarregar e manter progresso;
5. importar PGN;
6. analisar partida;
7. salvar erro como treino;
8. concluir plano diário;
9. exportar backup;
10. mobile viewport.

### 17.4 Performance budgets

- shell da aplicação utilizável antes de baixar engine;
- Stockfish carregado sob demanda;
- engine WASM não bloqueia main thread;
- Web Worker encerrado quando não necessário;
- puzzle seguinte pré-carregado;
- Lighthouse/auditoria sem regressões graves;
- teste em notebook intermediário e Android intermediário, não apenas desktop potente.

---

## 18. Roadmap de implementação para Claude Code

### Fase 0 — Fundação do repositório

**Entregas**
- Next.js/TypeScript;
- lint/format/test;
- tokens visuais;
- páginas vazias roteadas;
- `docs/` e ADRs;
- CI básico;
- `LICENSES.md`.

**Aceite**
- `pnpm lint`, `pnpm typecheck`, `pnpm test` passam;
- home responsiva;
- zero dependência de engine ainda.

### Fase 1 — Domínio do xadrez e tabuleiro

**Entregas**
- `chess.js` adapter;
- `react-chessboard` wrapper;
- FEN/PGN viewer;
- histórico de lances;
- setas/highlights;
- fixtures.

**Aceite**
- carregar FEN;
- fazer apenas lances legais;
- importar PGN e navegar lance a lance;
- flip board;
- mobile funcional.

### Fase 2 — Stockfish no Web Worker

**Entregas**
- copiar/empacotar build GPL corretamente;
- `EngineProvider`;
- UCI worker;
- análise por nodes;
- MultiPV;
- WDL;
- cancelamento;
- painel de debug interno.

**Aceite**
- UI nunca congela durante análise;
- posição nova cancela análise antiga;
- mate reconhecido;
- worker recupera de timeout;
- licenças presentes.

### Fase 3 — Puzzles

**Entregas**
- fixture dataset;
- pipeline do dump Lichess;
- puzzle repository;
- trainer;
- temas;
- tentativa/feedback;
- rating tático simples.

**Aceite**
- puzzle Lichess começa no lado correto após o move preparatório;
- acerto/erro persistem;
- solução completa validada;
- sem revelar tema no modo misto.

### Fase 4 — Persistência + FSRS

**Entregas**
- IndexedDB repository;
- review cards;
- integração `ts-fsrs`;
- tela de revisão;
- export/import JSON.

**Aceite**
- progresso sobrevive refresh;
- um erro pode voltar como review;
- import/export round-trip mantém IDs e estado.

### Fase 5 — Skill Graph + Daily Planner

**Entregas**
- taxonomia;
- mastery;
- seleção adaptativa;
- dashboard “Treino de hoje”;
- sessão 20/40/60;
- justificativa do plano.

**Aceite**
- plano cabe no orçamento de tempo;
- habilidade fraca recebe prioridade;
- reviews vencidos entram antes de conteúdo novo;
- seed gera plano reproduzível para testes.

### Fase 6 — Importação e análise de partidas

**Entregas**
- PGN;
- Lichess importer;
- Chess.com PubAPI importer;
- análise humana pré-engine;
- passagem rasa + aprofundamento de posições críticas;
- severidade;
- timeline.

**Aceite**
- importar últimas partidas sem duplicar;
- 429 Lichess respeitado;
- usuário consegue revisar sem engine primeiro;
- 3–8 momentos mais relevantes destacados em uma partida típica, não dezenas.

### Fase 7 — “Meus erros” e explicador

**Entregas**
- converter posições críticas em review cards;
- regras determinísticas de temas;
- explicações templated;
- ligar erro real ao planner.

**Aceite**
- erro tático salvo reaparece em sessão futura;
- explicação contém mecanismo + ação futura;
- taxa de `unknown` do classificador é medida; nunca inventar tema se confiança baixa.

### Fase 8 — Finais

**Entregas**
- lesson schema;
- primeiras lições;
- positions trainer;
- tablebase adapter/cache;
- defesa ótima quando aplicável.

**Aceite**
- lição completa sem conexão após conteúdo já cacheado;
- tablebase indisponível não quebra tela;
- posições básicas têm testes de objetivo.

### Fase 9 — Aberturas

**Entregas**
- banco CC0 de nomes ECO;
- explorer adapter;
- repertório em árvore;
- cards FSRS;
- notas de ideia;
- “linhas que você enfrenta”.

**Aceite**
- transposição não cria nós duplicados incompatíveis;
- usuário pode criar repertório de brancas/pretas;
- planner prioriza ramo encontrado em partidas reais.

### Fase 10 — Conteúdo e onboarding final

**Entregas**
- 30–40 microlições;
- diagnóstico;
- primeira semana automática;
- copy PT-BR;
- estados vazios.

**Aceite**
- novo usuário sem conta chega ao primeiro treino em poucos minutos;
- usuário que informa 1100 não recebe conceitos excessivamente básicos como única trilha;
- lições sempre terminam com recuperação ativa.

### Fase 11 — PWA, qualidade e lançamento beta

**Entregas**
- instalação PWA;
- offline parcial;
- acessibilidade;
- performance;
- observabilidade opt-in e privacy-friendly;
- páginas legais/fontes/licenças;
- beta checklist.

**Aceite**
- core local funciona sem login;
- engine não carrega na landing;
- navegação mobile sólida;
- relatório de licenças revisado;
- nenhuma chave secreta no client.

### Fase 12 — Sync opcional

Somente depois de validar que o loop pedagógico funciona.

- conta;
- sync PostgreSQL;
- merge/conflict strategy;
- multi-device;
- backup server-side.

### Fase 13 — Maia / sparring humanoide opcional

Maia-3 é uma família recente de modelos voltada a prever jogadas humanas em diferentes níveis e funciona como engine UCI [S21]. Pode criar um excelente modo “jogue contra alguém que erra como um humano de ~seu nível”. Porém:

- é AGPL-3.0;
- requer modelo/runtime;
- aumenta custo e complexidade;
- deve ser fase posterior.

Alternativa de produto: continuar usando bots Stockfish com limitação controlada, embora seus erros possam parecer menos humanos.

---

## 19. Backlog priorizado

### P0 — precisa existir para provar a ideia

- tabuleiro;
- Stockfish local;
- puzzles;
- persistência;
- FSRS;
- daily plan;
- PGN import;
- análise de partidas;
- “erro → review futuro”;
- skill mastery;
- identidade visual.

### P1 — transforma protótipo em plataforma

- Lichess/Chess.com import automático;
- finais;
- aberturas;
- diagnóstico;
- relatórios semanais;
- PWA;
- biblioteca de lições.

### P2 — diferenciação avançada

- Maia;
- sparring adaptativo;
- estudo “guess the move” em partidas-modelo;
- colaboração/coach sharing;
- sync;
- editor de cursos;
- recomendações com modelo de habilidade mais sofisticado.

---

## 20. O que Claude Code NÃO deve fazer

1. Não construir todas as fases em uma única execução.
2. Não instalar uma biblioteca antes de verificar licença e necessidade.
3. Não colocar lógica de domínio dentro de componentes React.
4. Não chamar Stockfish na main thread.
5. Não depender de Lichess/Chess.com para o site abrir.
6. Não usar Cloud Eval/LLM pago como requisito.
7. Não analisar todos os lances profundamente por padrão.
8. Não criar um sistema genérico de gamificação antes de validar treino.
9. Não implementar 200 lições antes do loop de feedback funcionar.
10. Não classificar um motivo tático se o classificador não tiver confiança.
11. Não mostrar WDL do Stockfish como probabilidade humana literal.
12. Não copiar layout, marca, peças ou identidade visual de concorrentes.
13. Não incluir Chessground sem decisão consciente de GPL para o trabalho combinado.

---

## 21. Definition of Done global

Uma feature é concluída apenas quando:

- TypeScript sem erro;
- lint passa;
- unit tests da lógica central;
- E2E quando fluxo de usuário;
- loading/erro/estado vazio;
- mobile testado;
- teclado/foco básicos testados;
- persistência testada quando aplicável;
- nenhuma chamada externa sem timeout/cache/fallback apropriado;
- licença registrada em `docs/LICENSES.md`;
- documentação relevante atualizada;
- não existem TODOs silenciosos em caminho crítico.

---

## 22. Plano de validação com jogadores

Antes de investir em sync, social ou IA:

### Beta 1 — 10 a 20 jogadores, 800–1400

Perguntas:
- conseguem entender por que cada treino foi escolhido?
- fazem a revisão humana antes de ligar engine?
- explicações de erros são úteis ou óbvias?
- daily plan reduz paralisia de escolha?
- há transferência dos 2–3 erros mais frequentes?

### Beta 2 — 50 a 100 jogadores

Medir por 4–8 semanas:
- sessões por semana;
- retenção de cards;
- erros graves por 100 lances;
- recorrência de skills treinadas em partidas;
- rating por ritmo como métrica secundária;
- abandono em cada módulo.

### Experimentos úteis

- tema explícito vs tema oculto após bloco inicial;
- feedback engine-only vs feedback explicativo;
- revisão FSRS vs revisão aleatória;
- análise humana antes da engine vs engine imediata;
- daily plan automático vs escolha livre.

---

## 23. Exemplo da experiência completa de um usuário de 1100

**Dia 1**  
Importa 20 partidas. Diagnóstico mostra peças soltas e baixa visão de resposta forçada. O site não manda estudar Siciliana 15 lances; gera 15 min de peça solta + 10 min cálculo + 10 min final.

**Dia 2**  
Seis puzzles novos, quatro revisões. Dois erros viram cards.

**Dia 3**  
O usuário joga 15+10. Antes da engine, marca dois momentos. Engine encontra um erro grave diferente: permitiu um garfo. O sistema salva a posição e sobe prioridade de “ataque duplo”.

**Dia 5**  
A posição reaparece sem rótulo. Ele acerta. FSRS agenda novo intervalo.

**Dia 8**  
Relatório: peças entregues diminuíram, mas cálculo defensivo continua fraco. O foco semanal muda sem o usuário precisar montar um cronograma manual.

É esse ciclo, e não o número absoluto de ferramentas, que define o produto.

---

## 24. Recomendação de primeiro release

O primeiro release público não precisa de abertura, finais avançados, sync ou Maia.

**Release 0.1 ideal:**

- marca LanceZero;
- onboarding 1100-friendly;
- 25–50 mil puzzles curados inicialmente (mesmo que o pipeline suporte mais);
- Stockfish local;
- treino diário;
- FSRS;
- import PGN;
- análise de partida;
- transformação de erro em revisão;
- 10–15 microlições nucleares;
- 15–20 skills;
- dashboard de progresso.

Se esse release fizer um usuário pensar “o site sabe o que eu deveria estudar hoje e usa minhas partidas para decidir”, a tese de produto está validada.

---

## 25. Fontes e referências

**[S1]** Charness, N.; Tuffiash, M.; Krampe, R.; Reingold, E.; Vasyukova, E. “The role of deliberate practice in chess expertise.” *Applied Cognitive Psychology* 19(2), 2005. https://doi.org/10.1002/acp.1106

**[S2]** Gobet, F.; Simon, H. A. “Expert chess memory: revisiting the chunking hypothesis.” *Memory* 6(3), 1998. https://pubmed.ncbi.nlm.nih.gov/9709441/

**[S3]** Roediger, H. L.; Karpicke, J. D. “Test-enhanced learning: taking memory tests improves long-term retention.” *Psychological Science* 17(3), 2006. https://pubmed.ncbi.nlm.nih.gov/16507066/

**[S4]** Cepeda, N. J.; Pashler, H.; Vul, E.; Wixted, J. T.; Rohrer, D. “Distributed practice in verbal recall tasks: A review and quantitative synthesis.” *Psychological Bulletin* 132(3), 2006. https://pubmed.ncbi.nlm.nih.gov/16719566/

**[S5]** van Gog, T.; Kester, L.; Paas, F. “Effects of worked examples, example-problem, and problem-example pairs on novices’ learning.” *Contemporary Educational Psychology* 36(3), 2011. https://doi.org/10.1016/j.cedpsych.2010.10.004

**[S6]** Wisniewski, B.; Zierer, K.; Hattie, J. “The Power of Feedback Revisited: A Meta-Analysis of Educational Feedback Research.” *Frontiers in Psychology* 10, 2020. https://doi.org/10.3389/fpsyg.2019.03087

**[S7]** Stockfish official repository. Stockfish 18 listed as latest stable release, 31 Jan 2026; GPL-3.0. https://github.com/official-stockfish/Stockfish

**[S8]** Rugg, N. `stockfish.js` — Stockfish 18 WebAssembly builds for browsers; GPL-3.0. https://github.com/nmrugg/stockfish.js

**[S9]** Chess.com Help Center. “How do Puzzles work on Chess.com?” Basic membership: three rated puzzles/day plus daily Rush/Battle at time of research. https://support.chess.com/en/articles/8608686-how-do-puzzles-work-on-chess-com

**[S10]** Lichess. Features page: analysis, unlimited tactical puzzles, opening explorer and tablebases available free. https://lichess.org/features

**[S11]** Open Spaced Repetition. `ts-fsrs`, TypeScript FSRS toolkit; MIT. https://github.com/open-spaced-repetition/ts-fsrs

**[S12]** Stockfish. WDL model repository; describes calibration from Stockfish selfplay/fishtest data and `UCI_ShowWDL`. https://github.com/official-stockfish/WDL_model

**[S13]** `chess.js` — move generation/validation, FEN/PGN utilities; BSD-2-Clause. https://github.com/jhlywa/chess.js

**[S14]** `react-chessboard` — React chessboard component; MIT. https://github.com/Clariity/react-chessboard

**[S15]** Lichess Open Database — games, puzzles, evaluations and other exports under CC0. https://database.lichess.org/

**[S16]** Lichess `chess-openings` — aggregated opening-name dataset; CC0. https://github.com/lichess-org/chess-openings

**[S17]** Lichess Opening Explorer / API documentation. https://github.com/lichess-org/lila-openingexplorer and https://github.com/lichess-org/api/blob/master/doc/specs/lichess-api.yaml

**[S18]** Lichess Tablebase server — Syzygy HTTP API. https://github.com/lichess-org/lila-tablebase

**[S19]** Lichess API Tips — one request at a time; on HTTP 429 wait one full minute. https://lichess.org/page/api-tips

**[S20]** Chess.com Help Center. PubAPI — read-only REST API for public player/game/tournament data. https://support.chess.com/en/articles/9650547-what-is-the-pubapi-and-how-do-i-use-it

**[S21]** CSSLab. Maia-3 — human-like chess move prediction engine / UCI model family, 2026; AGPL-3.0. https://github.com/CSSLab/maia3

**[S22]** Lichess Chessground — GPL-3.0; README explicitly describes GPL requirement for combined website work. https://github.com/lichess-org/chessground

---

## 26. Conclusão

A maior oportunidade não é reproduzir um “Chess.com gratuito”. É construir um **sistema operacional de treino**: recursos abertos já são fortes o bastante; falta juntá-los numa sequência pedagógica que aprende com o jogador.

Para um usuário em torno de 1100, a primeira versão deve ser especialmente agressiva em reduzir erros simples, melhorar reconhecimento de padrões, criar disciplina de cálculo e transformar as próprias partidas em material de estudo. Aberturas entram, mas como repertório estreito e compreensão de planos; finais entram como técnicas testáveis; Stockfish serve como instrumento de diagnóstico, não como professor por si só.

Se o LanceZero mantiver esse princípio, ele pode reunir em uma interface própria aquilo que hoje está espalhado entre engine, puzzles, análise, tablebase, opening explorer, banco de partidas e repetição espaçada — sem depender de assinatura ou API de IA paga para o núcleo do produto.

---

## Apêndice A — Ferramentas gratuitas adicionais para benchmark e pesquisa

Nem toda ferramenta gratuita deve virar dependência do site. Algumas são mais valiosas como referência de UX, fonte de ideias ou utilitário de desenvolvimento.

| Ferramenta | O que oferece gratuitamente | O que aprender / possível uso |
|---|---|---|
| **Lichess** | jogo, puzzles ilimitados, análise, estudos, opening explorer, tablebases | benchmark principal de ecossistema gratuito; integrar dados/APIs públicas onde adequado |
| **ChessTempo** | táticas ilimitadas na camada gratuita, repertório de abertura limitado, game database e recursos de treino; parte dos recursos avançados é premium | ótimo benchmark de taxonomia tática, rating de puzzles e treinamento especializado; não depender de seus dados proprietários |
| **Lucas Chess** | GUI livre com muitos modos de treino, jogo contra engines, elo contra engines, edição e utilitários | inspiração para diversidade de drills e sparring offline |
| **Scid** | banco de partidas livre, pesquisa em milhões de jogos, análise com UCI/WinBoard | referência para pesquisa de partidas/posições e workflows de banco PGN |
| **Scid vs. PC** | fork/toolkit de banco de xadrez; versão 4.27 publicada em junho de 2026 | referência moderna de database + opening trainer; ferramenta auxiliar para curadoria |
| **ChessX** | banco PGN livre, busca por texto/posição, árvores de lances, UCI/WinBoard, preparação de abertura, training mode | referência de UX para biblioteca de partidas e “guess the next move” |
| **Leela Chess Zero (Lc0)** | engine neural UCI, open source GPLv3 | alternativa de análise/pesquisa; não recomendada como engine web padrão por peso/complexidade |
| **Maia-3** | engine/modelos de previsão de jogadas humanas por nível | futura camada de sparring humanoide e análise “o que um jogador desta faixa provavelmente faria” |
| **Stockfish desktop** | engine UCI gratuita e extremamente forte | ferramenta de validação dos resultados do build WASM durante desenvolvimento |

### Notas atuais verificadas

- A camada gratuita do ChessTempo informa táticas ilimitadas e mais de 110 mil problemas no quadro de membership, enquanto recursos como maior volume de finais e ferramentas avançadas continuam segmentados por plano: https://mobileapp.chesstempo.com/memberships/
- O repositório Lucas Chess R descreve treino em diversos formatos, jogo contra engines UCI e competição por Elo: https://github.com/lukasmonk/lucaschessR2
- Scid se apresenta como banco livre/GPL para milhões de partidas, preparação e engines UCI/WinBoard: https://scid.sourceforge.net/
- Scid vs. PC 4.27 tem distribuição datada de 25 de junho de 2026: https://sourceforge.net/projects/scidvspc/files/
- ChessX é um banco livre multiplataforma com PGN, busca de posição, árvores e análise UCI: https://github.com/Isarhamster/chessx
- Lc0 é um engine neural UCI open source sob GPLv3: https://github.com/LeelaChessZero/lc0

### Decisão de produto decorrente

O LanceZero não precisa “absorver tudo”. O melhor recorte é:

- **integrar:** Stockfish, puzzles/dados CC0, opening explorer, tablebase, importadores e FSRS;
- **reimplementar com identidade própria:** currículo, daily planner, análise orientada, skill graph, geração de treino a partir de erros;
- **usar como benchmark:** Lucas Chess, Scid/Scid vs. PC, ChessX e ChessTempo;
- **adiar:** Lc0/Maia até o loop pedagógico principal estar validado.
