export class Camera {
  public x: number = 0;
  public y: number = 0;
  public zoom: number = 1;
  
  private minZoom: number = 0.25;
  private maxZoom: number = 2;
  private screenWidth: number;
  private screenHeight: number;

  constructor(screenWidth: number, screenHeight: number) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
  }

  public setScreenSize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  public pan(deltaX: number, deltaY: number): void {
    this.x -= deltaX / this.zoom;
    this.y -= deltaY / this.zoom;
  }

  public zoomAt(delta: number, screenX: number, screenY: number): void {
    const oldZoom = this.zoom;
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * (1 - delta * 0.001)));

    // Zoom toward mouse position
    const _worldX = this.screenToWorldX(screenX);
    const _worldY = this.screenToWorldY(screenY);
    
    this.x += (screenX - this.screenWidth / 2) * (1 / oldZoom - 1 / this.zoom);
    this.y += (screenY - this.screenHeight / 2) * (1 / oldZoom - 1 / this.zoom);
  }

  public centerOn(worldX: number, worldY: number): void {
    this.x = worldX;
    this.y = worldY;
  }

  public screenToWorldX(screenX: number): number {
    return (screenX - this.screenWidth / 2) / this.zoom + this.x;
  }

  public screenToWorldY(screenY: number): number {
    return (screenY - this.screenHeight / 2) / this.zoom + this.y;
  }

  public worldToScreenX(worldX: number): number {
    return (worldX - this.x) * this.zoom + this.screenWidth / 2;
  }

  public worldToScreenY(worldY: number): number {
    return (worldY - this.y) * this.zoom + this.screenHeight / 2;
  }

  public getVisibleBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    const halfWidth = (this.screenWidth / 2) / this.zoom;
    const halfHeight = (this.screenHeight / 2) / this.zoom;
    
    return {
      minX: this.x - halfWidth,
      minY: this.y - halfHeight,
      maxX: this.x + halfWidth,
      maxY: this.y + halfHeight,
    };
  }
}
