import { Container, Graphics } from 'pixi.js';
import { tileToScreen } from './isometric';
import { Camera } from './Camera';
import { ZOOM_THRESHOLDS, ENTITY_LIMITS, COLORS, TILE_WIDTH } from '../constants';
import type { Unit } from '../types';

const PLAYER_COLORS: Record<number, number> = {
  1: COLORS.PLAYER_1,
  2: COLORS.PLAYER_2,
  3: COLORS.PLAYER_3,
  4: COLORS.PLAYER_4,
};

const UNIT_SIZE = TILE_WIDTH * 0.3;
const HEALTH_BAR_WIDTH = UNIT_SIZE * 1.2;
const HEALTH_BAR_HEIGHT = 3;

export class UnitRenderer {
  private container: Container;
  private graphics: Graphics;

  constructor(container: Container) {
    this.container = container;
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  render(units: Unit[], camera: Camera): void {
    this.graphics.clear();

    if (camera.zoom < ZOOM_THRESHOLDS.HIDE_SMALL_ENTITIES) return;

    const bounds = camera.getVisibleBounds();
    const padding = 64;
    let count = 0;

    for (const unit of units) {
      if (count >= ENTITY_LIMITS.MAX_VISIBLE_UNITS) break;

      const pos = tileToScreen(unit.position.x, unit.position.y);

      if (
        pos.x < bounds.minX - padding || pos.x > bounds.maxX + padding ||
        pos.y < bounds.minY - padding || pos.y > bounds.maxY + padding
      ) continue;

      const color = PLAYER_COLORS[unit.owner] ?? COLORS.GAIA;
      this.drawUnit(pos.x, pos.y, color);
      this.drawHealthBar(pos.x, pos.y, unit.health / unit.maxHealth);
      count++;
    }
  }

  private drawUnit(x: number, y: number, color: number): void {
    // Diamond body (isometric style)
    this.graphics
      .moveTo(x, y - UNIT_SIZE)
      .lineTo(x + UNIT_SIZE * 0.5, y)
      .lineTo(x, y + UNIT_SIZE * 0.3)
      .lineTo(x - UNIT_SIZE * 0.5, y)
      .closePath()
      .fill(color)
      .stroke({ width: 1, color: 0x000000 });

    // Directional indicator (small triangle pointing right)
    this.graphics
      .moveTo(x + UNIT_SIZE * 0.3, y - UNIT_SIZE * 0.2)
      .lineTo(x + UNIT_SIZE * 0.5, y - UNIT_SIZE * 0.1)
      .lineTo(x + UNIT_SIZE * 0.3, y)
      .closePath()
      .fill({ color: 0xffffff, alpha: 0.6 });
  }

  private drawHealthBar(x: number, y: number, ratio: number): void {
    const barX = x - HEALTH_BAR_WIDTH / 2;
    const barY = y - UNIT_SIZE - 6;

    // Background (red)
    this.graphics.rect(barX, barY, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT).fill(0xff0000);
    // Health fill (green)
    this.graphics.rect(barX, barY, HEALTH_BAR_WIDTH * ratio, HEALTH_BAR_HEIGHT).fill(0x00ff00);
    // Border
    this.graphics.rect(barX, barY, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT).stroke({ width: 0.5, color: 0x000000 });
  }
}
