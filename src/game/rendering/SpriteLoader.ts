import { Assets, Texture, Rectangle } from 'pixi.js';

export interface SpriteSheetConfig {
  path: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
}

export class SpriteLoader {
  private textures: Map<string, Texture[][]> = new Map();

  async loadSpritesheet(name: string, config: SpriteSheetConfig): Promise<void> {
    try {
      const baseTexture = await Assets.load(config.path);
      const frames: Texture[][] = [];
      for (let row = 0; row < config.rows; row++) {
        frames[row] = [];
        for (let col = 0; col < config.columns; col++) {
          const frame = new Rectangle(
            col * config.frameWidth,
            row * config.frameHeight,
            config.frameWidth,
            config.frameHeight
          );
          frames[row][col] = new Texture({ source: baseTexture.source, frame });
        }
      }
      this.textures.set(name, frames);
    } catch (error) {
      console.warn(`Failed to load spritesheet '${name}':`, error);
    }
  }

  getFrame(sheetName: string, row: number, col: number): Texture | null {
    const frames = this.textures.get(sheetName);
    if (!frames || !frames[row] || !frames[row][col]) return null;
    return frames[row][col];
  }

  hasSheet(name: string): boolean {
    return this.textures.has(name);
  }
}
