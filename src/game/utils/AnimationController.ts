import * as Phaser from 'phaser';
import { Direction } from '../constants';

export class AnimationController {
  /**
   * Maps velocity vectors (vx, vy) to a stable Direction (up, down, left, right).
   * Employs direction hysteresis (thresholds) to eliminate micro-flickering or spinning
   * when moving along diagonal axes or close to physical obstacles.
   */
  static getDirectionFromVelocity(
    vx: number,
    vy: number,
    currentDir: Direction,
    threshold = 8
  ): Direction {
    const absX = Math.abs(vx);
    const absY = Math.abs(vy);

    // If velocity is extremely low, maintain current direction to prevent jitter
    if (absX < 2 && absY < 2) {
      return currentDir;
    }

    const isHorizontal = currentDir === 'left' || currentDir === 'right';

    if (isHorizontal) {
      // Only switch to vertical if the vertical speed is significantly higher than horizontal
      if (absY > absX + threshold) {
        return vy > 0 ? 'down' : 'up';
      } else if (absX > 2) {
        return vx > 0 ? 'right' : 'left';
      }
    } else {
      // Only switch to horizontal if the horizontal speed is significantly higher than vertical
      if (absX > absY + threshold) {
        return vx > 0 ? 'right' : 'left';
      } else if (absY > 2) {
        return vy > 0 ? 'down' : 'up';
      }
    }

    return currentDir;
  }

  /**
   * Explicitly updates the sprite's texture frame index according to its current direction row
   * and current walking cycle frame index, fully bypassing any built-in rotation properties.
   */
  static updateSpriteFrame(
    sprite: Phaser.GameObjects.Sprite,
    direction: Direction,
    isMoving: boolean,
    delta: number,
    state: { stepTimer: number; stepFrame: number; stepInterval: number }
  ): { stepTimer: number; stepFrame: number } {
    let { stepTimer, stepFrame, stepInterval } = state;

    if (isMoving) {
      stepTimer += delta;
      if (stepTimer >= stepInterval) {
        stepTimer -= stepInterval;
        stepFrame = (stepFrame + 1) % 6; // 6 frames per walk cycle
      }
    } else {
      stepFrame = 0;
      stepTimer = 0;
    }

    // Canvas frame sheets are built in sections of 6 frames per direction row:
    // dir0 = down (0-5), dir1 = up (6-11), dir2 = left (12-17), dir3 = right (18-23)
    const dirBase: Record<Direction, number> = {
      down: 0,
      up: 6,
      left: 12,
      right: 18,
    };

    const frameIndex = dirBase[direction] + stepFrame;
    sprite.setFrame(frameIndex);

    // Prevent any physics engine rotation on the Phaser sprite object
    sprite.setRotation(0);
    sprite.setAngle(0);

    return { stepTimer, stepFrame };
  }
}
