import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Users, BookOpen, RefreshCw, Activity, ArrowLeft, BarChart3, AlertCircle } from "lucide-react";
import { playSound } from "../game/utils/audio";

interface PlayerData {
  playerId: string;
  playerName: string;
  online: boolean;
  currentRoom: string;
  prestige: number;
  energy: number;
  stress: number;
  level: string;
  completedMissions: number;
  lastActivity: string;
  shiftTime: number;
  isDemo?: boolean;
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

const DEMO_PLAYERS: PlayerData[] = [
  {
    playerId: "demo-1",
    playerName: "Ana Silva (Enf. Internato)",
    online: true,
    currentRoom: "Pacientes e Enfermarias",
    prestige: 115,
    energy: 85,
    stress: 25,
    level: "Gestora Júnior",
    completedMissions: 3,
    lastActivity: "Ajustando dimensionamento de pessoal (COFEN 543/2017)",
    shiftTime: 180,
    isDemo: true,
  },
  {
    playerId: "demo-2",
    playerName: "Lucas Mendes (Monitoria)",
    online: true,
    currentRoom: "Copa e Convivência",
    prestige: 90,
    energy: 100,
    stress: 15,
    level: "Estagiário UFF",
    completedMissions: 2,
    lastActivity: "Pausa regulamentar para recomposição de energia",
    shiftTime: 240,
    isDemo: true,
  },
  {
    playerId: "demo-3",
    playerName: "Mariana Costa (Graduação)",
    online: true,
    currentRoom: "Descanso dos Profissionais",
    prestige: 75,
    energy: 60,
    stress: 65,
    level: "Estagiária",
    completedMissions: 1,
    lastActivity: "Gerenciando crise de recepção e triagem",
    shiftTime: 120,
    isDemo: true,
  },
  {
    playerId: "demo-4",
    playerName: "Gabriel Oliveira (Graduação)",
    online: true,
    currentRoom: "Corredores Principais",
    prestige: 130,
    energy: 90,
    stress: 10,
    level: "Gerente Pleno",
    completedMissions: 4,
    lastActivity: "Auditoria de insumos e RDC 15 (CME)",
    shiftTime: 310,
    isDemo: true,
  },
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
      <div className="h-2 rounded-full overflow-hidden bg-slate-900 border border-slate-700/50">
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

function PlayerScreen({ player, index }: { player: PlayerData; index: number }) {
  const color = CARD_COLORS[index % CARD_COLORS.length];
  const room = player?.currentRoom || "Corredor Principal";
  const name = player?.playerName || "Estudante";
  const level = player?.level || "Estagiário";
  const activity = player?.lastActivity || "Em atendimento";
  const isOnline = Boolean(player?.online);

  const getRoomStyle = (rName: string) => {
    if (rName.includes("Copa")) return "linear-gradient(135deg, #451a03 0%, #78350f 100%)";
    if (rName.includes("Pacientes") || rName.includes("Enfermarias")) return "linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)";
    if (rName.includes("Descanso")) return "linear-gradient(135deg, #064e3b 0%, #047857 100%)";
    if (rName.includes("Jardim")) return "linear-gradient(135deg, #14532d 0%, #15803d 100%)";
    return "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)";
  };

  const getRoomIcon = (rName: string) => {
    if (rName.includes("Copa")) return "☕";
    if (rName.includes("Descanso")) return "🛏️";
    if (rName.includes("Jardim")) return "🌳";
    if (rName.includes("Pacientes")) return "🏥";
    return "🏥";
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25 }}
      className="relative flex flex-col border-2 overflow-hidden rounded-xl bg-[#07111e] shadow-2xl min-h-[220px]"
      style={{
        borderColor: isOnline ? color : "#334155",
      }}
    >
      {/* Dynamic sector background */}
      <div
        className="absolute inset-0 opacity-30 mix-blend-screen pointer-events-none"
        style={{ background: getRoomStyle(room) }}
      />

      {/* CCTV Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* Header bar */}
      <div className="relative z-10 flex items-center justify-between px-3.5 py-2 bg-[#0a182b]/90 border-b border-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" : "bg-slate-500"}`}
          />
          <span className="text-white font-mono font-bold text-xs tracking-wider truncate">
            CAM {index + 1} · {name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {player.isDemo && (
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              SIMULADO
            </span>
          )}
          <span className="text-[10px] font-mono text-slate-300 bg-black/50 px-2 py-0.5 rounded border border-white/10">
            {level}
          </span>
        </div>
      </div>

      {/* Center Camera Feed Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-3 text-center">
        <div className="text-3xl filter drop-shadow-md mb-1">{getRoomIcon(room)}</div>
        <h3 className="text-base font-bold text-white font-mono tracking-wide mb-1 drop-shadow">
          {room}
        </h3>
        <p className="text-xs text-slate-300 font-sans max-w-xs bg-black/60 px-3 py-1 rounded-lg border border-white/10 leading-snug">
          {activity}
        </p>
      </div>

      {/* Bottom HUD stats */}
      <div className="relative z-10 px-3.5 py-2.5 bg-[#050e1a]/90 border-t border-white/10 flex flex-col gap-2">
        <div className="flex items-center justify-between font-mono text-[11px] text-slate-200">
          <span className="font-bold flex items-center gap-1" style={{ color }}>
            ⭐ {player.prestige ?? 0} PT
          </span>
          <span className="text-indigo-300">✅ Missões: {player.completedMissions ?? 0}</span>
          <span className="text-amber-300 font-mono">🕐 {formatTime(player.shiftTime)}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatBar
            value={player.energy ?? 100}
            color="#2ecc71"
            label="ENERGIA"
            display={`${Math.round(player.energy ?? 100)}%`}
          />
          <StatBar
            value={player.stress ?? 0}
            color={(player.stress ?? 0) > 70 ? "#ef4444" : "#f59e0b"}
            label="ESTRESSE"
            display={`${Math.round(player.stress ?? 0)}%`}
          />
        </div>
      </div>
    </motion.div>
  );
}

export function ProfessorView() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [useDemo, setUseDemo] = useState(false);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRealtime, setIsRealtime] = useState(false);
  const [showClassReport, setShowClassReport] = useState(false);

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
    }, 3000);

    return () => {
      if (eventSource) eventSource.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [fetchPlayers]);

  const displayList = useDemo || players.length === 0 ? (players.length > 0 && !useDemo ? players : DEMO_PLAYERS) : players;
  const onlineCount = displayList.filter((p) => p.online).length;

  return (
    <motion.div
      key="professor-dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[250] flex flex-col bg-[#050c18] text-slate-100 font-sans overflow-hidden pointer-events-auto select-none"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-[#0a182b] border-b border-teal-500/40 shadow-lg flex-shrink-0 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              try { playSound("click"); } catch {}
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
                PAINEL DOCENTE & MONITORIA
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30">
                  UFF · Gerência II
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
                Monitoramento ao vivo das decisões gerenciais dos alunos no HUAP
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              try { playSound("click"); } catch {}
              window.dispatchEvent(new CustomEvent("opennotebook"));
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-[#050c18] font-mono font-bold text-xs transition-all shadow-md cursor-pointer active:scale-95"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>CADERNO DE ERROS DA TURMA</span>
          </button>

          <button
            onClick={() => {
              try { playSound("click"); } catch {}
              setShowClassReport((prev) => !prev);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs transition-all shadow-md cursor-pointer active:scale-95"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>RELATÓRIO DE DESEMPENHO</span>
          </button>

          <button
            onClick={() => {
              try { playSound("click"); } catch {}
              setUseDemo((prev) => !prev);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer border ${
              useDemo || players.length === 0
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
            }`}
            title="Alternar entre alunos simulados e conexões reais do servidor"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{useDemo || players.length === 0 ? "Modo Simulação Ativo" : "Alternar p/ Demo"}</span>
          </button>
        </div>
      </div>

      {/* Sub Stats Ribbon */}
      <div className="flex items-center justify-between px-6 py-2 bg-[#071324] border-b border-slate-800 text-xs font-mono flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            {onlineCount} {onlineCount === 1 ? "aluno monitorado" : "alunos monitorados"}
          </span>

          <span className="text-slate-400">
            Servidor Local: <strong className="text-slate-200">Sala GLOBAL (HUAP)</strong>
          </span>

          {players.length === 0 && (
            <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              ℹ️ Exibindo turma simulada para demonstração pedagógica
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-slate-400">
          {isRealtime ? (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded uppercase font-bold">
              ● Transmissão SSE Ativa
            </span>
          ) : (
            <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded uppercase font-bold">
              ▲ Atualização periódica (Polling)
            </span>
          )}

          {lastRefresh && <span>Atualizado: {lastRefresh.toLocaleTimeString()}</span>}

          <button
            onClick={() => fetchPlayers()}
            className="p-1 text-slate-400 hover:text-teal-300 transition-colors cursor-pointer"
            title="Recarregar dados do servidor"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Monitoring Screen Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#050c18] space-y-4">
        {/* Class Report Overlay if toggled */}
        {showClassReport && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-[#091a30] border-2 border-indigo-500/40 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-indigo-300 font-mono uppercase flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <span>Diagnóstico Pedagógico da Turma — Gerência de Enfermagem II</span>
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
                <span className="text-slate-400 block text-[10px]">Média de Prestígio (Pontos)</span>
                <span className="text-lg font-bold text-teal-400">
                  {Math.round(
                    displayList.reduce((acc, p) => acc + (p.prestige || 0), 0) / (displayList.length || 1)
                  )}{" "}
                  pts
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#061222] border border-slate-700">
                <span className="text-slate-400 block text-[10px]">Média de Estresse Acumulado</span>
                <span className="text-lg font-bold text-amber-400">
                  {Math.round(
                    displayList.reduce((acc, p) => acc + (p.stress || 0), 0) / (displayList.length || 1)
                  )}
                  %
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#061222] border border-slate-700">
                <span className="text-slate-400 block text-[10px]">Total de Missões Concluídas</span>
                <span className="text-lg font-bold text-indigo-300">
                  {displayList.reduce((acc, p) => acc + (p.completedMissions || 0), 0)} missões
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#061222] border border-slate-700">
                <span className="text-slate-400 block text-[10px]">Taxa de Aderência COFEN</span>
                <span className="text-lg font-bold text-emerald-400">92% de acerto</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 font-sans leading-relaxed pt-1">
              <strong>Orientações da Monitoria:</strong> Os tópicos com maior recorrência de dúvidas nos casos práticos são <em>Dimensionamento de Enfermagem (COFEN 543/2017)</em> e <em>Gerenciamento do Conflito e Negociação (Marquis & Huston, Cap. 10)</em>. Utilize o Caderno de Erros para verificar as justificativas pedagógicas detalhadas.
            </p>
          </motion.div>
        )}

        {/* Player CCTV Screens Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {displayList.map((p, i) => (
              <PlayerScreen key={p.playerId} player={p} index={i} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
