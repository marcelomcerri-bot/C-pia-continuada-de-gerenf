import { motion } from "framer-motion";

export function HeroScene() {
  return (
    <div className="relative w-full h-64 overflow-hidden rounded-2xl mb-8 select-none bg-slate-950 flex items-center justify-center border border-slate-800">
      <img
        src="/huap_bg.png"
        alt="HUAP - Hospital Universitário Antônio Pedro"
        className="w-full h-full object-cover object-top"
      />
    </div>
  );
}

function HospitalBuilding() {
  return (
    <svg width="120" height="70" viewBox="0 0 120 70" fill="none" opacity="0.5">
      {/* Main building */}
      <rect x="20" y="15" width="80" height="55" fill="#1a2744" />
      <rect x="20" y="15" width="80" height="8" fill="#2d4a8a" />
      {/* Windows */}
      {[30, 50, 70, 90].map(x => [20, 32, 44].map(y => (
        <motion.rect
          key={`${x}-${y}`}
          x={x - 5} y={y} width="10" height="8" rx="1"
          fill={Math.random() > 0.5 ? "#fbbf24" : "#1e3a6e"}
          animate={{ opacity: [0.8, 0.4, 0.8] }}
          transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
        />
      )))}
      {/* Entrance */}
      <rect x="50" y="52" width="20" height="18" rx="2" fill="#1e3a6e" />
      {/* Sign */}
      <rect x="38" y="8" width="44" height="9" rx="1" fill="#2d6a4f" />
      <text x="60" y="15" textAnchor="middle" fill="white" fontSize="5" fontWeight="bold">HOSPITAL</text>
      {/* Cross */}
      <rect x="58" y="2" width="4" height="10" fill="#ef4444" rx="1" />
      <rect x="54" y="5" width="12" height="4" fill="#ef4444" rx="1" />
      {/* Side wings */}
      <rect x="0" y="30" width="20" height="40" fill="#162038" />
      <rect x="100" y="30" width="20" height="40" fill="#162038" />
    </svg>
  );
}

function Ambulance() {
  return (
    <svg width="60" height="28" viewBox="0 0 60 28" fill="none">
      <rect x="2" y="8" width="50" height="18" rx="3" fill="white" />
      <rect x="2" y="8" width="14" height="18" rx="3" fill="#e2e8f0" />
      {/* Red stripe */}
      <rect x="2" y="14" width="50" height="4" fill="#ef4444" />
      {/* Cross */}
      <rect x="28" y="10" width="3" height="8" fill="#ef4444" />
      <rect x="24" y="13" width="11" height="3" fill="#ef4444" />
      {/* Windows */}
      <rect x="4" y="10" width="10" height="6" rx="1" fill="#7dd3fc" />
      <rect x="40" y="10" width="10" height="6" rx="1" fill="#7dd3fc" />
      {/* Wheels */}
      <circle cx="12" cy="26" r="5" fill="#374151" />
      <circle cx="44" cy="26" r="5" fill="#374151" />
      <circle cx="12" cy="26" r="2" fill="#6b7280" />
      <circle cx="44" cy="26" r="2" fill="#6b7280" />
      {/* Siren */}
      <rect x="20" y="4" width="12" height="5" rx="1" fill="#fbbf24" />
      <motion.rect
        x="20" y="4" width="6" height="5" rx="1" fill="#ef4444"
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 0.4, repeat: Infinity }}
      />
    </svg>
  );
}

function WalkingNurse() {
  return (
    <motion.div
      animate={{ y: [0, -2, 0] }}
      transition={{ duration: 0.35, repeat: Infinity }}
    >
      <svg width="18" height="36" viewBox="0 0 18 36" fill="none">
        <circle cx="9" cy="5" r="4.5" fill="#FDDBB4" />
        <rect x="5.5" y="1.5" width="7" height="3" rx="1" fill="white" />
        <rect x="7.5" y="0" width="3" height="2.5" rx="1" fill="white" />
        <rect x="8" y="0.5" width="2" height="1.5" fill="#e53e3e" />
        <rect x="3" y="10" width="12" height="12" rx="2" fill="white" />
        <rect x="0" y="10" width="3" height="8" rx="1.5" fill="white" />
        <rect x="15" y="10" width="3" height="8" rx="1.5" fill="white" />
        <rect x="5" y="22" width="3" height="9" rx="1.5" fill="#3182ce" />
        <rect x="10" y="22" width="3" height="9" rx="1.5" fill="#3182ce" />
      </svg>
    </motion.div>
  );
}

function WalkingDoctor() {
  return (
    <motion.div
      animate={{ y: [0, -2, 0] }}
      transition={{ duration: 0.4, repeat: Infinity }}
    >
      <svg width="16" height="34" viewBox="0 0 16 34" fill="none">
        <circle cx="8" cy="5" r="4" fill="#FDDBB4" />
        <rect x="3" y="9" width="10" height="11" rx="2" fill="white" />
        <rect x="0" y="9" width="3" height="8" rx="1.5" fill="white" />
        <rect x="13" y="9" width="3" height="8" rx="1.5" fill="white" />
        <rect x="4" y="20" width="3" height="10" rx="1.5" fill="#2c5282" />
        <rect x="9" y="20" width="3" height="10" rx="1.5" fill="#2c5282" />
      </svg>
    </motion.div>
  );
}
