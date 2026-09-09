/**
 * Conjunto inicial de puzzles, no formato exato do dump do Lichess.
 *
 * Gerado e verificado por `scripts/content/gen-starter-puzzles.mjs`: cada linha
 * teve o lance preparatório e a solução validados com as regras do xadrez.
 *
 * NÃO é o dataset de produção. O alvo são 100k a 300k puzzles curados do dump
 * oficial (CC0), montados pelo pipeline de ingestão. Este punhado existe para a
 * tela funcionar antes disso, e some quando o pipeline entrar.
 */
export const STARTER_PUZZLES_CSV = `PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags
LZ0001,6k1/5ppp/8/8/8/8/5PPP/R5K1 b - - 0 1,g8h8 a1a8,800,75,90,500,backRankMate mateIn1,,
LZ0002,r5k1/5ppp/8/8/8/7Q/5PPP/6K1 b - - 0 1,a8c8 h3c8,900,75,90,500,mateIn1 backRankMate,,
LZ0003,2r3k1/5ppp/8/8/8/8/5PPP/2R3K1 b - - 0 1,c8c7 c1c7,1000,75,90,500,hangingPiece,,
LZ0004,rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 0 2,d8g5 f3g5,1050,75,90,500,hangingPiece,,
LZ0005,r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 0 3,a8b8 f3f7,950,75,90,500,mateIn1 backRankMate,,
LZ0006,5rk1/5ppp/8/8/8/8/5PPP/4R1K1 b - - 0 1,f8e8 e1e8,1100,75,90,500,mateIn1 backRankMate,,
LZ0007,r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R b KQkq - 0 5,f6e4 d3e4,1150,75,90,500,hangingPiece fork,,
LZ0008,rnbqkb1r/pppp1ppp/5n2/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 0 3,f8a3 f3a3,900,75,90,500,hangingPiece,,
LZ0009,r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 b - - 0 6,f6e4 c3e4,1250,75,90,500,hangingPiece,,
LZ0010,4r1k1/5ppp/8/8/8/8/5PPP/2R3K1 b - - 0 1,e8e3 f2e3,1050,75,90,500,hangingPiece,,
LZ0011,2kr3r/ppp2ppp/8/8/8/8/PPP2PPP/2KR3R b - - 0 1,d8d5 d1d5,1150,75,90,500,hangingPiece,,
`
