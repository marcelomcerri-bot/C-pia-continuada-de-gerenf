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
  AlertCircle
} from "lucide-react";
import { playSound } from "../game/utils/audio";

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
// Canvas Gameplay Live Spectator Viewport (Full Hospital Floorplan & NPCs)
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

    // Hospital NPCs situated in various sectors
    const npcs = [
      { id: '1', name: 'Dra. Teresa', role: 'Diretora Médica', x: 480, y: 55, color: '#ec4899' },
      { id: '2', name: 'Enf. Roberto', role: 'Supervisor', x: 410, y: 135, color: '#10b981' },
      { id: '3', name: 'Dr. Marcos', role: 'Intensivista', x: 310, y: 130, color: '#3b82f6' },
      { id: '4', name: 'Dra. Helena', role: 'Farmacêutica', x: 200, y: 55, color: '#8b5cf6' },
      { id: '5', name: 'Seu Arnaldo', role: 'Paciente em Alta', x: 260, y: 195, color: '#eab308' },
      { id: '6', name: 'Dona Francisca', role: 'Paciente', x: 90, y: 195, color: '#f43f5e' },
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

      // ── 1. BACKGROUND & HOSPITAL FLOOR TILES ──
      ctx.fillStyle = "#09121f";
      ctx.fillRect(0, 0, w, h);

      // Floor grid tiles
      ctx.strokeStyle = "rgba(56, 189, 248, 0.06)";
      ctx.lineWidth = 1;
      const tileSize = 28;
      for (let x = 0; x < w; x += tileSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += tileSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // ── 2. SECTOR ZONES (COLOR CODED HOSPITAL FLOORS) ──
      // Top Wing: Reception, Emergency, Pharmacy, Admin (y: 20..90)
      ctx.fillStyle = "rgba(239, 68, 68, 0.08)"; ctx.fillRect(20, 20, 110, 70); // Emergency (Red)
      ctx.fillStyle = "rgba(139, 92, 246, 0.08)"; ctx.fillRect(130, 20, 120, 70); // Pharmacy (Purple)
      ctx.fillStyle = "rgba(14, 165, 233, 0.08)"; ctx.fillRect(250, 20, 130, 70); // Lab/Radiology (Blue)
      ctx.fillStyle = "rgba(236, 72, 153, 0.08)"; ctx.fillRect(380, 20, 160, 70); // Admin (Pink)

      // Central Corridor (y: 90..115)
      ctx.fillStyle = "rgba(248, 250, 252, 0.05)"; ctx.fillRect(20, 90, 520, 25);

      // Middle Wing: CME, Break, Ward, ICU, Nursing (y: 115..180)
      ctx.fillStyle = "rgba(234, 179, 8, 0.08)"; ctx.fillRect(20, 115, 110, 65); // CME (Amber)
      ctx.fillStyle = "rgba(99, 102, 241, 0.08)"; ctx.fillRect(130, 115, 120, 65); // Ward (Indigo)
      ctx.fillStyle = "rgba(59, 130, 246, 0.12)"; ctx.fillRect(250, 115, 130, 65); // ICU (Blue)
      ctx.fillStyle = "rgba(16, 185, 129, 0.10)"; ctx.fillRect(380, 115, 160, 65); // Nursing (Teal)

      // Bottom Wing: Outpatient, Maternity, Oncology (y: 180..250)
      ctx.fillStyle = "rgba(244, 63, 94, 0.08)"; ctx.fillRect(20, 180, 170, 70); // Outpatient/Maternity
      ctx.fillStyle = "rgba(20, 184, 166, 0.08)"; ctx.fillRect(190, 180, 170, 70); // Oncology
      ctx.fillStyle = "rgba(168, 85, 247, 0.08)"; ctx.fillRect(360, 180, 180, 70); // Rehab/Psych

      // Wall Dividers between sectors
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 3;
      ctx.strokeRect(20, 20, 520, 230); // Outer boundary
      ctx.beginPath();
      // Internal sector divider lines
      ctx.moveTo(20, 90); ctx.lineTo(540, 90);
      ctx.moveTo(20, 115); ctx.lineTo(540, 115);
      ctx.moveTo(20, 180); ctx.lineTo(540, 180);
      ctx.stroke();

      // Sector Labels
      ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
      ctx.font = "bold 8px font-mono, monospace";
      ctx.textAlign = "left";
      ctx.fillText("PRONTO-SOCORRO", 25, 32);
      ctx.fillText("FARMÁCIA", 135, 32);
      ctx.fillText("LABORATÓRIO", 255, 32);
      ctx.fillText("DIRETORIA", 385, 32);

      ctx.fillText("CORREDOR PRINCIPAL HUAP", 25, 106);

      ctx.fillText("CME", 25, 127);
      ctx.fillText("ENFERMARIA", 135, 127);
      ctx.fillText("UTI ADULTO", 255, 127);
      ctx.fillText("POSTO ENFERMAGEM", 385, 127);

      ctx.fillText("MATERNIDADE / TRIAGEM", 25, 192);
      ctx.fillText("ONCOLOGIA", 195, 192);
      ctx.fillText("REABILITAÇÃO", 365, 192);

      // ── 3. DRAW HOSPITAL NPCs ──
      npcs.forEach((npc, idx) => {
        // Micro roaming movement for NPCs
        const npcOffset = Math.sin(frameCount * 0.05 + idx) * 8;
        const nx = npc.x + (idx % 2 === 0 ? npcOffset : 0);
        const ny = npc.y + (idx % 2 !== 0 ? npcOffset : 0);

        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath(); ctx.ellipse(nx, ny + 8, 7, 3, 0, 0, Math.PI * 2); ctx.fill();

        // Body
        ctx.fillStyle = npc.color;
        ctx.fillRect(nx - 5, ny - 3, 10, 11);

        // Head
        ctx.fillStyle = "#fde047";
        ctx.beginPath(); ctx.arc(nx, ny - 8, 5, 0, Math.PI * 2); ctx.fill();

        // Name tag above NPC
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.fillRect(nx - 28, ny - 22, 56, 10);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 7px monospace";
        ctx.textAlign = "center";
        ctx.fillText(npc.name, nx, ny - 14);

        // Check if student player is near NPC (interaction range)
        const distToPlayer = Math.hypot(px - nx, py - ny);
        if (distToPlayer < 40) {
          // Connection beam to NPC
          ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
          ctx.setLineDash([]);

          // Interaction halo
          ctx.fillStyle = "rgba(56, 189, 248, 0.2)";
          ctx.beginPath(); ctx.arc(nx, ny, 14, 0, Math.PI * 2); ctx.fill();
        }
      });

      // ── 4. DRAW STUDENT PLAYER CHARACTER (DYNAMIC DIRECTION & STEP ANIMATION) ──
      const bounce = isCurrentlyMoving ? Math.sin(frameCount * 0.3) * 3 : Math.sin(frameCount * 0.1) * 1;

      // Flashlight / Direction beam cone
      ctx.save();
      ctx.translate(px, py);
      let angle = Math.PI / 2; // default down
      if (facing === 'up') angle = -Math.PI / 2;
      else if (facing === 'left') angle = Math.PI;
      else if (facing === 'right') angle = 0;

      ctx.fillStyle = "rgba(56, 189, 248, 0.12)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 45, angle - 0.35, angle + 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Foot dust particles when moving
      if (isCurrentlyMoving && (frameCount % 6 < 3)) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.beginPath(); ctx.arc(px - 6 + Math.random() * 12, py + 10, 2, 0, Math.PI * 2); ctx.fill();
      }

      // Feet Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.beginPath(); ctx.ellipse(px, py + 11, 10, 4, 0, 0, Math.PI * 2); ctx.fill();

      // Uniform (Teal Scrubs)
      ctx.fillStyle = "#0d9488";
      ctx.fillRect(px - 7, py - 4 + bounce, 14, 15);

      // Head
      ctx.fillStyle = "#fecdd3";
      ctx.beginPath(); ctx.arc(px, py - 11 + bounce, 8, 0, Math.PI * 2); ctx.fill();

      // Nurse Cap
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(px - 6, py - 18 + bounce, 12, 4);
      ctx.fillStyle = "#e11d48";
      ctx.fillRect(px - 1, py - 17 + bounce, 2, 2); // Red cross

      // Eyes based on facing direction
      ctx.fillStyle = "#0f172a";
      if (facing === 'down') {
        ctx.fillRect(px - 4, py - 12 + bounce, 2, 3);
        ctx.fillRect(px + 2, py - 12 + bounce, 2, 3);
      } else if (facing === 'left') {
        ctx.fillRect(px - 6, py - 12 + bounce, 2, 3);
      } else if (facing === 'right') {
        ctx.fillRect(px + 4, py - 12 + bounce, 2, 3);
      } // 'up' has no eyes visible

      // Stethoscope
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(px, py - 3 + bounce, 5, 0, Math.PI); ctx.stroke();

      // Player Name Badge
      ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
      ctx.fillRect(px - 38, py - 32 + bounce, 76, 12);
      ctx.strokeStyle = "#1abc9c";
      ctx.lineWidth = 1;
      ctx.strokeRect(px - 38, py - 32 + bounce, 76, 12);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.fillText(player.playerName.split(" ")[0].slice(0, 12), px, py - 23 + bounce);

      // ── 5. ACTION THOUGHT BUBBLE OVER PLAYER HEAD ──
      const actionText = player.lastActivity || "Explorando dependências do hospital";
      const bubbleW = Math.min(230, actionText.length * 6.5 + 20);
      const bubbleX = Math.max(20, Math.min(w - bubbleW - 20, px - bubbleW / 2));
      const bubbleY = Math.max(30, py - 52 + bounce);

      ctx.fillStyle = "#0f172a";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bubbleX, bubbleY, bubbleW, 18, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(actionText.slice(0, 34), bubbleX + bubbleW / 2, bubbleY + 12);

      // ── 6. CCTV OVERLAY STAMPS ──
      ctx.fillStyle = "rgba(225, 29, 72, 0.9)";
      ctx.beginPath(); ctx.arc(w - 20, 14, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "right";
      ctx.fillText("LIVE ● MAPA HUAP UFF", w - 28, 17);

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [player, normX, normY]);

  return (
    <div className="relative w-full h-full min-h-[280px] bg-[#050c18] rounded-xl overflow-hidden border border-teal-500/40 shadow-2xl">
      <canvas
        ref={canvasRef}
        width={560}
        height={280}
        className="w-full h-full object-cover block"
      />
      {/* CCTV Grid Scanlines */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] opacity-10 [background-size:14px_14px]" />
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

  const activePool = useDemo || players.length === 0 ? demoList : players;

  // Determine top scorer (player with highest score > 0)
  const sortedByScore = [...activePool].sort(
    (a, b) => (b.score ?? b.prestige ?? 0) - (a.score ?? a.prestige ?? 0)
  );

  const topScorerCandidate = sortedByScore[0];
  const hasLeaderWithPoints = Boolean(
    topScorerCandidate && (topScorerCandidate.score > 0 || topScorerCandidate.prestige > 0)
  );

  // If professor picked someone manually, use them; otherwise auto-transmit candidate IF score > 0
  let transmittedPlayer: PlayerData | null = null;
  if (manualSelectedId) {
    transmittedPlayer = activePool.find((p) => p.playerId === manualSelectedId) || null;
  } else if (hasLeaderWithPoints) {
    transmittedPlayer = topScorerCandidate;
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
              useDemo || players.length === 0
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{useDemo || players.length === 0 ? "Modo Simulado" : "Conexões Reais"}</span>
          </button>
        </div>
      </div>

      {/* Sub Stats Ribbon */}
      <div className="flex items-center justify-between px-6 py-1.5 bg-[#071324] border-b border-slate-800 text-xs font-mono flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            {onlineCount} {onlineCount === 1 ? "aluno no server" : "alunos no server"}
          </span>

          {manualSelectedId && (
            <button
              onClick={() => setManualSelectedId(null)}
              className="text-teal-300 bg-teal-500/20 hover:bg-teal-500/30 px-2.5 py-0.5 rounded-full border border-teal-400/40 text-[10px] font-bold flex items-center gap-1 transition-all"
            >
              <span>⚙ Voltar p/ Auto (Maior Pontuação)</span>
            </button>
          )}

          {players.length === 0 && (
            <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-[10px]">
              ℹ️ Exibindo turma simulada para demonstração pedagógica
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
    </motion.div>
  );
}
