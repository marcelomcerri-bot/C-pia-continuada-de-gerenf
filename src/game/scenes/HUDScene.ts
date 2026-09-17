import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SCENES, EVENTS, MAP_COLS, MAP_ROWS, TILE_SIZE, CAREER_LEVELS } from '../constants';
import { getLevelInfo, MISSIONS, NPC_DEFS } from '../data/gameData';
import type { GameState, CrisisEvent } from '../data/gameData';
import { generateMapTiles, ROOM_FLOOR_COLORS_HUD } from './HUDMinimapHelper';

const MM_SCALE = 3;
const MM_W = MAP_COLS * MM_SCALE;
const MM_H = MAP_ROWS * MM_SCALE;
const MM_Y = 12;

import { playSound } from '../utils/audio';

const NPC_ROOM_MAP: Record<string, string> = {
  ana_recepcionista: 'Recepção',
  enf_carlos: 'Pronto-Socorro',
  joao_farmaceutico: 'Farmácia',
  tec_laboratorio: 'Laboratório',
  dr_radiologista: 'Diagnóstico por Imagem',
  diretora_alves: 'Diretoria',
  tec_rosa_cme: 'Central de Material',
  nutricionista_clara: 'Copa & Nutrição',
  enf_maria: 'Enfermaria',
  dr_oliveira: 'UTI Adulto',
  dra_santos: 'Oncologia',
  enf_pedro: 'Maternidade',
  tec_enf_pediatria: 'Maternidade',
  mae_maternidade: 'Maternidade',
  pai_maternidade: 'Maternidade',
  visitante_maternidade: 'Maternidade',
  paciente_gestante: 'Maternidade',
  medico_planto: 'Enfermaria',
  tecnico_enfermagem_geral: 'Posto de Enfermagem',
  limpeza_1: 'Corredor',
  estagiario_enf: 'Enfermaria',
  seguranca_1: 'Recepção',
  fisioterapeuta_marcos: 'Reabilitação',
  dra_helena: 'Saúde Mental',
  paciente_psic_1: 'Saúde Mental',
  dr_ps: 'Pronto-Socorro',
  tec_farmacia: 'Farmácia',
  paciente_lab: 'Laboratório',
  paciente_onco: 'Oncologia',
  paciente_enf_1: 'Enfermaria',
  paciente_enf_2: 'UTI Adulto',
  paciente_uti_1: 'UTI Adulto',
  paciente_ps_1: 'Pronto-Socorro',
  paciente_ps_2: 'Recepção',
  paciente_ps_3: 'Pronto-Socorro',
  paciente_amb_1: 'Diretoria',
  paciente_amb_2: 'Posto de Enfermagem',
  paciente_amb_3: 'Posto de Enfermagem',
  visitante_1: 'Recepção',
  visitante_2: 'Corredor',
};

export class HUDScene extends Phaser.Scene {
  // Time / shift
  private timeText!: Phaser.GameObjects.Text;
  private dayText!: Phaser.GameObjects.Text;
  private shiftIcon!: Phaser.GameObjects.Text;

  // Energy
  private energyBarFill!: Phaser.GameObjects.Graphics;
  private energyValText!: Phaser.GameObjects.Text;

  // Stress
  private stressBarFill!: Phaser.GameObjects.Graphics;
  private stressValText!: Phaser.GameObjects.Text;

  // Career
  private prestigeText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private careerBarFill!: Phaser.GameObjects.Graphics;

  // Mission
  private missionText!: Phaser.GameObjects.Text;

  // Minimap
  private minimapGfx!: Phaser.GameObjects.Graphics;
  private playerDot!: Phaser.GameObjects.Graphics;
  private mapData: number[][] = [];

  // Hint + room
  private hintContainer!: Phaser.GameObjects.Container;
  private hintText!: Phaser.GameObjects.Text;
  private roomLabel!: Phaser.GameObjects.Text;
  private roomLabelBg!: Phaser.GameObjects.Graphics;
  private currentRoomName: string = 'Corredor';

  // Guidance objective
  private currentGuidanceIdx: number = 0;
  private lastCompletedCount: number = -1;
  private previousTargetNpcId: string | null = null;
  private topBarCfg: {
    isTwoRow: boolean;
    bx: number;
    by: number;
    barW: number;
    barH: number;
    timeX: number; timeW: number;
    energyX: number; energyW: number;
    stressX: number; stressW: number;
    careerX: number; careerW: number;
    missionX: number; missionY: number; missionW: number; missionH: number;
  } | null = null;

  public guidanceList: Array<{ id: string; room: string; npc: string; action: string; col: number; row: number; missionKey: string; missionTitle?: string }> = [];

  private initGuidanceList() {
    this.recomputeGuidanceList();
    if (this.guidanceList.length > 0) {
      this.currentGuidanceIdx = Math.floor(Math.random() * this.guidanceList.length);
      this.previousTargetNpcId = this.guidanceList[this.currentGuidanceIdx]?.id || null;
    }
  }

  private lastGuidanceTextStr: string = '';
  private lastGuidanceColorStr: string = '';
  private lastGuidanceUpdateTime: number = 0;

  // Overlays
  private alertBanner: Phaser.GameObjects.Container | null = null;
  private crisisOverlay: Phaser.GameObjects.Container | null = null;
  private missionOverlay: Phaser.GameObjects.Container | null = null;
  private lastHudData?: { state: GameState; playerX: number; playerY: number; activeMission?: string };
  
  // Mobile Controls
  public virtualPad = { up: false, down: false, left: false, right: false, sprint: false, actionJustPressed: false, missionJustPressed: false, menuJustPressed: false };

  private get mmX(): number {
    return this.scale.width - 14 - MM_W;
  }

