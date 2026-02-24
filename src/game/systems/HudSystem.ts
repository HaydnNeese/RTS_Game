import type { Game } from "../scenes/Game";

export class HudSystem {
  constructor(private scene: Game) {}

  createHUD() {
    // Add a text label at the top-left of the screen.
    // By default, game objects exist in the world and would scroll if the camera moves.
    const label = this.scene.add.text(8, 8, "RTS GAME: DEMO", {
      // Font family for the label text.
      fontFamily: "Arial",

      // Font size for the label text.
      fontSize: "9px",

      // Text color.
      color: "#ffffff",
    });

    // setScrollFactor(0) means:
    // - this text will NOT move when the camera scrolls
    // - it's "pinned" to the screen like a UI/HUD element
    label.setScrollFactor(0);
  }
}
