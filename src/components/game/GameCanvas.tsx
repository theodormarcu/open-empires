"use client";

import { useEffect, useRef, useState } from "react";
import { Application } from "pixi.js";
import { Camera, Tilemap, TerrainSprites, PerformanceMonitor, LayerManager, RenderLayer, UnitRenderer } from "@/game/rendering";
import { tileToScreen } from "@/game/rendering/isometric";
import { MAP_WIDTH, MAP_HEIGHT } from "@/game/constants";
import { Game } from "@/game/Game";
import { SelectionManager } from "@/game/SelectionManager";
import type { Unit } from "@/game/types";

const isDev = process.env.NODE_ENV === "development";

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const [perfStats, setPerfStats] = useState({ fps: 0, frameTime: 0, lagSpikes: 0, status: "good" as "good" | "warning" | "bad" });
  const [selectionCount, setSelectionCount] = useState(0);

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

      // Initialize core systems
      const camera = new Camera(app.screen.width, app.screen.height);
      const layers = new LayerManager();
      const tilemap = new Tilemap(terrainSprites);
      const game = new Game(app);
      const unitRenderer = new UnitRenderer(layers.getLayer(RenderLayer.UNITS));
      const selectionManager = new SelectionManager(layers.getLayer(RenderLayer.UI_OVERLAY));
      const perfMonitor = isDev ? new PerformanceMonitor() : null;

      // Center camera on map
      const mapCenter = tileToScreen(MAP_WIDTH / 2, MAP_HEIGHT / 2);
      camera.centerOn(mapCenter.x, mapCenter.y);

      // Add layer manager root to stage
      app.stage.addChild(layers.getRoot());

      // Add tilemap to terrain layer
      layers.getLayer(RenderLayer.TERRAIN).addChild(tilemap.getContainer());

      // ── Input state ──────────────────────────────────────────────────
      let rightDragging = false;
      let lastMouseX = 0;
      let lastMouseY = 0;

      // Left-click: selection (short click) or box-select (drag)
      app.canvas.addEventListener("mousedown", (e) => {
        if (e.button === 0) {
          selectionManager.handleMouseDown(e.clientX, e.clientY);
        } else if (e.button === 2) {
          rightDragging = true;
          lastMouseX = e.clientX;
          lastMouseY = e.clientY;
        }
      });

      app.canvas.addEventListener("mousemove", (e) => {
        // Forward to selection manager for box-select tracking
        selectionManager.handleMouseMove(e.clientX, e.clientY);

        // Right-drag pans camera
        if (rightDragging) {
          const deltaX = e.clientX - lastMouseX;
          const deltaY = e.clientY - lastMouseY;
          camera.pan(deltaX, deltaY);
          lastMouseX = e.clientX;
          lastMouseY = e.clientY;
        }
      });

      app.canvas.addEventListener("mouseup", (e) => {
        if (e.button === 0) {
          const units = game.getUnits();
          selectionManager.handleMouseUp(e.clientX, e.clientY, e.shiftKey, units, camera);
          setSelectionCount(selectionManager.getSelectedIds().size);
        } else if (e.button === 2) {
          rightDragging = false;
        }
      });

      app.canvas.addEventListener("mouseleave", () => {
        rightDragging = false;
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

      // ── Game loop ────────────────────────────────────────────────────
      let frameCount = 0;
      app.ticker.add((ticker) => {
        // Update game state
        game.update(ticker.deltaMS);

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

        // Update camera size on resize
        camera.setScreenSize(app.screen.width, app.screen.height);

        // Apply camera transform to all layers at once
        layers.applyCamera(
          app.screen.width,
          app.screen.height,
          camera.x,
          camera.y,
          camera.zoom,
        );

        // Render tilemap (terrain layer)
        tilemap.render(camera);

        // Render units on the UNITS layer
        const units: Unit[] = game.getUnits();
        unitRenderer.render(units, camera);

        // Render selection indicators + drag box on UI_OVERLAY layer
        selectionManager.renderSelectionIndicators(units, camera);
        selectionManager.renderDragBox(camera);
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
          {selectionCount > 0 && (
            <div className="text-cyan-400">
              Selected: {selectionCount}
            </div>
          )}
        </div>
      )}
    </>
  );
}
