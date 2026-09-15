# Lichess Integration Reference

Useful sources:
- API: https://lichess.org/api
- Changelog: https://lichess.org/changelog
- Open database: https://database.lichess.org/
- API tips: https://lichess.org/page/api-tips

## 2026 compatibility note

Lichess changelog records changes to Opening Explorer endpoints, including authentication requirements.

Always check current API docs before modifying the adapter.

## Reliability

External integrations must have:
- timeout;
- bounded retry;
- explicit 429 behavior;
- cache where allowed;
- fallback UI;
- source provenance.
