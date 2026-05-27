import { Graphics } from "pixi.js";
import { tileToScreen } from "./rendering/isometric";
import { Camera } from "./rendering/Camera";
import type { Unit } from "./types";

const HIT_RADIUS = 20;

export class SelectionManager {
  public readonly selectedIds: Set<string> = new Set();

  private boxGraphics: Graphics;
  private isBoxSelecting: boolean = false;
  private boxStartScreenX: number = 0;
  private boxStartScreenY: number = 0;
  private boxEndScreenX: number = 0;
  private boxEndScreenY: number = 0;

  constructor(overlayGraphics: Graphics) {
    this.boxGraphics = overlayGraphics;
  }

  /** Click-select: find nearest unit within hit radius of the screen-space click. */
  clickSelect(
    screenX: number,
    screenY: number,
    units: Unit[],
    camera: Camera,
    shiftKey: boolean
  ): void {
    let bestUnit: Unit | null = null;
    let bestDist = HIT_RADIUS;

    for (const unit of units) {
      const world = tileToScreen(unit.position.x, unit.position.y);
      const sx = camera.worldToScreenX(world.x);
      const sy = camera.worldToScreenY(world.y);
      const dx = sx - screenX;
      const dy = sy - screenY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) {
        bestDist = dist;
        bestUnit = unit;
      }
    }

    if (shiftKey) {
      if (bestUnit) {
        if (this.selectedIds.has(bestUnit.id)) {
          this.selectedIds.delete(bestUnit.id);
        } else {
          this.selectedIds.add(bestUnit.id);
        }
      }
    } else {
      this.selectedIds.clear();
      if (bestUnit) {
        this.selectedIds.add(bestUnit.id);
      }
    }
  }

  /** Begin a box-select drag. */
  beginBox(screenX: number, screenY: number): void {
    this.isBoxSelecting = true;
    this.boxStartScreenX = screenX;
    this.boxStartScreenY = screenY;
    this.boxEndScreenX = screenX;
    this.boxEndScreenY = screenY;
  }

  /** Update the box-select rectangle while dragging. */
  updateBox(screenX: number, screenY: number): void {
    if (!this.isBoxSelecting) return;
    this.boxEndScreenX = screenX;
    this.boxEndScreenY = screenY;
  }

  /** Finish box-select: select all units whose screen positions fall inside the box. */
  endBox(
    units: Unit[],
    camera: Camera,
    shiftKey: boolean
  ): void {
    if (!this.isBoxSelecting) return;
    this.isBoxSelecting = false;

    const minX = Math.min(this.boxStartScreenX, this.boxEndScreenX);
    const maxX = Math.max(this.boxStartScreenX, this.boxEndScreenX);
    const minY = Math.min(this.boxStartScreenY, this.boxEndScreenY);
    const maxY = Math.max(this.boxStartScreenY, this.boxEndScreenY);

    if (!shiftKey) {
      this.selectedIds.clear();
    }

    for (const unit of units) {
      const world = tileToScreen(unit.position.x, unit.position.y);
      const sx = camera.worldToScreenX(world.x);
      const sy = camera.worldToScreenY(world.y);
      if (sx >= minX && sx <= maxX && sy >= minY && sy <= maxY) {
        this.selectedIds.add(unit.id);
      }
    }

    this.boxGraphics.clear();
  }

  /** Draw the box-select rectangle on the UI overlay. */
  renderBox(camera: Camera): void {
    this.boxGraphics.clear();
    if (!this.isBoxSelecting) return;

    // Convert screen coords back to world for drawing on the overlay layer
    const worldX1 = camera.screenToWorldX(this.boxStartScreenX);
    const worldY1 = camera.screenToWorldY(this.boxStartScreenY);
    const worldX2 = camera.screenToWorldX(this.boxEndScreenX);
    const worldY2 = camera.screenToWorldY(this.boxEndScreenY);

    const x = Math.min(worldX1, worldX2);
    const y = Math.min(worldY1, worldY2);
    const w = Math.abs(worldX2 - worldX1);
    const h = Math.abs(worldY2 - worldY1);

    this.boxGraphics
      .rect(x, y, w, h)
      .fill({ color: 0x00ff00, alpha: 0.15 })
      .stroke({ width: 1 / camera.zoom, color: 0x00ff00, alpha: 0.8 });
  }

  /** Clear all selections. */
  clearSelection(): void {
    this.selectedIds.clear();
  }

  get isSelecting(): boolean {
    return this.isBoxSelecting;
  }
}
