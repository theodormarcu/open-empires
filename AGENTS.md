# OpenEmpires

An Age of Empires II clone built for the browser.

## Project Goal

Recreate the core gameplay of Age of Empires II as a browser-based game, featuring:
- Isometric 2D graphics
- Real-time strategy mechanics
- Resource gathering (wood, food, gold, stone)
- Unit training and combat
- Building construction
- Technology research and ages

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Graphics | PixiJS (WebGL 2D) |
| Icons | Lucide React |

## Project Structure

```
src/
├── app/                    # Next.js pages
├── components/
│   └── game/
│       └── GameCanvas.tsx  # Main PixiJS canvas wrapper
├── game/
│   ├── Game.ts             # Core game loop and state
│   ├── types.ts            # TypeScript interfaces (Entity, Unit, Building, etc.)
│   ├── constants.ts        # Game constants (tile size, unit stats, etc.)
│   └── rendering/
│       ├── index.ts        # Barrel exports
│       ├── Camera.ts       # Viewport with pan/zoom
│       ├── Tilemap.ts      # Isometric terrain renderer
│       ├── LayerManager.ts # Multi-layer rendering (terrain, units, effects, etc.)
│       └── isometric.ts    # Coordinate conversion utilities
├── scripts/
│   └── generate-asset.ts   # AI sprite sheet generator (Gemini)
└── lib/
    └── utils.ts            # shadcn/ui utilities
```

## Current Status

- [x] Next.js + TypeScript project initialized
- [x] Tailwind CSS + shadcn/ui configured
- [x] PixiJS integrated and rendering
- [x] Basic game type definitions
- [x] Game constants defined
- [x] **Phase 1 complete**: Isometric rendering with camera controls

## Completed Work

### Phase 1: Core Rendering ✓
- [x] **Isometric math** (`rendering/isometric.ts`) — `tileToScreen()`, `screenToTile()` coordinate conversion
- [x] **Camera system** (`rendering/Camera.ts`) — Pan (drag), zoom (scroll wheel), viewport bounds
- [x] **Tilemap renderer** (`rendering/Tilemap.ts`) — 120x120 procedural map, terrain types, culling
- [x] **Terrain types** (`rendering/Tilemap.ts`) — Grass, water, sand, forest, stone
- [x] **Performance optimizations** (`rendering/Tilemap.ts`) — Direct visible tile range calculation via `screenToTile()`, skip re-render when camera idle, sprite pooling for efficient rendering
- [x] **Dev tools** (`rendering/PerformanceMonitor.ts`, `components/game/GameCanvas.tsx`) — FPS counter, frame time, lag spike detection (last 5s window). Overlay visible in dev mode only.

### Terrain Sprites ✓
- [x] **Sprite loading system** (`rendering/TerrainSprites.ts`) — Async loading via PixiJS `Assets.load()`, sprite sheet slicing into individual textures
- [x] **Sprite-based tilemap** (`rendering/Tilemap.ts`) — Replaced Graphics with pooled Sprites, fallback to colored diamonds for missing terrain types
- [x] **Removed color blending** — No longer needed with textured tiles; LOD system retained
- [x] **Grass terrain** (`public/assets/grass_terrain.png`) — 4x4 seamless tile variants (1024x1024, 256px cells)
- [x] **Water terrain** (`public/assets/water_terrain.png`) — Seamless water texture (1024x1024, 4x4 grid)
- [x] **Asset generator improvements** (`scripts/generate-asset.ts`) — Added `terrain` style for seamless rectangular tiles, improved `aoe` style with detailed AOE2:DE art direction

### Optional Isometric Enhancements (Future)
| Feature | Priority | Description |
|---------|----------|-------------|
| Tile elevation | Medium | Height levels for hills/cliffs |
| Transition tiles | Medium | Pre-made sprites for terrain edges/corners |
| Minimap | Medium | Overview map with camera viewport indicator |

## Progress Tracking

This document serves as the source of truth for project status. When working on features:
1. Move items from **Next Steps** to **Completed Work** when done
2. Use `- [x]` checkboxes for completed tasks, `- [ ]` for in-progress
3. Update the **Current Status** checklist at the top
4. Add implementation details (file paths, function names) to completed items

## Next Steps

### Phase 2: Entities
4. **Sprite loading** — Load sprite sheets for units/buildings
5. **Entity rendering** — Draw units and buildings on the map
6. **Selection system** — Click to select, drag to box-select

