import React, { useRef, useEffect } from 'react';
import { drawCharacter, DrawCharacterConfig } from '../game/utils/renderPlayerSprite';

export interface LiveGameplayPlayer {
  playerName: string;
  x?: number;
  y?: number;
  facing?: string;
  isMoving?: boolean;
  lastActivity?: string;
  currentRoom?: string;
}

function getDisplayNickname(fullName: string): { nick: string; firstName: string; prefix?: string } {
  if (!fullName) return { nick: "Estudante", firstName: "Estudante" };
  const trimmed = fullName.trim();
  const prefixMatch = trimmed.match(/^(Enf\.?|Dr\.?|Dra\.?|Téc\.?)\s+/i);
  const prefix = prefixMatch ? prefixMatch[1] : undefined;
  const withoutPrefix = prefixMatch ? trimmed.slice(prefixMatch[0].length) : trimmed;
  const parts = withoutPrefix.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "Estudante";
  return {
    nick: prefix ? `${prefix} ${firstName}` : firstName,
    firstName,
    prefix,
  };
}

interface SectorDef {
  id: string;
  name: string;
  short: string;
  code: string;
  col: number;
  row: number;
  w: number;
  h: number;
  floorColor: string;
  wallColor: string;
  accentColor: string;
  type: 'reception' | 'emergency' | 'pharmacy' | 'lab' | 'radiology' | 'admin' | 'cme' | 'break' | 'ward' | 'icu' | 'nursing' | 'outpatient' | 'maternity' | 'oncology' | 'rehab' | 'psych' | 'garden';
}

