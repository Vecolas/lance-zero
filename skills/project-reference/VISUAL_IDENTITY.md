# LanceZero — Guia de Identidade Visual e Design System

## 1. Propósito da identidade

A identidade visual do **LanceZero** deve comunicar quatro ideias centrais:

1. **Clareza** — a plataforma existe para organizar o aprendizado de xadrez, não para sobrecarregar o usuário.
2. **Inteligência** — o visual deve remeter a análise, estratégia, precisão e progresso.
3. **Modernidade** — aparência de produto digital atual, próxima de ferramentas SaaS premium, sem parecer um site clássico de xadrez.
4. **Acessibilidade** — o ambiente deve ser confortável para sessões longas de treino, estudo e análise.

O LanceZero não deve parecer:
- um cassino;
- um site de e-sports agressivo;
- um clube de xadrez antigo;
- um dashboard corporativo genérico;
- uma cópia visual de Chess.com ou Lichess.

A experiência deve ser **clean, técnica, elegante e focada**.

---

# 2. Conceito central da marca

## Símbolo

O símbolo principal é:

> **um peão de xadrez envolvido pelo número 0.**

O “0” representa:
- LanceZero;
- ponto inicial;
- recomeço;
- melhoria contínua;
- ciclo de treino;
- análise → aprendizado → nova partida.

O peão representa:
- o jogador em evolução;
- a peça mais básica do jogo;
- potencial de transformação;
- progressão até a promoção.

A relação visual entre o peão e o zero deve ser inseparável.

O símbolo deve funcionar sozinho como:
- favicon;
- avatar;
- ícone do aplicativo;
- loading screen;
- marca d’água;
- indicador de usuário sem foto;
- selo de conclusão.

---

# 3. Personalidade visual

Palavras-chave:

**clean**
**preciso**
**inteligente**
**calmo**
**moderno**
**analítico**
**progressivo**
**premium**
**tecnológico**
**minimalista**

Evitar:

- excesso de brilhos;
- neon forte;
- cyberpunk;
- dourado clássico;
- madeira;
- textura medieval;
- ornamentos;
- excesso de sombras;
- glassmorphism exagerado;
- gradientes em todos os componentes;
- ilustrações infantis.

---

# 4. Paleta principal

## 4.1. Cor de fundo clara

### Background Primary
`#F7F9FB`

Uso:
- fundo principal da aplicação;
- páginas de estudo;
- dashboards;
- telas de análise.

### Background Pure
`#FFFFFF`

Uso:
- cards;
- modais;
- tooltips;
- áreas elevadas.

### Background Secondary
`#EEF3F7`

Uso:
- blocos secundários;
- divisores;
- áreas de navegação;
- fundos discretos.

---

# 5. Cores escuras

## Navy 950
`#071521`

Uso:
- títulos;
- texto principal;
- sidebar em modo escuro;
- partes principais da logo.

## Navy 900
`#0B1D2C`

Uso:
- textos fortes;
- fundos escuros;
- peças escuras.

## Navy 800
`#112B40`

Uso:
- elementos secundários;
- bordas escuras;
- estados hover.

## Slate 600
`#596B78`

Uso:
- texto secundário.

## Slate 400
`#91A0AA`

Uso:
- labels;
- informações auxiliares;
- placeholders.

---

# 6. Cor de destaque

A cor de destaque do LanceZero é um **azul-ciano frio**, utilizado para indicar:

- progresso;
- ação;
- análise;
- seleção;
- movimento;
- melhoria.

## Zero Blue
`#00A9D6`

Cor principal de destaque.

## Zero Cyan
`#20C9E8`

Uso:
- highlights;
- pequenos gradientes;
- estados ativos.

## Zero Deep
`#087DA7`

Uso:
- hover;
- elementos com contraste;
- gráficos.

## Zero Soft
`#D9F4FA`

Uso:
- fundos de estados ativos;
- seleção;
- feedback positivo neutro.

