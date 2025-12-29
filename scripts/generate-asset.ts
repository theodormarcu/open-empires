#!/usr/bin/env npx tsx

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";

// ============================================================================
// Types
// ============================================================================

interface GenerateOptions {
  prompt: string;
  output: string;
  name: string;
  style: "aoe" | "terrain" | "custom";
  grid: string | null;      // Path to grid overlay image
  rows: number;             // Grid rows for sprite sheet
  cols: number;             // Grid columns for sprite sheet
  tileWidth: number;        // Building footprint width in tiles (e.g., 2 for 2x2)
  tileHeight: number;       // Building footprint height in tiles
  webp: boolean;            // Also output WebP
}

// ============================================================================
// Style Templates - Prompt engineering for consistent isometric assets
// ============================================================================

const STYLE_TEMPLATES = {
  aoe: {
    prefix: `Create a sprite sheet of isometric game assets in the exact style of Age of Empires II: Definitive Edition.

ART STYLE REQUIREMENTS:
- Hand-painted pixel art with visible brushwork and texture
- Medieval European aesthetic (thatched roofs, timber frames, stone walls)
- Warm earthy palette: browns (#8B4513, #A0522D), greens (#228B22, #6B8E23), grays (#708090, #A9A9A9)
- Consistent 26.57° isometric projection (standard 2:1 ratio)
- Soft ambient occlusion shadows, primary light from top-left
- Buildings should have clear silhouettes and readable details at small sizes

COMPOSITION:
- Each sprite centered on a diamond-shaped base tile
- Base tile should show grass/dirt ground beneath the building
- TRANSPARENT background (PNG alpha) around each sprite
- Leave padding between sprites in the grid for clean extraction
- Buildings should slightly overflow their base tile (roofs extend beyond footprint)`,
    suffix: `
CRITICAL: Match the distinctive AOE2 look:
- Slightly desaturated, aged colors (not too vibrant)
- Warm lighting with cool shadow tones
- Hand-crafted imperfection in lines and shapes
- Buildings feel grounded and solid, not floating
- Consistent scale across all sprites in the sheet`,
  },
  terrain: {
    prefix: `Create a sprite sheet of seamless terrain tiles in the exact style of Age of Empires II: Definitive Edition.

ART STYLE REQUIREMENTS:
- Hand-painted pixel art with visible brushwork and organic texture
- Warm earthy color palette matching AOE2 (not too saturated)
- Top-down perspective with subtle depth/dimension
- Natural, organic patterns - avoid repeating or grid-like artifacts

TECHNICAL REQUIREMENTS:
- Each tile MUST fill its entire cell edge-to-edge (no gaps, no transparency)
- Tiles MUST be perfectly SEAMLESS - connect flawlessly when tiled in any direction
- Rectangular format (the game engine clips to isometric diamond shape)
- Subtle variations between tiles for visual interest while maintaining seamlessness
- Consistent lighting direction (top-left) across all tiles`,
    suffix: `
CRITICAL FOR SEAMLESS TILING:
- Edges must match perfectly when tiles are placed adjacent
- Avoid distinct features near edges that would create visible seams
- Use organic, flowing patterns that blend naturally
- Test mentally: if you placed 4 tiles in a 2x2, would the seams be invisible?
- Fill every pixel - absolutely NO transparency or empty space`,
  },
  custom: {
    prefix: "",
    suffix: "",
  },
};

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArgs(): GenerateOptions {
  const args = process.argv.slice(2);
  let prompt = "";
  let output = "public/assets";
  let name = "generated";
  let style: "aoe" | "terrain" | "custom" = "aoe";
  let grid: string | null = null;
  let rows = 1;
  let cols = 1;
  let tileWidth = 1;
  let tileHeight = 1;
  let webp = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--prompt" || arg === "-p") {
      prompt = args[++i] || "";
    } else if (arg === "--output" || arg === "-o") {
      output = args[++i] || output;
    } else if (arg === "--name" || arg === "-n") {
      name = args[++i] || name;
    } else if (arg === "--style" || arg === "-s") {
      const s = args[++i];
      if (s === "aoe" || s === "terrain" || s === "custom") {
        style = s;
      }
    } else if (arg === "--grid" || arg === "-g") {
      grid = args[++i] || null;
    } else if (arg === "--rows" || arg === "-r") {
      rows = parseInt(args[++i], 10) || 1;
    } else if (arg === "--cols" || arg === "-c") {
      cols = parseInt(args[++i], 10) || 1;
    } else if (arg === "--size" || arg === "-z") {
      const size = args[++i] || "1x1";
      const match = size.match(/^(\d+)x(\d+)$/);
      if (match) {
        tileWidth = parseInt(match[1], 10);
        tileHeight = parseInt(match[2], 10);
      } else {
        // Single number means square (e.g., "2" = 2x2)
        const n = parseInt(size, 10);
        if (!isNaN(n)) {
          tileWidth = n;
          tileHeight = n;
        }
      }
    } else if (arg === "--webp" || arg === "-w") {
      webp = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Usage: npx tsx scripts/generate-asset.ts [options]

Options:
  -p, --prompt <text>   Description of assets to generate (required)
  -o, --output <dir>    Output directory (default: public/assets)
  -n, --name <name>     Output filename without extension (default: generated)
  -s, --style <style>   Art style: aoe, terrain, custom (default: aoe)
  -g, --grid <path>     Path to grid overlay image for consistent angles
  -r, --rows <n>        Number of rows in sprite sheet (default: 1)
  -c, --cols <n>        Number of columns in sprite sheet (default: 1)
  -z, --size <WxH>      Building footprint in tiles (e.g., 2x2, 3x3, 4x4) default: 1x1
  -w, --webp            Also output WebP version
  -h, --help            Show this help message

Examples:
  # Generate AOE-style medieval buildings (4x4 grid)
  npx tsx scripts/generate-asset.ts -p "medieval houses, varying sizes" -n houses -r 4 -c 4 --webp

  # Generate with reference grid overlay
  npx tsx scripts/generate-asset.ts -p "barracks variants" -g public/assets/grid_template.png -n barracks

Style Presets:
  aoe      - Age of Empires II style (medieval, hand-painted, pixel art)
  terrain  - Seamless terrain tiles (rectangular, edge-to-edge, for diamond clipping)
  custom   - No style prefix, use your prompt as-is
`);
      process.exit(0);
    } else if (!prompt) {
      prompt = arg;
    }
  }

  if (!prompt) {
    console.error("Error: Prompt is required. Use --prompt or -p flag.");
    console.error("Run with --help for usage information.");
    process.exit(1);
  }

  return { prompt, output, name, style, grid, rows, cols, tileWidth, tileHeight, webp };
}

// ============================================================================
// Grid Template Generator
// ============================================================================

/**
 * Generate a description of the grid layout for the AI
 */
function getGridDescription(rows: number, cols: number): string {
  if (rows === 1 && cols === 1) {
    return "Generate a single isometric sprite.";
  }
  const total = rows * cols;
  return `Generate a ${cols}x${rows} grid (${total} total sprites) arranged in a clean sprite sheet layout.
Each cell should contain one variant. Use consistent spacing between sprites.`;
}

/**
 * Get building size description for prompt
 */
function getBuildingSizeDescription(tileWidth: number, tileHeight: number): string {
  if (tileWidth === 1 && tileHeight === 1) {
    return "Each building occupies a single isometric tile (1x1).";
  }
  
  const size = tileWidth === tileHeight 
    ? `${tileWidth}x${tileHeight}` 
    : `${tileWidth} tiles wide by ${tileHeight} tiles deep`;
  
  return `Each building has a ${size} tile footprint. The building should be proportionally larger to fill this space, with the base spanning multiple diamond tiles merged together.`;
}

/**
 * Build the full prompt with style template and grid info
 */
function buildPrompt(options: GenerateOptions): string {
  const template = STYLE_TEMPLATES[options.style];
  const gridDesc = getGridDescription(options.rows, options.cols);
  
  let fullPrompt = "";
  
  // Add style prefix
  if (template.prefix) {
    fullPrompt += template.prefix + "\n\n";
  }
  
  // Add grid description
  fullPrompt += gridDesc + "\n\n";
  
  // Add building size description (only for non-terrain styles)
  if (options.style !== "terrain") {
    const sizeDesc = getBuildingSizeDescription(options.tileWidth, options.tileHeight);
    fullPrompt += sizeDesc + "\n\n";
  }
  
  // Add user prompt
  fullPrompt += `Asset description: ${options.prompt}\n`;
  
  // Add style suffix
  if (template.suffix) {
    fullPrompt += template.suffix;
  }
  
  // Add grid reference note if provided
  if (options.grid) {
    fullPrompt += `\n\nUse the provided reference image as a guide for the isometric grid angles and spacing.`;
  }
  
  return fullPrompt;
}

/**
 * Read image file and return base64 data
 */
function readImageAsBase64(imagePath: string): { data: string; mimeType: string } | null {
  try {
    const fullPath = path.resolve(process.cwd(), imagePath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`Warning: Grid image not found: ${fullPath}`);
      return null;
    }
    
    const buffer = fs.readFileSync(fullPath);
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = ext === ".png" ? "image/png" : 
                     ext === ".webp" ? "image/webp" :
                     ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
    
    return {
      data: buffer.toString("base64"),
      mimeType,
    };
  } catch (error) {
    console.warn(`Warning: Could not read grid image: ${error}`);
    return null;
  }
}

/**
 * Convert PNG buffer to WebP using sharp (if available)
 */
async function convertToWebP(pngBuffer: Buffer, outputPath: string): Promise<boolean> {
  try {
    // Dynamic import to avoid requiring sharp as a dependency
    const sharp = await import("sharp").catch(() => null);
    if (!sharp) {
      console.warn("Note: Install 'sharp' for WebP conversion: npm i -D sharp");
      return false;
    }
    
    await sharp.default(pngBuffer)
      .webp({ quality: 80 })
      .toFile(outputPath);
    
    return true;
  } catch (error) {
    console.warn(`WebP conversion failed: ${error}`);
    return false;
  }
}

// ============================================================================
// Main Generation Function
// ============================================================================

async function generateAsset(options: GenerateOptions): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY environment variable is not set.");
    console.error("Set it in .env.local or export it: export GEMINI_API_KEY=your_key");
    process.exit(1);
  }

  const fullPrompt = buildPrompt(options);
  
  console.log("═".repeat(60));
  console.log("🎨 OpenEmpires Asset Generator");
  console.log("═".repeat(60));
  console.log(`Style: ${options.style}`);
  console.log(`Grid: ${options.cols}x${options.rows} (${options.cols * options.rows} sprites)`);
  console.log(`Building size: ${options.tileWidth}x${options.tileHeight} tiles`);
  console.log(`Output: ${options.output}/${options.name}.png${options.webp ? " + .webp" : ""}`);
  if (options.grid) {
    console.log(`Reference grid: ${options.grid}`);
  }
  console.log("─".repeat(60));
  console.log("Prompt preview:");
  console.log(fullPrompt.slice(0, 200) + (fullPrompt.length > 200 ? "..." : ""));
  console.log("─".repeat(60));

  const ai = new GoogleGenAI({ apiKey });

  try {
    // Build content array (text + optional reference image)
    const contents: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];
    
    // Add reference grid image if provided
    if (options.grid) {
      const gridImage = readImageAsBase64(options.grid);
      if (gridImage) {
        contents.push({ inlineData: gridImage });
        console.log("✓ Reference grid image loaded");
      }
    }
    
    // Add the prompt
    contents.push({ text: fullPrompt });

    console.log("⏳ Generating with Gemini...");
    
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: contents,
      config: {
        responseModalities: ["image", "text"],
      },
    });

    // Ensure output directory exists
    const fullOutputDir = path.resolve(process.cwd(), options.output);
    if (!fs.existsSync(fullOutputDir)) {
      fs.mkdirSync(fullOutputDir, { recursive: true });
    }

    let imageCount = 0;
    const candidates = response.candidates || [];
    
    for (const candidate of candidates) {
      const parts = candidate.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const buffer = Buffer.from(part.inlineData.data, "base64");
          const filename = imageCount === 0 ? `${options.name}.png` : `${options.name}_${imageCount}.png`;
          const outputPath = path.join(fullOutputDir, filename);
          
          // Save PNG
          fs.writeFileSync(outputPath, buffer);
          console.log(`✓ Saved: ${outputPath}`);
          
          // Convert to WebP if requested
          if (options.webp) {
            const webpPath = outputPath.replace(/\.png$/, ".webp");
            const success = await convertToWebP(buffer, webpPath);
            if (success) {
              const pngSize = buffer.length;
              const webpSize = fs.statSync(webpPath).size;
              const savings = ((pngSize - webpSize) / pngSize * 100).toFixed(1);
              console.log(`✓ Saved: ${webpPath} (${savings}% smaller)`);
            }
          }
          
          imageCount++;
        } else if (part.text) {
          console.log(`\n📝 Model notes: ${part.text}`);
        }
      }
    }

    console.log("─".repeat(60));
    if (imageCount === 0) {
      console.error("❌ No images were generated. The model may have returned text only.");
      console.log("Full response:", JSON.stringify(response, null, 2));
    } else {
      console.log(`✨ Generated ${imageCount} image(s)`);
    }
  } catch (error) {
    console.error("Error generating image:", error);
    process.exit(1);
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

const options = parseArgs();
generateAsset(options);