const HUAP_SECTORS: SectorDef[] = [
  // North Wing (rows 2..12)
  { id: 'reception', name: 'Recepção Central & Acolhimento', short: 'RECEPÇÃO', code: '01•REC', col: 2, row: 2, w: 10, h: 11, floorColor: '#1a2333', wallColor: '#38bdf8', accentColor: '#38bdf8', type: 'reception' },
  { id: 'emergency', name: 'Pronto-Socorro / Triagem Manchester', short: 'PRONTO-SOCORRO', code: '02•PS', col: 13, row: 2, w: 12, h: 11, floorColor: '#25171e', wallColor: '#f43f5e', accentColor: '#f43f5e', type: 'emergency' },
  { id: 'pharmacy', name: 'Farmácia Hospitalar & CAF', short: 'FARMÁCIA', code: '03•FARM', col: 26, row: 2, w: 11, h: 11, floorColor: '#1a1d36', wallColor: '#818cf8', accentColor: '#818cf8', type: 'pharmacy' },
  { id: 'lab', name: 'Laboratório de Análises Clínicas', short: 'LABORATÓRIO', code: '04•LAB', col: 38, row: 2, w: 12, h: 11, floorColor: '#132433', wallColor: '#22d3ee', accentColor: '#22d3ee', type: 'lab' },
  { id: 'radiology', name: 'Diagnóstico por Imagem (RX/TC)', short: 'RADIOLOGIA', code: '05•RX', col: 51, row: 2, w: 11, h: 11, floorColor: '#201633', wallColor: '#c084fc', accentColor: '#c084fc', type: 'radiology' },
  { id: 'admin', name: 'Diretoria & Gestão Hospitalar', short: 'DIRETORIA', code: '06•DIR', col: 63, row: 2, w: 11, h: 11, floorColor: '#261f12', wallColor: '#fbbf24', accentColor: '#fbbf24', type: 'admin' },

  // Middle Wing (rows 17..26)
  { id: 'cme', name: 'Central de Material Esterilizado', short: 'CME', code: '07•CME', col: 2, row: 17, w: 9, h: 10, floorColor: '#1e2430', wallColor: '#94a3b8', accentColor: '#94a3b8', type: 'cme' },
  { id: 'break', name: 'Copa & Nutrição Dietética', short: 'COPA / NUTRIÇÃO', code: '08•COPA', col: 12, row: 17, w: 11, h: 10, floorColor: '#292212', wallColor: '#facc15', accentColor: '#facc15', type: 'break' },
  { id: 'ward', name: 'Enfermaria de Internação', short: 'ENFERMARIA', code: '09•ENF', col: 24, row: 17, w: 14, h: 10, floorColor: '#16223b', wallColor: '#60a5fa', accentColor: '#60a5fa', type: 'ward' },
  { id: 'icu', name: 'UTI Adulto Intensiva', short: 'UTI ADULTO', code: '10•UTI', col: 39, row: 17, w: 14, h: 10, floorColor: '#132929', wallColor: '#2dd4bf', accentColor: '#2dd4bf', type: 'icu' },
  { id: 'nursing', name: 'Posto de Enfermagem Central', short: 'POSTO ENFERMAGEM', code: '11•POSTO', col: 54, row: 17, w: 20, h: 10, floorColor: '#122c22', wallColor: '#34d399', accentColor: '#34d399', type: 'nursing' },

  // South Wing (rows 31..41)
  { id: 'outpatient', name: 'Ambulatório de Especialidades', short: 'AMBULATÓRIO', code: '12•AMB', col: 2, row: 31, w: 12, h: 11, floorColor: '#162538', wallColor: '#38bdf8', accentColor: '#38bdf8', type: 'outpatient' },
  { id: 'maternity', name: 'Maternidade & Berçário', short: 'MATERNIDADE', code: '13•MAT', col: 15, row: 31, w: 12, h: 11, floorColor: '#2b1625', wallColor: '#f472b6', accentColor: '#f472b6', type: 'maternity' },
  { id: 'oncology', name: 'Oncologia & Terapia Infusional', short: 'ONCOLOGIA', code: '14•ONCO', col: 28, row: 31, w: 14, h: 11, floorColor: '#112b2a', wallColor: '#14b8a6', accentColor: '#14b8a6', type: 'oncology' },
  { id: 'rehab', name: 'Fisioterapia & Reabilitação', short: 'REABILITAÇÃO', code: '15•REAB', col: 43, row: 31, w: 13, h: 11, floorColor: '#292010', wallColor: '#f59e0b', accentColor: '#f59e0b', type: 'rehab' },
  { id: 'psych', name: 'Saúde Mental & Psicoterapia', short: 'SAÚDE MENTAL', code: '16•PSI', col: 57, row: 31, w: 17, h: 11, floorColor: '#241438', wallColor: '#c084fc', accentColor: '#c084fc', type: 'psych' },

  // Courtyard (rows 43..47)
  { id: 'garden', name: 'Jardim Terapêutico & Convivência', short: 'JARDIM CENTRAL', code: '17•JARDIM', col: 2, row: 43, w: 72, h: 5, floorColor: '#0f2918', wallColor: '#4ade80', accentColor: '#4ade80', type: 'garden' },
];

interface StaffDef {
  id: string;
  name: string;
  role: string;
  col: number;
  row: number;
  config: DrawCharacterConfig;
}

