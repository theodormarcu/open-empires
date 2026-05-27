import { Graphics } from 'pixi.js';
import type { Unit } from './types';
import { UnitRenderer } from './rendering/UnitRenderer';
import { Camera } from './rendering/Camera';

const DRAG_THRESHOLD = 4;

export class SelectionManager {
  public readonly selectedIds: Set<string> = new Set();

  private overlayGraphics: Graphics;
  private unitRenderer: UnitRenderer;
  private camera: Camera;

  private mouseDownX = 0;
  private mouseDownY = 0;
  private isDragging = false;
  private isBoxSelecting = false;
  private currentMouseX = 0;
  private currentMouseY = 0;
  private shiftHeld = false;

  constructor(
    overlayGraphics: Graphics,
    unitRenderer: UnitRenderer,
    camera: Camera,
  ) {
    this.overlayGraphics = overlayGraphics;
    this.unitRenderer = unitRenderer;
    this.camera = camera;
  }

  onMouseDown(screenX: number, screenY: number, button: number, shiftKey: boolean): void {
    if (button !== 0) return;
    this.mouseDownX = screenX;
    this.mouseDownY = screenY;
    this.currentMouseX = screenX;
    this.currentMouseY = screenY;
    this.isDragging = true;
    this.isBoxSelecting = false;
    this.shiftHeld = shiftKey;
  }

  onMouseMove(screenX: number, screenY: number): void {
    if (!this.isDragging) return;
    this.currentMouseX = screenX;
    this.currentMouseY = screenY;

    const dx = screenX - this.mouseDownX;
    const dy = screenY - this.mouseDownY;
    if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
      this.isBoxSelecting = true;
    }
  }

  onMouseUp(screenX: number, screenY: number, units: Unit[]): boolean {
    if (!this.isDragging) return false;
    this.isDragging = false;

    const dx = screenX - this.mouseDownX;
    const dy = screenY - this.mouseDownY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= DRAG_THRESHOLD) {
      this.handleClick(screenX, screenY, units);
    } else if (this.isBoxSelecting) {
      this.handleBoxSelect(units);
    }

    this.isBoxSelecting = false;
    return true;
  }

  cancelDrag(): void {
    this.isDragging = false;
    this.isBoxSelecting = false;
    this.overlayGraphics.clear();
  }

  renderBoxSelect(): void {
    this.overlayGraphics.clear();
    if (!this.isBoxSelecting) return;

    const x1 = this.camera.screenToWorldX(Math.min(this.mouseDownX, this.currentMouseX));
    const y1 = this.camera.screenToWorldY(Math.min(this.mouseDownY, this.currentMouseY));
    const x2 = this.camera.screenToWorldX(Math.max(this.mouseDownX, this.currentMouseX));
    const y2 = this.camera.screenToWorldY(Math.max(this.mouseDownY, this.currentMouseY));

    this.overlayGraphics.rect(x1, y1, x2 - x1, y2 - y1);
    this.overlayGraphics.fill({ color: 0x00ff00, alpha: 0.15 });
    this.overlayGraphics.stroke({ width: 1, color: 0x00ff00, alpha: 0.8 });
  }

  private handleClick(screenX: number, screenY: number, units: Unit[]): void {
    const hit = this.unitRenderer.hitTest(screenX, screenY, units, this.camera);

    if (hit) {
      if (this.shiftHeld) {
        if (this.selectedIds.has(hit.id)) {
          this.selectedIds.delete(hit.id);
        } else {
          this.selectedIds.add(hit.id);
        }
      } else {
        this.selectedIds.clear();
        this.selectedIds.add(hit.id);
      }
    } else {
      if (!this.shiftHeld) {
        this.selectedIds.clear();
      }
    }
  }

  private handleBoxSelect(units: Unit[]): void {
    const minX = Math.min(this.mouseDownX, this.currentMouseX);
    const minY = Math.min(this.mouseDownY, this.currentMouseY);
    const maxX = Math.max(this.mouseDownX, this.currentMouseX);
    const maxY = Math.max(this.mouseDownY, this.currentMouseY);

    const hits = this.unitRenderer.boxSelect(minX, minY, maxX, maxY, units, this.camera);

    if (!this.shiftHeld) {
      this.selectedIds.clear();
    }
    for (const u of hits) {
      this.selectedIds.add(u.id);
    }
  }
}
