import * as Phaser from 'phaser';
import { TILE_SIZE, Direction, TILE_ID, MAP_COLS, MAP_ROWS } from '../constants';
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

  private lastDistToNode = 99999;
  private stuckTimer = 0;
  private readonly STUCK_THRESHOLD = 650;

  private currentPath: { col: number; row: number }[] = [];
  private pathIdx = 0;

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
    body.setSize(18, 16);
    body.setOffset(13, 58);
    body.setImmovable(false);
    body.allowRotation = false;
    this.setFrame(0);
    this.setRotation(0);
    this.setAngle(0);

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

    // Show exclamation mark IF AND ONLY IF the NPC has an active dialogue
    // with choices that advance or complete an uncompleted mission.
    const anyAvailable = this.def.dialogues.some(d => {
      if (d.id === 'idle') return false;
      const condMet = !d.condition || d.condition(state);
      if (!condMet) return false;
      if (!d.choices || d.choices.length === 0) return false;

      return d.choices.some(c => {
        if (!c.missionEffect) return false;
        const [mId] = c.missionEffect.split(':');
        return !state.completedMissions.includes(mId);
      });
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

    // Soft separation to prevent overlapping with other visible NPCs
    const npcs = (this.scene as any).npcs as NPC[] | undefined;
    if (npcs && this.visible && this.def.role !== 'patient') {
      for (const other of npcs) {
        if (other === this || !other.visible || other.def.role === 'patient') continue;
        const odx = this.x - other.x;
        const ody = this.y - other.y;
        const distSq = odx * odx + ody * ody;
        const minSpacing = 28; // minimum spacing between character centers
        if (distSq < minSpacing * minSpacing && distSq > 0.001) {
          const dist = Math.sqrt(distSq);
          const push = (minSpacing - dist) / minSpacing;
          const factor = 30 * (delta / 1000);
          this.x += (odx / dist) * push * factor;
          this.y += (ody / dist) * push * factor;
        }
      }
    }

    // NPCs with 1 or fewer patrol points stand still at their designated spot — no random wander
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
        this.recalculatePath();
      }
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      this.updateFrame(delta, false);
      this.updateLabels();
      return;
    }

    if (this.currentPath.length === 0) {
      this.recalculatePath();
      if (this.currentPath.length === 0) {
        (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        this.updateFrame(delta, false);
        this.updateLabels();
        return;
      }
    }

    const nextTile = this.currentPath[this.pathIdx];
    if (!nextTile) {
      this.recalculatePath();
      return;
    }

    const tx = (nextTile.col + 0.5) * TILE_SIZE;
    const ty = (nextTile.row + 0.5) * TILE_SIZE;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);

    const isFinalNode = this.pathIdx === this.currentPath.length - 1;
    const arrivalThreshold = isFinalNode ? 3.5 : 5.5;

    if (dist < arrivalThreshold) {
      if (!isFinalNode) {
        this.pathIdx++;
        this.stuckTimer = 0;
        this.lastDistToNode = 99999;
      } else {
        (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        this.isWaiting = true;
        this.waitTimer = Phaser.Math.Between(2500, 5000);
        this.currentPath = [];
        this.pathIdx = 0;
        this.stuckTimer = 0;
        this.lastDistToNode = 99999;

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

        if (facedPoint) {
          this.interactionBubble?.setVisible(false);
        }
        this.updateFrame(delta, false);
      }
    } else {
      const body = this.body as Phaser.Physics.Arcade.Body;

      // Obstacle detection: if body blocked against wall/prop or not making progress
      const isBlocked = body.blocked.left || body.blocked.right || body.blocked.up || body.blocked.down;
      if (isBlocked || dist >= this.lastDistToNode - 0.2) {
        this.stuckTimer += delta;
      } else {
        this.stuckTimer = 0;
      }
      this.lastDistToNode = dist;

      if (this.stuckTimer >= this.STUCK_THRESHOLD) {
        // Blocked for too long: stop, advance waypoint, and pause briefly rather than walking into wall
        body.setVelocity(0, 0);
        this.stuckTimer = 0;
        this.lastDistToNode = 99999;
        this.isWaiting = true;
        this.waitTimer = 1800;
        this.waypointIdx = (this.waypointIdx + 1) % this.def.patrolPoints.length;
        this.currentPath = [];
        this.pathIdx = 0;
        this.updateFrame(delta, false);
        this.updateLabels();
        return;
      }

      const vx = (dx / dist) * NPC_SPEED;
      const vy = (dy / dist) * NPC_SPEED;
      body.setVelocity(vx, vy);

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

    // 1. Check for an active (unlocked AND uncompleted) mission dialogue in this.def.dialogues
    for (const d of this.def.dialogues) {
      if (d.id === 'idle') continue;
      if (d.condition && !d.condition(state)) continue;

      // Check if this dialogue's mission is already completed
      let isCompleted = false;
      if (d.choices && d.choices.length > 0) {
        const effects = d.choices
          .map(c => c.missionEffect)
          .filter((e): e is string => !!e);

        if (effects.length > 0) {
          const uncompleted = effects.filter(e => {
            const [mId] = e.split(':');
            return !state.completedMissions.includes(mId);
          });
          if (uncompleted.length === 0) {
            isCompleted = true;
          }
        }
      }

      if (!isCompleted) {
        found = d;
        break;
      }
    }

    // 2. If no active uncompleted mission dialogue is available, return 'idle' dialogue
    if (!found) {
      for (const d of this.def.dialogues) {
        if (d.id === 'idle') {
          if (!d.condition || d.condition(state)) {
            found = d;
            break;
          }
        }
      }
      if (!found) {
        // Find any idle or last dialogue
        found = this.def.dialogues.find(d => d.id === 'idle') || this.def.dialogues[this.def.dialogues.length - 1];
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

  private recalculatePath() {
    if (this.def.patrolPoints.length <= 1) {
      this.currentPath = [];
      this.pathIdx = 0;
      return;
    }

    const startCol = Math.floor(this.x / TILE_SIZE);
    const startRow = Math.floor(this.y / TILE_SIZE);
    const target = this.def.patrolPoints[this.waypointIdx];
    if (!target) return;

    const mapData = (this.scene as any).mapData;
    const solidPropTiles = (this.scene as any).solidPropTiles as Set<string> | undefined;

    if (mapData) {
      const p = findPath(startCol, startRow, target.col, target.row, mapData, solidPropTiles);
      if (p && p.length > 0) {
        // If first tile in path is already our current tile, start at the next tile
        if (p.length > 1) {
          const firstTx = (p[0].col + 0.5) * TILE_SIZE;
          const firstTy = (p[0].row + 0.5) * TILE_SIZE;
          if (Math.hypot(firstTx - this.x, firstTy - this.y) < 8) {
            this.currentPath = p.slice(1);
          } else {
            this.currentPath = p;
          }
        } else {
          this.currentPath = p;
        }
        this.pathIdx = 0;
        this.lastDistToNode = 99999;
        return;
      }
    }

    // Pathfinding could not find a valid route — do NOT walk into walls or teleport!
    this.currentPath = [];
    this.pathIdx = 0;
    this.isWaiting = true;
    this.waitTimer = 2000;
    this.waypointIdx = (this.waypointIdx + 1) % this.def.patrolPoints.length;
    if (this.body) {
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
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

function findPath(
  startCol: number,
  startRow: number,
  endCol: number,
  endRow: number,
  mapData: number[][],
  solidPropTiles?: Set<string>
): { col: number; row: number }[] | null {
  if (startCol === endCol && startRow === endRow) {
    return [{ col: endCol, row: endRow }];
  }

  // Ensure start tile is within bounds and walkable
  let sc = Math.max(0, Math.min(MAP_COLS - 1, startCol));
  let sr = Math.max(0, Math.min(MAP_ROWS - 1, startRow));
  if (mapData[sr][sc] === TILE_ID.WALL || mapData[sr][sc] === TILE_ID.GARDEN) {
    const neighbors = [
      { c: sc, r: sr - 1 }, { c: sc, r: sr + 1 }, { c: sc - 1, r: sr }, { c: sc + 1, r: sr }
    ];
    for (const n of neighbors) {
      if (n.r >= 0 && n.r < MAP_ROWS && n.c >= 0 && n.c < MAP_COLS) {
        if (mapData[n.r][n.c] !== TILE_ID.WALL && mapData[n.r][n.c] !== TILE_ID.GARDEN) {
          sc = n.c;
          sr = n.r;
          break;
        }
      }
    }
  }

  // Ensure end tile is within bounds and walkable
  let ec = Math.max(0, Math.min(MAP_COLS - 1, endCol));
  let er = Math.max(0, Math.min(MAP_ROWS - 1, endRow));
  if (mapData[er][ec] === TILE_ID.WALL || mapData[er][ec] === TILE_ID.GARDEN) {
    const neighbors = [
      { c: ec, r: er - 1 }, { c: ec, r: er + 1 }, { c: ec - 1, r: er }, { c: ec + 1, r: er }
    ];
    for (const n of neighbors) {
      if (n.r >= 0 && n.r < MAP_ROWS && n.c >= 0 && n.c < MAP_COLS) {
        if (mapData[n.r][n.c] !== TILE_ID.WALL && mapData[n.r][n.c] !== TILE_ID.GARDEN) {
          ec = n.c;
          er = n.r;
          break;
        }
      }
    }
  }

  const queue: { col: number; row: number; path: { col: number; row: number }[] }[] = [];
  const visited: boolean[][] = Array.from({ length: MAP_ROWS }, () => Array(MAP_COLS).fill(false));

  queue.push({ col: sc, row: sr, path: [] });
  visited[sr][sc] = true;

  while (queue.length > 0) {
    const curr = queue.shift()!;

    if (curr.col === ec && curr.row === er) {
      return [...curr.path, { col: ec, row: er }];
    }

    const dirs = [
      { dCol: 0, dRow: -1 }, // Up
      { dCol: 0, dRow: 1 },  // Down
      { dCol: -1, dRow: 0 }, // Left
      { dCol: 1, dRow: 0 },  // Right
    ];

    for (const d of dirs) {
      const nc = curr.col + d.dCol;
      const nr = curr.row + d.dRow;

      if (nc >= 0 && nc < MAP_COLS && nr >= 0 && nr < MAP_ROWS) {
        if (!visited[nr][nc]) {
          visited[nr][nc] = true;

          const tile = mapData[nr][nc];
          const isPropBlocked = solidPropTiles && solidPropTiles.has(`${nc},${nr}`) && !(nc === ec && nr === er);
          const isWalkable = tile !== TILE_ID.WALL && tile !== TILE_ID.GARDEN && !isPropBlocked;

          if (isWalkable) {
            queue.push({
              col: nc,
              row: nr,
              path: [...curr.path, { col: curr.col, row: curr.row }]
            });
          }
        }
      }
    }
  }

  return null;
}
