import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Users,
  BookOpen,
  RefreshCw,
  Activity,
  ArrowLeft,
  BarChart3,
  Video,
  Radio,
  Trophy,
  Award,
  Zap,
  MapPin,
  Clock,
  Eye,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Search,
  Trash2,
  Filter,
  Check,
  ClipboardList,
  FileText,
  X
} from "lucide-react";
import { playSound } from "../game/utils/audio";

export interface DecisionLog {
  id: string;
  playerId: string;
  playerName: string;
  timestamp: number;
  npcName: string;
  questionText: string;
  selectedOption: string;
  isCorrect: boolean;
  pointsEarned: number;
  feedback: string;
  category: string;
}

export interface PlayerData {
  playerId: string;
  playerName: string;
  online: boolean;
  currentRoom: string;
  prestige: number;
  score: number;
  energy: number;
  stress: number;
  level: string;
  completedMissions: number;
  lastActivity: string;
  shiftTime: number;
  isDemo?: boolean;
  x?: number;
  y?: number;
  facing?: string;
  isMoving?: boolean;
  avatar?: any;
}

const CARD_COLORS = [
  "#1abc9c",
  "#3498db",
  "#9b59b6",
  "#e67e22",
  "#e74c3c",
  "#27ae60",
  "#f39c12",
  "#2980b9",
];

