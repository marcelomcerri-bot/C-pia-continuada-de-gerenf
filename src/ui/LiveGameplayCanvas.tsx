import React, { useRef, useEffect, useState } from 'react';
import { drawCharacter, DrawCharacterConfig } from '../game/utils/renderPlayerSprite';
import { Maximize2, Minimize2, Video, Compass } from 'lucide-react';

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
  { id: 'reception', name: 'Recepção Central & Acolhimento', short: 'RECEPÇÃO', code: '01•REC', col: 2, row: 2, w: 10, h: 11, floorColor: '#162032', wallColor: '#38bdf8', accentColor: '#38bdf8', type: 'reception' },
  { id: 'emergency', name: 'Pronto-Socorro / Triagem Manchester', short: 'PRONTO-SOCORRO', code: '02•PS', col: 13, row: 2, w: 12, h: 11, floorColor: '#27151e', wallColor: '#f43f5e', accentColor: '#f43f5e', type: 'emergency' },
  { id: 'pharmacy', name: 'Farmácia Hospitalar & CAF', short: 'FARMÁCIA', code: '03•FARM', col: 26, row: 2, w: 11, h: 11, floorColor: '#1a1d38', wallColor: '#818cf8', accentColor: '#818cf8', type: 'pharmacy' },
  { id: 'lab', name: 'Laboratório de Análises Clínicas', short: 'LABORATÓRIO', code: '04•LAB', col: 38, row: 2, w: 12, h: 11, floorColor: '#122332', wallColor: '#22d3ee', accentColor: '#22d3ee', type: 'lab' },
  { id: 'radiology', name: 'Diagnóstico por Imagem (RX/TC)', short: 'RADIOLOGIA', code: '05•RX', col: 51, row: 2, w: 11, h: 11, floorColor: '#211634', wallColor: '#c084fc', accentColor: '#c084fc', type: 'radiology' },
  { id: 'admin', name: 'Diretoria & Gestão Hospitalar', short: 'DIRETORIA', code: '06•DIR', col: 63, row: 2, w: 11, h: 11, floorColor: '#281f12', wallColor: '#fbbf24', accentColor: '#fbbf24', type: 'admin' },

  // Middle Wing (rows 17..26)
  { id: 'cme', name: 'Central de Material Esterilizado', short: 'CME', code: '07•CME', col: 2, row: 17, w: 9, h: 10, floorColor: '#1a2230', wallColor: '#94a3b8', accentColor: '#94a3b8', type: 'cme' },
  { id: 'break', name: 'Copa & Nutrição Dietética', short: 'COPA / NUTRIÇÃO', code: '08•COPA', col: 12, row: 17, w: 11, h: 10, floorColor: '#282012', wallColor: '#facc15', accentColor: '#facc15', type: 'break' },
  { id: 'ward', name: 'Enfermaria de Internação', short: 'ENFERMARIA', code: '09•ENF', col: 24, row: 17, w: 14, h: 10, floorColor: '#15213c', wallColor: '#60a5fa', accentColor: '#60a5fa', type: 'ward' },
  { id: 'icu', name: 'UTI Adulto Intensiva', short: 'UTI ADULTO', code: '10•UTI', col: 39, row: 17, w: 14, h: 10, floorColor: '#102828', wallColor: '#2dd4bf', accentColor: '#2dd4bf', type: 'icu' },
  { id: 'nursing', name: 'Posto de Enfermagem Central', short: 'POSTO ENFERMAGEM', code: '11•POSTO', col: 54, row: 17, w: 20, h: 10, floorColor: '#0f2a20', wallColor: '#34d399', accentColor: '#34d399', type: 'nursing' },

  // South Wing (rows 31..41)
  { id: 'outpatient', name: 'Ambulatório de Especialidades', short: 'AMBULATÓRIO', code: '12•AMB', col: 2, row: 31, w: 12, h: 11, floorColor: '#152336', wallColor: '#38bdf8', accentColor: '#38bdf8', type: 'outpatient' },
  { id: 'maternity', name: 'Maternidade & Berçário', short: 'MATERNIDADE', code: '13•MAT', col: 15, row: 31, w: 12, h: 11, floorColor: '#2b1625', wallColor: '#f472b6', accentColor: '#f472b6', type: 'maternity' },
  { id: 'oncology', name: 'Oncologia & Terapia Infusional', short: 'ONCOLOGIA', code: '14•ONCO', col: 28, row: 31, w: 14, h: 11, floorColor: '#102a29', wallColor: '#14b8a6', accentColor: '#14b8a6', type: 'oncology' },
  { id: 'rehab', name: 'Fisioterapia & Reabilitação', short: 'REABILITAÇÃO', code: '15•REAB', col: 43, row: 31, w: 13, h: 11, floorColor: '#281f10', wallColor: '#f59e0b', accentColor: '#f59e0b', type: 'rehab' },
  { id: 'psych', name: 'Saúde Mental & Psicoterapia', short: 'SAÚDE MENTAL', code: '16•PSI', col: 57, row: 31, w: 17, h: 11, floorColor: '#241438', wallColor: '#c084fc', accentColor: '#c084fc', type: 'psych' },

  // Courtyard (rows 43..47)
  { id: 'garden', name: 'Jardim Terapêutico & Convivência', short: 'JARDIM CENTRAL', code: '17•JARDIM', col: 2, row: 43, w: 72, h: 5, floorColor: '#0e2917', wallColor: '#4ade80', accentColor: '#4ade80', type: 'garden' },
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [cameraMode, setCameraMode] = useState<'overview' | 'follow'>('overview');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Cached sprite sheets
  const playerSpritesRef = useRef<HTMLCanvasElement | null>(null);
  const staffSpritesRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

  // High-Definition Canvas dimensions
  const CANVAS_W = 1280;
  const CANVAS_H = 720;
  const PAD_X = 28;
  const PAD_Y = 40;
  const MAP_W = 1224;
  const MAP_H = 632;

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
    camX: normX,
    camY: normY,
    camZoom: 1.0,
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
        coat: '#0d9488', // Teal medical scrubs
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

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

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

      // Direct reactive lerp (factor 0.25 = instantaneous response, zero delay)
      const dx = posRef.current.targetX - posRef.current.x;
      const dy = posRef.current.targetY - posRef.current.y;
      const dist = Math.hypot(dx, dy);

      posRef.current.x += dx * 0.25;
      posRef.current.y += dy * 0.25;

      const px = posRef.current.x;
      const py = posRef.current.y;
      const facing = posRef.current.facing;
      const isCurrentlyMoving = posRef.current.isMoving || dist > 1.2;

      // Smooth camera interpolation for Follow Mode vs Overview Mode
      const targetZoom = cameraMode === 'follow' ? 2.1 : 1.0;
      const targetCamX = cameraMode === 'follow' ? px : w / 2;
      const targetCamY = cameraMode === 'follow' ? py : h / 2;

      posRef.current.camZoom += (targetZoom - posRef.current.camZoom) * 0.08;
      posRef.current.camX += (targetCamX - posRef.current.camX) * 0.12;
      posRef.current.camY += (targetCamY - posRef.current.camY) * 0.12;

      const camZoom = posRef.current.camZoom;
      const camX = posRef.current.camX;
      const camY = posRef.current.camY;

      ctx.clearRect(0, 0, w, h);

      // ──────────────────────────────────────────────────────────────────────
      // WORLD SPACE TRANSFORM (CAMERA APPLIED)
      // ──────────────────────────────────────────────────────────────────────
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(camZoom, camZoom);
      ctx.translate(-camX, -camY);

      // Hospital Foundation
      ctx.fillStyle = "#070c16";
      ctx.fillRect(0, 0, w, h);

      // Precision CAD blueprint micro-grid
      ctx.strokeStyle = "rgba(30, 41, 59, 0.4)";
      ctx.lineWidth = 0.8;
      const tileSize = 24;
      ctx.beginPath();
      for (let x = PAD_X; x <= PAD_X + MAP_W; x += tileSize) {
        ctx.moveTo(x, PAD_Y); ctx.lineTo(x, PAD_Y + MAP_H);
      }
      for (let y = PAD_Y; y <= PAD_Y + MAP_H; y += tileSize) {
        ctx.moveTo(PAD_X, y); ctx.lineTo(PAD_X + MAP_W, y);
      }
      ctx.stroke();

      // Main Corridors with clean terrazzo vinyl
      const c1Y = toY(13);
      const c1H = toH(4);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(PAD_X, c1Y, MAP_W, c1H);
      ctx.strokeStyle = "rgba(71, 85, 105, 0.6)";
      ctx.lineWidth = 1;
      ctx.strokeRect(PAD_X, c1Y, MAP_W, c1H);

      const c2Y = toY(27);
      const c2H = toH(4);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(PAD_X, c2Y, MAP_W, c2H);
      ctx.strokeRect(PAD_X, c2Y, MAP_W, c2H);

      // Hospital Floor Wayfinding Guidance Stripes
      // Red line to Emergency
      ctx.strokeStyle = "rgba(244, 63, 94, 0.5)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(PAD_X + 24, c1Y + c1H / 2 - 5);
      ctx.lineTo(toX(26), c1Y + c1H / 2 - 5);
      ctx.stroke();

      // Cyan line to UTI / Central Nursing
      ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(PAD_X + 24, c1Y + c1H / 2 + 5);
      ctx.lineTo(PAD_X + MAP_W - 24, c1Y + c1H / 2 + 5);
      ctx.stroke();

      // Green line to Central Courtyard Garden
      ctx.strokeStyle = "rgba(74, 222, 128, 0.4)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(PAD_X + 24, c2Y + c2H / 2);
      ctx.lineTo(PAD_X + MAP_W - 24, c2Y + c2H / 2);
      ctx.stroke();

      // Hospital Sectors & Detailed Equipment
      HUAP_SECTORS.forEach((sec) => {
        const sx = toX(sec.col);
        const sy = toY(sec.row);
        const sw = toW(sec.w);
        const sh = toH(sec.h);

        // Room Floor
        ctx.fillStyle = sec.floorColor;
        ctx.fillRect(sx, sy, sw, sh);

        // Solid 3D Architectural Wall Frame
        ctx.strokeStyle = "rgba(51, 65, 85, 0.95)";
        ctx.lineWidth = 3;
        ctx.strokeRect(sx, sy, sw, sh);

        ctx.strokeStyle = sec.wallColor;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(sx + 2, sy + 2, sw - 4, sh - 4);

        // Architectural Header Bar
        ctx.fillStyle = "rgba(10, 16, 28, 0.88)";
        ctx.fillRect(sx + 3, sy + 3, sw - 6, 17);

        ctx.fillStyle = sec.accentColor;
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "left";
        ctx.fillText(sec.code, sx + 7, sy + 15);

        ctx.fillStyle = "#f1f5f9";
        ctx.font = "bold 8.5px system-ui, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(sec.short, sx + sw - 7, sy + 15);

        // Clinical Room Fixtures
        if (sec.type === 'reception') {
          // Curved Reception Desk
          ctx.fillStyle = "#334155";
          ctx.beginPath();
          ctx.roundRect(sx + 10, sy + 24, sw - 20, 16, 4);
          ctx.fill();
          // Computer monitors
          ctx.fillStyle = "#38bdf8";
          ctx.fillRect(sx + 18, sy + 26, 9, 6);
          ctx.fillRect(sx + 40, sy + 26, 9, 6);
          // Waiting Chairs
          ctx.fillStyle = "#475569";
          for (let i = 0; i < 4; i++) {
            ctx.fillRect(sx + 14 + i * 20, sy + sh - 22, 12, 9);
          }
        } else if (sec.type === 'emergency') {
          // 2 Hospital Emergency Stretchers
          for (let i = 0; i < 2; i++) {
            const bx = sx + 14 + i * 48;
            const by = sy + 28;
            ctx.fillStyle = "#f8fafc";
            ctx.fillRect(bx, by, 34, 18);
            ctx.strokeStyle = "#ef4444";
            ctx.lineWidth = 1.2;
            ctx.strokeRect(bx, by, 34, 18);
            // Pillow
            ctx.fillStyle = "#e2e8f0";
            ctx.fillRect(bx + 2, by + 2, 8, 14);
            // Defibrillator / Vital Monitor Cart with pulsing green ECG
            ctx.fillStyle = "#0f172a";
            ctx.fillRect(bx + 26, by - 8, 10, 6);
            ctx.fillStyle = "#22c55e";
            ctx.fillRect(bx + 27, by - 7, 8, 4);
          }
        } else if (sec.type === 'ward') {
          // 3 Hospital Beds with blue blankets
          for (let i = 0; i < 3; i++) {
            const bx = sx + 10 + i * 44;
            const by = sy + 26;
            ctx.fillStyle = "#f8fafc";
            ctx.fillRect(bx, by, 32, 20);
            ctx.strokeStyle = "#60a5fa";
            ctx.lineWidth = 1;
            ctx.strokeRect(bx, by, 32, 20);
            // Blue blanket
            ctx.fillStyle = "#93c5fd";
            ctx.fillRect(bx + 8, by + 2, 22, 16);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(bx + 2, by + 4, 6, 12);
            // IV stand
            ctx.fillStyle = "#94a3b8";
            ctx.beginPath(); ctx.arc(bx + 34, by + 4, 2.5, 0, Math.PI * 2); ctx.fill();
          }
        } else if (sec.type === 'icu') {
          // 2 High-Acuity ICU Beds
          for (let i = 0; i < 2; i++) {
            const bx = sx + 16 + i * 54;
            const by = sy + 26;
            ctx.fillStyle = "#f8fafc";
            ctx.fillRect(bx, by, 36, 22);
            ctx.strokeStyle = "#2dd4bf";
            ctx.lineWidth = 1.2;
            ctx.strokeRect(bx, by, 36, 22);
            // Teal blanket
            ctx.fillStyle = "#5eead4";
            ctx.fillRect(bx + 10, by + 2, 24, 18);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(bx + 2, by + 5, 8, 12);
            // Overhead ICU Cardiac Monitor
            ctx.fillStyle = "#020617";
            ctx.fillRect(bx + 26, by - 8, 11, 7);
            ctx.fillStyle = "#4ade80";
            ctx.fillRect(bx + 27, by - 7, 9, 5);
          }
        } else if (sec.type === 'nursing') {
          // Semicircular Central Nursing Command Island
          ctx.fillStyle = "#1e293b";
          ctx.beginPath();
          ctx.roundRect(sx + 22, sy + 26, sw - 44, 26, 8);
          ctx.fill();
          ctx.strokeStyle = "#34d399";
          ctx.lineWidth = 1.2;
          ctx.stroke();
          // Workstation terminals
          ctx.fillStyle = "#34d399";
          ctx.fillRect(sx + 34, sy + 30, 14, 7);
          ctx.fillRect(sx + 68, sy + 30, 14, 7);
          ctx.fillRect(sx + 102, sy + 30, 14, 7);
        } else if (sec.type === 'pharmacy') {
          // Medicine Racks & Shelving Grid
          ctx.fillStyle = "#312e81";
          ctx.fillRect(sx + 10, sy + 24, sw - 20, 11);
          ctx.fillStyle = "#4338ca";
          ctx.fillRect(sx + 10, sy + 42, sw - 20, 11);
          for (let i = 0; i < 7; i++) {
            ctx.fillStyle = i % 2 === 0 ? "#f43f5e" : "#38bdf8";
            ctx.fillRect(sx + 14 + i * 14, sy + 26, 5, 7);
          }
        } else if (sec.type === 'lab') {
          // Analytical Workbenches & Centrifuge
          ctx.fillStyle = "#334155";
          ctx.fillRect(sx + 12, sy + 26, sw - 24, 14);
          ctx.fillStyle = "#22d3ee";
          ctx.beginPath(); ctx.arc(sx + 30, sy + 33, 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#f8fafc";
          ctx.fillRect(sx + 56, sy + 28, 9, 9);
        } else if (sec.type === 'radiology') {
          // Circular CT Scanner Gantry
          ctx.fillStyle = "#334155";
          ctx.beginPath();
          ctx.arc(sx + sw / 2, sy + 40, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#090d16";
          ctx.beginPath();
          ctx.arc(sx + sw / 2, sy + 40, 10, 0, Math.PI * 2);
          ctx.fill();
          // Patient table
          ctx.fillStyle = "#c084fc";
          ctx.fillRect(sx + sw / 2 - 7, sy + 40, 14, 24);
        } else if (sec.type === 'garden') {
          // Central Garden with Walkways & Planters
          ctx.fillStyle = "#1e3a24";
          ctx.fillRect(sx + 10, sy + 20, sw - 20, sh - 28);
          // Cobblestone walking path
          ctx.fillStyle = "#475569";
          ctx.fillRect(sx + sw / 2 - 24, sy + 20, 48, sh - 28);
          // Foliage bushes
          ctx.fillStyle = "#22c55e";
          for (let i = 0; i < 9; i++) {
            ctx.beginPath();
            ctx.arc(sx + 32 + i * 70, sy + sh / 2 + (i % 2 === 0 ? -4 : 4), 7, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });

      // Hospital Staff NPCs
      const sprW = 44;
      const sprH = 68;
      const dispW = 26;
      const dispH = 40;

      HUAP_STAFF_MEMBERS.forEach((staff) => {
        const nx = toX(staff.col);
        const ny = toY(staff.row);
        const sCanvas = staffSpritesRef.current.get(staff.id);

        // Soft drop shadow under feet
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.beginPath();
        ctx.ellipse(nx, ny + dispH / 2 - 2, 9, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        if (sCanvas) {
          ctx.drawImage(
            sCanvas,
            0, 0, sprW, sprH,
            nx - dispW / 2, ny - dispH / 2, dispW, dispH
          );
        }

        // Staff Name Tag
        const tagText = `${staff.name} • ${staff.role}`;
        ctx.font = "bold 8.5px system-ui, sans-serif";
        const textMetrics = ctx.measureText(tagText);
        const pillW = textMetrics.width + 14;

        ctx.fillStyle = "rgba(10, 15, 26, 0.92)";
        ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.roundRect(nx - pillW / 2, ny - dispH / 2 - 15, pillW, 13, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#e2e8f0";
        ctx.textAlign = "center";
        ctx.fillText(tagText, nx, ny - dispH / 2 - 5.5);
      });

      // Student Leader Avatar
      let dirIdx = 0;
      if (facing === 'up') dirIdx = 1;
      else if (facing === 'left') dirIdx = 2;
      else if (facing === 'right') dirIdx = 3;

      const walkStep = isCurrentlyMoving ? (Math.floor(frameCount / 7) % 6) : 0;

      // Radar Pulse Beacon on floor under player's feet
      const pulseR = 12 + (frameCount % 36) * 0.5;
      const pulseAlpha = Math.max(0, 1 - (frameCount % 36) / 36);
      ctx.strokeStyle = `rgba(16, 185, 129, ${pulseAlpha * 0.9})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py + dispH / 2 - 2, pulseR, 0, Math.PI * 2);
      ctx.stroke();

      // Soft directional sensor cone
      ctx.save();
      ctx.translate(px, py);
      let angle = Math.PI / 2;
      if (facing === 'up') angle = -Math.PI / 2;
      else if (facing === 'left') angle = Math.PI;
      else if (facing === 'right') angle = 0;

      const coneGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 52);
      coneGrad.addColorStop(0, "rgba(56, 189, 248, 0.3)");
      coneGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 52, angle - 0.4, angle + 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Footstep dust particles
      if (isCurrentlyMoving && frameCount % 4 === 0) {
        ctx.fillStyle = "rgba(56, 189, 248, 0.5)";
        ctx.beginPath();
        ctx.arc(px - 3 + Math.random() * 6, py + dispH / 2 - 1, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Player drop shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.beginPath();
      ctx.ellipse(px, py + dispH / 2 - 2, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw Player Sprite
      const pSprites = playerSpritesRef.current;
      if (pSprites) {
        ctx.drawImage(
          pSprites,
          walkStep * sprW, dirIdx * sprH, sprW, sprH,
          px - dispW / 2, py - dispH / 2, dispW, dispH
        );
      }

      // Floating Student Leader Name Tag with Gold Crown
      const displayNickObj = getDisplayNickname(player.playerName);
      const studentLabel = `👑 ${displayNickObj.nick.toUpperCase()} (LÍDER)`;

      ctx.font = "bold 9.5px system-ui, sans-serif";
      const sTagMetrics = ctx.measureText(studentLabel);
      const sTagW = sTagMetrics.width + 18;
      const sTagY = py - dispH / 2 - 20;

      // Glow behind tag
      ctx.fillStyle = "rgba(245, 158, 11, 0.2)";
      ctx.beginPath();
      ctx.roundRect(px - sTagW / 2 - 2, sTagY - 2, sTagW + 4, 19, 5);
      ctx.fill();

      ctx.fillStyle = "rgba(10, 15, 26, 0.96)";
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.roundRect(px - sTagW / 2, sTagY, sTagW, 15, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fbbf24";
      ctx.textAlign = "center";
      ctx.fillText(studentLabel, px, sTagY + 11);

      ctx.restore(); // END WORLD SPACE TRANSFORM

      // ──────────────────────────────────────────────────────────────────────
      // 2. HUD OVERLAY IN SCREEN SPACE (FIXED BROADCAST POSITION)
      // ──────────────────────────────────────────────────────────────────────
      // Top-Left: Operational Hospital Title
      ctx.fillStyle = "rgba(10, 15, 26, 0.9)";
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(PAD_X + 4, 12, 310, 22, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "left";
      ctx.fillText("🏥 HUAP • CENTRO DE TELEMETRIA EM TEMPO REAL", PAD_X + 12, 27);

      // Top-Right: Direct Live Indicator
      ctx.fillStyle = "rgba(10, 15, 26, 0.9)";
      ctx.strokeStyle = "rgba(239, 68, 68, 0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(w - PAD_X - 224, 12, 220, 22, 4);
      ctx.fill();
      ctx.stroke();

      const isLiveOn = (frameCount % 40) < 26;
      ctx.fillStyle = isLiveOn ? "#ef4444" : "#7f1d1d";
      ctx.beginPath();
      ctx.arc(w - PAD_X - 212, 23, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 9.5px monospace";
      ctx.textAlign = "left";
      ctx.fillText("TRANSMISSÃO DIRETA • 60 FPS", w - PAD_X - 202, 27);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [cameraMode]);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl group"
    >
      {/* Interactive Controls Overlay Toolbar */}
      <div className="absolute top-3.5 right-4 z-20 flex items-center gap-2">
        <div className="flex items-center bg-slate-900/90 backdrop-blur-md rounded-lg p-1 border border-slate-700/60 shadow-lg">
          <button
            type="button"
            onClick={() => setCameraMode('overview')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
              cameraMode === 'overview'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Planta Geral (1:1)</span>
          </button>
          <button
            type="button"
            onClick={() => setCameraMode('follow')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
              cameraMode === 'follow'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Seguir Líder (Zoom 2x)</span>
          </button>
        </div>

        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-1.5 rounded-lg bg-slate-900/90 backdrop-blur-md text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60 transition shadow-lg"
          title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="w-full h-auto block aspect-[1280/720] object-contain select-none bg-slate-950"
      />
    </div>
  );
}
