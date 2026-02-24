import { Game } from "../scenes/Game";
import { Math as PMath } from "phaser";

export class CameraPanSystem {
  constructor(private scene: Game) {}

  update(deltaSeconds: number) {
    // update() runs once per frame.
    // Phaser automatically calls it.
    //
    // The first parameter is "time" (total time since game started).
    // We are not using it here, so we name it "_" to indicate it's unused.
    //
    // The second parameter "delta" is the time (in milliseconds)
    // since the LAST frame was rendered.

    // directionX and directionY represent DIRECTION, not distance.
    //
    // -1 means move left/up
    //  1 means move right/down
    //  0 means no movement
    // Example: directionX = -2 that means two to the left
    //
    // These are unit direction values.
    let directionX = 0;
    let directionY = 0;

    directionX = this.checkHorizontalInput(directionX);
    directionY = this.checkVerticalInput(directionY);
    this.normalizeDiagonalMovement(directionX, directionY);

    const moveX = this.calculateXMovement(directionX, deltaSeconds);
    const moveY = this.calculateYMovement(directionY, deltaSeconds);

    this.applyMovement(moveX, moveY);

    // You had clampCamera() defined but were not calling it in your update.
    // This keeps the camera inside world bounds.
    this.clampCamera();
  }

  checkHorizontalInput(directionX: number): number {
    if (this.scene.cursors.left?.isDown || this.scene.wasd.A.isDown)
      directionX -= 1;
    if (this.scene.cursors.right?.isDown || this.scene.wasd.D.isDown)
      directionX += 1;
    return directionX; // ✅ return the updated value
  }

  checkVerticalInput(directionY: number): number {
    if (this.scene.cursors.up?.isDown || this.scene.wasd.W.isDown)
      directionY -= 1;
    if (this.scene.cursors.down?.isDown || this.scene.wasd.S.isDown)
      directionY += 1;
    return directionY; // ✅ return the updated value
  }

  normalizeDiagonalMovement(directionX: number, directionY: number) {
    // If the player presses two keys at once (like right + down),
    // directionX = 1 and directionY = 1.
    //
    // That creates a vector (1,1).
    //
    // The length of (1,1) is √2 ≈ 1.41.
    // That means diagonal movement would be ~41% faster
    // than moving straight.
    //
    // To fix that, we normalize the vector.
    //
    // Normalizing means:
    //   Keep direction
    //   Make total length = 1
    //
    // So (1,1) becomes (~0.707, ~0.707).
    if (directionX !== 0 || directionY !== 0) {
      // Math.hypot(directionX, directionY) calculates √(directionX² + directionY²)
      const length = Math.hypot(directionX, directionY);

      // Divide both components by the vector length
      directionX /= length;
      directionY /= length;
    }
  }

  calculateXMovement(
    directionX: number,
    timeSinceLastFrameRendered: number,
  ): number {
    // camSpeed is defined in pixels per second.
    //
    // directionX and directionY are direction (-1 to 1).
    //
    // dt is how many seconds passed since last frame.
    //
    // So:
    // distance = direction × speed × time
    return directionX * this.scene.camSpeed * timeSinceLastFrameRendered;
  }

  calculateYMovement(
    directionY: number,
    timeSinceLastFrameRendered: number,
  ): number {
    return directionY * this.scene.camSpeed * timeSinceLastFrameRendered;
  }

  applyMovement(moveX: number, moveY: number) {
    // scrollX and scrollY represent
    // where the camera is positioned in the world.
    //
    // Increasing scrollX moves camera right.
    // Increasing scrollY moves camera down.
    this.scene.cam.scrollX += moveX;
    this.scene.cam.scrollY += moveY;
  }

  clampCamera() {
    // Without this, the camera could scroll past
    // the edge of the world and show empty space.
    //
    // Clamp(value, min, max) forces the value
    // to stay within that range.
    //
    // The max scroll position is:
    // world size minus the viewport size.
    //
    // Example:
    // If worldW = 2000 and camera width = 800,
    // maximum scrollX = 1200.
    this.scene.cam.scrollX = PMath.Clamp(
      this.scene.cam.scrollX,
      0,
      this.scene.worldW - this.scene.cam.width,
    );

    this.scene.cam.scrollY = PMath.Clamp(
      this.scene.cam.scrollY,
      0,
      this.scene.worldH - this.scene.cam.height,
    );
  }
}
