export class PerformanceMonitor {
  private fps: number = 0;
  private frameTime: number = 0;
  private frameTimes: number[] = [];
  private lastFrameTime: number = 0;
  private recentLagSpikes: number[] = []; // timestamps of recent lag spikes
  private maxSamples: number = 60;
  private lagThresholdMs: number = 50; // > 50ms = below 20fps (more lenient)
  private lagWindowMs: number = 5000; // track spikes in last 5 seconds

  public update(currentTime: number): void {
    if (this.lastFrameTime === 0) {
      this.lastFrameTime = currentTime;
      return;
    }

    const delta = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    this.frameTime = delta;

    // Track frame times for averaging
    this.frameTimes.push(delta);
    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift();
    }

    // Calculate average FPS
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.fps = 1000 / avgFrameTime;

    // Detect lag spikes (track timestamps, not cumulative count)
    if (delta > this.lagThresholdMs) {
      this.recentLagSpikes.push(currentTime);
    }

    // Remove old lag spikes outside the window
    const cutoff = currentTime - this.lagWindowMs;
    this.recentLagSpikes = this.recentLagSpikes.filter(t => t > cutoff);
  }

  public getFPS(): number {
    return Math.round(this.fps);
  }

  public getFrameTime(): number {
    return this.frameTime;
  }

  public getLagSpikes(): number {
    return this.recentLagSpikes.length;
  }

  public resetLagSpikes(): void {
    this.recentLagSpikes = [];
  }

  public getStatus(): "good" | "warning" | "bad" {
    if (this.fps >= 55) return "good";
    if (this.fps >= 30) return "warning";
    return "bad";
  }
}
