import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { tileToScreen } from "./isometric";
import { Camera } from "./Camera";
import { TILE_WIDTH, TILE_HEIGHT, ZOOM_THRESHOLDS, ENTITY_LIMITS, COLORS } from "../constants";
import type { Unit, Building, UnitType, BuildingType } from "../types";

const UNIT_COLORS: Record<UnitType, number> = {
  villager: 0x8b4513,
  militia: 0x4169e1,
  archer: 0x228b22,
  knight: 0xffd700,
  infantry: 0xc0392b,
  cavalry: 0x9b59b6,
};

const BUILDING_COLORS: Record<BuildingType, number> = {
  town_center: 0xd4a574,
  house: 0xb8860b,
  barracks: 0x8b0000,
  mill: 0xdaa520,
  lumber_camp: 0x654321,
  archery_range: 0x2e8b57,
  stables: 0x8b4513,
};

const LABEL_STYLE = new TextStyle({
  fontSize: 9,
  fill: 0xffffff,
  fontFamily: "monospace",
  stroke: { color: 0x000000, width: 2 },
});

export class EntityRenderer {
  private unitContainer: Container;
  private buildingContainer: Container;
  private unitGraphics: Graphics;
  private buildingGraphics: Graphics;
  private labelPool: Text[] = [];
  private activeLabelCount = 0;

  constructor(unitContainer: Container, buildingContainer: Container) {
    this.unitContainer = unitContainer;
    this.buildingContainer = buildingContainer;
    this.unitGraphics = new Graphics();
    this.buildingGraphics = new Graphics();
    this.unitContainer.addChild(this.unitGraphics);
    this.buildingContainer.addChild(this.buildingGraphics);
  }

  renderUnits(units: Unit[], camera: Camera): void {
    this.unitGraphics.clear();
    this.activeLabelCount = 0;

    if (camera.zoom < ZOOM_THRESHOLDS.HIDE_SMALL_ENTITIES) {
      this.hideLabels();
      return;
    }

    const bounds = camera.getVisibleBounds();
    let rendered = 0;

    for (const unit of units) {
      if (rendered >= ENTITY_LIMITS.MAX_VISIBLE_UNITS) break;

      const screenPos = tileToScreen(unit.position.x, unit.position.y);

      if (
        screenPos.x < bounds.minX - 64 ||
        screenPos.x > bounds.maxX + 64 ||
        screenPos.y < bounds.minY - 64 ||
        screenPos.y > bounds.maxY + 64
      ) {
        continue;
      }

      this.drawUnitPlaceholder(screenPos.x, screenPos.y, unit);
      rendered++;
    }

    this.hideLabels();
  }

  renderBuildings(buildings: Building[], camera: Camera): void {
    this.buildingGraphics.clear();

    const bounds = camera.getVisibleBounds();

    for (const building of buildings) {
      const screenPos = tileToScreen(building.position.x, building.position.y);

      if (
        screenPos.x < bounds.minX - 256 ||
        screenPos.x > bounds.maxX + 256 ||
        screenPos.y < bounds.minY - 256 ||
        screenPos.y > bounds.maxY + 256
      ) {
        continue;
      }

      this.drawBuildingPlaceholder(screenPos.x, screenPos.y, building);
    }
  }

  private drawUnitPlaceholder(x: number, y: number, unit: Unit): void {
    const color = UNIT_COLORS[unit.unitType] ?? 0xffffff;
    const playerColor = this.getPlayerColor(unit.owner);
    const size = 10;

    // Unit body (filled circle as diamond)
    this.unitGraphics
      .moveTo(x, y - size)
      .lineTo(x + size, y)
      .lineTo(x, y + size)
      .lineTo(x - size, y)
      .lineTo(x, y - size)
      .fill(color);

    // Player color outline
    this.unitGraphics
      .moveTo(x, y - size)
      .lineTo(x + size, y)
      .lineTo(x, y + size)
      .lineTo(x - size, y)
      .lineTo(x, y - size)
      .stroke({ width: 2, color: playerColor });

    // Health bar
    const barWidth = 20;
    const barHeight = 3;
    const healthPct = unit.health / unit.maxHealth;
    const barX = x - barWidth / 2;
    const barY = y - size - 8;

    // Background
    this.unitGraphics.rect(barX, barY, barWidth, barHeight).fill(0x333333);
    // Health fill
    const healthColor = healthPct > 0.5 ? 0x2ecc71 : healthPct > 0.25 ? 0xf39c12 : 0xe74c3c;
    this.unitGraphics.rect(barX, barY, barWidth * healthPct, barHeight).fill(healthColor);

    // Label
    const label = this.getLabel();
    label.text = unit.unitType.charAt(0).toUpperCase();
    label.x = x;
    label.y = y - 2;
    label.anchor.set(0.5, 0.5);
    label.visible = true;
  }