---

# 7. Gradiente da marca

Gradiente reservado principalmente à **logo** e elementos de alto destaque.

```css
linear-gradient(
  135deg,
  #087DA7 0%,
  #00A9D6 45%,
  #20C9E8 100%
)
```

Não utilizar o gradiente indiscriminadamente.

Permitido:
- logo;
- botão CTA principal ocasional;
- gráfico principal;
- indicador de progresso importante;
- hero section;
- badges especiais.

Evitar:
- todos os botões;
- cards;
- inputs;
- textos longos;
- bordas.

---

# 8. Cores semânticas

## Sucesso
`#18A572`

Uso:
- resposta correta;
- tarefa concluída;
- melhoria confirmada.

## Atenção
`#E5A82B`

Uso:
- imprecisão;
- posição crítica;
- recomendação.

## Erro
`#D9534F`

Uso:
- blunder;
- resposta incorreta;
- erro de formulário.

## Informação
`#3A8DDE`

Uso:
- dicas;
- explicações;
- informações de sistema.

Não utilizar vermelho como cor de “perda” em excesso.
O site deve ensinar sem punir visualmente o jogador.

---

# 9. Tipografia

A tipografia deve ser geométrica, moderna e altamente legível.

Famílias recomendadas:

### Principal
**Inter**

Alternativas:
- Geist
- Manrope
- Plus Jakarta Sans

Para implementação web:

```css
font-family:
  Inter,
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

---

# 10. Hierarquia tipográfica

## Display
Hero / telas principais:

- 48–64 px desktop
- 36–42 px tablet
- 30–36 px mobile
- Weight: 650–750

## H1
32–40 px  
Weight: 650–700

## H2
24–30 px  
Weight: 600–700

## H3
18–22 px  
Weight: 600

## Body
15–17 px  
Weight: 400–450

## Small
13–14 px

## Caption
11–12 px

Evitar fontes ultrafinas.

---

# 11. Wordmark LanceZero

O nome deve ser escrito:

**LanceZero**

Nunca:
- Lance Zero
- lancezero
- LANCEZERO
- lanceZero

Quando possível:

- “Lance” em Navy;
- “Zero” em Zero Blue.

Exemplo:

**Lance** + **Zero**

O contraste entre as duas palavras reforça a identidade.

---

# 12. Logo

## Estrutura

A logo principal contém:

1. símbolo “0 + peão”;
2. wordmark “LanceZero”.

Versões obrigatórias:

- horizontal;
- vertical;
- somente símbolo;
- monocromática;
- branca para fundo escuro;
- escura para fundo claro.

---

# 13. Área de proteção

Nenhum elemento deve tocar a logo.

A margem mínima ao redor deve equivaler aproximadamente a:

> **50% da largura da cabeça do peão.**

Não aproximar:
- texto;
- botão;
- borda;
- card;
- ilustração.

---

# 14. Tamanho mínimo

## Logo completa
mínimo recomendado:
`120 px`

## Símbolo
mínimo recomendado:
`24 px`

Para favicon:
- usar versão simplificada;
- remover detalhes pequenos;
- priorizar contorno do zero + silhueta do peão.

---

# 15. Uso incorreto da logo

Nunca:

- rotacionar;
- deformar;
- alterar proporções;
- trocar o peão por outra peça;
- adicionar sombra pesada;
- adicionar glow neon;
- contornar a logo;
- usar gradientes aleatórios;
- colocar em fundos visualmente poluídos;
- colocar texto dentro do símbolo;
- usar o símbolo como um “O” comum em parágrafos.

---

# 16. Grid e espaçamento

Utilizar escala de 4 px.

Tokens:

```text
4
8
12
16
20
24
32
40
48
64
80
96
```

O espaçamento padrão deve ser generoso.

Evitar interfaces apertadas.

---

# 17. Layout principal

Desktop recomendado:

```text
Sidebar: 232–256px
Conteúdo: max-width 1440px
Padding horizontal: 24–40px
Gap entre áreas: 24px
```

Telas de estudo podem utilizar largura menor:

```text
max-width: 1180px
```

Telas de leitura:

```text
max-width: 760–860px
```

---

# 18. Bordas

A interface deve utilizar bordas discretas.

```css
border: 1px solid #E3E9ED;
```

No dark mode:

```css
border: 1px solid #1E3444;
```

Evitar bordas muito fortes.

---

# 19. Border radius

O LanceZero utiliza cantos levemente arredondados.

Tokens:

```text
6px  — elementos pequenos
8px  — botões e inputs
12px — cards
16px — cards grandes / modais
```

Evitar:
- pill shape em tudo;
- radius de 30–40px em cards grandes.

---

# 20. Sombras

Sombras devem ser sutis.

Card:

```css
box-shadow:
  0 1px 2px rgba(7, 21, 33, 0.03),
  0 6px 18px rgba(7, 21, 33, 0.05);
