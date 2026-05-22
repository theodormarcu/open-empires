import { Application } from "pixi.js";
import type { GameState, Entity, Player, Unit, Building, UnitType, BuildingType } from "./types";
import { UNIT_STATS, BUILDING_STATS } from "./constants";

export class Game {
  private app: Application;
  private state: GameState;
  private lastTime: number = 0;
  private nextEntityId: number = 1;

  constructor(app: Application) {
    this.app = app;
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const player: Player = {
      id: 1,
      name: "Player 1",
      color: 0x3498db,
      resources: {
        wood: 200,
        food: 200,
        gold: 100,
        stone: 200,
      },
    };

    const state: GameState = {
      tick: 0,
      players: [player],
      entities: new Map(),
    };

    this.state = state;

    // Spawn initial buildings
    this.placeBuilding("town_center", 60, 60, 1);
    this.placeBuilding("barracks", 55, 58, 1);
    this.placeBuilding("archery_range", 55, 62, 1);
    this.placeBuilding("stables", 63, 55, 1);

    // Spawn initial units
    this.spawnUnit("militia", 58, 58, 1);
    this.spawnUnit("militia", 58, 59, 1);
    this.spawnUnit("militia", 58, 60, 1);
    this.spawnUnit("archer", 62, 58, 1);
    this.spawnUnit("archer", 62, 59, 1);
    this.spawnUnit("archer", 62, 60, 1);
    this.spawnUnit("knight", 56, 56, 1);
    this.spawnUnit("knight", 57, 56, 1);

    return state;
  }

  public update(deltaTime: number): void {
    this.state.tick++;
    
    // Update all entities
    for (const entity of this.state.entities.values()) {
      this.updateEntity(entity, deltaTime);
    }
  }

  private updateEntity(_entity: Entity, _deltaTime: number): void {
    // Entity update logic will go here
    // - Unit movement
    // - Combat
    // - Resource gathering
    // - Building construction
  }

  public getState(): GameState {
    return this.state;
  }

  public addEntity(entity: Entity): void {
    this.state.entities.set(entity.id, entity);
  }

  public removeEntity(id: string): void {
    this.state.entities.delete(id);
  }

  public getEntity(id: string): Entity | undefined {
    return this.state.entities.get(id);
  }

  public getUnits(): Unit[] {
    const units: Unit[] = [];
    for (const entity of this.state.entities.values()) {
      if (entity.type === "unit") {
        units.push(entity as Unit);
      }
    }
    return units;
  }

  public getBuildings(): Building[] {
    const buildings: Building[] = [];
    for (const entity of this.state.entities.values()) {
      if (entity.type === "building") {
        buildings.push(entity as Building);
      }
    }
    return buildings;
  }

  public spawnUnit(unitType: UnitType, tileX: number, tileY: number, owner: number): Unit {
    const stats = UNIT_STATS[unitType];
    const unit: Unit = {
      id: `unit-${this.nextEntityId++}`,
      type: "unit",
      unitType,
      position: { x: tileX, y: tileY },
      health: stats.health,
      maxHealth: stats.health,
      speed: stats.speed,
      owner,
    };
    this.state.entities.set(unit.id, unit);
    return unit;
  }

  public placeBuilding(buildingType: BuildingType, tileX: number, tileY: number, owner: number): Building {
    const stats = BUILDING_STATS[buildingType];
    const building: Building = {
      id: `building-${this.nextEntityId++}`,
      type: "building",
      buildingType,
      position: { x: tileX, y: tileY },
      health: stats.health,
      maxHealth: stats.health,
      owner,
      isComplete: true,
    };
    this.state.entities.set(building.id, building);
    return building;
  }
}
