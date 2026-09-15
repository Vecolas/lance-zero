# Pesquisa — Set de Skills para o LanceZero

## Resultado da pesquisa

A melhor estrutura para o LanceZero é um conjunto pequeno de skills especializadas, de projeto, em vez de uma única skill enorme ou dezenas de micro-skills.

O formato oficial atual de Agent Skills usa um diretório por skill com `SKILL.md`. `name` e `description` são obrigatórios; supporting files podem viver em `references/`, `examples/`, `scripts/` e `assets/`.

A documentação e os exemplos oficiais do ecossistema Anthropic recomendam **progressive disclosure**:
- metadata sempre no contexto;
- corpo do `SKILL.md` quando acionado;
- references apenas sob demanda;
- scripts podem executar sem consumir o mesmo volume de contexto.

O skill-creator oficial recomenda manter `SKILL.md` idealmente abaixo de ~500 linhas e mover detalhes para references. O plugin-dev usa o mesmo padrão.

## Por que apenas 10 custom skills

Um pacote muito grande cria:
- descrições concorrendo pelo roteamento;
- sobreposição de triggers;
- mais contexto permanente;
- manutenção difícil.

Há inclusive histórico de plugin da Vercel contendo um volume excessivo de skills e estourando orçamento de descrições no Claude Code. Portanto a arquitetura deste pacote é deliberadamente compacta.

## O que não foi duplicado

Capacidades genéricas são melhores atendidas por plugins já existentes:
- security-guidance;
- feature-dev;
- frontend-design;
- code-review;
- Playwright;
- Vercel.

As skills customizadas codificam somente conhecimento específico do LanceZero.

## Pesquisa técnica aplicada às skills

### Segurança

A recomendação de `Clerk + Supabase + RLS` foi preservada porque:
- Clerk possui integração oficial com Supabase;
- Supabase aceita Clerk como third-party auth;
- RLS pode limitar dados pelo `sub` do token;
- segurança não depende apenas de middleware/Proxy.

O release de segurança do Next.js de maio de 2026 corrigiu classes como:
- auth bypass em middleware/proxy;
- SSRF;
- cache poisoning;
- XSS.

Consequentemente, a skill de segurança proíbe usar Proxy como única fronteira de autorização.

### Stockfish

`stockfish.js` atual oferece Stockfish 18 em cinco builds. O próprio projeto recomenda, para a maioria dos sites, o build **lite single-threaded**, pequeno e sem a configuração complexa exigida pelo multi-thread.

Builds multi-thread dependem de condições que habilitam memória compartilhada; navegadores exigem cross-origin isolation para `SharedArrayBuffer`, normalmente com COOP/COEP.

### Regras de xadrez

`chess.js` é TypeScript e cobre:
- move generation/validation;
- FEN;
- PGN;
- check/checkmate/draw state.

Ele não substitui engine de análise, por isso regras e Stockfish ficam em skills separadas.

### Tabuleiro

`react-chessboard` é um componente React responsivo com drag-and-drop, customização, eventos, mobile, TypeScript e suporte de acessibilidade. A skill de design o trata como view; regras permanecem no domínio.

### Repetição espaçada

`ts-fsrs` implementa FSRS em TypeScript e separa preview de resultados (`repeat`) da aplicação efetiva de uma nota (`next`). A skill pedagógica mantém FSRS como scheduler, não como modelo inteiro de habilidade.

### Pedagogia

A pesquisa que embasa o produto continua coerente:
- estudo sério/deliberado foi forte preditor de habilidade em estudo com enxadristas;
- retrieval practice melhora retenção;
- distributed/spaced practice possui suporte meta-analítico;
- worked examples são especialmente úteis para novatos quando bem escolhidos;
- o LanceZero deve fazer orientação diminuir conforme domínio aumenta.

### Lichess

O produto deve tratar Lichess como integração externa, não dependência de boot. Em 2026 o changelog indicou mudança nos endpoints de Opening Explorer, incluindo autenticação. Adapters, cache e fallback são obrigatórios.

## Fontes principais

### Agent Skills / Claude Code
- Anthropic Skills repository: https://github.com/anthropics/skills
- Skill Creator: https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md
- Claude Code plugin-dev: https://github.com/anthropics/claude-code/tree/main/plugins/plugin-dev
- Plugin structure: https://github.com/anthropics/claude-code/blob/main/plugins/plugin-dev/skills/plugin-structure/SKILL.md
- Official plugins directory: https://github.com/anthropics/claude-plugins-official

### Segurança / hosting
- Next.js data security: https://nextjs.org/docs/app/guides/data-security
- Vercel security release May 2026: https://vercel.com/changelog/next-js-may-2026-security-release
- Vercel headers: https://vercel.com/docs/headers
- Vercel WAF: https://vercel.com/security/web-application-firewall
- Clerk + Supabase: https://clerk.com/docs/guides/development/integrations/databases/supabase
- Supabase Clerk third-party auth: https://supabase.com/docs/guides/auth/third-party/clerk
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security

### Xadrez
- Stockfish.js: https://github.com/nmrugg/stockfish.js
- chess.js: https://github.com/jhlywa/chess.js
- react-chessboard: https://github.com/Clariity/react-chessboard
- ts-fsrs: https://github.com/open-spaced-repetition/ts-fsrs
- Lichess API: https://lichess.org/api
- Lichess database: https://database.lichess.org/
- Lichess changelog: https://lichess.org/changelog

### Aprendizagem
- Charness et al., deliberate practice in chess:
  https://onlinelibrary.wiley.com/doi/10.1002/acp.1106
- Roediger & Karpicke, testing effect:
  https://pubmed.ncbi.nlm.nih.gov/26151629/
- Cepeda et al., distributed practice:
  https://pubmed.ncbi.nlm.nih.gov/16719566/
- Mawson & Kang 2025 meta-analysis:
  https://pubmed.ncbi.nlm.nih.gov/40564553/