```

Modal:

```css
box-shadow:
  0 20px 50px rgba(7, 21, 33, 0.14);
```

Não utilizar sombras pretas pesadas.

---

# 21. Cards

Estrutura:

```text
Título
Descrição opcional
Conteúdo
Ação / status
```

Visual:

```text
Background: #FFFFFF
Border: #E3E9ED
Radius: 12px
Padding: 20–24px
```

Cards devem parecer áreas de informação, não botões gigantes.

---

# 22. Botões

## Primary

```text
Background: Zero Blue
Text: White
Radius: 8px
```

Hover:
`Zero Deep`

---

## Secondary

```text
Background: White
Border: #D9E2E8
Text: Navy 900
```

---

## Ghost

Sem fundo.

Uso:
- ações secundárias;
- menu;
- toolbar.

---

## Destructive

Somente para ações realmente destrutivas.

Não usar vermelho para “errou o puzzle”.

---

# 23. Ícones

Estilo:

- outline;
- geométrico;
- stroke de 1.5–2 px;
- cantos levemente arredondados;
- sem preenchimentos excessivos.

Bibliotecas recomendadas:
- Lucide;
- Phosphor.

Evitar misturar múltiplos estilos de ícones.

---

# 24. Linguagem de movimento

Setas são parte importante da identidade.

Podem representar:

- jogadas;
- progresso;
- cálculo;
- linhas de análise;
- aprendizado.

Visual:

```text
stroke: Zero Blue
stroke-width: 2–3px
rounded caps
```

Setas secundárias:
`Slate 400`

Setas críticas:
`Attention`

Evitar:
- arco-íris de setas;
- glow neon;
- espessuras exageradas.

---

# 25. Tabuleiro

O tabuleiro é o centro funcional do produto.

Deve parecer integrado ao LanceZero.

## Tema claro

Casa clara:
`#EDF3F6`

Casa escura:
`#AFC6D1`

Alternativa mais contrastante:

Casa clara:
`#E8EEF2`

Casa escura:
`#8FABB9`

---

# 26. Estados do tabuleiro

## Último movimento

```text
#C8EDF5
```

## Casa selecionada

```text
#7FD7E8
```

## Movimento possível

Utilizar:
- círculo discreto;
- Zero Blue com 35–50% opacity.

## Captura possível

Utilizar:
- anel;
- nunca preencher completamente a casa.

---

# 27. Engine e avaliação

A engine não deve dominar visualmente a tela.

Barra de avaliação:

Brancas:
`#F4F6F8`

Pretas:
`#102331`

Linha de destaque:
`Zero Blue`

Números devem ser discretos.

---

# 28. Classificação dos lances

Categorias sugeridas:

### Excelente
Zero Blue

### Bom
Success

### Imprecisão
Attention

### Erro
Orange / Attention dark

### Blunder
Error

Evitar copiar diretamente nomenclaturas ou símbolos visuais de plataformas concorrentes.

