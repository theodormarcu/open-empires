"use client";

import { useEffect, useRef, useState } from "react";
import { Application } from "pixi.js";
import { Camera, Tilemap, TerrainSprites, PerformanceMonitor, LayerManager, RenderLayer, EntityRenderer } from "@/game/rendering";
import { tileToScreen } from "@/game/rendering/isometric";
import { MAP_WIDTH, MAP_HEIGHT } from "@/game/constants";
import { Game } from "@/game/Game";

const isDev = process.env.NODE_ENV === "development";

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const [perfStats, setPerfStats] = useState({ fps: 0, frameTime: 0, lagSpikes: 0, status: "good" as "good" | "warning" | "bad" });

  useEffect(() => {
    if (!containerRef.current || appRef.current) return;

    const initPixi = async () => {
      const app = new Application();

      await app.init({
        background: "#1a1a2e",
        resizeTo: containerRef.current!,
        antialias: true,
      });

      containerRef.current!.appendChild(app.canvas);
      appRef.current = app;

      // Load terrain sprites
      const terrainSprites = new TerrainSprites();
      await terrainSprites.load();

      // Initialize camera, layer manager, tilemap, and performance monitor
      const camera = new Camera(app.screen.width, app.screen.height);
      const layers = new LayerManager();
      const tilemap = new Tilemap(terrainSprites);
      const perfMonitor = isDev ? new PerformanceMonitor() : null;

      // Initialize game and entity renderer
      const game = new Game(app);
      const entityRenderer = new EntityRenderer(
        layers.getLayer(RenderLayer.UNITS),
        layers.getLayer(RenderLayer.BUILDINGS)
      );

      // Spawn initial buildings near map center
      const cx = Math.floor(MAP_WIDTH / 2);
      const cy = Math.floor(MAP_HEIGHT / 2);

      game.spawnBuilding("town_center", cx, cy, 1);
      game.spawnBuilding("barracks", cx + 8, cy - 4, 1);
      game.spawnBuilding("archery_range", cx - 6, cy + 6, 1);
      game.spawnBuilding("stables", cx + 6, cy + 8, 1);

      // Spawn units around the town center
      game.spawnUnit("infantry", cx + 2, cy - 2, 1);
      game.spawnUnit("infantry", cx + 3, cy - 2, 1);
      game.spawnUnit("infantry", cx + 2, cy - 3, 1);
      game.spawnUnit("archer", cx - 3, cy + 2, 1);
      game.spawnUnit("archer", cx - 4, cy + 2, 1);
      game.spawnUnit("archer", cx - 3, cy + 3, 1);
      game.spawnUnit("cavalry", cx + 4, cy + 4, 1);
      game.spawnUnit("cavalry", cx + 5, cy + 4, 1);
      game.spawnUnit("cavalry", cx + 4, cy + 5, 1);

      // Spawn a second player's base nearby
      game.spawnBuilding("town_center", cx + 30, cy + 30, 2);
      game.spawnBuilding("barracks", cx + 38, cy + 26, 2);
      game.spawnBuilding("archery_range", cx + 24, cy + 36, 2);
      game.spawnBuilding("stables", cx + 36, cy + 38, 2);

      game.spawnUnit("infantry", cx + 32, cy + 28, 2);
      game.spawnUnit("infantry", cx + 33, cy + 28, 2);
      game.spawnUnit("archer", cx + 27, cy + 32, 2);
      game.spawnUnit("archer", cx + 28, cy + 32, 2);
      game.spawnUnit("cavalry", cx + 34, cy + 34, 2);
      game.spawnUnit("cavalry", cx + 35, cy + 34, 2);

      // Center camera on map
      const mapCenter = tileToScreen(cx, cy);
      camera.centerOn(mapCenter.x, mapCenter.y);

      // Add layer manager root to stage (contains all render layers)
      app.stage.addChild(layers.getRoot());
      
      // Add tilemap to terrain layer
      layers.getLayer(RenderLayer.TERRAIN).addChild(tilemap.getContainer());

      // Input state
      let isDragging = false;
      let lastMouseX = 0;
      let lastMouseY = 0;

      // Mouse events for panning
      app.canvas.addEventListener("mousedown", (e) => {
        if (e.button === 0 || e.button === 2) {
          isDragging = true;
          lastMouseX = e.clientX;
          lastMouseY = e.clientY;
        }
      });

      app.canvas.addEventListener("mousemove", (e) => {
        if (isDragging) {
          const deltaX = e.clientX - lastMouseX;
          const deltaY = e.clientY - lastMouseY;
          camera.pan(deltaX, deltaY);
          lastMouseX = e.clientX;
          lastMouseY = e.clientY;
        }
      });

      app.canvas.addEventListener("mouseup", () => {
        isDragging = false;
      });

      app.canvas.addEventListener("mouseleave", () => {
        isDragging = false;
      });

      // Scroll wheel for zoom
      app.canvas.addEventListener("wheel", (e) => {
        e.preventDefault();
        const rect = app.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        camera.zoomAt(e.deltaY, mouseX, mouseY);
      }, { passive: false });

      // Prevent context menu
      app.canvas.addEventListener("contextmenu", (e) => {
        e.preventDefault();
      });

      // Game loop
      let frameCount = 0;
      app.ticker.add((ticker) => {
        // Update performance monitor
        if (perfMonitor) {
          perfMonitor.update(performance.now());
          frameCount++;
          if (frameCount % 10 === 0) {
            setPerfStats({
              fps: perfMonitor.getFPS(),
              frameTime: perfMonitor.getFrameTime(),
              lagSpikes: perfMonitor.getLagSpikes(),
              status: perfMonitor.getStatus(),
            });
          }
        }

        // Update game state
        game.update(ticker.deltaTime);

        // Update camera size on resize
        camera.setScreenSize(app.screen.width, app.screen.height);
        
        // Apply camera transform to all layers at once
        layers.applyCamera(
          app.screen.width,
          app.screen.height,
          camera.x,
          camera.y,
          camera.zoom
        );

        // Render tilemap (terrain layer)
        tilemap.render(camera);

        // Render entities
        entityRenderer.renderBuildings(game.getBuildings(), camera);
        entityRenderer.renderUnits(game.getUnits(), camera);
      });
    };

    initPixi();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, []);

  const statusColor = {
    good: "text-green-400",
    warning: "text-yellow-400",
    bad: "text-red-400",
  }[perfStats.status];

  return (
    <>
      <div
        ref={containerRef}
        className="w-full h-full absolute inset-0"
      />
      {isDev && (
        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs font-mono px-2 py-1 rounded pointer-events-none">
          <div className={statusColor}>
            FPS: {perfStats.fps} | Frame: {perfStats.frameTime.toFixed(1)}ms
          </div>
          {perfStats.lagSpikes > 0 && (
            <div className="text-orange-400">
              Lag spikes: {perfStats.lagSpikes}
            </div>
          )}
        </div>
      )}
    </>
  );
}
