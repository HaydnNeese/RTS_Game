// src/utils/grid.ts

export type TileCoord = { tx: number; ty: number };

// This function takes ANY world pixel coordinate (x,y)
// and returns the CENTER of the grid cell containing that point.
export const snapWorldToGridCenter = (
  x: number,
  y: number,
  cell: number,
): { x: number; y: number } => {
  // Convert world pixels to tile index by dividing by tile size and flooring.
  const gx = Math.floor(x / cell);
  const gy = Math.floor(y / cell);

  // Convert tile index back to the CENTER of that tile in world pixels.
  return {
    x: gx * cell + cell / 2,
    y: gy * cell + cell / 2,
  };
};

export const worldToTile = (
  worldX: number,
  worldY: number,
  cell: number,
): TileCoord => {
  const tx = Math.floor(worldX / cell);
  const ty = Math.floor(worldY / cell);
  return { tx, ty };
};

export const tileToWorldCenter = (
  tx: number,
  ty: number,
  cell: number,
): { x: number; y: number } => {
  return { x: tx * cell + cell / 2, y: ty * cell + cell / 2 };
};