Criar iconografia própria.

---

# 29. Puzzles

A interface de puzzles deve priorizar:

1. tabuleiro;
2. instrução;
3. feedback;
4. explicação.

Nunca colocar:
- rankings;
- estatísticas;
- streak;
- cronômetro;

acima do objetivo educacional principal.

Esses elementos podem existir, mas visualmente secundários.

---

# 30. Feedback correto

Quando o jogador acertar:

- pequeno highlight verde;
- animação curta;
- texto objetivo.

Exemplo:

> Boa. Você identificou a peça indefesa.

Evitar:
- confete excessivo;
- explosões;
- gamificação infantil.

---

# 31. Feedback incorreto

Erro deve ser apresentado como informação.

Visual:

- highlight vermelho discreto;
- explicação imediatamente disponível.

Exemplo:

> Essa jogada permite ...Qxd4.  
> Antes de mover, verifique peças sem defesa.

O design deve comunicar:

> “descobrimos algo para treinar”

e não:

> “você falhou”.

---

# 32. Dashboard

O dashboard deve responder rapidamente:

### O que devo fazer hoje?

Elemento principal:

> **Treino de hoje**

Exemplo:

```text
TREINO DE HOJE

38 min

Tática           12 min
Cálculo           8 min
Revisão           6 min
Partida analisada 7 min
Final             5 min

[Começar treino]
```

Essa área deve possuir maior prioridade visual.

---

# 33. Indicadores de habilidade

Utilizar barras simples.

Exemplo:

```text
Tática        ███████░░░
Cálculo       █████░░░░░
Aberturas     ██████░░░░
Finais        ████░░░░░░
```

Zero Blue indica domínio.

Background:
`Background Secondary`

---

# 34. Visualização de progresso

Preferir:

- linha;
- barras;
- radar somente quando útil;
- heatmap discreto.

Evitar dashboards cheios de gráficos sem valor pedagógico.

Cada gráfico deve responder uma pergunta.

---

# 35. Hero da homepage

Visual recomendado:

lado esquerdo:
- título;
- descrição;
- CTA.

lado direito:
- ilustração;
- tabuleiro;
- cards de análise;
- logo.

Exemplo:

```text
Treine o que perde
suas partidas.

O LanceZero transforma seus erros
em um plano personalizado de estudo.

[Começar gratuitamente]
```

---

# 36. Elementos gráficos de fundo

Permitidos:

- fragmentos de tabuleiro;
- curvas;
- linhas;
- setas;
- nós;
- peças desfocadas;
- diagramas minimalistas;
- pequenos gráficos.

Opacity:

`3–12%`

Eles devem compor a atmosfera sem competir com conteúdo.

---

# 37. Fotografia e 3D

Podem ser utilizados somente em:

- landing page;
- publicidade;
- social cards.

Estilo:

- iluminação fria;
- fundo limpo;
- peças de xadrez;
- profundidade de campo;
- navy + cyan.

Dentro da aplicação principal, preferir UI plana.

---

# 38. Dark mode

Dark mode não deve ser preto absoluto.

## Background
`#07131C`

## Surface
`#0C1C28`

## Card
`#102331`

## Border
`#1D3443`

## Text
`#F1F5F7`

## Secondary text
`#A2B2BC`

## Accent
`#20C9E8`

---

# 39. Sidebar

Desktop:

```text
Logo
────────────
Hoje
Treinar
Puzzles
Partidas
Aberturas
Finais
────────────
Progresso
Biblioteca
────────────
Perfil
Configurações
```

Item ativo:

```text
background: Zero Soft
color: Zero Deep
```

Ícone + texto.

---

# 40. Navbar

Altura:
`56–64px`

Visual:
- clean;
- sem sombra pesada;
- border-bottom discreta.

---

# 41. Inputs

Altura:
`40–44px`

Radius:
`8px`

