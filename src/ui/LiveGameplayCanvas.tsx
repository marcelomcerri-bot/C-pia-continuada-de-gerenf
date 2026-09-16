import React, { useRef, useEffect } from 'react';

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
  category: string;
  baseColor: string;
  accentColor: string;
  type: 'clinical' | 'critical' | 'support' | 'admin' | 'inpatient' | 'garden';
}

// Exact Hospital Universário Antônio Pedro (HUAP) sectors (cols 0..75, rows 0..49)
const HUAP_SECTORS: SectorDef[] = [
  // North Wing (rows 2..12)
  { id: 'reception', name: 'Recepção Central & Acolhimento', short: 'RECEPÇÃO', code: '01•REC', col: 2, row: 2, w: 10, h: 11, category: 'Acolhimento', baseColor: '#0a192f', accentColor: '#38bdf8', type: 'clinical' },
  { id: 'emergency', name: 'Pronto-Socorro / Triagem Manchester', short: 'PRONTO-SOCORRO', code: '02•PS', col: 13, row: 2, w: 12, h: 11, category: 'Emergência', baseColor: '#200c14', accentColor: '#f43f5e', type: 'critical' },
  { id: 'pharmacy', name: 'Farmácia Hospitalar & CAF', short: 'FARMÁCIA', code: '03•FARM', col: 26, row: 2, w: 11, h: 11, category: 'Dispensação', baseColor: '#121633', accentColor: '#818cf8', type: 'support' },
  { id: 'lab', name: 'Laboratório de Análises Clínicas', short: 'LABORATÓRIO', code: '04•LAB', col: 38, row: 2, w: 12, h: 11, category: 'Diagnóstico', baseColor: '#081f2c', accentColor: '#22d3ee', type: 'support' },
  { id: 'radiology', name: 'Diagnóstico por Imagem (RX/TC)', short: 'RADIOLOGIA', code: '05•RX', col: 51, row: 2, w: 11, h: 11, category: 'Bioimagem', baseColor: '#1a102e', accentColor: '#c084fc', type: 'support' },
  { id: 'admin', name: 'Diretoria & Gestão Hospitalar', short: 'DIRETORIA', code: '06•DIR', col: 63, row: 2, w: 11, h: 11, category: 'Gestão', baseColor: '#22180a', accentColor: '#fbbf24', type: 'admin' },

  // Middle Wing (rows 17..26)
  { id: 'cme', name: 'Central de Material Esterilizado', short: 'CME', code: '07•CME', col: 2, row: 17, w: 9, h: 10, category: 'Esterilização', baseColor: '#111827', accentColor: '#94a3b8', type: 'support' },
  { id: 'break', name: 'Copa & Nutrição Dietética', short: 'COPA / NUTRIÇÃO', code: '08•COPA', col: 12, row: 17, w: 11, h: 10, category: 'Suporte', baseColor: '#221908', accentColor: '#facc15', type: 'support' },
  { id: 'ward', name: 'Enfermaria de Internação', short: 'ENFERMARIA', code: '09•ENF', col: 24, row: 17, w: 14, h: 10, category: 'Internação', baseColor: '#0c1e3d', accentColor: '#60a5fa', type: 'inpatient' },
  { id: 'icu', name: 'UTI Adulto Intensiva', short: 'UTI ADULTO', code: '10•UTI', col: 39, row: 17, w: 14, h: 10, category: 'Terapia Intensiva', baseColor: '#072422', accentColor: '#2dd4bf', type: 'critical' },
  { id: 'nursing', name: 'Posto de Enfermagem Central', short: 'POSTO ENFERMAGEM', code: '11•POSTO', col: 54, row: 17, w: 20, h: 10, category: 'Supervisão', baseColor: '#06261c', accentColor: '#34d399', type: 'clinical' },

  // South Wing (rows 31..41)
  { id: 'outpatient', name: 'Ambulatório de Especialidades', short: 'AMBULATÓRIO', code: '12•AMB', col: 2, row: 31, w: 12, h: 11, category: 'Consultas', baseColor: '#071f33', accentColor: '#38bdf8', type: 'clinical' },
  { id: 'maternity', name: 'Maternidade & Berçário', short: 'MATERNIDADE', code: '13•MAT', col: 15, row: 31, w: 12, h: 11, category: 'Obstetrícia', baseColor: '#240d1e', accentColor: '#f472b6', type: 'inpatient' },
  { id: 'oncology', name: 'Oncologia & Terapia Infusional', short: 'ONCOLOGIA', code: '14•ONCO', col: 28, row: 31, w: 14, h: 11, category: 'Infusão', baseColor: '#062423', accentColor: '#14b8a6', type: 'clinical' },
  { id: 'rehab', name: 'Fisioterapia & Reabilitação', short: 'REABILITAÇÃO', code: '15•REAB', col: 43, row: 31, w: 13, h: 11, category: 'Reabilitação', baseColor: '#241a06', accentColor: '#f59e0b', type: 'clinical' },
  { id: 'psych', name: 'Saúde Mental & Psicoterapia', short: 'SAÚDE MENTAL', code: '16•PSI', col: 57, row: 31, w: 17, h: 11, category: 'Psicossocial', baseColor: '#1b0e2d', accentColor: '#c084fc', type: 'clinical' },

  // Courtyard (rows 43..47)
  { id: 'garden', name: 'Jardim Terapêutico & Convivência', short: 'JARDIM CENTRAL', code: '17•JARDIM', col: 2, row: 43, w: 72, h: 5, category: 'Área Aberta', baseColor: '#0c2214', accentColor: '#4ade80', type: 'garden' },
];

