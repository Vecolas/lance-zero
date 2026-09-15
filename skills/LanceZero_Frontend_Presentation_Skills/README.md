# LanceZero — Frontend Presentation Skills Pack

Pacote complementar ao conjunto de skills do LanceZero, focado exclusivamente em qualidade de apresentação, consistência visual e experiência de aprendizado no frontend.

## O que este pacote resolve

As regras anteriores já definiam identidade visual e pedagogia, mas o produto cresceu:

- Hoje deixou de ser uma sessão linear e passou a ser uma lista de atividades independentes;
- Treino virou um hub de Aprender / Praticar / Revisar / Cálculo / Currículo;
- Aberturas passaram a ter biblioteca com mini-tabuleiros, página própria, modo Aprender e modo Treinar;
- Finais passaram a usar reconhecimento de posição, princípios e play-out, não “linhas de abertura”;
- mais conteúdo textual passou a coexistir com tabuleiros, painéis, tabs, feedback e progresso.

Isso exige regras explícitas para evitar:

- títulos vagos;
- espaçamento inconsistente;
- cards com alturas artificiais;
- textos se sobrepondo;
- tabs espremidas;
- painel lateral ocupando espaço demais;
- tabuleiro pequeno demais;
- mobile tratado como desktop comprimido;
- uso excessivo de cor;
- feedback visual inconsistente;
- componentes duplicados com estilos diferentes;
- regressões visuais silenciosas.

## Skills incluídas

1. `lancezero-design-system` — versão 2.0 da skill visual; substitui a versão anterior.
2. `lancezero-page-composition` — estrutura, hierarquia e layouts por página.
3. `lancezero-learning-interface` — apresentação dos modos Aprender, Praticar, Revisar e Diagnóstico.
4. `lancezero-chessboard-interface` — composição visual ao redor do tabuleiro, mini-tabuleiros, comentários e treino.
5. `lancezero-responsive-accessibility` — responsividade, reflow, teclado, foco, contraste e touch.
6. `lancezero-visual-quality-gate` — testes visuais, conteúdo extremo, screenshots e critérios de aceite.

## Instalação

Copiar a pasta `.claude/skills/` para a raiz do repositório do LanceZero.

A skill `lancezero-design-system` deste pacote possui o mesmo nome da versão antiga de propósito: ela deve **substituir** a versão antiga.

Estrutura final:

```text
lancezero/
├─ .claude/
│  └─ skills/
│     ├─ lancezero-design-system/
│     ├─ lancezero-page-composition/
│     ├─ lancezero-learning-interface/
│     ├─ lancezero-chessboard-interface/
│     ├─ lancezero-responsive-accessibility/
│     └─ lancezero-visual-quality-gate/
└─ ...
```

## Precedência

Para apresentação do frontend:

1. decisão explícita mais recente;
2. estas skills;
3. guia visual do LanceZero;
4. planos definitivos de aprendizado, aberturas e finais;
5. design legado.

Para lógica pedagógica ou de domínio, as skills anteriores de learning-engine/chess-domain continuam sendo a fonte apropriada.

## Regra geral

Uma tela LanceZero deve continuar clara quando:

- o usuário aumenta texto;
- o título tem o dobro do tamanho esperado;
- a tradução possui palavras longas;
- o viewport cai para mobile;
- um card tem descrição de três linhas;
- o usuário conclui várias atividades;
- o tabuleiro precisa dividir espaço com comentários;
- nenhuma animação é executada.

Não “corrigir” esses casos escondendo conteúdo com `overflow: hidden`.
