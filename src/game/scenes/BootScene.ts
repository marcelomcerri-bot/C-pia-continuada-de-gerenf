import * as Phaser from 'phaser';
import { TILE_SIZE, SCENES } from '../constants';
import { createTilesetTexture, NPC_DEFS, PlayerProfile } from '../data/gameData';
import { loadGame, DEFAULT_PLAYER_PROFILE } from '../utils/save';

const SPR_W = 44;
const SPR_H = 128;
const FRAMES = 24; // 6 frames × 4 directions (down, up, right, left)

// Size at which the sprite is drawn inside the 44×128 canvas.
// groundY=72 → DRAW_H must be ≥72 so feet from the sheet align with the physics body (offset 65).
const DRAW_W = 40;  // visual width (centered in 44px canvas → 2px padding each side)
const DRAW_H = 76;  // visual height — feet of source image land at ≈y=76, physics body offset=65
const DRAW_X_OFF = Math.round((SPR_W - DRAW_W) / 2); // horizontal centering offset

// New sprite sheet pixel coordinates (measured from 1704×923 source image)
const FRAME_COLS = [
  { x1: 168, x2: 233 },
  { x1: 276, x2: 344 },
  { x1: 386, x2: 457 },
  { x1: 498, x2: 567 },
  { x1: 611, x2: 678 },
  { x1: 719, x2: 787 },
];
const CHAR_ROWS = {
  female: {
    front: [14, 160] as [number, number],
    side:  [173, 307] as [number, number],
    back:  [321, 457] as [number, number],
  },
  male: {
    front: [496, 628] as [number, number],
    side:  [645, 770] as [number, number],
    back:  [784, 908] as [number, number],
  },
};

function rrFill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (w < 1 || h < 1) return;
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  ctx.fill();
}

function rrStroke(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (w < 1 || h < 1) return;
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  ctx.stroke();
}

function darken(hex: string, amount = 0.2): string {
  let r: number, g: number, b: number;
  if (hex.startsWith('rgb')) {
    const m = hex.match(/\d+/g)!;
    r = +m[0]; g = +m[1]; b = +m[2];
  } else {
    const n = parseInt(hex.replace('#', ''), 16);
    r = (n >> 16) & 0xff; g = (n >> 8) & 0xff; b = n & 0xff;
  }
  r = Math.max(0, Math.min(255, r * (1 - amount))) | 0;
  g = Math.max(0, Math.min(255, g * (1 - amount))) | 0;
  b = Math.max(0, Math.min(255, b * (1 - amount))) | 0;
  return `rgb(${r},${g},${b})`;
}

function lighten(hex: string, amount = 0.2): string {
  let r: number, g: number, b: number;
  if (hex.startsWith('rgb')) {
    const m = hex.match(/\d+/g)!;
    r = +m[0]; g = +m[1]; b = +m[2];
  } else {
    const n = parseInt(hex.replace('#', ''), 16);
    r = (n >> 16) & 0xff; g = (n >> 8) & 0xff; b = n & 0xff;
  }
  r = Math.min(255, Math.max(0, r + (255 - r) * amount)) | 0;
  g = Math.min(255, Math.max(0, g + (255 - g) * amount)) | 0;
  b = Math.min(255, Math.max(0, b + (255 - b) * amount)) | 0;
  return `rgb(${r},${g},${b})`;
}

// ── CHARACTER VISUAL PROFILES ─────────────────────────────────────────────────
interface CharVisual {
  gender: 'male' | 'female';
  hairStyle: string;
  build: 'slim' | 'medium' | 'stocky';
  groundYOff: number;
  age: 'young' | 'adult' | 'senior';
  accessory: 'none' | 'glasses' | 'surgical_cap' | 'mask';
  nurseCap: boolean;
}

const DEFAULT_VISUAL: CharVisual = {
  gender: 'male', hairStyle: 'short_neat', build: 'medium', groundYOff: 0,
  age: 'adult', accessory: 'none', nurseCap: false,
};

