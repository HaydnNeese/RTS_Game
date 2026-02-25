import { GameObjects, Input } from "phaser";
import type { Game } from "../scenes/Game";
import type { UnitSystem } from "./UnitSystem";

export class PointerControlsSystem {
  // ============================================================
  // DRAG-BOX SELECTION STATE
  // ============================================================

  /**
   * We track whether the left mouse button is currently held down.
   * This tells us whether we should treat pointer movement as:
   * - "just moving the cursor"  (mouse not held)
   * - or "potentially dragging" (mouse held)
   */
  private isLeftMouseDown = false;

  /**
   * We don't want every small mouse movement to become a drag.
   * dragActivated only becomes true AFTER the mouse has moved past a small threshold.
   *
   * This is a standard RTS behavior:
   * - a click with tiny hand jitter stays a click
   * - a deliberate drag turns into a selection box
   */
  private dragActivated = false;

  /**
   * Drag start point stored in SCREEN coordinates (pointer.x / pointer.y).
   *
   * WHY SCREEN COORDS:
   * - A drag-box is a UI overlay on the screen.
   * - It should look the same regardless of camera scroll or zoom.
   * - If we used world coords to draw the rectangle, zoom would distort it.
   */
  private dragStartScreenX = 0;
  private dragStartScreenY = 0;

  // Small movement threshold so clicks don't become drags.
  private readonly DRAG_THRESHOLD_PX = 6;

  // We draw the selection box as a screen-space overlay
  private selectionGraphics: GameObjects.Graphics | null = null;

  constructor(
    private scene: Game,
    private unitSystem: UnitSystem,
  ) {}

  setupPointerControls() {
    const cam = this.scene.cameras.main;

    // Create the overlay graphics ONCE.
    // We don't want to create/destroy graphics every drag; that would be noisy & wasteful.
    this.selectionGraphics = this.scene.add.graphics();

    // scrollFactor(0) means: "do not move with the camera".
    // That makes this graphic a true SCREEN-SPACE overlay.
    this.selectionGraphics.setScrollFactor(0);

    // Depth just ensures it draws above the grid and units.
    // If your grid is also Graphics-based, this prevents z-order confusion.
    this.selectionGraphics.setDepth(1000);

    // ============================================================
    // POINTER DOWN
    // ============================================================
    // Start of either:
    // - a click
    // - or a drag (we don't know yet)
    this.scene.input.on("pointerdown", (pointer: Input.Pointer) => {
      // RIGHT CLICK: unselect unit (your requested behavior)
      if (pointer.rightButtonDown()) {
        this.cancelDragBox();
        this.unitSystem.clearSelection();
        return;
      }

      // We only care about LEFT click for selection/commanding
      if (!pointer.leftButtonDown()) return;

      // Record that left mouse is down -> we may start dragging on move.
      this.isLeftMouseDown = true;
      this.dragActivated = false;

      // Record start point in SCREEN space.
      this.dragStartScreenX = pointer.x;
      this.dragStartScreenY = pointer.y;
    });

    // ============================================================
    // POINTER MOVE
    // ============================================================
    // Only matters if left mouse is down.
    // If left mouse is not down, moving the mouse should do nothing.

    this.scene.input.on("pointermove", (pointer: Input.Pointer) => {
      if (!this.isLeftMouseDown) return;

      // Compute movement from drag start (screen space).
      const dx = pointer.x - this.dragStartScreenX;
      const dy = pointer.y - this.dragStartScreenY;

      // If we haven't yet commited to being a drag, test threshold (6px)
      if (!this.dragActivated) {
        // Compare squared distance to avoid sqrt
        const distSq = dx * dx + dy * dy;
        const thresholdSq = this.DRAG_THRESHOLD_PX * this.DRAG_THRESHOLD_PX;

        // Not enough movement yet -> keep waiting
        // This preserves click behavior.
        if (distSq < thresholdSq) return;

        // Once we exceed the threshold, we COMMIT to drag mode.
        // After this, releasing the mouse will do box selection,
        // not a normal click action.

        this.dragActivated = true;
      }

      // If we are dragging, draw the drag-box overlay.
      // Note: this is still SCREEN space drawing.
      this.drawDragBox(
        this.dragStartScreenX,
        this.dragStartScreenY,
        pointer.x,
        pointer.y,
      );
    });

    // ============================================================
    // POINTER UP
    // ============================================================
    // This is where we "resolve" what the user intended:
    // - If we were dragging -> box select.
    // - If we were not dragging -> normal click logic.
    //
    // IMPORTANT:
    // We resolve on pointerup instead of pointerdown because:
    // - we need to know whether the player dragged
    // - if we select on pointerdown, we'd select something and then drag-select immediately,
    //   which feels glitchy

    this.scene.input.on("pointerup", (pointer: Input.Pointer) => {
      // Only handle left button releases.
      if (pointer.button !== 0) return;

      const wasDragging = this.dragActivated;

      // Reset drag state first so it doesn't leak into the next interaction.
      this.isLeftMouseDown = false;
      this.dragActivated = false;

      // Always clear the drag overlay when the mouse is released.
      this.clearDragBoxVisual();

      if (wasDragging) {
        // ============================================================
        // DRAG-SELECT PATH
        // ============================================================
        // Convert our SCREEN rectangle into a WORLD rectangle.
        // This is critical because units exist in world space.
        //
        // Camera is the bridge between screen and world coordinates.
        // With zoom/pan, the conversion is not 1:1.

        const worldRect = this.screenDragToWorldRect(
          this.dragStartScreenX,
          this.dragStartScreenY,
          pointer.x,
          pointer.y,
          cam,
        );

        // Ask UnitSystem to select units inside this world rectangle.
        // PointerControlSystem should NOT iterate unit data directly.
        this.unitSystem.selectUnitsInWorldRect(worldRect);

        // Drag-select completes here.
        return;
      }

      // ============================================================
      // CLICK PATH (no drag)
      // ============================================================
      // pointer.worldX/worldY are world-space coords provided by Phaser.
      // They already account for camera pan/zoom.

      const worldX = pointer.worldX;
      const worldY = pointer.worldY;

      // 1) Try selecting a unit at the clicked point.
      // If successful, we stop. (Clicking a unit should not issue a move command.)
      const clickedUnit = this.unitSystem.selectUnitAtWorld(worldX, worldY);
      if (clickedUnit) return;

      // 2) Otherwise it was a ground click.
      // If nothing is selected, do nothing (common RTS baseline behavior).
      if (!this.unitSystem.hasSelection()) return;

      // 3) If a selection exists, ground click becomes a MOVE command.
      this.unitSystem.moveSelectedUnitsTo(worldX, worldY);
    });
  }

