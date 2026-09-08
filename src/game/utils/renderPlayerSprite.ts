import { PlayerProfile } from '../data/gameData';

export function rrFill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

export function rrStroke(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

export function darken(hex: string, amount = 0.2): string {
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

export function lighten(hex: string, amount = 0.2): string {
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

export interface DrawCharacterConfig {
  skin: string;
  coat: string;
  coatDark: string;
  pants: string;
  hair: string;
  shoe: string;
  role: string;
  isPlayer: boolean;
  visual: {
    gender: 'male' | 'female';
    hairStyle: string;
    build: 'slim' | 'medium' | 'stocky';
    groundYOff: number;
    age: 'young' | 'adult' | 'senior';
    accessory: 'none' | 'glasses' | 'surgical_cap' | 'mask';
    nurseCap: boolean;
  };
  spriteKey?: string;
}

export function drawHair(
  ctx: CanvasRenderingContext2D,
  style: string,
  hair: string,
  cx: number, hY: number, hrx: number, hry: number,
  isDown: boolean, isUp: boolean, isLR: boolean, facing: number,
  skinColor: string,
) {
  const outline = '#1e293b';
  const drawHairChunk = (x: number, y: number, w: number, h: number, r: number = 4) => {
    ctx.fillStyle = hair; rrFill(ctx, x, y, w, h, r);
    ctx.strokeStyle = outline; ctx.lineWidth = 1.5; rrStroke(ctx, x, y, w, h, r);
  };

  if (style === 'bald') return;

  // Modern Male Player Unique Hair Style (NO giant black block!)
  if (style === 'male_stylish') {
    if (isUp) {
      drawHairChunk(cx - hrx, hY - 4, hrx * 2, hry * 2 - 4, 3);
      ctx.fillStyle = lighten(hair, 0.25);
      ctx.fillRect(cx - hrx / 2, hY - 2, hrx, 1);
    } else if (isLR) {
      // Side profile: hair on top and back of skull, leaving face clear
      const backX = facing > 0 ? cx - hrx : cx - 2;
      drawHairChunk(backX, hY - 4, hrx + 2, hry + 2, 3);
      // Sideburn
      const sbX = facing > 0 ? cx - 2 : cx;
      ctx.fillStyle = hair;
      ctx.fillRect(sbX, hY + 1, 2.5, 4);
    } else {
      // Front view
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
    }
    return;
  }

  // Female / Ponytail / Default styles
  if (isUp) {
    drawHairChunk(cx - hrx, hY, hrx * 2, hry * 2 - 5, 4);
    if (style === 'ponytail' || style === 'high_pony' || style === 'long_tied') {
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(cx - 3, hY + 4, 6, 2);
      drawHairChunk(cx - 3, hY + 6, 6, 12, 2);
    }
    return;
  }

  if (isLR) {
    // Side view profile:
    // 1. Top hair cap (from back of head to forehead line, face stays clear!)
    drawHairChunk(cx - hrx, hY - 2, hrx * 2, 6, 3);

    // 2. Back hair / Ponytail on BACK of head
    if (style === 'ponytail' || style === 'high_pony' || style === 'long_tied') {
      const backX = facing > 0 ? cx - hrx - 3 : cx + hrx - 3;
      // Hair tie
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(backX + 1, hY + 3, 5, 2);
      // Hanging ponytail
      drawHairChunk(backX, hY + 5, 6, 12, 2);
    }

    // 3. Sideburn / back of ear coverage (on back half of head)
    const sbX = facing > 0 ? cx - hrx : cx + 2;
    ctx.fillStyle = hair;
    ctx.fillRect(sbX, hY + 2, 4, 5);

    return;
  }

  // Front view (isDown)
  drawHairChunk(cx - hrx, hY - 1, hrx * 2, 6, 3);
  if (style === 'ponytail') {
    drawHairChunk(cx - hrx, hY, 3, hry * 2 - 4, 2);
    drawHairChunk(cx + hrx - 3, hY, 3, hry * 2 - 4, 2);
  }
}

export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  fi: number, dir: number, step: number,
  c: DrawCharacterConfig,
  sprW = 44, sprH = 68
) {
  const x = fi * sprW;
  ctx.clearRect(x, 0, sprW, sprH);

  const isDown = dir === 0, isUp = dir === 1;
  const isLeft = dir === 2, isRight = dir === 3;
  const isLR = isLeft || isRight;
  const moving = step > 0;
  const facing = isRight ? 1 : -1;

  const phase = moving ? (step - 1) * (Math.PI * 2 / 5) : 0;
  const stride = moving ? Math.sin(phase) * 6 : 0;
  const strideB = -stride;
  const bob = moving ? -Math.abs(Math.sin(phase)) * 2 : 0;

  const cx = x + sprW / 2;
  const groundY = 64;
  const bodyBase = groundY + bob;

  const outline = '#1e293b';

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(cx, groundY + 2, 11, 4, 0, 0, Math.PI * 2);
  ctx.fill();

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
    drawRoundedRect(cx - 8, bodyBase - 4 + (moving ? stride : 0), 6, 5, c.shoe, outline, 2);
    drawRoundedRect(cx + 2, bodyBase - 4 + (moving ? strideB : 0), 6, 5, c.shoe, outline, 2);
  }

  const torsoColor = c.coat;
  const pantsColor = c.pants;

  // --- LEGS ---
  if (isLR) {
    drawRoundedRect(cx - 2 + facing * stride, bodyBase - 12, 5, 10, pantsColor, outline, 1);
    drawRoundedRect(cx - 5 - facing * stride, bodyBase - 12, 5, 10, darken(pantsColor, 0.2), outline, 1);
  } else {
    drawRoundedRect(cx - 8, bodyBase - 12 + (moving ? stride : 0), 6, 12, pantsColor, outline, 1);
    drawRoundedRect(cx + 2, bodyBase - 12 + (moving ? strideB : 0), 6, 12, pantsColor, outline, 1);
  }

  // --- TORSO ---
  const tW = isLR ? 14 : 18;
  const tH = 14;
  const tX = cx - tW / 2;
  const tY = bodyBase - 24;

  drawRoundedRect(tX, tY, tW, tH, torsoColor, outline, 4);

  // Bottom shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(tX + 1, tY + tH - 3, tW - 2, 2);

  if (!isUp) {
    // Scrubs V-neck
    ctx.fillStyle = darken(torsoColor, 0.12);
    ctx.beginPath();
    ctx.moveTo(tX + 4, tY); ctx.lineTo(tX + 9, tY + 6); ctx.lineTo(tX + 14, tY);
    ctx.lineTo(tX + 14, tY + 10); ctx.lineTo(tX + 9, tY + 12); ctx.lineTo(tX + 4, tY + 10);
    ctx.fill();

    // Lanyard
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 3, tY);
    ctx.lineTo(cx, tY + 4);
    ctx.lineTo(cx + 3, tY);
    ctx.stroke();

    // ID Badge
    const badgeX = tX + 2;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(badgeX, tY + 4, 3, 4.5);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(badgeX, tY + 3, 3, 1.2);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(badgeX, tY + 5, 1.2, 1.2);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(badgeX + 1.5, tY + 7, 1.2, 0.8);

    // Pocket Pens
    const penX = tX + tW - 9;
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(penX, tY + 2.5, 1, 2);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(penX + 1.2, tY + 2.5, 1, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(penX - 0.5, tY + 4.5, 3, 0.8);
  }

  // --- ARMS (back) ---
  if (isLR) {
    const armSwing = moving ? -Math.sin(phase) * 5 : 0;
    drawRoundedRect(cx - tW / 2 + 2, tY + 2 + armSwing, 4, 10, darken(torsoColor, 0.2), outline, 2);
  }

  // --- HEAD ---
  const hW = isLR ? 20 : 24;
  const hH = 20;
  const hX = cx - hW / 2;
  const hY = tY - hH + 4;

  drawRoundedRect(hX, hY, hW, hH, c.skin, outline, 7);

  // Blush (Female)
  if (!isUp && c.visual.gender === 'female') {
    ctx.fillStyle = 'rgba(244,114,182, 0.5)';
    if (isLR) {
      // Only on front cheek in side view
      const blushX = facing > 0 ? hX + hW - 4 : hX + 4;
      ctx.beginPath(); ctx.arc(blushX, hY + hH - 6, 3, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(hX + 4, hY + hH - 6, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hX + hW - 4, hY + hH - 6, 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Eyes
  if (!isUp) {
    if (isLR) {
      // Side Profile View: ONE EYE near the front edge of the face!
      const eyeX = facing > 0 ? hX + hW - 6 : hX + 3;
      const eyeY = hY + hH / 2 - 2;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(eyeX, eyeY, 3, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(facing > 0 ? eyeX + 1 : eyeX, eyeY, 1, 1);
      if (c.visual.gender === 'female') {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(facing > 0 ? eyeX + 1 : eyeX - 1, eyeY - 1, 2, 1); // Eyelash
      }
    } else {
      // Front View
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(hX + 5, hY + hH / 2 - 2, 3, 4);
      ctx.fillRect(hX + hW - 8, hY + hH / 2 - 2, 3, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(hX + 6, hY + hH / 2 - 2, 1, 1);
      ctx.fillRect(hX + hW - 7, hY + hH / 2 - 2, 1, 1);
      if (c.visual.gender === 'female') {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(hX + 4, hY + hH / 2 - 2, 1, 1);
        ctx.fillRect(hX + hW - 5, hY + hH / 2 - 2, 1, 1);
      }
    }
  }

  // Hair
  drawHair(ctx, c.visual.hairStyle, c.hair, cx, hY, hW / 2, hH / 2, isDown, isUp, isLR, facing, c.skin);

  // Nurse Cap (Female)
  if (c.visual.nurseCap || (c.role === 'nurse' && c.visual.gender === 'female')) {
    const capColor = '#ffffff';
    const stripeColor = '#e74c3c';
    const capY = hY - 5;
    const capX = isLR ? (facing > 0 ? cx - 7 : cx - 5) : cx - 8;
    ctx.fillStyle = capColor;
    rrFill(ctx, capX, capY, 14, 6, 1);
    ctx.fillStyle = stripeColor;
    ctx.fillRect(capX, capY + 3, 14, 2);
  }

  // --- ARMS (front) ---
  const armColor = isUp ? darken(torsoColor, 0.1) : torsoColor;
  if (isLR) {
    const frontArmX = facing > 0 ? cx + tW / 2 - 3 : cx - tW / 2 - 2;
    drawRoundedRect(frontArmX, tY + 2 + (moving ? -stride : 0), 5, 11, armColor, outline, 2);
  } else {
    drawRoundedRect(cx - tW / 2 - 4, tY + 2 + (moving ? -stride : 0), 5, 11, armColor, outline, 2);
    drawRoundedRect(cx + tW / 2 - 1, tY + 2 + (moving ? -strideB : 0), 5, 11, armColor, outline, 2);
  }

  // 📋 Clinical Clipboard
  if (!isUp) {
    ctx.fillStyle = '#b45309';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;

    const cbX = isLR ? (facing > 0 ? cx + 2 : cx - 8) : cx + 3;
    const cbY = tY + 5;

    ctx.fillRect(cbX, cbY, 6, 8);
    ctx.strokeRect(cbX, cbY, 6, 8);

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(cbX + 1, cbY + 1.5, 4, 5.5);

    ctx.fillStyle = '#64748b';
    ctx.fillRect(cbX + 2, cbY, 2, 1);

    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(cbX + 2, cbY + 3, 2, 0.7);
    ctx.fillRect(cbX + 2, cbY + 5, 2, 0.7);
  }
}

/**
 * Render exact in-game full sprite on preview canvas with hospital tile background.
 */
export function renderPlayerPreviewOnCanvas(
  canvas: HTMLCanvasElement,
  profile: PlayerProfile
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Disable anti-aliasing for sharp pixel art
  ctx.imageSmoothingEnabled = false;

  // 1. Draw Hospital Tile Floor Background
  const tileSize = 16;
  for (let x = 0; x < w; x += tileSize) {
    for (let y = 0; y < h; y += tileSize) {
      const isAlt = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0;
      ctx.fillStyle = isAlt ? '#f8fafc' : '#f1f5f9';
      ctx.fillRect(x, y, tileSize, tileSize);

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, tileSize, tileSize);
    }
  }

  // Blue wall accent border line
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(w - 4, 0, 4, h);

  // 2. Draw Character Sprite Frame on Offscreen 44x70 Canvas
  const sprW = 44;
  const sprH = 70;
  const offCanvas = document.createElement('canvas');
  offCanvas.width = sprW;
  offCanvas.height = sprH;
  const offCtx = offCanvas.getContext('2d');
  if (!offCtx) return;

  const gender = profile.gender || 'female';
  const isFemale = gender === 'female';
  const skin = profile.skinTone || '#f5c5a3';
  const hair = isFemale ? '#2c1a12' : '#221915';

  const config: DrawCharacterConfig = {
    skin,
    coat: '#1abc9c',
    coatDark: '#12876b',
    pants: '#0e6b55',
    hair,
    shoe: '#1a0f08',
    role: 'nurse',
    isPlayer: true,
    visual: {
      gender,
      hairStyle: isFemale ? 'ponytail' : 'male_stylish',
      build: 'medium',
      groundYOff: 0,
      age: 'adult',
      accessory: 'none',
      nurseCap: isFemale,
    },
  };

  drawCharacter(offCtx, 0, 0, 0, config, sprW, sprH);

  // 3. Draw scaled pixel art sprite onto preview canvas with PROPER FIT
  const scale = Math.min((w - 12) / sprW, (h - 12) / sprH);
  const destW = Math.round(sprW * scale);
  const destH = Math.round(sprH * scale);
  const destX = Math.round((w - destW) / 2);
  const destY = Math.round((h - destH) / 2); // CENTERED VERTICALLY!

  ctx.drawImage(offCanvas, 0, 0, sprW, sprH, destX, destY, destW, destH);
}

/**
 * Render mini head/bust portrait for gender buttons
 */
export function renderPlayerPortraitOnCanvas(
  canvas: HTMLCanvasElement,
  gender: 'female' | 'male',
  skinTone: string
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;

  // Render character frame on offscreen canvas
  const sprW = 44;
  const sprH = 70;
  const offCanvas = document.createElement('canvas');
  offCanvas.width = sprW;
  offCanvas.height = sprH;
  const offCtx = offCanvas.getContext('2d');
  if (!offCtx) return;

  const isFemale = gender === 'female';
  const hair = isFemale ? '#2c1a12' : '#221915';

  const config: DrawCharacterConfig = {
    skin: skinTone,
    coat: '#1abc9c',
    coatDark: '#12876b',
    pants: '#0e6b55',
    hair,
    shoe: '#1a0f08',
    role: 'nurse',
    isPlayer: true,
    visual: {
      gender,
      hairStyle: isFemale ? 'ponytail' : 'male_stylish',
      build: 'medium',
      groundYOff: 0,
      age: 'adult',
      accessory: 'none',
      nurseCap: isFemale,
    },
  };

  drawCharacter(offCtx, 0, 0, 0, config, sprW, sprH);

  // Crop upper body / head area from offscreen canvas: src (x: 4, y: 12, w: 36, h: 38)
  ctx.drawImage(offCanvas, 4, 12, 36, 38, 0, 0, w, h);
}
