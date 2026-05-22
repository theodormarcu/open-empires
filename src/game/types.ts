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

export interface Unit extends Entity {
  type: "unit";
  unitType: UnitType;
  health: number;
  maxHealth: number;
  speed: number;
  owner: number;
}

export type UnitType = "villager" | "militia" | "archer" | "knight" | "infantry" | "cavalry";

export interface Building extends Entity {
  type: "building";
  buildingType: BuildingType;
  health: number;
  maxHealth: number;
  owner: number;
  isComplete: boolean;
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
