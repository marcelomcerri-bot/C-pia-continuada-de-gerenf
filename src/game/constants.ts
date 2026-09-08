export const TILE_SIZE = 32;
export const MAP_COLS = 76;
export const MAP_ROWS = 50;
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const CAMERA_ZOOM = 1.35;

/**
 * Calculates dynamic canvas dimensions based on viewport width & height
 * In landscape, it adapts cleanly to widescreen (16:9, 18:9, 19.5:9, 20:9, tablets).
 * In portrait (held vertically), it preserves the native 16:9 landscape aspect ratio (1280x720)
 * so game elements, HUD, sprites, and dialogue boxes are NEVER stretched or distorted.
 */
export function getDynamicGameSize(vw: number, vh: number): { width: number; height: number } {
  const safeW = Math.max(10, vw);
  const safeH = Math.max(10, vh);

  // If held vertically (portrait), strictly keep standard 16:9 landscape resolution.
  // The canvas scales down cleanly without black bar distortion or pixel stretching.
  if (safeH > safeW) {
    return { width: GAME_WIDTH, height: GAME_HEIGHT };
  }

  const aspect = safeW / safeH;

  if (aspect >= 16 / 9) {
    // Wide landscape (16:9 up to 21:9+ modern phones)
    // No artificial Math.min cap so it perfectly fills ultra-wide screens without black bars.
    const height = 720;
    const width = Math.max(1280, Math.round(720 * aspect));
    return { width, height };
  } else {
    // 4:3, 16:10, 3:2 tablets / square displays
    const width = 1280;
    const height = Math.max(720, Math.round(1280 / aspect));
    return { width, height };
  }
}

export const TILE_ID = {
  GARDEN:     0,
  WALL:       1,
  CORRIDOR:   2,
  ICU:        3,
  PHARMACY:   4,
  ADMIN:      5,
  WARD:       6,
  BREAK:      7,
  NURSING:    8,
  RECEPTION:  9,
  EMERGENCY:  10,
  LAB:        11,
  RADIOLOGY:  12,
  CME:        13,
  MATERNITY:  14,
  ONCOLOGY:   15,
  REHAB:      16,
  OUTPATIENT: 17,
  PSYCH:      18,
} as const;

export const NUM_TILES = 19;

export type TileId = typeof TILE_ID[keyof typeof TILE_ID];

export const ROOM_FLOOR_COLORS: Record<number, number> = {
  [TILE_ID.GARDEN]:     0x2d4c38,
  [TILE_ID.WALL]:       0x403d39,
  [TILE_ID.CORRIDOR]:   0xf8fafc,
  [TILE_ID.ICU]:        0xdbeafe,
  [TILE_ID.PHARMACY]:   0xede9fe,
  [TILE_ID.ADMIN]:      0xfef3c7,
  [TILE_ID.WARD]:       0xe0e7ff,
  [TILE_ID.BREAK]:      0xfef9c3,
  [TILE_ID.NURSING]:    0xd1fae5,
  [TILE_ID.RECEPTION]:  0xfce7f3,
  [TILE_ID.EMERGENCY]:  0xfee2e2,
  [TILE_ID.LAB]:        0xcffafe,
  [TILE_ID.RADIOLOGY]:  0xe9d5ff,
  [TILE_ID.CME]:        0xf1f5f9,
  [TILE_ID.MATERNITY]:  0xffe4e6,
  [TILE_ID.ONCOLOGY]:   0xccfbf1,
  [TILE_ID.REHAB]:      0xfef9c3,
  [TILE_ID.OUTPATIENT]: 0xe0f2fe,
  [TILE_ID.PSYCH]:      0xf3e8ff,
};

export const ROOM_NAMES: Record<number, string> = {
  [TILE_ID.ICU]:        'UTI Adulto',
  [TILE_ID.PHARMACY]:   'Farmácia Hospitalar',
  [TILE_ID.ADMIN]:      'Diretoria de Enfermagem',
  [TILE_ID.WARD]:       'Enfermaria Clínica',
  [TILE_ID.BREAK]:      'Copa & Nutrição',
  [TILE_ID.NURSING]:    'Posto de Enfermagem Central',
  [TILE_ID.RECEPTION]:  'Recepção / Triagem',
  [TILE_ID.EMERGENCY]:  'Pronto-Socorro',
  [TILE_ID.LAB]:        'Laboratório de Análises',
  [TILE_ID.RADIOLOGY]:  'Diagnóstico por Imagem',
  [TILE_ID.CME]:        'Central de Material Esterilizado',
  [TILE_ID.MATERNITY]:  'Maternidade',
  [TILE_ID.ONCOLOGY]:   'Oncologia / Hematologia',
  [TILE_ID.REHAB]:      'Reabilitação',
  [TILE_ID.OUTPATIENT]: 'Ambulatório',
  [TILE_ID.PSYCH]:      'Saúde Mental',
  [TILE_ID.CORRIDOR]:   'Corredor',
  [TILE_ID.GARDEN]:     'Área Externa',
};

export const PLAYER_SPEED = 145;
export const PLAYER_SPRINT_SPEED = 220;
export const INTERACTION_DISTANCE = 64;
export const GAME_MINUTES_PER_SECOND = 3;
export const SHIFT_DURATION_MINUTES = 480;

export const CAREER_LEVELS = [
  { title: 'Estagiária',            minPrestige: 0    },
  { title: 'Técnica de Enfermagem', minPrestige: 100  },
  { title: 'Enfermeira',            minPrestige: 300  },
  { title: 'Enfermeira Sênior',     minPrestige: 600  },
  { title: 'Coordenadora',          minPrestige: 1000 },
  { title: 'Gerente de Enfermagem', minPrestige: 1500 },
  { title: 'Diretora de Cuidado',   minPrestige: 2200 },
];

export const SCENES = {
  BOOT:   'BootScene',
  MENU:   'MenuScene',
  GAME:   'GameScene',
  HUD:    'HUDScene',
  DIALOG: 'DialogScene',
} as const;

export const EVENTS = {
  HUD_UPDATE:        'hud-update',
  OPEN_DIALOG:       'open-dialog',
  CLOSE_DIALOG:      'close-dialog',
  MISSION_COMPLETE:  'mission-complete',
  INTERACTION_HINT:  'interaction-hint',
  ROOM_CHANGE:       'room-change',
  CRISIS_ALERT:      'crisis-alert',
  CRISIS_RESOLVED:   'crisis-resolved',
} as const;

export type Direction = 'up' | 'down' | 'left' | 'right';
