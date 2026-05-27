"use client";

import { useEffect, useRef, useState } from "react";
import { Application, Graphics } from "pixi.js";
import { Camera, Tilemap, TerrainSprites, PerformanceMonitor, LayerManager, RenderLayer, UnitRenderer } from "@/game/rendering";
import { tileToScreen } from "@/game/rendering/isometric";
import { MAP_WIDTH, MAP_HEIGHT } from "@/game/constants";
import { Game } from "@/game/Game";
import { SelectionManager } from "@/game/SelectionManager";

const isDev = process.env.NODE_ENV === "development";
const DRAG_THRESHOLD = 4;

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

      // Initialize core systems
      const camera = new Camera(app.screen.width, app.screen.height);
      const layers = new LayerManager();
      const tilemap = new Tilemap(terrainSprites);
      const perfMonitor = isDev ? new PerformanceMonitor() : null;
      const game = new Game(app);

      // Unit renderer on the UNITS layer
      const unitRenderer = new UnitRenderer(layers.getLayer(RenderLayer.UNITS));

      // Selection overlay on UI_OVERLAY layer
      const selectionOverlay = new Graphics();
      layers.getLayer(RenderLayer.UI_OVERLAY).addChild(selectionOverlay);
      const selectionManager = new SelectionManager(selectionOverlay, unitRenderer, camera);

      // Center camera on map
      const mapCenter = tileToScreen(MAP_WIDTH / 2, MAP_HEIGHT / 2);
      camera.centerOn(mapCenter.x, mapCenter.y);

      // Add layer manager root to stage
      app.stage.addChild(layers.getRoot());

      // Add tilemap to terrain layer
      layers.getLayer(RenderLayer.TERRAIN).addChild(tilemap.getContainer());

      // Input state
      let isRightDragging = false;
      let leftMouseDown = false;
      let leftDownX = 0;
      let leftDownY = 0;
      let leftExceededThreshold = false;
      let lastMouseX = 0;
      let lastMouseY = 0;

      app.canvas.addEventListener("mousedown", (e) => {
        if (e.button === 0) {
          leftMouseDown = true;
          leftDownX = e.clientX;
          leftDownY = e.clientY;
          leftExceededThreshold = false;
          lastMouseX = e.clientX;
          lastMouseY = e.clientY;

          const rect = app.canvas.getBoundingClientRect();
          selectionManager.onMouseDown(
            e.clientX - rect.left,
            e.clientY - rect.top,
            e.button,
            e.shiftKey,
          );
        } else if (e.button === 2) {
          isRightDragging = true;
          lastMouseX = e.clientX;
          lastMouseY = e.clientY;
        }
      });

      app.canvas.addEventListener("mousemove", (e) => {
        // Right-click drag always pans
        if (isRightDragging) {
          const deltaX = e.clientX - lastMouseX;
          const deltaY = e.clientY - lastMouseY;
          camera.pan(deltaX, deltaY);
          lastMouseX = e.clientX;
          lastMouseY = e.clientY;
        }

        if (leftMouseDown) {
          const dx = e.clientX - leftDownX;
          const dy = e.clientY - leftDownY;
          if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
            leftExceededThreshold = true;
          }

          const rect = app.canvas.getBoundingClientRect();
          selectionManager.onMouseMove(e.clientX - rect.left, e.clientY - rect.top);

          // If not box-selecting (shift not held and no box forming), pan
          if (leftExceededThreshold && !selectionManager.exceedsDragThreshold()) {
            const deltaX = e.clientX - lastMouseX;
            const deltaY = e.clientY - lastMouseY;
            camera.pan(deltaX, deltaY);
          }

          lastMouseX = e.clientX;
          lastMouseY = e.clientY;
        }
      });

      app.canvas.addEventListener("mouseup", (e) => {
        if (e.button === 0 && leftMouseDown) {
          leftMouseDown = false;
          const rect = app.canvas.getBoundingClientRect();
          const units = game.getUnits();
          selectionManager.onMouseUp(e.clientX - rect.left, e.clientY - rect.top, units);
        }
        if (e.button === 2) {
          isRightDragging = false;
        }
      });

      app.canvas.addEventListener("mouseleave", () => {
        leftMouseDown = false;
        leftExceededThreshold = false;
        isRightDragging = false;
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
          if (frameCount % 10 === 0) {
            setPerfStats({
              fps: perfMonitor.getFPS(),
              frameTime: perfMonitor.getFrameTime(),
              lagSpikes: perfMonitor.getLagSpikes(),
              status: perfMonitor.getStatus(),
            });
          }
        }

        camera.setScreenSize(app.screen.width, app.screen.height);

        layers.applyCamera(
          app.screen.width,
          app.screen.height,
          camera.x,
          camera.y,
          camera.zoom,
        );

        // Render terrain
        tilemap.render(camera);

        // Render units with selection info
        const units = game.getUnits();
        unitRenderer.render(units, camera, selectionManager.selectedIds);

        // Render selection box overlay
        selectionManager.renderBoxSelect();
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
