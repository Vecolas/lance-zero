# LanceZero — Migration Notes para adoção das Skills

## 1. Conflito visual encontrado

O `CLAUDE.md` anterior define tokens de marca:

```text
paper / coral / sage
```

O guia de identidade visual produzido posteriormente define a identidade atual como:

```text
Navy 950: #071521
Navy 900: #0B1D2C
Zero Blue: #00A9D6
Zero Cyan: #20C9E8
Background: #F7F9FB
Surface: #FFFFFF
```

A identidade mais recente também fixa o símbolo central como:

> peão de xadrez envolvido pelo número 0.

### Ação recomendada

Atualizar a seção `Brand system` do `CLAUDE.md` para navy/cyan e remover os tokens antigos para evitar instruções contraditórias.

---

## 2. Backend/sync

O PRD inicial prioriza arquitetura local-first e diz para não adicionar backend sem necessidade demonstrada.

A necessidade agora existe: cadastro, perfil e sincronização de usuário.

A arquitetura aprovada passa a ser:

```text
Next.js/Vercel
+ Clerk
+ Supabase PostgreSQL
+ RLS
```

Isso **não substitui local-first** para:
- Stockfish;
- treino básico;
- cache local;
- experiência sem conta.

Conta/sync devem ser uma camada adicional, não requisito para usar o núcleo gratuito.

---

## 3. Next.js e dependências externas

Não fixe nas skills uma versão que envelhece rapidamente.

Antes de:
- upgrade de Next.js;
- configuração de Clerk;
- configuração de Supabase;
- mudança de Vercel headers;
- mudança de APIs Lichess;

verifique documentação oficial atual.

---

## 4. Opening Explorer

O changelog do Lichess em 2026 registra que endpoints do Opening Explorer mudaram e passaram a exigir autenticação.

Não reutilizar exemplos antigos presumindo acesso anônimo. Encapsule em adapter e mantenha fallback.

---

## 5. Stockfish

O build padrão recomendado para MVP continua:

```text
Stockfish 18 lite single-threaded
```

Motivo:
- ~7 MB;
- forte o suficiente para o público;
- evita complexidade de SharedArrayBuffer/COOP/COEP no primeiro release.

Multi-thread deve ser decisão explícita posterior.
