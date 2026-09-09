# ADR-0003 — MVP local-first, sem backend obrigatório

- **Estado:** aceito
- **Data:** 2026-09-09

## Contexto

Um app de treino que exige cadastro perde o usuário antes do primeiro exercício.
Backend também implica custo operacional contínuo, responsabilidade sobre dados
pessoais e trabalho de infraestrutura que não valida a hipótese central: a de que
o ciclo pedagógico funciona.

## Decisão

Todo o núcleo funciona sem conta e sem servidor:

- a análise roda no navegador, com Stockfish WASM;
- partidas, tentativas, cards de revisão e perfil ficam em IndexedDB;
- backup é um arquivo JSON exportável e importável pelo próprio usuário;
- as únicas chamadas externas são APIs públicas de leitura (Lichess,
  Chess.com), sempre atrás de adapters com timeout, cache e fallback.

Conta e sincronização são **Fase 12**, e só depois de validar o loop pedagógico.

## Consequências

- Perder o navegador é perder os dados. Export e import precisam ser bons e
  visíveis, não escondidos em ajustes avançados.
- Não há telemetria de produto por padrão: a validação do beta depende de
  entrevistas e de instrumentação opt-in.
- Multi-dispositivo não existe no MVP. É um custo aceito e comunicado.
