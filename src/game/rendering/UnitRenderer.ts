import { Container, Graphics } from 'pixi.js';
import { tileToScreen } from './isometric';
import { Camera } from './Camera';
import { ZOOM_THRESHOLDS, ENTITY_LIMITS, TILE_WIDTH, COLORS } from '../constants';
import type { Unit } from '../types';

const PLAYER_COLORS: Record<number, number> = {
  1: COLORS.PLAYER_1,
  2: COLORS.PLAYER_2,
  3: COLORS.PLAYER_3,
  4: COLORS.PLAYER_4,
};

const UNIT_SIZE = TILE_WIDTH * 0.3;
const HEALTH_BAR_WIDTH = TILE_WIDTH * 0.4;
const HEALTH_BAR_HEIGHT = 3;
const HEALTH_BAR_OFFSET_Y = -UNIT_SIZE - 6;

export class UnitRenderer {
  private container: Container;
  private graphics: Graphics;

  constructor(container: Container) {
    this.container = container;
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  render(units: Unit[], camera: Camera, selectedIds: Set<string>): void {
    this.graphics.clear();

    if (camera.zoom < ZOOM_THRESHOLDS.HIDE_SMALL_ENTITIES) return;

    const bounds = camera.getVisibleBounds();
    const margin = TILE_WIDTH;
    let count = 0;

    for (const unit of units) {
      if (count >= ENTITY_LIMITS.MAX_VISIBLE_UNITS) break;

      const pos = tileToScreen(unit.position.x, unit.position.y);

      if (
        pos.x < bounds.minX - margin || pos.x > bounds.maxX + margin ||
        pos.y < bounds.minY - margin || pos.y > bounds.maxY + margin
      ) continue;

      const color = PLAYER_COLORS[unit.owner] ?? COLORS.GAIA;
      const isSelected = selectedIds.has(unit.id);

      this.drawUnit(pos.x, pos.y, color, unit, isSelected);
      count++;
    }
  }

  private drawUnit(
    x: number,
    y: number,
    color: number,
    unit: Unit,
    isSelected: boolean,
  ): void {
    const s = UNIT_SIZE;

    if (isSelected) {
      this.graphics.ellipse(x, y + s * 0.15, s * 0.7, s * 0.35);
      this.graphics.stroke({ width: 2, color: 0x00ff00, alpha: 0.9 });
    }

    // Diamond body
    this.graphics
      .moveTo(x, y - s)
      .lineTo(x + s * 0.5, y)
      .lineTo(x, y + s * 0.3)
      .lineTo(x - s * 0.5, y)
      .closePath()
      .fill(color)
      .stroke({ width: 1, color: 0x000000 });

    // Directional indicator (small triangle pointing "south")
    const triSize = s * 0.18;
    this.graphics
      .moveTo(x, y + s * 0.3 + 1)
      .lineTo(x + triSize, y + s * 0.3 + triSize + 1)
      .lineTo(x - triSize, y + s * 0.3 + triSize + 1)
      .closePath()
      .fill(color);

    // Health bar
    if (unit.health < unit.maxHealth) {
      const ratio = unit.health / unit.maxHealth;
      const barX = x - HEALTH_BAR_WIDTH / 2;
      const barY = y + HEALTH_BAR_OFFSET_Y;
      const barColor = ratio > 0.5 ? 0x2ecc71 : ratio > 0.25 ? 0xf39c12 : 0xe74c3c;

      // Background
      this.graphics.rect(barX, barY, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT);
      this.graphics.fill({ color: 0x000000, alpha: 0.6 });

      // Fill
      this.graphics.rect(barX, barY, HEALTH_BAR_WIDTH * ratio, HEALTH_BAR_HEIGHT);
      this.graphics.fill(barColor);
    }
  }

  getContainer(): Container {
    return this.container;
  }

  /** Screen-space hit test: returns the nearest unit within a hit radius */
  hitTest(
    screenX: number,
    screenY: number,
    units: Unit[],
    camera: Camera,
    hitRadius: number = TILE_WIDTH * 0.4,
  ): Unit | null {
    let best: Unit | null = null;
    let bestDist = Infinity;

    for (const unit of units) {
      const pos = tileToScreen(unit.position.x, unit.position.y);
      const sx = camera.worldToScreenX(pos.x);
      const sy = camera.worldToScreenY(pos.y - UNIT_SIZE * 0.35);
      const dx = screenX - sx;
      const dy = screenY - sy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < hitRadius && dist < bestDist) {
        bestDist = dist;
        best = unit;
      }
    }
    return best;
  }

  /** Returns all units whose world positions fall inside a screen-space box */
  boxSelect(
    screenMinX: number,
    screenMinY: number,
    screenMaxX: number,
    screenMaxY: number,
    units: Unit[],
    camera: Camera,
  ): Unit[] {
    const result: Unit[] = [];
    for (const unit of units) {
      const pos = tileToScreen(unit.position.x, unit.position.y);
      const sx = camera.worldToScreenX(pos.x);
      const sy = camera.worldToScreenY(pos.y);
      if (sx >= screenMinX && sx <= screenMaxX && sy >= screenMinY && sy <= screenMaxY) {
        result.push(unit);
      }
    }
    return result;
  }
}
