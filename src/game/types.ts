// Core game types for OpenEmpires

export interface Position {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  position: Position;
  type: EntityType;
}

export type EntityType = "unit" | "building" | "resource";

export type UnitState = "idle" | "moving" | "attacking" | "gathering";

export interface Unit extends Entity {
  type: "unit";
  unitType: UnitType;
  health: number;
  maxHealth: number;
  speed: number;
  owner: number;
  state?: UnitState;
}

export type UnitType = "villager" | "militia" | "archer" | "knight";

export interface Building extends Entity {
  type: "building";
  buildingType: BuildingType;
  health: number;
  maxHealth: number;
  owner: number;
  isComplete: boolean;
  trains?: UnitType[];
}

export type BuildingType = "town_center" | "house" | "barracks" | "mill" | "lumber_camp" | "archery_range" | "stables";

export interface Resource extends Entity {
  type: "resource";
  resourceType: ResourceType;
  amount: number;
}

export type ResourceType = "wood" | "food" | "gold" | "stone";

export interface Player {
  id: number;
  name: string;
  color: number;
  resources: PlayerResources;
}

export interface PlayerResources {
  wood: number;
  food: number;
  gold: number;
  stone: number;
}

export interface GameState {
  tick: number;
  players: Player[];
  entities: Map<string, Entity>;
}

export interface SpriteDefinition {
  sheet: string;
  row: number;
  col: number;
  width?: number;
  height?: number;
  offsetX?: number;
  offsetY?: number;
}

export const UNIT_SPRITES: Record<UnitType, SpriteDefinition> = {
  villager: { sheet: 'units', row: 0, col: 0 },
  militia: { sheet: 'units', row: 0, col: 1 },
  archer: { sheet: 'units', row: 0, col: 2 },
  knight: { sheet: 'units', row: 0, col: 3 },
};

export const BUILDING_SPRITES: Record<BuildingType, SpriteDefinition> = {
  town_center: { sheet: 'buildings', row: 0, col: 0, offsetY: -32 },
  house: { sheet: 'buildings', row: 0, col: 1 },
  barracks: { sheet: 'buildings', row: 0, col: 2, offsetY: -16 },
  mill: { sheet: 'buildings', row: 0, col: 3 },
  lumber_camp: { sheet: 'buildings', row: 0, col: 4 },
  archery_range: { sheet: 'buildings', row: 0, col: 5, offsetY: -16 },
  stables: { sheet: 'buildings', row: 0, col: 6, offsetY: -16 },
};
