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
  // North Wing (Recepção, PS, Farmácia, Lab, Radiologia, Diretoria)
  {
    id: 'ana',
    name: 'Ana Beatriz',
    role: 'Recepção Central',
    col: 6, row: 5,
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
    id: 'roberto_vis',
    name: 'Roberto',
    role: 'Visitante (Recepção)',
    col: 6, row: 10,
    config: {
      skin: '#8d5524',
      coat: '#2563eb',
      coatDark: '#1d4ed8',
      pants: '#1e293b',
      hair: '#111111',
      shoe: '#0f172a',
      role: 'other',
      isPlayer: false,
      visual: { gender: 'male', hairStyle: 'short_neat', build: 'medium', groundYOff: 0, age: 'adult', accessory: 'none', nurseCap: false }
    }
  },
  {
    id: 'carlos',
    name: 'Enf. Carlos',
    role: 'Emergência (PS)',
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
    id: 'claudio_ps',
    name: 'Cláudio',
    role: 'Paciente (Triagem)',
    col: 8, row: 8,
    config: {
      skin: '#ffdfc4',
      coat: '#64748b',
      coatDark: '#475569',
      pants: '#334155',
      hair: '#737373',
      shoe: '#0f172a',
      role: 'other',
      isPlayer: false,
      visual: { gender: 'male', hairStyle: 'short_neat', build: 'medium', groundYOff: 0, age: 'adult', accessory: 'none', nurseCap: false }
    }
  },
  {
    id: 'helena_farm',
    name: 'Dra. Helena',
    role: 'Farmácia Hospitalar',
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
    role: 'Laboratório Clínico',
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
    id: 'farias_rx',
    name: 'Dr. Farias',
    role: 'Radiologia & Imagem',
    col: 56, row: 6,
    config: {
      skin: '#d4a574',
      coat: '#ffffff',
      coatDark: '#e2e8f0',
      pants: '#7c3aed',
      hair: '#1e293b',
      shoe: '#0f172a',
      role: 'doctor',
      isPlayer: false,
      visual: { gender: 'male', hairStyle: 'short_neat', build: 'medium', groundYOff: 0, age: 'adult', accessory: 'glasses', nurseCap: false }
    }
  },
  {
    id: 'teresa',
    name: 'Dra. Teresa Alves',
    role: 'Diretoria Geral',
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

  // Middle Wing (CME, Copa, Enfermaria, UTI, Posto de Enfermagem)
  {
    id: 'amanda_cme',
    name: 'Téc. Rosa',
    role: 'CME Esterilização',
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
    id: 'clara_nutri',
    name: 'Nutri. Clara',
    role: 'Copa & Nutrição',
    col: 17, row: 21,
    config: {
      skin: '#ffdfc4',
      coat: '#ca8a04',
      coatDark: '#a16207',
      pants: '#713f12',
      hair: '#d97706',
      shoe: '#451a03',
      role: 'other',
      isPlayer: false,
      visual: { gender: 'female', hairStyle: 'ponytail', build: 'medium', groundYOff: 0, age: 'adult', accessory: 'none', nurseCap: false }
    }
  },
  {
    id: 'dr_roberto',
    name: 'Dr. Roberto',
    role: 'Plantonista Enfermaria',
    col: 27, row: 22,
    config: {
      skin: '#fce2c4',
      coat: '#ffffff',
      coatDark: '#e2e8f0',
      pants: '#1e3a8a',
      hair: '#d97706',
      shoe: '#0f172a',
      role: 'doctor',
      isPlayer: false,
      visual: { gender: 'male', hairStyle: 'short_neat', build: 'medium', groundYOff: 0, age: 'adult', accessory: 'none', nurseCap: false }
    }
  },
  {
    id: 'maria_pac',
    name: 'Dona Maria',
    role: 'Paciente (Enfermaria)',
    col: 34, row: 22,
    config: {
      skin: '#d4a574',
      coat: '#94a3b8',
      coatDark: '#64748b',
      pants: '#334155',
      hair: '#6e2c00',
      shoe: '#0f172a',
      role: 'other',
      isPlayer: false,
      visual: { gender: 'female', hairStyle: 'bun', build: 'medium', groundYOff: 0, age: 'senior', accessory: 'none', nurseCap: false }
    }
  },
  {
    id: 'oliveira_uti',
    name: 'Dr. Oliveira',
    role: 'Médico Chefe UTI',
    col: 45, row: 21,
    config: {
      skin: '#8d5524',
      coat: '#0d9488',
      coatDark: '#0f766e',
      pants: '#115e59',
      hair: '#0f172a',
      shoe: '#0f172a',
      role: 'doctor',
      isPlayer: false,
      visual: { gender: 'male', hairStyle: 'short_neat', build: 'medium', groundYOff: 0, age: 'adult', accessory: 'none', nurseCap: false }
    }
  },
  {
    id: 'maria_enf',
    name: 'Enf. Maria',
    role: 'Supervisão de Enfermagem',
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
      visual: { gender: 'female', hairStyle: 'ponytail', build: 'medium', groundYOff: 0, age: 'adult', accessory: 'none', nurseCap: true }
    }
  },

  // South Wing (Ambulatório, Maternidade, Oncologia, Fisioterapia, Saúde Mental)
  {
    id: 'luciana_amb',
    name: 'Dra. Luciana',
    role: 'Ambulatório',
    col: 7, row: 36,
    config: {
      skin: '#f5c5a3',
      coat: '#ffffff',
      coatDark: '#e2e8f0',
      pants: '#0284c7',
      hair: '#713f12',
      shoe: '#0f172a',
      role: 'doctor',
      isPlayer: false,
      visual: { gender: 'female', hairStyle: 'bob', build: 'slim', groundYOff: 0, age: 'adult', accessory: 'glasses', nurseCap: false }
    }
  },
  {
    id: 'pedro_mat',
    name: 'Enf. Pedro',
    role: 'Maternidade & BLH',
    col: 19, row: 36,
    config: {
      skin: '#d4a574',
      coat: '#db2777',
      coatDark: '#be185d',
      pants: '#831843',
      hair: '#5c4033',
      shoe: '#0f172a',
      role: 'nurse',
      isPlayer: false,
      visual: { gender: 'male', hairStyle: 'short_neat', build: 'medium', groundYOff: 0, age: 'adult', accessory: 'none', nurseCap: false }
    }
  },
  {
    id: 'amanda_gest',
    name: 'Amanda',
    role: 'Gestante (Maternidade)',
    col: 24, row: 38,
    config: {
      skin: '#c68642',
      coat: '#f472b6',
      coatDark: '#db2777',
      pants: '#831843',
      hair: '#5c4033',
      shoe: '#0f172a',
      role: 'other',
      isPlayer: false,
      visual: { gender: 'female', hairStyle: 'ponytail', build: 'medium', groundYOff: 0, age: 'young', accessory: 'none', nurseCap: false }
    }
  },
  {
    id: 'santos_onco',
    name: 'Dra. Santos',
    role: 'Oncologia & Quimio',
    col: 34, row: 36,
    config: {
      skin: '#d4a574',
      coat: '#ffffff',
      coatDark: '#e2e8f0',
      pants: '#0f766e',
      hair: '#1a1a1a',
      shoe: '#0f172a',
      role: 'doctor',
      isPlayer: false,
      visual: { gender: 'female', hairStyle: 'ponytail', build: 'medium', groundYOff: 0, age: 'adult', accessory: 'glasses', nurseCap: false }
    }
  },
  {
    id: 'marcos_fisio',
    name: 'Fisio. Marcos',
    role: 'Reabilitação Motora',
    col: 49, row: 36,
    config: {
      skin: '#8d5524',
      coat: '#10b981',
      coatDark: '#059669',
      pants: '#047857',
      hair: '#475569',
      shoe: '#0f172a',
      role: 'doctor',
      isPlayer: false,
      visual: { gender: 'male', hairStyle: 'short_neat', build: 'medium', groundYOff: 0, age: 'adult', accessory: 'none', nurseCap: false }
    }
  },
  {
    id: 'helena_psiq',
    name: 'Dra. Helena',
    role: 'Psiquiatria & Saúde Mental',
    col: 65, row: 36,
    config: {
      skin: '#c68642',
      coat: '#ffffff',
      coatDark: '#e2e8f0',
      pants: '#7c3aed',
      hair: '#d97706',
      shoe: '#0f172a',
      role: 'doctor',
      isPlayer: false,
      visual: { gender: 'female', hairStyle: 'updo', build: 'medium', groundYOff: 0, age: 'adult', accessory: 'glasses', nurseCap: false }
    }
  },
  {
    id: 'lucas_psi',
    name: 'Lucas',
    role: 'Paciente (Saúde Mental)',
    col: 70, row: 38,
    config: {
      skin: '#f5c5a3',
      coat: '#64748b',
      coatDark: '#475569',
      pants: '#334155',
      hair: '#111111',
      shoe: '#0f172a',
      role: 'other',
      isPlayer: false,
      visual: { gender: 'male', hairStyle: 'short_wavy', build: 'medium', groundYOff: 0, age: 'young', accessory: 'none', nurseCap: false }
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

      // Fill screen background in screen space first
      ctx.fillStyle = "#030712";
      ctx.fillRect(0, 0, w, h);

      // Smooth camera interpolation for Follow Mode vs Overview Mode
      const targetZoom = cameraMode === 'follow' ? 1.85 : 1.0;
      
      // Calculate camera viewport bounds so camera never pans into empty space
      const halfViewW = (w / 2) / targetZoom;
      const halfViewH = (h / 2) / targetZoom;
      const minCamX = Math.min(w / 2, PAD_X + halfViewW);
      const maxCamX = Math.max(w / 2, PAD_X + MAP_W - halfViewW);
      const minCamY = Math.min(h / 2, PAD_Y + halfViewH);
      const maxCamY = Math.max(h / 2, PAD_Y + MAP_H - halfViewH);

      const rawCamX = cameraMode === 'follow' ? px : w / 2;
      const rawCamY = cameraMode === 'follow' ? py : h / 2;

      const targetCamX = cameraMode === 'follow' ? Math.max(minCamX, Math.min(maxCamX, rawCamX)) : w / 2;
      const targetCamY = cameraMode === 'follow' ? Math.max(minCamY, Math.min(maxCamY, rawCamY)) : h / 2;

      posRef.current.camZoom += (targetZoom - posRef.current.camZoom) * 0.09;
      posRef.current.camX += (targetCamX - posRef.current.camX) * 0.12;
      posRef.current.camY += (targetCamY - posRef.current.camY) * 0.12;

      const camZoom = posRef.current.camZoom;
      const camX = posRef.current.camX;
      const camY = posRef.current.camY;

      // ──────────────────────────────────────────────────────────────────────
      // WORLD SPACE TRANSFORM (CAMERA APPLIED)
      // ──────────────────────────────────────────────────────────────────────
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(camZoom, camZoom);
      ctx.translate(-camX, -camY);

      // Extended Hospital Foundation to eliminate any edge gaps
      ctx.fillStyle = "#070c16";
      ctx.fillRect(PAD_X - 120, PAD_Y - 120, MAP_W + 240, MAP_H + 240);

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
      const c1H = toH(3.5);
      ctx.fillStyle = "#0c1424";
      ctx.fillRect(PAD_X, c1Y, MAP_W, c1H);
      ctx.strokeStyle = "rgba(51, 65, 85, 0.8)";
      ctx.lineWidth = 1;
      ctx.strokeRect(PAD_X, c1Y, MAP_W, c1H);

      const c2Y = toY(27);
      const c2H = toH(3.5);
      ctx.fillStyle = "#0c1424";
      ctx.fillRect(PAD_X, c2Y, MAP_W, c2H);
      ctx.strokeStyle = "rgba(51, 65, 85, 0.8)";
      ctx.lineWidth = 1;
      ctx.strokeRect(PAD_X, c2Y, MAP_W, c2H);

      // Hospital Floor Wayfinding Guidance Stripes
      // Red line to Emergency
      ctx.strokeStyle = "rgba(244, 63, 94, 0.7)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(PAD_X + 20, c1Y + c1H / 2 - 6);
      ctx.lineTo(toX(25), c1Y + c1H / 2 - 6);
      ctx.stroke();

      // Cyan line to UTI / Posto Central
      ctx.strokeStyle = "rgba(56, 189, 248, 0.65)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(toX(26), c1Y + c1H / 2 + 6);
      ctx.lineTo(PAD_X + MAP_W - 20, c1Y + c1H / 2 + 6);
      ctx.stroke();

      // Amber line to Maternidade & Oncologia
      ctx.strokeStyle = "rgba(245, 158, 11, 0.65)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(PAD_X + 20, c2Y + c2H / 2 - 6);
      ctx.lineTo(toX(42), c2Y + c2H / 2 - 6);
      ctx.stroke();

      // Green line to Central Courtyard Garden
      ctx.strokeStyle = "rgba(74, 222, 128, 0.6)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(toX(33), c2Y + c2H / 2 + 6);
      ctx.lineTo(toX(42), c2Y + c2H / 2 + 6);
      ctx.lineTo(toX(37.5), toY(43));
      ctx.stroke();

      // Corridor Wall Directional Signage Plaques
      const corridorSigns = [
        { text: "← RECEPÇÃO • PRONTO-SOCORRO →", x: toX(12), y: c1Y + 9 },
        { text: "← FARMÁCIA • LABORATÓRIO • RADIOLOGIA →", x: toX(38), y: c1Y + 9 },
        { text: "← DIRETORIA • GESTÃO HOSPITALAR →", x: toX(65), y: c1Y + 9 },
        { text: "← AMBULATÓRIO • MATERNIDADE →", x: toX(14), y: c2Y + 9 },
        { text: "← ONCOLOGIA • REABILITAÇÃO MOTORA →", x: toX(38), y: c2Y + 9 },
        { text: "← SAÚDE MENTAL • JARDIM CENTRAL ↓", x: toX(64), y: c2Y + 9 },
      ];
      ctx.font = "bold 8px system-ui, sans-serif";
      ctx.textAlign = "center";
      corridorSigns.forEach((cs) => {
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.fillRect(cs.x - 70, cs.y - 8, 140, 13);
        ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
        ctx.lineWidth = 1;
        ctx.strokeRect(cs.x - 70, cs.y - 8, 140, 13);
        ctx.fillStyle = "#e2e8f0";
        ctx.fillText(cs.text, cs.x, cs.y + 2);
      });

      // Hospital Sectors & Detailed Equipment (ALL 17 SECTORS)
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

        // Door Openings & Walkway thresholds into Corridors
        const drawDoor = (colStart: number, wallY: number, isTopDoor: boolean) => {
          const doorX = toX(colStart);
          const doorW = toW(2.2);
          // Clear wall border for door opening
          ctx.fillStyle = sec.floorColor;
          ctx.fillRect(doorX, wallY - 3, doorW, 6);
          // Threshold marker
          ctx.fillStyle = "rgba(250, 204, 21, 0.6)";
          ctx.fillRect(doorX, wallY - 1, doorW, 2);
          // Door frame hinges
          ctx.fillStyle = "#94a3b8";
          ctx.fillRect(doorX - 1, wallY - 2, 2, 4);
          ctx.fillRect(doorX + doorW - 1, wallY - 2, 2, 4);
        };

        // Render matching door for each sector
        if (sec.id === 'reception') drawDoor(6, sy + sh, false);
        if (sec.id === 'emergency') drawDoor(18, sy + sh, false);
        if (sec.id === 'pharmacy') drawDoor(30, sy + sh, false);
        if (sec.id === 'lab') drawDoor(43, sy + sh, false);
        if (sec.id === 'radiology') drawDoor(55, sy + sh, false);
        if (sec.id === 'admin') drawDoor(67, sy + sh, false);

        if (sec.id === 'cme') { drawDoor(5, sy, true); drawDoor(5, sy + sh, false); }
        if (sec.id === 'break') { drawDoor(16, sy, true); drawDoor(16, sy + sh, false); }
        if (sec.id === 'ward') { drawDoor(30, sy, true); drawDoor(30, sy + sh, false); }
        if (sec.id === 'icu') { drawDoor(44, sy, true); drawDoor(44, sy + sh, false); }
        if (sec.id === 'nursing') { drawDoor(62, sy, true); drawDoor(62, sy + sh, false); }

        if (sec.id === 'outpatient') { drawDoor(7, sy, true); drawDoor(7, sy + sh, false); }
        if (sec.id === 'maternity') { drawDoor(20, sy, true); drawDoor(20, sy + sh, false); }
        if (sec.id === 'oncology') { drawDoor(34, sy, true); drawDoor(34, sy + sh, false); }
        if (sec.id === 'rehab') { drawDoor(48, sy, true); drawDoor(48, sy + sh, false); }
        if (sec.id === 'psych') { drawDoor(64, sy, true); drawDoor(64, sy + sh, false); }

        // Architectural Header Bar
        ctx.fillStyle = "rgba(10, 16, 28, 0.9)";
        ctx.fillRect(sx + 3, sy + 3, sw - 6, 17);

        ctx.fillStyle = sec.accentColor;
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "left";
        ctx.fillText(sec.code, sx + 7, sy + 15);

        ctx.fillStyle = "#f1f5f9";
        ctx.font = "bold 8.5px system-ui, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(sec.short, sx + sw - 7, sy + 15);

        // ────────────────────────────────────────────────────────────────────
        // CLINICAL & ADMINISTRATIVE ROOM FIXTURES (ALL SECTORS COMPLETE)
        // ────────────────────────────────────────────────────────────────────
        if (sec.type === 'reception') {
          // Curved Reception Counter with wood top
          ctx.fillStyle = "#334155";
          ctx.beginPath();
          ctx.roundRect(sx + 12, sy + 24, sw - 24, 18, 5);
          ctx.fill();
          ctx.fillStyle = "#475569";
          ctx.fillRect(sx + 14, sy + 25, sw - 28, 4);

          // 3 Reception computer monitors with glowing blue screens
          for (let i = 0; i < 3; i++) {
            const mx = sx + 20 + i * ((sw - 40) / 3);
            ctx.fillStyle = "#1e293b";
            ctx.fillRect(mx - 2, sy + 26, 12, 11);
            ctx.fillStyle = "#38bdf8";
            ctx.fillRect(mx, sy + 27, 8, 6);
          }

          // Electronic Queue Ticket Totem (Totem de Senhas)
          ctx.fillStyle = "#0284c7";
          ctx.fillRect(sx + sw - 22, sy + 24, 10, 20);
          ctx.fillStyle = "#f8fafc";
          ctx.fillRect(sx + sw - 20, sy + 26, 6, 6);

          // Waiting Rows of Chairs (Longarinas)
          ctx.fillStyle = "#334155";
          const chairRows = 2;
          for (let r = 0; r < chairRows; r++) {
            const ry = sy + sh - 34 + r * 15;
            for (let i = 0; i < 5; i++) {
              const cx = sx + 12 + i * ((sw - 28) / 5);
              ctx.fillStyle = "#1e293b";
              ctx.fillRect(cx, ry, 12, 10);
              ctx.fillStyle = "#0284c7";
              ctx.fillRect(cx + 1, ry + 1, 10, 8);
            }
          }

          // Potted Ficus Plant
          ctx.fillStyle = "#78350f";
          ctx.beginPath(); ctx.arc(sx + 14, sy + sh - 10, 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#22c55e";
          ctx.beginPath(); ctx.arc(sx + 14, sy + sh - 13, 6, 0, Math.PI * 2); ctx.fill();

        } else if (sec.type === 'emergency') {
          // 3 Trauma & Resuscitation Stretchers
          const numBeds = 3;
          for (let i = 0; i < numBeds; i++) {
            const bx = sx + 10 + i * ((sw - 20) / numBeds);
            const by = sy + 26;
            const bw = 32;
            const bh = 18;

            // Stretcher frame
            ctx.fillStyle = "#f8fafc";
            ctx.fillRect(bx, by, bw, bh);
            ctx.strokeStyle = "#ef4444";
            ctx.lineWidth = 1.2;
            ctx.strokeRect(bx, by, bw, bh);

            // Red Emergency Blanket
            ctx.fillStyle = "#f87171";
            ctx.fillRect(bx + 8, by + 2, bw - 10, bh - 4);

            // Pillow
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(bx + 2, by + 3, 6, bh - 6);

            // Defibrillator / Vital Monitor Cart with animated ECG
            ctx.fillStyle = "#0f172a";
            ctx.fillRect(bx + bw - 10, by - 8, 11, 7);
            ctx.fillStyle = "#22c55e";
            ctx.fillRect(bx + bw - 9, by - 7, 9, 5);

            // IV Infusion Stand
            ctx.fillStyle = "#94a3b8";
            ctx.beginPath(); ctx.arc(bx + bw + 2, by + 3, 2.5, 0, Math.PI * 2); ctx.fill();
          }

          // Emergency Crash Cart (Carro de Emergência Vermelho)
          ctx.fillStyle = "#dc2626";
          ctx.fillRect(sx + sw - 20, sy + sh - 26, 14, 16);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(sx + sw - 16, sy + sh - 22, 6, 3);

          // Triage Manchester Desk
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(sx + 10, sy + sh - 26, 36, 16);
          ctx.fillStyle = "#facc15";
          ctx.fillRect(sx + 14, sy + sh - 22, 8, 6);

        } else if (sec.type === 'pharmacy') {
          // Grid of High-Density CAF Medicine Shelving Racks
          const rows = 3;
          for (let r = 0; r < rows; r++) {
            const ry = sy + 24 + r * 17;
            ctx.fillStyle = "#312e81";
            ctx.fillRect(sx + 10, ry, sw - 20, 11);
            ctx.fillStyle = "#4338ca";
            ctx.fillRect(sx + 10, ry + 9, sw - 20, 2);

            // Medicine boxes of various colors (antibiotics, analgesics, cardiovascular)
            for (let i = 0; i < 9; i++) {
              const mx = sx + 14 + i * ((sw - 32) / 9);
              const color = i % 4 === 0 ? "#f43f5e" : i % 4 === 1 ? "#38bdf8" : i % 4 === 2 ? "#eab308" : "#22c55e";
              ctx.fillStyle = color;
              ctx.fillRect(mx, ry + 2, 6, 6);
            }
          }

          // Locked Psychotropic / Narcotic Safe (Armário de Controlados)
          ctx.fillStyle = "#1e1b4b";
          ctx.fillRect(sx + 10, sy + sh - 26, 18, 16);
          ctx.strokeStyle = "#818cf8";
          ctx.lineWidth = 1;
          ctx.strokeRect(sx + 10, sy + sh - 26, 18, 16);
          ctx.fillStyle = "#e2e8f0";
          ctx.fillRect(sx + 24, sy + sh - 18, 2, 4); // lock

          // Dispensing Counter with Barcode Scanner & Terminal
          ctx.fillStyle = "#334155";
          ctx.fillRect(sx + 34, sy + sh - 24, sw - 44, 14);
          ctx.fillStyle = "#6366f1";
          ctx.fillRect(sx + sw - 22, sy + sh - 22, 10, 7);

        } else if (sec.type === 'lab') {
          // Laboratory Workbenches along top & bottom
          ctx.fillStyle = "#334155";
          ctx.fillRect(sx + 10, sy + 24, sw - 20, 15);
          ctx.fillStyle = "#0f766e";
          ctx.fillRect(sx + 10, sy + 37, sw - 20, 2);

          // Automated Biochemistry & Hematology Analyzer
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(sx + 16, sy + 25, 26, 12);
          ctx.fillStyle = "#22d3ee";
          ctx.fillRect(sx + 18, sy + 27, 10, 6);

          // Centrifuges with spinning rotors
          ctx.fillStyle = "#1e293b";
          ctx.beginPath(); ctx.arc(sx + 54, sy + 31, 6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#38bdf8";
          ctx.beginPath(); ctx.arc(sx + 54, sy + 31, 3, 0, Math.PI * 2); ctx.fill();

          ctx.fillStyle = "#1e293b";
          ctx.beginPath(); ctx.arc(sx + 72, sy + 31, 6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#38bdf8";
          ctx.beginPath(); ctx.arc(sx + 72, sy + 31, 3, 0, Math.PI * 2); ctx.fill();

          // Binocular Microscopes
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(sx + sw - 26, sy + 25, 10, 10);
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(sx + sw - 24, sy + 26, 6, 4);

          // Reagent Specimen Storage Refrigerator
          ctx.fillStyle = "#0284c7";
          ctx.fillRect(sx + 10, sy + sh - 28, 22, 18);
          ctx.fillStyle = "#e0f2fe";
          ctx.fillRect(sx + 12, sy + sh - 26, 18, 6);

          // Biohazard Specimen Waste Canister
          ctx.fillStyle = "#eab308";
          ctx.fillRect(sx + sw - 20, sy + sh - 22, 10, 12);

        } else if (sec.type === 'radiology') {
          // Circular CT Scanner Gantry (Tomógrafo Computadorizado)
          const gantryX = sx + sw / 2;
          const gantryY = sy + 44;
          ctx.fillStyle = "#334155";
          ctx.beginPath(); ctx.arc(gantryX, gantryY, 20, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#0f172a";
          ctx.beginPath(); ctx.arc(gantryX, gantryY, 11, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "#a855f7";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Motorized Patient Table extending through gantry
          ctx.fillStyle = "#c084fc";
          ctx.fillRect(gantryX - 8, gantryY - 4, 16, 32);
          ctx.fillStyle = "#f8fafc";
          ctx.fillRect(gantryX - 6, gantryY + 4, 12, 18);

          // Lead-Shielded Glass Control Console Booth
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(sx + 10, sy + 24, 28, 24);
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 1.2;
          ctx.strokeRect(sx + 10, sy + 24, 28, 24);
          // Dual high-res diagnostic monitors
          ctx.fillStyle = "#0284c7";
          ctx.fillRect(sx + 14, sy + 28, 8, 7);
          ctx.fillRect(sx + 24, sy + 28, 8, 7);

          // Backlit Wall X-Ray Film Viewers (Negatoscópio)
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(sx + sw - 26, sy + 24, 18, 14);
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(sx + sw - 24, sy + 26, 14, 10);
          ctx.fillStyle = "#38bdf8";
          ctx.fillRect(sx + sw - 21, sy + 28, 8, 6);

          // Radiation Warning Trefoil Plaque
          ctx.fillStyle = "#eab308";
          ctx.fillRect(sx + sw - 18, sy + sh - 20, 10, 10);

        } else if (sec.type === 'admin') {
          // Executive Conference Table (Mesa de Reunião da Diretoria)
          const tW = sw - 36;
          const tH = 22;
          const tX = sx + 18;
          const tY = sy + 28;
          ctx.fillStyle = "#78350f"; // Rich mahogany wood
          ctx.beginPath();
          ctx.roundRect(tX, tY, tW, tH, 6);
          ctx.fill();
          ctx.strokeStyle = "#b45309";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Conference Chairs around table (6 chairs)
          for (let i = 0; i < 3; i++) {
            const cx = tX + 10 + i * ((tW - 20) / 2);
            // Top chairs
            ctx.fillStyle = "#1e293b";
            ctx.fillRect(cx - 5, tY - 6, 10, 5);
            // Bottom chairs
            ctx.fillRect(cx - 5, tY + tH + 1, 10, 5);
          }

          // Director's Laptop on table
          ctx.fillStyle = "#cbd5e1";
          ctx.fillRect(tX + tW / 2 - 6, tY + 5, 12, 8);
          ctx.fillStyle = "#0284c7";
          ctx.fillRect(tX + tW / 2 - 4, tY + 6, 8, 4);

          // Executive Filing Cabinets (Arquivos de Acreditação Hospitalar ONA)
          ctx.fillStyle = "#334155";
          ctx.fillRect(sx + 10, sy + sh - 24, 26, 14);
          ctx.strokeStyle = "#94a3b8";
          ctx.lineWidth = 0.8;
          ctx.strokeRect(sx + 10, sy + sh - 24, 26, 14);
          ctx.fillStyle = "#e2e8f0";
          ctx.fillRect(sx + 14, sy + sh - 20, 6, 3);
          ctx.fillRect(sx + 24, sy + sh - 20, 6, 3);

          // Water Cooler Dispenser with Blue 20L bottle
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(sx + sw - 22, sy + sh - 24, 10, 14);
          ctx.fillStyle = "#38bdf8";
          ctx.beginPath(); ctx.arc(sx + sw - 17, sy + sh - 26, 4.5, 0, Math.PI * 2); ctx.fill();

          // Executive Leather Visitor Sofa
          ctx.fillStyle = "#451a03";
          ctx.fillRect(sx + 42, sy + sh - 22, 38, 12);
          ctx.fillStyle = "#78350f";
          ctx.fillRect(sx + 44, sy + sh - 20, 34, 8);

        } else if (sec.type === 'cme') {
          // Dual Heavy-Duty Industrial Autoclaves (Autoclaves a Vapor de Barreira)
          for (let i = 0; i < 2; i++) {
            const ax = sx + 12 + i * 36;
            const ay = sy + 25;
            // Stainless steel body
            ctx.fillStyle = "#64748b";
            ctx.fillRect(ax, ay, 28, 20);
            ctx.strokeStyle = "#cbd5e1";
            ctx.lineWidth = 1.2;
            ctx.strokeRect(ax, ay, 28, 20);

            // Circular pressure hatch with rotating handle
            ctx.fillStyle = "#334155";
            ctx.beginPath(); ctx.arc(ax + 14, ay + 10, 7, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = "#e2e8f0";
            ctx.lineWidth = 1;
            ctx.stroke();

            // Digital temperature LED display & pressure gauge
            ctx.fillStyle = "#10b981"; // Green ready LED
            ctx.fillRect(ax + 2, ay + 2, 4, 3);
            ctx.fillStyle = "#f59e0b"; // Orange cycle LED
            ctx.fillRect(ax + 8, ay + 2, 4, 3);
          }

          // Ultrasonic Wash Sink & Decontamination Sinks
          ctx.fillStyle = "#475569";
          ctx.fillRect(sx + 10, sy + sh - 26, 36, 16);
          ctx.fillStyle = "#0284c7";
          ctx.fillRect(sx + 14, sy + sh - 23, 12, 10);
          ctx.fillRect(sx + 30, sy + sh - 23, 12, 10);

          // Packing Workbench with Crepe Paper Rolls & Heat Sealer (Termoseladora)
          ctx.fillStyle = "#334155";
          ctx.fillRect(sx + sw - 36, sy + 25, 26, 26);
          ctx.fillStyle = "#38bdf8";
          ctx.fillRect(sx + sw - 32, sy + 28, 18, 5); // paper roll
          ctx.fillStyle = "#f43f5e";
          ctx.fillRect(sx + sw - 32, sy + 38, 18, 4); // surgical pack

          // Sterile Storage Shelves with Color-Coded Kit Containers
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(sx + sw - 36, sy + sh - 26, 26, 16);
          ctx.fillStyle = "#10b981";
          ctx.fillRect(sx + sw - 32, sy + sh - 23, 8, 5);
          ctx.fillStyle = "#3b82f6";
          ctx.fillRect(sx + sw - 20, sy + sh - 23, 8, 5);

        } else if (sec.type === 'break') {
          // Cafeteria Dining Tables with Chairs
          for (let i = 0; i < 2; i++) {
            const tx = sx + 12 + i * 44;
            const ty = sy + 28;
            ctx.fillStyle = "#a16207"; // Warm wood table
            ctx.beginPath();
            ctx.roundRect(tx, ty, 32, 18, 4);
            ctx.fill();

            // Chairs on both sides
            ctx.fillStyle = "#451a03";
            ctx.fillRect(tx + 4, ty - 5, 8, 4);
            ctx.fillRect(tx + 20, ty - 5, 8, 4);
            ctx.fillRect(tx + 4, ty + 19, 8, 4);
            ctx.fillRect(tx + 20, ty + 19, 8, 4);
          }

          // Kitchenette Counter with Sink, Microwaves, Coffee Machine
          ctx.fillStyle = "#334155";
          ctx.fillRect(sx + 10, sy + sh - 25, sw - 48, 15);
          // Microwave ovens
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(sx + 16, sy + sh - 23, 12, 8);
          ctx.fillRect(sx + 32, sy + sh - 23, 12, 8);
          // Coffee maker
          ctx.fillStyle = "#78350f";
          ctx.fillRect(sx + 48, sy + sh - 23, 8, 9);

          // Cold Beverage & Snack Vending Machines (Máquinas de Vendas)
          ctx.fillStyle = "#0284c7";
          ctx.fillRect(sx + sw - 32, sy + sh - 30, 14, 20);
          ctx.fillStyle = "#38bdf8";
          ctx.fillRect(sx + sw - 30, sy + sh - 28, 10, 8);

          ctx.fillStyle = "#dc2626";
          ctx.fillRect(sx + sw - 16, sy + sh - 30, 12, 20);
          ctx.fillStyle = "#fca5a5";
          ctx.fillRect(sx + sw - 14, sy + sh - 28, 8, 8);

        } else if (sec.type === 'ward') {
          // 4 Hospital Ward Beds with Crisp Blue Blankets
          const numBeds = 4;
          for (let i = 0; i < numBeds; i++) {
            const bx = sx + 8 + i * ((sw - 16) / numBeds);
            const by = sy + 25;
            const bw = 30;
            const bh = 18;

            ctx.fillStyle = "#f8fafc";
            ctx.fillRect(bx, by, bw, bh);
            ctx.strokeStyle = "#60a5fa";
            ctx.lineWidth = 1;
            ctx.strokeRect(bx, by, bw, bh);

            // Blue Blanket
            ctx.fillStyle = "#93c5fd";
            ctx.fillRect(bx + 8, by + 2, bw - 10, bh - 4);
            // Pillow
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(bx + 2, by + 3, 6, bh - 6);

            // Bedside Cabinet & IV stand
            ctx.fillStyle = "#cbd5e1";
            ctx.fillRect(bx + bw - 6, by - 6, 6, 5);
            ctx.fillStyle = "#94a3b8";
            ctx.beginPath(); ctx.arc(bx + bw + 2, by + 3, 2.5, 0, Math.PI * 2); ctx.fill();
          }

          // Ward Nurse Station Workstation
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(sx + 10, sy + sh - 24, 46, 14);
          ctx.fillStyle = "#3b82f6";
          ctx.fillRect(sx + 16, sy + sh - 22, 10, 6);
          ctx.fillStyle = "#e2e8f0";
          ctx.fillRect(sx + 32, sy + sh - 22, 18, 5); // Chart folders

        } else if (sec.type === 'icu') {
          // 3 High-Acuity ICU Beds with Overhead Cardiac Monitors
          const numIcuBeds = 3;
          for (let i = 0; i < numIcuBeds; i++) {
            const bx = sx + 10 + i * ((sw - 20) / numIcuBeds);
            const by = sy + 25;
            const bw = 34;
            const bh = 20;

            ctx.fillStyle = "#f8fafc";
            ctx.fillRect(bx, by, bw, bh);
            ctx.strokeStyle = "#2dd4bf";
            ctx.lineWidth = 1.2;
            ctx.strokeRect(bx, by, bw, bh);

            // Teal ICU Blanket
            ctx.fillStyle = "#5eead4";
            ctx.fillRect(bx + 10, by + 2, bw - 12, bh - 4);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(bx + 2, by + 4, 7, bh - 8);

            // Overhead Multi-Parameter Monitor (ECG, SpO2, Art Pressure)
            ctx.fillStyle = "#020617";
            ctx.fillRect(bx + bw - 12, by - 9, 13, 8);
            ctx.fillStyle = "#4ade80"; // ECG green trace
            ctx.fillRect(bx + bw - 11, by - 8, 11, 3);
            ctx.fillStyle = "#38bdf8"; // SpO2 blue trace
            ctx.fillRect(bx + bw - 11, by - 4, 11, 2);

            // Mechanical Ventilator (Ventilador Pulmonar)
            ctx.fillStyle = "#e2e8f0";
            ctx.fillRect(bx - 6, by + 4, 5, 12);
            ctx.fillStyle = "#06b6d4";
            ctx.fillRect(bx - 5, by + 6, 3, 4);
          }

          // ICU Crash Cart & Syringe Infusion Pump Columns
          ctx.fillStyle = "#ef4444";
          ctx.fillRect(sx + 10, sy + sh - 25, 14, 15);
          ctx.fillStyle = "#334155";
          ctx.fillRect(sx + 30, sy + sh - 25, 24, 15);
          ctx.fillStyle = "#22d3ee";
          ctx.fillRect(sx + 34, sy + sh - 22, 6, 8);
          ctx.fillRect(sx + 44, sy + sh - 22, 6, 8);

        } else if (sec.type === 'nursing') {
          // Large Semicircular Central Nursing Command Island
          ctx.fillStyle = "#1e293b";
          ctx.beginPath();
          ctx.roundRect(sx + 16, sy + 24, sw - 32, 28, 8);
          ctx.fill();
          ctx.strokeStyle = "#34d399";
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // 4 Active Computer Terminals with Shift Status
          for (let i = 0; i < 4; i++) {
            const mx = sx + 24 + i * ((sw - 60) / 4);
            ctx.fillStyle = "#020617";
            ctx.fillRect(mx, sy + 28, 12, 10);
            ctx.fillStyle = "#34d399";
            ctx.fillRect(mx + 1, sy + 29, 10, 6);
          }

          // Nursing Shift & Patient Handover Whiteboard
          ctx.fillStyle = "#f8fafc";
          ctx.fillRect(sx + sw / 2 - 30, sy + sh - 22, 60, 12);
          ctx.strokeStyle = "#059669";
          ctx.lineWidth = 1;
          ctx.strokeRect(sx + sw / 2 - 30, sy + sh - 22, 60, 12);
          ctx.fillStyle = "#0f172a";
          ctx.font = "bold 6.5px monospace";
          ctx.textAlign = "center";
          ctx.fillText("ESCALA & PASSAGEM DE PLANTÃO", sx + sw / 2, sy + sh - 14);

        } else if (sec.type === 'outpatient') {
          // 2 Consultation Exam Rooms with Examination Couches & Physician Desks
          for (let i = 0; i < 2; i++) {
            const cx = sx + 10 + i * 44;
            const cy = sy + 25;

            // Clinical Examination Couch with Paper Roll
            ctx.fillStyle = "#f8fafc";
            ctx.fillRect(cx, cy, 26, 15);
            ctx.strokeStyle = "#0284c7";
            ctx.lineWidth = 1;
            ctx.strokeRect(cx, cy, 26, 15);
            ctx.fillStyle = "#38bdf8";
            ctx.fillRect(cx + 2, cy + 2, 5, 11); // Roll paper

            // Doctor Consultation Desk with PC
            ctx.fillStyle = "#334155";
            ctx.fillRect(cx, cy + 18, 26, 12);
            ctx.fillStyle = "#38bdf8";
            ctx.fillRect(cx + 4, cy + 20, 8, 6);
          }

          // Outpatient Waiting Row Chairs
          ctx.fillStyle = "#334155";
          for (let i = 0; i < 4; i++) {
            const wx = sx + 12 + i * 18;
            ctx.fillRect(wx, sy + sh - 24, 12, 10);
            ctx.fillStyle = "#0284c7";
            ctx.fillRect(wx + 1, sy + sh - 23, 10, 8);
          }

          // Stadiometer / Medical Scale (Balança Antropométrica)
          ctx.fillStyle = "#cbd5e1";
          ctx.fillRect(sx + sw - 20, sy + 25, 8, 22);
          ctx.fillStyle = "#0284c7";
          ctx.fillRect(sx + sw - 22, sy + 43, 12, 4);

        } else if (sec.type === 'maternity') {
          // Obstetric Delivery / Postpartum Recovery Bed
          const bx = sx + 12;
          const by = sy + 25;
          ctx.fillStyle = "#fdf2f8";
          ctx.fillRect(bx, by, 34, 20);
          ctx.strokeStyle = "#ec4899";
          ctx.lineWidth = 1.2;
          ctx.strokeRect(bx, by, 34, 20);
          // Soft pink blanket
          ctx.fillStyle = "#f472b6";
          ctx.fillRect(bx + 10, by + 2, 22, 16);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(bx + 2, by + 4, 7, 12);

          // 2 Transparent Acrylic Neonatal Bassinets (Berços Acrílicos)
          for (let i = 0; i < 2; i++) {
            const nx = sx + 52 + i * 22;
            ctx.fillStyle = "#e0f2fe";
            ctx.fillRect(nx, by + 2, 16, 16);
            ctx.strokeStyle = "#38bdf8";
            ctx.lineWidth = 1;
            ctx.strokeRect(nx, by + 2, 16, 16);
            // Baby swaddle blanket
            ctx.fillStyle = i === 0 ? "#fbcfe8" : "#bae6fd";
            ctx.beginPath(); ctx.arc(nx + 8, by + 10, 5, 0, Math.PI * 2); ctx.fill();
          }

          // High-Acuity Neonatal Incubator (Incubadora Neonatal Aquecida)
          const ix = sx + 12;
          const iy = sy + sh - 28;
          ctx.fillStyle = "#f8fafc";
          ctx.fillRect(ix, iy, 28, 18);
          ctx.strokeStyle = "#f43f5e";
          ctx.lineWidth = 1.2;
          ctx.strokeRect(ix, iy, 28, 18);
          // Curved radiant hood
          ctx.fillStyle = "#bae6fd";
          ctx.beginPath(); ctx.arc(ix + 14, iy + 9, 7, 0, Math.PI * 2); ctx.fill();

          // Breastfeeding & Lactation Support Armchair (Banco de Leite)
          ctx.fillStyle = "#db2777";
          ctx.beginPath();
          ctx.roundRect(sx + sw - 28, sy + sh - 28, 18, 18, 5);
          ctx.fill();

        } else if (sec.type === 'oncology') {
          // 3 Ergonomic Chemotherapy Infusion Armchairs (Poltronas de Quimioterapia)
          for (let i = 0; i < 3; i++) {
            const cx = sx + 12 + i * 36;
            const cy = sy + 25;
            // Plush reclining armchair
            ctx.fillStyle = "#0f766e";
            ctx.beginPath();
            ctx.roundRect(cx, cy, 22, 20, 5);
            ctx.fill();
            ctx.fillStyle = "#14b8a6";
            ctx.fillRect(cx + 3, cy + 3, 16, 14);

            // Tall Infusion Pump Pole with Dual Syringe Drip
            ctx.fillStyle = "#94a3b8";
            ctx.fillRect(cx + 25, cy - 8, 2, 28);
            ctx.fillStyle = "#0284c7";
            ctx.fillRect(cx + 23, cy - 6, 6, 7); // Pump unit
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(cx + 24, cy - 5, 4, 3); // Display
          }

          // Cytostatic Chemotherapy Preparation Counter with Laminar Flow Hood
          ctx.fillStyle = "#134e4a";
          ctx.fillRect(sx + 10, sy + sh - 25, 42, 15);
          ctx.fillStyle = "#2dd4bf";
          ctx.fillRect(sx + 14, sy + sh - 22, 16, 9); // Laminar hood glass

          // Purple Cytostatic Biohazard Waste Canister (Grupo B - Quimioterápicos)
          ctx.fillStyle = "#9333ea";
          ctx.fillRect(sx + sw - 22, sy + sh - 25, 12, 15);
          ctx.fillStyle = "#facc15";
          ctx.fillRect(sx + sw - 19, sy + sh - 21, 6, 6);

        } else if (sec.type === 'rehab') {
          // Chrome Parallel Walking Rehabilitation Bars (Barras Paralelas)
          const px = sx + 12;
          const py = sy + 26;
          const pw = 48;
          ctx.strokeStyle = "#94a3b8";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(px, py); ctx.lineTo(px + pw, py);
          ctx.moveTo(px, py + 16); ctx.lineTo(px + pw, py + 16);
          ctx.stroke();
          // Step markings
          ctx.strokeStyle = "#10b981";
          ctx.lineWidth = 1;
          for (let i = 0; i < 5; i++) {
            const mx = px + 6 + i * 9;
            ctx.beginPath(); ctx.moveTo(mx, py + 3); ctx.lineTo(mx, py + 13); ctx.stroke();
          }

          // Thick Physiotherapy Exercise Floor Mat (Tablado de Reabilitação)
          ctx.fillStyle = "#059669";
          ctx.fillRect(sx + sw - 44, sy + 25, 34, 22);
          ctx.fillStyle = "#34d399";
          ctx.fillRect(sx + sw - 42, sy + 27, 30, 18);
          // Bolster roll & gym ball
          ctx.fillStyle = "#3b82f6";
          ctx.beginPath(); ctx.arc(sx + sw - 20, sy + 36, 6, 0, Math.PI * 2); ctx.fill();

          // Wall-Mounted Swedish Rehabilitation Ladder (Espaldar)
          ctx.fillStyle = "#78350f";
          ctx.fillRect(sx + 10, sy + sh - 24, 28, 14);
          ctx.fillStyle = "#d97706";
          for (let i = 0; i < 4; i++) {
            ctx.fillRect(sx + 12, sy + sh - 22 + i * 3, 24, 1.5);
          }

          // Physiotherapist Consultation Desk
          ctx.fillStyle = "#334155";
          ctx.fillRect(sx + sw - 44, sy + sh - 24, 34, 14);
          ctx.fillStyle = "#10b981";
          ctx.fillRect(sx + sw - 36, sy + sh - 22, 10, 6);

        } else if (sec.type === 'psych') {
          // Psychotherapy Lounge: Soft L-Shaped Sectional Sofa & Armchairs
          ctx.fillStyle = "#5b21b6"; // Plush violet sofa
          ctx.beginPath();
          ctx.roundRect(sx + 14, sy + 25, 42, 16, 5);
          ctx.fill();
          ctx.beginPath();
          ctx.roundRect(sx + 14, sy + 38, 16, 20, 5);
          ctx.fill();

          // Low Solid Wood Coffee Table with Tissue Box
          ctx.fillStyle = "#78350f";
          ctx.beginPath();
          ctx.roundRect(sx + 34, sy + 44, 22, 14, 3);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(sx + 42, sy + 48, 6, 5); // Tissues

          // Extensive Bookshelf with DSM/Psychiatry Manuals
          ctx.fillStyle = "#451a03";
          ctx.fillRect(sx + sw - 38, sy + 25, 28, 14);
          for (let i = 0; i < 6; i++) {
            const bx = sx + sw - 36 + i * 4.5;
            ctx.fillStyle = i % 2 === 0 ? "#7c3aed" : "#3b82f6";
            ctx.fillRect(bx, sy + 27, 3.5, 9);
          }

          // Psychiatrist Consultation Desk with Laptop
          ctx.fillStyle = "#334155";
          ctx.fillRect(sx + sw - 38, sy + sh - 25, 28, 15);
          ctx.fillStyle = "#a78bfa";
          ctx.fillRect(sx + sw - 30, sy + sh - 23, 10, 6);

          // Calming Ambient Floor Lamp & Plant
          ctx.fillStyle = "#fbbf24";
          ctx.beginPath(); ctx.arc(sx + 14, sy + sh - 14, 4, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#22c55e";
          ctx.beginPath(); ctx.arc(sx + 24, sy + sh - 14, 5, 0, Math.PI * 2); ctx.fill();

        } else if (sec.type === 'garden') {
          // Central Garden with Walkways & Planters
          ctx.fillStyle = "#1e3a24";
          ctx.fillRect(sx + 8, sy + 18, sw - 16, sh - 24);

          // Cobblestone walking loop path
          ctx.fillStyle = "#334155";
          ctx.fillRect(sx + 12, sy + 22, sw - 24, 10);
          ctx.fillRect(sx + sw / 2 - 20, sy + 18, 40, sh - 24);

          // Central Decorative Tiered Fountain with Water Ripples
          const fx = sx + sw / 2;
          const fy = sy + sh / 2 + 2;
          ctx.fillStyle = "#475569";
          ctx.beginPath(); ctx.arc(fx, fy, 14, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#0284c7";
          ctx.beginPath(); ctx.arc(fx, fy, 10, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#38bdf8";
          ctx.beginPath(); ctx.arc(fx, fy, 5, 0, Math.PI * 2); ctx.fill();

          // 4 Classic Wooden Park Benches
          const benchPositions = [
            { x: sx + 40, y: sy + 20 },
            { x: sx + sw - 60, y: sy + 20 },
            { x: sx + 40, y: sy + sh - 16 },
            { x: sx + sw - 60, y: sy + sh - 16 },
          ];
          ctx.fillStyle = "#78350f";
          benchPositions.forEach((bp) => {
            ctx.fillRect(bp.x, bp.y, 22, 6);
            ctx.fillStyle = "#b45309";
            ctx.fillRect(bp.x + 2, bp.y + 1, 18, 4);
          });

          // Lush Foliage Bushes & Flowering Shrubs
          for (let i = 0; i < 11; i++) {
            const bx = sx + 25 + i * ((sw - 50) / 10);
            const by = sy + sh / 2 + (i % 2 === 0 ? -9 : 9);
            ctx.fillStyle = "#15803d";
            ctx.beginPath(); ctx.arc(bx, by, 7.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = i % 3 === 0 ? "#ec4899" : i % 3 === 1 ? "#facc15" : "#4ade80";
            ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI * 2); ctx.fill();
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
