# Adding Sprite Sheets to OpenEmpires

This guide explains how to add sprite sheets for units, buildings, and terrain to OpenEmpires.

## Project Structure

```
src/
├── game/
│   ├── constants.ts          # Tile dimensions, entity limits
│   ├── types.ts              # Entity, Unit, Building interfaces
│   └── rendering/
│       ├── LayerManager.ts   # Render layers (terrain, buildings, units, etc.)
│       ├── Tilemap.ts        # Terrain rendering
│       └── isometric.ts      # Coordinate conversion
├── components/
│   └── game/
│       └── GameCanvas.tsx    # Main PixiJS canvas
└── public/
    └── assets/               # Sprite sheets go here
```

## Overview

Adding sprites involves:
1. **Prepare sprite sheet** — Place PNG in `/public/assets/`
2. **Create sprite loader** — Load textures via PixiJS
3. **Define entity types** — Add to `src/game/types.ts`
4. **Create renderer** — Render sprites to appropriate layer
5. **Register with LayerManager** — Add to correct render layer

---

## Step 1: Prepare the Sprite Sheet

Place sprite sheet PNG in `/public/assets/`.

**Naming convention:**
- Units: `units_<civilization>.png` (e.g., `units_britons.png`)
- Buildings: `buildings_<civilization>.png`
- Terrain: `terrain_<tileset>.png`

**Sprite sheet format:**
- Grid-based layout (e.g., 8 columns × 16 rows)
- Each cell is typically 64×64 or 128×128 pixels
- Transparent background (PNG with alpha)

---

## Step 2: Create Sprite Loader

Create a new file `src/game/rendering/SpriteLoader.ts`:

```typescript
import { Assets, Texture, Spritesheet } from "pixi.js";

export interface SpriteConfig {
  path: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
}

export class SpriteLoader {
  private textures: Map<string, Texture> = new Map();
  private spritesheets: Map<string, Spritesheet> = new Map();

  async loadSpritesheet(name: string, config: SpriteConfig): Promise<void> {
    const texture = await Assets.load(config.path);
    
    // Generate frame data
    const frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }> = {};
    
    for (let row = 0; row < config.rows; row++) {
      for (let col = 0; col < config.columns; col++) {
        const frameId = `${name}_${row}_${col}`;
        frames[frameId] = {
          frame: {
            x: col * config.frameWidth,
            y: row * config.frameHeight,
            w: config.frameWidth,
            h: config.frameHeight,
          },
        };
      }
    }

    const spritesheet = new Spritesheet(texture, {
      frames,
      meta: { scale: 1 },
    });
    
    await spritesheet.parse();
    this.spritesheets.set(name, spritesheet);
  }

  getFrame(sheetName: string, row: number, col: number): Texture | null {
    const sheet = this.spritesheets.get(sheetName);
    if (!sheet) return null;
    return sheet.textures[`${sheetName}_${row}_${col}`] || null;
  }
}
```

---

## Step 3: Define Entity Types

In `src/game/types.ts`, add your entity definitions:

```typescript
export type UnitType = 
  | "villager"
  | "militia"
  | "archer"
  | "knight";

export type BuildingType =
  | "town_center"
  | "house"
  | "barracks"
  | "mill";

export interface SpriteDefinition {
  sheet: string;      // Spritesheet name
  row: number;        // Row in sprite grid
  col: number;        // Column in sprite grid
  width?: number;     // Override frame width (for multi-tile)
  height?: number;    // Override frame height
  offsetX?: number;   // Render offset X
  offsetY?: number;   // Render offset Y
}

// Map unit types to sprite positions
export const UNIT_SPRITES: Record<UnitType, SpriteDefinition> = {
  villager: { sheet: "units", row: 0, col: 0 },
  militia: { sheet: "units", row: 0, col: 1 },
  archer: { sheet: "units", row: 0, col: 2 },
  knight: { sheet: "units", row: 0, col: 3 },
};

// Map building types to sprite positions
export const BUILDING_SPRITES: Record<BuildingType, SpriteDefinition> = {
  town_center: { sheet: "buildings", row: 0, col: 0, offsetY: -32 },
  house: { sheet: "buildings", row: 0, col: 1 },
  barracks: { sheet: "buildings", row: 0, col: 2, offsetY: -16 },
  mill: { sheet: "buildings", row: 0, col: 3 },
};
```

---

## Step 4: Create Entity Renderer

Create `src/game/rendering/EntityRenderer.ts`:

