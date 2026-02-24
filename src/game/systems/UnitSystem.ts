import { GameObjects } from "phaser";
import type { Game } from "../scenes/Game";
import {
  snapWorldToGridCenter,
  tileToWorldCenter,
  worldToTile,
} from "../utils/grid";

export type TileCoord = { tx: number; ty: number };

type UnitRecord = {
  body: GameObjects.Rectangle;
  selected: boolean;
  moveSpeedPxPerSec: number;
  destinationTile?: TileCoord;
  waypointQueue: Array<{ x: number; y: number }>;
};

export class UnitSystem {
  // --- UNITS (PLACEHOLDERS) ---
  // We store our units so we can manage them (select, command, etc.)
  public units: UnitRecord[] = [];

  // --- DESTINATION MARKER ---
  // This is a simple "go here" UI affordance. Later this may become part of a separate UI/HUD layer,
  // but keeping it here is OK for now while movement + commands are being proven out.
  private destinationMarker: GameObjects.Ellipse | null = null;

  constructor(private scene: Game) {}

  createUnits() {
    const rect = this.scene.add
      .rectangle(50, 50, 12, 12, 0xffffff)
      .setOrigin(0.5);

    const snapped = snapWorldToGridCenter(rect.x, rect.y);

    rect.setPosition(snapped.x, snapped.y);

    this.units.push({
      body: rect,
      selected: false,
      moveSpeedPxPerSec: 120,
      waypointQueue: [],
    });
  }

  update(dtSeconds: number) {
    for (const unit of this.units) {
      // No movement intent, nothing to do (continue instantly skips to next iteration)
      if (unit.waypointQueue.length === 0) continue;

      const target = unit.waypointQueue[0];

      // compute vector toward next waypoint
      const dx = target.x - unit.body.x;
      const dy = target.y - unit.body.y;

      // We use distance to decide if we "arrive" at the waypoint this frame.
      const dist = Math.sqrt(dx * dx + dy * dy);

      // If we're basically on the target, snap and pop the waypoint.
      // WHY SNAP:
      // Floating-point stepping can create tiny drift that accumulates.
      // Snapping at each tile center keeps the unit perfectly grid-aligned forever.
      const ARRIVE_EPSILON = 0.5;
      if (dist <= ARRIVE_EPSILON) {
        unit.body.setPosition(target.x, target.y);
        unit.waypointQueue.shift();

        // If that was the last waypoint, we've arrived.
        if (unit.waypointQueue.length === 0) {
          // Optional: clear destinationTile to indicate "idle".
          unit.destinationTile = undefined;
        }
        continue; // Move toward target using constant speed (pixels/sec).
      }

      // Move toward target using constant speed (pixels/sec).
      const step = unit.moveSpeedPxPerSec * dtSeconds;

      if (step >= dist) {
        // We can reach target this frame.
        unit.body.setPosition(target.x, target.y);
        unit.waypointQueue.shift();

        if (unit.waypointQueue.length === 0) {
          unit.destinationTile = undefined;
        }
      } else {
        // Move a partial step.
        const nx = dx / dist;
        const ny = dy / dist;
        unit.body.x += nx * step;
        unit.body.y += ny * step;
      }
    }

    this.updateDestinationMarkerState();
  }

  // ============================================================
  // SELECTION API
  // (Other systems call these; they do NOT touch unit records directly.)
  // ============================================================

  /**
   * Returns true if at least one unit is currently selected.
   * Useful for pointer logic (e.g., only allow move command if selection exists).
   * READ: This is currently used in the PointerControlSystem
   */
  hasSelection(): boolean {
    return this.units.some((u) => u.selected);
  }

  /**
   * Single-select behavior:
   * - Clicking a unit selects ONLY that unit.
   * - It clears all previous selection.
   *
   * Later, multi-select can be introduced by adding a "additive" parameter
   * (shift/ctrl), without rewriting everything.
   */
  selectUnitAtWorld(worldX: number, worldY: number): boolean {
    // Find the first unit whose bounds contain the click.
    // For rectangles this is fine; for sprites later, you might use hit areas.
    const clicked = this.units.find((u) =>
      u.body.getBounds().contains(worldX, worldY),
    );
    if (!clicked) return false;

    // Single-select: clear all first, then set one.
    this.clearSelection();

    clicked.selected = true;
    this.applySelectedStyle(clicked);

    return true;
  }

