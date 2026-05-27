import { Container, Graphics } from 'pixi.js';
import { tileToScreen } from './rendering/isometric';
import { Camera } from './rendering/Camera';
import { TILE_WIDTH, ENTITY_LIMITS } from './constants';
import type { Unit } from './types';

const HIT_RADIUS = 20;
const DRAG_THRESHOLD = 4;

export class SelectionManager {
  private selectedIds: Set<string> = new Set();
  private selectionGraphics: Graphics;
  private boxGraphics: Graphics;

  private dragging = false;
  private dragStartScreenX = 0;
  private dragStartScreenY = 0;
  private dragCurrentScreenX = 0;
  private dragCurrentScreenY = 0;
  private pastThreshold = false;

  constructor(overlayContainer: Container) {
    this.selectionGraphics = new Graphics();
    this.boxGraphics = new Graphics();
    overlayContainer.addChild(this.selectionGraphics);
    overlayContainer.addChild(this.boxGraphics);
  }

  // ── Input handlers ──────────────────────────────────────────────────

  handleMouseDown(screenX: number, screenY: number): void {
    this.dragging = true;
    this.dragStartScreenX = screenX;
    this.dragStartScreenY = screenY;
    this.dragCurrentScreenX = screenX;
    this.dragCurrentScreenY = screenY;
    this.pastThreshold = false;
  }

  handleMouseMove(screenX: number, screenY: number): void {
    if (!this.dragging) return;
    this.dragCurrentScreenX = screenX;
    this.dragCurrentScreenY = screenY;

    const dx = screenX - this.dragStartScreenX;
    const dy = screenY - this.dragStartScreenY;
    if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
      this.pastThreshold = true;
    }
  }

  handleMouseUp(
    screenX: number,
    screenY: number,
    shiftKey: boolean,
    units: Unit[],
    camera: Camera,
  ): void {
    if (!this.dragging) return;
    this.dragging = false;

    if (this.pastThreshold) {
      this.boxSelect(units, camera, shiftKey);
    } else {
      this.clickSelect(screenX, screenY, units, camera, shiftKey);
    }

    this.boxGraphics.clear();
    this.pastThreshold = false;
  }

  // ── Selection logic ─────────────────────────────────────────────────

  private clickSelect(
    screenX: number,
    screenY: number,
    units: Unit[],
    camera: Camera,
    shiftKey: boolean,
  ): void {
    const worldX = camera.screenToWorldX(screenX);
    const worldY = camera.screenToWorldY(screenY);

    let nearest: Unit | null = null;
    let nearestDist = HIT_RADIUS;

    for (const unit of units) {
      const pos = tileToScreen(unit.position.x, unit.position.y);
      const dx = pos.x - worldX;
      const dy = pos.y - worldY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = unit;
      }
    }

    if (nearest) {
      if (shiftKey) {
        if (this.selectedIds.has(nearest.id)) {
          this.selectedIds.delete(nearest.id);
        } else {
          this.selectedIds.add(nearest.id);
        }
      } else {
        this.selectedIds.clear();
        this.selectedIds.add(nearest.id);
      }
    } else if (!shiftKey) {
      this.selectedIds.clear();
    }
  }

  private boxSelect(units: Unit[], camera: Camera, shiftKey: boolean): void {
    const minX = Math.min(
      camera.screenToWorldX(this.dragStartScreenX),
      camera.screenToWorldX(this.dragCurrentScreenX),
    );
    const maxX = Math.max(
      camera.screenToWorldX(this.dragStartScreenX),
      camera.screenToWorldX(this.dragCurrentScreenX),
    );
    const minY = Math.min(
      camera.screenToWorldY(this.dragStartScreenY),
      camera.screenToWorldY(this.dragCurrentScreenY),
    );
    const maxY = Math.max(
      camera.screenToWorldY(this.dragStartScreenY),
      camera.screenToWorldY(this.dragCurrentScreenY),
    );

    if (!shiftKey) this.selectedIds.clear();

    for (const unit of units) {
      const pos = tileToScreen(unit.position.x, unit.position.y);
      if (pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY) {
        this.selectedIds.add(unit.id);
      }
    }
  }

  // ── Rendering ───────────────────────────────────────────────────────

  renderSelectionIndicators(units: Unit[], camera: Camera): void {
    this.selectionGraphics.clear();

    const bounds = camera.getVisibleBounds();
    const padding = 64;
    const radius = TILE_WIDTH * 0.25;
    let count = 0;

    for (const unit of units) {
      if (!this.selectedIds.has(unit.id)) continue;
      if (count >= ENTITY_LIMITS.MAX_SELECTION_HIGHLIGHTS) break;

      const pos = tileToScreen(unit.position.x, unit.position.y);
      if (
        pos.x < bounds.minX - padding || pos.x > bounds.maxX + padding ||
        pos.y < bounds.minY - padding || pos.y > bounds.maxY + padding
      ) continue;

      this.selectionGraphics
        .circle(pos.x, pos.y, radius)
        .stroke({ width: 2, color: 0x00ff00, alpha: 0.8 });
      count++;
    }
  }

  renderDragBox(camera: Camera): void {
    this.boxGraphics.clear();
    if (!this.dragging || !this.pastThreshold) return;

    const x1 = camera.screenToWorldX(this.dragStartScreenX);
    const y1 = camera.screenToWorldY(this.dragStartScreenY);
    const x2 = camera.screenToWorldX(this.dragCurrentScreenX);
    const y2 = camera.screenToWorldY(this.dragCurrentScreenY);

    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const w = Math.abs(x2 - x1);
    const h = Math.abs(y2 - y1);

    this.boxGraphics
      .rect(x, y, w, h)
      .fill({ color: 0x00ff00, alpha: 0.15 })
      .stroke({ width: 1, color: 0x00ff00, alpha: 0.6 });
  }

  // ── Queries ─────────────────────────────────────────────────────────

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  getSelectedIds(): ReadonlySet<string> {
    return this.selectedIds;
  }

  clear(): void {
    this.selectedIds.clear();
  }

  isDragActive(): boolean {
    return this.dragging && this.pastThreshold;
  }
}
