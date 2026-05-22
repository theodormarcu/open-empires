import { Application } from "pixi.js";
import type { GameState, Entity, Player, Unit, Building, UnitType, BuildingType } from "./types";
import { UNIT_STATS, BUILDING_STATS } from "./constants";

let nextEntityId = 1;

function generateId(): string {
  return `entity_${nextEntityId++}`;
}

export class Game {
  private app: Application;
  private state: GameState;

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

    return {
      tick: 0,
      players: [player],
      entities: new Map(),
    };
  }

  public update(deltaTime: number): void {
    this.state.tick++;

    for (const entity of this.state.entities.values()) {
      this.updateEntity(entity, deltaTime);
    }
  }

  private updateEntity(_entity: Entity, _deltaTime: number): void {
    // Entity update logic will go here
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

  public spawnUnit(unitType: UnitType, x: number, y: number, owner: number): Unit {
    const stats = UNIT_STATS[unitType];
    const unit: Unit = {
      id: generateId(),
      position: { x, y },
      type: "unit",
      unitType,
      health: stats.health,
      maxHealth: stats.health,
      speed: stats.speed,
      owner,
    };
    this.addEntity(unit);
    return unit;
  }

  public spawnBuilding(buildingType: BuildingType, x: number, y: number, owner: number): Building {
    const stats = BUILDING_STATS[buildingType];
    const building: Building = {
      id: generateId(),
      position: { x, y },
      type: "building",
      buildingType,
      health: stats.health,
      maxHealth: stats.health,
      owner,
      isComplete: true,
    };
    this.addEntity(building);
    return building;
  }
}