Border:
`#D9E2E8`

Focus:

```css
border-color: #00A9D6;
box-shadow: 0 0 0 3px rgba(0,169,214,.12);
```

---

# 42. Tooltips

Background:
`Navy 950`

Text:
`White`

Radius:
`6px`

Sem sombras exageradas.

---

# 43. Modais

Usar apenas quando necessário.

Preferir:
- drawers;
- side panels;

para análise de posição.

Isso permite manter o tabuleiro visível.

---

# 44. Motion design

Animações:

```text
120–220ms
ease-out
```

Permitido:
- fade;
- scale mínimo;
- slide curto;
- progress fill.

Evitar:
- bounce;
- spring excessivo;
- elementos voando.

---

# 45. Loading

Utilizar símbolo do LanceZero.

Opções:

1. zero girando lentamente;
2. destaque percorrendo o contorno;
3. peão surgindo no centro.

Evitar spinner genérico sempre que possível.

---

# 46. Ilustrações educacionais

Estilo:

- vetorial;
- geométrico;
- minimalista;
- poucos elementos;
- sem personagens cartoon.

Tema recorrente:

```text
peão → análise → progresso
```

---

# 47. Gamificação

Gamificação deve existir sem tornar a plataforma infantil.

Permitido:
- sequência de estudo;
- metas;
- XP;
- níveis;
- medalhas discretas;
- evolução de rating;
- skill score.

Visual:

- minimalista;
- sem moedas douradas;
- sem baús;
- sem efeitos de cassino.

---

# 48. Conquistas

Badges:

- circulares ou hexagonais simples;
- uma cor principal;
- pequeno ícone.

Exemplos:

```text
100 puzzles
10 partidas analisadas
7 dias de treino
Finalista
Tático
Calculista
```

---

# 49. Voz visual da marca

A interface deve transmitir:

> “Há um plano.”

> “Seus erros têm padrões.”

> “Podemos trabalhar nesses padrões.”

> “Você está melhorando.”

Não transmitir:

> “Você precisa jogar mais.”

> “Você precisa comprar alguma coisa.”

> “Você está atrás dos outros.”

---

# 50. Tokens CSS recomendados

```css
:root {

  --lz-bg: #F7F9FB;
  --lz-bg-secondary: #EEF3F7;
  --lz-surface: #FFFFFF;

  --lz-navy-950: #071521;
  --lz-navy-900: #0B1D2C;
  --lz-navy-800: #112B40;

  --lz-slate-600: #596B78;
  --lz-slate-400: #91A0AA;

  --lz-blue: #00A9D6;
  --lz-cyan: #20C9E8;
  --lz-blue-deep: #087DA7;
  --lz-blue-soft: #D9F4FA;

  --lz-success: #18A572;
  --lz-warning: #E5A82B;
  --lz-error: #D9534F;
  --lz-info: #3A8DDE;

  --lz-border: #E3E9ED;

  --lz-radius-sm: 6px;
  --lz-radius-md: 8px;
  --lz-radius-lg: 12px;
  --lz-radius-xl: 16px;

}
```

---

# 51. Tailwind — referência

Sugestão:

```js
colors: {

  lancezero: {

    bg: "#F7F9FB",

    navy: {
      950: "#071521",
      900: "#0B1D2C",
      800: "#112B40"
    },

    blue: {
      DEFAULT: "#00A9D6",
      light: "#20C9E8",
      dark: "#087DA7",
      soft: "#D9F4FA"
    }

  }

}
```

---

# 52. Prioridade visual

Toda tela deve possuir:

### 1 elemento primário
ação principal.

### 2–4 elementos secundários
informações ou controles.

Todo o restante deve ser terciário.

Se tudo chama atenção, nada chama atenção.

---

# 53. Regra de densidade

O LanceZero deve parecer:

**70% informação**
**30% espaço vazio**

O espaço vazio é parte da identidade.

Não tentar preencher todos os espaços disponíveis.

