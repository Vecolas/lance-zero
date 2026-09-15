# Fundamentação do pacote

## Estrutura semântica

W3C WAI recomenda estruturar páginas com landmarks e headings que reflitam a organização visual, permitindo navegação eficiente por tecnologias assistivas. Headings devem representar a hierarquia real do conteúdo e evitar saltos desnecessários.

Fontes:
- https://www.w3.org/WAI/tutorials/page-structure/
- https://www.w3.org/WAI/tutorials/page-structure/headings/
- https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/

## Reflow e responsividade

WCAG 2.1/2.2 exige, para conteúdo normal, reflow sem perda de informação ou funcionalidade em largura equivalente a 320 CSS px, com exceções para componentes cujo significado exige duas dimensões.

No LanceZero, o tabuleiro é naturalmente bidimensional, mas o restante da página — textos, comentários, controles, cards, navegação — deve reflowar.

Fonte:
- https://www.w3.org/WAI/standards-guidelines/wcag/new-in-21/

## Touch targets

WCAG 2.2 adiciona Target Size (Minimum), com referência de 24×24 CSS px ou espaçamento suficiente. O pacote utiliza isso como piso de conformidade e recomenda alvos maiores para controles primários do produto.

Fonte:
- https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/

## Contraste e cor

Texto comum deve atingir 4.5:1; texto grande pode usar 3:1 nas condições aplicáveis. Componentes e indicadores visuais relevantes também precisam de contraste suficiente. Estado não deve depender apenas de cor.

Fontes:
- https://www.w3.org/WAI/test-evaluate/preliminary/
- https://www.w3.org/WAI/curricula/designer-modules/visual-design/

## Títulos e escrita

WAI recomenda títulos de página informativos e únicos, headings que transmitam estrutura, instruções claras e texto conciso.

Fonte:
- https://www.w3.org/WAI/tips/writing/

## Layout shift

Next.js recomenda `next/font` e `next/image`/dimensões conhecidas para reduzir layout shift. Isso importa no LanceZero porque logo, ilustrações, mini-tabuleiros e áreas de conteúdo não devem empurrar o restante da interface depois do carregamento.

Fonte:
- https://nextjs.org/learn/dashboard-app/optimizing-fonts-images

## QA visual

Playwright suporta:
- `toHaveScreenshot()` para comparação visual;
- snapshots da árvore de acessibilidade com `toMatchAriaSnapshot()`;
- comparação em ambiente estável;
- screenshots de elementos e páginas.

Fontes:
- https://playwright.dev/docs/test-snapshots
- https://playwright.dev/docs/aria-snapshots

## Tradução em regras de produto

A fundamentação acima virou regras específicas:
- hierarquia de títulos previsível;
- landmarks estáveis;
- nenhuma informação dependente só de cor;
- tabs e ações com labels claros;
- mobile não é desktop comprimido;
- conteúdo não deve sobrepor tabuleiro;
- largura mínima deve preservar funcionalidade;
- cards não devem depender de altura fixa para parecer alinhados;
- visual-regression tests são obrigatórios nas páginas estruturais.
