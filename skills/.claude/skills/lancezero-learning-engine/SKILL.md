---
name: lancezero-learning-engine
description: Use when designing or implementing LanceZero training plans, pedagogy, onboarding diagnosis, skill graph, mastery, puzzle selection, mistake classification, guided examples, calculation training, spaced review, FSRS scheduling, daily-plan logic, adaptive difficulty, progress metrics, or transforming game errors into future exercises.
version: 1.0.0
---

# LanceZero Learning Engine

## Product promise

The app is not a toolbox. It is a closed learning loop:

```text
diagnose
→ explain
→ guided practice
→ independent retrieval
→ spaced review
→ real-game application
→ game review
→ updated training plan
```

Every training feature should strengthen this loop.

## Target user

Initial product should work especially well around 800–1600 rating, calibrated around ~1100.

Avoid designing exclusively for expert opening preparation.

## Instruction rules

### Deliberate practice
Tie activities to a measurable weakness or skill target.

### Retrieval before reveal
When testing an existing skill, do not reveal motif/answer before the attempt.

### Worked examples for acquisition
For new concepts, provide guided examples and explanation.

Then fade assistance.

### Spacing
Use spaced review for:
- exact mistakes;
- tactical patterns;
- endgame positions;
- concepts;
- repertoire nodes.

### Transfer
A skill is not “mastered” only because puzzle accuracy is high.
Track whether the error reappears in real games.

## FSRS boundary

FSRS schedules memories/cards; it is not the complete skill model.

Keep separate:
- review-card scheduling;
- tactical rating/difficulty;
- skill mastery;
- real-game evidence.

Do not overload FSRS state with domain semantics it does not represent.

## Daily planner

The planner should consider:
- due reviews;
- recent serious mistakes;
- weak skills;
- difficulty fit;
- curriculum balance;
- user time budget;
- fatigue/volume constraints.

Prefer deterministic planning with explicit seed for testability.

## Engine usage

Stockfish is diagnostic, not teacher by itself.

Convert engine findings into:
- understandable error class;
- human explanation;
- exercise;
- review card;
- skill update.

Do not display arbitrary centipawn numbers as the lesson.

## Feedback tone

Explain without humiliation.

Prefer:
> “Essa jogada deixou a peça sem defesa. Antes de mover, faça uma varredura curta de peças atacadas.”

Avoid:
> “Blunder horrível.”

## When not to use

Do not use for pure engine transport/Worker code.
Do not use for visual styling unrelated to learning behavior.
