# FSRS Contract

Use `ts-fsrs` as a scheduler.

Typical conceptual flow:

```text
card due
→ user attempts without answer
→ score attempt
→ map outcome to review rating
→ scheduler.next(...)
→ persist card + review log
```

Avoid mapping “engine centipawn loss” directly to FSRS rating.

FSRS rating should reflect retrieval quality of the learning item.

Current ts-fsrs requires Node.js >=20 for current packages.
Official source:
https://github.com/open-spaced-repetition/ts-fsrs
