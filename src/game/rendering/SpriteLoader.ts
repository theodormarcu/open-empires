import { Assets, Texture, Rectangle } from "pixi.js";

export interface SpriteSheetConfig {
  path: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
}

export class SpriteLoader {
  private textures: Map<string, Map<string, Texture>> = new Map();

  async loadSpriteSheet(name: string, config: SpriteSheetConfig): Promise<void> {
    try {
      const baseTexture = await Assets.load(config.path);
      const frames = new Map<string, Texture>();

      for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col < config.columns; col++) {
          const frameId = `${name}_${row}_${col}`;
          const frame = new Rectangle(
            col * config.frameWidth,
            row * config.frameHeight,
            config.frameWidth,
            config.frameHeight
          );
          const texture = new Texture({ source: baseTexture.source, frame });
          frames.set(frameId, texture);
        }
      }

      this.textures.set(name, frames);
    } catch (error) {
      console.warn(`Failed to load sprite sheet "${name}":`, error);
    }
  }

  getFrame(sheetName: string, row: number, col: number): Texture | null {
    const sheet = this.textures.get(sheetName);
    if (!sheet) return null;
    return sheet.get(`${sheetName}_${row}_${col}`) ?? null;
  }

  hasSheet(name: string): boolean {
    return this.textures.has(name);
  }
}
