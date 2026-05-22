import { Container, Graphics } from "pixi.js";
import { WEATHER } from "../constants";

export enum WeatherType {
  NONE = "none",
  RAIN = "rain",
  SNOW = "snow",
  SANDSTORM = "sandstorm",
}

const WEATHER_CYCLE: WeatherType[] = [
  WeatherType.NONE,
  WeatherType.RAIN,
  WeatherType.SNOW,
  WeatherType.SANDSTORM,
];

interface WeatherParticle {
  x: number;
  y: number;
  speedX: number;
  speedY: number;
  size: number;
  alpha: number;
  /** Per-particle phase offset for sine-wave wobble (snow) */
  wobblePhase: number;
}

/**
 * Screen-space weather particle system.
 * Renders rain, snow, or sandstorm as a full-viewport overlay
 * independent of camera position/zoom.
 */
export class WeatherSystem {
  private container: Container;
  private graphics: Graphics;
  private particles: WeatherParticle[] = [];
  private weatherType: WeatherType = WeatherType.NONE;
  private screenWidth: number;
  private screenHeight: number;
  private elapsedTime: number = 0;

  constructor(screenWidth: number, screenHeight: number) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.container = new Container();
    this.container.label = "WeatherSystem";
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  /** Get the PixiJS container (add to app.stage above camera layers) */
  getContainer(): Container {
    return this.container;
  }

  /** Current weather type */
  getWeatherType(): WeatherType {
    return this.weatherType;
  }

  /** Update screen dimensions on resize */
  setScreenSize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  /** Set weather type, reinitializing particles */
  setWeather(type: WeatherType): void {
    this.weatherType = type;
    this.elapsedTime = 0;
    this.initParticles();
  }

  /** Cycle to the next weather type */
  cycleWeather(): WeatherType {
    const currentIndex = WEATHER_CYCLE.indexOf(this.weatherType);
    const nextIndex = (currentIndex + 1) % WEATHER_CYCLE.length;
    this.setWeather(WEATHER_CYCLE[nextIndex]);
    return this.weatherType;
  }

  /** Called every frame from the game loop */
  update(deltaTime: number): void {
    if (this.weatherType === WeatherType.NONE) {
      this.graphics.clear();
      return;
    }

    this.elapsedTime += deltaTime;
    this.moveParticles(deltaTime);
    this.draw();
  }

  private initParticles(): void {
    this.particles = [];

    if (this.weatherType === WeatherType.NONE) return;

    const count = WEATHER.MAX_PARTICLES;
    for (let i = 0; i < count; i++) {
      this.particles.push(this.spawnParticle(true));
    }
  }

  private spawnParticle(randomizeY: boolean): WeatherParticle {
    const x = Math.random() * this.screenWidth;
    const y = randomizeY
      ? Math.random() * this.screenHeight
      : -Math.random() * 20;

    switch (this.weatherType) {
      case WeatherType.RAIN:
        return {
          x,
          y,
          speedX: WEATHER.RAIN_DRIFT + Math.random() * 1,
          speedY: WEATHER.RAIN_SPEED + Math.random() * 4,
          size: 1 + Math.random(),
          alpha: 0.25 + Math.random() * 0.25,
          wobblePhase: 0,
        };

      case WeatherType.SNOW:
        return {
          x,
          y,
          speedX: 0,
          speedY: WEATHER.SNOW_SPEED + Math.random() * 1,
          size: 1.5 + Math.random() * 2.5,
          alpha: 0.5 + Math.random() * 0.4,
          wobblePhase: Math.random() * Math.PI * 2,
        };

      case WeatherType.SANDSTORM:
        return {
          x,
          y,
          speedX: WEATHER.SAND_SPEED + Math.random() * 4,
          speedY: WEATHER.SAND_DRIFT + Math.random() * 2,
          size: 2 + Math.random() * 4,
          alpha: 0.15 + Math.random() * 0.2,
          wobblePhase: 0,
        };

      default:
        return { x, y, speedX: 0, speedY: 0, size: 1, alpha: 0, wobblePhase: 0 };
    }
  }

  private moveParticles(deltaTime: number): void {
    for (const p of this.particles) {
      p.x += p.speedX * deltaTime;
      p.y += p.speedY * deltaTime;

      // Snow wobble
      if (this.weatherType === WeatherType.SNOW) {
        p.x += Math.sin(this.elapsedTime * 0.05 + p.wobblePhase) * WEATHER.SNOW_WOBBLE * deltaTime;
      }

      // Wrap around screen edges
      if (p.y > this.screenHeight) {
        p.y = -Math.random() * 20;
        p.x = Math.random() * this.screenWidth;
      }
      if (p.x > this.screenWidth) {
        p.x = -Math.random() * 20;
        p.y = Math.random() * this.screenHeight;
      }
      if (p.x < -20) {
        p.x = this.screenWidth + Math.random() * 20;
        p.y = Math.random() * this.screenHeight;
      }
    }
  }

  private draw(): void {
    this.graphics.clear();

    switch (this.weatherType) {
      case WeatherType.RAIN:
        this.drawRain();
        break;
      case WeatherType.SNOW:
        this.drawSnow();
        break;
      case WeatherType.SANDSTORM:
        this.drawSandstorm();
        break;
    }
  }

  private drawRain(): void {
    for (const p of this.particles) {
      this.graphics
        .moveTo(p.x, p.y)
        .lineTo(p.x + WEATHER.RAIN_DRIFT * 0.5, p.y + WEATHER.RAIN_LENGTH)
        .stroke({ width: p.size, color: 0xaaccee, alpha: p.alpha });
    }
  }

  private drawSnow(): void {
    for (const p of this.particles) {
      this.graphics
        .circle(p.x, p.y, p.size)
        .fill({ color: 0xffffff, alpha: p.alpha });
    }
  }

  private drawSandstorm(): void {
    for (const p of this.particles) {
      this.graphics
        .circle(p.x, p.y, p.size)
        .fill({ color: 0xd4a056, alpha: p.alpha });
    }
  }

  /** Destroy and clean up */
  destroy(): void {
    this.particles = [];
    this.graphics.destroy();
    this.container.destroy();
  }
}
