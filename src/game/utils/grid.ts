// src/utils/grid.ts

import { TileCoord } from "../systems/UnitSystem";

// This function takes ANY world pixel coordinate (x,y)
// and returns the CENTER of the grid cell containing that point.
export const snapWorldToGridCenter = (
  x: number,
  y: number,
  cell = 16,
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

export const worldToTile = (worldX: number, worldY: number): TileCoord => {
  // Grid is 16px tiles. If you later make cell size configurable,
  // change it here only (single point of truth).
  const tx = Math.floor(worldX / 16);
  const ty = Math.floor(worldY / 16);
  return { tx, ty };
};

export const tileToWorldCenter = (
  tx: number,
  ty: number,
): { x: number; y: number } => {
  return { x: tx * 16 + 8, y: ty * 16 + 8 };
};
