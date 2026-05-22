import { Container } from "pixi.js";

export interface WeatherEffect {
  /** Human-readable name for the dev overlay */
  readonly name: string;
  /** PixiJS container to add to the stage */
  getContainer(): Container;
  /** Update screen dimensions on resize */
  setScreenSize(width: number, height: number): void;
  /** Per-frame update; deltaTime is from PixiJS ticker */
  update(deltaTime: number): void;
  /** Clean up all resources */
  destroy(): void;
}
