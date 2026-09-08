import type { GameState, PlayerProfile } from '../data/gameData';

const SAVE_KEY = 'gestorEnf_huap_v3';

export const SKIN_TONE_PRESETS = [
  { id: 'p1', hex: '#fef0e3' }, // Porcelana
  { id: 'p2', hex: '#f5c5a3' }, // Clara
  { id: 'p3', hex: '#f0d5b0' }, // Beige
  { id: 'p4', hex: '#d4a574' }, // Tan / Morena Clara
  { id: 'p5', hex: '#c68642' }, // Golden / Morena
  { id: 'p6', hex: '#a56229' }, // Castanho / Negra
  { id: 'p7', hex: '#7a431d' }, // Marrom Escuro
  { id: 'p8', hex: '#4a2811' }, // Ébano
];

export const DEFAULT_PLAYER_PROFILE: PlayerProfile = {
  name: 'Enf. Alex',
  gender: 'female',
  skinTone: '#f5c5a3',
};

export const DEFAULT_STATE: GameState = {
  prestige: 0,
  energy: 100,
  stress: 0,
  completedMissions: [],
  missionProgress: {},
  relationships: {},
  gameTime: 480,
  day: 1,
  crisisCount: 0,
  decisionLog: [],
  unlockedSectors: ['RECEPTION', 'CORRIDOR', 'EMERGENCY', 'PHARMACY'],
  playerProfile: { ...DEFAULT_PLAYER_PROFILE },
};

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (_) {}
}

export function loadGame(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<GameState>;
    return { ...DEFAULT_STATE, ...parsed };
  } catch (_) {
    return { ...DEFAULT_STATE };
  }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}