const HUAP_STAFF_MEMBERS: StaffDef[] = [
  {
    id: 'ana',
    name: 'Ana Beatriz',
    role: 'Recepção',
    col: 6, row: 6,
    config: {
      skin: '#f5c5a3',
      coat: '#0284c7',
      coatDark: '#0369a1',
      pants: '#0f172a',
      hair: '#713f12',
      shoe: '#1e293b',
      role: 'receptionist',
      isPlayer: false,
      visual: { gender: 'female', hairStyle: 'bob', build: 'medium', groundYOff: 0, age: 'young', accessory: 'none', nurseCap: false }
    }
  },
  {
    id: 'carlos',
    name: 'Enf. Carlos',
    role: 'Emergência',
    col: 19, row: 6,
    config: {
      skin: '#e0a97c',
      coat: '#dc2626',
      coatDark: '#b91c1c',
      pants: '#7f1d1d',
      hair: '#1e293b',
      shoe: '#0f172a',
      role: 'nurse',
      isPlayer: false,
      visual: { gender: 'male', hairStyle: 'low_fade', build: 'medium', groundYOff: 0, age: 'adult', accessory: 'none', nurseCap: false }
    }
  },
  {
    id: 'helena',
    name: 'Dra. Helena',
    role: 'Farmácia',
    col: 31, row: 6,
    config: {
      skin: '#fcd34d',
      coat: '#ffffff',
      coatDark: '#e2e8f0',
      pants: '#6366f1',
      hair: '#312e81',
      shoe: '#1e1b4b',
      role: 'doctor',
      isPlayer: false,
      visual: { gender: 'female', hairStyle: 'ponytail', build: 'slim', groundYOff: 0, age: 'adult', accessory: 'glasses', nurseCap: false }
    }
  },
  {
    id: 'joaquim',
    name: 'Sr. Joaquim',
    role: 'Laboratório',
    col: 44, row: 6,
    config: {
      skin: '#f5c5a3',
      coat: '#ffffff',
      coatDark: '#cbd5e1',
      pants: '#0891b2',
      hair: '#64748b',
      shoe: '#0f172a',
      role: 'doctor',
      isPlayer: false,
      visual: { gender: 'male', hairStyle: 'short_wavy', build: 'medium', groundYOff: 0, age: 'senior', accessory: 'glasses', nurseCap: false }
    }
  },
  {
    id: 'teresa',
    name: 'Dra. Teresa',
    role: 'Diretoria',
    col: 68, row: 6,
    config: {
      skin: '#fbcfe8',
      coat: '#d97706',
      coatDark: '#b45309',
      pants: '#451a03',
      hair: '#78350f',
      shoe: '#292524',
      role: 'doctor',
      isPlayer: false,
      visual: { gender: 'female', hairStyle: 'updo', build: 'medium', groundYOff: 0, age: 'senior', accessory: 'glasses', nurseCap: false }
    }
  },
  {
    id: 'amanda',
    name: 'Téc. Amanda',
    role: 'CME',
    col: 6, row: 21,
    config: {
      skin: '#f5c5a3',
      coat: '#64748b',
      coatDark: '#475569',
      pants: '#334155',
      hair: '#1e293b',
      shoe: '#0f172a',
      role: 'nurse',
      isPlayer: false,
      visual: { gender: 'female', hairStyle: 'bob', build: 'medium', groundYOff: 0, age: 'adult', accessory: 'surgical_cap', nurseCap: false }
    }
  },
  {
    id: 'maria',
    name: 'Dona Maria',
    role: 'Enfermaria',
    col: 30, row: 21,
    config: {
      skin: '#f5c5a3',
      coat: '#2563eb',
      coatDark: '#1d4ed8',
      pants: '#1e3a8a',
      hair: '#cbd5e1',
      shoe: '#0f172a',
      role: 'nurse',
      isPlayer: false,
      visual: { gender: 'female', hairStyle: 'bun', build: 'medium', groundYOff: 0, age: 'senior', accessory: 'none', nurseCap: true }
    }
  },
  {
    id: 'marcos',
    name: 'Dr. Marcos',
    role: 'UTI Adulto',
    col: 45, row: 21,
    config: {
      skin: '#e2e8f0',
      coat: '#0d9488',
      coatDark: '#0f766e',
      pants: '#115e59',
      hair: '#334155',
      shoe: '#0f172a',
      role: 'doctor',
      isPlayer: false,
      visual: { gender: 'male', hairStyle: 'short_neat', build: 'medium', groundYOff: 0, age: 'adult', accessory: 'none', nurseCap: false }
    }
  },
  {
    id: 'roberto',
    name: 'Enf. Roberto',
    role: 'Coordenação',
    col: 63, row: 21,
    config: {
      skin: '#fed7aa',
      coat: '#059669',
      coatDark: '#047857',
      pants: '#064e3b',
      hair: '#1c1917',
      shoe: '#0f172a',
      role: 'nurse',
      isPlayer: false,
      visual: { gender: 'male', hairStyle: 'low_fade', build: 'medium', groundYOff: 0, age: 'adult', accessory: 'none', nurseCap: false }
    }
  },
  {
    id: 'luciana',
    name: 'Dra. Luciana',
    role: 'Maternidade',
    col: 20, row: 36,
    config: {
      skin: '#f5c5a3',
      coat: '#db2777',
      coatDark: '#be185d',
      pants: '#831843',
      hair: '#713f12',
      shoe: '#0f172a',
      role: 'doctor',
      isPlayer: false,
      visual: { gender: 'female', hairStyle: 'ponytail', build: 'slim', groundYOff: 0, age: 'young', accessory: 'none', nurseCap: false }
    }
  }
];

