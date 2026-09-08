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
// Canvas Gameplay Live Spectator Viewport (Pixel-Art Hospital Room)
// ─────────────────────────────────────────────────────────────────────────────
function LiveGameplayCanvas({ player }: { player: PlayerData }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Normalize raw Phaser coordinates (0..1600, 0..1200) to Canvas (80..480, 60..220)
  const normX = Math.max(70, Math.min(490, ((player.x ?? 400) % 1200) / 1200 * 420 + 70));
  const normY = Math.max(70, Math.min(210, ((player.y ?? 300) % 900) / 900 * 140 + 70));

  const posRef = useRef({ x: normX, y: normY, targetX: normX, targetY: normY });

  useEffect(() => {
    posRef.current.targetX = normX;
    posRef.current.targetY = normY;
  }, [normX, normY]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameCount = 0;

    const render = () => {
      frameCount++;
      const w = canvas.width;
      const h = canvas.height;

      // Smooth position lerp towards target
      posRef.current.x += (posRef.current.targetX - posRef.current.x) * 0.08;
      posRef.current.y += (posRef.current.targetY - posRef.current.y) * 0.08;

      const px = posRef.current.x;
      const py = posRef.current.y;

      // 1. HOSPITAL TILE FLOOR
      ctx.fillStyle = "#0c1f38";
      ctx.fillRect(0, 0, w, h);

      // Floor Tiles Grid
      ctx.strokeStyle = "rgba(56, 189, 248, 0.08)";
      ctx.lineWidth = 1;
      const tileSize = 32;
      for (let x = 0; x < w; x += tileSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += tileSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // 2. WALLS & ROOM BOUNDARIES
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, w, 28); // Top wall
      ctx.fillRect(0, h - 14, w, 14); // Bottom wall
      ctx.fillRect(0, 0, 14, h); // Left wall
      ctx.fillRect(w - 14, 0, 14, h); // Right wall

      // Wall trim line (Teal accent)
      ctx.fillStyle = "#1abc9c";
      ctx.fillRect(0, 26, w, 3);

      // Doorway Arch to Corridor (Center Bottom)
      ctx.fillStyle = "#0284c7";
      ctx.fillRect(w / 2 - 35, h - 14, 70, 14);
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText("SAÍDA CORREDOR", w / 2, h - 3);

      // 3. HOSPITAL ROOM FURNITURE & EQUIPMENT

      // ── NURSE RECEPTION DESK (Top Left) ──
      ctx.fillStyle = "#334155";
      ctx.fillRect(24, 38, 90, 45); // Wood Desk
      ctx.fillStyle = "#475569";
      ctx.fillRect(28, 42, 82, 37);

      // Computer Monitor & Green Status LED
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(36, 45, 28, 20); // Monitor
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(38, 47, 24, 14); // Screen glow
      ctx.fillStyle = "#22c65e";
      ctx.fillRect(66, 60, 3, 3); // Power LED

      // Prontuários / Clipboard on desk
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(72, 48, 14, 18);
      ctx.fillStyle = "#f43f5e";
      ctx.fillRect(74, 50, 10, 3); // Red header line

      // ── HOSPITAL BED 1 (Top Right) ──
      ctx.fillStyle = "#64748b";
      ctx.fillRect(w - 110, 38, 85, 48); // Bed frame
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(w - 106, 42, 77, 40); // White mattress/sheets
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(w - 106, 42, 22, 40); // Pillow

      // Patient 1 in Bed
      ctx.fillStyle = "#fecdd3"; // Patient head
      ctx.beginPath(); ctx.arc(w - 95, 62, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#38bdf8"; // Blue hospital blanket
      ctx.fillRect(w - 86, 44, 55, 36);

      // Vital Signs ECG Monitor 1
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(w - 128, 38, 16, 26);
      ctx.fillStyle = "#22c65e"; // Screen pulse
      ctx.fillRect(w - 126, 40, 12, 16);
      // Animated ECG Sine Wave
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.beginPath();
      const ecgX = (frameCount * 2) % 12;
      ctx.moveTo(w - 126, 48);
      ctx.lineTo(w - 126 + ecgX, 48);
      ctx.lineTo(w - 126 + ecgX + 2, 43);
      ctx.lineTo(w - 126 + ecgX + 4, 53);
      ctx.lineTo(w - 126 + ecgX + 6, 48);
      ctx.stroke();

      // ── HOSPITAL BED 2 (Bottom Right) ──
      ctx.fillStyle = "#64748b";
      ctx.fillRect(w - 110, 120, 85, 48);
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(w - 106, 124, 77, 40);
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(w - 106, 124, 22, 40);

      // Patient 2 in Bed
      ctx.fillStyle = "#fde047"; // Patient 2 head
      ctx.beginPath(); ctx.arc(w - 95, 144, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#a855f7"; // Purple hospital blanket
      ctx.fillRect(w - 86, 126, 55, 36);

      // IV Drip Stand (Soro Fisiológico)
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(w - 122, 120, 3, 35); // Pole
      ctx.fillStyle = "#e0f2fe";
      ctx.fillRect(w - 125, 116, 9, 12); // IV Bag
      // Drip animation particle
      if ((frameCount % 30) < 15) {
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(w - 121, 130 + (frameCount % 15), 1.5, 3);
      }

      // 4. RADAR / SECTOR LOCATION BANNER
      ctx.fillStyle = "rgba(10, 22, 40, 0.85)";
      ctx.fillRect(14, 4, 180, 18);
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 9px font-mono, monospace";
      ctx.textAlign = "left";
      ctx.fillText(`📍 ${player.currentRoom || "Enfermaria HUAP"}`, 18, 16);

      // 5. PLAYER CHARACTER (NURSE / DOCTOR)
      const bounce = Math.sin(frameCount * 0.2) * 2;

      // Shadow under feet
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.beginPath();
      ctx.ellipse(px, py + 12, 11, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Uniform (Teal Scrubs)
      ctx.fillStyle = "#0d9488";
      ctx.fillRect(px - 7, py - 4 + bounce, 14, 15);

      // Head / Skin
      ctx.fillStyle = "#fecdd3";
      ctx.beginPath(); ctx.arc(px, py - 11 + bounce, 8, 0, Math.PI * 2); ctx.fill();

      // Nurse Cap / Hair
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(px - 6, py - 18 + bounce, 12, 4);
      ctx.fillStyle = "#e11d48";
      ctx.fillRect(px - 1, py - 17 + bounce, 2, 2); // Red cross

      // Eyes
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(px - 3, py - 12 + bounce, 2, 3);
      ctx.fillRect(px + 1, py - 12 + bounce, 2, 3);

      // Stethoscope
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py - 3 + bounce, 5, 0, Math.PI);
      ctx.stroke();

      // Player Name Badge
      ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      ctx.fillRect(px - 35, py - 32 + bounce, 70, 12);
      ctx.strokeStyle = "#1abc9c";
      ctx.lineWidth = 1;
      ctx.strokeRect(px - 35, py - 32 + bounce, 70, 12);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.fillText(player.playerName.split(" ")[0].slice(0, 10), px, py - 23 + bounce);

      // 6. ACTION THOUGHT BUBBLE OVER PLAYER HEAD
      const actionText = player.lastActivity || "Avaliando paciente no leito";
      const bubbleW = Math.min(220, actionText.length * 6.5 + 20);
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
      ctx.fillText(actionText.slice(0, 32), bubbleX + bubbleW / 2, bubbleY + 12);

      // 7. CCTV OVERLAY SCANLINES & HUD STAMPS
      ctx.fillStyle = "rgba(225, 29, 72, 0.9)";
      ctx.beginPath(); ctx.arc(w - 24, 14, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "right";
      ctx.fillText("LIVE ● CAM-01", w - 32, 17);

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [player, normX, normY]);

  return (
    <div className="relative w-full h-full min-h-[260px] bg-[#050c18] rounded-xl overflow-hidden border border-teal-500/40 shadow-2xl">
      <canvas
        ref={canvasRef}
        width={560}
        height={260}
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

  // Periodic score simulation for demo mode so scores change and leaders swap!
  useEffect(() => {
    const simTimer = setInterval(() => {
      setDemoList((prev) => {
        const next = [...prev];
        // Pick a random student to gain points
        const randIdx = Math.floor(Math.random() * next.length);
        const p = { ...next[randIdx] };
        const gained = Math.floor(Math.random() * 25) + 10;
        p.score = (p.score || 0) + gained;
        p.prestige = p.score;
        p.completedMissions = (p.completedMissions || 0) + 1;
        p.lastActivity = `Concluiu caso clínico (+${gained} pts)`;
        p.x = Math.max(40, Math.min(500, (p.x || 300) + (Math.random() * 60 - 30)));
        p.y = Math.max(40, Math.min(220, (p.y || 150) + (Math.random() * 60 - 30)));
        next[randIdx] = p;
        return next;
      });
    }, 9000);

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