const CHAR_VISUALS: Record<string, CharVisual> = {
  player:        { gender: 'female', hairStyle: 'bun',              build: 'medium', groundYOff:  0, age: 'adult',  accessory: 'none',         nurseCap: true  },
  npc_ana:       { gender: 'female', hairStyle: 'bob',              build: 'medium', groundYOff:  3, age: 'adult',  accessory: 'none',         nurseCap: false },
  npc_carlos:    { gender: 'male',   hairStyle: 'low_fade',         build: 'medium', groundYOff: -2, age: 'adult',  accessory: 'none',         nurseCap: false },
  npc_joao:      { gender: 'male',   hairStyle: 'curly_top',        build: 'slim',   groundYOff:  0, age: 'young',  accessory: 'glasses',      nurseCap: false },
  npc_renata:    { gender: 'female', hairStyle: 'ponytail',         build: 'medium', groundYOff:  0, age: 'adult',  accessory: 'none',         nurseCap: false },
  npc_farias:    { gender: 'male',   hairStyle: 'receding',         build: 'stocky', groundYOff: -4, age: 'senior', accessory: 'none',         nurseCap: false },
  npc_diretora:  { gender: 'female', hairStyle: 'updo',             build: 'medium', groundYOff:  0, age: 'senior', accessory: 'glasses',      nurseCap: false },
  npc_rosa:      { gender: 'female', hairStyle: 'afro_short',       build: 'stocky', groundYOff:  4, age: 'adult',  accessory: 'surgical_cap', nurseCap: false },
  npc_clara:     { gender: 'female', hairStyle: 'loose_long',       build: 'slim',   groundYOff:  0, age: 'young',  accessory: 'none',         nurseCap: false },
  npc_maria:     { gender: 'female', hairStyle: 'high_pony',        build: 'medium', groundYOff:  2, age: 'adult',  accessory: 'none',         nurseCap: false },
  npc_dr:        { gender: 'male',   hairStyle: 'business',         build: 'medium', groundYOff: -4, age: 'adult',  accessory: 'none',         nurseCap: false },
  npc_santos:    { gender: 'female', hairStyle: 'long_tied',        build: 'slim',   groundYOff: -2, age: 'adult',  accessory: 'none',         nurseCap: false },
  npc_pedro:     { gender: 'male',   hairStyle: 'short_wavy',       build: 'slim',   groundYOff:  0, age: 'young',  accessory: 'none',         nurseCap: false },
  npc_patient_1: { gender: 'male',   hairStyle: 'bald',             build: 'stocky', groundYOff:  2, age: 'senior', accessory: 'none',         nurseCap: false },
  npc_patient_2: { gender: 'female', hairStyle: 'short_curly_gray', build: 'stocky', groundYOff:  3, age: 'senior', accessory: 'none',         nurseCap: false },
  npc_patient_3: { gender: 'male',   hairStyle: 'short_neat',       build: 'medium', groundYOff:  0, age: 'adult',  accessory: 'none',         nurseCap: false },
  
  // Generic visuals for diverse NPCs
  npc_doctor_m:  { gender: 'male',   hairStyle: 'business',         build: 'medium', groundYOff: -4, age: 'adult',  accessory: 'none',         nurseCap: false },
  npc_doctor_f:  { gender: 'female', hairStyle: 'bun',              build: 'slim',   groundYOff: -2, age: 'adult',  accessory: 'none',         nurseCap: false },
  npc_nurse_m:   { gender: 'male',   hairStyle: 'short_wavy',       build: 'medium', groundYOff:  0, age: 'adult',  accessory: 'none',         nurseCap: false },
  npc_nurse_f:   { gender: 'female', hairStyle: 'ponytail',         build: 'medium', groundYOff:  2, age: 'young',  accessory: 'none',         nurseCap: false },
  npc_tech_m:    { gender: 'male',   hairStyle: 'curly_top',        build: 'medium', groundYOff: -2, age: 'adult',  accessory: 'none',         nurseCap: false },
  npc_tech_f:    { gender: 'female', hairStyle: 'bob',              build: 'slim',   groundYOff:  2, age: 'adult',  accessory: 'none',         nurseCap: false },
  npc_guard:     { gender: 'male',   hairStyle: 'low_fade',         build: 'stocky', groundYOff:  0, age: 'adult',  accessory: 'none',         nurseCap: false },
  npc_cleaner:   { gender: 'female', hairStyle: 'updo',             build: 'stocky', groundYOff:  4, age: 'adult',  accessory: 'mask',         nurseCap: false },
  npc_pat_gest:  { gender: 'female', hairStyle: 'loose_long',       build: 'stocky', groundYOff:  4, age: 'young',  accessory: 'none',         nurseCap: false },
  npc_pat_boy:   { gender: 'male',   hairStyle: 'afro_short',       build: 'slim',   groundYOff:  0, age: 'young',  accessory: 'none',         nurseCap: false },
  npc_pat_girl:  { gender: 'female', hairStyle: 'long_tied',        build: 'slim',   groundYOff:  0, age: 'young',  accessory: 'none',         nurseCap: false },
  npc_pat_old_m: { gender: 'male',   hairStyle: 'receding',         build: 'stocky', groundYOff:  2, age: 'senior', accessory: 'none',         nurseCap: false },
  npc_pat_old_f: { gender: 'female', hairStyle: 'short_curly_gray', build: 'stocky', groundYOff:  2, age: 'senior', accessory: 'none',         nurseCap: false },
  npc_maria_amb: { gender: 'female', hairStyle: 'updo',             build: 'medium', groundYOff:  1, age: 'senior', accessory: 'glasses',      nurseCap: false },
  npc_jose:      { gender: 'male',   hairStyle: 'short_wavy',       build: 'medium', groundYOff:  0, age: 'senior', accessory: 'none',         nurseCap: false },
  npc_laura:     { gender: 'female', hairStyle: 'bob',              build: 'medium', groundYOff:  2, age: 'young',  accessory: 'none',         nurseCap: false },
  npc_felipe:    { gender: 'male',   hairStyle: 'curly_top',        build: 'medium', groundYOff:  0, age: 'adult',  accessory: 'none',         nurseCap: false },
};

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: SCENES.BOOT }); }

  preload() {
    const W = this.scale.width, H = this.scale.height;
    const barBg = this.add.graphics();
    barBg.fillStyle(0x2c3e50, 1);
    barBg.fillRoundedRect(W / 2 - 250, H / 2 - 15, 500, 30, 8);
    const barFill = this.add.graphics();
    const loadLabel = this.add.text(W / 2, H / 2 - 40, 'CARREGANDO HUAP...', {
      fontFamily: 'monospace', fontSize: '14px', color: '#1abc9c',
    }).setOrigin(0.5);
    this.load.on('progress', (v: number) => {
      barFill.clear();
      barFill.fillStyle(0x1abc9c, 1);
      barFill.fillRoundedRect(W / 2 - 248, H / 2 - 13, 496 * v, 26, 6);
    });
    void loadLabel;

    this.load.on('loaderror', (fileObj: any) => {
      console.warn('Asset failed to load, continuing with procedural fallback:', fileObj?.key);
    });

    // Preload the official HUAP pixel art background image directly
    this.load.image('huap_pixelart', '/huap_bg.png');
    this.load.image('huap_pixel', '/huap_bg.png');
    this.load.image('huap_bg', '/huap_bg.png');
  }

  create() {
    createTilesetTexture(this);

    // Ensure textures exist
    const base = (import.meta as any).env?.BASE_URL || '/';
    const bgImg = new Image();
    bgImg.onload = () => {
      ['huap_pixelart', 'huap_pixel', 'huap_bg'].forEach((k) => {
        if (this.textures && !this.textures.exists(k)) {
          const ct = this.textures.createCanvas(k, bgImg.width, bgImg.height) as Phaser.Textures.CanvasTexture;
          if (ct) {
            const ctx = ct.getContext();
            ctx.drawImage(bgImg, 0, 0);
            ct.refresh();
          }
        }
      });
    };
    bgImg.src = base + 'huap_bg.png';

    this.createPlayerSprite();
    this.createNPCSprites();
    this.createPortraits();
    this.createPixelTexture();
    this.createLightTextures();
    this.scene.start(SCENES.MENU);
  }

  private createPixelizedHuap() {
    // Legacy procedural drawing removed so only the user's exact uploaded image is used.
  }

  private createLightTextures() {
    const glowD = 256;
    if (!this.textures.exists('light_glow')) {
      const ctGlow = this.textures.createCanvas('light_glow', glowD, glowD) as Phaser.Textures.CanvasTexture;
      const ctxG = ctGlow.getContext();
      const grad = ctxG.createRadialGradient(glowD / 2, glowD / 2, 0, glowD / 2, glowD / 2, glowD / 2);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.2, 'rgba(255,255,255,0.8)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctxG.fillStyle = grad;
      ctxG.beginPath(); ctxG.arc(glowD / 2, glowD / 2, glowD / 2, 0, Math.PI * 2); ctxG.fill();
      ctGlow.refresh();
    }

    if (!this.textures.exists('red_led')) {
      const ctLed = this.textures.createCanvas('red_led', 4, 4) as Phaser.Textures.CanvasTexture;
      const ctxLed = ctLed.getContext();
      ctxLed.fillStyle = '#ff2222'; ctxLed.fillRect(0, 0, 4, 4);
      ctxLed.fillStyle = '#ff9999'; ctxLed.fillRect(1, 1, 2, 2);
      ctLed.refresh();
    }

    if (!this.textures.exists('green_led')) {
      const ctLedG = this.textures.createCanvas('green_led', 4, 4) as Phaser.Textures.CanvasTexture;
      const ctxLedG = ctLedG.getContext();
      ctxLedG.fillStyle = '#22ff22'; ctxLedG.fillRect(0, 0, 4, 4);
      ctxLedG.fillStyle = '#99ff99'; ctxLedG.fillRect(1, 1, 2, 2);
      ctLedG.refresh();
    }

    if (!this.textures.exists('blue_led')) {
      const ctLedB = this.textures.createCanvas('blue_led', 4, 4) as Phaser.Textures.CanvasTexture;
      const ctxLedB = ctLedB.getContext();
      ctxLedB.fillStyle = '#2288ff'; ctxLedB.fillRect(0, 0, 4, 4);
      ctxLedB.fillStyle = '#99ccff'; ctxLedB.fillRect(1, 1, 2, 2);
      ctLedB.refresh();
    }
  }

  public createPlayerSprite(profile?: PlayerProfile) {
    const p = profile || loadGame().playerProfile || DEFAULT_PLAYER_PROFILE;
    const gender = p.gender || 'female';
    const skin = p.skinTone || '#f5c5a3';
    const isFemale = gender === 'female';

    const key = 'player';
    let ct: Phaser.Textures.CanvasTexture;
    if (this.textures.exists(key)) {
      ct = this.textures.get(key) as Phaser.Textures.CanvasTexture;
    } else {
      ct = this.textures.createCanvas(key, SPR_W * FRAMES, SPR_H) as Phaser.Textures.CanvasTexture;
    }
    const ctx = ct.getContext();
    ctx.clearRect(0, 0, SPR_W * FRAMES, SPR_H);

    const visual: CharVisual = {
      gender,
      hairStyle: isFemale ? 'ponytail' : 'male_stylish',
      build: 'medium',
      groundYOff: 0,
      age: 'adult',
      accessory: 'none',
      nurseCap: isFemale,
    };
    const hair = isFemale ? '#2c1a12' : '#221915';

    for (let dir = 0; dir < 4; dir++) {
      for (let step = 0; step < 6; step++) {
        this.drawCharacter(ctx, dir * 6 + step, dir, step, {
          skin,
          coat: '#1abc9c',
          coatDark: '#12876b',
          pants: '#0e6b55',
          hair,
          shoe: '#1a0f08',
          role: 'nurse',
          isPlayer: true,
          visual,
          spriteKey: key,
        });
      }
    }
    ct.refresh();
    for (let i = 0; i < FRAMES; i++) {
      if (!ct.has(i.toString()) && !ct.has(i as any)) {
        ct.add(i, 0, i * SPR_W, 0, SPR_W, SPR_H);
      }
    }

    this.createPlayerPortrait(p);
  }

  public createPlayerPortrait(profile?: PlayerProfile) {
    const p = profile || loadGame().playerProfile || DEFAULT_PLAYER_PROFILE;
    const gender = p.gender || 'female';
    const skin = p.skinTone || '#f5c5a3';
    const isFemale = gender === 'female';
    const hairColor = isFemale ? '#2c1a12' : '#1c1917';

    const pk = 'portrait_player';
    let ct: Phaser.Textures.CanvasTexture;
    if (this.textures.exists(pk)) {
      ct = this.textures.get(pk) as Phaser.Textures.CanvasTexture;
    } else {
      ct = this.textures.createCanvas(pk, 90, 90) as Phaser.Textures.CanvasTexture;
    }
    const ctx = ct.getContext();
    ctx.clearRect(0, 0, 90, 90);

    ctx.fillStyle = '#e0faf4'; ctx.fillRect(0, 0, 90, 90);
    const grad = ctx.createLinearGradient(0, 0, 90, 90);
    grad.addColorStop(0, 'rgba(26,188,156,0.1)');
    grad.addColorStop(1, 'rgba(26,188,156,0.35)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 90, 90);

    // Shoulders
    ctx.fillStyle = '#1abc9c';
    ctx.beginPath();
    ctx.moveTo(0, 90); ctx.lineTo(0, 60);
    ctx.bezierCurveTo(5, 52, 35, 50, 45, 52);
    ctx.bezierCurveTo(55, 50, 85, 52, 90, 60);
    ctx.lineTo(90, 90); ctx.closePath(); ctx.fill();

    // Stethoscope
    ctx.strokeStyle = '#1a252f'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(45, 62, 9, 0, Math.PI); ctx.stroke();
    ctx.fillStyle = '#1a252f'; ctx.beginPath(); ctx.arc(45, 71, 4, 0, Math.PI * 2); ctx.fill();

    // Head/neck/skin
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.ellipse(45, 26, 19, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(38, 40, 14, 14);

    // Hair & Cap
    ctx.fillStyle = hairColor;
    if (isFemale) {
      ctx.beginPath(); ctx.ellipse(45, 9, 19, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(26, 9, 38, 18);
      ctx.beginPath(); ctx.arc(45, -2, 6, 0, Math.PI * 2); ctx.fill();
      // Cap
      ctx.fillStyle = '#ffffff'; rrFill(ctx, 26, 4, 38, 7, 1);
      ctx.fillStyle = '#e74c3c'; ctx.fillRect(26, 7, 38, 2.5);
    } else {
      // Male hair (distinct modern short cut with side taper and textured top fringe)
      ctx.fillStyle = hairColor;
      // Top volume
      ctx.beginPath(); ctx.ellipse(45, 11, 21, 14, 0, 0, Math.PI * 2); ctx.fill();
      // Textured top quiff / fringe overhang
      ctx.beginPath();
      ctx.moveTo(24, 16);
      ctx.lineTo(34, 18);
      ctx.lineTo(46, 14);
      ctx.lineTo(58, 19);
      ctx.lineTo(66, 15);
      ctx.lineTo(66, 4);
      ctx.lineTo(24, 4);
      ctx.closePath();
      ctx.fill();
      // Side tapers
      ctx.fillStyle = darken(skin, 0.15); // subtle side fade blend
      ctx.fillRect(25, 17, 3, 10);
      ctx.fillRect(62, 17, 3, 10);
    }

    // Eyes
    ctx.fillStyle = '#1a2530'; ctx.fillRect(34, 23, 6, 5); ctx.fillRect(50, 23, 6, 5);
    ctx.fillStyle = '#fff'; ctx.fillRect(34, 23, 2.5, 2.5); ctx.fillRect(50, 23, 2.5, 2.5);

    ct.refresh();
  }

  private createNPCSprites() {
    const hexRgb = (n: number) => `rgb(${(n >> 16) & 0xff},${(n >> 8) & 0xff},${n & 0xff})`;
    const hexDark = (n: number, p = 0.3) => {
      const r = Math.max(0, ((n >> 16) & 0xff) * (1 - p)) | 0;
      const g = Math.max(0, ((n >> 8) & 0xff) * (1 - p)) | 0;
      const b = Math.max(0, (n & 0xff) * (1 - p)) | 0;
      return `rgb(${r},${g},${b})`;
    };
    const pantsDark = (n: number) => hexDark(n, 0.45);

    for (const def of NPC_DEFS) {
      const key = def.id; // Use unique ID to prevent texture overriding
      let ct: Phaser.Textures.CanvasTexture;
      if (this.textures.exists(key)) {
        ct = this.textures.get(key) as Phaser.Textures.CanvasTexture;
      } else {
        ct = this.textures.createCanvas(key, SPR_W * FRAMES, SPR_H) as Phaser.Textures.CanvasTexture;
      }
      const ctx = ct.getContext();
      ctx.clearRect(0, 0, SPR_W * FRAMES, SPR_H);
      const visual = CHAR_VISUALS[def.spriteKey] ?? DEFAULT_VISUAL;

      for (let dir = 0; dir < 4; dir++) {
        for (let step = 0; step < 6; step++) {
          this.drawCharacter(ctx, dir * 6 + step, dir, step, {
            skin: def.skinColor ? hexRgb(def.skinColor) : '#f5c5a3',
            coat: hexRgb(def.coatColor),
            coatDark: hexDark(def.coatColor),
            pants: def.bodyColor ? hexRgb(def.bodyColor) : pantsDark(def.coatColor),
            hair: hexRgb(def.hairColor),
            shoe: '#1a1008',
            role: def.role,
            isPlayer: false,
            visual,
            spriteKey: def.spriteKey,
          });
        }
      }
      ct.refresh();
      for (let i = 0; i < FRAMES; i++) {
        if (!ct.has(i.toString()) && !ct.has(i as any)) {
          ct.add(i, 0, i * SPR_W, 0, SPR_W, SPR_H);
        }
      }
    }
  }

  // ── SPRITE SHEET CHARACTER CREATION ──────────────────────────────────────

  /**
   * Remove near-white background from the nurses sprite sheet so
   * characters have transparent backgrounds in-game.
   */
  private buildTransparentSheet(img: HTMLImageElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const px = imageData.data;
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i], g = px[i + 1], b = px[i + 2];
      const brightness = (r + g + b) / 3;
      if (brightness > 238) {
        px[i + 3] = 0; // fully transparent
      } else if (brightness > 210) {
        // smooth edge anti-aliasing
        px[i + 3] = Math.round((238 - brightness) / 28 * 255);
      }
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  /**
   * Draw one frame from the new sprite sheet using exact pixel coordinates.
   * colSpec: {x1, x2} pixel range in source for this frame column
   * rowSpec: [y1, y2] pixel range in source for this direction row
   * flipX: mirror horizontally (for left-facing)
   */
  private drawNewSheetFrame(
    ctx: CanvasRenderingContext2D,
    sheet: HTMLCanvasElement,
    gameFrame: number,
    colSpec: { x1: number; x2: number },
    rowSpec: [number, number],
    flipX: boolean,
  ) {
    const srcX = colSpec.x1;
    const srcY = rowSpec[0];
    const srcW = colSpec.x2 - colSpec.x1 + 1;
    const srcH = rowSpec[1] - rowSpec[0] + 1;
    // Destination: draw the character into a DRAW_W×DRAW_H area
    // centred horizontally and top-anchored inside the SPR_W×SPR_H canvas.
    const slotX = gameFrame * SPR_W; // left edge of this frame slot in the atlas
    const destX = slotX + DRAW_X_OFF;
    const destY = 0;

    if (flipX) {
      ctx.save();
      ctx.translate(slotX + SPR_W - DRAW_X_OFF, destY);
      ctx.scale(-1, 1);
      ctx.drawImage(sheet, srcX, srcY, srcW, srcH, 0, 0, DRAW_W, DRAW_H);
      ctx.restore();
    } else {
      ctx.drawImage(sheet, srcX, srcY, srcW, srcH, destX, destY, DRAW_W, DRAW_H);
    }
  }

  private buildCharSprite(key: string, rows: { front: [number,number]; side: [number,number]; back: [number,number] }, sheet: HTMLCanvasElement) {
    let ct: Phaser.Textures.CanvasTexture;
    if (this.textures.exists(key)) {
      ct = this.textures.get(key) as Phaser.Textures.CanvasTexture;
    } else {
      ct = this.textures.createCanvas(key, SPR_W * FRAMES, SPR_H) as Phaser.Textures.CanvasTexture;
    }
    const ctx = ct.getContext();
    ctx.clearRect(0, 0, SPR_W * FRAMES, SPR_H);

    // Game frame layout: down(0-5)=front, up(6-11)=back, right(12-17)=side, left(18-23)=side flipped
    for (let f = 0; f < 6; f++) {
      this.drawNewSheetFrame(ctx, sheet, f,      FRAME_COLS[f], rows.front, false); // down
      this.drawNewSheetFrame(ctx, sheet, 6 + f,  FRAME_COLS[f], rows.back,  false); // up
      this.drawNewSheetFrame(ctx, sheet, 12 + f, FRAME_COLS[f], rows.side,  false); // right
      this.drawNewSheetFrame(ctx, sheet, 18 + f, FRAME_COLS[f], rows.side,  true);  // left (mirrored)
    }

    ct.refresh();
    for (let i = 0; i < FRAMES; i++) {
      if (!ct.has(i.toString()) && !ct.has(i as any)) {
        ct.add(i, 0, i * SPR_W, 0, SPR_W, SPR_H);
      }
    }
  }

  // ── COMPLETE CHARACTER DRAWING SYSTEM ─────────────────────────────────────
  private drawCharacter(
    ctx: CanvasRenderingContext2D,
    fi: number, dir: number, step: number,
    c: { skin: string; coat: string; coatDark: string; pants: string; hair: string; shoe: string; role: string; isPlayer: boolean; visual: CharVisual; spriteKey?: string },
  ) {
    const x = fi * SPR_W;
    ctx.clearRect(x, 0, SPR_W, SPR_H);

    const isDown = dir === 0, isUp = dir === 1;
    const isLeft = dir === 2, isRight = dir === 3;
    const isLR = isLeft || isRight;
    const moving = step > 0;
    const facing = isRight ? 1 : -1;

    // Bouncy chibi animation
    const phase = moving ? (step - 1) * (Math.PI * 2 / 5) : 0;
    const stride = moving ? Math.sin(phase) * 6 : 0;
    const strideB = -stride;
    const bob = moving ? -Math.abs(Math.sin(phase)) * 2 : 0;
    
    const cx = x + SPR_W / 2;
    const groundY = 68;
    const bodyBase = groundY + bob;

    const darkSkin = darken(c.skin, 0.25);
    const outline = '#1e293b';

    // Shadow
    if (c.role !== 'patient') {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(cx, groundY + 2, 11, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const drawRoundedRect = (px: number, py: number, pw: number, ph: number, fill: string, line: string, radius: number = 2) => {
      ctx.fillStyle = fill;
      rrFill(ctx, px, py, pw, ph, radius);
      ctx.strokeStyle = line;
      ctx.lineWidth = 1.5;
      rrStroke(ctx, px, py, pw, ph, radius);
    };

    // --- FEET ---
    if (isLR) {
      drawRoundedRect(cx - 3 + facing * stride, bodyBase - 4, 7, 5, c.shoe, outline, 2);
      drawRoundedRect(cx - 6 - facing * stride, bodyBase - 4, 7, 5, darken(c.shoe, 0.3), outline, 2);
    } else {
      drawRoundedRect(cx - 8, bodyBase - 4 + (moving?stride:0), 6, 5, c.shoe, outline, 2);
      drawRoundedRect(cx + 2, bodyBase - 4 + (moving?strideB:0), 6, 5, c.shoe, outline, 2);
    }

    // Customize base colors and details based on role/spriteKey to ensure highly diverse visual designs
    const sKey = c.spriteKey || '';
    let torsoColor = c.coat;
    let pantsColor = c.pants;

    if (sKey === 'npc_guard') {
      torsoColor = '#1f2937'; // Dark charcoal security jacket
      pantsColor = '#111827';
    } else if (sKey === 'npc_cleaner') {
      torsoColor = '#ffffff'; // White cleaner shirt
    } else if (sKey === 'npc_ana') {
      torsoColor = '#fda4af'; // Coral pink receptionist top
    } else if (sKey === 'npc_diretora' || sKey === 'npc_farias') {
      torsoColor = '#334155'; // Gray executive suit blazer
    } else if (sKey.startsWith('npc_pat_') || sKey.startsWith('npc_patient_') || sKey === 'npc_maria_amb' || sKey === 'npc_jose' || sKey === 'npc_laura' || sKey === 'npc_felipe') {
      // Patient/Visitor casual clothes or hospital gowns
      if (sKey === 'npc_pat_old_m' || sKey === 'npc_pat_old_f' || sKey.startsWith('npc_patient_') || sKey === 'paciente_ps_3') {
        torsoColor = '#bae6fd'; // Light blue comfortable hospital gown
      } else if (sKey === 'npc_pat_gest') {
        torsoColor = '#fbcfe8'; // Maternity gown/blouse
      } else {
        torsoColor = c.coat; // Use distinct custom color defined in gameData
      }
    }

    // --- LEGS ---
    if (isLR) {
      drawRoundedRect(cx - 2 + facing * stride, bodyBase - 12, 5, 10, pantsColor, outline, 1);
      drawRoundedRect(cx - 5 - facing * stride, bodyBase - 12, 5, 10, darken(pantsColor,0.2), outline, 1);
    } else {
      drawRoundedRect(cx - 8, bodyBase - 12 + (moving?stride:0), 6, 12, pantsColor, outline, 1);
      drawRoundedRect(cx + 2, bodyBase - 12 + (moving?strideB:0), 6, 12, pantsColor, outline, 1);
    }

    // --- TORSO ---
    const tW = isLR ? 14 : 18;
    const tH = 14;
    const tX = cx - tW / 2;
    const tY = bodyBase - 24;
    
    // Fill + Outline
    drawRoundedRect(tX, tY, tW, tH, torsoColor, outline, 4);
    
    // Bottom shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(tX + 1, tY + tH - 3, tW - 2, 2);
    
    // Coat accents / collars / custom role details
    if (!isUp) {
      if (sKey === 'npc_guard') {
        // Gold security badge on chest
        ctx.fillStyle = '#fbbf24';
        const badgeX = facing > 0 ? tX + tW - 5 : tX + 2;
        ctx.beginPath();
        ctx.moveTo(badgeX + 1.5, tY + 3);
        ctx.lineTo(badgeX + 3, tY + 4.5);
        ctx.lineTo(badgeX + 1.5, tY + 6);
        ctx.lineTo(badgeX, tY + 4.5);
        ctx.closePath();
        ctx.fill();
        
        // Draw black utility belt on the waist
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(tX + 1, tY + tH - 4, tW - 2, 3);
        // Golden buckle
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(cx - 1.5, tY + tH - 4, 3, 3);
      } else if (sKey === 'npc_cleaner') {
        // Bright cyan overalls apron in front
        ctx.fillStyle = '#0891b2';
        ctx.fillRect(tX + 3, tY + 4, tW - 6, tH - 4);
        // Apron straps
        ctx.strokeStyle = '#0891b2';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tX + 3, tY + 4); ctx.lineTo(tX + 5, tY);
        ctx.moveTo(tX + tW - 3, tY + 4); ctx.lineTo(tX + tW - 5, tY);
        ctx.stroke();
      } else if (sKey === 'npc_diretora' || sKey === 'npc_farias') {
        // White shirt and colored tie
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(cx - 3, tY);
        ctx.lineTo(cx + 3, tY);
        ctx.lineTo(cx, tY + 5);
        ctx.closePath();
        ctx.fill();
        
        // Red tie for Farias, gold brooch for diretora
        if (sKey === 'npc_farias') {
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(cx - 1, tY + 2, 2, 6);
        } else {
          ctx.fillStyle = '#fbbf24'; // Golden circular brooch/necklace
          ctx.beginPath(); ctx.arc(cx, tY + 3, 1.5, 0, Math.PI * 2); ctx.fill();
        }
      } else if (sKey === 'npc_ana') {
        // Pearl necklace or silk scarf
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(cx - 3, tY + 3, 1, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx, tY + 4, 1.2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 3, tY + 3, 1, 0, Math.PI*2); ctx.fill();
      } else if (sKey.startsWith('npc_pat_') || sKey.startsWith('npc_patient_') || sKey === 'npc_maria_amb' || sKey === 'npc_jose' || sKey === 'npc_laura' || sKey === 'npc_felipe' || sKey === 'paciente_ps_3') {
        // Casual / patient designs
        if (sKey === 'npc_pat_old_m' || sKey === 'npc_pat_old_f' || sKey.startsWith('npc_patient_') || sKey === 'paciente_ps_3') {
          // Draw standard light blue/white hospital gown details (V-neck line)
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(cx - 3, tY); ctx.lineTo(cx, tY + 4); ctx.lineTo(cx + 3, tY);
          ctx.stroke();
        } else {
          // Diverse striped t-shirt patterns or sweaters for visitors/other patients
          ctx.fillStyle = 'rgba(255,255,255,0.45)';
          ctx.fillRect(tX + 1, tY + 3, tW - 2, 2);
          ctx.fillRect(tX + 1, tY + 8, tW - 2, 2);
        }
      } else {
        // Default Doctors and Nurses (SCRUBS / LAB COATS)
        ctx.fillStyle = c.role === 'doctor' ? '#f8fafc' : darken(torsoColor, 0.12);
        ctx.beginPath();
        if (isLR) {
          ctx.moveTo(tX + (facing > 0 ? 10 : 4), tY);
          ctx.lineTo(tX + (facing > 0 ? 14 : 0), tY + 8);
          ctx.lineTo(tX + (facing > 0 ? 10 : 4), tY + 10);
        } else {
          ctx.moveTo(tX + 4, tY); ctx.lineTo(tX + 9, tY + 6); ctx.lineTo(tX + 14, tY);
          ctx.lineTo(tX + 14, tY + 10); ctx.lineTo(tX + 9, tY + 12); ctx.lineTo(tX + 4, tY + 10);
        }
        ctx.fill();

        // 🎗️ Clinical Lanyard (Cordão de Crachá): Red strap around the neck collar
        ctx.strokeStyle = '#ef4444'; 
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (isLR) {
          ctx.moveTo(cx - 2, tY);
          ctx.lineTo(cx + (facing > 0 ? 2 : -2), tY + 4);
        } else {
          ctx.moveTo(cx - 3, tY);
          ctx.lineTo(cx, tY + 4);
          ctx.lineTo(cx + 3, tY);
        }
        ctx.stroke();

        // 📇 Mini Photo ID badge (Crachá com foto)
        const badgeX = tX + (facing > 0 ? tW - 5 : 2);
        ctx.fillStyle = '#ffffff'; // White ID card background
        ctx.fillRect(badgeX, tY + 4, 3, 4.5);
        ctx.fillStyle = '#3b82f6'; // Blue badge holder top
        ctx.fillRect(badgeX, tY + 3, 3, 1.2);
        // Micro photo (black pixel) & status bar (tiny red line)
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(badgeX, tY + 5, 1.2, 1.2);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(badgeX + 1.5, tY + 7, 1.2, 0.8);

        // 🖊️ Pocket Pens (Canetas no bolso): Red and Blue pens sticking out
        const penX = tX + (facing > 0 ? tW - 9 : 6);
        ctx.fillStyle = '#2563eb'; // Blue pen cap
        ctx.fillRect(penX, tY + 2.5, 1, 2);
        ctx.fillStyle = '#dc2626'; // Red pen cap
        ctx.fillRect(penX + 1.2, tY + 2.5, 1, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; // pocket line
        ctx.fillRect(penX - 0.5, tY + 4.5, 3, 0.8);
      }
    } else {
      // BACK DETAILS when facing away (de costas)
      if (sKey === 'npc_guard') {
        // Yellow horizontal emblem or "GUARD" back patch
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(cx - 5, tY + 3, 10, 3);
        ctx.fillStyle = '#000000';
        ctx.fillRect(cx - 3, tY + 4, 6, 1);
      } else if (sKey === 'npc_cleaner') {
        // Overalls straps crossing on the back (X-shape)
        ctx.strokeStyle = '#0891b2';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tX + 3, tY); ctx.lineTo(tX + tW - 3, tY + tH - 4);
        ctx.moveTo(tX + tW - 3, tY); ctx.lineTo(tX + 3, tY + tH - 4);
        ctx.stroke();
      } else if (sKey === 'npc_diretora' || sKey === 'npc_farias') {
        // Suit blazer back crease
        ctx.strokeStyle = darken(torsoColor, 0.25);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, tY + 2);
        ctx.lineTo(cx, tY + tH - 2);
        ctx.stroke();
      } else if (sKey === 'npc_pat_old_m' || sKey === 'npc_pat_old_f' || sKey.startsWith('npc_patient_') || sKey === 'paciente_ps_3') {
        // Hospital gown ties at the back!
        ctx.strokeStyle = '#0284c7'; // Blue string ties
        ctx.lineWidth = 1.2;
        // Tie 1
        ctx.beginPath();
        ctx.moveTo(cx, tY + 3); ctx.lineTo(cx - 3, tY + 5);
        ctx.moveTo(cx, tY + 3); ctx.lineTo(cx + 2, tY + 4);
        ctx.stroke();
        // Tie 2
        ctx.beginPath();
        ctx.moveTo(cx, tY + 8); ctx.lineTo(cx - 2, tY + 9);
        ctx.moveTo(cx, tY + 8); ctx.lineTo(cx + 3, tY + 10);
        ctx.stroke();
      } else {
        // Default Doctors and Nurses (SCRUBS / LAB COATS)
        if (c.role === 'doctor') {
          // Lab coat back vertical split seam
          ctx.strokeStyle = darken(torsoColor, 0.15);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cx, tY + 2);
          ctx.lineTo(cx, tY + tH - 1);
          ctx.stroke();
        } else if (c.role === 'nurse') {
          // Scrubs V-neck collar outline at the neck
          ctx.strokeStyle = darken(torsoColor, 0.18);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(cx - 3, tY);
          ctx.lineTo(cx, tY + 2.5);
          ctx.lineTo(cx + 3, tY);
          ctx.stroke();
        }
      }
    }

    // --- ARMS (back) ---
    if (isLR) {
      const armSwing = moving ? -Math.sin(phase) * 5 : 0;
      drawRoundedRect(cx - tW/2 + 2, tY + 2 + armSwing, 4, 10, darken(torsoColor, 0.2), outline, 2);
    }

    // --- HEAD ---
    const hW = isLR ? 20 : 24;
    const hH = 20;
    const hX = cx - hW / 2;
    const hY = tY - hH + 4;

    // 1. Head base
    drawRoundedRect(hX, hY, hW, hH, c.skin, outline, 7);
    
    // 2. Hair (drawn BEFORE blush/eyes so face features are always on top!)
    ctx.fillStyle = c.hair;
    this.drawHair(ctx, c.visual.hairStyle, c.hair, cx, hY, hW/2, hH/2, isDown, isUp, isLR, facing, c.skin);

    // 3. Blush
    if (!isUp && c.visual.gender === 'female') {
      ctx.fillStyle = 'rgba(244,114,182, 0.5)';
      if(isLR) {
        const blushX = facing > 0 ? hX + hW - 5 : hX + 3;
        ctx.beginPath(); ctx.arc(blushX, hY + hH - 5, 2.5, 0, Math.PI*2); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(hX + 4, hY + hH - 6, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(hX + hW - 4, hY + hH - 6, 3, 0, Math.PI*2); ctx.fill();
      }
    }

    // 4. Eyes (drawn AFTER hair so they are NEVER covered by bangs or blocks!)
    if (!isUp) {
      ctx.fillStyle = '#0f172a';
      if (isLR) {
        // Single eye on front face in side profile view
        const eyeX = facing > 0 ? hX + hW - 5 : hX + 2;
        const eyeY = hY + hH/2 - 2;
        ctx.fillRect(eyeX, eyeY, 3, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(facing > 0 ? eyeX + 1 : eyeX, eyeY, 1, 1);
        if (c.visual.gender === 'female') {
           ctx.fillStyle = '#0f172a';
           ctx.fillRect(facing > 0 ? eyeX + 1 : eyeX - 1, eyeY - 1, 2, 1); // Eyelash
        }
      } else {
        ctx.fillRect(hX + 5, hY + hH/2 - 2, 3, 4);
        ctx.fillRect(hX + hW - 8, hY + hH/2 - 2, 3, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(hX + 6, hY + hH/2 - 2, 1, 1);
        ctx.fillRect(hX + hW - 7, hY + hH/2 - 2, 1, 1);
        if (c.visual.gender === 'female') {
           ctx.fillStyle = '#0f172a';
           ctx.fillRect(hX + 4, hY + hH/2 - 2, 1, 1);
           ctx.fillRect(hX + hW - 5, hY + hH/2 - 2, 1, 1);
        }
      }
    }

    // Stethoscope for Doctors
    if (c.role === 'doctor' && !isUp) {
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      if (isLR) {
         ctx.beginPath();
         ctx.moveTo(cx + (facing>0?-2:2), tY + 2);
         ctx.lineTo(cx + (facing>0?4:-4), tY + 8);
         ctx.stroke();
      } else {
         ctx.beginPath();
         ctx.arc(cx, tY + 4, 4, 0, Math.PI);
         ctx.stroke();
         ctx.beginPath();
         ctx.moveTo(cx - 4, tY + 4); ctx.lineTo(cx - 4, tY + 1); ctx.stroke();
         ctx.moveTo(cx + 4, tY + 4); ctx.lineTo(cx + 4, tY + 1); ctx.stroke();
         
         ctx.beginPath();
         ctx.moveTo(cx, tY + 8); ctx.lineTo(cx, tY + 12); ctx.stroke();
         ctx.fillStyle = '#334155';
         ctx.beginPath(); ctx.arc(cx, tY + 12, 1.5, 0, Math.PI*2); ctx.fill();
      }
    }

    // Accessories
    if (c.visual.accessory === 'surgical_cap') {
      const capColor = '#38bdf8'; // Beautiful light surgical blue cap
      const borderOutline = '#1e293b';
      const hrx = hW / 2;
      const hry = hH / 2;
      ctx.fillStyle = capColor;
      ctx.strokeStyle = borderOutline;
      ctx.lineWidth = 1.5;
      if (isLR) {
        rrFill(ctx, cx - hrx - 1, hY - 3, hrx * 2 + 2, hry + 2, 4);
        rrStroke(ctx, cx - hrx - 1, hY - 3, hrx * 2 + 2, hry + 2, 4);
      } else {
        rrFill(ctx, cx - hrx - 2, hY - 3, hrx * 2 + 4, hry + 2, 5);
        rrStroke(ctx, cx - hrx - 2, hY - 3, hrx * 2 + 4, hry + 2, 5);
      }
    }

    if (!isUp) {
      if (c.visual.accessory === 'glasses') {
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1.5;
        if (isLR) {
          rrStroke(ctx, facing > 0 ? hX + hW - 10 : hX + 2, hY + hH/2 - 4, 8, 5, 2);
          ctx.beginPath(); ctx.moveTo(facing > 0 ? hX + hW - 10 : hX + 10, hY + hH/2 - 2); ctx.lineTo(facing > 0 ? hX + 5 : hX + hW - 5, hY + hH/2 - 3); ctx.stroke();
        } else {
          rrStroke(ctx, hX + 3, hY + hH/2 - 4, 7, 5, 2);
          rrStroke(ctx, hX + hW - 10, hY + hH/2 - 4, 7, 5, 2);
          ctx.beginPath(); ctx.moveTo(hX + 10, hY + hH/2 - 2); ctx.lineTo(hX + hW - 10, hY + hH/2 - 2); ctx.stroke();
        }
      }
      if (c.visual.accessory === 'mask') {
        // High quality pixel-art surgical mask rendering
        ctx.save();
        
        if (isLR) {
          // Side profile view
          const facingRight = facing > 0;
          const mW = 10;
          const mH = 7.5;
          const mX = facingRight ? hX + 9 : hX + 1;
          const mY = hY + 11;

          // 1. Elastic Ear Loop (behind mask)
          const earX = facingRight ? hX + 6 : hX + 14;
          const earYTop = hY + 12.5;
          const earYBot = hY + 15.5;
          const anchorX = facingRight ? mX + 1 : mX + mW - 1;

          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(anchorX, mY + 1.5);
          ctx.lineTo(earX, earYTop);
          ctx.moveTo(anchorX, mY + mH - 1.5);
          ctx.lineTo(earX, earYBot);
          ctx.stroke();

          // 2. Mask Base Fill (Medical Blue fabric with shading)
          ctx.fillStyle = '#38bdf8';
          rrFill(ctx, mX, mY, mW, mH, 2);

          // Lower fold shadow for depth
          ctx.fillStyle = '#0284c7';
          rrFill(ctx, mX, mY + 4, mW, mH - 4, 1.5);

          // 3. Dark Outline
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1;
          rrStroke(ctx, mX, mY, mW, mH, 2);

          // 4. Metal Nose Wire Highlight on top edge
          ctx.fillStyle = '#e0f2fe';
          const wireX = facingRight ? mX + 2 : mX + 1;
          ctx.fillRect(wireX, mY + 0.8, mW - 3, 1);

          // 5. Accordion Pleats / Folds
          ctx.fillStyle = 'rgba(3, 105, 161, 0.6)';
          ctx.fillRect(mX + 1, mY + 2.8, mW - 2, 0.8);
          ctx.fillRect(mX + 1, mY + 4.8, mW - 2, 0.8);

        } else {
          // Front view
          const mW = 16;
          const mH = 7.5;
          const mX = cx - mW / 2;
          const mY = hY + 11;

          // 1. Elastic Ear Loops (left and right)
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 1;
          ctx.beginPath();
          // Left ear loop
          ctx.moveTo(mX + 1, mY + 1.5);
          ctx.lineTo(hX + 2, hY + 12.5);
          ctx.moveTo(mX + 1, mY + mH - 1.5);
          ctx.lineTo(hX + 2, hY + 15.5);
          // Right ear loop
          ctx.moveTo(mX + mW - 1, mY + 1.5);
          ctx.lineTo(hX + hW - 2, hY + 12.5);
          ctx.moveTo(mX + mW - 1, mY + mH - 1.5);
          ctx.lineTo(hX + hW - 2, hY + 15.5);
          ctx.stroke();

          // 2. Mask Base Fill
          ctx.fillStyle = '#38bdf8';
          rrFill(ctx, mX, mY, mW, mH, 2);

          // Lower fold shadow
          ctx.fillStyle = '#0284c7';
          rrFill(ctx, mX, mY + 4, mW, mH - 4, 1.5);

          // 3. Dark Outline
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1;
          rrStroke(ctx, mX, mY, mW, mH, 2);

          // 4. Metal Nose Wire Highlight
          ctx.fillStyle = '#e0f2fe';
          ctx.fillRect(mX + 3, mY + 0.8, mW - 6, 1);

          // 5. Accordion Pleats / Folds
          ctx.fillStyle = 'rgba(3, 105, 161, 0.6)';
          ctx.fillRect(mX + 1.5, mY + 2.8, mW - 3, 0.8);
          ctx.fillRect(mX + 1.5, mY + 4.8, mW - 3, 0.8);
        }

        ctx.restore();
      }
    }

    // Draw nurse caps only for female nurses
    if (c.visual.nurseCap || (c.role === 'nurse' && c.visual.gender === 'female')) {
      const capColor = '#ffffff';
      const stripeColor = '#e74c3c';
      const capY = hY - 5;
      ctx.fillStyle = capColor;
      if (isLR) {
        rrFill(ctx, cx - 4, capY, 8, 5, 1);
        ctx.fillStyle = stripeColor;
        ctx.fillRect(cx - 4, capY + 2, 8, 2);
      } else {
        rrFill(ctx, cx - 8, capY, 16, 6, 1);
        ctx.fillStyle = stripeColor;
        ctx.fillRect(cx - 8, capY + 3, 16, 2);
      }
    }

    // --- ARMS (front) ---
    if (isLR) {
      const armSwingB = moving ? Math.sin(phase) * 5 : 0;
      drawRoundedRect(cx +(facing>0?-2:0), tY + 2 + armSwingB, 4, 10, torsoColor, outline, 2);
      if (c.role === 'patient') {
         ctx.fillStyle = '#ef4444'; // Red allergy/ID wristband
         ctx.fillRect(cx +(facing>0?-2:0), tY + 9 + armSwingB, 4, 2);
      }
    } else {
      const armColor = isUp ? darken(torsoColor, 0.1) : torsoColor;
      drawRoundedRect(cx - tW/2 - 4, tY + 2 +(moving?-stride:0), 5, 11, armColor, outline, 2);
      drawRoundedRect(cx + tW/2 - 1, tY + 2 +(moving?-strideB:0), 5, 11, armColor, outline, 2);
      if (c.role === 'patient' && !isUp) {
         ctx.fillStyle = '#ef4444'; // Red allergy/ID wristband
         ctx.fillRect(cx + tW/2 - 1, tY + 10 +(moving?-strideB:0), 5, 2);
      }
    }

    // 📋 Clinical Clipboard (Prancheta Médica) or Tablet
    if (!isUp && (c.role === 'nurse' || c.role === 'doctor' || c.isPlayer)) {
      // Don't draw if they are playing a patient role (or are specifically patient NPCs)
      if (sKey !== 'npc_cleaner' && sKey !== 'npc_guard' && !sKey.startsWith('npc_pat_') && !sKey.startsWith('npc_patient_')) {
        ctx.fillStyle = '#b45309'; // Rich wooden clipboard brown
        ctx.strokeStyle = '#1e293b'; // crisp dark outline
        ctx.lineWidth = 1;

        let cbX = cx + 3;
        let cbY = tY + 5;
        if (isLR) {
          cbX = cx + (facing > 0 ? 3 : -9);
          cbY = tY + 4 + (moving ? Math.sin(phase) * 2 : 0);
        } else {
          cbX = cx + 3;
          cbY = tY + 5 + (moving ? Math.sin(phase) * 1.5 : 0);
        }

        // 1. Draw wood background (6x8 px)
        ctx.fillRect(cbX, cbY, 6, 8);
        ctx.strokeRect(cbX, cbY, 6, 8);

        // 2. Draw white paper core (4x6 px)
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(cbX + 1, cbY + 1.5, 4, 5.5);

        // 3. Draw steel top clip (2x1 px)
        ctx.fillStyle = '#64748b';
        ctx.fillRect(cbX + 2, cbY, 2, 1);

        // 4. Draw clinical records lines (micro lines of text)
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(cbX + 2, cbY + 3, 2, 0.7);
        ctx.fillRect(cbX + 2, cbY + 5, 2, 0.7);
      }
    }
  }

  private drawHair(
    ctx: CanvasRenderingContext2D,
    style: string,
    hair: string,
    cx: number, hY: number, hrx: number, hry: number,
    isDown: boolean, isUp: boolean, isLR: boolean, facing: number,
    skinColor: string,
  ) {
    const outline = '#1e293b';
    const drawHairChunk = (x:number, y:number, w:number, h:number, r:number=4) => {
      ctx.fillStyle = hair; rrFill(ctx, x, y, w, h, r);
      ctx.strokeStyle = outline; ctx.lineWidth = 1.5; rrStroke(ctx, x, y, w, h, r);
    };

    if (style === 'bald') return;

    // ── SIDE PROFILE VIEW (isLR): Keep face and eye completely clear! ──────
    if (isLR) {
      const backX = facing > 0 ? cx - hrx : cx - 1;
      // 1. Top cap (skull crown)
      drawHairChunk(cx - hrx, hY - 3, hrx * 2, 5, 3);

      // 2. Back half of skull hair coverage
      drawHairChunk(backX, hY, hrx + 1, hry * 2 - 4, 3);

      // 3. Sideburn / Ear anchor
      const sbX = facing > 0 ? cx - 2 : cx;
      ctx.fillStyle = hair;
      ctx.fillRect(sbX, hY + 1, 2.5, 5);

      // 4. Style-specific back attachments (ponytail, bun, long hair)
      if (style === 'ponytail' || style === 'high_pony' || style === 'long_tied') {
        const ponyX = facing > 0 ? cx - hrx - 3 : cx + hrx - 3;
        // Scrunchie / Tie
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(ponyX + 1, hY + 3, 5, 2);
        // Ponytail strand hanging behind the head
        drawHairChunk(ponyX, hY + 5, 6, 12, 2);
      } else if (style === 'bun' || style === 'updo') {
        const bunX = facing > 0 ? cx - hrx - 2 : cx + hrx - 4;
        drawHairChunk(bunX, hY - 5, 8, 8, 4);
      } else if (style === 'loose_long') {
        drawHairChunk(backX - 2, hY + 2, hrx + 3, hry * 2 + 5, 3);
      }
      return; // Early return for side profile so no front bangs cover the face!
    }

    if (style === 'male_stylish') {
      if (!isUp) {
        ctx.fillStyle = hair;
        rrFill(ctx, cx - hrx - 1, hY - 5, hrx * 2 + 2, 6, 3);
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.5;
        rrStroke(ctx, cx - hrx - 1, hY - 5, hrx * 2 + 2, 6, 3);

        ctx.fillStyle = hair;
        ctx.beginPath();
        ctx.moveTo(cx - hrx - 1, hY - 1);
        ctx.lineTo(cx + hrx + 1, hY - 1);
        ctx.lineTo(cx + hrx - 2, hY + 3.5);
        ctx.lineTo(cx - hrx / 2, hY + 1);
        ctx.closePath();
        ctx.fill();

        ctx.fillRect(cx - hrx - 1, hY - 1, 2.5, 5);
        ctx.fillRect(cx + hrx - 1.5, hY - 1, 2.5, 4);

        ctx.fillStyle = lighten(hair, 0.35);
        ctx.fillRect(cx - hrx / 2, hY - 3.5, hrx, 1);
      } else {
        drawHairChunk(cx - hrx, hY - 4, hrx * 2, hry * 2 - 4, 3);
        ctx.fillStyle = lighten(hair, 0.25);
        ctx.fillRect(cx - hrx / 2, hY - 2, hrx, 1);
      }
      return;
    }

    // Full coverage/details if facing away (de costas)
    if (isUp) {
      if (style === 'low_fade') {
        drawHairChunk(cx - hrx, hY, hrx * 2, hry * 2 - 7, 4);
      } else if (style === 'curly_top' || style === 'afro_short') {
        drawHairChunk(cx - hrx - 1, hY - 2, hrx * 2 + 2, hry * 2 - 5, 5);
      } else if (style === 'receding') {
        drawHairChunk(cx - hrx, hY + 4, hrx * 2, hry * 2 - 9, 3);
        drawHairChunk(cx - hrx, hY, 3, hry * 2 - 5, 2);
        drawHairChunk(cx + hrx - 3, hY, 3, hry * 2 - 5, 2);
      } else if (style === 'bob') {
        drawHairChunk(cx - hrx, hY, hrx * 2, hry * 2 - 2, 3);
      } else if (style === 'loose_long') {
        drawHairChunk(cx - hrx - 2, hY, hrx * 2 + 4, hry * 2 + 8, 4);
        ctx.fillStyle = darken(hair, 0.15);
        ctx.fillRect(cx - hrx - 1, hY + hry * 2 + 4, hrx * 2 + 2, 3);
      } else if (style === 'bun' || style === 'updo') {
        drawHairChunk(cx - hrx, hY, hrx * 2, hry * 2 - 5, 4);
        if (style === 'bun') {
          drawHairChunk(cx - 5, hY - 7, 10, 8, 4);
          ctx.fillStyle = '#3b82f6';
          ctx.fillRect(cx - 4, hY - 1, 8, 2);
        } else {
          drawHairChunk(cx - 6, hY - 4, 12, 7, 3);
        }
      } else if (style === 'ponytail' || style === 'high_pony' || style === 'long_tied') {
        drawHairChunk(cx - hrx, hY, hrx * 2, hry * 2 - 5, 4);
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(cx - 3, hY + 4, 6, 2);
        drawHairChunk(cx - 3, hY + 6, 6, 12, 2);
      } else {
        const puff = (style === 'short_wavy' || style === 'short_curly_gray') ? 1 : 0;
        drawHairChunk(cx - hrx - puff, hY - puff, hrx * 2 + puff * 2, hry * 2 - 5 + puff, 4);
      }
      return;
    }

    // Front view (isDown)
    let bangH = 6;
    if (style.includes('short') || style === 'business' || style === 'low_fade') bangH = 4;
    if (style === 'bob') bangH = 7;
    if (style === 'afro_short' || style === 'curly_top') bangH = 8;
    
    drawHairChunk(cx - hrx, hY - 1, hrx * 2, bangH + 1, 3);

    if (style === 'bob' || style.includes('long')) {
      drawHairChunk(cx - hrx, hY, 4, hry * 2 - 2, 2);
      drawHairChunk(cx + hrx - 4, hY, 4, hry * 2 - 2, 2);
    }

    switch (style) {
      case 'bun':
      case 'updo':
        drawHairChunk(cx - 6, hY - 8, 12, 8, 4);
        break;
      case 'afro_short':
      case 'curly_top':
      case 'short_curly_gray':
      case 'short_wavy':
        drawHairChunk(cx - hrx - 2, hY - 4, hrx*2 + 4, 10, 5);
        break;
      case 'receding':
        ctx.fillStyle = skinColor;
        ctx.fillRect(cx - hrx + 2, hY - 1, hrx*2 - 4, 6);
        break;
      case 'loose_long':
        drawHairChunk(cx - hrx - 3, hY, 7, hry*2 + 4, 3);
        drawHairChunk(cx + hrx - 4, hY, 7, hry*2 + 4, 3);
        break;
      default:
        drawHairChunk(cx - hrx - 1, hY - 4, hrx*2 + 2, hry+2, 2);
        break;
    }
    
    // Front bangs
    if (style !== 'male_stylish') {
      ctx.fillStyle = hair;
      ctx.beginPath();
      ctx.moveTo(cx - hrx, hY-2); ctx.lineTo(cx + hrx, hY-2);
      ctx.lineTo(cx, hY + 6); ctx.fill();
    }
  }

  // ── PORTRAITS ─────────────────────────────────────────────────────────────
  private createPortraits() {
    // Map role → loaded AI portrait image key
    const rolePortraitImg: Record<string, string> = {
      nurse: 'portrait_img_nurse',
      doctor: 'portrait_img_doctor',
      admin: 'portrait_img_admin',
      receptionist: 'portrait_img_receptionist',
    };

    for (const def of NPC_DEFS) {
      const key = `portrait_${def.id}`;
      let ct: Phaser.Textures.CanvasTexture;
      if (this.textures.exists(key)) {
        ct = this.textures.get(key) as Phaser.Textures.CanvasTexture;
      } else {
        ct = this.textures.createCanvas(key, 90, 90) as Phaser.Textures.CanvasTexture;
      }
      const ctx = ct.getContext();
      ctx.clearRect(0, 0, 90, 90);

      const hexRgb = (n: number) => `rgb(${(n >> 16) & 0xff},${(n >> 8) & 0xff},${n & 0xff})`;
      const skinC = def.skinColor ? hexRgb(def.skinColor) : '#f5c5a3';
      const coatC = hexRgb(def.coatColor);
      const hairC = hexRgb(def.hairColor);
      const r0 = (def.coatColor >> 16) & 0xff;
      const g0 = (def.coatColor >> 8) & 0xff;
      const b0 = def.coatColor & 0xff;

      // Try to use the AI-generated portrait PNG for this role
      const imgKey = rolePortraitImg[def.role];
      if (imgKey && this.textures.exists(imgKey)) {
        const src = this.textures.get(imgKey).getSourceImage() as HTMLImageElement;
        if (src && src.width) {
          // Rounded clip mask
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(0, 0, 90, 90, 10);
          ctx.clip();
          ctx.drawImage(src, 0, 0, 90, 90);
          ctx.restore();
          // Subtle colored tint overlay to unify with game palette
          ctx.fillStyle = `rgba(${r0},${g0},${b0},0.12)`;
          ctx.beginPath(); ctx.roundRect(0, 0, 90, 90, 10); ctx.fill();
          ct.refresh();
          continue;
        }
      }

      // ── Fallback: procedural pixel-art portrait ──────────────────────────
      // Background gradient
      ctx.fillStyle = '#f0f5f8'; ctx.fillRect(0, 0, 90, 90);
      const bgGrad = ctx.createLinearGradient(0, 0, 90, 90);
      bgGrad.addColorStop(0, `rgba(${r0},${g0},${b0},0.10)`);
      bgGrad.addColorStop(1, `rgba(${r0},${g0},${b0},0.40)`);
      ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, 90, 90);

      // Subtle dot grid
      ctx.fillStyle = 'rgba(0,0,0,0.04)';
      for (let gy = 4; gy < 90; gy += 8) for (let gx = 4; gx < 90; gx += 8) {
        ctx.fillRect(gx, gy, 1, 1);
      }

      // Shoulders — wider and more realistic
      ctx.fillStyle = coatC;
      ctx.beginPath();
      ctx.moveTo(-5, 90); ctx.lineTo(-5, 58);
      ctx.bezierCurveTo(2, 50, 32, 48, 45, 51);
      ctx.bezierCurveTo(58, 48, 88, 50, 95, 58);
      ctx.lineTo(95, 90); ctx.closePath(); ctx.fill();
      // Shoulder shadow
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath();
      ctx.moveTo(-5, 90); ctx.lineTo(-5, 68);
      ctx.bezierCurveTo(2, 62, 32, 60, 45, 63);
      ctx.bezierCurveTo(58, 60, 88, 62, 95, 68);
      ctx.lineTo(95, 90); ctx.closePath(); ctx.fill();

      // Doctor white coat lapels
      if (def.role === 'doctor') {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath(); ctx.moveTo(40, 51); ctx.lineTo(-5, 68); ctx.lineTo(-5, 51); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(50, 51); ctx.lineTo(95, 68); ctx.lineTo(95, 51); ctx.closePath(); ctx.fill();
      }

      // Stethoscope
      if (def.role === 'doctor' || def.role === 'nurse') {
        ctx.strokeStyle = '#1a252f'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(45, 64, 10, 0, Math.PI); ctx.stroke();
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath(); ctx.arc(45, 74, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath(); ctx.arc(45, 74, 2, 0, Math.PI * 2); ctx.fill();
      }

      // V-neck skin visible
      ctx.fillStyle = skinC;
      ctx.beginPath(); ctx.moveTo(38, 51); ctx.lineTo(45, 64); ctx.lineTo(52, 51); ctx.closePath(); ctx.fill();

      // Neck
      ctx.fillStyle = skinC; rrFill(ctx, 37, 38, 16, 16, 5);
      ctx.fillStyle = darken(skinC, 0.1);
      ctx.fillRect(37, 50, 16, 4);

      // Head — bigger and more proportional
      ctx.fillStyle = skinC;
      ctx.beginPath(); ctx.ellipse(45, 24, 21, 23, 0, 0, Math.PI * 2); ctx.fill();
      // Subtle cheek shading
      ctx.fillStyle = darken(skinC, 0.06);
      ctx.beginPath(); ctx.ellipse(30, 28, 6, 8, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(60, 28, 6, 8, -0.2, 0, Math.PI * 2); ctx.fill();
      // Head highlight
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath(); ctx.ellipse(36, 14, 9, 10, -0.3, 0, Math.PI * 2); ctx.fill();

      // Hair — fuller and more volumetric
      ctx.fillStyle = hairC;
      ctx.beginPath(); ctx.ellipse(45, 7, 22, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(24, 7, 42, 20);
      // Hair shine
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath(); ctx.ellipse(38, 5, 8, 5, -0.2, 0, Math.PI * 2); ctx.fill();

      // Eyebrows — arched
      ctx.strokeStyle = darken(hairC, 0.15); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(31, 17); ctx.quadraticCurveTo(36, 13, 41, 17); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(49, 17); ctx.quadraticCurveTo(54, 13, 59, 17); ctx.stroke();

      // Eyes — larger and more expressive
      ctx.fillStyle = '#1a2530';
      rrFill(ctx, 32, 20, 9, 7, 3);
      rrFill(ctx, 49, 20, 9, 7, 3);
      ctx.fillStyle = '#fff';
      ctx.fillRect(32, 20, 3.5, 3); ctx.fillRect(49, 20, 3.5, 3);
      ctx.fillStyle = '#000';
      ctx.fillRect(35, 21, 4, 4); ctx.fillRect(52, 21, 4, 4);
      // Eye sparkle
      ctx.fillStyle = '#fff';
      ctx.fillRect(36, 21, 1.5, 1.5); ctx.fillRect(53, 21, 1.5, 1.5);

      // Nose — subtle
      ctx.fillStyle = darken(skinC, 0.13);
      ctx.beginPath(); ctx.arc(45, 32, 2.5, 0, Math.PI * 2); ctx.fill();

      // Warm smile
      ctx.strokeStyle = darken(skinC, 0.20); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(45, 38, 7, 0.2, Math.PI - 0.2); ctx.stroke();

      // Blush cheeks
      ctx.fillStyle = 'rgba(220,80,80,0.16)';
      ctx.beginPath(); ctx.ellipse(31, 33, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(59, 33, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill();

      // Glasses (doctor/admin)
      if (def.role === 'doctor' || def.role === 'admin') {
        ctx.strokeStyle = '#4a5568'; ctx.lineWidth = 2;
        rrStroke(ctx, 31, 19, 12, 9, 3);
        rrStroke(ctx, 47, 19, 12, 9, 3);
        ctx.beginPath(); ctx.moveTo(43, 23); ctx.lineTo(47, 23); ctx.stroke();
      }

      // Nurse cap
      if (def.role === 'nurse') {
        ctx.fillStyle = '#ffffff';
        rrFill(ctx, 24, 2, 42, 8, 2);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(24, 6, 42, 3);
        // Cap highlight
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(24, 2, 42, 2);
      }

      // ID Badge
      if (def.role === 'nurse' || def.role === 'admin' || def.role === 'receptionist') {
        ctx.fillStyle = '#e74c3c';
        rrFill(ctx, 24, 57, 18, 22, 2);
        ctx.fillStyle = '#fff';
        ctx.fillRect(26, 61, 14, 2); ctx.fillRect(26, 65, 12, 2); ctx.fillRect(26, 69, 14, 2);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(24, 57, 18, 3);
      }

      ct.refresh();
    }

    // Player portrait
    this.createPlayerPortrait();
  }

  private createPixelTexture() {
    const key = 'pixel';
    let ct: Phaser.Textures.CanvasTexture;
    if (this.textures.exists(key)) {
      ct = this.textures.get(key) as Phaser.Textures.CanvasTexture;
    } else {
      ct = this.textures.createCanvas(key, TILE_SIZE, TILE_SIZE) as Phaser.Textures.CanvasTexture;
    }
    const ctx = ct.getContext();
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    ct.refresh();
  }
}
