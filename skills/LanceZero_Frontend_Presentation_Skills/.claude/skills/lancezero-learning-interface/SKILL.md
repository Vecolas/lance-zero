---
name: lancezero-learning-interface
description: This skill should be used whenever implementing or reviewing how LanceZero visually presents teaching, lessons, guided practice, independent practice, review, diagnosis, hints, feedback, activity completion, mastery, learning steps, or educational copy. Trigger whenever a chess exercise risks becoming trial-and-error, when the UI asks “what is the best move?”, or when the user wants learning modes to feel distinct and understandable.
version: 1.0.0
---

# LanceZero Learning Interface

Make the UI communicate the pedagogical contract before asking the user to act.

The four modes are distinct:

```text
APRENDER
PRATICAR
REVISAR
DIAGNÓSTICO
```

Do not distinguish them only by color.

Use:
- clear mode label;
- short purpose sentence when needed;
- different level of visible guidance.

## Aprender

Show:
- objective;
- explanation;
- board highlights when useful;
- worked example;
- intermediate questions;
- next/previous lesson step.

Do not open with a blind “best move?” prompt for unseen knowledge.

### Lesson step layout

Keep one primary idea per step.

Prefer:
```text
step title
short explanation
board/position
small decision or demonstration
navigation
```

Avoid:
- long article beside a tiny board;
- several competing callouts;
- explanation text over the board.

## Praticar

Reduce scaffolding.

Show:
- task;
- board;
- optional hint access;
- feedback after attempt.

Do not reveal motif/answer before the attempt if the concept has already been taught.

## Revisar

Make retrieval explicit.

Keep interface especially quiet:
- no decorative clue;
- no answer-leading label;
- no highlighted target square.

After answer, provide explanation and next scheduling state if useful.

## Diagnóstico

State clearly that this calibrates the plan.

Avoid failure language.

Do not visually mix diagnostic result with daily completion/mastery.

## Hints

Use a progressive hint ladder.

Present one hint at a time.

Do not show all hints expanded simultaneously.

Keep `Ver dica` secondary to the task.

Track hint use, but do not shame the user.

## Incorrect feedback

Reserve stable feedback space to prevent layout jumps.

Explain:
1. what happened;
2. what was missed;
3. which thinking question would help next time.

Avoid a large red error panel.

## Correct feedback

Use restrained confirmation:
```text
✓ Correto
```
plus a short reason.

Do not use confetti for routine correctness.

## Completion vs mastery

Display activity completion with:
```text
✓ Concluída
```

Do not visually imply:
```text
skill mastered
```
because a card was completed.

Use separate vocabulary for skill strength:
- Aprendendo
- Praticando
- Consolidando
- Forte
- Revisar

## Resume

When an activity is in progress:
- show progress in a quiet way;
- preserve checkpoint;
- use `Continuar` only where needed;
- do not create a global session gate on Hoje.

## Copy

Use instructional language that answers:
- what are we learning?;
- what should I notice?;
- what should I do now?;
- why did this fail/succeed?

Prefer human chess explanations before engine values.

## Read

Read `references/activity-templates.md` when implementing a lesson/practice/review component.
