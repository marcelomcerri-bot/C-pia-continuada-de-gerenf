import * as Phaser from 'phaser';
import { TILE_SIZE, Direction } from '../constants';
import { MISSIONS } from '../data/gameData';
import type { NPCDef, GameState, DialogueDef } from '../data/gameData';
import { AnimationController } from '../utils/AnimationController';

const NPC_SPEED = 55;

export class NPC extends Phaser.Physics.Arcade.Sprite {
  readonly def: NPCDef;
  private direction: Direction = 'down';
  private stepTimer = 0;
  private stepFrame = 0;
  private readonly STEP_INTERVAL = 150;
  private waypointIdx = 0;
  private waitTimer = 0;
  private isWaiting = false;
  private exclamationMark: Phaser.GameObjects.Text | null = null;
  private nameLabel: Phaser.GameObjects.Text | null = null;
  private hasMission = false;

  private interactionBubble: Phaser.GameObjects.Text | null = null;
  private interactionBubbleTimer = 0;

  private lastX = 0;
  private lastY = 0;
  private stuckTimer = 0;
  private readonly STUCK_THRESHOLD = 800;

  private slideHorizontalTimer = 0;
  private slideVerticalTimer = 0;

  // Track how many times the player has talked to this NPC (for dialogue rotation)
  private conversationCount = 0;

