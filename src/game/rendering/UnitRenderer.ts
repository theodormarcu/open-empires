import { Container, Graphics, Sprite, Texture } from "pixi.js";
import { tileToScreen } from "./isometric";
import { Camera } from "./Camera";
import { SpriteLoader } from "./SpriteLoader";
import { ENTITY_LIMITS, ZOOM_THRESHOLDS, TILE_WIDTH, TILE_HEIGHT, COLORS } from "../constants";
import type { Unit } from "../types";
import { UNIT_SPRITES } from "../types";

const PLAYER_COLORS: Record<number, number> = {
  1: COLORS.PLAYER_1,
  2: COLORS.PLAYER_2,
  3: COLORS.PLAYER_3,
  4: COLORS.PLAYER_4,
  0: COLORS.GAIA,
};

const HEALTH_BAR_WIDTH = 24;
const HEALTH_BAR_HEIGHT = 3;
const HEALTH_BAR_OFFSET_Y = -20;

export class UnitRenderer {
  private container: Container;
  private graphics: Graphics;
  private spritePool: Sprite[] = [];
  private activeSpriteCount: number = 0;
  private spriteLoader: SpriteLoader;

  constructor(container: Container, spriteLoader: SpriteLoader) {
    this.container = container;
    this.spriteLoader = spriteLoader;
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  render(units: Unit[], camera: Camera, selectedIds: Set<string>): void {
    this.activeSpriteCount = 0;
    this.graphics.clear();

    if (camera.zoom < ZOOM_THRESHOLDS.HIDE_SMALL_ENTITIES) return;

    const bounds = camera.getVisibleBounds();
    const padding = TILE_WIDTH * 2;
    let count = 0;

    for (const unit of units) {
      if (count >= ENTITY_LIMITS.MAX_VISIBLE_UNITS) break;

      const pos = tileToScreen(unit.position.x, unit.position.y);

      if (
        pos.x < bounds.minX - padding ||
        pos.x > bounds.maxX + padding ||
        pos.y < bounds.minY - padding ||
        pos.y > bounds.maxY + padding
      ) {
        continue;
      }

      const isSelected = selectedIds.has(unit.id);
      const playerColor = PLAYER_COLORS[unit.owner] ?? COLORS.GAIA;

      // Selection indicator (drawn under unit)
      if (isSelected) {
        this.drawSelectionIndicator(pos.x, pos.y + TILE_HEIGHT * 0.4);
      }

      // Try sprite first, fall back to colored diamond
      const spriteDef = UNIT_SPRITES[unit.unitType];
      const texture = spriteDef
        ? this.spriteLoader.getFrame(spriteDef.sheet, spriteDef.row, spriteDef.col)
        : null;

      if (texture) {
        this.drawSpriteUnit(pos.x, pos.y, texture, spriteDef.offsetX, spriteDef.offsetY);
      } else {
        this.drawPlaceholderUnit(pos.x, pos.y, playerColor);
      }

      // Health bar
      if (unit.health < unit.maxHealth || isSelected) {
        this.drawHealthBar(pos.x, pos.y + HEALTH_BAR_OFFSET_Y, unit.health / unit.maxHealth);
      }

      count++;
    }

    // Hide unused pooled sprites
    for (let i = this.activeSpriteCount; i < this.spritePool.length; i++) {
      this.spritePool[i].visible = false;
    }
  }

  private drawSpriteUnit(
    x: number,
    y: number,
    texture: Texture,
    offsetX?: number,
    offsetY?: number
  ): void {
    const sprite = this.getPooledSprite();
    sprite.texture = texture;
    sprite.x = x + (offsetX ?? 0);
    sprite.y = y + (offsetY ?? 0);
    sprite.anchor.set(0.5, 1);
    sprite.width = TILE_WIDTH * 0.6;
    sprite.height = TILE_HEIGHT * 1.2;
  }

  private drawPlaceholderUnit(x: number, y: number, color: number): void {
    const size = TILE_WIDTH * 0.3;
    const centerY = y + TILE_HEIGHT * 0.3;

    // Diamond body
    this.graphics
      .moveTo(x, centerY - size)
      .lineTo(x + size * 0.5, centerY)
      .lineTo(x, centerY + size * 0.3)
      .lineTo(x - size * 0.5, centerY)
      .closePath()
      .fill(color)
      .stroke({ width: 1, color: 0x000000 });

    // Direction indicator (small triangle pointing right)
    const indSize = size * 0.2;
    this.graphics
      .moveTo(x + size * 0.5 + 2, centerY)
      .lineTo(x + size * 0.5 + 2 + indSize, centerY)
      .lineTo(x + size * 0.5 + 2, centerY - indSize * 0.5)
      .closePath()
      .fill(color);
  }

  private drawHealthBar(x: number, y: number, ratio: number): void {
    const barX = x - HEALTH_BAR_WIDTH / 2;

    // Background (dark)
    this.graphics
      .rect(barX, y, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT)
      .fill(0x333333);

    // Health portion (green → red)
    const healthColor = ratio > 0.5 ? 0x2ecc71 : ratio > 0.25 ? 0xf39c12 : 0xe74c3c;
    this.graphics
      .rect(barX, y, HEALTH_BAR_WIDTH * ratio, HEALTH_BAR_HEIGHT)
      .fill(healthColor);
  }

  private drawSelectionIndicator(x: number, y: number): void {
    const rx = TILE_WIDTH * 0.28;
    const ry = TILE_HEIGHT * 0.22;

    // Green ellipse ring under the unit
    this.graphics
      .ellipse(x, y, rx, ry)
      .stroke({ width: 2, color: 0x00ff00, alpha: 0.85 });
  }

  private getPooledSprite(): Sprite {
    if (this.activeSpriteCount < this.spritePool.length) {
      const sprite = this.spritePool[this.activeSpriteCount];
      sprite.visible = true;
      this.activeSpriteCount++;
      return sprite;
    }
    const sprite = new Sprite();
    this.spritePool.push(sprite);
    this.container.addChild(sprite);
    this.activeSpriteCount++;
    return sprite;
  }
}
