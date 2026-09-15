# LanceZero — Claude Code Skills Pack

Pacote de skills de projeto para o Claude Code, desenhado especificamente para o LanceZero.

## Instalação

Copie a pasta `.claude/` deste pacote para a raiz do repositório do LanceZero:

```text
lancezero/
├─ .claude/
│  └─ skills/
│     ├─ lancezero-project-architecture/
│     ├─ lancezero-security-review/
│     ├─ lancezero-auth-data/
│     ├─ lancezero-chess-domain/
│     ├─ lancezero-stockfish-browser/
│     ├─ lancezero-learning-engine/
│     ├─ lancezero-chess-data-integrations/
│     ├─ lancezero-design-system/
│     ├─ lancezero-vercel-production/
│     └─ lancezero-testing-release/
├─ CLAUDE.md
└─ ...
```

O Claude Code descobre skills de projeto em `.claude/skills/<skill-name>/SKILL.md`.

## Skills incluídas

| Skill | Responsabilidade principal |
|---|---|
| `lancezero-project-architecture` | arquitetura, boundaries, local-first, decisões e precedência documental |
| `lancezero-security-review` | segurança transversal, threat model, bypass, secrets, cache, XSS, SSRF, release blockers |
| `lancezero-auth-data` | Clerk + Supabase + RLS, perfil, sessão, Storage, lifecycle de conta |
| `lancezero-chess-domain` | FEN/PGN/SAN/UCI, chess.js, invariantes e modelo de domínio |
| `lancezero-stockfish-browser` | Stockfish 18 WASM, Worker, UCI, performance, WDL, licenciamento |
| `lancezero-learning-engine` | pedagogia adaptativa, skill graph, daily planner, FSRS, revisão de erros |
| `lancezero-chess-data-integrations` | Lichess APIs/datasets, Opening Explorer, Tablebase, import, rate limits |
| `lancezero-design-system` | identidade visual atual, UI, tabuleiro, acessibilidade e consistência |
| `lancezero-vercel-production` | Vercel/Next.js, environments, cache, headers, observabilidade e deploy |
| `lancezero-testing-release` | unit/contract/E2E/security/performance/accessibility e gates de release |

## Filosofia

O pacote usa *progressive disclosure*:

1. `name` + `description`: sempre disponíveis para roteamento;
2. `SKILL.md`: carregado quando a skill é relevante;
3. `references/`: carregadas somente quando a tarefa precisa do detalhe;
4. `scripts/`: verificações determinísticas e read-only.

Isso mantém o contexto menor e evita duplicar documentação extensa em toda tarefa.

## Precedência das decisões do LanceZero

Em caso de conflito:

1. instrução explícita mais recente do projeto / ADR atual;
2. plano de segurança para autenticação e dados;
3. guia de identidade visual para design;
4. PRD/plano de desenvolvimento para produto e pedagogia;
5. `CLAUDE.md` para convenções arquiteturais ainda não substituídas;
6. documentação oficial atual para comportamento de dependências externas.

**Importante:** o `CLAUDE.md` antigo possui uma paleta `paper/coral/sage` que conflita com o guia visual criado depois. A skill de design considera a identidade **navy + cyan** a fonte de verdade atual. Veja `MIGRATION_NOTES.md`.

## Plugins oficiais complementares

Não repliquei capacidades genéricas já existentes. Para um fluxo forte, considerar:

```text
/plugin install security-guidance@claude-plugins-official
/plugin install feature-dev@claude-plugins-official
/plugin install frontend-design@claude-plugins-official
/plugin install code-review@claude-plugins-official
/plugin install playwright@claude-plugins-official
/plugin install vercel@claude-plugins-official
```

Uso recomendado:

- `security-guidance`: revisão automática durante edição/commit;
- `feature-dev`: fluxo de desenvolvimento de features;
- `frontend-design`: execução visual; a skill LanceZero fornece o design system;
- `code-review`: revisão de PR;
- `playwright`: navegação/testes browser;
- `vercel`: deploy e logs.

O pacote customizado continua necessário porque esses plugins não conhecem as regras específicas do LanceZero.

## Validação

Cada skill contém uma seção `When not to use`, invariantes e critérios de conclusão. As skills de segurança, Stockfish e release também incluem scripts read-only.

Antes de confiar plenamente nas skills, teste com tarefas reais e refine descrições quando houver:
- falso acionamento;
- skill relevante não acionada;
- instruções redundantes;
- conflito com novas ADRs.