  constructor() { super({ key: SCENES.HUD, active: false }); }

  create() {
    this.initGuidanceList();
    this.mapData = generateMapTiles();
    this.buildMinimap();
    this.buildTopBar();
    this.buildBottomHint();
    this.buildRoomLabel();

    const isMobile = (window as any).__portraitMobile === true || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    if (isMobile) {
      this.buildMobileControls();
    }

    const gameScene = this.scene.get(SCENES.GAME);
    if (gameScene?.events) {
      gameScene.events.on(EVENTS.HUD_UPDATE, this.onHudUpdate, this);
      gameScene.events.on(EVENTS.INTERACTION_HINT, this.onHint, this);
      gameScene.events.on(EVENTS.ROOM_CHANGE, this.onRoomChange, this);
    }

    const handleResize = () => {
      this.rebuildHUD();
    };
    this.scale.on('resize', handleResize);

    const onWakeOrResume = () => {
      this.updateGuidanceDisplay();
      if (this.lastHudData) this.onHudUpdate(this.lastHudData);
    };
    this.events.on(Phaser.Scenes.Events.WAKE, onWakeOrResume);
    this.events.on(Phaser.Scenes.Events.RESUME, onWakeOrResume);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', handleResize);
      this.events.off(Phaser.Scenes.Events.WAKE, onWakeOrResume);
      this.events.off(Phaser.Scenes.Events.RESUME, onWakeOrResume);
      if (gameScene?.events) {
        gameScene.events.off(EVENTS.HUD_UPDATE, this.onHudUpdate, this);
        gameScene.events.off(EVENTS.INTERACTION_HINT, this.onHint, this);
        gameScene.events.off(EVENTS.ROOM_CHANGE, this.onRoomChange, this);
      }
    });
  }

  private rebuildHUD() {
    // Destroy all current HUD elements without restarting scene or leaking listeners
    this.children.removeAll(true);

    this.buildMinimap();
    this.buildTopBar();
    this.buildBottomHint();
    this.buildRoomLabel();

    const isMobile = (window as any).__portraitMobile === true || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    if (isMobile) {
      this.buildMobileControls();
    }

    // Restore HUD data to newly built labels and progress bars
    this.updateGuidanceDisplay();
    if (this.lastHudData) {
      this.onHudUpdate(this.lastHudData);
    }
  }

  private buildMobileControls() {
    // Hide keyboard hints container entirely on mobile
    this.hintContainer.setVisible(false);

    // Initialise window.virtualPad so GameScene can read it
    if (!(window as any).virtualPad) {
      (window as any).virtualPad = {
        up: false, down: false, left: false, right: false,
        sprint: false, actionJustPressed: false,
        missionJustPressed: false, menuJustPressed: false,
      };
    }
  }

  // ── MINIMAP ───────────────────────────────────────────────────────────────
  private buildMinimap() {
    const mmX = this.mmX;
    // Shadow
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.4);
    shadow.fillRoundedRect(mmX - 2, MM_Y - 2, MM_W + 16, MM_H + 24, 10);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x1a252f, 1);
    bg.fillRoundedRect(mmX - 6, MM_Y - 6, MM_W + 12, MM_H + 28, 10);
    bg.lineStyle(2, 0xf39c12, 1);
    bg.strokeRoundedRect(mmX - 6, MM_Y - 6, MM_W + 12, MM_H + 28, 10);

    this.minimapGfx = this.add.graphics();
    this.drawMinimap();

    // Player dot (animated)
    this.playerDot = this.add.graphics().setDepth(5);

    // Label
    this.add.text(mmX + MM_W / 2, MM_Y + MM_H + 8, 'MAPA HUAP', {
      fontFamily: 'monospace', fontSize: '12px', color: '#f39c12', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 0);
  }

  private drawMinimap() {
    const mmX = this.mmX;
    this.minimapGfx.clear();
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const tid = this.mapData[r][c];
        const col = ROOM_FLOOR_COLORS_HUD[tid] ?? 0x333344;
        this.minimapGfx.fillStyle(col, 1);
        this.minimapGfx.fillRect(mmX + c * MM_SCALE, MM_Y + r * MM_SCALE, MM_SCALE, MM_SCALE);
      }
    }
  }

  // ── TOP BAR ───────────────────────────────────────────────────────────────
  private buildTopBar() {
    const isMobile = (window as any).__portraitMobile === true || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || this.scale.width < 900;
    const barW = Math.min(this.mmX - 20, this.scale.width - MM_W - 32);
    const isTwoRow = barW < 880 || isMobile;
    const barH = isTwoRow ? 144 : 98;
    const bx = 12, by = 8;
    const gap = 6;

    let timeW = 0, energyW = 0, stressW = 0, careerW = 0, missionW = 0;
    let timeX = 0, energyX = 0, stressX = 0, careerX = 0, missionX = 0, missionY = 0, missionH = 0;

    if (isTwoRow) {
      // 2-row layout for Mobile / High DPI / Responsive screens:
      // Row 1 (Stats): 4 columns
      const colW = Math.floor((barW - 3 * gap) / 4);
      timeW = colW;
      energyW = colW;
      stressW = colW;
      careerW = barW - (colW * 3 + 3 * gap);

      timeX = 0;
      energyX = timeX + timeW + gap;
      stressX = energyX + energyW + gap;
      careerX = stressX + stressW + gap;

      // Row 2 (Mission Banner): Full width below stats
      missionX = 0;
      missionY = 68;
      missionW = barW;
      missionH = 68;
    } else {
      // 1-row layout for Large Desktop screens:
      const availW = barW - (4 * gap);
      timeW = Math.max(120, Math.floor(availW * 0.13));
      energyW = Math.max(135, Math.floor(availW * 0.16));
      stressW = Math.max(135, Math.floor(availW * 0.16));
      careerW = Math.max(120, Math.floor(availW * 0.14));

      timeX = 0;
      energyX = timeX + timeW + gap;
      stressX = energyX + energyW + gap;
      careerX = stressX + stressW + gap;
      missionX = careerX + careerW + gap;
      missionY = 0;
      missionW = barW - missionX;
      missionH = barH - 10;
    }

    this.topBarCfg = {
      isTwoRow, bx, by, barW, barH,
      timeX, timeW,
      energyX, energyW,
      stressX, stressW,
      careerX, careerW,
      missionX, missionY, missionW, missionH,
    };

    // Drop shadow
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.45);
    shadow.fillRoundedRect(bx + 3, by + 3, barW, barH, 14);

    // Background panel
    const bg = this.add.graphics();
    bg.fillStyle(0x050c18, 0.94);
    bg.fillRoundedRect(bx, by, barW, barH, 14);
    bg.lineStyle(2, 0x1abc9c, 0.85);
    bg.strokeRoundedRect(bx, by, barW, barH, 14);

    // Typography
    const TITLE_FONT = "'Rajdhani', 'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";
    const SUB_FONT = "'Segoe UI', 'Trebuchet MS', system-ui, sans-serif";
    const STAT_FONT = "'VT323', monospace";

    // Panel drawer helper
    const sec = (x: number, y: number, w: number, h: number) => {
      const g = this.add.graphics();
      g.fillStyle(0x0a1628, 0.88);
      g.fillRoundedRect(bx + x, by + y, w, h, 10);
      g.lineStyle(1.5, 0x1abc9c, 0.4);
      g.strokeRoundedRect(bx + x, by + y, w, h, 10);
      return g;
    };

    const row1H = isTwoRow ? 60 : barH - 10;

    // ─── 1. TIME / SHIFT ────────────────────────────────
    sec(timeX, 5, timeW, row1H);

    this.shiftIcon = this.add.text(bx + timeX + 8, by + (isTwoRow ? 8 : 7), 'TURNO', {
      fontFamily: TITLE_FONT,
      fontSize: '13px', fontStyle: 'bold', color: '#38bdf8',
    });

    this.dayText = this.add.text(bx + timeX + 8, by + (isTwoRow ? 34 : 28), isTwoRow ? 'D1 MANHÃ' : 'DIA 1\nMANHÃ', {
      fontFamily: TITLE_FONT, fontSize: '15px', fontStyle: 'bold', color: '#f1c40f',
      lineSpacing: 1,
    });

    this.timeText = this.add.text(bx + timeX + timeW - 8, by + (isTwoRow ? 18 : 8), '08:00', {
      fontFamily: STAT_FONT, fontSize: isTwoRow ? '28px' : '32px', color: '#f1c40f',
    }).setOrigin(1, 0);

    // ─── 2. ENERGY ──────────────────────────────────────
    sec(energyX, 5, energyW, row1H);

    this.add.text(bx + energyX + 8, by + (isTwoRow ? 8 : 7), 'ENERGIA', {
      fontFamily: TITLE_FONT,
      fontSize: '13px', fontStyle: 'bold', color: '#2ecc71',
    });

    this.energyValText = this.add.text(bx + energyX + energyW - 8, by + (isTwoRow ? 6 : 5), '100%', {
      fontFamily: STAT_FONT, fontSize: isTwoRow ? '24px' : '26px', color: '#2ecc71',
    }).setOrigin(1, 0);

    const enTrackW = Math.max(4, energyW - 16);
    const enBg = this.add.graphics();
    enBg.fillStyle(0x02070f, 1);
    enBg.fillRoundedRect(bx + energyX + 8, by + (isTwoRow ? 38 : 36), enTrackW, isTwoRow ? 15 : 16, 5);
    enBg.lineStyle(1.2, 0x1abc9c, 0.45);
    enBg.strokeRoundedRect(bx + energyX + 8, by + (isTwoRow ? 38 : 36), enTrackW, isTwoRow ? 15 : 16, 5);

    this.energyBarFill = this.add.graphics();

    if (!isTwoRow) {
      this.add.text(bx + energyX + 8, by + 60, 'DISPOSIÇÃO FÍSICA', {
        fontFamily: SUB_FONT, fontSize: '11px', color: '#94a3b8', fontStyle: 'bold',
      });
    }

    // ─── 3. STRESS ──────────────────────────────────────
    sec(stressX, 5, stressW, row1H);

    this.add.text(bx + stressX + 8, by + (isTwoRow ? 8 : 7), 'ESTRESSE', {
      fontFamily: TITLE_FONT,
      fontSize: '13px', fontStyle: 'bold', color: '#ff6b6b',
    });

    this.stressValText = this.add.text(bx + stressX + stressW - 8, by + (isTwoRow ? 6 : 5), '0%', {
      fontFamily: STAT_FONT, fontSize: isTwoRow ? '24px' : '26px', color: '#2ecc71',
    }).setOrigin(1, 0);

    const stTrackW = Math.max(4, stressW - 16);
    const stBg = this.add.graphics();
    stBg.fillStyle(0x02070f, 1);
    stBg.fillRoundedRect(bx + stressX + 8, by + (isTwoRow ? 38 : 36), stTrackW, isTwoRow ? 15 : 16, 5);
    stBg.lineStyle(1.2, 0xe74c3c, 0.45);
    stBg.strokeRoundedRect(bx + stressX + 8, by + (isTwoRow ? 38 : 36), stTrackW, isTwoRow ? 15 : 16, 5);

    this.stressBarFill = this.add.graphics();

    if (!isTwoRow) {
      this.add.text(bx + stressX + 8, by + 60, 'SOBRECARGA', {
        fontFamily: SUB_FONT, fontSize: '11px', color: '#94a3b8', fontStyle: 'bold',
      });
    }

    // ─── 4. CAREER ──────────────────────────────────────
    sec(careerX, 5, careerW, row1H);

    this.add.text(bx + careerX + 8, by + (isTwoRow ? 8 : 7), 'PONTOS', {
      fontFamily: TITLE_FONT,
      fontSize: '13px', fontStyle: 'bold', color: '#f39c12',
    });

    this.prestigeText = this.add.text(bx + careerX + 8, by + (isTwoRow ? 28 : 28), '0 pts', {
      fontFamily: STAT_FONT, fontSize: isTwoRow ? '24px' : '26px', color: '#f39c12',
    });

    this.levelText = this.add.text(0, 0, '').setVisible(false);
    this.careerBarFill = this.add.graphics();

    // ─── 5. ACTIVE MISSION ──────────────────────────────
    if (missionW >= 80) {
      sec(missionX, missionY + 5, missionW, missionH);

      this.add.text(bx + missionX + 12, by + missionY + 11, '🎯 MISSÃO ATIVA (Clique p/ trocar)', {
        fontFamily: SUB_FONT,
        fontSize: '13px', fontStyle: 'bold', color: '#f1c40f',
      });

      this.missionText = this.add.text(bx + missionX + 12, by + missionY + (isTwoRow ? 32 : 25), '', {
        fontFamily: SUB_FONT,
        fontSize: isTwoRow ? '16px' : '19px',
        fontStyle: 'bold',
        color: '#ffffff',
        wordWrap: { width: missionW - 24 },
        maxLines: 2,
        lineSpacing: 1,
      });

      // Interactive card to click and cycle objectives
      this.add.rectangle(bx + missionX + missionW / 2, by + missionY + missionH / 2 + 5, missionW, missionH)
        .setInteractive({ cursor: 'pointer' })
        .on('pointerdown', () => {
          try { playSound('click'); } catch {}
          this.nextGuidanceTarget();
        });

      this.updateGuidanceDisplay();
    } else {
      this.missionText = this.add.text(0, 0, '').setVisible(false);
    }
  }

  // ── BOTTOM HINT ───────────────────────────────────────────────────────────
  private buildBottomHint() {
    const W = Math.min(840, this.scale.width - 40), H = 36;
    this.hintContainer = this.add.container(0, 0);

    const bg = this.add.graphics();
    bg.fillStyle(0x0a1628, 0.94);
    bg.fillRoundedRect(this.scale.width / 2 - W / 2, this.scale.height - H - 10, W, H, 18);
    bg.lineStyle(2, 0x1abc9c, 0.8);
    bg.strokeRoundedRect(this.scale.width / 2 - W / 2, this.scale.height - H - 10, W, H, 18);

    this.hintText = this.add.text(this.scale.width / 2, this.scale.height - H / 2 - 10,
      'WASD: Mover  |  SHIFT: Correr  |  E: Interagir  |  M: Missões  |  C: 📖 Caderno de Erros  |  ESC: Menu', {
        fontFamily: "'VT323', monospace", fontSize: '20px', color: '#1abc9c',
      }).setOrigin(0.5)
      .setInteractive({ cursor: 'pointer' })
      .on('pointerdown', () => {
        playSound('click');
        window.dispatchEvent(new CustomEvent('togglenotebook'));
      });

    this.hintContainer.add([bg, this.hintText]);
  }

  // ── ROOM LABEL ────────────────────────────────────────────────────────────
  private roomSubLabel!: Phaser.GameObjects.Text;
  private roomNameText!: Phaser.GameObjects.Text;

  private getRoomLabelY(): number {
    if (this.topBarCfg) {
      return this.topBarCfg.by + this.topBarCfg.barH + 10;
    }
    return 130;
  }

  private buildRoomLabel() {
    const ry = this.getRoomLabelY();
    this.roomLabelBg = this.add.graphics();
    this.drawRoomLabel(this.currentRoomName);

    this.roomSubLabel = this.add.text(14 + 38, ry + 5, 'LOCALIZAÇÃO ATIVA', {
      fontFamily: "'Segoe UI', 'Trebuchet MS', system-ui, sans-serif",
      fontSize: '11px',
      color: '#38bdf8',
      fontStyle: 'bold',
    });

    this.roomNameText = this.add.text(14 + 38, ry + 18, this.currentRoomName.toUpperCase(), {
      fontFamily: "'Rajdhani', 'Trebuchet MS', 'Segoe UI', system-ui, sans-serif",
      fontSize: '15px',
      color: '#ffffff',
      fontStyle: 'bold',
    });

    this.roomLabel = this.roomNameText;
  }

  private drawRoomLabel(roomName: string) {
    if (!this.roomLabelBg) return;
    this.roomLabelBg.clear();
    
    const textStr = roomName.toUpperCase();
    const w = Math.min(Math.max(220, textStr.length * 10 + 55), 320);
    const h = 40;
    const rx = 14;
    const ry = this.getRoomLabelY();

    if (this.roomSubLabel) this.roomSubLabel.setPosition(rx + 38, ry + 4);
    if (this.roomNameText) this.roomNameText.setPosition(rx + 38, ry + 17);

    // Drop shadow
    this.roomLabelBg.fillStyle(0x000000, 0.45);
    this.roomLabelBg.fillRoundedRect(rx + 2, ry + 2, w, h, 10);

    // Dark inset medical telemetry backdrop panel
    this.roomLabelBg.fillStyle(0x07111e, 0.95);
    this.roomLabelBg.fillRoundedRect(rx, ry, w, h, 10);

    // Glowing cyan border
    this.roomLabelBg.lineStyle(1.8, 0x1abc9c, 0.95);
    this.roomLabelBg.strokeRoundedRect(rx, ry, w, h, 10);

    // Interior top accent line
    this.roomLabelBg.lineStyle(1, 0x38bdf8, 0.35);
    this.roomLabelBg.lineBetween(rx + 10, ry + 1, rx + w - 10, ry + 1);

    // Pulse location indicator dot on left
    this.roomLabelBg.fillStyle(0x1abc9c, 0.25);
    this.roomLabelBg.fillCircle(rx + 20, ry + 20, 8);
    this.roomLabelBg.fillStyle(0x2ecc71, 1);
    this.roomLabelBg.fillCircle(rx + 20, ry + 20, 4);
  }

  // ── GUIDANCE HANDLERS ────────────────────────────────────────────────────
  public getCurrentGuidanceTarget() {
    return this.guidanceList[this.currentGuidanceIdx] || null;
  }

  public recomputeGuidanceList(state?: GameState) {
    const currentState = state || (this.scene.get(SCENES.GAME) as any)?.state || this.lastHudData?.state;
    if (!currentState || !currentState.completedMissions) return;

    const completedCount = currentState.completedMissions.length;
    const missionJustCompleted = this.lastCompletedCount >= 0 && completedCount > this.lastCompletedCount;
    this.lastCompletedCount = completedCount;

    const previousNpcId = this.guidanceList[this.currentGuidanceIdx]?.id || this.previousTargetNpcId;

    const list: Array<{ id: string; room: string; npc: string; action: string; col: number; row: number; missionKey: string; missionTitle?: string }> = [];

    for (const npcDef of NPC_DEFS) {
      if (npcDef.role === 'patient') continue;

      for (const d of npcDef.dialogues) {
        if (d.id === 'idle') continue;
        const condMet = !d.condition || d.condition(currentState);
        if (!condMet) continue;
        if (!d.choices || d.choices.length === 0) continue;

        let missionKey = '';
        let missionTitle = '';

        for (const choice of d.choices) {
          if (choice.missionEffect) {
            const [mId] = choice.missionEffect.split(':');
            const m = MISSIONS.find(mission => mission.id === mId);
            if (m && !currentState.completedMissions.includes(m.id)) {
              missionKey = m.id;
              missionTitle = m.title;
              break;
            }
          }
        }

        if (missionKey) {
          const roomName = NPC_ROOM_MAP[npcDef.id] || 'Hospital';
          const col = npcDef.schedule?.[0]?.col ?? npcDef.startCol;
          const row = npcDef.schedule?.[0]?.row ?? npcDef.startRow;

          list.push({
            id: npcDef.id,
            room: roomName,
            npc: npcDef.name,
            action: `Vá até a ${roomName} e fale com ${npcDef.name}`,
            col,
            row,
            missionKey,
            missionTitle
          });
          break; // Found active dialogue for this NPC
        }
      }
    }

    this.guidanceList = list;

    if (this.guidanceList.length === 0) {
      this.currentGuidanceIdx = 0;
      this.previousTargetNpcId = null;
      return;
    }

    const currentTarget = this.guidanceList[this.currentGuidanceIdx];
    const isTargetStillInList = currentTarget && this.guidanceList.some(item => item.id === currentTarget.id && item.missionKey === currentTarget.missionKey);

    if (missionJustCompleted || !isTargetStillInList || this.currentGuidanceIdx >= this.guidanceList.length) {
      // Prefer picking a different NPC from previous target if other NPCs have available missions
      let candidates = this.guidanceList.filter(item => item.id !== previousNpcId);
      if (candidates.length === 0) {
        candidates = this.guidanceList;
      }

      const chosenCandidate = candidates[Math.floor(Math.random() * candidates.length)];
      const newIdx = this.guidanceList.findIndex(item => item.id === chosenCandidate.id && item.missionKey === chosenCandidate.missionKey);
      this.currentGuidanceIdx = newIdx >= 0 ? newIdx : 0;
    }

    this.previousTargetNpcId = this.guidanceList[this.currentGuidanceIdx]?.id || null;
  }

  private nextGuidanceTarget() {
    if (this.guidanceList.length > 1) {
      let randomIdx = Math.floor(Math.random() * this.guidanceList.length);
      if (randomIdx === this.currentGuidanceIdx) {
        randomIdx = (this.currentGuidanceIdx + 1) % this.guidanceList.length;
      }
      this.currentGuidanceIdx = randomIdx;
      this.previousTargetNpcId = this.guidanceList[this.currentGuidanceIdx]?.id || null;
    } else {
      this.currentGuidanceIdx = 0;
    }
    this.updateGuidanceDisplay();
    if (this.missionText) {
      this.tweens.killTweensOf(this.missionText);
      this.missionText.setScale(1.04);
      this.tweens.add({
        targets: this.missionText,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Quad.easeOut',
      });
    }
  }

  private getDirectionArrow(dx: number, dy: number): string {
    const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI); // -180 to 180 (0 = right, 90 = down, -90 = up)

    if (angleDeg >= -22.5 && angleDeg < 22.5) return '➡️';       // Direita
    if (angleDeg >= 22.5 && angleDeg < 67.5) return '↘️';        // Diagonal Baixo-Direita
    if (angleDeg >= 67.5 && angleDeg < 112.5) return '⬇️';       // Baixo
    if (angleDeg >= 112.5 && angleDeg < 157.5) return '↙️';      // Diagonal Baixo-Esquerda
    if (angleDeg >= 157.5 || angleDeg < -157.5) return '⬅️';      // Esquerda
    if (angleDeg >= -157.5 && angleDeg < -112.5) return '↖️';     // Diagonal Cima-Esquerda
    if (angleDeg >= -112.5 && angleDeg < -67.5) return '⬆️';      // Cima
    if (angleDeg >= -67.5 && angleDeg < -22.5) return '↗️';       // Diagonal Cima-Direita

    return '➡️';
  }

  private updateGuidanceDisplay() {
    if (!this.missionText) return;

    const gameScene = this.scene.get(SCENES.GAME) as any;
    const currentState = gameScene?.state || this.lastHudData?.state;
    if (currentState) {
      this.recomputeGuidanceList(currentState);
    }

    if (!this.guidanceList || this.guidanceList.length === 0) {
      const allDoneMsg = '🏆 TODAS AS MISSÕES CONCLUÍDAS! Converse com a equipe para testes práticos.';
      if (this.missionText.text !== allDoneMsg) {
        this.missionText.setText(allDoneMsg);
      }
      if (this.missionText.style.color !== '#f1c40f') {
        this.missionText.setColor('#f1c40f');
      }
      return;
    }

    const currentObj = this.guidanceList[this.currentGuidanceIdx];
    if (!currentObj) return;

    const currentRoomUpper = (this.currentRoomName || '').toUpperCase();
    const targetRoomUpper = currentObj.room.toUpperCase();
    const isRoomMatch = currentRoomUpper.includes(targetRoomUpper) || targetRoomUpper.includes(currentRoomUpper);

    const targetX = ((currentObj.col ?? 6) + 0.5) * TILE_SIZE;
    const targetY = ((currentObj.row ?? 3) + 0.5) * TILE_SIZE;
    const playerX = this.lastHudData?.playerX ?? targetX;
    const playerY = this.lastHudData?.playerY ?? targetY;

    const dx = targetX - playerX;
    const dy = targetY - playerY;
    const distPx = Math.hypot(dx, dy);
    const distMeters = Math.max(1, Math.round(distPx / TILE_SIZE));

    let newText = '';
    let newColor = '#38bdf8';

    if (isRoomMatch || distPx < 55) {
      newText = `✅ LOCAL ALCANÇADO! Fale com ${currentObj.npc} (Aperte E)`;
      newColor = '#2ecc71';
    } else {
      const arrow = this.getDirectionArrow(dx, dy);
      newText = `${arrow} ${currentObj.action} (${distMeters}m)`;
      newColor = '#38bdf8';
    }

    if (this.missionText.text !== newText) {
      this.missionText.setText(newText);
    }
    if (this.missionText.style.color !== newColor) {
      this.missionText.setColor(newColor);
    }
  }

  private checkAutoAdvanceGuidance(state: GameState) {
    if (!state || !state.completedMissions) return;
    this.recomputeGuidanceList(state);
    this.updateGuidanceDisplay();
  }

  // ── UPDATE METHOD ─────────────────────────────────────────────────────────
  update(time: number) {
    // Sample position and update guidance display at 8Hz (every 120ms) to ensure smooth 60fps rendering without flickering
    if (time - this.lastGuidanceUpdateTime > 120) {
      this.lastGuidanceUpdateTime = time;
      const gameScene = this.scene.get(SCENES.GAME) as any;
      if (gameScene?.player) {
        if (!this.lastHudData) this.lastHudData = {} as any;
        this.lastHudData.playerX = gameScene.player.x;
        this.lastHudData.playerY = gameScene.player.y;
        this.updateGuidanceDisplay();
      }
    }
  }

  // ── UPDATE HANDLERS ───────────────────────────────────────────────────────
  private onRoomChange(roomName: string) {
    if (!roomName) return;
    this.currentRoomName = roomName;
    this.drawRoomLabel(roomName);
    this.updateGuidanceDisplay();
    if (this.roomNameText) {
      this.roomNameText.setText(roomName.toUpperCase());
      
      this.tweens.killTweensOf(this.roomNameText);
      this.roomNameText.setScale(1);
      this.roomNameText.setColor('#f1c40f');
      
      this.tweens.add({
        targets: this.roomNameText,
        duration: 300,
        ease: 'Linear',
        onComplete: () => {
          this.roomNameText.setColor('#ffffff');
        }
      });
    }
  }

  private onHudUpdate(data: { state: GameState; playerX: number; playerY: number; activeMission?: string }) {
    this.lastHudData = data;
    const { state, playerX, playerY } = data;
    this.checkAutoAdvanceGuidance(state);
    this.updateGuidanceDisplay();

    const cfg = this.topBarCfg;
    if (!cfg) return;

    // Time & day
    const totalMin = Math.floor(state.gameTime) % 1440;
    const h = Math.floor(totalMin / 60), m = totalMin % 60;
    this.timeText.setText(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);

    const shiftName = h >= 7 && h < 15 ? 'MANHÃ' : h >= 15 && h < 23 ? 'TARDE' : 'NOITE';
    const shiftColor = h >= 7 && h < 15 ? '#f1c40f' : h >= 15 && h < 23 ? '#e67e22' : '#9b59b6';
    if (cfg.isTwoRow) {
      this.dayText.setText(`D${state.day} ${shiftName}`).setColor(shiftColor);
    } else {
      this.dayText.setText(`DIA ${state.day}\n${shiftName}`).setColor(shiftColor);
    }
    this.shiftIcon.setColor(shiftColor);

    // Energy bar
    const ep = Math.max(0, Math.min(1, (state.energy || 0) / 100));
    const eColor = ep > 0.5 ? 0x2ecc71 : ep > 0.25 ? 0xf1c40f : 0xe74c3c;
    const eHexStr = ep > 0.5 ? '#2ecc71' : ep > 0.25 ? '#f1c40f' : '#e74c3c';
    this.energyBarFill.clear();
    const enTrackW = Math.max(4, cfg.energyW - 16);
    const eW = Math.max(0, enTrackW * ep);
    if (eW > 2) {
      this.energyBarFill.fillStyle(eColor, 1);
      const fillX = cfg.bx + cfg.energyX + 8;
      const fillY = cfg.by + (cfg.isTwoRow ? 38 : 36);
      const fillH = cfg.isTwoRow ? 15 : 16;
      this.energyBarFill.fillRoundedRect(fillX, fillY, eW, fillH, Math.min(5, eW / 2));
    }
    this.energyValText.setText(`${Math.round(state.energy || 0)}%`).setColor(eHexStr);

    // Stress bar
    const sp = Math.max(0, Math.min(1, (state.stress || 0) / 100));
    const sColor = sp < 0.3 ? 0x2ecc71 : sp < 0.6 ? 0xf1c40f : 0xe74c3c;
    const sHexStr = sp < 0.3 ? '#2ecc71' : sp < 0.6 ? '#f1c40f' : '#e74c3c';
    this.stressBarFill.clear();
    const stTrackW = Math.max(4, cfg.stressW - 16);
    const sW = Math.max(0, stTrackW * sp);
    if (sW > 2) {
      this.stressBarFill.fillStyle(sColor, 1);
      const fillX = cfg.bx + cfg.stressX + 8;
      const fillY = cfg.by + (cfg.isTwoRow ? 38 : 36);
      const fillH = cfg.isTwoRow ? 15 : 16;
      this.stressBarFill.fillRoundedRect(fillX, fillY, sW, fillH, Math.min(5, sW / 2));
    }
    this.stressValText.setText(`${Math.round(state.stress || 0)}%`).setColor(sHexStr);

    // Career
    this.prestigeText.setText(`${state.prestige} pts`);
    this.careerBarFill.clear();

    // Guidance & direction display is handled in updateGuidanceDisplay()

    // Minimap player & target dots
    this.playerDot.clear();

    const targetObj = this.getCurrentGuidanceTarget();
    if (targetObj) {
      const targetDotX = this.mmX + targetObj.col * MM_SCALE;
      const targetDotY = MM_Y + targetObj.row * MM_SCALE;
      const targetPulse = 0.5 + 0.5 * Math.sin(this.time.now / 300);
      this.playerDot.fillStyle(0xf1c40f, 1);
      this.playerDot.fillCircle(targetDotX, targetDotY, 4);
      this.playerDot.fillStyle(0xe67e22, targetPulse);
      this.playerDot.fillCircle(targetDotX, targetDotY, 7);
    }

    const dotX = this.mmX + (playerX / TILE_SIZE) * MM_SCALE;
    const dotY = MM_Y + (playerY / TILE_SIZE) * MM_SCALE;
    const pulse = 0.5 + 0.5 * Math.sin(this.time.now / 300);
    this.playerDot.fillStyle(0xffffff, 1);
    this.playerDot.fillCircle(dotX, dotY, 3);
    this.playerDot.fillStyle(0x1abc9c, pulse);
    this.playerDot.fillCircle(dotX, dotY, 5);
  }

  private onHint(msg: string) {
    this.hintText.setText(msg);
  }

  public showCrisisOverlay(event: CrisisEvent, resolveCallback: (idx: number) => void) {
    if (this.crisisOverlay) return;

    playSound('pulse');

    const W = this.scale.width, H = this.scale.height;
    const panelW = Math.min(840, W - 32), panelH = Math.min(540, H - 32);

    const container = this.add.container(W / 2, H / 2).setDepth(500);

    // Dimmer
    const dimmer = this.add.rectangle(0, 0, W * 2, H * 2, 0x000000, 0.75).setInteractive().setDepth(499);

    // Panel bg
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.55);
    shadow.fillRoundedRect(-panelW / 2 + 8, -panelH / 2 + 8, panelW, panelH, 16);

    const bg = this.add.graphics();
    bg.fillStyle(event.urgent ? 0x1a0505 : 0x0a1a2e, 1);
    bg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 16);
    bg.lineStyle(4, event.urgent ? 0xe74c3c : 0xf39c12, 1);
    bg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 16);

    if (event.urgent) {
      this.tweens.add({ targets: bg, alpha: 0.85, duration: 300, yoyo: true, repeat: 5 });
    }

    const titleText = this.add.text(0, -panelH / 2 + 34, event.title, {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '16px',
      color: event.urgent ? '#ff6b6b' : '#f39c12',
      wordWrap: { width: panelW - 40 },
      align: 'center',
    }).setOrigin(0.5);

    const desc = this.add.text(0, -panelH / 2 + 90, event.description, {
      fontFamily: "'VT323', monospace",
      fontSize: '32px',
      color: '#ecf0f1',
      wordWrap: { width: panelW - 60 },
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5);

    const choiceItems: Phaser.GameObjects.GameObject[] = [];
    const btnH = 80;
    const btnW = panelW - 50;
    const startY = -panelH / 2 + 175;

    let isResolved = false;

    event.choices.forEach((choice, idx) => {
      const cy = startY + idx * (btnH + 10);

      const btnBg = this.add.graphics();
      btnBg.fillStyle(0x1e3a5f, 1);
      btnBg.fillRoundedRect(-btnW / 2, cy - btnH / 2, btnW, btnH, 10);
      btnBg.lineStyle(2.5, 0x3498db, 1);
      btnBg.strokeRoundedRect(-btnW / 2, cy - btnH / 2, btnW, btnH, 10);

      const numTxt = this.add.text(-btnW / 2 + 18, cy, `${idx + 1}`, {
        fontFamily: "'Press Start 2P', monospace", fontSize: '15px', color: '#f39c12',
      }).setOrigin(0, 0.5);

      const choiceTxt = this.add.text(-btnW / 2 + 48, cy, choice.text, {
        fontFamily: "'VT323', monospace", fontSize: '28px', color: '#ecf0f1',
        wordWrap: { width: btnW - 65 }, lineSpacing: 3,
      }).setOrigin(0, 0.5);

      const zone = this.add.zone(-btnW / 2, cy - btnH / 2, btnW, btnH).setOrigin(0).setInteractive({ cursor: 'pointer' });

      zone.on('pointerover', () => {
        playSound('hover');
        btnBg.clear().fillStyle(0x2563a8, 1).fillRoundedRect(-btnW / 2, cy - btnH / 2, btnW, btnH, 10)
          .lineStyle(3, 0xf1c40f, 1).strokeRoundedRect(-btnW / 2, cy - btnH / 2, btnW, btnH, 10);
      });

      zone.on('pointerout', () => {
        btnBg.clear().fillStyle(0x1e3a5f, 1).fillRoundedRect(-btnW / 2, cy - btnH / 2, btnW, btnH, 10)
          .lineStyle(2.5, 0x3498db, 1).strokeRoundedRect(-btnW / 2, cy - btnH / 2, btnW, btnH, 10);
      });

      const onSelect = () => {
        if (isResolved) return;
        isResolved = true;
        playSound('click');
        container.getData('timerEvent')?.remove();
        container.destroy();
        dimmer.destroy();
        this.crisisOverlay = null;
        resolveCallback(idx);
      };

      zone.on('pointerdown', onSelect);
      this.input.keyboard?.once(`keydown-${idx + 1}`, onSelect);

      choiceItems.push(btnBg, numTxt, choiceTxt, zone);
    });

    const timerBg = this.add.graphics().fillStyle(0x2c3e50, 1)
      .fillRoundedRect(-panelW / 2 + 20, panelH / 2 - 28, panelW - 40, 16, 8);
    const timerFill = this.add.graphics();
    const timerDur = 90000; // 90 seconds — gives players time to read and decide carefully
    let elapsed = 0;

    const timerUpdate = () => {
      elapsed += 200;
      const pct = Math.max(0, 1 - elapsed / timerDur);
      const col = pct > 0.5 ? 0x2ecc71 : pct > 0.25 ? 0xf39c12 : 0xe74c3c;
      timerFill.clear().fillStyle(col, 1)
        .fillRoundedRect(-panelW / 2 + 20, panelH / 2 - 28, (panelW - 40) * pct, 16, 8);
      
      if (pct === 0 && !isResolved) {
        isResolved = true;
        container.getData('timerEvent')?.remove();
        container.destroy();
        dimmer.destroy();
        this.crisisOverlay = null;
        resolveCallback(event.choices.length - 1);
      }
    };

    const timerEvent = this.time.addEvent({ delay: 200, repeat: timerDur / 200, callback: timerUpdate });
    container.add([shadow, bg, titleText, desc, ...choiceItems, timerBg, timerFill]);
    container.setScale(0.9).setAlpha(0);
    this.tweens.add({ targets: container, scale: 1, alpha: 1, duration: 250, ease: 'Back.easeOut' });
    container.setData('timerEvent', timerEvent);
    this.crisisOverlay = container;
  }

  public showCrisisFeedback(text: string, correct: boolean, pts: number) {
    if (correct) playSound('success');
    else playSound('error');

    const W = this.scale.width;
    const fbW = Math.min(720, W - 32);

    const feedTxt = this.add.text(0, 0, text, {
      fontFamily: "'Segoe UI', 'Trebuchet MS', system-ui, sans-serif",
      fontSize: '15px',
      color: '#ecf0f1',
      wordWrap: { width: fbW - 95 },
      lineSpacing: 3,
    });

    const fbH = Math.max(120, feedTxt.height + 60);
    const fb = this.add.container(W / 2, Math.max(100, this.scale.height / 2 - 50)).setDepth(501);

    const bg = this.add.graphics().fillStyle(correct ? 0x0a2a1a : 0x2a0a0a, 0.98)
      .fillRoundedRect(-fbW / 2, -fbH / 2, fbW, fbH, 14).lineStyle(3, correct ? 0x2ecc71 : 0xe74c3c, 1)
      .strokeRoundedRect(-fbW / 2, -fbH / 2, fbW, fbH, 14);

    const icon = this.add.text(-fbW / 2 + 24, 0, correct ? '✅' : '⚠️', { fontSize: '32px' }).setOrigin(0, 0.5);

    const ptsSign = pts >= 0 ? '+' : '';
    const ptsLabel = this.add.text(-fbW / 2 + 70, -fbH / 2 + 16,
      `${correct ? 'CORRETO!' : 'ATENÇÃO!'} ${ptsSign}${pts} pts`, {
        fontFamily: "'Rajdhani', 'Segoe UI', sans-serif",
        fontSize: '14px',
        fontStyle: 'bold',
        color: correct ? '#2ecc71' : '#e74c3c',
      });

    feedTxt.setPosition(-fbW / 2 + 70, -fbH / 2 + 42);

    fb.add([bg, icon, ptsLabel, feedTxt]);
    fb.setScale(0.9).setAlpha(0);
    
    this.tweens.add({
      targets: fb, scale: 1, alpha: 1, duration: 250, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: fb, alpha: 0, duration: 400, delay: 4500,
          onComplete: () => fb.destroy()
        });
      },
    });
  }

  public toggleMissionOverlay(state: GameState) {
    playSound('click');
    window.dispatchEvent(new CustomEvent('toggle-missions', { detail: { state } }));
  }
}