  // ============================================================
  // DRAG BOX VISUALS (SCREEN SPACE)
  // ============================================================

  /**
   * Draw a rectangle between two screen-space points.
   * This is purely visual and does NOT affect selection logic directly.
   */
  private drawDragBox(x1: number, y1: number, x2: number, y2: number) {
    if (!this.selectionGraphics) return;

    // Normalize so we always have top-left + width/height
    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);

    this.selectionGraphics.clear();

    // Simple visuals: green outline + light fill.
    // This is not final UI art; it's functional debug UI that reads clearly.
    this.selectionGraphics.lineStyle(1, 0x00ff00, 1);
    this.selectionGraphics.strokeRect(left, top, width, height);

    this.selectionGraphics.fillStyle(0x00ff00, 0.12);
    this.selectionGraphics.fillRect(left, top, width, height);
  }

  private clearDragBoxVisual() {
    this.selectionGraphics?.clear();
  }

  /**
   * Cancels drag selection state and clears visuals.
   * Used when right-clicking or when we want to forcibly stop a drag.
   */
  private cancelDragBox() {
    this.isLeftMouseDown = false;
    this.dragActivated = false;
    this.clearDragBoxVisual();
  }

  // ============================================================
  // SCREEN -> WORLD RECT CONVERSION
  // ============================================================

  /**
   * Converts a drag rectangle defined in SCREEN space into a WORLD-space rectangle.
   *
   * WHY THIS EXISTS:
   * - The player drags on the screen.
   * - Units exist in world space.
   * - Camera transforms (scroll + zoom) mean the mapping is not 1:1.
   *
   * So we:
   * 1) normalize screen-space rectangle corners
   * 2) use cam.getWorldPoint() to convert both corners into world space
   * 3) build a world-space Phaser Rectangle for selection tests
   */
  private screenDragToWorldRect(
    sx1: number,
    sy1: number,
    sx2: number,
    sy2: number,
    cam: Phaser.Cameras.Scene2D.Camera,
  ): Phaser.Geom.Rectangle {
    // Normalize screen rectangle corners
    const leftS = Math.min(sx1, sx2);
    const rightS = Math.max(sx1, sx2);
    const topS = Math.min(sy1, sy2);
    const bottomS = Math.max(sy1, sy2);

    // Convert both corners to world space.
    // We must convert both ends because zoom/pan affect the mapping.
    const topLeftW = cam.getWorldPoint(leftS, topS);
    const bottomRightW = cam.getWorldPoint(rightS, bottomS);

    // Normalize again in world space (safe even if camera flips or weird transforms happen).
    const leftW = Math.min(topLeftW.x, bottomRightW.x);
    const rightW = Math.max(topLeftW.x, bottomRightW.x);
    const topW = Math.min(topLeftW.y, bottomRightW.y);
    const bottomW = Math.max(topLeftW.y, bottomRightW.y);

    // Phaser Rectangle: (x, y, width, height)
    return new Phaser.Geom.Rectangle(
      leftW,
      topW,
      rightW - leftW,
      bottomW - topW,
    );
  }
}
