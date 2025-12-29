import { Container } from "pixi.js";

/**
 * Layer names in render order (bottom to top)
 */
export enum RenderLayer {
  /** Terrain tiles (grass, water, etc.) */
  TERRAIN = "terrain",
  /** Ground decorations (flowers, rocks, etc.) */
  GROUND_DECOR = "groundDecor",
  /** Buildings and resources (trees, gold, etc.) */
  BUILDINGS = "buildings",
  /** Units (villagers, military, etc.) */
  UNITS = "units",
  /** Projectiles (arrows, catapult stones, etc.) */
  PROJECTILES = "projectiles",
  /** Effects (explosions, dust, blood, etc.) */
  EFFECTS = "effects",
  /** Selection indicators and UI overlays */
  UI_OVERLAY = "uiOverlay",
}

/** Layer render order from bottom to top */
const LAYER_ORDER: RenderLayer[] = [
  RenderLayer.TERRAIN,
  RenderLayer.GROUND_DECOR,
  RenderLayer.BUILDINGS,
  RenderLayer.UNITS,
  RenderLayer.PROJECTILES,
  RenderLayer.EFFECTS,
  RenderLayer.UI_OVERLAY,
];

/**
 * Manages separate PixiJS containers for different rendering layers.
 * Allows selective updates and proper z-ordering without sorting.
 */
export class LayerManager {
  private root: Container;
  private layers: Map<RenderLayer, Container>;

  constructor() {
    this.root = new Container();
    this.root.label = "LayerManager";
    this.layers = new Map();

    // Create containers in render order
    for (const layerName of LAYER_ORDER) {
      const container = new Container();
      container.label = layerName;
      this.layers.set(layerName, container);
      this.root.addChild(container);
    }
  }

  /** Get the root container (add this to app.stage) */
  public getRoot(): Container {
    return this.root;
  }

  /** Get a specific layer container */
  public getLayer(layer: RenderLayer): Container {
    const container = this.layers.get(layer);
    if (!container) {
      throw new Error(`Layer ${layer} not found`);
    }
    return container;
  }

  /** Clear all children from a specific layer */
  public clearLayer(layer: RenderLayer): void {
    const container = this.getLayer(layer);
    container.removeChildren();
  }

  /** Clear all layers */
  public clearAll(): void {
    for (const layer of LAYER_ORDER) {
      this.clearLayer(layer);
    }
  }

  /** Set visibility of a layer (for zoom-based culling) */
  public setLayerVisible(layer: RenderLayer, visible: boolean): void {
    this.getLayer(layer).visible = visible;
  }

  /** Check if a layer is visible */
  public isLayerVisible(layer: RenderLayer): boolean {
    return this.getLayer(layer).visible;
  }

  /** Apply camera transform to root container */
  public applyCamera(
    screenWidth: number,
    screenHeight: number,
    cameraX: number,
    cameraY: number,
    zoom: number
  ): void {
    this.root.x = screenWidth / 2 - cameraX * zoom;
    this.root.y = screenHeight / 2 - cameraY * zoom;
    this.root.scale.set(zoom);
  }
}
