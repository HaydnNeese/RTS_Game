import type { Game } from "../scenes/Game";
import { snapWorldToGridCenter } from "../utils/grid";
import type { UnitSystem } from "./UnitSystem";

export class PointerControlsSystem {
  constructor(
    private scene: Game,
    private unitSystem: UnitSystem,
  ) {}

  setupPointerControls() {
    // Listen for any pointer down anywhere in the scene
    this.scene.input.on("pointerdown", (pointer: any) => {
      // RIGHT CLICK: unselect unit (your requested behavior)
      if (pointer.rightButtonDown()) {
        this.unitSystem.clearSelection();
        return;
      }

      // We only care about LEFT click for selection/commanding
      if (!pointer.leftButtonDown()) return;

      // pointer.worldX/worldY gives the click location in WORLD coordinates
      // (meaning it respects camera scroll/zoom).
      const worldX = pointer.worldX;
      const worldY = pointer.worldY;

      // 1) First: attempt to select a unit at this click location.
      // If we clicked a unit, selection is handled and we STOP.
      const clickedUnit = this.unitSystem.selectUnitAtWorld(worldX, worldY);
      if (clickedUnit) return;

      // 2) Otherwise this is a ground click.
      // If nothing is selected, ignore (common RTS behavior).
      if (!this.unitSystem.hasSelection()) return;

      // 3) Issue move command to selected units.
      // UnitSystem will snap to grid and place the marker (per our design).
      this.unitSystem.moveSelectedUnitsTo(worldX, worldY);
    });
  }
}
