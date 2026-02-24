import { Scene, Types, Input, Cameras } from "phaser";
import { CameraPanSystem } from "../systems/CameraPanSystem";
import { GridRenderSystem } from "../systems/GridRenderSystem";
import { UnitSystem } from "../systems/UnitSystem";
import { HudSystem } from "../systems/HudSystem";
import { PointerControlsSystem } from "../systems/PointerControlSystem";
export class Game extends Scene {
  // --- WORLD CONFIG ---
  // Total world size (camera cannot move outside this)
  public readonly worldW = 2000;
  public readonly worldH = 2000;

  // Size of one grid cell (for drawing)
  public readonly cell = 16;

  // --- CAMERA MOVEMENT CONFIG ---
  // Speed in pixels per second
  public readonly camSpeed = 600;

  // --- INPUT ---
  public cursors!: Types.Input.Keyboard.CursorKeys;
  public wasd!: {
    W: Input.Keyboard.Key;
    A: Input.Keyboard.Key;
    S: Input.Keyboard.Key;
    D: Input.Keyboard.Key;
  };

  // --- CAMERA ---
  public cam!: Cameras.Scene2D.Camera;

  // --- SYSTEMS ---
  private cameraPanSystem!: CameraPanSystem;
  private gridRenderSystem!: GridRenderSystem;
  private hudSystem!: HudSystem;
  private unitSystem!: UnitSystem;
  private pointerControlsSystem!: PointerControlsSystem;

  constructor() {
    super("Game");
  }

  preload() {
    // empty for now
    // used to load assets for art, maybe more
  }

  create() {
    // We set up input first so our update() can safely read key states.
    this.setupInputs();

    // We set up the camera next so our world has bounds and a background.
    this.initializeCamera();

    // Prevent the browser context menu from appearing on right-click
    // (very important for RTS controls)
    this.input.mouse?.disableContextMenu();

    // --- CREATE SYSTEMS ---
    this.gridRenderSystem = new GridRenderSystem(this);
    this.hudSystem = new HudSystem(this);
    this.unitSystem = new UnitSystem(this);
    this.pointerControlsSystem = new PointerControlsSystem(
      this,
      this.unitSystem,
    );
    this.cameraPanSystem = new CameraPanSystem(this);

    // Draw the grid so we can see the world moving underneath the camera.
    this.gridRenderSystem.drawGrid();

    // Add a HUD label that stays pinned to the screen.
    this.hudSystem.createHUD();

    // Add the placeholder unit to the list of units
    this.unitSystem.createUnits();

    // RTS click controls
    this.pointerControlsSystem.setupPointerControls();
  }

  update(_: number, delta: number) {
    const dtSeconds = delta / 1000;
    // Camera panning stays in Step 2 architecture.
    // Units are selected/commanded via pointer systems.
    this.cameraPanSystem.update(dtSeconds);
    this.unitSystem.update(dtSeconds);
  }

  initializeCamera() {
    this.cam = this.cameras.main;
    this.cam.setBounds(0, 0, this.worldW, this.worldH);
    this.cam.setBackgroundColor("#0b2a3a");
  }

  setupInputs() {
    // Built-in helper for arrow keys
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Manually grab WASD keys
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as any;
  }
}
