import { Container, Graphics, Sprite, Texture } from "pixi.js";
import { TILE_WIDTH, TILE_HEIGHT, MAP_WIDTH, MAP_HEIGHT, RENDER_SKIP } from "../constants";
import { tileToScreen, screenToTile } from "./isometric";
import { Camera } from "./Camera";
import { TerrainSprites } from "./TerrainSprites";

export enum TerrainType {
  GRASS = 0,
  WATER = 1,
  SAND = 2,
  FOREST = 3,
  STONE = 4,
}

export class Tilemap {
  private container: Container;
  private spriteContainer: Container;
  private fallbackGraphics: Graphics;
  private tiles: TerrainType[][];
  private terrainSprites: TerrainSprites;
  private width: number;
  private height: number;
  
  // Sprite pool for efficient rendering
  private spritePool: Sprite[] = [];
  private activeSpriteCount: number = 0;
  
  // Render skip state - avoid re-rendering when camera is idle
  private lastRenderBounds: { minX: number; maxX: number; minY: number; maxY: number } | null = null;
  private lastRenderZoom: number | null = null;
  private idleFrameCount: number = 0;
  private renderSkipCount: number = 0; // Track skips for debugging

  constructor(terrainSprites: TerrainSprites) {
    this.container = new Container();
    this.spriteContainer = new Container();
    this.fallbackGraphics = new Graphics();
    this.terrainSprites = terrainSprites;
    
    // Add sprite container first (sprites), then graphics on top (fallback colors)
    this.container.addChild(this.spriteContainer);
    this.container.addChild(this.fallbackGraphics);
    
    this.width = MAP_WIDTH;
    this.height = MAP_HEIGHT;
    this.tiles = this.generateMap();
  }

  private generateMap(): TerrainType[][] {
    const tiles: TerrainType[][] = [];
    
    for (let y = 0; y < this.height; y++) {
      tiles[y] = [];
      for (let x = 0; x < this.width; x++) {
        // Simple procedural generation
        const noise = Math.random();
        
        // Create some water around edges
        const distFromEdge = Math.min(x, y, this.width - x - 1, this.height - y - 1);
        if (distFromEdge < 3 && noise < 0.7) {
          tiles[y][x] = TerrainType.WATER;
        } else if (noise < 0.05) {
          tiles[y][x] = TerrainType.WATER;
        } else if (noise < 0.15) {
          tiles[y][x] = TerrainType.FOREST;
        } else if (noise < 0.2) {
          tiles[y][x] = TerrainType.STONE;
        } else if (noise < 0.25) {
          tiles[y][x] = TerrainType.SAND;
        } else {
          tiles[y][x] = TerrainType.GRASS;
        }
      }
    }
    
    return tiles;
  }

