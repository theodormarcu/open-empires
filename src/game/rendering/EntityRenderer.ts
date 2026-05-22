import { Container, Sprite, Graphics } from 'pixi.js';
import { SpriteLoader } from './SpriteLoader';
import { tileToScreen } from './isometric';
import { Camera } from './Camera';
import { ZOOM_THRESHOLDS, ENTITY_LIMITS, TILE_WIDTH, TILE_HEIGHT, BUILDING_STATS } from '../constants';
import type { Unit, Building, UnitType, BuildingType } from '../types';

export interface SpriteDef {
  sheet: string;
  row: number;
  col: number;
  offsetX?: number;
  offsetY?: number;
}

// Sprite definitions for units (populated when sprite sheets are generated)
export const UNIT_SPRITES: Partial<Record<UnitType, SpriteDef>> = {};

// Sprite definitions for buildings (populated when sprite sheets are generated)
export const BUILDING_SPRITES: Partial<Record<BuildingType, SpriteDef>> = {};

// Fallback colors for unit types
const UNIT_COLORS: Record<UnitType, number> = {
  villager: 0xf39c12,
  militia: 0xe74c3c,
  archer: 0x2ecc71,
  knight: 0x9b59b6,
};

// Fallback colors for building types
const BUILDING_COLORS: Record<BuildingType, number> = {
  town_center: 0x3498db,
  house: 0xe67e22,
  barracks: 0xe74c3c,
  mill: 0xf1c40f,
  lumber_camp: 0x8b4513,
};

export class EntityRenderer {
  private unitContainer: Container;
  private buildingContainer: Container;
  private spriteLoader: SpriteLoader;
  private unitGraphics: Graphics;
  private buildingGraphics: Graphics;
  private unitSpritePool: Sprite[] = [];
  private buildingSpritePool: Sprite[] = [];
  private activeUnitSprites: number = 0;
  private activeBuildingSprites: number = 0;

  constructor(
    unitContainer: Container,
    buildingContainer: Container,
    spriteLoader: SpriteLoader
  ) {
    this.unitContainer = unitContainer;
    this.buildingContainer = buildingContainer;
    this.spriteLoader = spriteLoader;
    this.unitGraphics = new Graphics();
    this.buildingGraphics = new Graphics();
    this.unitContainer.addChild(this.unitGraphics);
    this.buildingContainer.addChild(this.buildingGraphics);
  }

  renderUnits(units: Unit[], camera: Camera): void {
    this.activeUnitSprites = 0;
    this.unitGraphics.clear();

    if (camera.zoom < ZOOM_THRESHOLDS.HIDE_SMALL_ENTITIES) return;

    const bounds = camera.getVisibleBounds();
    let count = 0;

    for (const unit of units) {
      if (count >= ENTITY_LIMITS.MAX_VISIBLE_UNITS) break;

      const pos = tileToScreen(unit.position.x, unit.position.y);
      // Frustum culling
      if (pos.x < bounds.minX - 64 || pos.x > bounds.maxX + 64 ||
          pos.y < bounds.minY - 64 || pos.y > bounds.maxY + 64) continue;

      const spriteDef = UNIT_SPRITES[unit.unitType];
      const texture = spriteDef ? this.spriteLoader.getFrame(spriteDef.sheet, spriteDef.row, spriteDef.col) : null;

      if (texture) {
        const sprite = this.getPooledUnitSprite();
        sprite.texture = texture;
        sprite.x = pos.x + (spriteDef.offsetX || 0);
        sprite.y = pos.y + (spriteDef.offsetY || 0);
        sprite.anchor.set(0.5, 1);
        sprite.width = TILE_WIDTH * 0.6;
        sprite.height = TILE_HEIGHT * 1.2;
      } else {
        // Fallback: colored diamond
        const color = UNIT_COLORS[unit.unitType] || 0xffffff;
        const size = TILE_WIDTH * 0.3;
        this.unitGraphics
          .moveTo(pos.x, pos.y - size)
          .lineTo(pos.x + size * 0.5, pos.y)
          .lineTo(pos.x, pos.y + size * 0.3)
          .lineTo(pos.x - size * 0.5, pos.y)
          .closePath()
          .fill(color)
          .stroke({ width: 1, color: 0x000000 });
      }
      count++;
    }

    // Hide unused pooled sprites
    for (let i = this.activeUnitSprites; i < this.unitSpritePool.length; i++) {
      this.unitSpritePool[i].visible = false;
    }
  }