  constructor(scene: Phaser.Scene, def: NPCDef) {
    const x = (def.startCol + 0.5) * TILE_SIZE;
    const y = (def.startRow + 0.5) * TILE_SIZE;
    super(scene, x, y, def.id);
    this.def = def;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(10);

    const body = this.body as Phaser.Physics.Arcade.Body;
    // Body aligned with character's visual feet (drawn at groundY=68 in the 128px canvas)
    body.setSize(14, 14);
    body.setOffset(15, 61);
    body.setImmovable(false);
    body.allowRotation = false;
    this.setFrame(0);
    this.setRotation(0);
    this.setAngle(0);

    this.lastX = x;
    this.lastY = y;

    const roleColors: Record<string, string> = {
      doctor: '#3498db', nurse: '#2ecc71', technician: '#9b59b6',
      admin: '#f39c12', receptionist: '#1abc9c', other: '#bdc3c7',
    };
    const nameCol = roleColors[def.role] || '#ffffff';

    this.nameLabel = scene.add.text(x, y - 36, def.name, {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: '13px',
      fontStyle: 'bold',
      color: nameCol,
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(20);

    this.interactionBubble = scene.add.text(x, y - 64, '', {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: '14px',
      backgroundColor: '#0f172ab3',
      padding: { x: 5, y: 3 },
    }).setOrigin(0.5, 1).setDepth(21).setVisible(false);

    const roleTag = scene.add.text(x, y - 50, def.title, {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: '10px',
      color: '#cbd5e1',
      stroke: '#000000',
      strokeThickness: 2,
      resolution: 2,
    }).setOrigin(0.5, 1).setDepth(20).setVisible(false);
    this.setData('roleTag', roleTag);

    this.exclamationMark = scene.add.text(x, y - 58, '!', {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#fbbf24',
      stroke: '#b45309',
      strokeThickness: 3.5,
    }).setOrigin(0.5, 1).setDepth(21).setVisible(false);
  }

  /** Hide all UI elements (name label, shadow, role tag, exclamation mark).
   *  Used for patient NPCs whose visual is embedded in the bed graphic. */
  hideUI() {
    this.nameLabel?.setVisible(false);
    this.exclamationMark?.setVisible(false);
    this.interactionBubble?.setVisible(false);
    (this.getData('roleTag') as Phaser.GameObjects.Text | null)?.setVisible(false);
    (this.getData('shadow') as Phaser.GameObjects.Shape | null)?.setVisible(false);
  }

  setHasMission(has: boolean) {
    this.hasMission = has;
    if (!this.visible || this.def.role === 'patient') {
      this.exclamationMark?.setVisible(false);
    } else {
      this.exclamationMark?.setVisible(has);
    }
  }

  updateMissionStatus(state: GameState) {
    if (!this.visible || this.def.role === 'patient') {
      this.setHasMission(false);
      return;
    }

    // Only show exclamation mark if there is an active mission that is unlocked
    // AND the NPC actually has a non-idle dialogue with decision choices available.
    const anyAvailable = this.def.missionIds.some(id => {
      if (state.completedMissions.includes(id)) return false;
      const m = MISSIONS.find(mission => mission.id === id);
      if (!m) return false;
      const preMet = m.prerequisiteIds.every(reqId => state.completedMissions.includes(reqId));
      if (!preMet) return false;

      // Ensure NPC has a matching active non-idle dialogue with choices
      const d = this.def.dialogues.find(dialogue => dialogue.id !== 'idle' && (!dialogue.condition || dialogue.condition(state)));
      return d && d.choices && d.choices.length > 0;
    });

    this.setHasMission(anyAvailable);
  }

  update(delta: number) {
    // Guard against updates firing after this NPC (or its physics body) has been
    // destroyed — e.g. scene shutdown/HMR races where npcs[] isn't cleared in time.
    if (!this.active || !this.body) return;

    if ((window as any).dialogActive) {
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      this.updateFrame(delta, false);
      this.updateLabels();
      return;
    }

    if (this.slideHorizontalTimer > 0) {
      this.slideHorizontalTimer -= delta;
      if (this.slideHorizontalTimer < 0) this.slideHorizontalTimer = 0;
    }
    if (this.slideVerticalTimer > 0) {
      this.slideVerticalTimer -= delta;
      if (this.slideVerticalTimer < 0) this.slideVerticalTimer = 0;
    }

    // NPCs with 1 or fewer patrol points stand still at their designated spot — no random wander to avoid hitting walls
    if (this.def.patrolPoints.length <= 1) {
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      this.updateFrame(delta, false);
      this.updateLabels();
      return;
    }

    if (this.isWaiting) {
      this.waitTimer -= delta;

      if (this.interactionBubble?.visible) {
        this.interactionBubbleTimer -= delta;
        if (this.interactionBubbleTimer <= 0) {
          this.interactionBubble.setVisible(false);
        } else {
          const floatY = Math.sin(this.scene.time.now / 200) * 2;
          this.interactionBubble.setY(this.y - this.displayHeight / 2 - 32 + floatY);
        }
      }

      if (this.waitTimer <= 0) {
        this.isWaiting = false;
        this.waypointIdx = (this.waypointIdx + 1) % this.def.patrolPoints.length;
        this.interactionBubble?.setVisible(false);
      }
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      this.updateFrame(delta, false);
      this.updateLabels();
      return;
    }

    const target = this.def.patrolPoints[this.waypointIdx];
    const tx = (target.col + 0.5) * TILE_SIZE;
    const ty = (target.row + 0.5) * TILE_SIZE;
    const dx = tx - this.x, dy = ty - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const expectedDist = (NPC_SPEED / 1000) * delta;
    const movedDelta = Math.hypot(this.x - this.lastX, this.y - this.lastY);
    if (movedDelta < expectedDist * 0.45 && dist > 12) {
      this.stuckTimer += delta;
      if (this.stuckTimer >= this.STUCK_THRESHOLD) {
        this.stuckTimer = 0;
        this.waypointIdx = (this.waypointIdx + 1) % this.def.patrolPoints.length;
        this.lastX = this.x; this.lastY = this.y;
        return;
      }
    } else {
      this.stuckTimer = 0;
    }
    this.lastX = this.x;
    this.lastY = this.y;

    if (dist < 12) {
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      this.setPosition(tx, ty);
      this.isWaiting = true;
      this.waitTimer = Phaser.Math.Between(2000, 5000);

      let facedPoint: any = null;
      if (this.scene) {
        const gs = this.scene as any;
        if (gs.interactionPoints) {
          for (const pt of gs.interactionPoints) {
            const ndx = pt.x - this.x;
            const ndy = pt.y - this.y;
            if (Math.abs(ndx) <= 34 && Math.abs(ndy) <= 34) {
              if (Math.abs(ndx) > Math.abs(ndy)) {
                this.direction = ndx > 0 ? 'right' : 'left';
              } else {
                this.direction = ndy > 0 ? 'down' : 'up';
              }
              facedPoint = pt;
              break;
            }
          }
        }
      }

      if (!facedPoint) {
        // Keep current direction
      } else {
        // Keep interaction bubbles hidden to avoid floating computer icons
        this.interactionBubble?.setVisible(false);
      }
      this.updateFrame(delta, false);
    } else {
      const body = this.body as Phaser.Physics.Arcade.Body;

      // Check if we just hit a wall in this frame and activate the corresponding sliding timer
      if (body.blocked.left || body.blocked.right) {
        this.slideHorizontalTimer = 350; // slide vertically for 350ms
      }
      if (body.blocked.up || body.blocked.down) {
        this.slideVerticalTimer = 350; // slide horizontally for 350ms
      }

      // If we are close enough to vertical or horizontal alignment, cancel sliding to move directly
      if (Math.abs(dy) < 6) {
        this.slideHorizontalTimer = 0;
      }
      if (Math.abs(dx) < 6) {
        this.slideVerticalTimer = 0;
      }

      let vx = (dx / dist) * NPC_SPEED;
      let vy = (dy / dist) * NPC_SPEED;

      // Apply sliding vectors based on active timers
      if (this.slideHorizontalTimer > 0 && this.slideVerticalTimer > 0) {
        // Stuck in a corner (blocked on both axes), stop completely to avoid fluttering
        vx = 0;
        vy = 0;
      } else if (this.slideHorizontalTimer > 0) {
        vx = 0;
        vy = dy > 0 ? NPC_SPEED : -NPC_SPEED;
      } else if (this.slideVerticalTimer > 0) {
        vy = 0;
        vx = dx > 0 ? NPC_SPEED : -NPC_SPEED;
      }

      body.setVelocity(vx, vy);

      // Use AnimationController to determine the movement direction based on physical velocity vectors
      this.direction = AnimationController.getDirectionFromVelocity(vx, vy, this.direction);
      this.updateFrame(delta, true);
    }

    this.updateLabels();
  }

  private updateLabels() {
    if (!this.visible || this.def.role === 'patient') {
      this.nameLabel?.setVisible(false);
      this.exclamationMark?.setVisible(false);
      return;
    }

    const offsetY = -40;
    this.nameLabel?.setPosition(this.x, this.y + offsetY);

    const roleTag = this.getData('roleTag') as Phaser.GameObjects.Text | null;
    roleTag?.setPosition(this.x, this.y + offsetY - 12);

    const exclY = this.y + offsetY - (roleTag ? 22 : 10);
    this.exclamationMark?.setPosition(this.x, exclY);
    this.exclamationMark?.setVisible(this.hasMission);

    if (this.hasMission && this.exclamationMark?.visible) {
      const floatY = Math.sin(this.scene.time.now / 400) * 3;
      this.exclamationMark.setY(exclY + floatY);
    }
  }

  private updateFrame(delta: number, moving: boolean) {
    const updated = AnimationController.updateSpriteFrame(this, this.direction, moving, delta, {
      stepTimer: this.stepTimer,
      stepFrame: this.stepFrame,
      stepInterval: this.STEP_INTERVAL,
    });
    this.stepTimer = updated.stepTimer;
    this.stepFrame = updated.stepFrame;
  }

  getActiveMission(state: GameState) {
    return this.def.missionIds.find(id => !state.completedMissions.includes(id));
  }

  /** Returns dialogue with choices shuffled — order changes every conversation */
  getDialogue(state: GameState): DialogueDef {
    let found: DialogueDef | null = null;

    // 1. First, check if there is an active (unlocked and not completed) mission dialogue in this.def.dialogues
    // A non-idle dialogue is considered an active mission dialogue if its condition evaluates to true
    let activeMissionDialogue: DialogueDef | null = null;
    for (const d of this.def.dialogues) {
      if (d.id !== 'idle') {
        if (!d.condition || d.condition(state)) {
          activeMissionDialogue = d;
          break;
        }
      }
    }

    if (activeMissionDialogue) {
      found = activeMissionDialogue;
    } else {
      // 2. If no active mission dialogue is available, fall back to dialogue pools (quizzes) if defined
      if (this.def.dialoguePools && this.def.dialoguePools.length > 0) {
        const poolIdx = this.conversationCount % this.def.dialoguePools.length;
        const pool = this.def.dialoguePools[poolIdx];
        for (const d of pool) {
          if (!d.condition || d.condition(state)) { found = d; break; }
        }
        if (!found) found = pool[pool.length - 1];
      } else {
        // Fall back to the 'idle' dialogue in this.def.dialogues
        for (const d of this.def.dialogues) {
          if (!d.condition || d.condition(state)) { found = d; break; }
        }
        if (!found) found = this.def.dialogues[this.def.dialogues.length - 1];
      }
    }

    this.conversationCount++;

    // Shuffle choices so correct answer is never in a predictable position
    const shuffledChoices = found.choices ? shuffleArray([...found.choices]) : [];
    return { ...found, choices: shuffledChoices };
  }

  setDirection(dir: Direction) {
    this.direction = dir;
    this.updateFrame(0, false);
  }

  stopMoving() {
    this.isWaiting = true;
    this.waitTimer = 999999;
    if (this.body) {
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
  }

  resumeMoving() {
    this.isWaiting = false;
    this.waitTimer = 0;
  }

  destroy(fromScene?: boolean) {
    this.nameLabel?.destroy();
    this.exclamationMark?.destroy();
    this.interactionBubble?.destroy();
    (this.getData('roleTag') as Phaser.GameObjects.Text | null)?.destroy();
    (this.getData('shadow') as Phaser.GameObjects.Shape | null)?.destroy();
    super.destroy(fromScene);
  }
}

function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
