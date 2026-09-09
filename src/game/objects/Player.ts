import * as Phaser from 'phaser';
import { PLAYER_SPEED, PLAYER_SPRINT_SPEED, Direction } from '../constants';
import { AnimationController } from '../utils/AnimationController';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private direction: Direction = 'down';
  private isMoving = false;
  private stepTimer = 0;
  private stepFrame = 0;
  private readonly STEP_INTERVAL = 110;
  private isSprinting = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(10);
    this.setCollideWorldBounds(true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    // Solid 22x22 body centered at feet (groundY=68) prevents tile seam penetration or wall clipping
    body.setSize(22, 22);
    body.setOffset(11, 52);
    body.allowRotation = false;
    body.setBounce(0, 0);
    body.setMaxVelocity(PLAYER_SPRINT_SPEED, PLAYER_SPRINT_SPEED);
    this.setFrame(0);
    this.setRotation(0);
    this.setAngle(0);
  }

  move(up: boolean, down: boolean, left: boolean, right: boolean, delta: number, sprint = false) {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);

    let dx = 0, dy = 0;
    if (left)  dx -= 1;
    if (right) dx += 1;
    if (up)    dy -= 1;
    if (down)  dy += 1;

    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

    this.isSprinting = sprint && (dx !== 0 || dy !== 0);
    const speed = this.isSprinting ? PLAYER_SPRINT_SPEED : PLAYER_SPEED;
    body.setVelocity(dx * speed, dy * speed);

    this.isMoving = dx !== 0 || dy !== 0;

    this.direction = AnimationController.getDirectionFromVelocity(body.velocity.x, body.velocity.y, this.direction);

    this.updateAnimation(delta);
  }

  private updateAnimation(delta: number) {
    const interval = this.isSprinting ? 75 : this.STEP_INTERVAL;
    const updated = AnimationController.updateSpriteFrame(this, this.direction, this.isMoving, delta, {
      stepTimer: this.stepTimer,
      stepFrame: this.stepFrame,
      stepInterval: interval,
    });
    this.stepTimer = updated.stepTimer;
    this.stepFrame = updated.stepFrame;
  }

  getDirection(): Direction { return this.direction; }
  isCurrentlyMoving(): boolean { return this.isMoving; }
  isCurrentlySprinting(): boolean { return this.isSprinting; }
}
