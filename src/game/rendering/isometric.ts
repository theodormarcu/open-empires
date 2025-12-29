import { TILE_WIDTH, TILE_HEIGHT } from "../constants";

export interface IsoPoint {
  x: number;
  y: number;
}

export interface TileCoord {
  tileX: number;
  tileY: number;
}

/**
 * Convert tile coordinates to isometric screen position
 */
export function tileToScreen(tileX: number, tileY: number): IsoPoint {
  return {
    x: (tileX - tileY) * (TILE_WIDTH / 2),
    y: (tileX + tileY) * (TILE_HEIGHT / 2),
  };
}

/**
 * Convert screen position to tile coordinates
 */
export function screenToTile(screenX: number, screenY: number): TileCoord {
  const tileX = (screenX / (TILE_WIDTH / 2) + screenY / (TILE_HEIGHT / 2)) / 2;
  const tileY = (screenY / (TILE_HEIGHT / 2) - screenX / (TILE_WIDTH / 2)) / 2;
  return {
    tileX: Math.floor(tileX),
    tileY: Math.floor(tileY),
  };
}

/**
 * Get the center of a tile in screen coordinates
 */
export function getTileCenter(tileX: number, tileY: number): IsoPoint {
  const pos = tileToScreen(tileX, tileY);
  return {
    x: pos.x,
    y: pos.y + TILE_HEIGHT / 2,
  };
}