const HUAP_DOORS = [
  // North wing doorways (row 13)
  { col: 6, row: 13 }, { col: 18, row: 13 }, { col: 30, row: 13 },
  { col: 43, row: 13 }, { col: 55, row: 13 }, { col: 67, row: 13 },
  // Middle wing north doorways (row 16)
  { col: 5, row: 16 }, { col: 16, row: 16 }, { col: 30, row: 16 },
  { col: 44, row: 16 }, { col: 62, row: 16 },
  // Middle wing south doorways (row 27)
  { col: 5, row: 27 }, { col: 16, row: 27 }, { col: 30, row: 27 },
  { col: 44, row: 27 }, { col: 62, row: 27 },
  // South wing north doorways (row 30)
  { col: 7, row: 30 }, { col: 20, row: 30 }, { col: 34, row: 30 },
  { col: 48, row: 30 }, { col: 64, row: 30 },
  // South wing south doorways (row 42)
  { col: 7, row: 42 }, { col: 20, row: 42 }, { col: 34, row: 42 },
  { col: 48, row: 42 }, { col: 64, row: 42 },
];

const HUAP_STAFF = [
  { id: 'ana', name: 'Ana Beatriz', role: 'Recepcionista', col: 6, row: 5, color: '#f43f5e', code: 'REC' },
  { id: 'carlos', name: 'Enf. Carlos', role: 'Emergencista', col: 18, row: 6, color: '#ef4444', code: 'PS' },
  { id: 'helena', name: 'Dra. Helena', role: 'Farmacêutica', col: 31, row: 6, color: '#818cf8', code: 'FARM' },
  { id: 'joaquim', name: 'Sr. Joaquim', role: 'Biomédico', col: 43, row: 6, color: '#22d3ee', code: 'LAB' },
  { id: 'teresa', name: 'Dra. Teresa', role: 'Diretora', col: 68, row: 6, color: '#fbbf24', code: 'DIR' },
  { id: 'amanda', name: 'Téc. Amanda', role: 'Esterilização', col: 6, row: 21, color: '#94a3b8', code: 'CME' },
  { id: 'maria', name: 'Dona Maria', role: 'Enfermeira', col: 30, row: 21, color: '#60a5fa', code: 'ENF' },
  { id: 'marcos', name: 'Dr. Marcos', role: 'Intensivista', col: 45, row: 21, color: '#2dd4bf', code: 'UTI' },
  { id: 'roberto', name: 'Enf. Roberto', role: 'Coordenador', col: 63, row: 21, color: '#34d399', code: 'POSTO' },
  { id: 'luciana', name: 'Dra. Luciana', role: 'Obstetra', col: 20, row: 36, color: '#f472b6', code: 'MAT' },
  { id: 'samuel', name: 'Enf. Samuel', role: 'CME Sênior', col: 5, row: 23, color: '#38bdf8', code: 'CME' },
  { id: 'rita', name: 'Dona Rita', role: 'Higienização', col: 10, row: 14, color: '#e2e8f0', code: 'CCIH' },
];

