export interface PuzzlePiece {
  id: string;
  row: number;
  col: number;
  x: number;
  y: number;
  isPlaced: boolean;
  // Edge types: 0 = flat, 1 = tab (out), -1 = blank (in)
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Difficulty {
  rows: number;
  cols: number;
  targetCount: number;
}