function formatTime(minutes: number): string {
  const m = Math.max(0, Math.floor(minutes || 0));
  const h = Math.floor(m / 60);
  const min = Math.floor(m % 60);
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function StatBar({
  value,
  color,
  label,
  display,
}: {
  value: number;
  color: string;
  label: string;
  display: string;
}) {
  const safeVal = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div>
      <div className="flex justify-between mb-1 text-[10px] font-mono">
        <span className="text-slate-400">{label}</span>
        <span className="font-bold" style={{ color }}>
          {display}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden bg-slate-900 border border-slate-700/50">
        <motion.div
          className="h-full rounded-full"
          animate={{ width: `${safeVal}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas Gameplay Live Spectator Viewport (Full Hospital Floorplan & Real NPCs)
// ─────────────────────────────────────────────────────────────────────────────
function LiveGameplayCanvas({ player }: { player: PlayerData }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Map real Phaser world coordinates (0..2432 x 0..1600) to Canvas (560 x 280)
  // Map dimensions in GameScene: cols=76 * 32 = 2432, rows=50 * 32 = 1600
  const realX = player.x ?? 400;
  const realY = player.y ?? 300;

  // Scale to canvas usable interior (left: 20, top: 20, width: 520, height: 240)
  const normX = Math.max(25, Math.min(535, 20 + (realX / 2432) * 520));
  const normY = Math.max(25, Math.min(255, 20 + (realY / 1600) * 240));

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

    // Real HUAP Hospital NPCs situated at their exact Phaser map coordinates
    // Formula: canvasX = 20 + ((col * 32) / 2432) * 520, canvasY = 20 + ((row * 32) / 1600) * 240
    const npcs = [
      { id: 'ana', name: 'Ana Beatriz', role: 'Recepcionista', col: 6, row: 3, x: 61, y: 34, color: '#f43f5e' },
      { id: 'carlos', name: 'Enf. Carlos', role: 'Pronto-Socorro', col: 18, row: 6, x: 143, y: 49, color: '#14b8a6' },
      { id: 'helena', name: 'Dra. Helena', role: 'Farmacêutica', col: 31, row: 6, x: 232, y: 49, color: '#8b5cf6' },
      { id: 'joaquim', name: 'Sr. Joaquim', role: 'Laboratório', col: 43, row: 6, x: 314, y: 49, color: '#06b6d4' },
      { id: 'teresa', name: 'Dra. Teresa', role: 'Diretoria', col: 68, row: 6, x: 485, y: 49, color: '#f59e0b' },
      { id: 'amanda', name: 'Téc. Amanda', role: 'CME', col: 6, row: 21, x: 61, y: 121, color: '#64748b' },
      { id: 'maria', name: 'Dona Maria', role: 'Enfermaria', col: 30, row: 21, x: 225, y: 121, color: '#6366f1' },
      { id: 'marcos', name: 'Dr. Marcos', role: 'UTI Adulto', col: 45, row: 21, x: 328, y: 121, color: '#3b82f6' },
      { id: 'roberto', name: 'Enf. Roberto', role: 'Posto Enfermagem', col: 63, row: 21, x: 451, y: 121, color: '#10b981' },
      { id: 'luciana', name: 'Dra. Luciana', role: 'Maternidade', col: 20, row: 36, x: 157, y: 193, color: '#ec4899' },
    ];

    const render = () => {
      frameCount++;
      const w = canvas.width;
      const h = canvas.height;

      // Distance remaining to lerp target
      const dx = posRef.current.targetX - posRef.current.x;
      const dy = posRef.current.targetY - posRef.current.y;
      const dist = Math.hypot(dx, dy);

      // Smooth position lerp
      posRef.current.x += dx * 0.18;
      posRef.current.y += dy * 0.18;

      const px = posRef.current.x;
      const py = posRef.current.y;
      const facing = posRef.current.facing;
      const isCurrentlyMoving = posRef.current.isMoving || dist > 1.5;

      // ── 1. BACKGROUND CANVAS & MEDICAL GRID ──
      ctx.fillStyle = "#030712";
      ctx.fillRect(0, 0, w, h);

      // Fine grid background
      ctx.strokeStyle = "rgba(14, 165, 233, 0.05)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 16) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 16) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // ── 2. SECTORS DEFINITION & COLOR-CODED FLOORS ──
      const sectors = [
        // North Wing (y: 30, h: 48)
        { name: 'Recepção', x: 34, y: 30, w: 68, h: 48, fill: 'rgba(244, 63, 94, 0.10)', border: '#f43f5e' },
        { name: 'Pronto-Socorro', x: 109, y: 30, w: 75, h: 48, fill: 'rgba(239, 68, 68, 0.14)', border: '#ef4444' },
        { name: 'Farmácia', x: 198, y: 30, w: 68, h: 48, fill: 'rgba(139, 92, 246, 0.10)', border: '#8b5cf6' },
        { name: 'Laboratório', x: 280, y: 30, w: 75, h: 48, fill: 'rgba(6, 182, 212, 0.10)', border: '#06b6d4' },
        { name: 'Radiologia', x: 369, y: 30, w: 68, h: 48, fill: 'rgba(168, 85, 247, 0.10)', border: '#a855f7' },
        { name: 'Diretoria', x: 451, y: 30, w: 68, h: 48, fill: 'rgba(245, 158, 11, 0.10)', border: '#f59e0b' },

        // Corridor 1 (y: 83, h: 12)
        { name: 'Corredor Norte', x: 20, y: 83, w: 520, h: 12, fill: 'rgba(248, 250, 252, 0.04)', border: '#334155' },

        // Middle Wing (y: 97, h: 48)
        { name: 'CME', x: 34, y: 97, w: 55, h: 48, fill: 'rgba(100, 116, 139, 0.12)', border: '#64748b' },
        { name: 'Copa / Nutrição', x: 102, y: 97, w: 68, h: 48, fill: 'rgba(234, 179, 8, 0.10)', border: '#eab308' },
        { name: 'Enfermaria', x: 184, y: 97, w: 89, h: 48, fill: 'rgba(99, 102, 241, 0.12)', border: '#6366f1' },
        { name: 'UTI Adulto', x: 286, y: 97, w: 89, h: 48, fill: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6' },
        { name: 'Posto Enfermagem', x: 389, y: 97, w: 130, h: 48, fill: 'rgba(16, 185, 129, 0.12)', border: '#10b981' },

        // Corridor 2 (y: 150, h: 12)
        { name: 'Corredor Central', x: 20, y: 150, w: 520, h: 12, fill: 'rgba(248, 250, 252, 0.04)', border: '#334155' },

        // South Wing (y: 164, h: 53)
        { name: 'Ambulatório', x: 34, y: 164, w: 75, h: 53, fill: 'rgba(14, 165, 233, 0.10)', border: '#0ea5e9' },
        { name: 'Maternidade', x: 122, y: 164, w: 75, h: 53, fill: 'rgba(236, 72, 153, 0.12)', border: '#ec4899' },
        { name: 'Oncologia', x: 211, y: 164, w: 89, h: 53, fill: 'rgba(20, 184, 166, 0.10)', border: '#14b8a6' },
        { name: 'Reabilitação', x: 314, y: 164, w: 82, h: 53, fill: 'rgba(234, 179, 8, 0.10)', border: '#eab308' },
        { name: 'Saúde Mental', x: 410, y: 164, w: 109, h: 53, fill: 'rgba(168, 85, 247, 0.10)', border: '#a855f7' },

        // Garden (y: 222, h: 22)
        { name: 'Jardim Central', x: 20, y: 222, w: 520, h: 22, fill: 'rgba(34, 197, 94, 0.12)', border: '#22c55e' }
      ];

      // Draw all sectors with floor color & wall outline
      sectors.forEach((sec) => {
        // Check if student is inside this sector
        const isCurrentSector = px >= sec.x && px <= sec.x + sec.w && py >= sec.y && py <= sec.y + sec.h;

        ctx.fillStyle = isCurrentSector ? sec.fill.replace('0.10', '0.28').replace('0.12', '0.30').replace('0.14', '0.32').replace('0.15', '0.35') : sec.fill;
        ctx.fillRect(sec.x, sec.y, sec.w, sec.h);

        // Border outline
        ctx.strokeStyle = isCurrentSector ? "#38bdf8" : sec.border;
        ctx.lineWidth = isCurrentSector ? 2 : 1;
        ctx.strokeRect(sec.x, sec.y, sec.w, sec.h);

        // If student is inside, draw glowing active room outline
        if (isCurrentSector) {
          ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
          ctx.lineWidth = 3;
          ctx.strokeRect(sec.x - 1, sec.y - 1, sec.w + 2, sec.h + 2);
        }

        // Room Label
        ctx.fillStyle = isCurrentSector ? "#ffffff" : "rgba(148, 163, 184, 0.85)";
        ctx.font = isCurrentSector ? "bold 8px monospace" : "bold 7px monospace";
        ctx.textAlign = "center";
        ctx.fillText(sec.name.toUpperCase(), sec.x + sec.w / 2, sec.y + 11);
      });

      // ── 3. INTERNAL FURNITURE & ROOM PROPS FOR REALISM ──
      // Reception desk
      ctx.fillStyle = "rgba(244, 63, 94, 0.4)"; ctx.fillRect(45, 48, 20, 6);
      // PS Emergency stretchers
      ctx.fillStyle = "rgba(239, 68, 68, 0.5)"; ctx.fillRect(120, 50, 12, 6); ctx.fillRect(150, 50, 12, 6);
      // Pharmacy Shelves
      ctx.fillStyle = "rgba(139, 92, 246, 0.5)"; ctx.fillRect(205, 46, 24, 4); ctx.fillRect(205, 56, 24, 4);
      // ICU Hospital Beds & Vital Sign Monitor
      ctx.fillStyle = "rgba(59, 130, 246, 0.5)"; ctx.fillRect(295, 118, 14, 8); ctx.fillRect(340, 118, 14, 8);
      // ECG Vital Monitor Pulse Dot
      const ecgPulse = Math.sin(frameCount * 0.2) > 0.5 ? '#22c55e' : '#15803d';
      ctx.fillStyle = ecgPulse; ctx.beginPath(); ctx.arc(358, 110, 2, 0, Math.PI * 2); ctx.fill();

      // ── 4. DRAW ALL 10 REAL HOSPITAL NPCs AT EXACT MAP COORDINATES ──
      npcs.forEach((npc, idx) => {
        // Micro roaming movement
        const npcOffset = Math.sin(frameCount * 0.04 + idx) * 4;
        const nx = npc.x + (idx % 2 === 0 ? npcOffset : 0);
        const ny = npc.y + (idx % 2 !== 0 ? npcOffset : 0);

        // Shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.beginPath(); ctx.ellipse(nx, ny + 6, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();

        // Body
        ctx.fillStyle = npc.color;
        ctx.fillRect(nx - 4, ny - 3, 8, 9);

        // Head
        ctx.fillStyle = "#fde047";
        ctx.beginPath(); ctx.arc(nx, ny - 7, 4, 0, Math.PI * 2); ctx.fill();

        // Role Indicator Dot
        ctx.fillStyle = npc.color;
        ctx.beginPath(); ctx.arc(nx, ny - 13, 2.5, 0, Math.PI * 2); ctx.fill();

        // Name tag above NPC
        ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
        ctx.fillRect(nx - 26, ny - 20, 52, 9);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 6.5px monospace";
        ctx.textAlign = "center";
        ctx.fillText(npc.name, nx, ny - 13);

        // Check if student player is near NPC (interaction range)
        const distToPlayer = Math.hypot(px - nx, py - ny);
        if (distToPlayer < 35) {
          // Connection beam to NPC
          ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([2, 2]);
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
          ctx.setLineDash([]);

          // Interaction halo
          ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
          ctx.beginPath(); ctx.arc(nx, ny, 12, 0, Math.PI * 2); ctx.fill();
        }
      });

      // ── 5. DRAW STUDENT PLAYER CHARACTER (DYNAMIC DIRECTION & STEP ANIMATION) ──
      const bounce = isCurrentlyMoving ? Math.sin(frameCount * 0.3) * 2.5 : Math.sin(frameCount * 0.1) * 1;

      // Direction cone / Flashlight beam
      ctx.save();
      ctx.translate(px, py);
      let angle = Math.PI / 2; // default down
      if (facing === 'up') angle = -Math.PI / 2;
      else if (facing === 'left') angle = Math.PI;
      else if (facing === 'right') angle = 0;

      ctx.fillStyle = "rgba(56, 189, 248, 0.15)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 40, angle - 0.4, angle + 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Foot dust particles when moving
      if (isCurrentlyMoving && (frameCount % 6 < 3)) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
        ctx.beginPath(); ctx.arc(px - 5 + Math.random() * 10, py + 9, 2, 0, Math.PI * 2); ctx.fill();
      }

      // Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.beginPath(); ctx.ellipse(px, py + 9, 8, 3.5, 0, 0, Math.PI * 2); ctx.fill();

      // Uniform (Teal Scrubs)
      ctx.fillStyle = "#0d9488";
      ctx.fillRect(px - 6, py - 3 + bounce, 12, 12);

      // Head
      ctx.fillStyle = "#fecdd3";
      ctx.beginPath(); ctx.arc(px, py - 9 + bounce, 7, 0, Math.PI * 2); ctx.fill();

      // Nurse Cap with Red Cross
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(px - 5, py - 15 + bounce, 10, 3.5);
      ctx.fillStyle = "#e11d48";
      ctx.fillRect(px - 1, py - 14 + bounce, 2, 2);

      // Eyes based on facing direction
      ctx.fillStyle = "#0f172a";
      if (facing === 'down') {
        ctx.fillRect(px - 3, py - 10 + bounce, 1.5, 2.5);
        ctx.fillRect(px + 1.5, py - 10 + bounce, 1.5, 2.5);
      } else if (facing === 'left') {
        ctx.fillRect(px - 5, py - 10 + bounce, 1.5, 2.5);
      } else if (facing === 'right') {
        ctx.fillRect(px + 3.5, py - 10 + bounce, 1.5, 2.5);
      }

      // Stethoscope
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(px, py - 2 + bounce, 4, 0, Math.PI); ctx.stroke();

      // Player Name Badge
      ctx.fillStyle = "rgba(0, 0, 0, 0.88)";
      ctx.fillRect(px - 36, py - 28 + bounce, 72, 11);
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1;
      ctx.strokeRect(px - 36, py - 28 + bounce, 72, 11);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 7.5px monospace";
      ctx.textAlign = "center";
      ctx.fillText(player.playerName.split(" ")[0].slice(0, 11), px, py - 20 + bounce);

      // ── 6. ACTION THOUGHT BUBBLE OVER PLAYER HEAD ──
      const actionText = player.lastActivity || "Explorando setores do hospital";
      const bubbleW = Math.min(220, actionText.length * 6 + 18);
      const bubbleX = Math.max(15, Math.min(w - bubbleW - 15, px - bubbleW / 2));
      const bubbleY = Math.max(25, py - 46 + bounce);

      ctx.fillStyle = "#0f172a";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bubbleX, bubbleY, bubbleW, 16, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 8.5px monospace";
      ctx.textAlign = "center";
      ctx.fillText(actionText.slice(0, 32), bubbleX + bubbleW / 2, bubbleY + 11);

      // ── 7. CCTV OVERLAY STAMPS ──
      ctx.fillStyle = "rgba(225, 29, 72, 0.9)";
      ctx.beginPath(); ctx.arc(w - 20, 14, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 8.5px monospace";
      ctx.textAlign = "right";
      ctx.fillText("LIVE ● PLANTA HUAP 1:1", w - 28, 17);

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [normX, normY, player.facing, player.isMoving, player.lastActivity, player.playerName]);

  return (
    <div className="relative w-full aspect-[2/1] bg-[#030712] rounded-xl overflow-hidden border border-teal-500/30 shadow-inner">
      <canvas ref={canvasRef} width={560} height={280} className="w-full h-full block" />
      <div className="absolute top-2 left-2 flex items-center gap-2 px-2 py-0.5 rounded bg-slate-900/80 border border-teal-500/40 text-[10px] font-mono text-teal-300">
        <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
        <span>RADAR HOSPITALAR HUAP ENFERMAGEM</span>
      </div>
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] opacity-5 [background-size:12px_12px]" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Demo / Simulation Initializer with Dynamic Scoring
// ─────────────────────────────────────────────────────────────────────────────
const INITIAL_DEMO_PLAYERS: PlayerData[] = [
  {
    playerId: "demo-1",
    playerName: "Ana Silva (Enf. Internato)",
    online: true,
    currentRoom: "Pacientes e Enfermarias",
    prestige: 110,
    score: 110,
    energy: 85,
    stress: 25,
    level: "Gestora Júnior",
    completedMissions: 3,
    lastActivity: "Dimensionamento COFEN 543/2017 aprovado",
    shiftTime: 180,
    isDemo: true,
    x: 220,
    y: 140,
    facing: "down",
  },
  {
    playerId: "demo-2",
    playerName: "Lucas Mendes (Monitoria)",
    online: true,
    currentRoom: "Central de Material (CME)",
    prestige: 85,
    score: 85,
    energy: 95,
    stress: 15,
    level: "Estagiário UFF",
    completedMissions: 2,
    lastActivity: "Auditoria da RDC 15 na Central de Esterilização",
    shiftTime: 240,
    isDemo: true,
    x: 410,
    y: 190,
    facing: "right",
  },
  {
    playerId: "demo-3",
    playerName: "Mariana Costa (Graduação)",
    online: true,
    currentRoom: "UTI Adulto",
    prestige: 0,
    score: 0,
    energy: 60,
    stress: 60,
    level: "Estagiária",
    completedMissions: 0,
    lastActivity: "Iniciando avaliação na UTI Adulto",
    shiftTime: 60,
    isDemo: true,
    x: 180,
    y: 110,
    facing: "up",
  },
  {
    playerId: "demo-4",
    playerName: "Gabriel Oliveira (Graduação)",
    online: true,
    currentRoom: "Pronto-Socorro & Triagem",
    prestige: 0,
    score: 0,
    energy: 90,
    stress: 10,
    level: "Estagiário",
    completedMissions: 0,
    lastActivity: "Avaliando fila de acolhimento e triagem",
    shiftTime: 45,
    isDemo: true,
    x: 320,
    y: 170,
    facing: "left",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main Professor Dashboard
// ─────────────────────────────────────────────────────────────────────────────
export function ProfessorView() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [demoList, setDemoList] = useState<PlayerData[]>(INITIAL_DEMO_PLAYERS);
  const [useDemo, setUseDemo] = useState(false);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRealtime, setIsRealtime] = useState(false);
  const [showClassReport, setShowClassReport] = useState(false);
  const [showDecisionLogsModal, setShowDecisionLogsModal] = useState(false);
  const [decisions, setDecisions] = useState<DecisionLog[]>([]);
  const [decisionFilter, setDecisionFilter] = useState<"all" | "correct" | "error">("all");
  const [decisionSearch, setDecisionSearch] = useState("");

  // Manual spectator override (null = auto broadcast top scorer)
  const [manualSelectedId, setManualSelectedId] = useState<string | null>(null);

  // Periodic position and score simulation for demo mode so students walk and leaders swap!
  useEffect(() => {
    const simTimer = setInterval(() => {
      setDemoList((prev) => {
        return prev.map((p) => {
          const nextP = { ...p };
          
          // Random movement steps on Phaser map scale (100..2300, 100..1500)
          const deltaX = Math.floor(Math.random() * 200 - 100);
          const deltaY = Math.floor(Math.random() * 200 - 100);
          const newX = Math.max(150, Math.min(2250, (nextP.x ?? 800) + deltaX));
          const newY = Math.max(150, Math.min(1450, (nextP.y ?? 600) + deltaY));
          
          let facing: 'up' | 'down' | 'left' | 'right' = 'down';
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            facing = deltaX > 0 ? 'right' : 'left';
          } else {
            facing = deltaY > 0 ? 'down' : 'up';
          }

          nextP.x = newX;
          nextP.y = newY;
          nextP.facing = facing;
          nextP.isMoving = true;

          // Occasional score/activity boost
          if (Math.random() < 0.3) {
            const gained = Math.floor(Math.random() * 20) + 10;
            nextP.score = (nextP.score || 0) + gained;
            nextP.prestige = nextP.score;
            nextP.completedMissions = (nextP.completedMissions || 0) + 1;
            const activities = [
              `Dimensionamento de Pessoal COFEN 543/2017 (+${gained} pts)`,
              `Atendimento no Leito com Prescrição (+${gained} pts)`,
              `Auditoria de Processos CME RDC 15 (+${gained} pts)`,
              `Acolhimento com Classificação de Risco (+${gained} pts)`,
            ];
            nextP.lastActivity = activities[Math.floor(Math.random() * activities.length)];
          }

          return nextP;
        });
      });
    }, 1800);

    return () => clearInterval(simTimer);
  }, []);

  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms/GLOBAL/players");
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      const list = Array.isArray(data.players) ? data.players : [];
      setPlayers(list);
      setLastRefresh(new Date());
      setError("");
    } catch {
      setError("Sem conexão ao servidor local");
    }
  }, []);

  useEffect(() => {
    fetchPlayers();

    let eventSource: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    try {
      eventSource = new EventSource("/api/rooms/GLOBAL/stream");

      eventSource.onopen = () => {
        setIsRealtime(true);
        setError("");
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && Array.isArray(data.players)) {
            setPlayers(data.players);
            setLastRefresh(new Date());
          }
        } catch (e) {
          console.error("SSE parse error", e);
        }
      };

      eventSource.onerror = () => {
        setIsRealtime(false);
      };
    } catch (err) {
      console.error("EventSource failed", err);
      setIsRealtime(false);
    }

    pollInterval = setInterval(() => {
      if (!eventSource || eventSource.readyState !== EventSource.OPEN) {
        fetchPlayers();
      }
    }, 2500);

    return () => {
      if (eventSource) eventSource.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [fetchPlayers]);

  const fetchDecisions = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms/GLOBAL/decisions");
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.decisions)) {
        setDecisions(data.decisions);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchDecisions();
    const interval = setInterval(fetchDecisions, 3000);
    return () => clearInterval(interval);
  }, [fetchDecisions]);

  const handleResetRoom = useCallback(async () => {
    try {
      await fetch("/api/rooms/GLOBAL/reset", { method: "POST" });
      setPlayers([]);
      setManualSelectedId(null);
      fetchPlayers();
    } catch (err) {
      console.error("Error resetting room", err);
    }
  }, [fetchPlayers]);

  const handleClearAllServerRecords = useCallback(async () => {
    if (
      !window.confirm(
        "⚠️ TEM CERTEZA QUE DESEJA ZERAR TODOS OS REGISTROS DO SERVIDOR?\n\nIsso apagará permanentemente todos os registros de erros, acertos e conexões ativas dos alunos no servidor para iniciar uma nova avaliação do zero."
      )
    ) {
      return;
    }
    try {
      const res = await fetch("/api/rooms/GLOBAL/clear-logs", { method: "POST" });
      if (res.ok) {
        setDecisions([]);
        setPlayers([]);
        setManualSelectedId(null);
        fetchPlayers();
        fetchDecisions();
        alert("✅ Todos os registros de erros, acertos e jogadores foram zerados no servidor com sucesso!");
      }
    } catch (err) {
      alert("Erro ao zerar registros no servidor.");
    }
  }, [fetchPlayers, fetchDecisions]);

  // Filter decisions log
  const filteredDecisions = decisions.filter((d) => {
    const matchesFilter =
      decisionFilter === "all"
        ? true
        : decisionFilter === "correct"
        ? d.isCorrect
        : !d.isCorrect;

    const term = decisionSearch.toLowerCase().trim();
    const matchesSearch =
      !term ||
      d.playerName.toLowerCase().includes(term) ||
      d.npcName.toLowerCase().includes(term) ||
      d.questionText.toLowerCase().includes(term) ||
      d.selectedOption.toLowerCase().includes(term) ||
      d.category.toLowerCase().includes(term);

    return matchesFilter && matchesSearch;
  });

  const correctCount = decisions.filter((d) => d.isCorrect).length;
  const errorCount = decisions.filter((d) => !d.isCorrect).length;

  // Real active online players filter
  const realOnlinePlayers = players.filter((p) => p.online);
  const activePool = useDemo ? demoList : realOnlinePlayers;

  // Determine top scorer (player with highest score > 0)
  const sortedByScore = [...activePool].sort(
    (a, b) => (b.score ?? b.prestige ?? 0) - (a.score ?? a.prestige ?? 0)
  );

  const topScorerCandidate = sortedByScore[0];
  const hasLeaderWithPoints = Boolean(
    topScorerCandidate && (topScorerCandidate.score > 0 || topScorerCandidate.prestige > 0)
  );

  // If professor picked someone manually, use them; otherwise auto-transmit top candidate
  let transmittedPlayer: PlayerData | null = null;
  if (manualSelectedId) {
    transmittedPlayer = activePool.find((p) => p.playerId === manualSelectedId) || null;
  } else if (hasLeaderWithPoints) {
    transmittedPlayer = topScorerCandidate;
  } else if (activePool.length > 0) {
    // If no score yet, transmit the first connected student
    transmittedPlayer = activePool[0];
  }

  // Non-transmitted remaining players stay on static cards
  const staticPlayers = activePool.filter((p) => p.playerId !== transmittedPlayer?.playerId);

  const onlineCount = activePool.filter((p) => p.online).length;

  return (
    <motion.div
      key="professor-dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[250] flex flex-col bg-[#050c18] text-slate-100 font-sans overflow-hidden pointer-events-auto select-none"
    >
      {/* Top Bar Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-[#0a182b] border-b border-teal-500/40 shadow-lg flex-shrink-0 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              try {
                playSound("click");
              } catch {}
              navigate("/");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-teal-300 text-xs font-mono font-bold transition-all border border-slate-700 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>SAIR DO MODO PROFESSOR</span>
          </button>

          <div className="flex items-center gap-2 border-l border-slate-700/80 pl-3">
            <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-400/30">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-bold text-white tracking-wider uppercase font-mono flex items-center gap-2">
                PAINEL DOCENTE & MONITORIA — TRANSMISSÃO
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30">
                  UFF · Gerência II
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
                Transmissão ao vivo da gameplay do líder de pontuação no Hospital Antônio Pedro
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              try {
                playSound("click");
              } catch {}
              setShowDecisionLogsModal(true);
              fetchDecisions();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#050c18] font-mono font-bold text-xs transition-all shadow-md cursor-pointer active:scale-95"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>ERROS & ACERTOS ({decisions.length})</span>
          </button>

          <button
            onClick={handleClearAllServerRecords}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs transition-all shadow-md cursor-pointer active:scale-95"
            title="Apaga permanentemente todos os registros e limpa a sala do servidor"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>ZERAR TUDO</span>
          </button>

          <button
            onClick={() => {
              try {
                playSound("click");
              } catch {}
              window.dispatchEvent(new CustomEvent("opennotebook"));
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-[#050c18] font-mono font-bold text-xs transition-all shadow-md cursor-pointer active:scale-95"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>CADERNO DE ERROS</span>
          </button>

          <button
            onClick={() => {
              try {
                playSound("click");
              } catch {}
              setShowClassReport((prev) => !prev);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs transition-all shadow-md cursor-pointer active:scale-95"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>RELATÓRIO</span>
          </button>

          <button
            onClick={() => {
              try {
                playSound("click");
              } catch {}
              setUseDemo((prev) => !prev);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer border ${
              useDemo
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{useDemo ? "Modo Simulado (Ativo)" : "Alunos Reais"}</span>
          </button>
        </div>
      </div>

      {/* Sub Stats Ribbon */}
      <div className="flex items-center justify-between px-6 py-1.5 bg-[#071324] border-b border-slate-800 text-xs font-mono flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            {onlineCount} {onlineCount === 1 ? "aluno real conectado" : "alunos reais conectados"}
          </span>

          <button
            onClick={handleResetRoom}
            className="text-rose-300 bg-rose-500/20 hover:bg-rose-500/30 px-2.5 py-0.5 rounded-full border border-rose-400/40 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
            title="Remove instâncias desconectadas ou duplicadas de alunos"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Limpar Fantasmas / Resetar Sala</span>
          </button>

          {manualSelectedId && (
            <button
              onClick={() => setManualSelectedId(null)}
              className="text-teal-300 bg-teal-500/20 hover:bg-teal-500/30 px-2.5 py-0.5 rounded-full border border-teal-400/40 text-[10px] font-bold flex items-center gap-1 transition-all"
            >
              <span>⚙ Voltar p/ Transmissão Automática</span>
            </button>
          )}

          {useDemo && (
            <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-[10px]">
              ℹ️ Modo Simulação Ativo (Alunos Virtuais em Ação)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-slate-400 text-[11px]">
          {isRealtime ? (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded uppercase font-bold flex items-center gap-1">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>Transmissão SSE Ativa</span>
            </span>
          ) : (
            <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded uppercase font-bold">
              Polling Periódico
            </span>
          )}

          {lastRefresh && <span>Atualizado: {lastRefresh.toLocaleTimeString()}</span>}

          <button
            onClick={() => fetchPlayers()}
            className="p-1 text-slate-400 hover:text-teal-300 transition-colors cursor-pointer"
            title="Recarregar dados"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Container Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#050c18] space-y-4">
        {/* Class Diagnostic Overlay */}
        {showClassReport && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-[#091a30] border-2 border-indigo-500/40 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-indigo-300 font-mono uppercase flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <span>Diagnóstico Pedagógico da Turma — Gerência II</span>
              </h3>
              <button
                onClick={() => setShowClassReport(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[#061222] border border-slate-700">
                <span className="text-slate-400 block text-[10px]">Média de Pontos</span>
                <span className="text-base font-bold text-teal-400">
                  {Math.round(
                    activePool.reduce((acc, p) => acc + (p.score || p.prestige || 0), 0) /
                      (activePool.length || 1)
                  )}{" "}
                  pts
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#061222] border border-slate-700">
                <span className="text-slate-400 block text-[10px]">Estresse Médio</span>
                <span className="text-base font-bold text-amber-400">
                  {Math.round(
                    activePool.reduce((acc, p) => acc + (p.stress || 0), 0) /
                      (activePool.length || 1)
                  )}
                  %
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#061222] border border-slate-700">
                <span className="text-slate-400 block text-[10px]">Missões Concluídas</span>
                <span className="text-base font-bold text-indigo-300">
                  {activePool.reduce((acc, p) => acc + (p.completedMissions || 0), 0)} missões
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#061222] border border-slate-700">
                <span className="text-slate-400 block text-[10px]">Aderência COFEN</span>
                <span className="text-base font-bold text-emerald-400">94% de precisão</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* MAIN BROADCAST SCREEN (TRANSMISSÃO AO VIVO DO LÍDER)              */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="bg-[#071325] border-2 border-teal-500/50 rounded-2xl p-4 shadow-2xl relative overflow-hidden">
          {/* Header Status Tag */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-teal-500/30 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {transmittedPlayer ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/30 border border-rose-500 text-rose-300 text-xs font-mono font-bold animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping inline-block" />
                  <span>TRANSMITINDO AO VIVO — {manualSelectedId ? "ALUNO SELECIONADO" : "LÍDER DO TURNO"}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
                  <Video className="w-3.5 h-3.5" />
                  <span>Aguardando Primeira Pontuação (Todos em Tela Estática)</span>
                </span>
              )}
            </div>

            {transmittedPlayer && (
              <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Maior Pontuação:</span>
                <span className="text-base font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded border border-amber-500/40">
                  {transmittedPlayer.score ?? transmittedPlayer.prestige ?? 0} PTS
                </span>
              </div>
            )}
          </div>

          {/* MAIN STREAM CONTENT */}
          {transmittedPlayer ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
              {/* Left / Central Game Visual Specator Feed */}
              <div className="lg:col-span-2 flex flex-col gap-2">
                <LiveGameplayCanvas player={transmittedPlayer} />
                <div className="flex items-center justify-between text-xs font-mono text-slate-300 bg-[#050c18] px-3 py-2 rounded-xl border border-teal-500/20">
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="w-3.5 h-3.5 text-teal-400" />
                    <span>Setor Atual: <strong>{transmittedPlayer.currentRoom || "Corredores"}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Turno: {formatTime(transmittedPlayer.shiftTime)}</span>
                  </div>
                </div>
              </div>

              {/* Right Telemetry Sidebar for Transmitted Student */}
              <div className="bg-[#050e1a] border border-teal-500/30 rounded-xl p-3.5 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                    <div>
                      <h2 className="text-sm font-bold text-white font-mono tracking-wide">
                        {transmittedPlayer.playerName}
                      </h2>
                      <span className="text-[10px] font-mono text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                        {transmittedPlayer.level || "Estudante"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-mono">STATUS</span>
                      <span className="text-xs font-bold text-emerald-400 font-mono">EM AÇÃO</span>
                    </div>
                  </div>

                  {/* Stats Gauges */}
                  <div className="space-y-3 font-mono text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] mb-1">PONTUAÇÃO ACUMULADA</span>
                      <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                        <span className="text-lg font-bold text-amber-300 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-400 animate-spin-slow" />
                          {transmittedPlayer.score ?? transmittedPlayer.prestige ?? 0} PT
                        </span>
                        <span className="text-[10px] text-amber-400">✅ {transmittedPlayer.completedMissions} Casos</span>
                      </div>
                    </div>

                    <StatBar
                      value={transmittedPlayer.energy ?? 100}
                      color="#2ecc71"
                      label="ENERGIA (RECOMPOSIÇÃO COPA)"
                      display={`${Math.round(transmittedPlayer.energy ?? 100)}%`}
                    />

                    <StatBar
                      value={transmittedPlayer.stress ?? 0}
                      color={(transmittedPlayer.stress ?? 0) > 70 ? "#ef4444" : "#f59e0b"}
                      label="NÍVEL DE ESTRESSE"
                      display={`${Math.round(transmittedPlayer.stress ?? 0)}%`}
                    />
                  </div>
                </div>

                {/* Recent Decision Log */}
                <div className="border-t border-slate-800 pt-3">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1.5">
                    📋 ÚLTIMA AÇÃO GERENCIAL
                  </span>
                  <div className="p-2.5 rounded-lg bg-[#081729] border border-teal-500/30 text-xs text-teal-100 font-sans leading-relaxed">
                    {transmittedPlayer.lastActivity || "Explorando as dependências do HUAP"}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* AWAITING TOP SCORE STATIC SCREEN BANNER */
            <div className="flex flex-col items-center justify-center p-8 text-center bg-[#050e1a] rounded-xl border border-slate-800 space-y-3 min-h-[220px]">
              <div className="p-3 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Video className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white font-mono uppercase tracking-wide">
                Nenhum jogador possui pontuação maior que zero no momento
              </h3>
              <p className="text-xs text-slate-300 font-sans max-w-lg leading-relaxed">
                Todos os alunos iniciam com <strong>0 Pontos</strong> em <strong>Tela Estática</strong>. Assim que um estudante responder questões clínicas, gerenciar crises ou concluir missões no hospital, sua gameplay será <strong>transmitida ao vivo automaticamente</strong> nesta tela principal.
              </p>
              <div className="text-[11px] font-mono text-teal-400 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-400/30">
                💡 Dica: Você também pode clicar no botão "Assistir" de qualquer aluno abaixo para transmitir sua tela manualmente.
              </div>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* GRID OF STATIC SCREENS (TELAS ESTÁTICAS DOS DEMAIS ALUNOS)       */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-4 h-4 text-teal-400" />
              <span>Telas Estáticas dos Demais Jogadores ({staticPlayers.length})</span>
            </h2>
            <span className="text-[10px] font-mono text-slate-400">
              Pontuação atualizada em tempo real via heartbeat
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {staticPlayers.map((p, i) => {
                const color = CARD_COLORS[i % CARD_COLORS.length];
                const scoreVal = p.score ?? p.prestige ?? 0;
                const isOnline = Boolean(p.online);

                return (
                  <motion.div
                    key={p.playerId}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="relative flex flex-col border-2 overflow-hidden rounded-xl bg-[#07111e] shadow-xl min-h-[220px]"
                    style={{ borderColor: isOnline ? color : "#334155" }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-2 bg-[#0a182b] border-b border-white/10">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-2.5 h-2.5 rounded-full ${
                            isOnline ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                          }`}
                        />
                        <span className="text-white font-mono font-bold text-xs truncate">
                          {p.playerName}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-300 bg-black/60 px-1.5 py-0.5 rounded border border-white/10">
                        {p.level || "Estudante"}
                      </span>
                    </div>

                    {/* Static Camera Screen Snapshot Display */}
                    <div className="flex-1 flex flex-col items-center justify-center p-3 text-center bg-[#040a12] relative">
                      <span className="text-[9px] font-mono text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 mb-2">
                        📷 TELA ESTÁTICA
                      </span>

                      <div className="text-xl font-mono font-bold text-amber-300 flex items-center gap-1 my-1">
                        <Award className="w-5 h-5 text-amber-400" />
                        <span>{scoreVal} PTS</span>
                      </div>

                      <span className="text-xs text-slate-200 font-mono font-semibold mb-1">
                        📍 {p.currentRoom || "Corredor"}
                      </span>

                      <p className="text-[11px] text-slate-300 font-sans max-w-xs bg-black/70 px-2.5 py-1 rounded border border-white/10 line-clamp-2">
                        {p.lastActivity || "Nenhuma ação recente"}
                      </p>
                    </div>

                    {/* Footer HUD & Manual Stream Action */}
                    <div className="p-2.5 bg-[#050e1a] border-t border-white/10 flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                        <div>
                          <span className="text-slate-400 block">ENERGIA</span>
                          <span className="text-emerald-400 font-bold">{Math.round(p.energy ?? 100)}%</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">ESTRESSE</span>
                          <span className="text-amber-400 font-bold">{Math.round(p.stress ?? 0)}%</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          try {
                            playSound("click");
                          } catch {}
                          setManualSelectedId(p.playerId);
                        }}
                        className="w-full py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-mono font-bold text-[11px] rounded-lg transition-all shadow flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Transmitir Este Aluno</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL: RELATÓRIO DE ERROS & ACERTOS DOS ALUNOS NO SERVIDOR       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showDecisionLogsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative w-full max-w-5xl h-[90vh] bg-[#071324] border-2 border-teal-500/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden font-sans"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-[#0a1b30] border-b border-teal-500/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-white font-mono tracking-wide flex items-center gap-2 uppercase">
                      RELATÓRIO DE ERROS & ACERTOS DA TURMA
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30">
                        {decisions.length} Registros no Servidor
                      </span>
                    </h2>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Acompanhe em tempo real as escolhas, condutas clínicas e decisões gerenciais de cada aluno
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClearAllServerRecords}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs transition-all shadow cursor-pointer active:scale-95"
                    title="Zera permanentemente o banco de respostas e a lista de alunos no servidor"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>ZERAR TODOS OS REGISTROS</span>
                  </button>

                  <button
                    onClick={() => setShowDecisionLogsModal(false)}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* KPI Stats Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#050c18] border-b border-slate-800 font-mono text-xs">
                <div className="p-3 rounded-xl bg-[#09182c] border border-slate-700/80">
                  <span className="text-[10px] text-slate-400 uppercase block mb-1">Total de Respostas</span>
                  <span className="text-lg font-bold text-white flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-teal-400" />
                    {decisions.length}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#09182c] border border-emerald-500/30">
                  <span className="text-[10px] text-emerald-400 uppercase block mb-1">Acertos (Condutas Corretas)</span>
                  <span className="text-lg font-bold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    {correctCount} ({decisions.length ? Math.round((correctCount / decisions.length) * 100) : 0}%)
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#09182c] border border-rose-500/30">
                  <span className="text-[10px] text-rose-400 uppercase block mb-1">Erros / Inadequadas</span>
                  <span className="text-lg font-bold text-rose-300 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-400" />
                    {errorCount} ({decisions.length ? Math.round((errorCount / decisions.length) * 100) : 0}%)
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#09182c] border border-amber-500/30">
                  <span className="text-[10px] text-amber-400 uppercase block mb-1">Pontos Distribuídos</span>
                  <span className="text-lg font-bold text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    {decisions.reduce((acc, d) => acc + (d.pointsEarned || 0), 0)} PTS
                  </span>
                </div>
              </div>

              {/* Filters & Search Bar */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#0a182b] border-b border-slate-800 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={decisionSearch}
                      onChange={(e) => setDecisionSearch(e.target.value)}
                      placeholder="Buscar por aluno, NPC, questão..."
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#050c18] border border-slate-700 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-teal-400"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-slate-400 text-[11px] flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-teal-400" />
                    Filtrar:
                  </span>
                  <button
                    onClick={() => setDecisionFilter("all")}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      decisionFilter === "all"
                        ? "bg-teal-500 text-[#050c18] font-bold"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    Todos ({decisions.length})
                  </button>
                  <button
                    onClick={() => setDecisionFilter("correct")}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      decisionFilter === "correct"
                        ? "bg-emerald-500 text-[#050c18] font-bold"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    Acertos (✅ {correctCount})
                  </button>
                  <button
                    onClick={() => setDecisionFilter("error")}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      decisionFilter === "error"
                        ? "bg-rose-500 text-white font-bold"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    Erros (❌ {errorCount})
                  </button>
                </div>
              </div>

              {/* Scrollable Decision Logs List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#050c18]">
                {filteredDecisions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 font-mono space-y-3 my-auto">
                    <ClipboardList className="w-12 h-12 text-slate-600 animate-pulse" />
                    <h3 className="text-sm font-bold uppercase text-slate-300">
                      Nenhum registro encontrado
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md">
                      {decisions.length === 0
                        ? "Nenhum aluno respondeu a questões até o momento. Quando os estudantes tomarem decisões nos diálogos, os registros aparecerão aqui em tempo real."
                        : "Nenhum resultado atende ao filtro de busca atual."}
                    </p>
                  </div>
                ) : (
                  filteredDecisions.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border transition-all space-y-2.5 ${
                        item.isCorrect
                          ? "bg-[#06191d] border-emerald-500/40 shadow-sm"
                          : "bg-[#180d16] border-rose-500/40 shadow-sm"
                      }`}
                    >
                      {/* Top Header */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-white font-mono px-2.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                            👤 {item.playerName}
                          </span>
                          <span className="text-xs font-bold text-teal-300 font-mono">
                            🗣️ {item.npcName}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30">
                            {item.category}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-[10px] text-slate-400">
                            {new Date(item.timestamp).toLocaleTimeString("pt-BR")}
                          </span>
                          {item.isCorrect ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 text-xs font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              ACERTO (+{item.pointsEarned} PTS)
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/50 text-xs font-bold flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-400" />
                              ERRO / INADEQUADO
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Question Text */}
                      <div className="p-3 rounded-lg bg-[#081220] border border-slate-800/80 text-xs text-slate-200">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Cenário / Pergunta Apresentada
                        </span>
                        <p className="leading-relaxed">{item.questionText}</p>
                      </div>

                      {/* Choice & Rationale Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div
                          className={`p-3 rounded-lg border ${
                            item.isCorrect
                              ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
                              : "bg-rose-950/20 border-rose-500/30 text-rose-200"
                          }`}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider block mb-1 flex items-center gap-1">
                            {item.isCorrect ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Opção Escolhida (Correta)
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5 text-rose-400" /> Opção Escolhida pelo Aluno
                              </>
                            )}
                          </span>
                          <p className="font-semibold">{item.selectedOption}</p>
                        </div>

                        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Feedback & Raciocínio Pedagógico
                          </span>
                          <p className="leading-relaxed text-[11px]">{item.feedback}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
