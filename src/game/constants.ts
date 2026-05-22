// Game constants

// ============================================================================
// Platform Detection
// ============================================================================

/** Detect if running on a mobile device (cached at module load) */
export const IS_MOBILE: boolean = typeof window !== 'undefined' && (
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
  ('ontouchstart' in window && navigator.maxTouchPoints > 0)
);

// ============================================================================
// Rendering Performance Limits
// ============================================================================

/** Zoom thresholds for LOD (Level of Detail) */
export const ZOOM_THRESHOLDS = {
  /** Below this zoom, use simple tile rendering (no blending) */
  SIMPLE_TILES: 0.6,
  /** Below this zoom, hide small entities (units, decorations) */
  HIDE_SMALL_ENTITIES: IS_MOBILE ? 0.45 : 0.4,
  /** Below this zoom, hide particle effects */
  HIDE_PARTICLES: IS_MOBILE ? 0.5 : 0.35,
  /** Below this zoom, reduce selection indicator detail */
  SIMPLE_SELECTION: 0.5,
} as const;

/** Entity limits based on platform */
export const ENTITY_LIMITS = {
  /** Maximum units rendered at once */
  MAX_VISIBLE_UNITS: IS_MOBILE ? 100 : 500,
  /** Maximum particles per effect system */
  MAX_PARTICLES: IS_MOBILE ? 50 : 200,
  /** Maximum projectiles rendered */
  MAX_PROJECTILES: IS_MOBILE ? 30 : 100,
  /** Maximum selection highlights */
  MAX_SELECTION_HIGHLIGHTS: IS_MOBILE ? 20 : 50,
} as const;

/** Render skip thresholds - skip re-render if camera movement below these */
export const RENDER_SKIP = {
  /** Minimum camera movement (in world units) to trigger tilemap re-render */
  MIN_CAMERA_DELTA: IS_MOBILE ? 32 : 16,
  /** Minimum zoom change to trigger re-render */
  MIN_ZOOM_DELTA: 0.01,
  /** Frames to wait before allowing idle skip (prevents flicker) */
  IDLE_FRAME_THRESHOLD: 3,
} as const;

// ============================================================================
// Tile Dimensions
// ============================================================================

// Isometric tile dimensions (2:1 ratio for isometric projection)
export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;
export const TILE_SIZE = 64; // Legacy, use TILE_WIDTH/HEIGHT for isometric
export const MAP_WIDTH = 120;
export const MAP_HEIGHT = 120;

export const COLORS = {
  PLAYER_1: 0x3498db,
  PLAYER_2: 0xe74c3c,
  PLAYER_3: 0x2ecc71,
  PLAYER_4: 0xf39c12,
  GAIA: 0x95a5a6,
} as const;

export const UNIT_STATS = {
  villager: {
    health: 25,
    speed: 0.8,
    attack: 3,
    armor: 0,
    gatherRate: 0.5,
  },
  militia: {
    health: 40,
    speed: 0.9,
    attack: 4,
    armor: 0,
  },
  archer: {
    health: 30,
    speed: 0.96,
    attack: 4,
    armor: 0,
    range: 4,
  },
  knight: {
    health: 100,
    speed: 1.35,
    attack: 10,
    armor: 2,
  },
} as const;

export const BUILDING_STATS = {
  town_center: {
    health: 2400,
    width: 4,
    height: 4,
    buildTime: 150,
  },
  house: {
    health: 550,
    width: 2,
    height: 2,
    buildTime: 25,
    population: 5,
  },
  barracks: {
    health: 1200,
    width: 3,
    height: 3,
    buildTime: 50,
  },
  mill: {
    health: 600,
    width: 2,
    height: 2,
    buildTime: 35,
  },
  lumber_camp: {
    health: 600,
    width: 2,
    height: 2,
    buildTime: 35,
  },
  archery_range: {
    health: 1200,
    width: 3,
    height: 3,
    buildTime: 50,
  },
  stables: {
    health: 1350,
    width: 3,
    height: 3,
    buildTime: 50,
  },
} as const;