export function LiveGameplayCanvas({ player }: { player: LiveGameplayPlayer }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Map real Phaser world coordinates (0..2432 x 0..1600) to Canvas dimensions
  const realX = player.x ?? 400;
  const realY = player.y ?? 300;

  // Internal high-definition drawing dimensions
  const CANVAS_W = 1120;
  const CANVAS_H = 580;
  const PAD_X = 24;
  const PAD_Y = 38;
  const MAP_W = 1072;
  const MAP_H = 488;

  const toX = (col: number) => PAD_X + (col / 76) * MAP_W;
  const toY = (row: number) => PAD_Y + (row / 50) * MAP_H;
  const toW = (cols: number) => (cols / 76) * MAP_W;
  const toH = (rows: number) => (rows / 50) * MAP_H;

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameCount = 0;

    const render = () => {
      frameCount++;
      const w = CANVAS_W;
      const h = CANVAS_H;

      // Smooth position lerp with 0 delay (high reactivity: 0.22)
      const dx = posRef.current.targetX - posRef.current.x;
      const dy = posRef.current.targetY - posRef.current.y;
      const dist = Math.hypot(dx, dy);

      posRef.current.x += dx * 0.22;
      posRef.current.y += dy * 0.22;

      const px = posRef.current.x;
      const py = posRef.current.y;
      const facing = posRef.current.facing;
      const isCurrentlyMoving = posRef.current.isMoving || dist > 1.2;

      // ── 1. ARCHITECTURAL CAD BLUEPRINT BACKDROP ──
      ctx.fillStyle = "#060b14";
      ctx.fillRect(0, 0, w, h);

      // Fine millimeter blueprint grid
      ctx.strokeStyle = "rgba(56, 189, 248, 0.035)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let x = PAD_X; x <= PAD_X + MAP_W; x += 14.1) {
        ctx.moveTo(x, PAD_Y);
        ctx.lineTo(x, PAD_Y + MAP_H);
      }
      for (let y = PAD_Y; y <= PAD_Y + MAP_H; y += 9.76) {
        ctx.moveTo(PAD_X, y);
        ctx.lineTo(PAD_X + MAP_W, y);
      }
      ctx.stroke();

      // Major structural axis lines
      ctx.strokeStyle = "rgba(56, 189, 248, 0.07)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = PAD_X; x <= PAD_X + MAP_W; x += 70.5) {
        ctx.moveTo(x, PAD_Y);
        ctx.lineTo(x, PAD_Y + MAP_H);
      }
      for (let y = PAD_Y; y <= PAD_Y + MAP_H; y += 48.8) {
        ctx.moveTo(PAD_X, y);
        ctx.lineTo(PAD_X + MAP_W, y);
      }
      ctx.stroke();

      // Architectural crosshairs at outer corners
      const drawCross = (cx: number, cy: number) => {
        ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx - 6, cy); ctx.lineTo(cx + 6, cy);
        ctx.moveTo(cx, cy - 6); ctx.lineTo(cx, cy + 6);
        ctx.stroke();
      };
      drawCross(PAD_X, PAD_Y);
      drawCross(PAD_X + MAP_W, PAD_Y);
      drawCross(PAD_X, PAD_Y + MAP_H);
      drawCross(PAD_X + MAP_W, PAD_Y + MAP_H);

      // ── 2. HOSPITAL MAIN CIRCULATION CORRIDORS ──
      // Corridors tone (terrazzo circulation floor)
      ctx.fillStyle = "#0a1322";
      ctx.fillRect(toX(2), toY(2), toW(72), toH(46));

      // Corridor lane center dashed markings
      ctx.strokeStyle = "rgba(148, 163, 184, 0.15)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      // North corridor (row 14.5)
      ctx.beginPath();
      ctx.moveTo(toX(3), toY(14.5));
      ctx.lineTo(toX(73), toY(14.5));
      // South corridor (row 28.5)
      ctx.moveTo(toX(3), toY(28.5));
      ctx.lineTo(toX(73), toY(28.5));
      ctx.stroke();
      ctx.setLineDash([]);

      // ── 3. RENDER ARCHITECTURAL DEPARTMENT SECTORS (BIM LEVEL) ──
      // Detect student sector
      let currentActiveSector: SectorDef | null = null;
      HUAP_SECTORS.forEach((sec) => {
        const sx = toX(sec.col);
        const sy = toY(sec.row);
        const sw = toW(sec.w);
        const sh = toH(sec.h);
        if (px >= sx && px <= sx + sw && py >= sy && py <= sy + sh) {
          currentActiveSector = sec;
        }
      });

      HUAP_SECTORS.forEach((sec) => {
        const sx = toX(sec.col);
        const sy = toY(sec.row);
        const sw = toW(sec.w);
        const sh = toH(sec.h);
        const isActive = currentActiveSector?.id === sec.id;

        // Sector Floor Fill with subtle clean gradient
        const floorGrad = ctx.createLinearGradient(sx, sy, sx, sy + sh);
        floorGrad.addColorStop(0, sec.baseColor);
        floorGrad.addColorStop(1, isActive ? "#082c3f" : "#050b14");
        ctx.fillStyle = floorGrad;
        ctx.fillRect(sx, sy, sw, sh);

        // Floor sterile vinyl tile pattern (subtle 1px grid)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let tx = sx + 14; tx < sx + sw; tx += 14) {
          ctx.moveTo(tx, sy); ctx.lineTo(tx, sy + sh);
        }
        for (let ty = sy + 12; ty < sy + sh; ty += 12) {
          ctx.moveTo(sx, ty); ctx.lineTo(sx + sw, ty);
        }
        ctx.stroke();

        // If sector is active, draw soft glowing ambient border and radar ping
        if (isActive) {
          ctx.fillStyle = "rgba(6, 182, 212, 0.12)";
          ctx.fillRect(sx, sy, sw, sh);

          ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
          ctx.lineWidth = 2;
          ctx.strokeRect(sx, sy, sw, sh);

          // Active sector radar sweep wave in corner
          const sweepAngle = (frameCount * 0.05) % (Math.PI * 2);
          ctx.save();
          ctx.beginPath();
          ctx.arc(sx + sw - 14, sy + 14, 10, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(56, 189, 248, 0.08)";
          ctx.fill();
          ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(sx + sw - 14, sy + 14);
          ctx.arc(sx + sw - 14, sy + 14, 10, sweepAngle, sweepAngle + 0.6);
          ctx.closePath();
          ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
          ctx.fill();
          ctx.restore();
        } else {
          // Standard structural boundary
          ctx.strokeStyle = "rgba(51, 65, 85, 0.7)";
          ctx.lineWidth = 1.2;
          ctx.strokeRect(sx, sy, sw, sh);
        }

        // Sector Architectural Title Tag (Crisp & High Contrast)
        ctx.fillStyle = isActive ? sec.accentColor : "rgba(226, 232, 240, 0.85)";
        ctx.font = "bold 9px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(sec.short, sx + 6, sy + 13);

        // Sector Code & Category pill
        ctx.fillStyle = isActive ? "#38bdf8" : "rgba(148, 163, 184, 0.55)";
        ctx.font = "8px monospace";
        ctx.fillText(sec.code, sx + 6, sy + 23);

        // ── Sector Interior Furniture & Clinical Props (Scaled & Authentic) ──
        ctx.save();
        if (sec.id === 'ward' || sec.id === 'icu') {
          // Hospital Beds with linens & pillows
          const bedCount = 4;
          const bedSpacing = (sw - 20) / bedCount;
          for (let b = 0; b < bedCount; b++) {
            const bx = sx + 10 + b * bedSpacing;
            const by = sy + sh - 28;
            // Bed frame
            ctx.fillStyle = "#1e293b";
            ctx.fillRect(bx, by, 14, 22);
            // Mattress & sheet
            ctx.fillStyle = sec.id === 'icu' ? "#0d9488" : "#3b82f6";
            ctx.fillRect(bx + 1, by + 4, 12, 16);
            // Pillow
            ctx.fillStyle = "#f8fafc";
            ctx.fillRect(bx + 2, by + 1, 10, 4);

            // In ICU: Vital ECG Monitor pole
            if (sec.id === 'icu') {
              ctx.fillStyle = "#0f172a";
              ctx.fillRect(bx + 15, by + 2, 6, 6);
              ctx.strokeStyle = "#22c55e";
              ctx.lineWidth = 0.8;
              // Animated heartbeat line
              ctx.beginPath();
              ctx.moveTo(bx + 15, by + 5);
              ctx.lineTo(bx + 17, by + 3);
              ctx.lineTo(bx + 18, by + 6);
              ctx.lineTo(bx + 20, by + 5);
              ctx.stroke();
            }
          }
        } else if (sec.id === 'emergency') {
          // 3 Trauma Stretchers with red identification
          for (let s = 0; s < 3; s++) {
            const sxPos = sx + 12 + s * 38;
            const syPos = sy + sh - 26;
            ctx.fillStyle = "#334155";
            ctx.fillRect(sxPos, syPos, 13, 20);
            ctx.fillStyle = "#e11d48";
            ctx.fillRect(sxPos + 1.5, syPos + 4, 10, 14);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(sxPos + 2.5, syPos + 1.5, 8, 3.5);
          }
        } else if (sec.id === 'cme') {
          // Stainless steel autoclaves & sterilization inspection counter
          ctx.fillStyle = "#475569";
          ctx.fillRect(sx + 8, sy + sh - 26, 22, 18);
          // Circular autoclave pressure doors
          ctx.fillStyle = "#94a3b8";
          ctx.beginPath(); ctx.arc(sx + 19, sy + sh - 17, 6, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "#0ea5e9"; ctx.lineWidth = 1; ctx.stroke();
          // Inspection bench
          ctx.fillStyle = "#334155";
          ctx.fillRect(sx + 36, sy + sh - 22, 38, 12);
        } else if (sec.id === 'pharmacy') {
          // Modular medication dispensaries
          for (let r = 0; r < 3; r++) {
            ctx.fillStyle = "#334155";
            ctx.fillRect(sx + 10 + r * 34, sy + 30, 24, 8);
            ctx.fillStyle = "#818cf8";
            ctx.fillRect(sx + 12 + r * 34, sy + 32, 20, 4);
          }
        } else if (sec.id === 'lab') {
          // Central analysis benches with analyzers
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(sx + 12, sy + sh - 26, 58, 14);
          ctx.fillStyle = "#22d3ee";
          ctx.fillRect(sx + 18, sy + sh - 24, 10, 4);
          ctx.fillRect(sx + 38, sy + sh - 24, 10, 4);
        } else if (sec.id === 'nursing') {
          // Semi-circular nursing desk
          ctx.strokeStyle = "#10b981";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(sx + 40, sy + sh - 22, 20, Math.PI, 0);
          ctx.stroke();
          // Terminals on desk
          ctx.fillStyle = "#38bdf8";
          ctx.fillRect(sx + 28, sy + sh - 26, 5, 4);
          ctx.fillRect(sx + 48, sy + sh - 26, 5, 4);
        } else if (sec.id === 'reception') {
          // Reception counter and waiting chairs
          ctx.fillStyle = "#334155";
          ctx.fillRect(sx + 12, sy + 32, 42, 7);
          ctx.fillStyle = "#38bdf8";
          ctx.fillRect(sx + 16, sy + 30, 6, 3);
          ctx.fillRect(sx + 36, sy + 30, 6, 3);
        } else if (sec.id === 'maternity') {
          // 2 incubators with warm amber glow
          for (let inc = 0; inc < 2; inc++) {
            const ix = sx + 12 + inc * 42;
            const iy = sy + sh - 26;
            ctx.fillStyle = "#334155";
            ctx.fillRect(ix, iy, 14, 18);
            ctx.fillStyle = "rgba(251, 191, 36, 0.45)";
            ctx.beginPath(); ctx.arc(ix + 7, iy + 8, 5, 0, Math.PI * 2); ctx.fill();
          }
        } else if (sec.id === 'garden') {
          // Therapeutic garden trees and stone benches
          ctx.fillStyle = "rgba(34, 197, 94, 0.22)";
          ctx.beginPath();
          ctx.arc(sx + 35, sy + 24, 12, 0, Math.PI * 2);
          ctx.arc(sx + 120, sy + 24, 14, 0, Math.PI * 2);
          ctx.arc(sx + 240, sy + 24, 12, 0, Math.PI * 2);
          ctx.arc(sx + 360, sy + 24, 15, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // ── 4. ARCHITECTURAL WALL PARTITIONS & DOORWAYS (CAD PRECISION) ──
      // Outer perimeter structural walls
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 3.5;
      ctx.strokeRect(toX(1), toY(1), toW(74), toH(48));

      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1;
      ctx.strokeRect(toX(1), toY(1), toW(74), toH(48));

      // Structural Wing Dividers
      const drawWallH = (col1: number, row: number, col2: number) => {
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(toX(col1), toY(row));
        ctx.lineTo(toX(col2), toY(row));
        ctx.stroke();
      };
      drawWallH(2, 13, 74);
      drawWallH(2, 16, 74);
      drawWallH(2, 27, 74);
      drawWallH(2, 30, 74);
      drawWallH(2, 42, 74);

      // Cut door openings with architectural door swing arcs
      HUAP_DOORS.forEach((d) => {
        const dxPos = toX(d.col);
        const dyPos = toY(d.row);
        const dw = toW(2);

        // Erase wall segment for door passage
        ctx.fillStyle = "#0a1322";
        ctx.fillRect(dxPos - 1, dyPos - 3, dw + 2, 6);

        // Door swing arc (architectural drafting)
        ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.arc(dxPos, dyPos, dw, 0, Math.PI / 2);
        ctx.stroke();
      });

      // ── 5. REAL HOSPITAL PERSONNEL / NPCS (CLINICAL ROLES) ──
      HUAP_STAFF.forEach((npc) => {
        const nx = toX(npc.col);
        const ny = toY(npc.row);
        const npcDist = Math.hypot(px - nx, py - ny);

        // Proximity Telemetry Line when player is close
        if (npcDist < 65) {
          ctx.strokeStyle = "rgba(52, 211, 153, 0.6)";
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(nx, ny);
          ctx.stroke();
          ctx.setLineDash([]);

          // Interaction node pulse
          ctx.fillStyle = "#34d399";
          ctx.beginPath(); ctx.arc(nx, ny - 16, 2.5, 0, Math.PI * 2); ctx.fill();
        }

        // Miniature Hospital Staff Figure
        // Shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
        ctx.beginPath(); ctx.ellipse(nx, ny + 7, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();

        // Clinical coat / uniform
        ctx.fillStyle = npc.color;
        ctx.fillRect(nx - 4.5, ny - 2, 9, 9);

        // Head
        ctx.fillStyle = "#f5c5a3";
        ctx.beginPath(); ctx.arc(nx, ny - 6, 4.5, 0, Math.PI * 2); ctx.fill();

        // Miniature stethoscope / ID badge
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(nx - 1, ny, 2, 3);

        // Staff Tag (Non-obstructive compact pill)
        ctx.fillStyle = "rgba(2, 6, 23, 0.88)";
        ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
        ctx.lineWidth = 0.8;
        const tagText = npc.name.slice(0, 11);
        ctx.beginPath();
        ctx.roundRect(nx - 28, ny - 18, 56, 10, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#e2e8f0";
        ctx.font = "bold 7px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(tagText, nx, ny - 10.5);
      });

      // ── 6. STUDENT PLAYER AVATAR (LEADER IN CLINCAL SCRUBS) ──
      const bounce = isCurrentlyMoving ? Math.sin(frameCount * 0.35) * 2.5 : Math.sin(frameCount * 0.1) * 0.8;

      // Soft directional field-of-view illumination
      ctx.save();
      ctx.translate(px, py);
      let angle = Math.PI / 2; // default down
      if (facing === 'up') angle = -Math.PI / 2;
      else if (facing === 'left') angle = Math.PI;
      else if (facing === 'right') angle = 0;

      const coneGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 48);
      coneGrad.addColorStop(0, "rgba(56, 189, 248, 0.28)");
      coneGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 48, angle - 0.45, angle + 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Tactical Position Radar Beacon under player's feet
      const pulseR = 8 + (frameCount % 40) * 0.4;
      const pulseAlpha = Math.max(0, 1 - (frameCount % 40) / 40);
      ctx.strokeStyle = `rgba(16, 185, 129, ${pulseAlpha * 0.8})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(px, py + 8, pulseR, 0, Math.PI * 2);
      ctx.stroke();

      // Footstep particles when walking
      if (isCurrentlyMoving && frameCount % 4 === 0) {
        ctx.fillStyle = "rgba(56, 189, 248, 0.4)";
        ctx.beginPath();
        ctx.arc(px - 3 + Math.random() * 6, py + 9, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.beginPath(); ctx.ellipse(px, py + 8, 8, 3.5, 0, 0, Math.PI * 2); ctx.fill();

      // Clinical uniform (Teal Medical Scrubs)
      ctx.fillStyle = "#0d9488";
      ctx.fillRect(px - 6, py - 3 + bounce, 12, 12);

      // Student head
      ctx.fillStyle = "#fed7aa";
      ctx.beginPath(); ctx.arc(px, py - 9 + bounce, 6.5, 0, Math.PI * 2); ctx.fill();

      // Nurse Cap with Red Cross
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(px - 5, py - 16 + bounce, 10, 4);
      ctx.fillStyle = "#e11d48";
      ctx.fillRect(px - 1, py - 15 + bounce, 2, 2);

      // Stethoscope
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(px, py - 2 + bounce, 3.5, 0, Math.PI);
      ctx.stroke();

      // Student Leader Floating Tag with Crown
      const displayNickObj = getDisplayNickname(player.playerName);
      const nickLabel = (displayNickObj.firstName.length > 14 ? displayNickObj.firstName.slice(0, 13) : displayNickObj.firstName).toUpperCase();

      const tagW = Math.max(90, nickLabel.length * 7 + 36);
      ctx.fillStyle = "rgba(2, 6, 23, 0.94)";
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(px - tagW / 2, py - 32 + bounce, tagW, 14, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#34d399";
      ctx.font = "bold 8.5px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`👑 ${nickLabel} (LÍDER)`, px, py - 22.5 + bounce);

      // ── 7. COMMAND CENTER IN-CANVAS OPERATIONAL HUD (TOP & BOTTOM DOCKS) ──
      // Top-Left: Hospital Command Center Header Badge
      ctx.fillStyle = "rgba(2, 6, 23, 0.88)";
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(PAD_X + 6, PAD_Y + 6, 280, 22, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 9.5px monospace";
      ctx.textAlign = "left";
      ctx.fillText("🏥 HUAP • CENTRO DE CONTROLE OPERACIONAL (CCO)", PAD_X + 14, PAD_Y + 20);

      // Top-Right: Direct Live Telemetry Indicator
      ctx.fillStyle = "rgba(2, 6, 23, 0.88)";
      ctx.strokeStyle = "rgba(225, 29, 72, 0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(w - PAD_X - 250, PAD_Y + 6, 244, 22, 4);
      ctx.fill();
      ctx.stroke();

      // Blinking Live Red Beacon
      const isBeaconOn = (frameCount % 40) < 26;
      ctx.fillStyle = isBeaconOn ? "#ef4444" : "#7f1d1d";
      ctx.beginPath(); ctx.arc(w - PAD_X - 238, PAD_Y + 17, 4, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "left";
      ctx.fillText("TRANSMISSÃO DIRETA • 60 FPS • 0.0s LATÊNCIA", w - PAD_X - 228, PAD_Y + 20);

      // Bottom Telemetry Bar: Non-obstructive Status Strip
      const bottomBarY = h - 26;
      ctx.fillStyle = "rgba(2, 6, 23, 0.92)";
      ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(PAD_X, bottomBarY - 2, MAP_W, 24, 4);
      ctx.fill();
      ctx.stroke();

      // Bottom Left: Active Sector Code
      const sectorName = currentActiveSector ? `${currentActiveSector.code} — ${currentActiveSector.name}` : (player.currentRoom || "CORREDOR CENTRAL");
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 8.5px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`📍 SETOR: ${sectorName.slice(0, 36)}`, PAD_X + 10, bottomBarY + 13);

      // Bottom Center: Current Clinical Action
      const actionRaw = player.lastActivity || "Explorando as dependências do HUAP";
      const actionDisplay = actionRaw.length > 44 ? actionRaw.slice(0, 42) + "..." : actionRaw;
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "8.5px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`ATIVIDADE: "${actionDisplay}"`, PAD_X + MAP_W / 2, bottomBarY + 13);

      // Bottom Right: Real Coordinates & Sync
      ctx.fillStyle = "#34d399";
      ctx.font = "8.5px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`COORD: (X:${Math.round(realX)}, Y:${Math.round(realY)}) ● SINCRONIZADO`, PAD_X + MAP_W - 10, bottomBarY + 13);

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [normX, normY, player.facing, player.isMoving, player.lastActivity, player.playerName, realX, realY]);

  return (
    <div className="relative w-full aspect-[16/9] sm:aspect-[2/1] bg-[#030712] rounded-xl overflow-hidden border border-cyan-500/30 shadow-2xl ring-1 ring-white/5">
      <canvas ref={canvasRef} width={1120} height={580} className="w-full h-full block" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] opacity-5 [background-size:16px_16px]" />
    </div>
  );
}
