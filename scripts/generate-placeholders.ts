import { createCanvas } from "canvas";
import * as fs from "fs";
import * as path from "path";

const UNIT_CELL = 64;
const BUILDING_CELL = 128;

const ASSETS_DIR = path.join(__dirname, "..", "public", "assets");

// Ensure assets directory exists
fs.mkdirSync(ASSETS_DIR, { recursive: true });

// --- Helper functions ---

function drawIsometricDiamond(
  ctx: ReturnType<typeof createCanvas>["getContext"],
  cx: number,
  cy: number,
  width: number,
  height: number,
  color: string
) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - height / 2); // top
  ctx.lineTo(cx + width / 2, cy); // right
  ctx.lineTo(cx, cy + height / 2); // bottom
  ctx.lineTo(cx - width / 2, cy); // left
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawIsometricBox(
  ctx: ReturnType<typeof createCanvas>["getContext"],
  cx: number,
  cy: number,
  baseWidth: number,
  baseHeight: number,
  boxHeight: number,
  color: string
) {
  // Darker shade for sides
  const darkerColor = darken(color, 0.3);
  const darkestColor = darken(color, 0.5);

  // Top face (diamond)
  const topY = cy - boxHeight;
  ctx.beginPath();
  ctx.moveTo(cx, topY - baseHeight / 2);
  ctx.lineTo(cx + baseWidth / 2, topY);
  ctx.lineTo(cx, topY + baseHeight / 2);
  ctx.lineTo(cx - baseWidth / 2, topY);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  // Right face
  ctx.beginPath();
  ctx.moveTo(cx + baseWidth / 2, topY);
  ctx.lineTo(cx, topY + baseHeight / 2);
  ctx.lineTo(cx, topY + baseHeight / 2 + boxHeight);
  ctx.lineTo(cx + baseWidth / 2, topY + boxHeight);
  ctx.closePath();
  ctx.fillStyle = darkerColor;
  ctx.fill();

  // Left face
  ctx.beginPath();
  ctx.moveTo(cx - baseWidth / 2, topY);
  ctx.lineTo(cx, topY + baseHeight / 2);
  ctx.lineTo(cx, topY + baseHeight / 2 + boxHeight);
  ctx.lineTo(cx - baseWidth / 2, topY + boxHeight);
  ctx.closePath();
  ctx.fillStyle = darkestColor;
  ctx.fill();
}

function darken(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.floor(r * (1 - amount))}, ${Math.floor(g * (1 - amount))}, ${Math.floor(b * (1 - amount))})`;
}

// --- Generate units sprite sheet ---

function generateUnits() {
  const cols = 4;
  const canvas = createCanvas(cols * UNIT_CELL, UNIT_CELL);
  const ctx = canvas.getContext("2d");

  const units = [
    { name: "villager", color: "#f39c12" },
    { name: "militia", color: "#e74c3c" },
    { name: "archer", color: "#2ecc71" },
    { name: "knight", color: "#9b59b6" },
  ];

  units.forEach((unit, i) => {
    const cx = i * UNIT_CELL + UNIT_CELL / 2;
    const cy = UNIT_CELL / 2;

    // Base diamond shape
    drawIsometricDiamond(ctx, cx, cy, 40, 28, unit.color);

    // Distinguishing features
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;

    if (unit.name === "villager") {
      // Small circle on top (head)
      ctx.beginPath();
      ctx.arc(cx, cy - 18, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (unit.name === "militia") {
      // Sword shape (vertical line with crossbar)
      ctx.beginPath();
      ctx.moveTo(cx, cy - 20);
      ctx.lineTo(cx, cy - 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy - 15);
      ctx.lineTo(cx + 5, cy - 15);
      ctx.stroke();
    } else if (unit.name === "archer") {
      // Triangle (arrow)
      ctx.beginPath();
      ctx.moveTo(cx, cy - 22);
      ctx.lineTo(cx - 5, cy - 14);
      ctx.lineTo(cx + 5, cy - 14);
      ctx.closePath();
      ctx.fill();
    } else if (unit.name === "knight") {
      // Larger diamond (mounted)
      drawIsometricDiamond(ctx, cx, cy, 50, 36, unit.color);
      // Redraw with slightly lighter shade for inner
      drawIsometricDiamond(ctx, cx, cy, 30, 20, darken(unit.color, -0.2));
    }
  });

  const outPath = path.join(ASSETS_DIR, "units_placeholder.png");
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(outPath, buffer);
  console.log(`Generated: ${outPath} (${canvas.width}x${canvas.height})`);
}

// --- Generate buildings sprite sheet ---

function generateBuildings() {
  const cols = 7;
  const canvas = createCanvas(cols * BUILDING_CELL, BUILDING_CELL);
  const ctx = canvas.getContext("2d");

  const buildings = [
    { name: "town_center", color: "#3498db", size: 4 },
    { name: "house", color: "#e67e22", size: 2 },
    { name: "barracks", color: "#e74c3c", size: 3 },
    { name: "mill", color: "#f1c40f", size: 2 },
    { name: "lumber_camp", color: "#8b4513", size: 2 },
    { name: "archery_range", color: "#2ecc71", size: 3 },
    { name: "stables", color: "#9b59b6", size: 3 },
  ];

  buildings.forEach((building, i) => {
    const cx = i * BUILDING_CELL + BUILDING_CELL / 2;
    const cy = BUILDING_CELL / 2 + 10;

    // Scale base dimensions relative to building size
    const scale = building.size / 4;
    const baseWidth = 100 * scale;
    const baseHeight = 60 * scale;
    const boxHeight = 30 * scale + 10;

    drawIsometricBox(ctx, cx, cy, baseWidth, baseHeight, boxHeight, building.color);
  });

  const outPath = path.join(ASSETS_DIR, "buildings_placeholder.png");
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(outPath, buffer);
  console.log(`Generated: ${outPath} (${canvas.width}x${canvas.height})`);
}

// --- Main ---

generateUnits();
generateBuildings();
console.log("Done! Placeholder sprite sheets generated.");