  renderBuildings(buildings: Building[], camera: Camera): void {
    this.activeBuildingSprites = 0;
    this.buildingGraphics.clear();

    const bounds = camera.getVisibleBounds();

    for (const building of buildings) {
      const pos = tileToScreen(building.position.x, building.position.y);
      const stats = BUILDING_STATS[building.buildingType];
      const tileW = stats?.width || 2;
      const tileH = stats?.height || 2;
      const pixelW = tileW * TILE_WIDTH * 0.5;
      const pixelH = tileH * TILE_HEIGHT * 0.5;

      // Frustum culling with building size
      if (pos.x < bounds.minX - pixelW * 2 || pos.x > bounds.maxX + pixelW * 2 ||
          pos.y < bounds.minY - pixelH * 2 || pos.y > bounds.maxY + pixelH * 2) continue;

      const spriteDef = BUILDING_SPRITES[building.buildingType];
      const texture = spriteDef ? this.spriteLoader.getFrame(spriteDef.sheet, spriteDef.row, spriteDef.col) : null;

      if (texture) {
        const sprite = this.getPooledBuildingSprite();
        sprite.texture = texture;
        sprite.x = pos.x + (spriteDef.offsetX || 0);
        sprite.y = pos.y + (spriteDef.offsetY || 0);
        sprite.anchor.set(0.5, 1);
        sprite.width = pixelW;
        sprite.height = pixelH * 1.5;
      } else {
        // Fallback: colored isometric box
        const color = BUILDING_COLORS[building.buildingType] || 0x888888;
        const w = pixelW;
        const h = pixelH;
        // Draw isometric diamond base
        this.buildingGraphics
          .moveTo(pos.x, pos.y - h)
          .lineTo(pos.x + w, pos.y)
          .lineTo(pos.x, pos.y + h)
          .lineTo(pos.x - w, pos.y)
          .closePath()
          .fill(color)
          .stroke({ width: 2, color: 0x000000 });
        // Draw a "roof" trapezoid for height
        const roofH = h * 0.8;
        this.buildingGraphics
          .moveTo(pos.x, pos.y - h - roofH)
          .lineTo(pos.x + w, pos.y - roofH)
          .lineTo(pos.x + w, pos.y)
          .lineTo(pos.x, pos.y + h)
          .lineTo(pos.x - w, pos.y)
          .lineTo(pos.x - w, pos.y - roofH)
          .closePath()
          .fill((color & 0xfefefe) >> 1)
          .stroke({ width: 1, color: 0x000000 });
      }
    }

    for (let i = this.activeBuildingSprites; i < this.buildingSpritePool.length; i++) {
      this.buildingSpritePool[i].visible = false;
    }
  }

  private getPooledUnitSprite(): Sprite {
    if (this.activeUnitSprites < this.unitSpritePool.length) {
      const sprite = this.unitSpritePool[this.activeUnitSprites];
      sprite.visible = true;
      this.activeUnitSprites++;
      return sprite;
    }
    const sprite = new Sprite();
    this.unitSpritePool.push(sprite);
    this.unitContainer.addChild(sprite);
    this.activeUnitSprites++;
    return sprite;
  }

  private getPooledBuildingSprite(): Sprite {
    if (this.activeBuildingSprites < this.buildingSpritePool.length) {
      const sprite = this.buildingSpritePool[this.activeBuildingSprites];
      sprite.visible = true;
      this.activeBuildingSprites++;
      return sprite;
    }
    const sprite = new Sprite();
    this.buildingSpritePool.push(sprite);
    this.buildingContainer.addChild(sprite);
    this.activeBuildingSprites++;
    return sprite;
  }
}