### Phase 3: Gameplay
7. **Pathfinding** — A* algorithm for unit movement
8. **Unit commands** — Move, attack, gather, build
9. **Resource system** — Gather and spend resources
10. **Building placement** — Place buildings with collision checks

### Phase 4: Combat & AI
11. **Combat system** — Attack, damage, death
12. **Unit production** — Train units from buildings
13. **Basic AI** — Enemy player with simple behavior

### Phase 5: Polish
14. **HUD/UI** — Resource bar, minimap, command panel
15. **Audio** — Sound effects and music
16. **Multiplayer** — WebSocket-based networking (optional)

## Development Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

### Asset Generation

```bash
# Generate AOE-style sprite sheet (requires GEMINI_API_KEY in .env.local)
npx tsx scripts/generate-asset.ts -p "medieval houses" -n houses -r 2 -c 2 --webp

# Multi-tile building (4x4 town center)
npx tsx scripts/generate-asset.ts -p "fortified town center" -n town_center -z 4x4 --webp

# Options:
#   -p, --prompt    Asset description
#   -n, --name      Output filename
#   -z, --size      Building footprint (1x1, 2x2, 3x3, 4x4)
#   -r, --rows      Sprite sheet rows
#   -c, --cols      Sprite sheet columns  
#   -g, --grid      Reference image for consistent angles
#   -w, --webp      Also output WebP (requires sharp)
```

## Design Principles

- **Pure PixiJS** — No additional game engine abstractions
- **Type-safe** — Leverage TypeScript for all game logic
- **Component-based** — React for UI, PixiJS for game rendering
- **Performance** — Batch rendering, culling off-screen entities

## Technical Notes

### Why PixiJS over alternatives?
- **Raw Canvas**: Would require reimplementing sprite batching, texture atlases — PixiJS handles this
- **Phaser 3**: Full game engine (~1MB), overkill for RTS where we need custom pathfinding, selection, etc.
- **PixiJS**: Lightweight (~300KB), WebGL sprite batching, lets us own the game logic

### PixiJS v8 API
This project uses **PixiJS v8** which has breaking changes from v7:
```typescript
// v8 Graphics API - stroke/fill options go in the method call
graphics.rect(x, y, w, h);
graphics.fill(0x3498db);
graphics.stroke({ width: 2, color: 0xffffff });

// v8 Application init is async
const app = new Application();
await app.init({ background: "#1a1a2e", resizeTo: container });
```

### Isometric Coordinates
- Tile dimensions: 64×32 (2:1 ratio for isometric)
- `tileToScreen(x, y)` — converts tile coords to screen pixels
- `screenToTile(x, y)` — converts screen pixels to tile coords
- Origin (0,0) is top of the diamond-shaped map

## Learnings from Reference Projects

Analysis of [isometric-city](https://github.com/amilich/isometric-city) (SimCity-style city builder).

### Adopt
- [ ] **Typed-array pathfinding** — Use `Int16Array`/`Uint8Array` for BFS queues instead of objects to eliminate GC pauses during unit movement
- [ ] **Zoom-based entity culling** — Hide small entities (units, effects) when zoomed out past thresholds (e.g., `UNIT_MIN_ZOOM = 0.4`)
- [x] **Render skip logic** — Implemented in `rendering/Tilemap.ts`. Enhanced idle detection with `idleFrameCount`, configurable thresholds via `RENDER_SKIP` constants. Skips re-render after 3 idle frames if camera delta < 16px (desktop) or 32px (mobile).
- [x] **Mobile-specific limits** — Implemented in `constants.ts`. Added `IS_MOBILE` detection, `ZOOM_THRESHOLDS` (LOD), `ENTITY_LIMITS` (max units/particles), and `RENDER_SKIP` constants with platform-specific values.

### Consider
- [x] **Multi-layer rendering** — Implemented in `rendering/LayerManager.ts`. Seven separate containers: terrain, groundDecor, buildings, units, projectiles, effects, uiOverlay. Camera transform applied to root container once via `applyCamera()`.
- [ ] **Entity state machines** — Well-defined state enums for unit behaviors (idle, moving, attacking, gathering, etc.)
- [ ] **Particle systems** — Reusable wake/smoke/contrail patterns for visual effects