---

# 54. Responsividade

Mobile não deve ser apenas “desktop comprimido”.

Prioridades:

1. tabuleiro;
2. ação;
3. explicação.

Painéis secundários tornam-se:

- drawer;
- accordion;
- tabs.

---

# 55. Acessibilidade

Contraste mínimo:
WCAG AA.

Não comunicar informação apenas por cor.

Exemplo:

Erro:

❌ somente vermelho.

Correto:

🔴 cor + ícone + texto.

---

# 56. Som

Se houver áudio:

- muito discreto;
- opcional;
- volume baixo.

Exemplos:
- movimento;
- captura;
- conclusão.

Nunca utilizar sons de cassino.

---

# 57. Imagens da identidade

As artes produzidas para o projeto estabelecem a seguinte direção:

### Logo principal

Peão escuro centralizado dentro de um zero formado por curvas azul/ciano e navy.

### Ícone

Somente:
`0 + peão`

### Hero claro

- fundo branco;
- tabuleiro muito claro;
- elementos analíticos;
- setas azuis;
- peças desfocadas.

### Hero escuro

- fundo navy;
- iluminação azul;
- logo central;
- peças em profundidade.

Ambos pertencem à mesma identidade.

---

# 58. Diretriz para geração de novas artes

Ao gerar novas artes por IA, utilizar aproximadamente:

> clean modern chess learning platform, premium SaaS design, minimalist,
> stylized chess pawn wrapped by number zero, navy charcoal and cyan blue,
> white and soft gray backgrounds, subtle chess board geometry,
> analytical interface, strategic arrows, modern sans serif,
> spacious layout, elegant and intelligent, no medieval aesthetic,
> no gold, no casino, no aggressive esports aesthetic

---

# 59. Diretriz para Claude Code

Ao criar qualquer componente novo, verificar:

### 1.
O componente utiliza os tokens de cores existentes?

### 2.
Existe apenas uma ação primária clara?

### 3.
O espaçamento segue a escala de 4px?

### 4.
O border radius segue o design system?

### 5.
A cor azul está sendo usada como destaque e não decoração?

### 6.
Há espaço em branco suficiente?

### 7.
A hierarquia tipográfica está clara?

### 8.
O componente funciona em light e dark mode?

### 9.
O visual continua parecendo LanceZero mesmo sem a logo?

Se a resposta for “não” para vários itens, revisar o componente.

---

# 60. Regra definitiva de consistência

O LanceZero deve ser reconhecível mesmo quando a logo não aparece.

Isso ocorre através da combinação:

```text
navy
+
cyan
+
fundos claros
+
grid limpo
+
setas estratégicas
+
tabuleiro discreto
+
tipografia geométrica
+
espaçamento amplo
+
feedback educacional
```

A identidade não depende apenas do símbolo.

Ela deve existir em toda a interface.

---

# 61. Resumo rápido para implementação

## Brand

```text
Nome: LanceZero
Símbolo: peão dentro/envolvido por zero
Personalidade: clean + inteligente + analítica
```

## Paleta

```text
Navy: #071521
Blue: #00A9D6
Cyan: #20C9E8
Background: #F7F9FB
Surface: #FFFFFF
```

## Componentes

```text
Cards: radius 12
Buttons: radius 8
Inputs: radius 8
Border: #E3E9ED
```

## Tipografia

```text
Inter
```

## Estética

```text
minimal
clean
spacious
premium
analytical
```

## Evitar

```text
casino
medieval
excessive neon
visual clutter
generic chess website
aggressive esports design
```

---

# 62. Princípio final

Toda decisão visual deve reforçar a mesma mensagem:

> **O LanceZero encontra o que impede o jogador de evoluir e transforma isso em um caminho claro de melhoria.**

A interface deve, portanto, parecer menos uma coleção de ferramentas de xadrez e mais um **sistema inteligente de aprendizado pessoal**.