  /**
   * Clears selection for ALL units.
   * Keeping this explicit makes multi-select behavior predictable.
   */
  clearSelection() {
    for (const unit of this.units) {
      if (!unit.selected) continue;
      unit.selected = false;
      this.applyUnselectedStyle(unit);
    }

    // Optional UX decision:
    // When nothing is selected, we usually clear the destination marker.
    // This matches your previous "unselect clears marker" behavior.
    this.clearDestinationMarker();
  }

  // ============================================================
  // COMMAND API (movement intent)
  // ============================================================

  /**
   * Issues a "move" command to ALL currently selected units.
   * Even with one unit, this keeps the API future-proof for multi-select.
   */
  moveSelectedUnitsTo(worldX: number, worldY: number) {
    // Convert click to a tile center.
    const snapped = snapWorldToGridCenter(worldX, worldY);

    // Keep marker behavior here OR in PointerControlsSystem — choose one owner.
    // Since you already had marker functions inside UnitSystem, we keep it here.
    this.setDestinationMarker(snapped.x, snapped.y);

    const destTile = worldToTile(snapped.x, snapped.y);

    for (const unit of this.units) {
      if (!unit.selected) continue;

      const startTile = worldToTile(unit.body.x, unit.body.y);

      unit.destinationTile = destTile;

      // Simple stepping path (X then Y). Later swap with A* without changing callers.
      const tilePath = this.buildManhattanTilePath(startTile, destTile);

      // Convert tiles -> world tile centers.
      unit.waypointQueue = tilePath.map((t) => tileToWorldCenter(t.tx, t.ty));
    }
  }

  // ============================================================
  // DESTINATION MARKER (visual helper)
  // ============================================================

  setDestinationMarker(x: number, y: number) {
    if (this.destinationMarker) {
      this.destinationMarker.setPosition(x, y);
      return;
    }

    this.destinationMarker = this.scene.add
      .ellipse(x, y, 10, 10, 0xffff00)
      .setOrigin(0.5);

    this.destinationMarker.setStrokeStyle(2, 0x000000, 1);
  }

  // this checks if there are any selected units and if they are still moving to their destination
  // if none of that is true then we clear the destination marker
  updateDestinationMarkerState() {
    const anySelectedStillMoving = this.units.some(
      (u: UnitRecord) => u.selected && u.waypointQueue.length > 0,
    );

    if (!anySelectedStillMoving) {
      this.clearDestinationMarker();
    }
  }

  clearDestinationMarker() {
    this.destinationMarker?.destroy();
    this.destinationMarker = null;
  }

  // STYLING HELPERS
  // ============================================================

  private applySelectedStyle(unit: UnitRecord) {
    unit.body.setFillStyle(0x22ff22);
    unit.body.setStrokeStyle(2, 0x000000, 1);
  }

  private applyUnselectedStyle(unit: UnitRecord) {
    unit.body.setFillStyle(0xffffff);
    unit.body.setStrokeStyle(); // removes outline
  }

  // ============================================================
  // TILE / PATH HELPERS (private implementation details)
  // ============================================================

  /**
   * Returns a list of tiles to step through, excluding the start tile.
   * Example: start (2,2) -> dest (4,3) => [(3,2),(4,2),(4,3)]
   */
  private buildManhattanTilePath(
    start: TileCoord,
    dest: TileCoord,
  ): TileCoord[] {
    const path: TileCoord[] = [];
    let cx = start.tx;
    let cy = start.ty;

    while (cx !== dest.tx) {
      cx += Math.sign(dest.tx - cx);
      path.push({ tx: cx, ty: cy });
    }

    while (cy !== dest.ty) {
      cy += Math.sign(dest.ty - cy);
      path.push({ tx: cx, ty: cy });
    }

    return path;
  }
}
