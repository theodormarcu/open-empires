"use client";

import { useEffect, useRef, useState } from "react";
import { Application } from "pixi.js";
import { Camera, Tilemap, TerrainSprites, PerformanceMonitor, LayerManager, RenderLayer, SpriteLoader, EntityRenderer } from "@/game/rendering";
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
      
      // Center camera on map
      const mapCenter = tileToScreen(MAP_WIDTH / 2, MAP_HEIGHT / 2);
      camera.centerOn(mapCenter.x, mapCenter.y);

      // Add layer manager root to stage (contains all render layers)
      app.stage.addChild(layers.getRoot());
      
      // Add tilemap to terrain layer
      layers.getLayer(RenderLayer.TERRAIN).addChild(tilemap.getContainer());

      // Load entity sprite sheets
      const spriteLoader = new SpriteLoader();
      await spriteLoader.loadSpritesheet("units", {
        path: "/assets/units_placeholder.png",
        frameWidth: 64,
        frameHeight: 64,
        columns: 4,
        rows: 1,
      });
      await spriteLoader.loadSpritesheet("buildings", {
        path: "/assets/buildings_placeholder.png",
        frameWidth: 128,
        frameHeight: 128,
        columns: 7,
        rows: 1,
      });

      // Create entity renderer
      const entityRenderer = new EntityRenderer(
        layers.getLayer(RenderLayer.UNITS),
        layers.getLayer(RenderLayer.BUILDINGS),
        spriteLoader
      );

      // Initialize game and spawn initial entities
      const game = new Game(app);

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
      app.ticker.add((_ticker) => {
        // Update performance monitor
        if (perfMonitor) {
          perfMonitor.update(performance.now());
          frameCount++;
          // Update React state every 10 frames to avoid excessive re-renders
          if (frameCount % 10 === 0) {
            setPerfStats({
              fps: perfMonitor.getFPS(),
              frameTime: perfMonitor.getFrameTime(),
              lagSpikes: perfMonitor.getLagSpikes(),
              status: perfMonitor.getStatus(),
            });
          }
        }

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

        // Update game state
        game.update(_ticker.deltaTime);

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