export function LiveGameplayCanvas({ player }: { player: LiveGameplayPlayer }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Cached sprite sheets
  const playerSpritesRef = useRef<HTMLCanvasElement | null>(null);
  const staffSpritesRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

  // Map real coordinates (0..2432 x 0..1600) to internal canvas dimensions (1200 x 650)
  const CANVAS_W = 1200;
  const CANVAS_H = 650;
  const PAD_X = 24;
  const PAD_Y = 32;
  const MAP_W = 1152;
  const MAP_H = 586;

  const toX = (col: number) => PAD_X + (col / 76) * MAP_W;
  const toY = (row: number) => PAD_Y + (row / 50) * MAP_H;
  const toW = (cols: number) => (cols / 76) * MAP_W;
  const toH = (rows: number) => (rows / 50) * MAP_H;

  const realX = player.x ?? 400;
  const realY = player.y ?? 300;
  const normX = PAD_X + (Math.max(0, Math.min(2432, realX)) / 2432) * MAP_W;
  const normY = PAD_Y + (Math.max(0, Math.min(1600, realY)) / 1600) * MAP_H;

  const posRef = useRef({
    x: normX,
    y: normY,
    targetX: normX,
    targetY: normY,
    facing: player.facing || 'down',
    isMoving: Boolean(player.isMoving),
  });

  useEffect(() => {
    posRef.current.targetX = normX;
    posRef.current.targetY = normY;
    posRef.current.facing = player.facing || 'down';
    posRef.current.isMoving = Boolean(player.isMoving);
  }, [normX, normY, player.facing, player.isMoving]);

  // Pre-render pixel art character sprites once at mount
  useEffect(() => {
    const sprW = 44;
    const sprH = 68;

    // 1. Pre-render Player Sprite Sheet (4 directions x 6 walk steps = 24 frames)
    const playerCanvas = document.createElement('canvas');
    playerCanvas.width = sprW * 6;
    playerCanvas.height = sprH * 4;
    const pCtx = playerCanvas.getContext('2d');
    if (pCtx) {
      const pConfig: DrawCharacterConfig = {
        skin: '#f5c5a3',
        coat: '#0d9488', // Teal hospital scrubs
        coatDark: '#0f766e',
        pants: '#115e59',
        hair: '#1e293b',
        shoe: '#0f172a',
        role: 'nurse',
        isPlayer: true,
        visual: {
          gender: 'female',
          hairStyle: 'ponytail',
          build: 'medium',
          groundYOff: 0,
          age: 'young',
          accessory: 'none',
          nurseCap: true,
        }
      };

      for (let dir = 0; dir < 4; dir++) {
        for (let step = 0; step < 6; step++) {
          const offC = document.createElement('canvas');
          offC.width = sprW;
          offC.height = sprH;
          const oCtx = offC.getContext('2d');
          if (oCtx) {
            drawCharacter(oCtx, 0, dir, step, pConfig, sprW, sprH);
            pCtx.drawImage(offC, step * sprW, dir * sprH);
          }
        }
      }
      playerSpritesRef.current = playerCanvas;
    }

    // 2. Pre-render Staff NPC Sprites
    const staffMap = new Map<string, HTMLCanvasElement>();
    for (const staff of HUAP_STAFF_MEMBERS) {
      const sCanvas = document.createElement('canvas');
      sCanvas.width = sprW;
      sCanvas.height = sprH;
      const sCtx = sCanvas.getContext('2d');
      if (sCtx) {
        drawCharacter(sCtx, 0, 0, 0, staff.config, sprW, sprH);
        staffMap.set(staff.id, sCanvas);
      }
    }
    staffSpritesRef.current = staffMap;
  }, []);

  // Main rendering loop (60 FPS, reactive lerp, direct drawing)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameCount = 0;

    const render = () => {
      frameCount++;
      const w = CANVAS_W;
      const h = CANVAS_H;

      // Direct reactive lerp (factor 0.25 = instantaneous response, zero perceptible delay)
      const dx = posRef.current.targetX - posRef.current.x;
      const dy = posRef.current.targetY - posRef.current.y;
      const dist = Math.hypot(dx, dy);

      posRef.current.x += dx * 0.25;
      posRef.current.y += dy * 0.25;

      const px = posRef.current.x;
      const py = posRef.current.y;
      const facing = posRef.current.facing;
      const isCurrentlyMoving = posRef.current.isMoving || dist > 1.2;

      // ──────────────────────────────────────────────────────────────────────
      // 1. HOSPITAL BASE FLOORING (ARCHITECTURAL TILED FOUNDATION)
      // ──────────────────────────────────────────────────────────────────────
      ctx.fillStyle = "#0c1322";
      ctx.fillRect(0, 0, w, h);

      // Fine hospital floor tile pattern
      ctx.strokeStyle = "rgba(30, 41, 59, 0.45)";
      ctx.lineWidth = 1;
      const tileSize = 20;
      ctx.beginPath();
      for (let x = PAD_X; x <= PAD_X + MAP_W; x += tileSize) {
        ctx.moveTo(x, PAD_Y);
        ctx.lineTo(x, PAD_Y + MAP_H);
      }
      for (let y = PAD_Y; y <= PAD_Y + MAP_H; y += tileSize) {
        ctx.moveTo(PAD_X, y);
        ctx.lineTo(PAD_X + MAP_W, y);
      }
      ctx.stroke();

      // ──────────────────────────────────────────────────────────────────────
      // 2. MAIN CORRIDORS & EMERGENCY NAVIGATION LINES
      // ──────────────────────────────────────────────────────────────────────
      // North Corridor (between North & Middle Wings)
      const c1Y = toY(13);
      const c1H = toH(4);
      ctx.fillStyle = "#111c2e";
      ctx.fillRect(PAD_X, c1Y, MAP_W, c1H);
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      ctx.strokeRect(PAD_X, c1Y, MAP_W, c1H);

      // Middle Corridor (between Middle & South Wings)
      const c2Y = toY(27);
      const c2H = toH(4);
      ctx.fillStyle = "#111c2e";
      ctx.fillRect(PAD_X, c2Y, MAP_W, c2H);
      ctx.strokeRect(PAD_X, c2Y, MAP_W, c2H);

      // Colored Guide Tapes on corridor floors (Hospital Wayfinding)
      // Red line to Emergency
      ctx.strokeStyle = "rgba(244, 63, 94, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(PAD_X + 20, c1Y + c1H / 2 - 4);
      ctx.lineTo(toX(25), c1Y + c1H / 2 - 4);
      ctx.stroke();

      // Cyan line to Nursing & UTI
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(PAD_X + 20, c1Y + c1H / 2 + 4);
      ctx.lineTo(PAD_X + MAP_W - 20, c1Y + c1H / 2 + 4);
      ctx.stroke();

      // Green line to Central Garden
      ctx.strokeStyle = "rgba(74, 222, 128, 0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(PAD_X + 20, c2Y + c2H / 2);
      ctx.lineTo(PAD_X + MAP_W - 20, c2Y + c2H / 2);
      ctx.stroke();

      // ──────────────────────────────────────────────────────────────────────
      // 3. DETAILED HOSPITAL SECTORS WITH REALISTIC FURNITURE & PROPS
      // ──────────────────────────────────────────────────────────────────────
      HUAP_SECTORS.forEach((sec) => {
        const sx = toX(sec.col);
        const sy = toY(sec.row);
        const sw = toW(sec.w);
        const sh = toH(sec.h);

        // Room Floor with smooth clinical tone
        ctx.fillStyle = sec.floorColor;
        ctx.fillRect(sx, sy, sw, sh);

        // Architectural Solid Wall (Dual-line 3D border)
        ctx.strokeStyle = "rgba(71, 85, 105, 0.9)";
        ctx.lineWidth = 2.5;
        ctx.strokeRect(sx, sy, sw, sh);

        ctx.strokeStyle = sec.wallColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 1.5, sy + 1.5, sw - 3, sh - 3);

        // ── Room Identification Header ──
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.fillRect(sx + 2, sy + 2, sw - 4, 16);

        ctx.fillStyle = sec.accentColor;
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "left";
        ctx.fillText(sec.code, sx + 6, sy + 13);

        ctx.fillStyle = "#e2e8f0";
        ctx.font = "600 8.5px system-ui, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(sec.short, sx + sw - 6, sy + 13);

        // ── Realistic Clinical Furniture & Equipment Per Sector ──
        if (sec.type === 'reception') {
          // Curved Reception Desk
          ctx.fillStyle = "#334155";
          ctx.beginPath();
          ctx.roundRect(sx + 10, sy + 22, sw - 20, 14, 4);
          ctx.fill();
          // Computer monitors
          ctx.fillStyle = "#38bdf8";
          ctx.fillRect(sx + 18, sy + 24, 8, 5);
          ctx.fillRect(sx + 36, sy + 24, 8, 5);
          // Waiting Chairs
          ctx.fillStyle = "#475569";
          for (let i = 0; i < 4; i++) {
            ctx.fillRect(sx + 14 + i * 18, sy + sh - 20, 10, 8);
          }
        } else if (sec.type === 'emergency') {
          // 2 Hospital Emergency Stretchers
          for (let i = 0; i < 2; i++) {
            const bx = sx + 14 + i * 44;
            const by = sy + 26;
            // Frame & Mattress
            ctx.fillStyle = "#f1f5f9";
            ctx.fillRect(bx, by, 32, 16);
            ctx.strokeStyle = "#ef4444";
            ctx.lineWidth = 1;
            ctx.strokeRect(bx, by, 32, 16);
            // Pillow
            ctx.fillStyle = "#e2e8f0";
            ctx.fillRect(bx + 2, by + 2, 8, 12);
            // Defibrillator / Vital Monitor Cart
            ctx.fillStyle = "#1e293b";
            ctx.fillRect(bx + 26, by - 6, 8, 5);
            ctx.fillStyle = "#22c55e";
            ctx.fillRect(bx + 27, by - 5, 6, 3); // ECG green pulse
          }
        } else if (sec.type === 'ward') {
          // 3 Inpatient Hospital Beds with privacy curtains
          for (let i = 0; i < 3; i++) {
            const bx = sx + 10 + i * 42;
            const by = sy + 24;
            // Bed frame
            ctx.fillStyle = "#f8fafc";
            ctx.fillRect(bx, by, 30, 18);
            ctx.strokeStyle = "#60a5fa";
            ctx.lineWidth = 1;
            ctx.strokeRect(bx, by, 30, 18);
            // Blue blanket & pillow
            ctx.fillStyle = "#93c5fd";
            ctx.fillRect(bx + 8, by + 2, 20, 14);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(bx + 2, by + 3, 6, 12);
            // IV stand
            ctx.fillStyle = "#94a3b8";
            ctx.beginPath(); ctx.arc(bx + 32, by + 4, 2, 0, Math.PI * 2); ctx.fill();
          }
        } else if (sec.type === 'icu') {
          // 2 Intensive Care High-Tech Beds with overhead monitoring boom
          for (let i = 0; i < 2; i++) {
            const bx = sx + 16 + i * 50;
            const by = sy + 24;
            ctx.fillStyle = "#f8fafc";
            ctx.fillRect(bx, by, 34, 20);
            ctx.strokeStyle = "#2dd4bf";
            ctx.lineWidth = 1.2;
            ctx.strokeRect(bx, by, 34, 20);
            // Blanket & pillow
            ctx.fillStyle = "#5eead4";
            ctx.fillRect(bx + 10, by + 2, 22, 16);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(bx + 2, by + 4, 7, 12);
            // Overhead ICU Monitor screen
            ctx.fillStyle = "#0f172a";
            ctx.fillRect(bx + 26, by - 7, 10, 6);
            ctx.fillStyle = "#4ade80";
            ctx.fillRect(bx + 27, by - 6, 8, 4); // ECG pulse
          }
        } else if (sec.type === 'nursing') {
          // Semicircular Central Nursing Command Island
          ctx.fillStyle = "#1e293b";
          ctx.beginPath();
          ctx.roundRect(sx + 20, sy + 24, sw - 40, 24, 8);
          ctx.fill();
          ctx.strokeStyle = "#34d399";
          ctx.lineWidth = 1;
          ctx.stroke();
          // Workstations & Charts
          ctx.fillStyle = "#34d399";
          ctx.fillRect(sx + 30, sy + 28, 12, 6);
          ctx.fillRect(sx + 60, sy + 28, 12, 6);
          ctx.fillRect(sx + 90, sy + 28, 12, 6);
        } else if (sec.type === 'pharmacy') {
          // Medicine Racks & Shelving Grid
          ctx.fillStyle = "#312e81";
          ctx.fillRect(sx + 10, sy + 22, sw - 20, 10);
          ctx.fillStyle = "#4338ca";
          ctx.fillRect(sx + 10, sy + 38, sw - 20, 10);
          // Medicine bottles
          for (let i = 0; i < 6; i++) {
            ctx.fillStyle = i % 2 === 0 ? "#f43f5e" : "#38bdf8";
            ctx.fillRect(sx + 14 + i * 14, sy + 24, 5, 6);
          }
        } else if (sec.type === 'lab') {
          // Lab Analytical Benches & Centrifuge
          ctx.fillStyle = "#334155";
          ctx.fillRect(sx + 12, sy + 24, sw - 24, 12);
          // Microscope & Centrifuge
          ctx.fillStyle = "#22d3ee";
          ctx.beginPath(); ctx.arc(sx + 28, sy + 30, 4, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#e2e8f0";
          ctx.fillRect(sx + 52, sy + 26, 8, 8);
        } else if (sec.type === 'radiology') {
          // Circular CT / MRI Scanner Gantry
          ctx.fillStyle = "#334155";
          ctx.beginPath();
          ctx.arc(sx + sw / 2, sy + 36, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#0f172a";
          ctx.beginPath();
          ctx.arc(sx + sw / 2, sy + 36, 9, 0, Math.PI * 2);
          ctx.fill();
          // Patient sliding table
          ctx.fillStyle = "#c084fc";
          ctx.fillRect(sx + sw / 2 - 6, sy + 36, 12, 22);
        } else if (sec.type === 'garden') {
          // Landscaped Courtyard with Walking Path & Planters
          ctx.fillStyle = "#1e3a24";
          ctx.fillRect(sx + 10, sy + 18, sw - 20, sh - 26);
          // Cobblestone walking path
          ctx.fillStyle = "#475569";
          ctx.fillRect(sx + sw / 2 - 20, sy + 18, 40, sh - 26);
          // Foliage bushes
          ctx.fillStyle = "#22c55e";
          for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            ctx.arc(sx + 30 + i * 65, sy + sh / 2 + (i % 2 === 0 ? -4 : 4), 6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });

      // ──────────────────────────────────────────────────────────────────────
      // 4. HOSPITAL STAFF NPCS (RENDERED WITH REALISTIC HUMAN SPRITES)
      // ──────────────────────────────────────────────────────────────────────
      const sprW = 44;
      const sprH = 68;
      // Target display size on canvas: 24px wide by 37px high
      const dispW = 24;
      const dispH = 37;

      HUAP_STAFF_MEMBERS.forEach((staff) => {
        const nx = toX(staff.col);
        const ny = toY(staff.row);
        const sCanvas = staffSpritesRef.current.get(staff.id);

        // Soft drop shadow under feet
        ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
        ctx.beginPath();
        ctx.ellipse(nx, ny + dispH / 2 - 2, 8, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        if (sCanvas) {
          // Draw real pixel-art character sprite!
          ctx.drawImage(
            sCanvas,
            0, 0, sprW, sprH,
            nx - dispW / 2, ny - dispH / 2, dispW, dispH
          );
        }

        // Sleek Non-Intrusive Staff Name Tag
        const tagText = `${staff.name} • ${staff.role}`;
        ctx.font = "bold 8px system-ui, sans-serif";
        const textMetrics = ctx.measureText(tagText);
        const pillW = textMetrics.width + 12;

        ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
        ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.roundRect(nx - pillW / 2, ny - dispH / 2 - 14, pillW, 12, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#e2e8f0";
        ctx.textAlign = "center";
        ctx.fillText(tagText, nx, ny - dispH / 2 - 5);
      });

      // ──────────────────────────────────────────────────────────────────────
      // 5. STUDENT PLAYER LEADER AVATAR (SMOOTH WALK, SCRUBS, CROWN BADGE)
      // ──────────────────────────────────────────────────────────────────────
      // Direction mapping: down = 0, up = 1, left = 2, right = 3
      let dirIdx = 0;
      if (facing === 'up') dirIdx = 1;
      else if (facing === 'left') dirIdx = 2;
      else if (facing === 'right') dirIdx = 3;

      // Walk cycle animation step (0..5)
      const walkStep = isCurrentlyMoving ? (Math.floor(frameCount / 7) % 6) : 0;

      // Soft radar pulse beacon on the floor under player's feet
      const pulseR = 10 + (frameCount % 35) * 0.45;
      const pulseAlpha = Math.max(0, 1 - (frameCount % 35) / 35);
      ctx.strokeStyle = `rgba(16, 185, 129, ${pulseAlpha * 0.85})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py + dispH / 2 - 2, pulseR, 0, Math.PI * 2);
      ctx.stroke();

      // Subtle step dust particles when moving
      if (isCurrentlyMoving && frameCount % 4 === 0) {
        ctx.fillStyle = "rgba(56, 189, 248, 0.45)";
        ctx.beginPath();
        ctx.arc(px - 3 + Math.random() * 6, py + dispH / 2 - 1, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Drop shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.beginPath();
      ctx.ellipse(px, py + dispH / 2 - 2, 9, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw real player pixel-art character sprite!
      const pSprites = playerSpritesRef.current;
      if (pSprites) {
        ctx.drawImage(
          pSprites,
          walkStep * sprW, dirIdx * sprH, sprW, sprH,
          px - dispW / 2, py - dispH / 2, dispW, dispH
        );
      }

      // Elegant Floating Student Leader Name Tag with Gold Crown
      const displayNickObj = getDisplayNickname(player.playerName);
      const studentLabel = `👑 ${displayNickObj.nick.toUpperCase()} (LÍDER)`;

      ctx.font = "bold 9px system-ui, sans-serif";
      const sTagMetrics = ctx.measureText(studentLabel);
      const sTagW = sTagMetrics.width + 16;
      const sTagY = py - dispH / 2 - 18;

      // Glow behind tag
      ctx.fillStyle = "rgba(245, 158, 11, 0.15)";
      ctx.beginPath();
      ctx.roundRect(px - sTagW / 2 - 2, sTagY - 2, sTagW + 4, 18, 5);
      ctx.fill();

      // Glass pill
      ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(px - sTagW / 2, sTagY, sTagW, 14, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fbbf24";
      ctx.textAlign = "center";
      ctx.fillText(studentLabel, px, sTagY + 10.5);

      // ──────────────────────────────────────────────────────────────────────
      // 6. MINIMALIST COMMAND OVERLAY (TOP STATUS STRIP)
      // ──────────────────────────────────────────────────────────────────────
      // Top-Left: Operational Title
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(PAD_X + 6, PAD_Y + 6, 260, 20, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 9.5px monospace";
      ctx.textAlign = "left";
      ctx.fillText("🏥 HUAP • PLANTA BAIXA HOSPITALAR 1:1", PAD_X + 14, PAD_Y + 19);

      // Top-Right: Direct Live Indicator
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(w - PAD_X - 220, PAD_Y + 6, 214, 20, 4);
      ctx.fill();
      ctx.stroke();

      const isLiveOn = (frameCount % 40) < 26;
      ctx.fillStyle = isLiveOn ? "#ef4444" : "#7f1d1d";
      ctx.beginPath();
      ctx.arc(w - PAD_X - 208, PAD_Y + 16, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "left";
      ctx.fillText("TRANSMISSÃO AO VIVO • 60 FPS", w - PAD_X - 198, PAD_Y + 19);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="w-full h-auto block aspect-[1200/650] object-contain select-none"
      />
    </div>
  );
}
