# Notation Contracts

## FEN
Snapshot of board state, side to move, castling rights, en passant target, halfmove and move number.

## SAN
Human notation, context-dependent:
```text
Nf3
Rxe7+
O-O
e8=Q
```

## UCI move
Coordinate-like engine/API move:
```text
e2e4
e7e8q
```

## Rule

At every public interface, name the representation explicitly:

```ts
type UciMove = string & { readonly __brand: 'UciMove' }
type SanMove = string & { readonly __brand: 'SanMove' }
type Fen = string & { readonly __brand: 'Fen' }
```

Branded types are optional, but ambiguous generic strings are discouraged.