```typescript
import { Container, Sprite } from "pixi.js";
import { SpriteLoader } from "./SpriteLoader";
import { UNIT_SPRITES, BUILDING_SPRITES, Entity } from "../types";
import { tileToScreen } from "./isometric";
import { ZOOM_THRESHOLDS, ENTITY_LIMITS } from "../constants";
import { Camera } from "./Camera";

export class EntityRenderer {
  private container: Container;
  private spriteLoader: SpriteLoader;
  private spritePool: Sprite[] = [];

  constructor(container: Container, spriteLoader: SpriteLoader) {
    this.container = container;
    this.spriteLoader = spriteLoader;
  }

  render(entities: Map<string, Entity>, camera: Camera): void {
    // Clear previous sprites (return to pool)
    this.container.removeChildren();

    // Skip rendering small entities when zoomed out
    if (camera.zoom < ZOOM_THRESHOLDS.HIDE_SMALL_ENTITIES) {
      return;
    }

    const bounds = camera.getVisibleBounds();
    let renderedCount = 0;

    for (const entity of entities.values()) {
      // Enforce entity limits
      if (renderedCount >= ENTITY_LIMITS.MAX_VISIBLE_UNITS) break;

      const screenPos = tileToScreen(entity.tileX, entity.tileY);
      
      // Frustum culling - skip entities outside viewport
      if (
        screenPos.x < bounds.minX - 64 ||
        screenPos.x > bounds.maxX + 64 ||
        screenPos.y < bounds.minY - 64 ||
        screenPos.y > bounds.maxY + 64
      ) {
        continue;
      }

      // Get sprite definition
      const spriteDef = entity.type === "unit" 
        ? UNIT_SPRITES[entity.unitType]
        : BUILDING_SPRITES[entity.buildingType];

      if (!spriteDef) continue;

      // Get or create sprite
      const texture = this.spriteLoader.getFrame(spriteDef.sheet, spriteDef.row, spriteDef.col);
      if (!texture) continue;

      const sprite = this.getSprite();
      sprite.texture = texture;
      sprite.x = screenPos.x + (spriteDef.offsetX || 0);
      sprite.y = screenPos.y + (spriteDef.offsetY || 0);
      sprite.anchor.set(0.5, 1); // Anchor at bottom center

      this.container.addChild(sprite);
      renderedCount++;
    }
  }

  private getSprite(): Sprite {
    // Reuse sprites from pool to reduce GC
    if (this.spritePool.length > 0) {
      return this.spritePool.pop()!;
    }
    return new Sprite();
  }
}
```

---

## Step 5: Register with LayerManager

In `GameCanvas.tsx`, integrate the entity renderer:

```typescript
import { LayerManager, RenderLayer } from "@/game/rendering";
import { SpriteLoader } from "@/game/rendering/SpriteLoader";
import { EntityRenderer } from "@/game/rendering/EntityRenderer";

// In initPixi():
const layers = new LayerManager();
const spriteLoader = new SpriteLoader();

// Load sprite sheets
await spriteLoader.loadSpritesheet("units", {
  path: "/assets/units.png",
  frameWidth: 64,
  frameHeight: 64,
  columns: 8,
  rows: 16,
});

await spriteLoader.loadSpritesheet("buildings", {
  path: "/assets/buildings.png",
  frameWidth: 128,
  frameHeight: 128,
  columns: 8,
  rows: 8,
});

// Create renderers for each layer
const unitRenderer = new EntityRenderer(
  layers.getLayer(RenderLayer.UNITS),
  spriteLoader
);

const buildingRenderer = new EntityRenderer(
  layers.getLayer(RenderLayer.BUILDINGS),
  spriteLoader
);

// In game loop:
app.ticker.add(() => {
  // ... camera updates ...
  
  buildingRenderer.render(game.getBuildings(), camera);
  unitRenderer.render(game.getUnits(), camera);
});
```

---

## Render Layers

Use the appropriate layer from `LayerManager`:

| Layer | Use For |
|-------|---------|
| `TERRAIN` | Ground tiles (grass, water, etc.) |
| `GROUND_DECOR` | Flowers, rocks, footprints |
| `BUILDINGS` | Buildings, trees, resources |
| `UNITS` | Villagers, military units |
| `PROJECTILES` | Arrows, catapult stones |
| `EFFECTS` | Explosions, blood, dust |
| `UI_OVERLAY` | Selection boxes, health bars |

---

## Quick Checklist

- [ ] Add sprite sheet PNG to `/public/assets/`
- [ ] Create `SpriteLoader.ts` (if not exists)
- [ ] Define entity types in `types.ts`
- [ ] Add sprite definitions (`UNIT_SPRITES`, `BUILDING_SPRITES`)
- [ ] Create entity renderer class
- [ ] Load spritesheets in `GameCanvas.tsx`
- [ ] Register renderer with appropriate `RenderLayer`
- [ ] Test with `npm run dev`

---

## Performance Tips

1. **Use sprite pooling** — Reuse `Sprite` objects instead of creating new ones
2. **Frustum culling** — Skip entities outside viewport bounds
3. **Zoom-based culling** — Hide small entities when zoomed out (use `ZOOM_THRESHOLDS`)
4. **Entity limits** — Enforce max visible entities (use `ENTITY_LIMITS`)
5. **Batch rendering** — PixiJS batches sprites with same texture automatically

---

## Troubleshooting

### Sprites not visible
- Check sprite sheet path is correct
- Verify `frameWidth`/`frameHeight` match your sprite sheet
- Check entity is within camera bounds
- Ensure sprite is added to correct render layer

### Wrong sprite displayed
- Verify row/col indices are correct (0-indexed)
- Check sprite sheet layout matches your config

### Performance issues
- Enable zoom-based culling
- Reduce `ENTITY_LIMITS` for mobile
- Ensure sprite pooling is working
- Check for entities outside viewport being rendered