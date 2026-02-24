import { GameObjects } from "phaser";
import type { Game } from "../scenes/Game";

export class GridRenderSystem {
  constructor(private scene: Game) {}

  drawGrid() {
    // configures graphics
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(1, 0x1f3b4a, 0.1);

    this.drawVerticalGridLines(graphics);
    this.drawHorizontalGridLines(graphics);
  }

  drawVerticalGridLines(g: GameObjects.Graphics) {
    // Draw vertical grid lines.
    // We start at x=0 (left edge of world) and step by `cell` pixels each line.
    // The final line is at x=worldW.
    for (let x = 0; x <= this.scene.worldW; x += this.scene.cell) {
      // Begin a new line path so each line is its own clean stroke.
      g.beginPath();

      // Move the "pen" to the top of the world at this x position.
      g.moveTo(x, 0);

      // Draw the line down to the bottom of the world at the same x position.
      g.lineTo(x, this.scene.worldH);

      // Actually render (stroke) the path we just defined.
      g.strokePath();
    }
  }

  drawHorizontalGridLines(g: GameObjects.Graphics) {
    // Draw horizontal grid lines.
    // We start at y=0 (top edge of world) and step by `cell` pixels each line.
    // The final line is at y=worldH.
    for (let y = 0; y <= this.scene.worldH; y += this.scene.cell) {
      // Begin a new line path for this horizontal line.
      g.beginPath();

      // Move the "pen" to the left of the world at this y position.
      g.moveTo(0, y);

      // Draw the line across to the right edge of the world at the same y position.
      g.lineTo(this.scene.worldW, y);

      // Render (stroke) the path we just defined.
      g.strokePath();
    }
  }
}
