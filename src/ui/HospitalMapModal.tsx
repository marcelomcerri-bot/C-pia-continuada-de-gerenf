import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Compass, MapPin, Target, Coffee, Trees, AlertCircle, X, ChevronRight, Users, Activity } from 'lucide-react';
import { HOSPITAL_ZONES, HospitalZone, getZoneByCoords } from '../game/data/hospitalZones';
import { GameState } from '../game/data/gameData';
import { playSound } from '../game/utils/audio';

// Grid dimensions
const GRID_COLS = 76;
const GRID_ROWS = 50;
const SVG_SCALE = 10; // 760 x 500
const SVG_W = GRID_COLS * SVG_SCALE;
const SVG_H = GRID_ROWS * SVG_SCALE;

export interface HospitalMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState | null;
  playerPos?: { x: number; y: number };
  activeTarget?: {
    id: string;
    room: string;
    npc: string;
    action: string;
    col: number;
    row: number;
    missionKey?: string;
    missionTitle?: string;
  } | null;
  onOpenMissions?: () => void;
}

export function HospitalMapModal({
  isOpen,
  onClose,
  gameState,
  playerPos,
  activeTarget,
  onOpenMissions,
}: HospitalMapModalProps) {
  const [search, setSearch] = useState('');
  const [selectedWing, setSelectedWing] = useState<'all' | 'north' | 'center' | 'south' | 'outdoor'>('all');
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  // Derive player tile coordinates
  const playerCol = playerPos ? Math.floor(playerPos.x / 32) : 6;
  const playerRow = playerPos ? Math.floor(playerPos.y / 32) : 8;
  const currentZone = useMemo(() => getZoneByCoords(playerCol, playerRow), [playerCol, playerRow]);

  // If initial open or zone changes, default selected zone to player's current zone or target zone
  useEffect(() => {
    if (isOpen) {
      if (activeTarget) {
        const targetZone = getZoneByCoords(activeTarget.col, activeTarget.row);
        if (targetZone) {
          setSelectedZoneId(targetZone.id);
          return;
        }
      }
      if (currentZone) {
        setSelectedZoneId(currentZone.id);
      } else {
        setSelectedZoneId('reception');
      }
    }
  }, [isOpen, currentZone, activeTarget]);

  // Keyboard shortcut listener (ESC or M closes)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') {
        if (!['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName || '')) {
          e.preventDefault();
          try { playSound('click'); } catch {}
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filtered zones list
  const filteredZones = useMemo(() => {
    return HOSPITAL_ZONES.filter((z) => {
      if (selectedWing !== 'all' && z.wingCode !== selectedWing) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          z.name.toLowerCase().includes(q) ||
          z.fullName.toLowerCase().includes(q) ||
          z.description.toLowerCase().includes(q) ||
          z.keyStaff.some((s) => s.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [selectedWing, search]);

  const activeSelectedZone = useMemo(() => {
    return HOSPITAL_ZONES.find((z) => z.id === selectedZoneId) || HOSPITAL_ZONES[0];
  }, [selectedZoneId]);

  // Distance calculation to active objective
  const distanceInfo = useMemo(() => {
    if (!activeTarget) return null;
    const dx = activeTarget.col - playerCol;
    const dy = activeTarget.row - playerRow;
    const distTiles = Math.round(Math.sqrt(dx * dx + dy * dy));
    const distMeters = Math.round(distTiles * 1.5);

    let dirText = '';
    if (Math.abs(dx) > Math.abs(dy)) {
      dirText = dx > 0 ? 'a Leste ➔' : 'a Oeste ⬅';
    } else {
      dirText = dy > 0 ? 'ao Sul ⬇' : 'ao Norte ⬆';
    }

    return { distMeters, dirText, targetZone: getZoneByCoords(activeTarget.col, activeTarget.row) };
  }, [activeTarget, playerCol, playerRow]);

  if (!isOpen) return null;

  return (
    <div
      onClick={() => {
        try { playSound('click'); } catch {}
        onClose();
      }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md select-none pointer-events-auto cursor-pointer animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-6xl max-h-[96vh] sm:max-h-[92vh] flex flex-col bg-slate-900 border-2 border-cyan-500/40 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden cursor-default"
      >
        {/* Top Header */}
        <div className="flex-shrink-0 p-3 sm:p-4 bg-slate-950/90 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              🗺️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold font-mono text-cyan-300 tracking-wider uppercase">
                  Mapa do Hospital Universitário (HUAP)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
                  76 × 50 Setores
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <MapPin className="w-3.5 h-3.5" />
                  Você está em: <strong className="text-white">{currentZone ? currentZone.name : 'Corredor Central'}</strong>
                </span>
                {distanceInfo && (
                  <span className="inline-flex items-center gap-1 text-amber-400 font-medium border-l border-slate-700 pl-2">
                    <Target className="w-3.5 h-3.5" />
                    Destino: <strong className="text-amber-300">{activeTarget?.action} ({distanceInfo.distMeters}m {distanceInfo.dirText})</strong>
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {onOpenMissions && (
              <button
                type="button"
                onClick={() => {
                  try { playSound('click'); } catch {}
                  onOpenMissions();
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-purple-500/40 text-purple-300 hover:text-purple-100 font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>📋</span>
                <span>Ver Missões</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                try { playSound('click'); } catch {}
                onClose();
              }}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-lg font-bold font-mono cursor-pointer"
              title="Fechar [ESC ou M]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Wing Category Filter Bar */}
        <div className="flex-shrink-0 px-3 sm:px-4 py-2 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: 'Todos os Setores (17)', icon: '🏥' },
              { id: 'north', label: 'Ala Norte (Urgência & Gestão)', icon: '🚨' },
              { id: 'center', label: 'Ala Central (UTI, CME & Posto)', icon: '🫀' },
              { id: 'south', label: 'Ala Sul (Maternidade & Onco)', icon: '👶' },
              { id: 'outdoor', label: 'Área Externa (Jardim)', icon: '🌿' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  try { playSound('click'); } catch {}
                  setSelectedWing(tab.id as any);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedWing === tab.id
                    ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300 shadow-sm'
                    : 'bg-slate-800/60 hover:bg-slate-800 border border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="relative min-w-[160px] sm:min-w-[200px] flex-shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar setor ou profissional..."
              className="w-full pl-8 pr-3 py-1 bg-slate-950/80 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-sans"
            />
          </div>
        </div>

        {/* Content Area: Blueprint + Details Panel */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* Main Visual Map (SVG Blueprint) */}
          <div className="flex-1 min-h-[300px] sm:min-h-[400px] p-2 sm:p-4 bg-slate-950/60 overflow-auto flex flex-col items-center justify-center">
            <div className="relative w-full max-w-[850px] aspect-[76/50] bg-[#070e1b] rounded-xl border border-cyan-500/30 shadow-[0_0_30px_rgba(0,0,0,0.8)] overflow-hidden select-none">
              
              {/* Subtle Medical Blueprint Grid Lines */}
              <div 
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(#38bdf8 1px, transparent 1px), linear-gradient(to right, rgba(56,189,248,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(56,189,248,0.1) 1px, transparent 1px)',
                  backgroundSize: '20px 20px, 40px 40px, 40px 40px',
                }}
              />

              {/* Interactive SVG Rendering */}
              <svg
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                className="w-full h-full block"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  {/* Subtle drop shadow filter for room cards */}
                  <filter id="room-shadow" x="-5%" y="-5%" width="110%" height="110%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.5" floodColor="#000" />
                  </filter>
                  <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="4" floodOpacity="0.8" floodColor="#38bdf8" />
                  </filter>
                  <filter id="glow-gold" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="5" floodOpacity="0.9" floodColor="#f59e0b" />
                  </filter>
                </defs>

                {/* Outer Hospital Walls & Main Corridors */}
                <rect
                  x={10}
                  y={10}
                  width={740}
                  height={470}
                  fill="#0c1729"
                  stroke="#1e3a5f"
                  strokeWidth="3"
                  rx="6"
                />

                {/* Corridor Labels */}
                <text x={380} y={148} fill="#475569" fontSize="9" fontFamily="monospace" textAnchor="middle" letterSpacing="2">
                  ══ CORREDOR NORTE ══
                </text>
                <text x={380} y={290} fill="#475569" fontSize="9" fontFamily="monospace" textAnchor="middle" letterSpacing="2">
                  ══ CORREDOR CENTRAL ══
                </text>
                <text x={380} y={424} fill="#475569" fontSize="8" fontFamily="monospace" textAnchor="middle" letterSpacing="1">
                  ══ ACESSO AO JARDIM & PÁTIO ══
                </text>

                {/* Render All Hospital Rooms */}
                {HOSPITAL_ZONES.map((zone) => {
                  const rx = zone.col1 * SVG_SCALE;
                  const ry = zone.row1 * SVG_SCALE;
                  const rw = (zone.col2 - zone.col1 + 1) * SVG_SCALE;
                  const rh = (zone.row2 - zone.row1 + 1) * SVG_SCALE;
                  const isSelected = selectedZoneId === zone.id;
                  const isPlayerHere = currentZone?.id === zone.id;
                  const isTargetHere = activeTarget && zone.col1 <= activeTarget.col && activeTarget.col <= zone.col2 && zone.row1 <= activeTarget.row && activeTarget.row <= zone.row2;

                  return (
                    <g
                      key={zone.id}
                      onClick={() => {
                        try { playSound('hover'); } catch {}
                        setSelectedZoneId(zone.id);
                      }}
                      className="cursor-pointer transition-transform duration-200"
                    >
                      {/* Room Area Rect */}
                      <rect
                        x={rx}
                        y={ry}
                        width={rw}
                        height={rh}
                        fill={zone.colorHex}
                        stroke={isSelected ? '#38bdf8' : isPlayerHere ? '#22c55e' : zone.borderHex}
                        strokeWidth={isSelected ? 3.5 : isPlayerHere ? 2.5 : 1.5}
                        rx="5"
                        filter="url(#room-shadow)"
                        className="transition-all duration-200 hover:opacity-90"
                      />

                      {/* Highlight border on selected room */}
                      {isSelected && (
                        <rect
                          x={rx - 2}
                          y={ry - 2}
                          width={rw + 4}
                          height={rh + 4}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="2"
                          strokeDasharray="4 2"
                          rx="7"
                          opacity="0.8"
                        />
                      )}

                      {/* Room Header Badge Pill */}
                      <g transform={`translate(${rx + rw / 2}, ${ry + (rh < 80 ? rh / 2 : 24)})`}>
                        {/* Background pill */}
                        <rect
                          x={-Math.min(rw - 12, 105) / 2}
                          y={-14}
                          width={Math.min(rw - 12, 105)}
                          height={28}
                          fill="#09121f"
                          fillOpacity="0.88"
                          stroke={zone.borderHex}
                          strokeWidth="1"
                          rx="14"
                        />
                        {/* Icon */}
                        <text
                          x={-Math.min(rw - 12, 105) / 2 + 13}
                          y={4}
                          fontSize="13"
                          textAnchor="middle"
                        >
                          {zone.icon}
                        </text>
                        {/* Room Title */}
                        <text
                          x={6}
                          y={3}
                          fill={isSelected ? '#38bdf8' : '#ffffff'}
                          fontSize={rw < 100 ? '9' : '10'}
                          fontWeight="bold"
                          fontFamily="system-ui, -apple-system, sans-serif"
                          textAnchor="middle"
                        >
                          {zone.name.length > 18 ? zone.name.slice(0, 16) + '..' : zone.name}
                        </text>
                      </g>

                      {/* Extra Subtitle for larger rooms */}
                      {rh >= 95 && (
                        <text
                          x={rx + rw / 2}
                          y={ry + rh - 12}
                          fill="#94a3b8"
                          fontSize="8"
                          fontFamily="monospace"
                          textAnchor="middle"
                          opacity="0.75"
                        >
                          {zone.wing}
                        </text>
                      )}

                      {/* Indicator badges for Player and Target if in this room */}
                      {isPlayerHere && (
                        <g transform={`translate(${rx + 16}, ${ry + 16})`}>
                          <circle r="7" fill="#22c55e" fillOpacity="0.3" className="animate-ping" />
                          <circle r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
                        </g>
                      )}
                      {isTargetHere && (
                        <g transform={`translate(${rx + rw - 16}, ${ry + 16})`}>
                          <circle r="7" fill="#f59e0b" fillOpacity="0.4" className="animate-ping" />
                          <circle r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* Trajectory line between player and objective */}
                {activeTarget && (
                  <line
                    x1={playerCol * SVG_SCALE + 5}
                    y1={playerRow * SVG_SCALE + 5}
                    x2={activeTarget.col * SVG_SCALE + 5}
                    y2={activeTarget.row * SVG_SCALE + 5}
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeDasharray="5 4"
                    opacity="0.6"
                  />
                )}

                {/* 🎯 Objective Target Marker */}
                {activeTarget && (
                  <g
                    transform={`translate(${activeTarget.col * SVG_SCALE + 5}, ${activeTarget.row * SVG_SCALE + 5})`}
                    filter="url(#glow-gold)"
                  >
                    <circle r="12" fill="#f59e0b" fillOpacity="0.25" className="animate-pulse" />
                    <circle r="8" fill="#f59e0b" fillOpacity="0.5" />
                    <circle r="4" fill="#fbbf24" stroke="#ffffff" strokeWidth="1.5" />
                    <g transform="translate(0, -18)">
                      <rect x="-35" y="-10" width="70" height="16" fill="#1e1302" stroke="#f59e0b" strokeWidth="1" rx="4" />
                      <text x="0" y="2" fill="#fef08a" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                        🎯 DESTINO
                      </text>
                    </g>
                  </g>
                )}

                {/* 📍 Real-Time Player Marker ("VOCÊ ESTÁ AQUI") */}
                <g
                  transform={`translate(${playerCol * SVG_SCALE + 5}, ${playerRow * SVG_SCALE + 5})`}
                  filter="url(#glow-cyan)"
                >
                  <circle r="14" fill="#38bdf8" fillOpacity="0.25" className="animate-ping" />
                  <circle r="8" fill="#0284c7" fillOpacity="0.6" />
                  <circle r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.8" />
                  <g transform="translate(0, 18)">
                    <rect x="-42" y="-9" width="84" height="16" fill="#041b2d" stroke="#38bdf8" strokeWidth="1.2" rx="4" />
                    <text x="0" y="3" fill="#38bdf8" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                      VOCÊ ESTÁ AQUI
                    </text>
                  </g>
                </g>
              </svg>

              {/* Map Footer Quick Hints */}
              <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[10px] text-slate-400 font-mono pointer-events-none bg-slate-950/70 px-2 py-0.5 rounded-md backdrop-blur-sm">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400"></span> Você
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 ml-2"></span> Objetivo Ativo
                </span>
                <span>Toque em qualquer setor para inspecionar</span>
              </div>
            </div>
          </div>

          {/* Right/Bottom Sector Details Card */}
          <div className="w-full lg:w-96 flex-shrink-0 bg-slate-900/95 border-t lg:border-t-0 lg:border-l border-slate-800 p-3 sm:p-4 flex flex-col gap-3 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-900 [&::-webkit-scrollbar-thumb]:bg-cyan-500/30">
            {activeSelectedZone && (
              <div className="space-y-3">
                {/* Sector Header */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 shadow-md"
                    style={{
                      backgroundColor: `${activeSelectedZone.borderHex}22`,
                      border: `1.5px solid ${activeSelectedZone.borderHex}`,
                    }}
                  >
                    {activeSelectedZone.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono font-semibold text-slate-300">
                        {activeSelectedZone.wing}
                      </span>
                      {currentZone?.id === activeSelectedZone.id && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold animate-pulse">
                          LOCAL ATUAL
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold font-sans text-white mt-1 leading-snug">
                      {activeSelectedZone.fullName}
                    </h3>
                  </div>
                </div>

                {/* Clinical Focus */}
                <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                    <Activity className="w-3 h-3" /> Foco Clínico & Atribuições
                  </span>
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    {activeSelectedZone.clinicalFocus}
                  </p>
                </div>

                {/* Sector Description */}
                <div className="text-xs text-slate-400 font-sans leading-relaxed">
                  {activeSelectedZone.description}
                </div>

                {/* Special Action Alert (Coffee / Garden) */}
                {activeSelectedZone.specialAction && (
                  <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs font-sans leading-relaxed flex items-start gap-2 shadow-sm">
                    <span className="text-base flex-shrink-0">✨</span>
                    <span>{activeSelectedZone.specialAction}</span>
                  </div>
                )}

                {/* Key Staff on Duty */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Users className="w-3 h-3 text-cyan-400" /> Equipe e Profissionais Presentes
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeSelectedZone.keyStaff.map((staff, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 rounded-md bg-slate-800 text-slate-200 text-xs font-mono border border-slate-700/80"
                      >
                        {staff}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Directory List of Matching Zones */}
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Lista de Setores ({filteredZones.length})</span>
                    <span className="text-[10px]">Clique para inspecionar</span>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-700">
                    {filteredZones.map((z) => {
                      const isItemActive = z.id === activeSelectedZone.id;
                      const isItemCurrent = z.id === currentZone?.id;
                      return (
                        <button
                          key={z.id}
                          type="button"
                          onClick={() => {
                            try { playSound('click'); } catch {}
                            setSelectedZoneId(z.id);
                          }}
                          className={`w-full p-2 rounded-lg text-left text-xs font-sans flex items-center justify-between transition-colors cursor-pointer ${
                            isItemActive
                              ? 'bg-cyan-950/60 border border-cyan-500/50 text-cyan-200 shadow-sm'
                              : 'bg-slate-800/40 hover:bg-slate-800 border border-transparent text-slate-300'
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <span className="text-sm">{z.icon}</span>
                            <span className="truncate font-medium">{z.name}</span>
                          </span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {isItemCurrent && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-mono font-bold">
                                AQUI
                              </span>
                            )}
                            <ChevronRight className="w-3 h-3 text-slate-500" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
