import { Application } from "pixi.js";
import type { GameState, Entity, Player } from "./types";

export class Game {
  private app: Application;
  private state: GameState;
  private lastTime: number = 0;

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
}