  public render(camera: Camera): void {
    const bounds = camera.getVisibleBounds();
    const zoom = camera.zoom;
    
    // Enhanced render skip logic - avoid re-rendering when camera is idle or barely moved
    if (this.lastRenderBounds && this.lastRenderZoom !== null) {
      const zoomDelta = Math.abs(zoom - this.lastRenderZoom);
      const cameraDeltaX = Math.abs(bounds.minX - this.lastRenderBounds.minX);
      const cameraDeltaY = Math.abs(bounds.minY - this.lastRenderBounds.minY);
      const maxCameraDelta = Math.max(cameraDeltaX, cameraDeltaY);
      
      const zoomChanged = zoomDelta > RENDER_SKIP.MIN_ZOOM_DELTA;
      const cameraMoved = maxCameraDelta > RENDER_SKIP.MIN_CAMERA_DELTA;
      
      if (!zoomChanged && !cameraMoved) {
        this.idleFrameCount++;
        // Only skip after a few idle frames to prevent initial flicker
        if (this.idleFrameCount >= RENDER_SKIP.IDLE_FRAME_THRESHOLD) {
          this.renderSkipCount++;
          return; // Skip re-render - camera is idle
        }
      } else {
        // Camera moved - reset idle counter
        this.idleFrameCount = 0;
      }
    }
    
    this.lastRenderBounds = { ...bounds };
    this.lastRenderZoom = zoom;
    
    // Calculate visible tile range directly from screen bounds
    const padding = 4;
    const topLeft = screenToTile(bounds.minX, bounds.minY);
    const topRight = screenToTile(bounds.maxX, bounds.minY);
    const bottomLeft = screenToTile(bounds.minX, bounds.maxY);
    const bottomRight = screenToTile(bounds.maxX, bounds.maxY);
    
    const minTileX = Math.max(0, Math.min(topLeft.tileX, bottomLeft.tileX) - padding);
    const maxTileX = Math.min(this.width - 1, Math.max(topRight.tileX, bottomRight.tileX) + padding);
    const minTileY = Math.max(0, Math.min(topLeft.tileY, topRight.tileY) - padding);
    const maxTileY = Math.min(this.height - 1, Math.max(bottomLeft.tileY, bottomRight.tileY) + padding);
    
    // Reset sprite pool usage
    this.activeSpriteCount = 0;
    this.fallbackGraphics.clear();
    
    for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
        const screenPos = tileToScreen(tileX, tileY);
        const terrainType = this.tiles[tileY][tileX];
        
        // Try to use sprite, fall back to graphics
        const texture = this.terrainSprites.getTexture(terrainType, tileX, tileY);
        if (texture) {
          this.drawSpriteTile(screenPos.x, screenPos.y, texture);
        } else {
          this.drawFallbackTile(screenPos.x, screenPos.y, this.terrainSprites.getFallbackColor(terrainType));
        }
      }
    }
    
    // Hide unused sprites from pool
    for (let i = this.activeSpriteCount; i < this.spritePool.length; i++) {
      this.spritePool[i].visible = false;
    }
  }

  private getPooledSprite(): Sprite {
    if (this.activeSpriteCount < this.spritePool.length) {
      const sprite = this.spritePool[this.activeSpriteCount];
      sprite.visible = true;
      this.activeSpriteCount++;
      return sprite;
    }
    
    // Create new sprite for pool
    const sprite = new Sprite();
    sprite.anchor.set(0.5, 0); // Anchor at top-center for isometric positioning
    this.spritePool.push(sprite);
    this.spriteContainer.addChild(sprite);
    this.activeSpriteCount++;
    return sprite;
  }

  private drawSpriteTile(x: number, y: number, texture: Texture): void {
    const sprite = this.getPooledSprite();
    sprite.texture = texture;
    
    // Rectangular terrain textures are scaled to fill the tile's diamond area
    // We scale based on tile width and use 2:1 aspect ratio for isometric
    // The rectangular texture is clipped visually by overlapping tiles
    sprite.width = TILE_WIDTH;
    sprite.height = TILE_HEIGHT;
    
    // Position at tile location (anchor is 0.5, 0 = top-center)
    sprite.x = x;
    sprite.y = y;
  }

  private drawFallbackTile(x: number, y: number, color: number): void {
    const halfW = TILE_WIDTH / 2;
    const halfH = TILE_HEIGHT / 2;
    
    // Draw diamond shape for tiles without sprites
    this.fallbackGraphics
      .moveTo(x, y)
      .lineTo(x + halfW, y + halfH)
      .lineTo(x, y + TILE_HEIGHT)
      .lineTo(x - halfW, y + halfH)
      .lineTo(x, y)
      .fill(color);
  }

  public getContainer(): Container {
    return this.container;
  }

  public getTile(tileX: number, tileY: number): TerrainType | null {
    if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
      return null;
    }
    return this.tiles[tileY][tileX];
  }

  public setTile(tileX: number, tileY: number, terrain: TerrainType): void {
    if (tileX >= 0 && tileX < this.width && tileY >= 0 && tileY < this.height) {
      this.tiles[tileY][tileX] = terrain;
    }
  }

  /** Get render skip count for debugging (resets on read) */
  public getRenderSkipCount(): number {
    const count = this.renderSkipCount;
    this.renderSkipCount = 0;
    return count;
  }
}
