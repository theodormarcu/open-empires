import { Assets, Texture, Rectangle } from "pixi.js";
import { TILE_WIDTH, TILE_HEIGHT } from "../constants";
import { TerrainType } from "./Tilemap";

/** Terrain sprite sheet configuration */
interface TerrainSpriteConfig {
  path: string;
  /** Number of tile columns in the sprite sheet */
  cols: number;
  /** Number of tile rows in the sprite sheet */
  rows: number;
  /** Pixel width of each cell in sprite sheet (defaults to TILE_WIDTH) */
  cellWidth?: number;
  /** Pixel height of each cell in sprite sheet (defaults to TILE_HEIGHT) */
  cellHeight?: number;
}

/** Sprite sheet configurations for each terrain type */
const TERRAIN_CONFIGS: Partial<Record<TerrainType, TerrainSpriteConfig>> = {
  [TerrainType.GRASS]: {
    path: "/assets/grass_terrain.png",
    cols: 4,
    rows: 4,
    cellWidth: 256,  // 1024 / 4
    cellHeight: 256, // 1024 / 4
  },
  [TerrainType.WATER]: {
    path: "/assets/water_terrain.png",
    cols: 4,
    rows: 4,
    cellWidth: 256,  // 1024 / 4 - match grass scale
    cellHeight: 256,
  },
  // Add other terrain types as assets become available
};

/** Fallback colors for terrain types without sprites */
const TERRAIN_FALLBACK_COLORS: Record<TerrainType, number> = {
  [TerrainType.GRASS]: 0x4a7c23,
  [TerrainType.WATER]: 0x2980b9,
  [TerrainType.SAND]: 0xc9a227,
  [TerrainType.FOREST]: 0x2d5a1d,
  [TerrainType.STONE]: 0x7f8c8d,
};

export class TerrainSprites {
  private textures: Map<TerrainType, Texture[]> = new Map();
  private loaded: boolean = false;

  /** Load all terrain sprite sheets */
  async load(): Promise<void> {
    const loadPromises: Promise<void>[] = [];

    for (const [terrainType, config] of Object.entries(TERRAIN_CONFIGS)) {
      if (!config) continue;
      
      const type = Number(terrainType) as TerrainType;
      loadPromises.push(this.loadTerrainSheet(type, config));
    }

    await Promise.all(loadPromises);
    this.loaded = true;
  }

  private async loadTerrainSheet(
    terrainType: TerrainType,
    config: TerrainSpriteConfig
  ): Promise<void> {
    try {
      const baseTexture = await Assets.load(config.path);
      const textures: Texture[] = [];

      // Extract individual tile textures from the sprite sheet
      const cellW = config.cellWidth ?? TILE_WIDTH;
      const cellH = config.cellHeight ?? TILE_HEIGHT;
      
      for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col < config.cols; col++) {
          const frame = new Rectangle(
            col * cellW,
            row * cellH,
            cellW,
            cellH
          );
          const texture = new Texture({ source: baseTexture.source, frame });
          textures.push(texture);
        }
      }

      this.textures.set(terrainType, textures);
    } catch (error) {
      console.warn(`Failed to load terrain sprite for ${TerrainType[terrainType]}:`, error);
    }
  }

  /** Check if sprites are loaded */
  isLoaded(): boolean {
    return this.loaded;
  }

  /** Get a texture for the given terrain type. Uses tile coords for variety. */
  getTexture(terrainType: TerrainType, tileX: number, tileY: number): Texture | null {
    const textures = this.textures.get(terrainType);
    if (!textures || textures.length === 0) {
      return null;
    }

    // Use tile coordinates to pick a consistent but varied texture
    // Simple hash to distribute tiles across available textures
    const index = Math.abs((tileX * 7 + tileY * 13) % textures.length);
    return textures[index];
  }

  /** Check if a terrain type has loaded sprites */
  hasSprite(terrainType: TerrainType): boolean {
    return this.textures.has(terrainType) && this.textures.get(terrainType)!.length > 0;
  }

  /** Get fallback color for terrain without sprites */
  getFallbackColor(terrainType: TerrainType): number {
    return TERRAIN_FALLBACK_COLORS[terrainType] ?? 0x808080;
  }

  /** Get the number of texture variants for a terrain type */
  getTextureCount(terrainType: TerrainType): number {
    return this.textures.get(terrainType)?.length ?? 0;
  }
}