  private drawBuildingPlaceholder(x: number, y: number, building: Building): void {
    const color = BUILDING_COLORS[building.buildingType] ?? 0xffffff;
    const playerColor = this.getPlayerColor(building.owner);
    const stats = this.getBuildingSize(building.buildingType);
    const w = stats.width * TILE_WIDTH / 2;
    const h = stats.height * TILE_HEIGHT / 2;

    // Isometric footprint
    this.buildingGraphics
      .moveTo(x, y - h)
      .lineTo(x + w, y)
      .lineTo(x, y + h)
      .lineTo(x - w, y)
      .lineTo(x, y - h)
      .fill(color);

    this.buildingGraphics
      .moveTo(x, y - h)
      .lineTo(x + w, y)
      .lineTo(x, y + h)
      .lineTo(x - w, y)
      .lineTo(x, y - h)
      .stroke({ width: 2, color: playerColor });

    // Building "height" effect - a raised rectangle to give 3D feel
    const roofH = stats.height * 12;
    this.buildingGraphics
      .moveTo(x, y - h - roofH)
      .lineTo(x + w, y - roofH)
      .lineTo(x, y + h - roofH)
      .lineTo(x - w, y - roofH)
      .lineTo(x, y - h - roofH)
      .fill(this.lightenColor(color, 0.3));

    // Walls connecting roof to base
    this.buildingGraphics
      .moveTo(x + w, y).lineTo(x + w, y - roofH)
      .stroke({ width: 1, color: this.darkenColor(color, 0.3) });
    this.buildingGraphics
      .moveTo(x, y + h).lineTo(x, y + h - roofH)
      .stroke({ width: 1, color: this.darkenColor(color, 0.3) });

    // Health bar
    const barWidth = Math.max(30, w);
    const barHeight = 4;
    const healthPct = building.health / building.maxHealth;
    const barX = x - barWidth / 2;
    const barY = y - h - roofH - 10;

    this.buildingGraphics.rect(barX, barY, barWidth, barHeight).fill(0x333333);
    const healthColor = healthPct > 0.5 ? 0x2ecc71 : healthPct > 0.25 ? 0xf39c12 : 0xe74c3c;
    this.buildingGraphics.rect(barX, barY, barWidth * healthPct, barHeight).fill(healthColor);

    // Building name label
    const label = this.getLabel();
    label.text = this.formatBuildingName(building.buildingType);
    label.x = x;
    label.y = y - h - roofH - 16;
    label.anchor.set(0.5, 1);
    label.visible = true;
  }

  private getLabel(): Text {
    if (this.activeLabelCount < this.labelPool.length) {
      const label = this.labelPool[this.activeLabelCount];
      this.activeLabelCount++;
      return label;
    }

    const label = new Text({ text: "", style: LABEL_STYLE });
    this.labelPool.push(label);
    // Add to unit container by default; buildings will also use it
    this.unitContainer.addChild(label);
    this.activeLabelCount++;
    return label;
  }

  private hideLabels(): void {
    for (let i = this.activeLabelCount; i < this.labelPool.length; i++) {
      this.labelPool[i].visible = false;
    }
  }

  private getPlayerColor(owner: number): number {
    switch (owner) {
      case 1: return COLORS.PLAYER_1;
      case 2: return COLORS.PLAYER_2;
      case 3: return COLORS.PLAYER_3;
      case 4: return COLORS.PLAYER_4;
      default: return COLORS.GAIA;
    }
  }

  private getBuildingSize(type: BuildingType): { width: number; height: number } {
    const sizes: Record<BuildingType, { width: number; height: number }> = {
      town_center: { width: 4, height: 4 },
      house: { width: 2, height: 2 },
      barracks: { width: 3, height: 3 },
      mill: { width: 2, height: 2 },
      lumber_camp: { width: 2, height: 2 },
      archery_range: { width: 3, height: 3 },
      stables: { width: 3, height: 3 },
    };
    return sizes[type] ?? { width: 2, height: 2 };
  }

  private formatBuildingName(type: BuildingType): string {
    return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private lightenColor(color: number, amount: number): number {
    const r = Math.min(255, ((color >> 16) & 0xff) + 255 * amount);
    const g = Math.min(255, ((color >> 8) & 0xff) + 255 * amount);
    const b = Math.min(255, (color & 0xff) + 255 * amount);
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
  }

  private darkenColor(color: number, amount: number): number {
    const r = ((color >> 16) & 0xff) * (1 - amount);
    const g = ((color >> 8) & 0xff) * (1 - amount);
    const b = (color & 0xff) * (1 - amount);
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
  }
}
