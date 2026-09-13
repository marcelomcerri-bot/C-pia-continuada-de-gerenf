import * as Phaser from 'phaser';
import { MAP_COLS, MAP_ROWS, TILE_SIZE, TILE_ID, NUM_TILES, ROOM_FLOOR_COLORS, CAREER_LEVELS } from '../constants';

// ─── HELPER ───────────────────────────────────────────────────────────────────
function fill(map: number[][], r1: number, c1: number, r2: number, c2: number, t: number) {
  for (let r = r1; r <= r2; r++)
    for (let c = c1; c <= c2; c++)
      map[r][c] = t;
}

// Every door tile carved through a wall row/column, recorded as it's placed so
// consumers (prop/collision placement) can know exactly which tiles are doorways
// without having to re-derive them heuristically from the tile grid.
let doorTiles: Set<string> = new Set();
function door(map: number[][], r: number, c: number, t: number) {
  map[r][c] = t;
  doorTiles.add(`${r},${c}`);
}

/** Returns the set of "r,c" doorway tile keys from the most recent generateMapTiles() call. */
export function getDoorTileKeys(): Set<string> {
  return doorTiles;
}

// ─── MAP GENERATION ───────────────────────────────────────────────────────────
// HUAP/UFF inspired layout (76 cols × 50 rows)
// Sectors: Reception, Emergency, Pharmacy, Lab, Radiology, Admin (north wing)
//          CME, Break/Nutrition, Ward, ICU, Nursing (middle wing)
//          Outpatient, Maternity, Oncology, Rehab, Psych (south wing)
export function generateMapTiles(): number[][] {
  const { GARDEN, WALL, CORRIDOR, ICU, PHARMACY, ADMIN, WARD, BREAK, NURSING,
    RECEPTION, EMERGENCY, LAB, RADIOLOGY, CME, MATERNITY, ONCOLOGY, REHAB,
    OUTPATIENT, PSYCH } = TILE_ID;

  doorTiles = new Set();
  const map: number[][] = Array.from({ length: MAP_ROWS }, () => Array(MAP_COLS).fill(GARDEN));

  // ── Outer hospital walls
  fill(map, 1, 1, 1, 74, WALL);   // north outer
  fill(map, 48, 1, 48, 74, WALL); // south outer
  fill(map, 1, 1, 48, 1, WALL);   // west outer
  fill(map, 1, 74, 48, 74, WALL); // east outer

  // ── Fill hospital interior with CORRIDOR
  fill(map, 2, 2, 47, 73, CORRIDOR);

  // ══════════════════════════════════════
  // NORTH WING (rows 2-12)
  // ══════════════════════════════════════
  fill(map, 2, 2,  12, 11, RECEPTION);
  fill(map, 2, 12, 12, 12, WALL);
  fill(map, 2, 13, 12, 24, EMERGENCY);
  fill(map, 2, 25, 12, 25, WALL);
  fill(map, 2, 26, 12, 36, PHARMACY);
  fill(map, 2, 37, 12, 37, WALL);
  fill(map, 2, 38, 12, 49, LAB);
  fill(map, 2, 50, 12, 50, WALL);
  fill(map, 2, 51, 12, 61, RADIOLOGY);
  fill(map, 2, 62, 12, 62, WALL);
  fill(map, 2, 63, 12, 73, ADMIN);

  // North wing south wall
  fill(map, 13, 2, 13, 73, WALL);

  // Doors through row 13 (north→corridor)
  door(map, 13, 6, CORRIDOR); door(map, 13, 7, CORRIDOR); // RECEPTION
  door(map, 13, 18, CORRIDOR); door(map, 13, 19, CORRIDOR); // EMERGENCY
  door(map, 13, 30, CORRIDOR); door(map, 13, 31, CORRIDOR); // PHARMACY
  door(map, 13, 43, CORRIDOR); door(map, 13, 44, CORRIDOR); // LAB
  door(map, 13, 55, CORRIDOR); door(map, 13, 56, CORRIDOR); // RADIOLOGY
  door(map, 13, 67, CORRIDOR); door(map, 13, 68, CORRIDOR); // ADMIN

  // Corridor 1: rows 14-15 (already CORRIDOR)

  // ══════════════════════════════════════
  // MIDDLE WING (rows 16-26)
  // ══════════════════════════════════════
  // North wall of middle wing
  fill(map, 16, 2, 16, 73, WALL);

  fill(map, 17, 2,  26, 10, CME);
  fill(map, 17, 11, 26, 11, WALL);
  fill(map, 17, 12, 26, 22, BREAK);
  fill(map, 17, 23, 26, 23, WALL);
  fill(map, 17, 24, 26, 37, WARD);
  fill(map, 17, 38, 26, 38, WALL);
  fill(map, 17, 39, 26, 52, ICU);
  fill(map, 17, 53, 26, 53, WALL);
  fill(map, 17, 54, 26, 73, NURSING);

  // Doors through row 16 (corridor→middle wing)
  door(map, 16, 5, CORRIDOR); door(map, 16, 6, CORRIDOR); // CME
  door(map, 16, 16, CORRIDOR); door(map, 16, 17, CORRIDOR); // BREAK
  door(map, 16, 30, CORRIDOR); door(map, 16, 31, CORRIDOR); // WARD
  door(map, 16, 44, CORRIDOR); door(map, 16, 45, CORRIDOR); // ICU
  door(map, 16, 62, CORRIDOR); door(map, 16, 63, CORRIDOR); // NURSING

  // South wall of middle wing
  fill(map, 27, 2, 27, 73, WALL);

  // Doors through row 27
  door(map, 27, 5, CORRIDOR); door(map, 27, 6, CORRIDOR); // CME
  door(map, 27, 16, CORRIDOR); door(map, 27, 17, CORRIDOR); // BREAK
  door(map, 27, 30, CORRIDOR); door(map, 27, 31, CORRIDOR); // WARD
  door(map, 27, 44, CORRIDOR); door(map, 27, 45, CORRIDOR); // ICU
  door(map, 27, 62, CORRIDOR); door(map, 27, 63, CORRIDOR); // NURSING

  // Corridor 2: rows 28-29

  // ══════════════════════════════════════
  // SOUTH WING (rows 30-41)
  // ══════════════════════════════════════
  fill(map, 30, 2, 30, 73, WALL); // north wall

  fill(map, 31, 2,  41, 13, OUTPATIENT);
  fill(map, 31, 14, 41, 14, WALL);
  fill(map, 31, 15, 41, 26, MATERNITY);
  fill(map, 31, 27, 41, 27, WALL);
  fill(map, 31, 28, 41, 41, ONCOLOGY);
  fill(map, 31, 42, 41, 42, WALL);
  fill(map, 31, 43, 41, 55, REHAB);
  fill(map, 31, 56, 41, 56, WALL);
  fill(map, 31, 57, 41, 73, PSYCH);

  // Doors through row 30
  door(map, 30, 7, CORRIDOR); door(map, 30, 8, CORRIDOR); // OUTPATIENT
  door(map, 30, 20, CORRIDOR); door(map, 30, 21, CORRIDOR); // MATERNITY
  door(map, 30, 34, CORRIDOR); door(map, 30, 35, CORRIDOR); // ONCOLOGY
  door(map, 30, 48, CORRIDOR); door(map, 30, 49, CORRIDOR); // REHAB
  door(map, 30, 64, CORRIDOR); door(map, 30, 65, CORRIDOR); // PSYCH

  // South wall of south wing
  fill(map, 42, 2, 42, 73, WALL);

  // Doors through row 42 (into courtyard corridor)
  door(map, 42, 7, CORRIDOR); door(map, 42, 8, CORRIDOR);
  door(map, 42, 20, CORRIDOR); door(map, 42, 21, CORRIDOR);
  door(map, 42, 34, CORRIDOR); door(map, 42, 35, CORRIDOR);
  door(map, 42, 48, CORRIDOR); door(map, 42, 49, CORRIDOR);
  door(map, 42, 64, CORRIDOR); door(map, 42, 65, CORRIDOR);

  // Courtyard: rows 43-47 (interior garden)
  fill(map, 43, 2, 47, 73, GARDEN);
  // Courtyard path through center
  fill(map, 43, 33, 47, 42, CORRIDOR);

  return map;
}

// ─── TILESET TEXTURE ─────────────────────────────────────────────────────────
export function createTilesetTexture(scene: Phaser.Scene) {
  const W = TILE_SIZE;
  const key = 'tiles';
  let ct: Phaser.Textures.CanvasTexture;
  if (scene.textures.exists(key)) {
    ct = scene.textures.get(key) as Phaser.Textures.CanvasTexture;
  } else {
    ct = scene.textures.createCanvas(key, W * NUM_TILES, W) as Phaser.Textures.CanvasTexture;
  }
  const ctx = ct.getContext();
  ctx.clearRect(0, 0, W * NUM_TILES, W);

  const drawTile = (i: number, cb: (x: number) => void) => { cb(i * W); };

  const hex2rgba = (hex: number, alpha: number = 1) => {
    return `rgba(${(hex >> 16) & 255}, ${(hex >> 8) & 255}, ${hex & 255}, ${alpha})`;
  }

  const darkenHex = (hex: number, amount: number) => {
    let r = (hex >> 16) & 255;
    let g = (hex >> 8) & 255;
    let b = hex & 255;
    r = Math.max(0, r - amount);
    g = Math.max(0, g - amount);
    b = Math.max(0, b - amount);
    return `rgb(${r},${g},${b})`;
  }
  
  const lightenHex = (hex: number, amount: number) => {
    let r = (hex >> 16) & 255;
    let g = (hex >> 8) & 255;
    let b = hex & 255;
    r = Math.min(255, r + amount);
    g = Math.min(255, g + amount);
    b = Math.min(255, b + amount);
    return `rgb(${r},${g},${b})`;
  }

  /** Premium detailed Clean Modern Hospital floor */
  const pixelArtFloor = (x: number, colorId: number) => {
    const baseColor = ROOM_FLOOR_COLORS[colorId] || 0xffffff;
    
    // Base surface - Smooth vinyl/epoxy hospital floor
    ctx.fillStyle = hex2rgba(baseColor, 1);
    ctx.fillRect(x, 0, W, W);

    // Dynamic linoleum speckles/noise texture (static coords to avoid pixel shimmering/flicker)
    const specks = [
      { dx: 4, dy: 6, color: 'rgba(0,0,0,0.04)' },
      { dx: 11, dy: 13, color: 'rgba(255,255,255,0.12)' },
      { dx: 25, dy: 5, color: 'rgba(0,0,0,0.04)' },
      { dx: 18, dy: 22, color: 'rgba(255,255,255,0.08)' },
      { dx: 6, dy: 27, color: 'rgba(0,0,0,0.05)' },
      { dx: 28, dy: 17, color: 'rgba(255,255,255,0.14)' },
      { dx: 22, dy: 29, color: 'rgba(0,0,0,0.03)' },
      { dx: 13, dy: 3, color: 'rgba(255,255,255,0.06)' },
    ];
    specks.forEach(s => {
      ctx.fillStyle = s.color;
      ctx.fillRect(x + s.dx, s.dy, 2, 2);
    });

    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)'; 
    ctx.lineWidth = 1;

    if (colorId === TILE_ID.ICU || colorId === TILE_ID.EMERGENCY || colorId === TILE_ID.RADIOLOGY) {
      // 🏥 Clinical tech grid
      const s = W / 4;
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
           ctx.strokeRect(x + j * s, i * s, s, s);
        }
      }
    } else if (colorId === TILE_ID.BREAK || colorId === TILE_ID.OUTPATIENT || colorId === TILE_ID.RECEPTION) {
      // 🏁 High-fidelity checkerboard tiles with stone grain texture
      const s = W / 2;
      ctx.fillRect(x, 0, s, s);
      ctx.fillRect(x + s, s, s, s);
      ctx.strokeRect(x, 0, W, W);
      
      // Stone grains inside checker cells
      ctx.fillStyle = 'rgba(0,0,0,0.04)';
      ctx.fillRect(x + 3, 3, 2, 1);
      ctx.fillRect(x + 19, 19, 1, 2);
      ctx.fillRect(x + 3, 22, 2, 1);
      ctx.fillRect(x + 23, 3, 1, 2);
    } else if (colorId === TILE_ID.WARD || colorId === TILE_ID.MATERNITY || colorId === TILE_ID.PSYCH) {
      // 🪵 Horizontal vinyl-wood planks with staggered parquet joints & wood grain lines
      const h = W / 4;
      const staggeredJoints = [8, 20, 12, 24];
      for (let i = 0; i < 4; i++) {
         ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
         ctx.strokeRect(x, i * h, W, h);
         if (i % 2 === 0) {
           ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
           ctx.fillRect(x, i * h, W, h);
         }
         
         // Vertical staggered board seam
         ctx.beginPath();
         const seamX = x + staggeredJoints[i];
         ctx.moveTo(seamX, i * h);
         ctx.lineTo(seamX, (i + 1) * h);
         ctx.stroke();

         // Wood grain lines
         ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
         ctx.beginPath();
         ctx.moveTo(x, i * h + 3);
         ctx.lineTo(x + W, i * h + 3);
         ctx.moveTo(x, i * h + 5);
         ctx.lineTo(x + W, i * h + 5);
         ctx.stroke();
      }
    } else {
      // 🔲 Standard large clinical floor tiles
      const s = W / 2;
      ctx.strokeRect(x, 0, s, s);
      ctx.strokeRect(x + s, 0, s, s);
      ctx.strokeRect(x, s, s, s);
      ctx.strokeRect(x + s, s, s, s);
    }

    // High-contrast clean corner edge shadow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.beginPath();
    ctx.moveTo(x, W);
    ctx.lineTo(x + W, W);
    ctx.moveTo(x + W, 0);
    ctx.lineTo(x + W, W);
    ctx.stroke();
  };

  /** The Wall: A pristine, warm linen cream plaster wall panel */
  const wallTile = (x: number) => {
    // Elegant warm linen cream plaster base (matches the beautiful horizontal cream walls)
    ctx.fillStyle = '#e8e4db';
    ctx.fillRect(x, 0, W, W);

    // Subtle matte plaster texture (extremely soft sand/white micro-flecks)
    const plasterFlecks = [
      { dx: 4, dy: 5, color: '#f5f3ef' },
      { dx: 18, dy: 11, color: '#ded9cf' },
      { dx: 26, dy: 7, color: '#f5f3ef' },
      { dx: 12, dy: 22, color: '#ded9cf' },
      { dx: 22, dy: 25, color: '#f5f3ef' },
      { dx: 8, dy: 28, color: '#ded9cf' }
    ];
    plasterFlecks.forEach(f => {
      ctx.fillStyle = f.color;
      ctx.fillRect(x + f.dx, f.dy, 1.5, 1.5);
    });

    // Extremely soft, high-end 1px bevel for architectural structure without harsh vertical/horizontal ladder lines
    ctx.strokeStyle = '#f5f3ef'; // Soft top/left highlight
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, W);
    ctx.lineTo(x, 0);
    ctx.lineTo(x + W, 0);
    ctx.stroke();

    ctx.strokeStyle = '#ded9cf'; // Soft bottom/right shadow
    ctx.beginPath();
    ctx.moveTo(x + W - 1, 0);
    ctx.lineTo(x + W - 1, W - 1);
    ctx.lineTo(x, W - 1);
    ctx.stroke();
  };

  /** 0 — GARDEN: Very stylized, vibrant, Studio Ghibli-esque grass with flower clusters and soil texture */
  drawTile(TILE_ID.GARDEN, x => {
    // Vibrant grass gradient base
    const g = ctx.createRadialGradient(x + W / 2, W / 2, 0, x + W / 2, W / 2, W);
    g.addColorStop(0, '#4ade80'); 
    g.addColorStop(1, '#15803d');
    ctx.fillStyle = g; 
    ctx.fillRect(x, 0, W, W);

    // Soil speckles (dark forest earth)
    ctx.fillStyle = '#166534';
    ctx.fillRect(x + 3, 4, 2, 2);
    ctx.fillRect(x + 18, 22, 2, 1);
    ctx.fillRect(x + 25, 12, 1, 2);
    ctx.fillRect(x + 9, 29, 2, 2);

    // Stylized grass blades
    ctx.fillStyle = '#86efac';
    const grassPoints = [
      { bx: 6, by: 12 }, { bx: 22, by: 8 }, { bx: 14, by: 24 },
      { bx: 28, by: 20 }, { bx: 10, by: 5 }, { bx: 20, by: 28 }
    ];
    grassPoints.forEach(p => {
       ctx.beginPath();
       ctx.moveTo(x + p.bx, p.by);
       ctx.quadraticCurveTo(x + p.bx + 2, p.by - 3, x + p.bx + 3, p.by - 6);
       ctx.quadraticCurveTo(x + p.bx + 1, p.by - 1, x + p.bx - 1, p.by);
       ctx.fill();
    });

    // 🌸 Small Pixel Art Flowers (daisies)
    const drawFlower = (fx: number, fy: number, petalColor: string) => {
      ctx.fillStyle = '#eab308'; // yellow pollen core
      ctx.fillRect(x + fx, fy, 2, 2);
      ctx.fillStyle = petalColor; // white or soft red petals
      ctx.fillRect(x + fx - 2, fy, 2, 2);
      ctx.fillRect(x + fx + 2, fy, 2, 2);
      ctx.fillRect(x + fx, fy - 2, 2, 2);
      ctx.fillRect(x + fx, fy + 2, 2, 2);
    };

    drawFlower(8, 16, '#ffffff'); // white daisy
    drawFlower(24, 14, '#f43f5e'); // pink/red daisy
  });

  /** 1 — WALL */
  drawTile(TILE_ID.WALL, x => {
    wallTile(x);
  });

  /** 2 — CORRIDOR: High-end clinical floor with dual-tone directional guidance tracks (Piso Direcional) and high-gloss specular reflections */
  drawTile(TILE_ID.CORRIDOR, x => {
    // Beautiful clean base
    ctx.fillStyle = '#f1f5f9'; 
    ctx.fillRect(x, 0, W, W);

    // Dynamic hospital linoleum dots
    const corridorSpecks = [
      { dx: 3, dy: 7, color: 'rgba(0,0,0,0.03)' },
      { dx: 26, dy: 14, color: 'rgba(255,255,255,0.8)' },
      { dx: 14, dy: 23, color: 'rgba(0,0,0,0.03)' },
      { dx: 8, dy: 29, color: 'rgba(255,255,255,0.7)' }
    ];
    corridorSpecks.forEach(s => {
      ctx.fillStyle = s.color;
      ctx.fillRect(x + s.dx, s.dy, 2, 2);
    });

    // Large high-end ceramic tile grid lines
    const s = W / 2;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(148,163,184,0.18)';
    ctx.strokeRect(x, 0, s, s);
    ctx.strokeRect(x + s, 0, s, s);
    ctx.strokeRect(x, s, s, s);
    ctx.strokeRect(x + s, s, s, s);

    // High Gloss Specular Reflection sweep (makes floor look incredibly clean and shiny)
    const spec = ctx.createLinearGradient(x, 0, x + W, W);
    spec.addColorStop(0, 'rgba(255,255,255,0.45)');
    spec.addColorStop(0.3, 'rgba(255,255,255,0.12)');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = spec;
    ctx.beginPath();
    ctx.moveTo(x, 0); 
    ctx.lineTo(x + W, 0); 
    ctx.lineTo(x, W); 
    ctx.closePath();
    ctx.fill();
    
    // Outer Border Shadow (ambient occlusion between tiles)
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.strokeRect(x, 0, W, W);
  });

  /** Generate all dynamic colored room floors */
  const ROOM_TILES = [
    TILE_ID.ICU, TILE_ID.PHARMACY, TILE_ID.ADMIN, TILE_ID.WARD, TILE_ID.BREAK,
    TILE_ID.NURSING, TILE_ID.RECEPTION, TILE_ID.EMERGENCY, TILE_ID.LAB, TILE_ID.RADIOLOGY,
    TILE_ID.CME, TILE_ID.MATERNITY, TILE_ID.ONCOLOGY, TILE_ID.REHAB, TILE_ID.OUTPATIENT, TILE_ID.PSYCH
  ];

  ROOM_TILES.forEach(id => {
    drawTile(id, x => pixelArtFloor(x, id));
  });

  ct.refresh();
  return ct;
}

// ─── TYPES ────────────────────────────────────────────────────────────────────
export interface NPCDef {
  id: string;
  name: string;
  title: string;
  role: 'doctor' | 'nurse' | 'technician' | 'admin' | 'receptionist' | 'patient' | 'other';
  spriteKey: string;
  startCol: number;
  startRow: number;
  patrolPoints: { col: number; row: number }[];
  bodyColor: number;
  coatColor: number;
  hairColor: number;
  skinColor?: number;
  dialogues: DialogueDef[];
  /** Optional rotating dialogue pools — each pool is shown in sequence across conversations */
  dialoguePools?: DialogueDef[][];
  missionIds: string[];
  schedule: { hour: number; col: number; row: number }[];
}

export interface DialogueDef {
  id: string;
  condition?: (state: GameState) => boolean;
  topic?: string;
  text: string[];
  choices: DialogueChoice[];
}

export interface DialogueChoice {
  text: string;
  effect?: (state: GameState) => Partial<GameState>;
  missionEffect?: string;
  next?: string;
  tooltip?: string;
  /** When true, the choice represents the best nursing management decision */
  correct?: boolean;
  /** Feedback shown when the student makes this choice */
  feedback?: string;
}

export interface PlayerProfile {
  name: string;
  gender: 'female' | 'male';
  skinTone: string;
}

export interface GameState {
  prestige: number;
  energy: number;
  stress: number;
  completedMissions: string[];
  missionProgress: Record<string, number>;
  relationships: Record<string, number>;
  gameTime: number;
  day: number;
  crisisCount: number;
  decisionLog: string[];
  unlockedSectors: string[];
  playerProfile?: PlayerProfile;
}

export interface MissionDef {
  id: string;
  title: string;
  description: string;
  category: string;
  prestige: number;
  steps: number;
  prerequisiteIds: string[];
  pedagogy: string;
  pedagogyRef: string;
}

export interface CrisisEvent {
  id: string;
  title: string;
  description: string;
  urgent: boolean;
  choices: CrisisChoice[];
  minCareerLevel: number;
}

export interface CrisisChoice {
  text: string;
  tooltip?: string;
  correct: boolean;
  prestigeEffect: number;
  energyEffect: number;
  stressEffect: number;
  feedback: string;
}

// ─── CAREER SYSTEM ────────────────────────────────────────────────────────────
export function getLevelInfo(prestige: number) {
  let level = 0;
  for (let i = CAREER_LEVELS.length - 1; i >= 0; i--) {
    if (prestige >= CAREER_LEVELS[i].minPrestige) { level = i; break; }
  }
  const current = CAREER_LEVELS[level];
  const next = CAREER_LEVELS[Math.min(level + 1, CAREER_LEVELS.length - 1)];
  const toNext = level < CAREER_LEVELS.length - 1 ? next.minPrestige - prestige : 0;
  return { level, title: current.title, toNext, nextTitle: next.title };
}

// ─── CRISIS EVENTS ────────────────────────────────────────────────────────────
export const CRISIS_EVENTS: CrisisEvent[] = [
  {
    id: 'codigo_azul',
    title: '🚨 CÓDIGO AZUL — Parada Cardiorrespiratória',
    description: 'Paciente da Enfermaria Clínica entrou em parada! A equipe precisa de liderança imediata.',
    urgent: true,
    minCareerLevel: 0,
    choices: [
      {
        text: 'Acionar imediatamente o carrinho de parada e ligar para o médico de plantão',
        tooltip: 'Conduta correta: protocolo ACLS e acionamento da equipe',
        correct: true,
        prestigeEffect: 50, energyEffect: -20, stressEffect: 15,
        feedback: 'Excelente! O acionamento imediato do protocolo ACLS salva vidas. (Marquis & Huston, 2015)',
      },
      {
        text: 'Aguardar outros membros da equipe chegarem antes de agir',
        tooltip: 'Cada minuto conta em uma PCR',
        correct: false,
        prestigeEffect: -20, energyEffect: -5, stressEffect: 20,
        feedback: 'Atenção: em PCR, o início imediato do RCP é fundamental. Não espere — lidere! (Kurcgant, 2016)',
      },
      {
        text: 'Chamar o técnico de enfermagem e delegá-lo para iniciar o protocolo',
        tooltip: 'Delegação inadequada em situação crítica',
        correct: false,
        prestigeEffect: -10, energyEffect: -5, stressEffect: 25,
        feedback: 'A liderança do enfermeiro é indispensável em situações críticas. A delegação precisa ser supervisionada.',
      },
    ],
  },
  {
    id: 'falta_funcionario',
    title: '⚠️ FUNCIONÁRIO FALTOU — Turno Descoberto',
    description: '2 técnicos de enfermagem faltaram sem aviso. O próximo turno começa em 30 minutos.',
    urgent: false,
    minCareerLevel: 0,
    choices: [
      {
        text: 'Contatar técnicos em folga compensatória e oferecer banco de horas extra',
        tooltip: 'Gestão eficiente de escala por banco de horas',
        correct: true,
        prestigeEffect: 40, energyEffect: -10, stressEffect: 10,
        feedback: 'Ótimo! O banco de horas é uma ferramenta de gestão de escala prevista na CLT e reconhecida por Kurcgant (2016).',
      },
      {
        text: 'Cobrir você mesma junto com quem está de plantão',
        tooltip: 'Sobrecarregar a equipe atual aumenta risco de erro',
        correct: false,
        prestigeEffect: 10, energyEffect: -25, stressEffect: 30,
        feedback: 'A sobrecarga da equipe é fator de risco para erros. O dimensionamento adequado é papel do gerente (COFEN).',
      },
      {
        text: 'Notificar a Diretoria e registrar o evento em ata',
        tooltip: 'Necessário, mas insuficiente sem ação imediata',
        correct: false,
        prestigeEffect: 15, energyEffect: -5, stressEffect: 15,
        feedback: 'A notificação é importante, mas o enfermeiro gerente deve resolver o problema operacionalmente também.',
      },
    ],
  },
  {
    id: 'queda_paciente',
    title: 'QUEDA DE PACIENTE — Evento Adverso Notificado',
    description: 'Um paciente caiu da cama na Enfermaria. Família está presente e exige explicações.',
    urgent: false,
    minCareerLevel: 0,
    choices: [
      {
        text: 'Avaliar o paciente, preencher o REAS, notificar a gestão e conversar com a família com transparência',
        tooltip: 'Protocolo completo: avaliação + notificação + comunicação',
        correct: true,
        prestigeEffect: 45, energyEffect: -15, stressEffect: 10,
        feedback: 'Parabéns! A notificação de eventos adversos é fundamental na cultura de segurança do paciente (OMS/PNSP).',
      },
      {
        text: 'Registrar o evento internamente apenas, sem comunicar a família agora',
        tooltip: 'A falta de transparência viola direitos do paciente',
        correct: false,
        prestigeEffect: -15, energyEffect: -10, stressEffect: 20,
        feedback: 'A comunicação transparente com pacientes e famílias é um princípio ético e legal. Não omita informações.',
      },
      {
        text: 'Acalmar a família e verificar se o paciente está bem antes de qualquer registro',
        tooltip: 'Confortar é importante, mas registro imediato é obrigatório',
        correct: false,
        prestigeEffect: 15, energyEffect: -8, stressEffect: 15,
        feedback: 'O acolhimento à família é correto, mas o registro e notificação devem ser simultâneos, não posteriores.',
      },
    ],
  },
  {
    id: 'superlotacao_ps',
    title: 'SUPERLOTACAO — Pronto-Socorro em Colapso',
    description: 'O PS tem 40% mais pacientes que a capacidade. Macas no corredor, equipe esgotada.',
    urgent: true,
    minCareerLevel: 1,
    choices: [
      {
        text: 'Acionar protocolo de superlotação: triagem de Manchester rigorosa + alta precoce de internados elegíveis',
        tooltip: 'Protocolo estruturado de gestão de fluxo',
        correct: true,
        prestigeEffect: 55, energyEffect: -20, stressEffect: 20,
        feedback: 'Excelente gestão de fluxo! O Manchester Triage System e a gestão de leitos são estratégias comprovadas.',
      },
      {
        text: 'Fechar temporariamente o PS para novos atendimentos',
        tooltip: 'Fechamento do PS é decisão complexa e pode ser ilegal',
        correct: false,
        prestigeEffect: -30, energyEffect: -5, stressEffect: 30,
        feedback: 'O fechamento do PS é medida extrema e exige autorização da direção e órgãos competentes.',
      },
      {
        text: 'Realocar toda a equipe disponível do hospital para o PS',
        tooltip: 'Descobre outros setores, podendo causar mais eventos adversos',
        correct: false,
        prestigeEffect: -10, energyEffect: -15, stressEffect: 25,
        feedback: 'A realocação total expõe outros setores ao risco. É necessário um plano de contingência proporcional.',
      },
    ],
  },
  {
    id: 'erro_medicacao',
    title: 'NEAR-MISS — Erro de Medicação Evitado',
    description: 'Um técnico quase administrou a dose errada de heparina. Descoberto na conferência dupla.',
    urgent: false,
    minCareerLevel: 0,
    choices: [
      {
        text: 'Elogiar a conferência dupla, notificar o near-miss e usar como caso educativo na próxima reunião de equipe',
        tooltip: 'Cultura de segurança positiva: aprendizado sem punição',
        correct: true,
        prestigeEffect: 50, energyEffect: -10, stressEffect: 5,
        feedback: 'Excelente! O near-miss notificado é uma oportunidade de aprendizado. Cultura de segurança sem culpa (OMS).',
      },
      {
        text: 'Advertir o técnico por quase cometer o erro',
        tooltip: 'Punição após near-miss reduz notificações futuras',
        correct: false,
        prestigeEffect: -20, energyEffect: -5, stressEffect: 15,
        feedback: 'A punição em near-miss inibe notificações futuras, aumentando o risco real. Use o modelo de aprendizado.',
      },
      {
        text: 'Registrar internamente mas não comunicar à equipe para não criar ansiedade',
        tooltip: 'A ocultação de near-misses é prejudicial à segurança',
        correct: false,
        prestigeEffect: -10, energyEffect: -5, stressEffect: 10,
        feedback: 'Compartilhar near-misses com a equipe é fundamental para aprendizado coletivo e prevenção (PNSP).',
      },
    ],
  },
  {
    id: 'falta_material',
    title: '📦 FALTA DE MATERIAL — Estoque Crítico',
    description: 'Acaban as luvas estéreis. Centro cirúrgico aguarda procedimento urgente.',
    urgent: true,
    minCareerLevel: 0,
    choices: [
      {
        text: 'Contatar farmácia, compras e solicitar empréstimo emergencial de outro hospital da rede',
        tooltip: 'Solução multissetorial e eficiente',
        correct: true,
        prestigeEffect: 45, energyEffect: -15, stressEffect: 10,
        feedback: 'Perfeito! A articulação intersetorial e a rede de apoio são fundamentais na gestão hospitalar.',
      },
      {
        text: 'Adiar o procedimento até a chegada do material pedido normalmente',
        tooltip: 'Adiar procedimento urgente causa dano ao paciente',
        correct: false,
        prestigeEffect: -25, energyEffect: -5, stressEffect: 20,
        feedback: 'Adiar procedimentos urgentes compromete a segurança. Sempre busque soluções alternativas primeiro.',
      },
      {
        text: 'Usar material similar disponível não estéril com protocolo adaptado',
        tooltip: 'Improvisação pode causar infecção grave',
        correct: false,
        prestigeEffect: -30, energyEffect: -10, stressEffect: 30,
        feedback: 'Jamais improvise com material não estéril em cirurgia. A esterilização é imperativa (ANVISA/CME).',
      },
    ],
  },
  {
    id: 'conflito_equipe',
    title: '🤝 CONFLITO — Desentendimento entre Enfermeiras',
    description: 'Duas enfermeiras estão em conflito aberto, afetando o clima da equipe no turno.',
    urgent: false,
    minCareerLevel: 0,
    choices: [
      {
        text: 'Realizar mediação individual com cada parte, depois reunião conjunta com foco na comunicação não-violenta',
        tooltip: 'Abordagem estruturada de gestão de conflitos',
        correct: true,
        prestigeEffect: 45, energyEffect: -20, stressEffect: 10,
        feedback: 'Excelente! A mediação é a ferramenta mais eficaz na gestão de conflitos interpessoais (Marquis & Huston).',
      },
      {
        text: 'Ignorar o conflito; as profissionais são adultas e devem se resolver sozinhas',
        tooltip: 'Conflitos não geridos escalam e afetam a assistência',
        correct: false,
        prestigeEffect: -20, energyEffect: 0, stressEffect: 20,
        feedback: 'Conflitos não geridos afetam a qualidade da assistência e o bem-estar da equipe. Intervenção é essencial.',
      },
      {
        text: 'Transferir uma das enfermeiras para outro setor para resolver o conflito',
        tooltip: 'Transferência evita, mas não resolve o conflito',
        correct: false,
        prestigeEffect: 5, energyEffect: -10, stressEffect: 15,
        feedback: 'A transferência pode mascarar o conflito sem resolução real. A mediação deve ser tentada primeiro.',
      },
    ],
  },
  {
    id: 'infeccao_hospitalar',
    title: '🦠 ALERTA — Infecção Hospitalar em Cluster',
    description: 'CCIH notificou 3 casos de infecção por Klebsiella em leitos adjacentes da UTI.',
    urgent: true,
    minCareerLevel: 2,
    choices: [
      {
        text: 'Isolar os pacientes, reforçar protocolo de higienização das mãos e acionar a CCIH para investigação',
        tooltip: 'Medidas imediatas de controle de infecção',
        correct: true,
        prestigeEffect: 60, energyEffect: -20, stressEffect: 15,
        feedback: 'Perfeito! O isolamento e a higienização das mãos são as principais medidas de controle (ANVISA/CCIH).',
      },
      {
        text: 'Aumentar a limpeza do ambiente e aguardar mais resultados antes de tomar medidas',
        tooltip: 'A espera em cluster de infecção é perigosa',
        correct: false,
        prestigeEffect: -20, energyEffect: -5, stressEffect: 20,
        feedback: 'Em cluster de infecção hospitalar, as medidas de controle devem ser imediatas, não aguardar confirmação.',
      },
      {
        text: 'Transferir os pacientes infectados para outro andar do hospital',
        tooltip: 'Transferência sem isolamento adequado pode disseminar o patógeno',
        correct: false,
        prestigeEffect: -15, energyEffect: -10, stressEffect: 25,
        feedback: 'A transferência sem isolamento adequado pode disseminar o patógeno. Isole in loco primeiro.',
      },
    ],
  },
  {
    id: 'transferencia_urgente',
    title: '🚐 TRANSFERÊNCIA — Paciente Crítico Precisa Ser Transferido',
    description: 'Paciente da UTI precisa de cirurgia cardíaca especializada em outro hospital. Família aguarda.',
    urgent: false,
    minCareerLevel: 1,
    choices: [
      {
        text: 'Acionar Central de Regulação, preparar sumário de transferência completo e comunicar família',
        tooltip: 'Protocolo completo de transferência segura',
        correct: true,
        prestigeEffect: 50, energyEffect: -15, stressEffect: 10,
        feedback: 'Excelente! O sumário de transferência e a comunicação familiar são fundamentais para continuidade do cuidado.',
      },
      {
        text: 'Contatar diretamente o outro hospital e organizar o transporte sem acionar a regulação',
        tooltip: 'A regulação é obrigatória para transferências pelo SUS',
        correct: false,
        prestigeEffect: -10, energyEffect: -10, stressEffect: 15,
        feedback: 'A Central de Regulação é o fluxo correto para transferências no SUS. Bypasse pode gerar problemas legais.',
      },
      {
        text: 'Orientar a família a buscar o serviço por conta própria pois não há regulação disponível',
        tooltip: 'Abandono assistencial — inadmissível',
        correct: false,
        prestigeEffect: -40, energyEffect: -5, stressEffect: 30,
        feedback: 'Orientar família a buscar serviço por conta própria é abandono assistencial, vedado pelo Código de Ética.',
      },
    ],
  },
  {
    id: 'indicadores_qualidade',
    title: '📊 AUDITORIA — Indicadores Abaixo da Meta',
    description: 'Os indicadores de qualidade do mês mostram aumento de 30% em eventos adversos. A diretoria quer explicações.',
    urgent: false,
    minCareerLevel: 2,
    choices: [
      {
        text: 'Apresentar análise crítica dos dados, identificar causas raiz e propor plano de ação (PDCA)',
        tooltip: 'Abordagem profissional e científica na gestão da qualidade',
        correct: true,
        prestigeEffect: 65, energyEffect: -20, stressEffect: 10,
        feedback: 'Excelente! A análise de causa raiz e o ciclo PDCA são ferramentas padrão da gestão de qualidade em saúde.',
      },
      {
        text: 'Justificar os indicadores pelo aumento do volume de pacientes e solicitar mais recursos',
        tooltip: 'Justificativa válida mas incompleta sem plano de ação',
        correct: false,
        prestigeEffect: 10, energyEffect: -10, stressEffect: 15,
        feedback: 'A justificativa é parcialmente válida, mas sem plano de ação demonstra falta de proatividade na gestão.',
      },
      {
        text: 'Questionar a metodologia dos indicadores e sugerir revisão dos critérios de medição',
        tooltip: 'Contestar dados sem análise é evasão da responsabilidade',
        correct: false,
        prestigeEffect: -15, energyEffect: -5, stressEffect: 20,
        feedback: 'Contestar indicadores sem evidência é evasão. O enfermeiro gerente deve responder com propostas de melhoria.',
      },
    ],
  },
];

// ─── NPC DEFINITIONS ──────────────────────────────────────────────────────────
export const NPC_DEFS: NPCDef[] = [
  {
    id: 'ana_recepcionista',
    name: 'Ana Beatriz',
    title: 'Recepcionista Chefe',
    role: 'receptionist',
    spriteKey: 'npc_ana',
    startCol: 6, startRow: 3,
    bodyColor: 0xffffff, coatColor: 0xa0c8d8, hairColor: 0x6b3a2a, skinColor: 0xf5c5a3,
    patrolPoints: [
      { col: 6, row: 3 }
    ],
    schedule: [
      { hour: 7, col: 6, row: 3 }, { hour: 19, col: 6, row: 3 },
    ],
    missionIds: ['triagem_ps', 'fluxo_recepcao'],
    dialogues: [
      {
        id: 'intro',
        condition: (s) => !s.completedMissions.includes('triagem_ps'),
        topic: 'Gestão do Cuidado em Enfermagem',
        text: [
          'Bom dia! O Pronto-Socorro está com fila grande hoje.',
          'Temos 12 pacientes aguardando triagem desde as 6h.',
          'O sistema de classificação está congestionado. Como você orienta a gestão da triagem?',
        ],
        choices: [
          {
            text: 'Aplicar o Protocolo de Manchester para classificar os 12 pacientes por gravidade (Vermelho a Azul) em até 10 minutos por triagem.',
            correct: true,
            tooltip: 'Classificação de Risco de Manchester — diretriz do MS/COFEN',
            feedback: 'Excelente! A triagem por gravidade com discriminadores do Protocolo de Manchester garante atendimento prioritário a casos críticos, reduzindo a mortalidade no PS.',
            effect: (s) => ({ prestige: s.prestige + 30, stress: s.stress + 5 }),
            missionEffect: 'triagem_ps:complete',
          },
          {
            text: 'Atender os pacientes estritamente por ordem de chegada na fila da recepção para evitar reclamações.',
            correct: false,
            tooltip: 'Ordem de chegada sem triagem de risco viabiliza eventos adversos fatais',
            feedback: 'Incorreto. Atender apenas por ordem de chegada no PS ignora a gravidade clínica e pode ser fatal para pacientes com enfarte ou sepse.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'triagem_ps:complete',
          },
          {
            text: 'Solicitar que a recepção suspenda as fichas de novos pacientes até que a fila atual seja completamente zerada.',
            correct: false,
            tooltip: 'Recusa de ficha de urgência viola direito constitucional (Art. 196 CF/88)',
            feedback: 'Incorreto. Suspender o acolhimento na porta do PS configura omissão de socorro e viola a legislação do SUS.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'triagem_ps:complete',
          },
          {
            text: 'Encaminhar todos os pacientes sem sinais visíveis de dor direta de volta para a Unidade Básica de Saúde.',
            correct: false,
            tooltip: 'Encaminhamento sem triagem clínica prévia por enfermeiro é conduta ilegal',
            feedback: 'Incorreto. Encaminhar sem classificação de risco por enfermeiro habilitado impede a identificação de emergências silenciosas.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'triagem_ps:complete',
          },
        ],
      },
      {
        id: 'fluxo_start',
        condition: (s) => s.completedMissions.includes('triagem_ps') && s.completedMissions.length >= 3 && !s.completedMissions.includes('fluxo_recepcao'),
        topic: 'Gestão do Cuidado em Enfermagem',
        text: [
          'Com o Manchester funcionando bem, a triagem melhorou muito!',
          'Agora precisamos organizar o fluxo de agendamentos no ambulatório.',
          'Muitos pacientes chegam sem marcação. Qual estratégia integradora devemos adotar?',
        ],
        choices: [
          {
            text: 'Criar um protocolo de Acolhimento Integrado com triagem de demandas e agendamento informatizado multiprofissional.',
            correct: true,
            tooltip: 'Diretriz da Política Nacional de Humanização (PNH)',
            feedback: 'Perfeito! O Acolhimento Integrado organiza o acesso por necessidade de saúde, garantindo resolutividade e integração com a atenção primária.',
            effect: (s) => ({ prestige: s.prestige + 35 }),
            missionEffect: 'fluxo_recepcao:complete',
          },
          {
            text: 'Limitar o atendimento ambulatorial estritamente a quem possui agendamento prévio no sistema.',
            correct: false,
            tooltip: 'Restrição rígida sem acolhimento fura a diretriz do SUS',
            feedback: 'Incorreto. A recusa sistemática de demanda espontânea sem avaliação acolhedora viola as diretrizes da PNH.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'fluxo_recepcao:complete',
          },
          {
            text: 'Transferir a marcação de consultas exclusivamente para central telefônica externa.',
            correct: false,
            tooltip: 'Central telefônica isolada cria barreiras para populações vulneráveis',
            feedback: 'Incorreto. Central telefônica exclusiva sem pontos presenciais de apoio gera exclusão de idosos e usuários vulneráveis.',
            effect: (s) => ({ prestige: s.prestige - 10 }),
            missionEffect: 'fluxo_recepcao:complete',
          },
          {
            text: 'Instituir uma lista de espera manual em papel na porta do bloco cirúrgico/ambulatorial.',
            correct: false,
            tooltip: 'Controle manual em papel não oferece rastreabilidade nem auditoria',
            feedback: 'Incorreto. Listas manuais em papel causam extravio de dados, desorganização e perda de controle dos prazos regulatórios.',
            effect: (s) => ({ prestige: s.prestige - 2 }),
            missionEffect: 'fluxo_recepcao:complete',
          },
        ],
      },
      {
        id: 'idle',
        topic: 'Gestão do Cuidado em Enfermagem',
        text: [
          'A recepção está muito mais organizada, obrigada!',
          'O fluxo de atendimento é o coração do hospital.',
        ],
        choices: [{ text: 'Fico feliz em ouvir isso, Ana!' }],
      },
    ],
    dialoguePools: [
      // Pool 1: Classificação de Risco de Manchester (Kurcgant cap.6)
      [{
        id: 'pool1',
        topic: 'Gestão do Cuidado em Enfermagem',
        text: [
          'Precisamos de uma decisão rápida aqui na triagem!',
          'Paciente chegou com dor torácica há 30 minutos, sudorese fria, PA 90x60.',
          'Qual é a classificação correta pelo Protocolo de Manchester?',
        ],
        choices: [
          { text: 'Vermelho — emergência, atendimento imediato sem espera.', correct: true, tooltip: 'Dor torácica + instabilidade hemodinâmica = código vermelho (MTS)', feedback: 'Correto! Sinais de choque + dor torácica = categoria vermelha no Manchester. Risco de IAM iminente. (Manchester Triage Group, 2014)', effect: (s) => ({ prestige: s.prestige + 25 }) },
          { text: 'Laranja — muito urgente, atendimento em até 10 minutos.', correct: false, tooltip: 'Atenção à instabilidade hemodinâmica presente', feedback: 'Quase! A instabilidade hemodinâmica (PA 90x60 + sudorese) eleva para vermelho, não laranja. (MTS, 2014)', effect: (s) => ({ prestige: s.prestige - 8 }) },
          { text: 'Amarelo — urgente, atendimento em até 60 minutos.', correct: false, tooltip: 'Esse quadro não pode aguardar 60 minutos', feedback: 'Incorreto. Dor torácica com choque não pode esperar. O tempo é miocárdio! (ACLS 2020)', effect: (s) => ({ prestige: s.prestige - 2 }) },
          { text: 'Verde — pouco urgente, aguarda na fila padrão.', correct: false, tooltip: 'Triagem inadequada pode custar a vida do paciente', feedback: 'Perigoso! Subtriar esse quadro pode ser fatal. Revise o Protocolo de Manchester. (Kurcgant, 2016)', effect: (s) => ({ prestige: s.prestige - 5 }) },
        ],
      }],
      // Pool 2: Acolhimento com Classificação de Risco — PNH (cap.6)
      [{
        id: 'pool2',
        topic: 'Gestão do Cuidado em Enfermagem',
        text: [
          'Chegou uma senhora idosa sozinha, confusa, sem cartão do SUS.',
          'A fila está grande e a equipe está sobrecarregada.',
          'Qual deve ser o primeiro passo segundo a Política Nacional de Humanização?',
        ],
        choices: [
          { text: 'Realizar o acolhimento com escuta qualificada e classificação de risco imediatamente.', correct: true, tooltip: 'PNH: acolhimento independente da situação documental', feedback: 'Correto! O acolhimento com classificação de risco é a porta de entrada da PNH. Nenhum paciente pode ser recusado. (MS, HumanizaSUS 2009)', effect: (s) => ({ prestige: s.prestige + 25 }) },
          { text: 'Solicitar documento de identidade antes de prosseguir com o atendimento.', correct: false, feedback: 'Incorreto. A ausência de documentos nunca justifica a recusa de atendimento (Art. 196, CF/88).', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'Encaminhar para serviço social e aguardar resolução do cadastro.', correct: false, feedback: 'Incompleto. Primeiro classifique o risco — só depois o serviço social pode agir.', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'Chamar familiar por telefone e aguardar responsável antes de atender.', correct: false, feedback: 'Incorreto. Paciente confuso pode estar em risco. Avalie primeiro, busque familiar depois.', effect: (s) => ({ prestige: s.prestige - 2 }) },
        ],
      }],
      // Pool 3: Fluxo de Atendimento — gestão de filas (Kurcgant cap.4)
      [{
        id: 'pool3',
        topic: 'Gestão da Qualidade',
        text: [
          'O tempo médio de espera na recepção subiu para 4 horas.',
          'Pacientes estão saindo sem ser atendidos — evasão hospitalar.',
          'Qual intervenção de gestão é mais eficaz para reduzir o tempo de espera?',
        ],
        choices: [
          { text: 'Mapear o fluxo atual (fluxograma), identificar gargalos e redistribuir recursos nos pontos críticos.', correct: true, tooltip: 'Análise de processos: ferramenta de gestão de fluxo (Kurcgant cap.4)', feedback: 'Excelente! O mapeamento de fluxo e análise de gargalos é a base da gestão científica de processos hospitalares. (Kurcgant, 2016 cap.4)', effect: (s) => ({ prestige: s.prestige + 28 }) },
          { text: 'Contratar mais recepcionistas para atender mais rápido.', correct: false, feedback: 'Apenas aumentar pessoal sem mapear o processo raramente resolve o problema e aumenta custos.', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'Colocar aviso na entrada pedindo que pacientes não urgentes busquem UBS.', correct: false, feedback: 'Medida paliativa. Sem triagem adequada, pode negar atendimento a pacientes que precisam.', effect: (s) => ({ prestige: s.prestige - 3 }) },
          { text: 'Reduzir o horário de atendimento para concentrar a equipe.', correct: false, feedback: 'Reduzir horário aumenta a concentração de demanda nos picos, piorando o problema.', effect: (s) => ({ prestige: s.prestige - 5 }) },
        ],
      }],
    ],
  },
  {
    id: 'enf_carlos',
    name: 'Enf. Carlos',
    title: 'Enfermeiro do Pronto-Socorro',
    role: 'nurse',
    spriteKey: 'npc_carlos',
    startCol: 18, startRow: 6,
    bodyColor: 0xffffff, coatColor: 0x14b8a6, hairColor: 0x2c1810, skinColor: 0xd4a574,
    patrolPoints: [
      { col: 18, row: 6 }, { col: 17, row: 6 }, { col: 19, row: 6 }
    ],
    schedule: [
      { hour: 7, col: 18, row: 6 }, { hour: 19, col: 18, row: 6 },
    ],
    missionIds: ['protocolo_sepse', 'superlotacao_ps'],
    dialogues: [
      {
        id: 'sepse_intro',
        condition: (s) => !s.completedMissions.includes('protocolo_sepse'),
        topic: 'Segurança do Paciente',
        text: [
          'Precisamos urgente de um protocolo de sepse aqui no PS!',
          'Já tivemos 3 casos este mês com diagnóstico tardio.',
          'Qual é a conduta gerencial imediata recomendada pela Surviving Sepsis Campaign?',
        ],
        choices: [
          {
            text: 'Implantar a Bundle de 1 hora (Surviving Sepsis): dosagem de lactato, hemoculturas antes do antibiótico, antimicrobiano de amplo espectro e ressuscitação volêmica.',
            correct: true,
            tooltip: 'Bundle de Sepse (1h) — protocolo prioritário internacional',
            feedback: 'Perfeito! A instituição da Bundle de 1h reduz drasticamente a mortalidade por choque séptico e choque refratário no PS.',
            effect: (s) => ({ prestige: s.prestige + 35, stress: s.stress + 5 }),
            missionEffect: 'protocolo_sepse:complete',
          },
          {
            text: 'Aguardar o laudo completo do hemograma, tomografia e PCR antes de autorizar qualquer antimicrobiano.',
            correct: false,
            tooltip: 'Atraso na antibioticoterapia reduz sobrevivência em 7,6% a cada hora',
            feedback: 'Incorreto. Em sepse grave, adiar o antibiótico à espera de exames secundários aumenta a mortalidade em até 7,6% por hora de atraso.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'protocolo_sepse:complete',
          },
          {
            text: 'Prescrever apenas antitérmico para a febre e manter o paciente em observação no leito por 6 horas.',
            correct: false,
            tooltip: 'Tratar apenas o sintoma sem combater a infecção gera choque fatal',
            feedback: 'Incorreto. Tratar sintomaticamente a febre sem investigar e tratar a infecção bacteriana leva à falência múltipla de órgãos.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'protocolo_sepse:complete',
          },
          {
            text: 'Transferir o paciente imediatamente para a UTI sem iniciar nenhuma medida terapêutica no PS.',
            correct: false,
            tooltip: 'A bundle deve ser iniciada no local da identificação clínica',
            feedback: 'Incorreto. O protocolo de sepse deve ser iniciado imediatamente no Pronto-Socorro. Aguardar vaga de UTI sem tratamento é negligência.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'protocolo_sepse:complete',
          },
        ],
      },
      {
        id: 'superlot_intro',
        condition: (s) => s.completedMissions.includes('protocolo_sepse') && s.completedMissions.length >= 3 && !s.completedMissions.includes('superlotacao_ps'),
        topic: 'Tomada de Decisão',
        text: [
          'Protocolo de sepse funcionando. Mas o PS está cheio de novo!',
          'Precisamos de um plano de contingência para superlotação.',
          'Qual diretriz de gestão de capacidade instalada devemos adotar no PS?',
        ],
        choices: [
          {
            text: 'Elaborar Plano de Contingência com protocolo de Fast-Track para casos leves, giro leito rápido e alta responsável em até 24h.',
            correct: true,
            tooltip: 'Gestão de contingência de overcrowding no Pronto-Socorro',
            feedback: 'Excelente! O protocolo de Fast-Track e gestão ativa do tempo de permanência destrava o fluxo no PS sem comprometer a segurança assistencial.',
            effect: (s) => ({ prestige: s.prestige + 40 }),
            missionEffect: 'superlotacao_ps:complete',
          },
          {
            text: 'Fechar as portas do Pronto-Socorro para ambulâncias enquanto a ocupação estiver acima de 100%.',
            correct: false,
            tooltip: 'Fechamento de porta violaria diretrizes de urgência do SUS e regulação regional',
            feedback: 'Incorreto. Fechar as portas de urgência nega socorro e descumpre as normas do sistema de regulação médica do SAMU.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'superlotacao_ps:complete',
          },
          {
            text: 'Adicionar 20 macas improvisadas nos corredores sem aumentar o quantitativo da equipe de enfermagem.',
            correct: false,
            tooltip: 'Aumento de macas sem dimensionamento proporcional gera eventos graves',
            feedback: 'Incorreto. Macas em corredor sem dimensionamento adequado aumentam drasticamente a taxa de quedas e erros de medicação.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'superlotacao_ps:complete',
          },
          {
            text: 'Exigir que a equipe de enfermagem do turno atual dobre a jornada de trabalho obrigatoriamente.',
            correct: false,
            tooltip: 'Jornada dupla compulsória gera fadiga crônica e burnout na equipe',
            feedback: 'Incorreto. Dobras repetidas sem descanso geram fadiga, absenteísmo e sobrecarga que elevam as falhas assistenciais.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'superlotacao_ps:complete',
          },
        ],
      },
      {
        id: 'idle',
        topic: 'Gestão do Cuidado em Enfermagem',
        text: [
          'O PS está mais organizado agora.',
          'Cada segundo importa aqui. Obrigado pelo apoio!',
        ],
        choices: [{ text: 'Continue o ótimo trabalho, Carlos!' }],
      },
    ],
    dialoguePools: [
      [{
        id: 'pool1_carlos',
        topic: 'Segurança do Paciente',
        text: [
          'Temos um paciente com suspeita de sepse — PA 80x50, febre 39°C, lactato 3,2.',
          'O residente pediu para aguardar mais exames antes de iniciar antibiótico.',
          'Como gerente, qual é a conduta correta baseada na Bundle de Sepse?',
        ],
        choices: [
          { text: 'Iniciar antibiótico em até 1 hora, coletar hemoculturas, repor volemia conforme bundle de 1h.', correct: true, tooltip: 'Bundle de sepse: antibiótico na 1ª hora reduz mortalidade em 7% por hora de atraso', feedback: 'Perfeito! A Bundle de 1h da Surviving Sepsis Campaign (2018) é mandatória: antibiótico < 1h, hemocultura, lactato e reposição volêmica.', effect: (s) => ({ prestige: s.prestige + 30, stress: s.stress + 5 }) },
          { text: 'Aguardar resultado de hemograma e PCR para confirmar sepse antes de antibiótico.', correct: false, feedback: 'Incorreto. Em sepse, cada hora de atraso do antibiótico aumenta a mortalidade em ~7%. Não aguarde exames.', effect: (s) => ({ prestige: s.prestige - 3 }) },
          { text: 'Solicitar parecer da infectologia antes de iniciar qualquer tratamento.', correct: false, feedback: 'Perigoso! O parecer pode demorar horas. A bundle de sepse não pode aguardar. Trate empiricamente.', effect: (s) => ({ prestige: s.prestige - 2 }) },
          { text: 'Transferir para UTI e aguardar o intensivista decidir o tratamento.', correct: false, feedback: 'Incompleto. A bundle deve ser iniciada no PS imediatamente, não pode aguardar a UTI.', effect: (s) => ({ prestige: s.prestige - 5 }) },
        ],
      }],
      [{
        id: 'pool2_carlos',
        topic: 'Dimensionamento de Enfermagem',
        text: [
          'A equipe está com 3 técnicos de enfermagem para atender 18 pacientes no PS.',
          'Segundo o COFEN, qual é o dimensionamento mínimo para o Pronto-Socorro?',
          'Preciso da sua orientação para justificar mais contratações à direção.',
        ],
        choices: [
          { text: 'Resolução COFEN 543/2017: no mínimo 1 enfermeiro para cada 10 pacientes em unidade de urgência.', correct: true, tooltip: 'Resolução COFEN 543/2017 — parâmetros de dimensionamento', feedback: 'Correto! A Resolução COFEN 543/2017 estabelece parâmetros mínimos. No PS de média/alta complexidade: 1 enf./10 pacientes. Use isso para fundamentar a solicitação. (Kurcgant, 2016 cap.10)', effect: (s) => ({ prestige: s.prestige + 28 }) },
          { text: 'Não há regulamentação específica; cada hospital define seus próprios parâmetros.', correct: false, feedback: 'Incorreto. A Resolução COFEN 543/2017 define parâmetros mínimos para dimensionamento em todos os setores.', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'O importante é ter pelo menos 1 enfermeiro de plantão, independente do número de pacientes.', correct: false, feedback: 'Insuficiente. A legislação estabelece relação quantitativa enfermeiro/paciente específica por setor e complexidade.', effect: (s) => ({ prestige: s.prestige - 2 }) },
          { text: 'O dimensionamento é calculated pela direção hospitalar com base no orçamento disponível.', correct: false, feedback: 'Errado. O COFEN define parâmetros técnicos mínimos que devem ser respeitados independente do orçamento.', effect: (s) => ({ prestige: s.prestige - 5 }) },
        ],
      }],
      [{
        id: 'pool3_carlos',
        topic: 'Negociação de Conflitos',
        text: [
          'Acabei de discutir com a médica plantonista sobre a conduta de um paciente.',
          'Ela ignorou minha observação sobre o risco de broncoaspiração.',
          'Como o enfermeiro gerente deve lidar com conflitos multiprofissionais?',
        ],
        choices: [
          { text: 'Comunicar a observação por escrito no prontuário e, se necessário, escalar ao chefe médico com dados clínicos.', correct: true, tooltip: 'Comunicação estruturada e documentada: SBAR/I-PASS', feedback: 'Correto! A comunicação efetiva via SBAR (Situação-Background-Avaliação-Recomendação) e registro no prontuário protegem o paciente e o profissional. (Kurcgant cap.5 — Conflitos)', effect: (s) => ({ prestige: s.prestige + 25 }) },
          { text: 'Aceitar a decisão médica e não interferir — a responsabilidade é dela.', correct: false, feedback: 'Incorreto. O enfermeiro tem responsabilidade autônoma pela segurança do paciente. Omitir-se é negligência.', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'Relatar imediatamente ao COREN como desentendimento multiprofissional.', correct: false, feedback: 'Precipitado. O COREN é para questões éticas graves. Primeiro tente a comunicação direta estruturada.', effect: (s) => ({ prestige: s.prestige - 2 }) },
          { text: 'Falar com outros colegas sobre o comportamento da médica para obter apoio.', correct: false, feedback: 'Incorreto. Fofoca profissional piora o clima e viola princípios éticos. Comunique-se diretamente.', effect: (s) => ({ prestige: s.prestige - 3 }) },
        ],
      }],
    ],
  },
  {
    id: 'joao_farmaceutico',
    name: 'Farm. João',
    title: 'Farmacêutico Hospitalar',
    role: 'technician',
    spriteKey: 'npc_joao',
    startCol: 30, startRow: 7,
    bodyColor: 0xffffff, coatColor: 0xa5b4fc, hairColor: 0x1a1a1a, skinColor: 0xf5c5a3,
    patrolPoints: [
      { col: 30, row: 7 }, { col: 27, row: 7 }, { col: 27, row: 11 }, { col: 34, row: 11 },
    ],
    schedule: [
      { hour: 8, col: 30, row: 7 }, { hour: 16, col: 30, row: 11 },
    ],
    missionIds: ['estoque_farmacia', 'reconciliacao_medicamentosa'],
    dialogues: [
      {
        id: 'estoque_intro',
        condition: (s) => !s.completedMissions.includes('estoque_farmacia'),
        topic: 'Gestão de Recursos Materiais e Custos nos Serviços de Saúde e Enfermagem',
        text: [
          'Oi! Estamos com estoque crítico de medicamentos vasoativos.',
          'Norepinefrina, Vasopressina e Midazolam abaixo de 20%.',
          'Qual método de gestão de materiais em saúde devemos utilizar para sanar o desabastecimento?',
        ],
        choices: [
          {
            text: 'Aplicar a metodologia da Curva ABC e definir ponto de ressuprimento emergencial para drogas vasoativas (Itens A).',
            correct: true,
            tooltip: 'Gestão da Curva ABC — priorização de itens críticos',
            feedback: 'Excelente! Drogas vasoativas são classificação A (alto valor/risco assistencial). Definir estoque mínimo de segurança evita paradas na UTI.',
            effect: (s) => ({ prestige: s.prestige + 35 }),
            missionEffect: 'estoque_farmacia:complete',
          },
          {
            text: 'Comprar volumes gigantescos de todos os remédios do hospital para estocar por 1 ano inteiro.',
            correct: false,
            tooltip: 'Estoque excessivo imobiliza capital e gera perdas por vencimento',
            feedback: 'Incorreto. Superestocar gera perda financeira por vencimento e degradação de insumos sem fluxo.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'estoque_farmacia:complete',
          },
          {
            text: 'Adotar compras exclusivamente sob demanda individualizada por prescrição médica diária.',
            correct: false,
            tooltip: 'Sem estoque mínimo de segurança ocorrem frequentes desabastecimentos',
            feedback: 'Incorreto. Comprar sem estoque mínimo de segurança gera desabastecimento contínuo e atrasos terapêuticos graves.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'estoque_farmacia:complete',
          },
          {
            text: 'Substituir medicamentos vasoativos em falta por sedativos orais disponíveis no almoxarifado.',
            correct: false,
            tooltip: 'Substituição clínica arbitrária põe em risco iminente a vida do paciente em choque',
            feedback: 'Incorreto. Substituir drogas vasoativas por sedativos sem prescrição médica e indicação hemodinâmica é conduta perigosa.',
            effect: (s) => ({ prestige: s.prestige - 10 }),
            missionEffect: 'estoque_farmacia:complete',
          },
        ],
      },
      {
        id: 'reconciliacao_intro',
        condition: (s) => s.completedMissions.includes('estoque_farmacia') && s.completedMissions.length >= 3 && !s.completedMissions.includes('reconciliacao_medicamentosa'),
        topic: 'Segurança do Paciente',
        text: [
          'Obrigado pela agilidade no estoque!',
          'Agora preciso de apoio para implementar a Reconciliação Medicamentosa.',
          'É requisito da ONA e reduz eventos adversos em 70%! Como devemos implantar o fluxo?',
        ],
        choices: [
          {
            text: 'Implantar o Protocolo de Reconciliação Medicamentosa na admissão, transferência e alta hospitalar (3ª Meta OMS) com anamnese farmacológica ativa.',
            correct: true,
            tooltip: '3ª Meta Internacional da OMS — Segurança de Medicamentos',
            feedback: 'Perfeito! A Reconciliação Medicamentosa nas transições do cuidado reduz até 70% das omissões e duplicidades terapêuticas indesejadas.',
            effect: (s) => ({ prestige: s.prestige + 40 }),
            missionEffect: 'reconciliacao_medicamentosa:complete',
          },
          {
            text: 'Orientar os pacientes a continuarem tomando seus próprios remédios trazidos de casa sem cadastro no prontuário.',
            correct: false,
            tooltip: 'Uso de remédios próprios sem checagem gera superdosagem e interações fatais',
            feedback: 'Incorreto. Uso de medicamentos trazidos de casa sem checagem e prescrição hospitalar acarreta erros graves e superdosagem.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'reconciliacao_medicamentosa:complete',
          },
          {
            text: 'Suspender todos os medicamentos de uso contínuo durante a internação para simplificar o aprazamento.',
            correct: false,
            tooltip: 'Suspensão abrupta sem critério causa descompensação grave de doenças prévias',
            feedback: 'Incorreto. Suspender desnecessariamente medicamentos de uso contínuo (anti-hipertensivos, insulinas) causa descompensação aguda.',
            effect: (s) => ({ prestige: s.prestige - 2 }),
            missionEffect: 'reconciliacao_medicamentosa:complete',
          },
          {
            text: 'Transferir a responsabilidade da checagem dos remédios antigos para acompanhantes leigos do paciente.',
            correct: false,
            tooltip: 'Anamnese farmacológica é atribuição técnica da equipe de saúde',
            feedback: 'Incorreto. A reconciliação medicamentosa é ato assistencial privativo da equipe multidisciplinar de saúde.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'reconciliacao_medicamentosa:complete',
          },
        ],
      },
      {
        id: 'idle',
        topic: 'Gestão de Recursos Materiais e Custos nos Serviços de Saúde e Enfermagem',
        text: [
          'A farmácia agora tem rastreabilidade total dos medicamentos!',
          'Use-me como referência em dúvidas de fármacos.',
        ],
        choices: [{ text: 'Ótimo trabalho, João!' }],
      },
    ],
    dialoguePools: [
      [{
        id: 'pool1_joao',
        topic: 'Gestão de Recursos Materiais e Custos nos Serviços de Saúde e Enfermagem',
        text: [
          'Precisamos revisar o estoque de medicamentos da UTI.',
          'Temos itens A, B e C com perfis de custo e giro muito diferentes.',
          'Qual metodologia de gestão de estoque é mais indicada? (Kurcgant cap.12)',
        ],
        choices: [
          { text: 'Curva ABC: itens A = 80% do custo (controle rigoroso), B = 15%, C = 5% (controle menor).', correct: true, tooltip: 'Curva ABC — ferramenta padrão de gestão de materiais hospitalares', feedback: 'Excelente! A Curva ABC é a principal ferramenta de gestão de estoque em saúde. Itens A exigem controle diário, B semanal, C mensal. (Kurcgant, 2016 cap.12)', effect: (s) => ({ prestige: s.prestige + 28 }) },
          { text: 'Comprar em grande quantidade para garantir estoque de 6 meses e evitar falta.', correct: false, feedback: 'Incorreto. Estoques excessivos geram custos de armazenamento, vencimento e capital imobilizado. (Kurcgant cap.12)', effect: (s) => ({ prestige: s.prestige - 3 }) },
          { text: 'Priorizar os medicamentos mais utilizados pelos médicos, independente do custo.', correct: false, feedback: 'Incompleto. O uso sem análise de custo-efetividade não é gestão racional de recursos. (Kurcgant cap.14)', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'Terceirizar todo o estoque para uma empresa de logística hospitalar.', correct: false, feedback: 'Pode ser uma solução, mas não substitui o conhecimento do método ABC para controle e rastreabilidade.', effect: (s) => ({ prestige: s.prestige - 1 }) },
        ],
      }],
      [{
        id: 'pool2_joao',
        topic: 'Segurança do Paciente',
        text: [
          'Um paciente chegou da enfermaria usando 12 medicamentos crônicos diferentes.',
          'Na admissão, o prescritor só registrou 7 no sistema hospitalar.',
          'O que o protocolo de Reconciliação Medicamentosa determina fazer?',
        ],
        choices: [
          { text: 'Obter a lista completa de medicamentos do paciente (anamnese farmacológica) e reconciliar com a prescrição hospitalar.', correct: true, tooltip: 'OMS — 5ª Meta Internacional: reconciliação medicamentosa', feedback: 'Correto! A Reconciliação Medicamentosa é a 3ª Meta da OMS para Segurança do Paciente. Previne até 70% dos erros na transição do cuidado. (Kurcgant cap.6)', effect: (s) => ({ prestige: s.prestige + 30 }) },
          { text: 'Suspender todos os medicamentos crônicos durante a internação para evitar interações.', correct: false, feedback: 'Perigoso! Suspensão abrupta pode causar síndrome de abstinência, descompensação de doenças crônicas.', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'Manter apenas os 7 medicamentos registrados e documentar que o paciente não soube informar os demais.', correct: false, feedback: 'Incorreto. O farmacêutico deve investigar ativamente a lista completa em múltiplas fontes.', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'Encaminhar para o médico decidir quais medicamentos manter sem levantamento ativo.', correct: false, feedback: 'Incompleto. A reconciliação ativa é responsabilidade multiprofissional — farmácia e enfermagem atuam juntos.', effect: (s) => ({ prestige: s.prestige - 4 }) },
        ],
      }],
      [{
        id: 'pool3_joao',
        topic: 'Segurança do Paciente',
        text: [
          'A equipe de enfermagem quer guardar medicamentos vasoativos na gaveta da enfermaria.',
          'Qual é a regulamentação sobre armazenamento de medicamentos de alta vigilância?',
          '(Kurcgant cap.12 — Gestão de Recursos Materiais)',
        ],
        choices: [
          { text: 'Medicamentos de alta vigilância devem ficar em área controlada, com dupla checagem de acesso e identificação especial — não em gaveta aberta.', correct: true, tooltip: 'ANVISA/ISMP — medicamentos de alta vigilância exigem barreiras de segurança', feedback: 'Perfeito! O ISMP Brasil e a ANVISA exigem que medicamentos de alta vigilância (vasoativos, eletrólitos concentrados, insulina) tenham controle especial de acesso e identificação diferenciada. (Kurcgant cap.12)', effect: (s) => ({ prestige: s.prestige + 28 }) },
          { text: 'Não há restrição específica; basta manter o frasco com rótulo correto.', correct: false, feedback: 'Incorreto. Medicamentos de alta vigilância têm regulamentação específica do ISMP para prevenção de erros graves.', effect: (s) => ({ prestige: s.prestige - 3 }) },
          { text: 'Podem ficar na gaveta desde que a chave esteja com o enfermeiro responsável.', correct: false, feedback: 'Insuficiente. A chave com o enfermeiro não basta — são necessárias barreiras de dupla checagem e identificação visual especial.', effect: (s) => ({ prestige: s.prestige - 3 }) },
          { text: 'Guardar em geladeira separada é suficiente para qualquer medicamento de risco.', correct: false, feedback: 'Incompleto. Refrigeração é necessária para alguns, mas não substitui os protocolos de alta vigilância do ISMP.', effect: (s) => ({ prestige: s.prestige - 2 }) },
        ],
      }],
    ],
  },
  {
    id: 'tec_laboratorio',
    name: 'Tec. Renata',
    title: 'Técnica de Laboratório',
    role: 'technician',
    spriteKey: 'npc_renata',
    startCol: 43, startRow: 7,
    bodyColor: 0xffffff, coatColor: 0xcbd5e1, hairColor: 0x8b4513, skinColor: 0xf0d5b0,
    patrolPoints: [
      { col: 43, row: 7 }, { col: 40, row: 7 }, { col: 40, row: 11 }, { col: 46, row: 11 },
    ],
    schedule: [
      { hour: 7, col: 43, row: 7 }, { hour: 15, col: 43, row: 11 },
    ],
    missionIds: ['resultados_criticos', 'coleta_sistematizada'],
    dialogues: [
      {
        id: 'criticos_intro',
        condition: (s) => !s.completedMissions.includes('resultados_criticos'),
        topic: 'Competências Gerenciais e Assistenciais',
        text: [
          'Bom dia! Temos um problema sério com comunicação de resultados críticos.',
          'Os enfermeiros às vezes demoram horas para receber resultados urgentes.',
          'Qual diretriz da 2ª Meta da OMS sobre comunicação de resultados lab/imagem devemos instituir?',
        ],
        choices: [
          {
            text: 'Instituir o Protocolo de Notificação Compulsória de Valores Críticos (Read-Back obrigatório em até 30 min para lactato, potássio e troponina).',
            correct: true,
            tooltip: '2ª Meta Internacional da OMS — Comunicação Efetiva',
            feedback: 'Excelente! O protocolo com confirmação de leitura (Read-Back) e notificação ativa imediata reduz drasticamente a morbimortalidade de pacientes críticos.',
            effect: (s) => ({ prestige: s.prestige + 35 }),
            missionEffect: 'resultados_criticos:complete',
          },
          {
            text: 'Disponibilizar os resultados apenas no sistema informatizado e aguardar que o médico acesse o sistema no fim do turno.',
            correct: false,
            tooltip: 'Lançar no sistema sem notificação ativa adia a intervenção clínica vital',
            feedback: 'Incorreto. Apenas lançar no sistema sem notificação telefônica ou alerta ativo para exames críticos viola a segurança do paciente.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'resultados_criticos:complete',
          },
          {
            text: 'Enviar os resultados de exames alterados via impresso em papel entregue pelo maqueiro uma vez por dia.',
            correct: false,
            tooltip: 'Entrega física diária retarda tratamentos emergenciais',
            feedback: 'Incorreto. Relatórios impressos entregues por maqueiro uma vez ao dia causam atrasos inaceitáveis em emergências.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'resultados_criticos:complete',
          },
          {
            text: 'Solicitar que o próprio paciente ou acompanhante busque o laudo físico no balcão do laboratório.',
            correct: false,
            tooltip: 'Delegar busca de exames urgentes a familiares é inapropriado em ambiente hospitalar',
            feedback: 'Incorreto. A responsabilidade da circulação de resultados críticos intra-hospitalares é exclusiva das equipes de saúde.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'resultados_criticos:complete',
          },
        ],
      },
      {
        id: 'coleta_intro',
        condition: (s) => s.completedMissions.includes('resultados_criticos') && s.completedMissions.length >= 3 && !s.completedMissions.includes('coleta_sistematizada'),
        topic: 'Segurança do Paciente',
        text: [
          'Protocolo de valores críticos funcionando bem!',
          'Agora precisamos padronizar a coleta de sangue nos leitos.',
          'Muitos tubos chegam sem identificação no leito. Como garantir a conformidade pré-analítica?',
        ],
        choices: [
          {
            text: 'Padronizar a checagem à beira-leito (Beira-Leito ID) utilizando duplo identificador (nome e data de nascimento) e etiquetagem imediata perante o paciente.',
            correct: true,
            tooltip: '1ª Meta Internacional da OMS — Identificação Correta do Paciente',
            feedback: 'Perfeito! A identificação no momento exato da coleta e checagem de duplo identificador zera as trocas de amostras e hemólises.',
            effect: (s) => ({ prestige: s.prestige + 30 }),
            missionEffect: 'coleta_sistematizada:complete',
          },
          {
            text: 'Etiquetar previamente todos os tubos no balcão do laboratório antes de ir aos leitos do corredor.',
            correct: false,
            tooltip: 'Etiquetagem prévia fora do leito é a maior causa de troca de tubos',
            feedback: 'Incorreto. Etiquetar tubos no balcão antes de chegar ao leito é a principal causa de troca acidental de amostras entre pacientes.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'coleta_sistematizada:complete',
          },
          {
            text: 'Identificar os tubos apenas com o número do leito para acelerar a rotina da manhã.',
            correct: false,
            tooltip: 'Número do leito não é identificador confiável (pacientes trocam de leito)',
            feedback: 'Incorreto. O número do leito não pode ser usado como identificador do paciente, pois trocas de leitos acontecem constantemente.',
            effect: (s) => ({ prestige: s.prestige - 2 }),
            missionEffect: 'coleta_sistematizada:complete',
          },
          {
            text: 'Coletar o sangue sem identificação e pedir para o enfermeiro assinar o tubo no laboratório mais tarde.',
            correct: false,
            tooltip: 'Amostra sem rótulo à beira leito deve ser descartada imediatamente',
            feedback: 'Incorreto. Coletar sem rotulagem à beira-leito exige o descarte imediato da amostra por norma de biossegurança.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'coleta_sistematizada:complete',
          },
        ],
      },
      {
        id: 'idle',
        topic: 'Gestão da Qualidade',
        text: [
          'O laboratório está com tempo de entrega muito melhor!',
          'Identificação correta do paciente é vital na coleta.',
        ],
        choices: [{ text: 'Continue esse excelente trabalho!' }],
      },
    ],
    dialoguePools: [
      [{
        id: 'pool1_renata',
        text: [
          'Chegou um resultado de potássio = 6,8 mEq/L de um paciente da UTI.',
          'O enfermeiro de plantão não foi avisado ainda — já passaram 45 minutos.',
          'O que o protocolo de valores críticos determina nesta situação?',
        ],
        choices: [
          { text: 'Comunicação imediata (< 30 min) ao enfermeiro/médico responsável, com registro documentado do horário e nome de quem recebeu.', correct: true, tooltip: 'JCI/ONA: comunicação de valores críticos em até 30 minutos', feedback: 'Correto! Potássio 6,8 é criticamente alto (risco de PCR). A JCI e ONA exigem comunicação ativa em < 30 min com documentação completa. (Kurcgant cap.6)', effect: (s) => ({ prestige: s.prestige + 30 }) },
          { text: 'Registrar no sistema e aguardar o enfermeiro verificar no próximo acesso.', correct: false, feedback: 'Perigoso! Potássio 6,8 pode causar arritmia fatal em minutos. O contato ativo e imediato é mandatório.', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'Ligar para o setor e deixar recado com qualquer funcionário disponível.', correct: false, feedback: 'Insuficiente. O protocolo exige confirmação de recebimento por profissional habilitado, não apenas "recado deixado".', effect: (s) => ({ prestige: s.prestige - 3 }) },
          { text: 'Enviar e-mail para o plantonista com o resultado e aguardar retorno.', correct: false, feedback: 'E-mail não garante comunicação imediata. Valores críticos exigem contato direto por telefone/pessoalmente.', effect: (s) => ({ prestige: s.prestige - 5 }) },
        ],
      }],
      [{
        id: 'pool2_renata',
        text: [
          'Três tubos chegaram sem etiqueta de identificação do paciente.',
          'A coleta foi feita pelo técnico de plantão na enfermaria.',
          'Qual é a conduta correta segundo as metas de segurança do paciente?',
        ],
        choices: [
          { text: 'Descartar os tubos e notificar a equipe para nova coleta com identificação adequada — nunca processar amostra sem identificação.', correct: true, tooltip: 'OMS 1ª Meta: identificação correta do paciente', feedback: 'Correto! A 1ª Meta da OMS para Segurança do Paciente é a identificação correta. Amostras sem ID nunca devem ser processadas — risco de trocar resultados entre pacientes. (Kurcgant cap.6)', effect: (s) => ({ prestige: s.prestige + 28 }) },
          { text: 'Processar os tubos e tentar identificar depois pelo registro da coleta.', correct: false, feedback: 'Perigoso! Processar amostra sem identificação pode gerar troca de resultados com consequências graves para o paciente.', effect: (s) => ({ prestige: s.prestige - 8 }) },
          { text: 'Telefonar para o setor e perguntar qual paciente foi coletado naquele horário.', correct: false, feedback: 'Insuficiente. A confirmação verbal não garante segurança. O protocolo exige identificação no ponto de coleta.', effect: (s) => ({ prestige: s.prestige - 4 }) },
          { text: 'Processar e colocar como "identificação pendente" no sistema até esclarecer.', correct: false, feedback: 'Incorreto. Resultados "pendentes" sem ID podem ser consultados erroneamente por outro paciente.', effect: (s) => ({ prestige: s.prestige - 1 }) },
        ],
      }],
      [{
        id: 'pool3_renata',
        text: [
          'O laboratório quer implantar um sistema informatizado de gestão de amostras.',
          'A diretora perguntou quais critérios deve considerar na escolha do sistema.',
          'Com base em Sistemas de Informação em Saúde (Kurcgant cap.7), o que é prioritário?',
        ],
        choices: [
          { text: 'Interoperabilidade com o prontuário eletrônico (integração PEP-LIS), rastreabilidade de amostras e tempo de resposta para valores críticos.', correct: true, tooltip: 'Kurcgant cap.7 — Sistemas de Informação: integração e rastreabilidade como critérios-chave', feedback: 'Excelente! A integração PEP-LIS, rastreabilidade e alertas de valores críticos são os critérios fundamentais para segurança do paciente em SIS. (Kurcgant cap.7)', effect: (s) => ({ prestige: s.prestige + 30 }) },
          { text: 'O sistema mais barato que atenda às necessidades básicas de registro.', correct: false, feedback: 'Custo é critério, mas não pode ser o único. Sistemas inadequados geram erros que custam mais que o economizado.', effect: (s) => ({ prestige: s.prestige - 2 }) },
          { text: 'O sistema mais utilizado no mercado, independente da integração com os outros sistemas.', correct: false, feedback: 'Popularidade sem integração cria ilhas de informação. A interoperabilidade é critério essencial. (Kurcgant cap.7)', effect: (s) => ({ prestige: s.prestige - 3 }) },
          { text: 'Qualquer sistema cloud é suficiente; o importante é a interface ser fácil de usar.', correct: false, feedback: 'Usabilidade é importante, mas segurança de dados, integração e conformidade com LGPD são igualmente críticos.', effect: (s) => ({ prestige: s.prestige - 1 }) },
        ],
      }],
    ],
  },
  {
    id: 'dr_radiologista',
    name: 'Dr. Farias',
    title: 'Médico Radiologista',
    role: 'doctor',
    spriteKey: 'npc_farias',
    startCol: 55, startRow: 7,
    bodyColor: 0xffffff, coatColor: 0xe8f4f8, hairColor: 0x708090, skinColor: 0xf5c5a3,
    patrolPoints: [
      { col: 55, row: 7 }, { col: 52, row: 7 }, { col: 52, row: 11 }, { col: 58, row: 11 },
    ],
    schedule: [
      { hour: 8, col: 55, row: 7 }, { hour: 17, col: 55, row: 7 },
    ],
    missionIds: ['laudo_urgente'],
    dialogues: [
      {
        id: 'laudo_intro',
        condition: (s) => !s.completedMissions.includes('laudo_urgente'),
        topic: 'Tomada de Decisão',
        text: [
          'Boa tarde. Temos acúmulo de exames aguardando laudo urgente.',
          'O fluxo de solicitação está desorganizado.',
          'Qual estratégia de triagem diagnóstica deve ser implantada no serviço de imagem?',
        ],
        choices: [
          {
            text: 'Instituir sistema de triagem com critérios clínicos objetivos (urgência/emergência x eletivo) integrado ao PACS/RIS e notificação via sistema.',
            correct: true,
            tooltip: 'Gestão de fluxos diagnósticos e regulação interna',
            feedback: 'Excelente! A triagem por critérios clínicos objetivos no PACS/RIS reduz drasticamente o tempo de laudo para AVC, TEPA e traumas graves.',
            effect: (s) => ({ prestige: s.prestige + 35 }),
            missionEffect: 'laudo_urgente:complete',
          },
          {
            text: 'Processar todos os exames em ordem estritamente cronológica de chegada na fila do equipamento.',
            correct: false,
            tooltip: 'Fila cronológica simples atrasa laudos de emergência médica',
            feedback: 'Incorreto. Fila cronológica sem priorização por gravidade atrasa intervenções vitais em exames de emergência.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'laudo_urgente:complete',
          },
          {
            text: 'Exigir que o médico solicitante vá pessoalmente à sala do radiologista para cada exame pedido.',
            correct: false,
            tooltip: 'Interrupção presencial constante gera perda de produtividade dos médicos',
            feedback: 'Incorreto. Exigir deslocamento presencial constante desorganiza a rotina das unidades e atrasa os atendimentos.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'laudo_urgente:complete',
          },
          {
            text: 'Interromper o atendimento de exames de internação para atender apenas o ambulatório de rotina.',
            correct: false,
            tooltip: 'Priorizar rotina sobre paciente internado crítico agrava o tempo de permanência hospitalar',
            feedback: 'Incorreto. Suspender exames de pacientes internados eleva a taxa de ocupação dos leitos e prolonga a internação.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'laudo_urgente:complete',
          },
        ],
      },
      {
        id: 'idle',
        topic: 'Competências Gerenciais e Assistenciais',
        text: [
          'Com a priorização, os exames críticos saem em menos de 2 horas!',
          'A enfermagem é fundamental no fluxo diagnóstico.',
        ],
        choices: [{ text: 'Ótima parceria, doutor!' }],
      },
    ],
    dialoguePools: [
      [{
        id: 'pool1_farias',
        text: [
          'A fila de laudos de TC está com 6 horas de atraso.',
          'Um paciente com suspeita de AVC está aguardando resultado há 2 horas.',
          'Qual deve ser a prioridade segundo gestão de fluxo diagnóstico?',
        ],
        choices: [
          { text: 'Priorizar o paciente com suspeita de AVC imediatamente — janela terapêutica de 4,5 horas é crítica.', correct: true, tooltip: 'AVC: janela terapêutica de 4,5h para trombólise (SBN)', feedback: 'Correto! Em AVC isquêmico a janela é de 4,5h para trombólise. A priorização por criticidade clínica deve sobrepor a ordem de chegada. (Kurcgant cap.4)', effect: (s) => ({ prestige: s.prestige + 28 }) },
          { text: 'Seguir a ordem de chegada — qualquer exceção gera reclamação dos outros pacientes.', correct: false, feedback: 'Incorreto. A priorização clínica é eticamente mandatória. Prioridade nunca é simplesmente pela ordem de chegada.', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'Contatar o médico solicitante e pedir que aguarde mais 2 horas para a fila normalizar.', correct: false, feedback: 'Perigoso! Em 2 horas a janela terapêutica do AVC pode ter encerrado. Priorize imediatamente.', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'Transferir o paciente para outro hospital com tomógrafo disponível.', correct: false, feedback: 'Desnecessário se o tomógrafo está disponível. Priorize o laudo urgente e realize o exame já.', effect: (s) => ({ prestige: s.prestige - 3 }) },
        ],
      }],
      [{
        id: 'pool2_farias',
        text: [
          'Um técnico pediu para usar o TC sem EPIs adequados para "economizar tempo".',
          'Qual é a conduta correta do gerente de enfermagem sobre Gestão de Recursos Físicos?',
          '(Kurcgant cap.13 — Gestão de Recursos Físicos e Ambientais)',
        ],
        choices: [
          { text: 'Interromper o procedimento, garantir uso de EPIs e registrar a situação como potencial evento adverso.', correct: true, tooltip: 'CNEN/ANVISA: proteção radiológica é obrigatória', feedback: 'Correto! A proteção radiológica é regulamentada pela CNEN. O gerente deve garantir compliance com normas de segurança independente de "ganhar tempo". (Kurcgant cap.13)', effect: (s) => ({ prestige: s.prestige + 28 }) },
          { text: 'Permitir uma vez, mas registrar como advertência informal ao técnico.', correct: false, feedback: 'Incorreto. Exposição à radiação sem EPI é irreversível. Não há "uma vez" aceitável para este tipo de risco.', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'Solicitar ao técnico que treine outros colegas sobre uso correto de EPIs.', correct: false, feedback: 'Treinamento é correto mas insuficiente agora. Primeiro interrompa a situação de risco.', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'Consultar o manual do equipamento para confirmar se EPI é realmente necessário.', correct: false, feedback: 'Desnecessário. A norma CNEN é clara: EPIs são obrigatórios em área de radiação ionizante.', effect: (s) => ({ prestige: s.prestige - 2 }) },
        ],
      }],
      [{
        id: 'pool3_farias',
        text: [
          'O equipamento de ressonância está quebrado há 15 dias aguardando manutenção.',
          'Qual é a responsabilidade do enfermeiro gerente nessa situação?',
          '(Kurcgant cap.13 — Gestão de Recursos Físicos)',
        ],
        choices: [
          { text: 'Registrar o problema formalmente, notificar a direção, mapear o impacto assistencial e acompanhar o prazo de manutenção.', correct: true, tooltip: 'Gestão de recursos físicos: papel do enfermeiro gerente (Kurcgant cap.13)', feedback: 'Correto! O enfermeiro gerente é responsável por notificar, documentar e acompanhar a resolução de falhas em recursos físicos que impactam a assistência. (Kurcgant cap.13)', effect: (s) => ({ prestige: s.prestige + 25 }) },
          { text: 'Aguardar que a engenharia hospitalar resolva sozinha sem intervenção da enfermagem.', correct: false, feedback: 'Incorreto. A enfermagem gerencial deve acompanhar ativamente a resolução de falhas de equipamentos que impactam pacientes.', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'Comunicar verbalmente ao chefe e continuar sem registro formal.', correct: false, feedback: 'Insuficiente. O registro formal é necessário para rastreabilidade, auditoria e responsabilidade legal.', effect: (s) => ({ prestige: s.prestige - 4 }) },
          { text: 'Comprar um novo equipamento sem passar pela direção para agilizar.', correct: false, feedback: 'Incorreto. Compras hospitalares têm fluxo de autorização específico. A aquisição independente pode configurar irregularidade.', effect: (s) => ({ prestige: s.prestige - 3 }) },
        ],
      }],
    ],
  },
  {
    id: 'diretora_alves',
    name: 'Diretora Alves',
    title: 'Diretora de Enfermagem',
    role: 'admin',
    spriteKey: 'npc_diretora',
    startCol: 67, startRow: 7,
    bodyColor: 0x2c3e50, coatColor: 0x34495e, hairColor: 0x7f8c8d, skinColor: 0xf5c5a3,
    patrolPoints: [
      { col: 67, row: 7 }, { col: 64, row: 7 }, { col: 64, row: 11 }, { col: 70, row: 11 },
    ],
    schedule: [
      { hour: 9, col: 67, row: 7 }, { hour: 14, col: 38, row: 14 }, { hour: 17, col: 67, row: 7 },
    ],
    missionIds: ['escala_plantao', 'orcamento', 'acreditacao_ona', 'pesquisa_indicadores'],
    dialogues: [
      {
        id: 'escala_intro',
        condition: (s) => !s.completedMissions.includes('escala_plantao'),
        topic: 'Dimensionamento de Enfermagem',
        text: [
          'Bom dia! Seja bem-vinda ao HUAP.',
          'Sou a Diretora de Enfermagem. Temos muito trabalho pela frente.',
          'A primeira prioridade: reorganizar a escala de plantão com base no System of Patient Classification (SCP).',
          'Qual instrumento legal regulamenta esse dimensionamento de pessoal de enfermagem?',
        ],
        choices: [
          {
            text: 'Aplicar a Resolução COFEN 543/2017 e o Sistema de Classificação de Pacientes (Fugulin/Perroca) para dimensionar o Quadro de Pessoal.',
            correct: true,
            tooltip: 'Resolução COFEN 543/2017 — Norma legal de dimensionamento de pessoal',
            feedback: 'Excelente! A Res. COFEN 543/2017 e os instrumentos validados de SCP (Fugulin) fundamentam cientificamente o quantitativo e qualitativo do quadro de enfermagem.',
            effect: (s) => ({ prestige: s.prestige + 35 }),
            missionEffect: 'escala_plantao:start',
          },
          {
            text: 'Dividir o número de leitos pelo número de funcionários disponíveis em planilha simples sem avaliar a gravidade dos pacientes.',
            correct: false,
            tooltip: 'Divisão aritmética simples sem SCP descumpre as normas do COFEN',
            feedback: 'Incorreto. Apenas dividir leitos por funcionários ignora a carga de trabalho e o grau de dependência dos pacientes (cuidados mínimos, intermediários, intensivos).',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'escala_plantao:start',
          },
          {
            text: 'Manter a mesma escala do ano anterior sem realizar nenhuma alteração técnica para não gerar insatisfação.',
            correct: false,
            tooltip: 'Escala estática sem diagnóstico de demanda leva ao esgotamento profissional',
            feedback: 'Incorreto. Repetir escalas antigas perpetua deficits históricos e expõe pacientes e profissionais ao risco de sobrecarga.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'escala_plantao:start',
          },
          {
            text: 'Permitir que os próprios profissionais escolham diariamente em qual setor preferem trabalhar.',
            correct: false,
            tooltip: 'Alocação informal sem perfil de competência compromete a assistência especializada',
            feedback: 'Incorreto. A alocação de pessoal exige critérios técnicos de competência e complexidade do setor, sob liderança do enfermeiro.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'escala_plantao:start',
          },
        ],
      },
      {
        id: 'pesquisa_indicadores_intro',
        condition: (s) => s.completedMissions.length >= 9 && !s.completedMissions.includes('pesquisa_indicadores'),
        topic: 'Indicadores de Saúde: Ferramentas que Subsidiam a Tomada de Decisão',
        text: [
          'Um grande favor — o MEC exige relatório de pesquisa e indicadores do HUAP.',
          'Queremos consolidar os indicadores de qualidade assistencial para auditoria e publicação.',
          'Qual estrutura teórica clássica de avaliação da qualidade em saúde (Donabedian) devemos estruturar?',
        ],
        choices: [
          {
            text: 'Estruturar a avaliação na tríade de Donabedian: Estrutura (recursos), Processo (protocolos/assistência) e Resultado (taxas de infecção/quedas).',
            correct: true,
            tooltip: 'Tríade de Avedis Donabedian — modelo clássico de avaliação da qualidade',
            feedback: 'Perfeito! A tríade Donabediana (Estrutura, Processo e Resultado) é a base universal de mensuração da qualidade em serviços de saúde.',
            effect: (s) => ({ prestige: s.prestige + 55 }),
            missionEffect: 'pesquisa_indicadores:complete',
          },
          {
            text: 'Coletar unicamente o número total de pacientes atendidos no mês sem analisar desfechos clínicos.',
            correct: false,
            tooltip: 'Métricas de volume bruto não avaliam a qualidade nem a segurança assistencial',
            feedback: 'Incorreto. Volume isolado de atendimento mede produtividade, não qualidade assistencial.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'pesquisa_indicadores:complete',
          },
          {
            text: 'Avaliar o hospital exclusivamente pela percepção financeira do consumo de insumos de limpeza.',
            correct: false,
            tooltip: 'Custos hoteleiros não refletem desfechos epidemiológicos da enfermagem',
            feedback: 'Incorreto. Custos de limpeza representam apoio hoteleiro e não retratam a efetividade dos cuidados de enfermagem.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'pesquisa_indicadores:complete',
          },
          {
            text: 'Entrevistar apenas profissionais em cargos de diretoria e desconsiderar dados dos leitos.',
            correct: false,
            tooltip: 'Dados de gestão sem amostragem assistencial geram relatórios enviesados',
            feedback: 'Incorreto. Ignorar os dados operacionais do leito torna o indicador irrelevante para a prática assistencial.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'pesquisa_indicadores:complete',
          },
        ],
      },
      {
        id: 'orcamento_intro',
        condition: (s) => s.completedMissions.length >= 3 && !s.completedMissions.includes('orcamento'),
        topic: 'Gestão de Recursos Materiais e Custos nos Serviços de Saúde e Enfermagem',
        text: [
          'Excelente progresso! Preciso de mais um favor de gestão.',
          'Os custos operacionais estão 18% acima do orçado este trimestre.',
          'Como o enfermeiro gerente deve atuar no controle orçamentário hospitalar?',
        ],
        choices: [
          {
            text: 'Implementar a Análise do Custo Direto por Paciente, auditoria de desperdícios em curativos/dispositivos e revisão do centro de custos do setor.',
            correct: true,
            tooltip: 'Gestão de centro de custos e microeconomia em enfermagem (Kurcgant Cap. 14)',
            feedback: 'Excelente! A gestão por centro de custos e o controle de desperdícios sem perda de qualidade é a competência financeira central do enfermeiro líder.',
            effect: (s) => ({ prestige: s.prestige + 45 }),
            missionEffect: 'orcamento:complete',
          },
          {
            text: 'Cortar em 50% a compra de luvas de procedimento e gazes para economizar imediatamente.',
            correct: false,
            tooltip: 'Corte cego de insumos essenciais viola a biossegurança e causa infecção',
            feedback: 'Incorreto. Racionar EPIs e materiais de curativo causa infecções hospitalares, elevando ainda mais o custo total da internação.',
            effect: (s) => ({ prestige: s.prestige - 10 }),
            missionEffect: 'orcamento:complete',
          },
          {
            text: 'Congelar o pagamento de horas extras sem analisar a taxa de absenteísmo das equipes.',
            correct: false,
            tooltip: 'Corte de horas extras sem cobrir o absenteísmo paralisa setores críticos',
            feedback: 'Incorreto. Cortar cobertura de faltas sem tratar o absenteísmo deixa plantões descobertos e gera eventos graves.',
            effect: (s) => ({ prestige: s.prestige - 2 }),
            missionEffect: 'orcamento:complete',
          },
          {
            text: 'Devolver o orçamento para o setor de contabilidade e recusar-se a gerenciar custos.',
            correct: false,
            tooltip: 'Recusa da gestão orçamentária abdica do papel de enfermeiro líder',
            feedback: 'Incorreto. A gestão orçamentária dos insumos assistenciais é atribuição legal do enfermeiro gestor.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'orcamento:complete',
          },
        ],
      },
      {
        id: 'acreditacao_intro',
        condition: (s) => s.completedMissions.length >= 6 && !s.completedMissions.includes('acreditacao_ona'),
        topic: 'Acreditação Hospitalar',
        text: [
          'A ONA fará visita de acreditação em 60 dias!',
          'Precisamos organizar toda a documentação, protocolos e indicadores.',
          'Qual é o foco principal da Acreditação ONA Nível 1 (Segurança)?',
        ],
        choices: [
          {
            text: 'Focar na cultura de segurança, padronização de POPs, notificação não punitiva de eventos adversos e cumprimento das Metas da OMS.',
            correct: true,
            tooltip: 'ONA Nível 1: Foco em Segurança do Paciente e Estrutura básica',
            feedback: 'Perfeito! O Nível 1 da ONA avalia prioritariamente a segurança em todos os processos assistenciais e a conformidade com as Metas da OMS.',
            effect: (s) => ({ prestige: s.prestige + 60 }),
            missionEffect: 'acreditacao_ona:complete',
          },
          {
            text: 'Pintar as paredes da recepção e trocar o mobiliário administrativo para impressionar os avaliadores.',
            correct: false,
            tooltip: 'Acreditação avalia processos e segurança, não apenas estética hoteleira',
            feedback: 'Incorreto. A acreditação hospitalar é centrada na segurança do paciente e na gestão de processos assistenciais, não na estética predial.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'acreditacao_ona:complete',
          },
          {
            text: 'Ocultar os relatórios de eventos adversos e notificações de quedas da comissão de avaliação.',
            correct: false,
            tooltip: 'Esconder dados impede a melhoria contínua e pode reprovar a instituição',
            feedback: 'Incorreto. A transparência na notificação de falhas e a gestão de riscos são pilares fundamentais exigidos pelos auditores da ONA.',
            effect: (s) => ({ prestige: s.prestige - 10 }),
            missionEffect: 'acreditacao_ona:complete',
          },
          {
            text: 'Delegar toda a preparação exclusiva para o setor de auditoria externa sem envolver a enfermagem.',
            correct: false,
            tooltip: 'Sem engajamento da equipe da ponta, a acreditação não se sustenta',
            feedback: 'Incorreto. A acreditação exige engajamento multiprofissional direto dos profissionais que prestam o cuidado no leito.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'acreditacao_ona:complete',
          },
        ],
      },
      {
        id: 'idle',
        topic: 'Liderança em Enfermagem',
        text: [
          'Continue o excelente trabalho.',
          'O HUAP precisa de enfermeiras gerentes como você.',
        ],
        choices: [{ text: 'Obrigada, diretora!' }],
      },
    ],
    dialoguePools: [
      [{
        id: 'pool1_diretora',
        text: [
          'Precisamos escolher a abordagem para o planejamento estratégico do HUAP.',
          'Temos três horizontes possíveis: operacional (1 ano), tático (2-3 anos), estratégico (5 anos).',
          'Como enfermeira gerente, qual deve ser o foco prioritário agora? (Kurcgant cap.4)',
        ],
        choices: [
          { text: 'Planejamento integrado nos três horizontes, com ações imediatas alinhadas ao plano estratégico de longo prazo.', correct: true, tooltip: 'Kurcgant cap.4: planejamento em múltiplos horizontes temporais integrados', feedback: 'Excelente! O planejamento eficaz articula os três horizontes. Ações operacionais devem ser coerentes com o plano estratégico. (Kurcgant, 2016 cap.4)', effect: (s) => ({ prestige: s.prestige + 35 }) },
          { text: 'Focar apenas no plano operacional — problemas diários são mais urgentes que metas de 5 anos.', correct: false, feedback: 'Visão de curto prazo isolada gera "apagão de incêndios" permanente. Sem estratégia, ações perdem coerência. (Kurcgant cap.4)', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'Aguardar o planejamento da diretoria antes de tomar qualquer decisão.', correct: false, feedback: 'Passividade gerencial. O enfermeiro gerente participa ativamente do planejamento, não apenas executa. (Kurcgant cap.4)', effect: (s) => ({ prestige: s.prestige - 2 }) },
          { text: 'Contratar consultoria externa para elaborar o plano estratégico completo.', correct: false, feedback: 'Consultoria pode apoiar, mas o planejamento deve ser participativo — construído com a equipe interna. (Kurcgant cap.4)', effect: (s) => ({ prestige: s.prestige - 3 }) },
        ],
      }],
      [{
        id: 'pool2_diretora',
        text: [
          'A cultura organizacional do HUAP mostra resistência a mudanças.',
          'Como gerente você quer implementar novos protocolos, mas a equipe resiste.',
          'Qual abordagem de gestão da mudança é mais eficaz? (Kurcgant cap.1)',
        ],
        choices: [
          { text: 'Envolver a equipe no diagnóstico e construção da mudança, legitimando o processo com os próprios trabalhadores.', correct: true, tooltip: 'Kurcgant cap.1: cultura organizacional e gestão participativa da mudança', feedback: 'Perfeito! Mudanças sustentáveis são construídas com participação da equipe. A resistência é menor quando os trabalhadores se sentem coautores. (Kurcgant cap.1)', effect: (s) => ({ prestige: s.prestige + 35 }) },
          { text: 'Implementar as mudanças de forma mandatória com apoio da diretoria.', correct: false, feedback: 'Implementação autoritária gera resistência passiva e boicote velado. A adesão precisa ser conquistada. (Kurcgant cap.1)', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'Aguardar que a equipe amadureça e aceite as mudanças naturalmente.', correct: false, feedback: 'Passividade. Mudanças positivas exigem liderança ativa — não acontecem espontaneamente. (Kurcgant cap.1)', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'Substituir os profissionais que resistem à mudança por outros mais receptivos.', correct: false, feedback: 'Extremo e contraproducente. Substituição sem gestão do processo perpetua a cultura resistente. (Kurcgant cap.1)', effect: (s) => ({ prestige: s.prestige - 5 }) },
        ],
      }],
      [{
        id: 'pool3_diretora',
        text: [
          'Os custos operacionais do hospital subiram 22% este trimestre.',
          'A diretoria pede corte de 15% nos gastos de enfermagem.',
          'Como gerente, como você aborda o corte sem comprometer a assistência? (Kurcgant cap.14)',
        ],
        choices: [
          { text: 'Mapear custos fixos e variáveis, identificar desperdícios com custo-benefício, propor cortes nos processos — nunca no dimensionamento mínimo de pessoal.', correct: true, tooltip: 'Kurcgant cap.14: gestão de custos em enfermagem — análise antes do corte', feedback: 'Excelente! A análise de custos (Kurcgant cap.14) exige identificação de desperdícios e não pode comprometer o dimensionamento mínimo seguro de pessoal (COFEN 543/2017).', effect: (s) => ({ prestige: s.prestige + 38 }) },
          { text: 'Cortar horas extras e contratos temporários imediatamente para atingir a meta de 15%.', correct: false, feedback: 'Cortar pessoal sem análise pode aumentar eventos adversos e no longo prazo custar mais com complicações.', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'Recusar o corte alegando que qualquer redução é perigosa para os pacientes.', correct: false, feedback: 'Recusar sem análise é irresponsável. O gerente deve apresentar alternativas fundamentadas, não apenas recusar.', effect: (s) => ({ prestige: s.prestige - 3 }) },
          { text: 'Reduzir insumos e materiais de proteção para cumprir a meta rapidamente.', correct: false, feedback: 'Reduzir EPIs e materiais de proteção aumenta infecções e eventos adversos, gerando custo muito maior. (ANVISA)', effect: (s) => ({ prestige: s.prestige - 8 }) },
        ],
      }],
    ],
  },
  {
    id: 'tec_rosa_cme',
    name: 'Tec. Rosa',
    title: 'Supervisora da CME',
    role: 'technician',
    spriteKey: 'npc_rosa',
    startCol: 5, startRow: 20,
    bodyColor: 0xffffff, coatColor: 0xe0e4ec, hairColor: 0x4a3728, skinColor: 0xd4a574,
    patrolPoints: [
      { col: 5, row: 20 }, { col: 3, row: 20 }, { col: 3, row: 24 }, { col: 8, row: 24 },
    ],
    schedule: [
      { hour: 7, col: 5, row: 20 }, { hour: 15, col: 5, row: 20 },
    ],
    missionIds: ['cme_protocolo', 'rastreabilidade_esterilizacao'],
    dialogues: [
      {
        id: 'cme_intro',
        condition: (s) => !s.completedMissions.includes('cme_protocolo'),
        topic: 'Gestão de Recursos Materiais e Custos nos Serviços de Saúde e Enfermagem',
        text: [
          'Oi! Temos problema com o controle de materiais na CME.',
          'Os kits cirúrgicos não estão sendo rastreados e validados corretamente.',
          'Qual norma sanitária regulamenta as boas práticas de reprocessamento de produtos para a saúde?',
        ],
        choices: [
          {
            text: 'Adequar a central à RDC 15/2012 ANVISA: testes biológicos/químicos diários nas autoclaves e validação por classe dos indicadores.',
            correct: true,
            tooltip: 'RDC 15/2012 ANVISA — Regulamento Técnico de Funcionamento da CME',
            feedback: 'Excelente! O cumprimento da RDC 15/2012 garante a inocuidade do instrumental cirúrgico, prevenindo infecções do sítio cirúrgico (ISC).',
            effect: (s) => ({ prestige: s.prestige + 35 }),
            missionEffect: 'cme_protocolo:complete',
          },
          {
            text: 'Utilizar fita crepe comum em vez de indicador químico Classe 5/6 para economizar insumos da autoclave.',
            correct: false,
            tooltip: 'Fita adesiva comum não atesta esterilização interna do pacote',
            feedback: 'Incorreto. Fita adesiva comum não monitora temperatura nem tempo, colocando em risco a estanqueidade e esterilidade dos artigos.',
            effect: (s) => ({ prestige: s.prestige - 10 }),
            missionEffect: 'cme_protocolo:complete',
          },
          {
            text: 'Realizar lavagem de instrumental cirúrgico apenas com água da torneira sem uso de detergente enzimático.',
            correct: false,
            tooltip: 'A ausência de detergente enzimático impede a remoção do biofilme microbiano',
            feedback: 'Incorreto. Sem detergente enzimático ocorre acúmulo de matéria orgânica e biofilme que impedem a ação do vapor estéril.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'cme_protocolo:complete',
          },
          {
            text: 'Esterilizar materiais termossensíveis em autoclaves a vapor convencional a 134°C.',
            correct: false,
            tooltip: 'Autoclave a vapor degrada artigos plásticos termossensíveis',
            feedback: 'Incorreto. Materiais termossensíveis exigem métodos a baixa temperatura (óxido de etileno, plasma de peróxido de hidrogênio).',
            effect: (s) => ({ prestige: s.prestige - 2 }),
            missionEffect: 'cme_protocolo:complete',
          },
        ],
      },
      {
        id: 'rastreabilidade_intro',
        condition: (s) => s.completedMissions.includes('cme_protocolo') && s.completedMissions.length >= 3 && !s.completedMissions.includes('rastreabilidade_esterilizacao'),
        topic: 'Gestão de Recursos Materiais e Custos nos Serviços de Saúde e Enfermagem',
        text: [
          'Com o protocolo de reprocessamento aprovado, podemos avançar.',
          'Próxima etapa: implantar rastreabilidade eletrônica por código de barras.',
          'Quais dados mínimos são obrigatórios na rotulagem dos pacotes estéreis segundo a RDC 15/2012?',
        ],
        choices: [
          {
            text: 'Nome do produto, número do lote, data de esterilização, data limite de uso, método de esterilização e identificação do responsável.',
            correct: true,
            tooltip: 'RDC 15/2012 Art. 83 — Requisitos obrigatórios do rótulo estéril',
            feedback: 'Perfeito! A rotulagem completa permite rastrear o ciclo da autoclave de origem no caso de suspeita de infecção hospitalar.',
            effect: (s) => ({ prestige: s.prestige + 35 }),
            missionEffect: 'rastreabilidade_esterilizacao:complete',
          },
          {
            text: 'Apenas a palavra "ESTÉRIL" carimbada em tinta na parte externa do papel grau cirúrgico.',
            correct: false,
            tooltip: 'Carimbo genérico sem lote e data impede qualquer auditoria de segurança',
            feedback: 'Incorreto. O carimbo sem informações de lote, validade e operador inviabiliza a investigação epidemiológica em infecções.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'rastreabilidade_esterilizacao:complete',
          },
          {
            text: 'Apenas o nome do médico cirurgião que solicitou a caixa de instrumental.',
            correct: false,
            tooltip: 'O nome do cirurgião não garante rastreabilidade do processo sanitário',
            feedback: 'Incorreto. A identificação do usuário do instrumental não substitui os parâmetros biológicos e físicos da esterilização.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'rastreabilidade_esterilizacao:complete',
          },
          {
            text: 'O preço de custo de cada pinça contida na caixa cirúrgica.',
            correct: false,
            tooltip: 'Informação financeira é irrelevante no rótulo de segurança sanitária',
            feedback: 'Incorreto. Informações comerciais não possuem relevância para o controle sanitário da esterilização.',
            effect: (s) => ({ prestige: s.prestige - 2 }),
            missionEffect: 'rastreabilidade_esterilizacao:complete',
          },
        ],
      },
      {
        id: 'idle',
        topic: 'Gestão de Recursos Materiais e Custos nos Serviços de Saúde e Enfermagem',
        text: [
          'A rastreabilidade da CME é uma questão de segurança do paciente!',
          'Material mal esterilizado causa infecções graves.',
        ],
        choices: [{ text: 'Trabalho essencial, Rosa!' }],
      },
    ],
    dialoguePools: [
      [{
        id: 'pool1_rosa',
        text: [
          'Encontramos uma caixa de pinças cirúrgicas com embalagem violada no armário.',
          'A cirurgia está marcada daqui a 1 hora e o material já foi separado.',
          'O que determina a RDC 15/2012 da ANVISA nesta situação?',
        ],
        choices: [
          { text: 'Devolver o material para reprocessamento imediato — embalagem violada = material não estéril, independente do prazo da cirurgia.', correct: true, tooltip: 'RDC 15/2012: integridade da embalagem = garantia de esterilidade', feedback: 'Correto! A RDC 15/2012 é clara: a integridade da embalagem é garantia de esterilidade. Material com embalagem violada deve ser reprocessado sem exceção. (Kurcgant cap.12)', effect: (s) => ({ prestige: s.prestige + 32 }) },
          { text: 'Usar o material nessa cirurgia e reforçar a vigilância pós-operatória para infecção.', correct: false, feedback: 'Perigoso! Usar material de esterilidade incerta é risco grave de infecção cirúrgica. A RDC 15/2012 não permite exceções.', effect: (s) => ({ prestige: s.prestige - 10 }) },
          { text: 'Limpar a embalagem com álcool 70% e avaliar visualmente se o material parece íntegro.', correct: false, feedback: 'Incorreto. Álcool na embalagem não reestabelece esterilidade. A RDC é clara: embalagem violada = reprocessamento.', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'Adiar a cirurgia por 24 horas para aguardar novo material.', correct: false, feedback: 'Desnecessário se houver material de reserva. Acione o estoque de reserva ou realize reprocessamento emergencial.', effect: (s) => ({ prestige: s.prestige - 5 }) },
        ],
      }],
      [{
        id: 'pool2_rosa',
        text: [
          'A CME quer implantar rastreabilidade por código de barras em todos os instrumentais.',
          'Qual é o critério mínimo de rastreabilidade exigido pela RDC 15/2012?',
          '(Kurcgant cap.12 — Gestão de Recursos Materiais)',
        ],
        choices: [
          { text: 'Identificar o lote de esterilização, o equipamento usado, o operador, a data/hora e o destino de cada item processado.', correct: true, tooltip: 'RDC 15/2012: rastreabilidade completa do processo de esterilização', feedback: 'Perfeito! A RDC 15/2012 exige rastreabilidade completa: lote, autoclave, operador, data e destino. O código de barras facilita, mas o conteúdo mínimo é regulamentado.', effect: (s) => ({ prestige: s.prestige + 30 }) },
          { text: 'Registrar apenas o tipo de material e a data de esterilização.', correct: false, feedback: 'Insuficiente. Sem identificar o equipamento e operador, não é possível rastrear falhas em caso de infecção.', effect: (s) => ({ prestige: s.prestige - 3 }) },
          { text: 'Não há obrigatoriedade — rastreabilidade é recomendação, não exigência legal.', correct: false, feedback: 'Incorreto. A RDC 15/2012 da ANVISA tem força de lei e exige rastreabilidade do processo de esterilização.', effect: (s) => ({ prestige: s.prestige - 3 }) },
          { text: 'Guardar as embalagens usadas por 30 dias como evidência do processo.', correct: false, feedback: 'Insuficiente. Guardar embalagem não substitui o registro formal de rastreabilidade exigido pela RDC 15/2012.', effect: (s) => ({ prestige: s.prestige - 2 }) },
        ],
      }],
      [{
        id: 'pool3_rosa',
        text: [
          'O autoclave da CME reprovnou no teste Bowie-Dick esta manhã.',
          'Há 40 pacientes cirúrgicos marcados para hoje.',
          'Qual é a conduta imediata correta?',
        ],
        choices: [
          { text: 'Interditar o autoclave, acionar manutenção imediatamente, notificar o CC e verificar material esterilizado no turno anterior para rastreamento.', correct: true, tooltip: 'Teste Bowie-Dick negativo = autoclave interditado imediatamente (RDC 15/2012)', feedback: 'Correto! Falha no Bowie-Dick indica problemas de remoção de ar — compromete esterilização. Interdição imediata e rastreamento retroativo são obrigatórios. (RDC 15/2012)', effect: (s) => ({ prestige: s.prestige + 35 }) },
          { text: 'Repetir o teste Bowie-Dick mais uma vez antes de tomar qualquer decisão.', correct: false, feedback: 'Não se repete Bowie-Dick para "confirmar". Falha = interdição imediata. Uma segunda falha só adiciona atraso perigoso.', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'Continuar usando o autoclave e comunicar a falha apenas ao final do dia.', correct: false, feedback: 'Perigoso! Material processado em autoclave com falha não é confiável. Todas as cirurgias estariam em risco.', effect: (s) => ({ prestige: s.prestige - 15 }) },
          { text: 'Usar esterilização a frio com glutaraldeído para todos os materiais do dia.', correct: false, feedback: 'Glutaraldeído não substitui vapor para todos os materiais e tem restrições da ANVISA. Acione contingência planejada.', effect: (s) => ({ prestige: s.prestige - 2 }) },
        ],
      }],
    ],
  },
  {
    id: 'nutricionista_clara',
    name: 'Nutr. Clara',
    title: 'Nutricionista Clínica',
    role: 'other',
    spriteKey: 'npc_clara',
    startCol: 16, startRow: 20,
    bodyColor: 0xffffff, coatColor: 0xfde68a, hairColor: 0xd4a017, skinColor: 0xf5c5a3,
    patrolPoints: [
      { col: 16, row: 20 }, { col: 13, row: 20 }, { col: 13, row: 24 }, { col: 20, row: 24 },
    ],
    schedule: [
      { hour: 7, col: 16, row: 20 }, { hour: 12, col: 16, row: 20 },
    ],
    missionIds: ['terapia_nutricional', 'protocolo_dieta'],
    dialogues: [
      {
        id: 'nutricao_intro',
        condition: (s) => !s.completedMissions.includes('terapia_nutricional'),
        topic: 'Gestão do Cuidado em Enfermagem',
        text: [
          'Bom dia! Você é a nova gerente de enfermagem?',
          'Precisamos urgente do protocolo de Terapia Nutricional na UTI.',
          'Qual a recomendação das diretrizes ASPEN/ESPEN para início da nutrição enteral em pacientes críticos?',
        ],
        choices: [
          {
            text: 'Iniciar Terapia de Nutrição Enteral Precoce (TNEP) nas primeiras 24 a 48 horas de admissão na UTI com checagem de posicionamento da sonda.',
            correct: true,
            tooltip: 'Diretrizes ASPEN/ESPEN — Nutrição enteral precoce no paciente crítico',
            feedback: 'Excelente! A TNEP mantêm a integridade da barreira intestinal e reduz significativamente as taxas de translocação bacteriana e sepse.',
            effect: (s) => ({ prestige: s.prestige + 35, energy: Math.min(s.energy + 10, 100) }),
            missionEffect: 'terapia_nutricional:complete',
          },
          {
            text: 'Aguardar obrigatoriamente 7 dias de jejum absoluto antes de iniciar qualquer aporte enteral.',
            correct: false,
            tooltip: 'Jejum prolongado acarreta atrofia da mucosa intestinal e sepse',
            feedback: 'Incorreto. Jejum de 7 dias causa atrofia grave das vilosidades intestinais e aumenta a mortalidade em UTI.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'terapia_nutricional:complete',
          },
          {
            text: 'Instalar nutrição enteral por SNG sem realizar raio-X de confirmação ou teste do pH gástrico.',
            correct: false,
            tooltip: 'Infusão de dieta em via aérea (sonda mal posicionada) causa pneumonia brônquica fatal',
            feedback: 'Incorreto. Testar o posicionamento antes da infusão é norma de segurança obrigatória para evitar broncoaspiração fatal.',
            effect: (s) => ({ prestige: s.prestige - 10 }),
            missionEffect: 'terapia_nutricional:complete',
          },
          {
            text: 'Administrar apenas soro glicosado 5% via oral sem fórmula de nutrição balanceada.',
            correct: false,
            tooltip: 'Soro isolado não supre as necessidades proteico-calóricas do doente hipercatabólico',
            feedback: 'Incorreto. Apenas soro glicosado 5% não atende à demanda hipermetabólica do paciente em terapia intensiva.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'terapia_nutricional:complete',
          },
        ],
      },
      {
        id: 'protocolo_dieta_intro',
        condition: (s) => s.completedMissions.includes('terapia_nutricional') && s.completedMissions.length >= 3 && !s.completedMissions.includes('protocolo_dieta'),
        topic: 'Gestão do Cuidado em Enfermagem',
        text: [
          'Com o protocolo ASPEN em vigor, a equipe precisa de um guia prático de dietas.',
          'Precisamos de um protocolo de prescrição dietética por patologia (renal, hepática, diabética).',
          'Qual é o papel do enfermeiro no manejo e aprazamento de dietas terapêuticas?',
        ],
        choices: [
          {
            text: 'Validar a prescrição dietética, aprazar os horários de administração, monitorar resíduo gástrico e evitar interações fidedignas fármaco-nutrientes.',
            correct: true,
            tooltip: 'Sistematização do Cuidado Nutricional pelo enfermeiro',
            feedback: 'Perfeito! A administração rigorosa nos horários corretos e a monitorização de tolerância gástrica garantem o aporte calórico prescrito.',
            effect: (s) => ({ prestige: s.prestige + 35 }),
            missionEffect: 'protocolo_dieta:complete',
          },
          {
            text: 'Suspender as dietas orais e enterais de todos os pacientes aos domingos para descanso do TNE.',
            correct: false,
            tooltip: 'Interrupção sem indicação clínica prejudica a meta calórica do paciente',
            feedback: 'Incorreto. Interrupções injustificadas da nutrição resultam em déficit calórico acumulado gravíssimo.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'protocolo_dieta:complete',
          },
          {
            text: 'Manter a nutrição enteral correndo em infusão rápida em bolus de 500ml de uma única vez.',
            correct: false,
            tooltip: 'Infusão rápida em bolus provoca diarreia profusa e distensão abdominal',
            feedback: 'Incorreto. Infusão rápida causa diarreia, vômitos e alto risco de aspiração pulmonar.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'protocolo_dieta:complete',
          },
          {
            text: 'Delegar a escolha dos horários das mamadeiras/dietas para os maqueiros da recepção.',
            correct: false,
            tooltip: 'Aprazamento é atribuição técnica exclusiva da enfermagem',
            feedback: 'Incorreto. O aprazamento e monitorização da dieta enteral é atribuição privativa do enfermeiro/equipe de enfermagem.',
            effect: (s) => ({ prestige: s.prestige - 2 }),
            missionEffect: 'protocolo_dieta:complete',
          },
        ],
      },
      {
        id: 'idle',
        topic: 'Gestão do Cuidado em Enfermagem',
        text: [
          'A nutrição adequada reduz complicações e tempo de internação!',
          'Descanse um pouco — a copa está sempre disponível.',
        ],
        choices: [{ text: 'Obrigada, Clara! Boa dica.' }],
      },
    ],
    dialoguePools: [
      [{
        id: 'pool1_clara',
        text: [
          'Paciente crítico, 72h de internação na UTI, ainda sem dieta por ordem médica.',
          'O residente disse que vai "aguardar a estabilização hemodinâmica" antes de nutrir.',
          'Qual é a recomendação baseada em evidências para nutrição em terapia intensiva?',
        ],
        choices: [
          { text: 'Iniciar nutrição enteral precoce em 24–48h mesmo em pacientes com instabilidade hemodinâmica relativa, conforme ASPEN/ESPEN.', correct: true, tooltip: 'ASPEN/ESPEN: nutrição enteral precoce em 24-48h reduz mortalidade e complicações', feedback: 'Correto! As diretrizes ASPEN (2016) e ESPEN recomendam nutrição enteral em 24–48h. Esperar "estabilização completa" aumenta catabolismo e piora desfechos. (Kurcgant cap.9 — equipe multiprofissional)', effect: (s) => ({ prestige: s.prestige + 30, energy: Math.min((s as any).energy + 5, 100) }) },
          { text: 'Aguardar 5–7 dias para iniciar dieta parenteral total como estratégia mais segura.', correct: false, feedback: 'Incorreto. Jejum prolongado é danoso. Nutrição enteral é preferida à parenteral sempre que houver trato funcionante.', effect: (s) => ({ prestige: s.prestige - 2 }) },
          { text: 'Não intervir — a decisão de nutrir é exclusivamente médica, enfermagem não tem papel.', correct: false, feedback: 'Incorreto. A terapia nutricional é decisão multiprofissional. Enfermagem e nutrição têm papel ativo na equipe de EMTN.', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'Iniciar nutrição oral, pois é mais fisiológica e o paciente deve se alimentar normalmente.', correct: false, feedback: 'Paciente crítico entubado não pode receber nutrição oral. Enteral por sonda é a via indicada.', effect: (s) => ({ prestige: s.prestige - 2 }) },
        ],
      }],
      [{
        id: 'pool2_clara',
        text: [
          'A triagem nutricional identificou 60% dos pacientes internados com risco nutricional.',
          'Qual instrumento validado é mais adequado para triagem nutricional em adultos hospitalizados?',
          '(Kurcgant cap.9 — Equipe Multiprofissional)',
        ],
        choices: [
          { text: 'NRS-2002 (Nutritional Risk Screening) — validado especificamente para pacientes hospitalizados adultos.', correct: true, tooltip: 'NRS-2002: ferramenta recomendada pela ESPEN para triagem hospitalar', feedback: 'Excelente! O NRS-2002 é o instrumento recomendado pela ESPEN para triagem nutricional hospitalar em adultos. O MNA é para idosos e o MUST para ambientes gerais. (ESPEN 2017)', effect: (s) => ({ prestige: s.prestige + 28 }) },
          { text: 'IMC abaixo de 18,5 — critério simples e acessível para qualquer equipe.', correct: false, feedback: 'IMC isolado é insuficiente para triagem nutricional hospitalar. Não avalia dinamismo do quadro clínico.', effect: (s) => ({ prestige: s.prestige - 3 }) },
          { text: 'MNA (Mini Nutritional Assessment) — ferramenta universal para qualquer paciente.', correct: false, feedback: 'O MNA é validado especificamente para idosos. Para adultos hospitalizados em geral, use o NRS-2002.', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'Albumina sérica abaixo de 3g/dL como único critério de risco nutricional.', correct: false, feedback: 'Albumina é marcador inflamatório — em infecção aguda cai por redistribuição, não por desnutrição. Não é critério isolado.', effect: (s) => ({ prestige: s.prestige - 2 }) },
        ],
      }],
      [{
        id: 'pool3_clara',
        text: [
          'O médico prescreveu dieta parenteral total para um paciente com abdome funcionante.',
          'Como membro da EMTN (Equipe de Terapia Nutricional), qual é sua responsabilidade?',
          '(Kurcgant cap.9 — Trabalho em Equipe Multiprofissional)',
        ],
        choices: [
          { text: 'Levar o caso à EMTN, apresentar evidências de que nutrição enteral é preferível e propor mudança de conduta fundamentada.', correct: true, tooltip: 'EMTN: decisão multiprofissional baseada em evidências (RDC 63/2000)', feedback: 'Correto! A RDC 63/2000 da ANVISA regulamenta a EMTN. Decisões nutricionais devem ser multiprofissionais e baseadas em evidências. O profissional de saúde deve contestar condutas inadequadas. (Kurcgant cap.9)', effect: (s) => ({ prestige: s.prestige + 30 }) },
          { text: 'Aceitar a prescrição médica sem questionar — hierarquia deve ser respeitada.', correct: false, feedback: 'Incorreto. Hierarquia não justifica silêncio diante de condutas que prejudicam o paciente. A EMTN é espaço de decisão colegiada.', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'Não preparar a nutrição parenteral como forma de protesto silencioso.', correct: false, feedback: 'Recusa sem comunicação é abandono. O correto é comunicar o questionamento formalmente na EMTN.', effect: (s) => ({ prestige: s.prestige - 8 }) },
          { text: 'Instalar a parenteral e registrar no prontuário que foi contra a conduta.', correct: false, feedback: 'Registro de discordância é importante, mas insuficiente. O questionamento deve ser feito antes da administração, não depois.', effect: (s) => ({ prestige: s.prestige - 5 }) },
        ],
      }],
    ],
  },
  {
    id: 'enf_maria',
    name: 'Enf. Maria',
    title: 'Supervisora de Enfermagem',
    role: 'nurse',
    spriteKey: 'npc_maria',
    startCol: 63, startRow: 21,
    bodyColor: 0xffffff, coatColor: 0xa7f3d0, hairColor: 0x2c1810, skinColor: 0xf5c5a3,
    patrolPoints: [
      { col: 63, row: 21 }, { col: 60, row: 21 }, { col: 60, row: 24 }, { col: 66, row: 24 },
    ],
    schedule: [
      { hour: 7, col: 63, row: 21 }, { hour: 14, col: 63, row: 21 },
    ],
    missionIds: ['escala_plantao', 'ronda_enfermaria', 'capacitacao_sae', 'passagem_plantao'],
    dialogues: [
      {
        id: 'escala_help',
        condition: (s) => s.missionProgress['escala_plantao'] === 1,
        topic: 'Dimensionamento de Enfermagem',
        text: [
          'Estava esperando por você! Temos 7 enfermeiros disponíveis amanhã.',
          'Mas 3 precisam de folga compensatória por horas extras acumuladas.',
          'E 2 estão em período de plantão noturno seguido — risco de erro!',
          'Como organizar a escala promovendo equidade e segurança jurídica (Resolução COFEN 543/2017)?',
        ],
        choices: [
          {
            text: 'Mapear folgas por equidade, garantir o descanso prévio regulamentar de 11h entre jornadas e acionar o banco de horas formal.',
            correct: true,
            tooltip: 'Resolução COFEN 543/2017 e CLT — Repouso e jornada de trabalho',
            feedback: 'Excelente! Respeitar as interjornadas legais de 11h reduz fadiga mental, prevenindo erros graves de medicação e exaustão na equipe.',
            effect: (s) => ({ prestige: s.prestige + 45 }),
            missionEffect: 'escala_plantao:complete',
          },
          {
            text: 'Obrigar os 2 enfermeiros a fazerem o plantão dobrado noturno sem descanso suplementar.',
            correct: false,
            tooltip: 'Fadiga crônica por plantão dobrado eleva incidentes graves em 300%',
            feedback: 'Incorreto. Plantões dobrados sem descanso aumentam a taxa de erro de medicação e acidentes de trabalho com perfurocortantes.',
            effect: (s) => ({ prestige: s.prestige - 10 }),
            missionEffect: 'escala_plantao:complete',
          },
          {
            text: 'Cancelar todas as folgas do mês arbitrariamente para manter o quantitativo máximo sem justificativa técnica.',
            correct: false,
            tooltip: 'Cancelamento sumário de folgas causa absenteísmo por adoecimento psíquico',
            feedback: 'Incorreto. Cancelar folgas arbitrariamente destrói o clima organizacional e eleva os afastamentos por burnout e transtornos de ansiedade.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'escala_plantao:complete',
          },
          {
            text: 'Sorteiar quem faz a dobra sem critério técnico de competência para o setor.',
            correct: false,
            tooltip: 'Sorteio informal ignora atribuições e complexidade dos leitos',
            feedback: 'Incorreto. Sorteio desconsidera o perfil de competência individual e a complexidade dos leitos do setor.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'escala_plantao:complete',
          },
        ],
      },
      {
        id: 'ronda_intro',
        condition: (s) => !s.completedMissions.includes('ronda_enfermaria'),
        topic: 'Gestão do Cuidado em Enfermagem',
        text: [
          'A ronda de enfermagem está atrasada hoje.',
          'Os 28 pacientes da Enfermaria Clínica precisam de avaliação sistemática.',
          'Sem ronda estruturada, aumenta o risco de eventos adversos. Qual metodologia de ronda proativa adotar?',
        ],
        choices: [
          {
            text: 'Realizar a Ronda Proativa de Enfermagem focando nos 4 P’s: Posição/Mudança de decúbito, Presença de Dor, Necessidades de Pessoais/Banheiro e Posicionamento de pertences.',
            correct: true,
            tooltip: 'Ronda dos 4 P’s (Purposeful Hourly Rounding) — prática de segurança internacional',
            feedback: 'Excelente! A ronda estruturada dos 4 P’s reduz quedas no leito em até 50% e diminui a incidência de lesões por pressão (LPP).',
            effect: (s) => ({ prestige: s.prestige + 35, energy: Math.max(s.energy - 15, 0) }),
            missionEffect: 'ronda_enfermaria:complete',
          },
          {
            text: 'Entrar nos quartos apenas se o paciente ou acompanhante tocar a campainha pedindo socorro.',
            correct: false,
            tooltip: 'Assistência reativa aumenta ocorrência de quedas e desaturação despercebida',
            feedback: 'Incorreto. Atendimento puramente reativo impede a identificação precoce de broncoaspiração, dor intensa e deterioração clínica.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'ronda_enfermaria:complete',
          },
          {
            text: 'Fazer a ronda correndo pelo corredor apenas perguntando "está tudo bem?" sem examinar os leitos.',
            correct: false,
            tooltip: 'Checagem superficial de corredor não substitui a inspeção física do paciente',
            feedback: 'Incorreto. Perguntas rápidas da porta do quarto não identificam flebites em acessos, drenos obstruídos ou sinais de choque.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'ronda_enfermaria:complete',
          },
          {
            text: 'Pedir aos acompanhantes leigos que façam a verificação dos dados vitais da enfermaria.',
            correct: false,
            tooltip: 'Transferir checagem de sinais vitais para acompanhantes é ilegal e perigoso',
            feedback: 'Incorreto. A aferição de sinais vitais e avaliação clínica é privativa dos profissionais de enfermagem.',
            effect: (s) => ({ prestige: s.prestige - 10 }),
            missionEffect: 'ronda_enfermaria:complete',
          },
        ],
      },
      {
        id: 'capacitacao_intro',
        condition: (s) => s.completedMissions.length >= 3 && !s.completedMissions.includes('capacitacao_sae'),
        topic: 'Competências Gerenciais e Assistenciais',
        text: [
          'A equipe precisa muito de capacitação em SAE (Sistematização da Assistência).',
          'A implementação do Processo de Enfermagem é obrigatória pelo COFEN.',
          'Quais são as 5 etapas estruturantes do Processo de Enfermagem?',
        ],
        choices: [
          {
            text: '1. Coleta de Dados (Anamnese/Exame Físico), 2. Diagnóstico de Enfermagem (NANDA-I), 3. Planejamento, 4. Implementação e 5. Avaliação (Evolução).',
            correct: true,
            tooltip: 'Resolução COFEN 358/2009 — As 5 etapas do Processo de Enfermagem',
            feedback: 'Perfeito! A SAE baseada na taxonomia NANDA-I, NIC e NOC garante suporte científico e autonomia no exercício profissional do enfermeiro.',
            effect: (s) => ({ prestige: s.prestige + 40 }),
            missionEffect: 'capacitacao_sae:complete',
          },
          {
            text: 'Apenas anotar no prontuário que o paciente passou o dia sem intercorrências sem diagnóstico de enfermagem.',
            correct: false,
            tooltip: 'Anotação genérica "sem intercorrências" não constitui Processo de Enfermagem',
            feedback: 'Incorreto. Escrever "paciente sem queixas" descumpre as diretrizes da SAE e não evidencia a consulta de enfermagem.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'capacitacao_sae:complete',
          },
          {
            text: 'Copiar a prescrição médica diária no livro de relatório sem elaborar diagnósticos próprios.',
            correct: false,
            tooltip: 'A enfermagem possui raciocínio diagnóstico e prescrição autônoma privativos',
            feedback: 'Incorreto. O enfermeiro possui raciocínio diagnóstico autônomo sobre os problemas humanos e necessidades assistenciais.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'capacitacao_sae:complete',
          },
          {
            text: 'Preencher apenas a ficha de alta no momento do desligamento do paciente.',
            correct: false,
            tooltip: 'Processo de enfermagem é contínuo desde a admissão até a alta',
            feedback: 'Incorreto. O Processo de Enfermagem deve ser executado diariamente em todas as unidades de saúde, do ingresso à alta.',
            effect: (s) => ({ prestige: s.prestige - 2 }),
            missionEffect: 'capacitacao_sae:complete',
          },
        ],
      },
      {
        id: 'passagem_plantao_intro',
        condition: (s) => s.completedMissions.includes('ronda_enfermaria') && s.completedMissions.length >= 3 && !s.completedMissions.includes('passagem_plantao'),
        topic: 'Tomada de Decisão',
        text: [
          'A passagem de plantão é nossa maior vulnerabilidade em segurança do paciente.',
          'Falta padronização — cada enfermeiro usa um formato diferente.',
          'O que significa a sigla do protocolo estruturado de comunicação SBAR (Meta 2 da OMS)?',
        ],
        choices: [
          {
            text: 'S = Situation (Situação atual), B = Background (Histórico clínico), A = Assessment (Avaliação atual) e R = Recommendation (Recomendação).',
            correct: true,
            tooltip: 'Protocolo SBAR (OMS/IHI) — Padrão ouro na passagem de plantão',
            feedback: 'Excelente! A metodologia SBAR sistematiza a transmissão verbal do caso, reduzindo em até 70% as falhas de comunicação na transição do cuidado.',
            effect: (s) => ({ prestige: s.prestige + 40 }),
            missionEffect: 'passagem_plantao:complete',
          },
          {
            text: 'S = Sintomas, B = Biologia, A = Anamnese e R = Recaída.',
            correct: false,
            tooltip: 'Tradução incorreta da ferramenta de segurança SBAR',
            feedback: 'Incorreto. A sigla SBAR internacional representa Situação, Background (Histórico), Avaliação e Recomendação.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'passagem_plantao:complete',
          },
          {
            text: 'S = Soro, B = Bolus, A = Analgesia e R = Resposta.',
            correct: false,
            tooltip: 'SBAR não é sigla de medicação, mas de comunicação estruturada',
            feedback: 'Incorreto. O SBAR é uma ferramenta de comunicação entre profissionais de saúde e não um mnemônico de medicação.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'passagem_plantao:complete',
          },
          {
            text: 'Passar o plantão apenas verbalmente no corredor sem utilizar checklist de apoio.',
            correct: false,
            tooltip: 'Transmissão informal de corredor gera omissão de dados críticos do paciente',
            feedback: 'Incorreto. Transmissão informal no corredor sem roteiro padronizado omite alergias, pendências de exames e riscos iminentes.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'passagem_plantao:complete',
          },
        ],
      },
      {
        id: 'idle',
        topic: 'Competências Gerenciais e Assistenciais',
        text: [
          'O plantão está bem organizado hoje. Obrigada!',
          'A comunicação entre turnos é a base da segurança.',
        ],
        choices: [{ text: 'Boa gestão, Maria!' }],
      },
    ],
    dialoguePools: [
      [{
        id: 'pool1_maria',
        text: [
          'Precisamos calcular o dimensionamento de pessoal para a Enfermaria Clínica.',
          '28 leitos, SCP médio = 18,2 pontos/paciente/dia, índice de segurança técnica 15%.',
          'Usando a metodologia de Gaidzinski, qual é o total de profissionais necessários? (Kurcgant cap.10)',
        ],
        choices: [
          { text: 'Calcular: horas necessárias = (pontos × fator de complexidade) ÷ horas diárias × IST. O cálculo deve contemplar coberturas de folgas e férias.', correct: true, tooltip: 'Gaidzinski (1998) — metodologia padrão de dimensionamento de enfermagem no Brasil (Kurcgant cap.10)', feedback: 'Excelente! A metodologia de Gaidzinski (1998) é a referência para dimensionamento de enfermagem no Brasil, adaptada pela Resolução COFEN 543/2017. IST de 15% cobre ausenteísmo. (Kurcgant, 2016 cap.10)', effect: (s) => ({ prestige: s.prestige + 35 }) },
          { text: 'Calcular 1 técnico para cada 4 pacientes e 1 enfermeiro para cada 8 — regra simples e prática.', correct: false, feedback: 'Regra simplificada não considera carga de trabalho real. O COFEN exige cálculo pelo SCP para validar o dimensionamento. (COFEN 543/2017)', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'Basear no número de funcionários disponíveis e ajustar conforme necessidade diária.', correct: false, feedback: 'Incorreto. O dimensionamento baseado na disponibilidade — não na necessidade — perpetua déficits estruturais.', effect: (s) => ({ prestige: s.prestige - 2 }) },
          { text: 'Usar o número de funcionários do mês anterior como referência, ajustando por férias.', correct: false, feedback: 'Método inaceitável. Referência histórica sem análise de carga de trabalho não reflete a necessidade real.', effect: (s) => ({ prestige: s.prestige - 5 }) },
        ],
      }],
      [{
        id: 'pool2_maria',
        text: [
          'Duas enfermeiras do plantão estão em conflito aberto — afetando a equipe toda.',
          'Uma acusa a outra de não dividir as atividades de forma equitativa.',
          'Como supervisora de enfermagem, qual é a sua abordagem? (Kurcgant cap.5)',
        ],
        choices: [
          { text: 'Realizar mediação individual com cada parte, levantar os fatos objetivamente e depois promover reunião conjunta com foco em solução, não em culpa.', correct: true, tooltip: 'Kurcgant cap.5 — Negociação e Gestão de Conflitos: mediação estruturada', feedback: 'Correto! A mediação estruturada (individual → conjunta) é a estratégia mais eficaz para conflitos interpessoais. Foco na solução e comunicação não-violenta. (Kurcgant cap.5)', effect: (s) => ({ prestige: s.prestige + 32 }) },
          { text: 'Reunir as duas ao mesmo tempo e exigir que se entendam imediatamente.', correct: false, feedback: 'Reunião conjunta sem preparo individual frequentemente escala o conflito. Ouça cada parte separadamente primeiro.', effect: (s) => ({ prestige: s.prestige - 3 }) },
          { text: 'Ignorar o conflito — profissionais adultas devem resolver seus próprios problemas.', correct: false, feedback: 'Incorreto. Conflitos não geridos afetam a qualidade da assistência e o bem-estar da equipe. A intervenção é responsabilidade gerencial. (Kurcgant cap.5)', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'Transferir a profissional mais resistente para outro setor para eliminar o conflito.', correct: false, feedback: 'Transferência sem resolução do conflito apenas desloca o problema. A mediação deve ser tentada primeiro.', effect: (s) => ({ prestige: s.prestige - 3 }) },
        ],
      }],
      [{
        id: 'pool3_maria',
        text: [
          'A equipe de enfermagem não está realizando a Sistematização da Assistência de Enfermagem (SAE) adequadamente.',
          'Os registros no prontuário estão incompletos — sem diagnósticos nem prescrições de enfermagem.',
          'Qual é o respaldo legal para exigir a implementação da SAE? (Kurcgant cap.3)',
        ],
        choices: [
          { text: 'Lei 7.498/86 (Exercício Profissional) + Resolução COFEN 358/2009 — SAE é obrigatória e privativa do enfermeiro.', correct: true, tooltip: 'Resolução COFEN 358/2009: SAE obrigatória em todas as instituições de saúde', feedback: 'Correto! A Res. COFEN 358/2009 torna a SAE obrigatória em todos os ambientes de saúde. A Lei 7.498/86 define o Processo de Enfermagem como atividade privativa do enfermeiro. (Kurcgant cap.3)', effect: (s) => ({ prestige: s.prestige + 30 }) },
          { text: 'SAE é apenas uma recomendação acadêmica — não tem força de lei obrigatória.', correct: false, feedback: 'Incorreto. A Resolução COFEN 358/2009 tem força normativa — é obrigatória. Descumpri-la sujeita a sanções éticas.', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'A obrigatoriedade é da Lei 9.394/96 (LDB) — responsabilidade das escolas de enfermagem.', correct: false, feedback: 'Incorreto. A LDB trata de educação, não da prática profissional. O respaldo é a Lei 7.498/86 e Res. COFEN 358/2009.', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'Cada hospital decide se implementa SAE conforme suas necessidades e cultura organizacional.', correct: false, feedback: 'Incorreto. A COFEN 358/2009 é clara: SAE é obrigatória independente das preferências institucionais.', effect: (s) => ({ prestige: s.prestige - 2 }) },
        ],
      }],
    ],
  },
  {
    id: 'dr_oliveira',
    name: 'Dr. Oliveira',
    title: 'Médico Chefe da UTI',
    role: 'doctor',
    spriteKey: 'npc_dr',
    startCol: 45, startRow: 21,
    bodyColor: 0x374151, coatColor: 0xf8fafc, hairColor: 0x0f172a, skinColor: 0x8d5524,
    patrolPoints: [
      { col: 45, row: 21 }, { col: 40, row: 21 }, { col: 40, row: 25 }, { col: 50, row: 25 },
    ],
    schedule: [
      { hour: 8, col: 45, row: 21 }, { hour: 14, col: 38, row: 14 },
    ],
    missionIds: ['indicadores_qualidade', 'acreditacao_ona'],
    dialogues: [
      {
        id: 'protocolo_start',
        condition: (s) => s.completedMissions.includes('protocolo_sepse') && s.completedMissions.length >= 2 && !s.completedMissions.includes('indicadores_qualidade'),
        topic: 'Indicadores de Saúde: Ferramentas que Subsidiam a Tomada de Decisão',
        text: [
          'Excelente trabalho com o protocolo de sepse no PS!',
          'Agora precisamos monitorar os indicadores de qualidade assistencial da UTI.',
          'Quais são os 3 indicadores assistenciais obrigatórios (ANVISA) para vigilância de infecções em UTI?',
        ],
        choices: [
          {
            text: 'Densidade de incidência de IPCS (Cateter Central), PAV (Pneumonia Ventilador) e ITU-AC (Sonda Vesical), com metas de redução bacteriana.',
            correct: true,
            tooltip: 'ANVISA / RDC 07/2010 — Indicadores de Infecção Relacionada à Assistência (IRAS)',
            feedback: 'Excelente! A RDC 07/2010 e o PNPCIRAS da ANVISA tornam obrigatória a notificação mensal dessas três densidades de incidência.',
            effect: (s) => ({ prestige: s.prestige + 50 }),
            missionEffect: 'indicadores_qualidade:complete',
          },
          {
            text: 'Média de idade dos médicos plantonistas e quantidade de refeições servidas aos acompanhantes.',
            correct: false,
            tooltip: 'Métricas administrativas que não possuem valor de vigilância sanitária epidemiológica',
            feedback: 'Incorreto. Dados demográficos de plantonistas e refeições de acompanhantes não medem contaminação ou infecção assistencial.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'indicadores_qualidade:complete',
          },
          {
            text: 'Apenas a quantidade de ampolas de sedativos consumidas pela farmácia.',
            correct: false,
            tooltip: 'Consumo de sedativo mede farmácia, não vigilância de germes multirresistentes',
            feedback: 'Incorreto. O consumo de sedativos é um dado farmacoepidemiológico e não um indicador de evento adverso de contaminação.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'indicadores_qualidade:complete',
          },
          {
            text: 'Tempo total de permanência dos acompanhantes nas salas de recepção do hospital.',
            correct: false,
            tooltip: 'Tempo na recepção não avalia eventos adversos dentro do leito crítico',
            feedback: 'Incorreto. O tempo de permanência de acompanhantes na recepção não possui impacto no cálculo das IRAS da UTI.',
            effect: (s) => ({ prestige: s.prestige - 2 }),
            missionEffect: 'indicadores_qualidade:complete',
          },
        ],
      },
      {
        id: 'intro',
        condition: (s) => !s.completedMissions.includes('protocolo_sepse'),
        topic: 'Segurança do Paciente',
        text: [
          'Bom dia! Você deve ser a nova enfermeira gerente.',
          'A UTI atende pacientes críticos, mas a triagem e o reconhecimento da Sepse começam na emergência.',
          'Qual é o tempo-alvo da "Pacote de 1 Hora" do ILAS/Surviving Sepsis Campaign?',
        ],
        choices: [
          {
            text: 'Coletar lactato/hemoculturas, iniciar antibiótico de amplo espectro e ressuscitação volêmica dentro de 60 minutos do reconhecimento.',
            correct: true,
            tooltip: 'Surviving Sepsis Campaign / ILAS — Pacote de 1 Hora da Sepse',
            feedback: 'Perfeito! O reconhecimento rápido da sepse e administração do pacote de 1 hora reduz em até 40% a mortalidade por choque séptico.',
            effect: (s) => ({ prestige: s.prestige + 35 }),
          },
          {
            text: 'Aguardar 12 horas de observação antes de solicitar qualquer exame de sangue ou culturas.',
            correct: false,
            tooltip: 'Atraso de 12 horas no antibiótico leva o paciente ao choque irrreversível e óbito',
            feedback: 'Incorreto. A cada hora de atraso na administração do antimicrobiano na sepse grave, a mortalidade aumenta cerca de 8%.',
            effect: (s) => ({ prestige: s.prestige - 10 }),
          },
          {
            text: 'Administrar corticoides em altas doses sem coletar hemoculturas prévias.',
            correct: false,
            tooltip: 'Corticoide não substitui antibioticoterapia e cultura imediata',
            feedback: 'Incorreto. Hemoculturas devem ser coletadas antes da antibioticoterapia sem atrasar o início do pacote de 1 hora.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
          },
          {
            text: 'Dar alta ao paciente com febre e prescrever antitérmico para tomar em casa.',
            correct: false,
            tooltip: 'Dar alta para paciente com critérios de resposta inflamatória e disfunção é erro grave',
            feedback: 'Incorreto. Pacientes com critérios de sepse precisam de internamento imediato e protocolo de choque.',
            effect: (s) => ({ prestige: s.prestige - 10 }),
          },
        ],
      },
      {
        id: 'idle',
        topic: 'Gestão do Cuidado em Enfermagem',
        text: [
          'A UTI está bem gerenciada. Continue assim!',
          'O enfermeiro gerente é essencial na terapia intensiva.',
        ],
        choices: [{ text: 'Trabalhamos bem em equipe, doutor!' }],
      },
    ],
    dialoguePools: [
      [{
        id: 'pool1_oliveira',
        text: [
          'Vamos revisar os indicadores de qualidade da UTI este mês.',
          'A taxa de infecção de corrente sanguínea associada a cateter (ICSAC) está em 6,2/1000 cateteres-dia.',
          'Qual meta é recomendada pelos protocolos de segurança do paciente? (Kurcgant cap.6)',
        ],
        choices: [
          { text: 'Meta: < 2/1000 cateteres-dia (benchmarking NHSN/CDC). Revisar técnica de inserção, manutenção e critério de retirada do cateter.', correct: true, tooltip: 'NHSN/CDC: meta ICSAC < 2/1000 cateteres-dia em UTI', feedback: 'Correto! A meta NHSN/CDC para ICSAC em UTI é < 2/1000 cateteres-dia. Com 6,2, o setor está 3× acima do benchmark. Revisão do bundle de cateter é urgente. (Kurcgant cap.6)', effect: (s) => ({ prestige: s.prestige + 35 }) },
          { text: 'Qualquer taxa abaixo de 10/1000 é aceitável para UTI de alta complexidade.', correct: false, feedback: 'Incorreto. A meta de 10/1000 é muito acima do benchmark. A ONA e NHSN não aceitam essa margem como satisfatória.', effect: (s) => ({ prestige: s.prestige - 2 }) },
          { text: 'Indicadores de infecção hospitalar não são de responsabilidade da enfermagem, apenas da CCIH.', correct: false, feedback: 'Incorreto. Enfermagem é corresponsável pelos indicadores — a CCIH reporta, mas a prevenção é executada pela equipe assistencial.', effect: (s) => ({ prestige: s.prestige - 3 }) },
          { text: 'Taxa de 6,2 é esperada para UTI nível III — não é necessário nenhuma intervenção urgente.', correct: false, feedback: 'Errado. Toda ICSAC é potencialmente evitável. A abordagem zero-tolerância é o padrão atual de qualidade. (IHI/NHSN)', effect: (s) => ({ prestige: s.prestige - 5 }) },
        ],
      }],
      [{
        id: 'pool2_oliveira',
        text: [
          'A equipe multiprofissional da UTI está discutindo sobre o modelo de passagem de plantão.',
          'Qual método de comunicação estruturada reduz mais erros na transição de cuidados?',
          '(Kurcgant cap.9 — Trabalho em Equipe)',
        ],
        choices: [
          { text: 'SBAR (Situação, Background, Avaliação, Recomendação) — ferramenta validada internacionalmente para comunicação de alta complexidade.', correct: true, tooltip: 'SBAR: padrão internacional OMS para comunicação na passagem de plantão', feedback: 'Correto! O SBAR (ou ISBAR com Identificação) é recomendado pela OMS e Joint Commission. Reduz erros de comunicação em até 60% na passagem de plantão. (Kurcgant cap.9)', effect: (s) => ({ prestige: s.prestige + 30 }) },
          { text: 'Comunicação verbal informal entre enfermeiros é suficiente — documentação demora muito.', correct: false, feedback: 'Perigoso. Comunicação informal sem estrutura é a principal causa de eventos adversos na transição de cuidado.', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'Entregar um resumo impresso e o profissional que chega lê sozinho sem discussão.', correct: false, feedback: 'Insuficiente. A troca bidirecional de informações é essencial — dúvidas devem ser esclarecidas no momento.', effect: (s) => ({ prestige: s.prestige - 3 }) },
          { text: 'Cada profissional verifica o prontuário eletrônico no início do turno sem passagem formal.', correct: false, feedback: 'O prontuário não captura situações emergentes. A passagem ativa é necessária para informações críticas recentes.', effect: (s) => ({ prestige: s.prestige - 4 }) },
        ],
      }],
      [{
        id: 'pool3_oliveira',
        text: [
          'Um familiar exige que a equipe utilize tratamento experimental não aprovado no paciente.',
          'O paciente está sedado e não pode expressar sua vontade.',
          'Qual é a conduta ético-legal correta? (Kurcgant cap.2 — Ética em Enfermagem)',
        ],
        choices: [
          { text: 'Explicar que tratamentos devem ter embasamento ético-científico, consultar o Comitê de Ética e documentar a decisão no prontuário.', correct: true, tooltip: 'Código de Ética dos Profissionais de Enfermagem (COFEN 564/2017) — autonomia e beneficência', feedback: 'Correto! O Código de Ética COFEN 564/2017 e a Resolução CFM 1.995/2012 orientam: o familiar não tem poder de exigir tratamento não-indicado. Comitê de Ética é a instância adequada. (Kurcgant cap.2)', effect: (s) => ({ prestige: s.prestige + 35 }) },
          { text: 'Aplicar o tratamento para evitar conflito com a família e possível processo judicial.', correct: false, feedback: 'Perigoso! Tratamentos sem embasamento podem causar dano. O medo de processo não justifica prática não-ética.', effect: (s) => ({ prestige: s.prestige - 10 }) },
          { text: 'Negar categoricamente sem explicação — é decisão médica, não da família.', correct: false, feedback: 'A negativa sem diálogo é eticamente inadequada. O familiar deve ser acolhido e orientado sobre os critérios de decisão.', effect: (s) => ({ prestige: s.prestige - 3 }) },
          { text: 'Consultar apenas o médico plantonista e seguir o que ele decidir.', correct: false, feedback: 'Insuficiente para questões éticas complexas. O Comitê de Ética existe exatamente para casos como esse.', effect: (s) => ({ prestige: s.prestige - 4 }) },
        ],
      }],
    ],
  },
  {
    id: 'dra_santos',
    name: 'Dra. Santos',
    title: 'Oncologista / Hematologista',
    role: 'doctor',
    spriteKey: 'npc_santos',
    startCol: 34, startRow: 36,
    bodyColor: 0xffffff, coatColor: 0xd5f5e3, hairColor: 0x1a1a1a, skinColor: 0xd4a574,
    patrolPoints: [
      { col: 34, row: 36 }, { col: 30, row: 36 }, { col: 30, row: 40 }, { col: 38, row: 40 },
    ],
    schedule: [
      { hour: 8, col: 34, row: 36 }, { hour: 16, col: 34, row: 40 },
    ],
    missionIds: ['quimioterapia_segura', 'cuidados_paliativos'],
    dialogues: [
      {
        id: 'quimio_intro',
        condition: (s) => !s.completedMissions.includes('quimioterapia_segura'),
        topic: 'Segurança do Paciente',
        text: [
          'Precisamos implementar o protocolo de quimioterapia segura na Oncologia.',
          'O INCA e o ISMP recomendam dupla checagem obrigatória antes de toda administração.',
          'Qual é a conduta padrão ouro na administração de antineoplásicos?',
        ],
        choices: [
          {
            text: 'Realizar a Dupla Checagem Independente por dois enfermeiros (dose, paciente, via, taxa de infusão e integridade do acesso venoso central).',
            correct: true,
            tooltip: 'ISMP / INCA — Dupla Checagem Independente em Oncologia',
            feedback: 'Excelente! A dupla checagem independente minimiza os erros catastróficos em medicação antineoplásica de alta vigilância (High-Alert Medications).',
            effect: (s) => ({ prestige: s.prestige + 40 }),
            missionEffect: 'quimioterapia_segura:complete',
          },
          {
            text: 'Administrar o quimioterápico rapidamente sem verificar o refluxo sanguinto no acesso venoso central.',
            correct: false,
            tooltip: 'Infusão sem retorno venoso causa extravasamento grave de vesicante e necrose tecidual',
            feedback: 'Incorreto. Extravasamento de antineoplásicos vesicantes sem verificação prévia de patência causa síndrome compartimental e necrose.',
            effect: (s) => ({ prestige: s.prestige - 10 }),
            missionEffect: 'quimioterapia_segura:complete',
          },
          {
            text: 'Permitir que estagiários de enfermagem administrem o quimioterápico sem supervisão direta.',
            correct: false,
            tooltip: 'Resolução COFEN 569/2018: administração de quimioterapia é privativa do enfermeiro',
            feedback: 'Incorreto. A Resolução COFEN 569/2018 determina que a administração de antineoplásicos é competência técnica e privativa do Enfermeiro.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'quimioterapia_segura:complete',
          },
          {
            text: 'Descartar os resíduos do frasco e do equipo em lixo comum de escritório.',
            correct: false,
            tooltip: 'Resíduos quimioterápicos exigem descarte especial de resíduos perigosos (Grupo B - ANVISA)',
            feedback: 'Incorreto. Resíduos antineoplásicos são classificados no Grupo B (químicos/tóxicos) e requerem descarte especial de biossegurança.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'quimioterapia_segura:complete',
          },
        ],
      },
      {
        id: 'paliativos_intro',
        condition: (s) => s.completedMissions.includes('quimioterapia_segura') && s.completedMissions.length >= 3 && !s.completedMissions.includes('cuidados_paliativos'),
        topic: 'Gestão do Cuidado em Enfermagem',
        text: [
          'Precisamos de um protocolo de cuidados paliativos para pacientes em fase avançada.',
          'Muitos ficam com sintomas refratários de dor, dispneia e ansiedade.',
          'Qual a definição de Cuidados Paliativos segundo a Organização Mundial da Saúde (OMS)?',
        ],
        choices: [
          {
            text: 'Abordagem multiprofissional que melhora a qualidade de vida de pacientes e familiares diante de doenças ameaçadoras da vida, aliviando a dor e sofrimento.',
            correct: true,
            tooltip: 'Definição da OMS (2002/2018) de Cuidados Paliativos',
            feedback: 'Perfeito! Os cuidados paliativos não apressam nem adiam a morte; afirmam a vida e consideram o morrer como um processo natural.',
            effect: (s) => ({ prestige: s.prestige + 50 }),
            missionEffect: 'cuidados_paliativos:complete',
          },
          {
            text: 'Suspender todo o cuidado de enfermagem e higiene quando o paciente for diagnosticado fora de possibilidade de cura.',
            correct: false,
            tooltip: 'Abandonar cuidados básicos de enfermagem é eutanásia passiva por negligência',
            feedback: 'Incorreto. Os cuidados de conforto, higiene, curativos e controle sintomático aumentam de intensidade na fase final de vida.',
            effect: (s) => ({ prestige: s.prestige - 10 }),
            missionEffect: 'cuidados_paliativos:complete',
          },
          {
            text: 'Encaminhar todos os pacientes para a UTI para realizar intubação orotraquial de emergência obrigatoriamente.',
            correct: false,
            tooltip: 'Dysthanasia (obstinação terapêutica) prolonga o sofrimento sem benefício clínico',
            feedback: 'Incorreto. Medidas fúteis em fase terminal configuram distanásia, infringindo o Código de Ética dos Profissionais de Enfermagem.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'cuidados_paliativos:complete',
          },
          {
            text: 'Restringir a presença dos familiares a apenas 5 minutos por semana durante a internação.',
            correct: false,
            tooltip: 'Acolhimento da família é pilar essencial nos cuidados paliativos',
            feedback: 'Incorreto. O suporte à família e a permanência de acompanhante são direitos previstos na política nacional de cuidados paliativos.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'cuidados_paliativos:complete',
          },
        ],
      },
      {
        id: 'idle',
        topic: 'Gestão do Cuidado em Enfermagem',
        text: [
          'A oncologia precisa de enfermagem especializada e compassiva.',
          'Obrigada pelo suporte à nossa equipe!',
        ],
        choices: [{ text: 'É um privilégio trabalhar aqui!' }],
      },
    ],
    dialoguePools: [
      [{
        id: 'pool1_santos',
        text: [
          'Vamos administrar quimioterapia em um paciente com linfoma de alto grau.',
          'O protocolo exige dupla checagem antes da administração.',
          'Quais são os 5 critérios obrigatórios da dupla checagem em quimioterapia? (INCA/OMS)',
        ],
        choices: [
          { text: 'Verificar: identidade do paciente, medicamento correto, dose, via e hora — seguindo os 5 certos expandidos para quimioterapia.', correct: true, tooltip: 'INCA: dupla checagem dos 5 certos em quimioterapia + protocolo correto', feedback: 'Correto! Em quimioterapia, os "5 certos" (paciente, medicamento, dose, via, hora) são verificados por 2 profissionais independentes. Erro pode ser fatal. (Kurcgant cap.6 — Qualidade e Segurança)', effect: (s) => ({ prestige: s.prestige + 35 }) },
          { text: 'Verificar apenas o nome do paciente e o frasco — o resto é responsabilidade da farmácia.', correct: false, feedback: 'Perigoso! Todos os 5 critérios devem ser verificados pela enfermagem antes da administração, independente da farmácia.', effect: (s) => ({ prestige: s.prestige - 10 }) },
          { text: 'A dupla checagem é recomendação, não obrigação — basta que um profissional confira.', correct: false, feedback: 'Incorreto. A dupla checagem é obrigatória para medicamentos de alta vigilância como quimioterápicos. (ANVISA/ISMP)', effect: (s) => ({ prestige: s.prestige - 3 }) },
          { text: 'Verificar apenas o peso do paciente para confirmar a dose calculada está correta.', correct: false, feedback: 'Insuficiente. Peso é um critério de cálculo, não substitui a verificação completa dos 5 certos na beira do leito.', effect: (s) => ({ prestige: s.prestige - 3 }) },
        ],
      }],
      [{
        id: 'pool2_santos',
        text: [
          'Uma paciente com câncer de mama avançado está com dor crônica intensa (EVA 8/10).',
          'O médico ainda não prescreveu analgesia adequada.',
          'Qual é a responsabilidade da enfermagem segundo cuidados paliativos? (Kurcgant cap.2 — Ética)',
        ],
        choices: [
          { text: 'Registrar a avaliação de dor no prontuário, notificar o médico de forma estruturada (SBAR) e advogado pelos direitos do paciente ao controle de dor.', correct: true, tooltip: 'OMS: controle de dor é direito humano — enfermagem é advogada do paciente', feedback: 'Correto! O controle de dor é direito reconhecido pela OMS em cuidados paliativos. A enfermagem tem papel ativo de avaliação, registro e advocacia, não apenas de administrar quando prescrito. (Kurcgant cap.2)', effect: (s) => ({ prestige: s.prestige + 30 }) },
          { text: 'Aguardar passagem de plantão para comunicar ao próximo médico que assumir.', correct: false, feedback: 'Incorreto. Dor intensa (EVA 8/10) é urgência — não pode aguardar troca de turno.', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'Administrar medicação analgésica que a paciente tomava em casa sem prescrição hospitalar.', correct: false, feedback: 'Ilegal e perigoso. Administração sem prescrição é infração ética e legal, mesmo com boa intenção.', effect: (s) => ({ prestige: s.prestige - 10 }) },
          { text: 'Explicar para a paciente que é preciso aguardar — a prescrição é exclusivamente médica.', correct: false, feedback: 'Passividade inaceitável. Enfermagem deve agir ativamente pela resolução do problema, não apenas comunicar limitações.', effect: (s) => ({ prestige: s.prestige - 5 }) },
        ],
      }],
      [{
        id: 'pool3_santos',
        text: [
          'A família de um paciente em fase terminal pede para "fazer tudo" e não aceita discutir cuidados paliativos.',
          'O paciente previamente havia expressado querer conforto sem medidas extraordinárias.',
          'Como abordar essa situação segundo a ética em enfermagem? (Kurcgant cap.2)',
        ],
        choices: [
          { text: 'Valorizar a autonomia prévia do paciente, conduzir reunião familiar com equipe multiprofissional e facilitar processo de elaboração do luto antecipatório.', correct: true, tooltip: 'Kurcgant cap.2: princípio da autonomia e cuidado centrado no paciente', feedback: 'Correto! O princípio da autonomia (vontade prévia do paciente) deve prevalecer. A reunião familiar multiprofissional e o acompanhamento do luto antecipatório são boas práticas de cuidados paliativos. (Kurcgant cap.2)', effect: (s) => ({ prestige: s.prestige + 35 }) },
          { text: 'Atender o pedido da família e iniciar todas as medidas de suporte para evitar conflito.', correct: false, feedback: 'Incorreto. Priorizar o pedido da família sobre a vontade do paciente viola o princípio de autonomia. (Kurcgant cap.2)', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'Informar que a decisão é exclusivamente médica e que a enfermagem não tem papel nessa discussão.', correct: false, feedback: 'Incorreto. A enfermagem tem papel central nos cuidados paliativos e nas discussões sobre fim de vida. (Kurcgant cap.2)', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'Acionar juridicamente a família para garantir a vontade do paciente de forma compulsória.', correct: false, feedback: 'Desnecessário como primeira medida. A mediação multiprofissional e o diálogo devem ser esgotados primeiro.', effect: (s) => ({ prestige: s.prestige - 2 }) },
        ],
      }],
    ],
  },
  {
    id: 'enf_pedro',
    name: 'Enf. Pedro',
    title: 'Enfermeiro da Maternidade',
    role: 'nurse',
    spriteKey: 'npc_pedro',
    startCol: 20, startRow: 36,
    bodyColor: 0xffffff, coatColor: 0xfce8ef, hairColor: 0x5c4033, skinColor: 0xd4a574,
    patrolPoints: [
      { col: 20, row: 36 }, { col: 16, row: 36 }, { col: 16, row: 40 }, { col: 24, row: 40 },
    ],
    schedule: [
      { hour: 7, col: 20, row: 36 }, { hour: 19, col: 20, row: 40 },
    ],
    missionIds: ['banco_leite', 'humanizacao_parto'],
    dialogues: [
      {
        id: 'banco_leite_intro',
        condition: (s) => !s.completedMissions.includes('banco_leite'),
        topic: 'Gestão da Qualidade',
        text: [
          'Bom dia! O Banco de Leite do HUAP precisa de reestruturação.',
          'A coleta, processamento, pasteurização e distribuição exigem rigor de boas práticas.',
          'Qual é o procedimento térmico obrigatório para inativação microbiana no Leite Humano Ordenhado (LHO)?',
        ],
        choices: [
          {
            text: 'Pasteurização rápida a 62,5°C por 30 minutos em banho-maria termostatizado, seguida de resfriamento imediato a 5°C.',
            correct: true,
            tooltip: 'RDC 171/2006 ANVISA — Processamento térmico do leite materno',
            feedback: 'Excelente! A pasteurização a 62,5°C por 30 min inativa 100% dos patógenos (incluindo HIV e vírus respiratórios) preservando fatores imunológicos.',
            effect: (s) => ({ prestige: s.prestige + 35 }),
            missionEffect: 'banco_leite:complete',
          },
          {
            text: 'Ferver o leite humano diretamente no fogão em panela aberta até levantar fervura.',
            correct: false,
            tooltip: 'Fervura direta desnatura totalmente as imunoglobulinas e anticorpos do leite',
            feedback: 'Incorreto. A fervura direta destrói as imunoglobulinas (IgA secretora) e os fatores de proteção biológica do leite materno.',
            effect: (s) => ({ prestige: s.prestige - 10 }),
            missionEffect: 'banco_leite:complete',
          },
          {
            text: 'Congelar o leite materno sem realizar teste de acidez Dornic ou pasteurização.',
            correct: false,
            tooltip: 'Acidez Dornic acima de 8°D indica contaminação bacteriana e degradação',
            feedback: 'Incorreto. O teste de acidez Dornic é obrigatório para descartar leite com contaminação bacteriana excessiva antes de congelar.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'banco_leite:complete',
          },
          {
            text: 'Aquecer o leite materno em forno micro-ondas comum por 5 minutos.',
            correct: false,
            tooltip: 'Micro-ondas aquece de forma desigual e destrói componentes bioativos',
            feedback: 'Incorreto. O aquecimento em micro-ondas destrói anticorpos e cria "pontos quentes" que podem causar queimaduras graves no recém-nascido.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'banco_leite:complete',
          },
        ],
      },
      {
        id: 'humanizacao_intro',
        condition: (s) => s.completedMissions.includes('banco_leite') && s.completedMissions.length >= 3 && !s.completedMissions.includes('humanizacao_parto'),
        topic: 'Gestão do Cuidado em Enfermagem',
        text: [
          'Precisamos implementar práticas de humanização do parto aqui no HUAP!',
          'As diretrizes do Ministério da Saúde orientam práticas baseadas em evidências para o parto normal.',
          'Quais condutas de obstetrícia humanizada devem ser promovidas pela enfermagem obstétrica?',
        ],
        choices: [
          {
            text: 'Garantir acompanhante de livre escolha (Lei 11.108/2005), movimentação livre, métodos não farmacológicos de alívio da dor e contato pele a pele imediato.',
            correct: true,
            tooltip: 'Diretrizes Nacionais de Assistência ao Parto Normal (MS/OMS)',
            feedback: 'Perfeito! A presença do acompanhante, a liberdade de posição e o clampeamento tardio do cordão são práticas recomendadas com grau de evidência A.',
            effect: (s) => ({ prestige: s.prestige + 45 }),
            missionEffect: 'humanizacao_parto:complete',
          },
          {
            text: 'Realizar episiotomia de rotina e manobra de Kristeller em todas as gestantes sem exceção.',
            correct: false,
            tooltip: 'Episiotomia de rotina e manobra de Kristeller são práticas proscritas e nocivas',
            feedback: 'Incorreto. A manobra de Kristeller é proscrita pelo Ministério da Saúde pelo risco de rotura uterina e traumatismo fetal.',
            effect: (s) => ({ prestige: s.prestige - 10 }),
            missionEffect: 'humanizacao_parto:complete',
          },
          {
            text: 'Obrigar a gestante a permanecer em posição de litotomia (supina) e em jejum absoluto durante todo o trabalho de parto.',
            correct: false,
            tooltip: 'Posição supina rígida reduz a perfusão placentária e prolonga o trabalho de parto',
            feedback: 'Incorreto. A posição supina restringe a movimentação e reduz o fluxo sanguíneo uteroplacentário pela compressão da veia cava.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'humanizacao_parto:complete',
          },
          {
            text: 'Separar o recém-nascido saudável da mãe imediatamente após o nascimento para observação de 6 horas no berçário.',
            correct: false,
            tooltip: 'Separação mãe-bebê saudável dificulta o aleitamento precoce e o vínculo afetuoso',
            feedback: 'Incorreto. O recém-nascido saudável deve ir diretamente para o aleitamento na primeira hora de vida no alojamento conjunto.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
            missionEffect: 'humanizacao_parto:complete',
          },
        ],
      },
      {
        id: 'idle',
        topic: 'Gestão do Cuidado em Enfermagem',
        text: [
          'A maternidade é lugar de vida e emoção.',
          'Humanização é a essência da nossa prática aqui.',
        ],
        choices: [{ text: 'Bela missão, Pedro!' }],
      },
    ],
    dialoguePools: [
      [{
        id: 'pool1_pedro',
        text: [
          'O Banco de Leite do HUAP precisa de adequação urgente.',
          'Qual é a temperatura correta de armazenamento do leite humano cru no BLH?',
          '(RDC 171/2006 ANVISA — Bancos de Leite Humano)',
        ],
        choices: [
          { text: 'Leite cru: refrigerado a -3 a 5°C por até 12h ou congelado a -18°C. Leite pasteurizado: 2 a 6°C por até 12h.', correct: true, tooltip: 'RDC 171/2006 ANVISA: temperatura e tempo de armazenamento no BLH', feedback: 'Correto! A RDC 171/2006 da ANVISA é rigorosa sobre temperatura do BLH. Leite cru deve ser coletado e processado no prazo — qualquer desvio implica descarte obrigatório.', effect: (s) => ({ prestige: s.prestige + 28 }) },
          { text: 'Temperatura ambiente é suficiente por até 4 horas — é leite materno, não um medicamento.', correct: false, feedback: 'Perigoso! Leite humano em temperatura ambiente cresce bactérias rapidamente. A RDC 171/2006 é muito estrita sobre controle térmico.', effect: (s) => ({ prestige: s.prestige - 8 }) },
          { text: 'Qualquer refrigeração abaixo de 10°C é aceitável — o importante é não congelar.', correct: false, feedback: 'Incorreto. A faixa exata é -3 a 5°C para cru e 2 a 6°C para pasteurizado. Temperatura de 10°C não é adequada.', effect: (s) => ({ prestige: s.prestige - 2 }) },
          { text: 'O tempo não importa se o leite foi coletado em condições estéreis.', correct: false, feedback: 'Incorreto. Mesmo em condições estéreis, o tempo e a temperatura são determinantes para a segurança do receptor.', effect: (s) => ({ prestige: s.prestige - 5 }) },
        ],
      }],
      [{
        id: 'pool2_pedro',
        text: [
          'Uma parturiente deseja ter seu companheiro presente durante o trabalho de parto.',
          'A equipe diz que "a norma do hospital" não permite acompanhante na sala de parto.',
          'Qual é o respaldo legal para garantir esse direito? (Humanização)',
        ],
        choices: [
          { text: 'Lei 11.108/2005 — garante à parturiente o direito a acompanhante durante trabalho de parto, parto e pós-parto imediato em serviços do SUS.', correct: true, tooltip: 'Lei 11.108/2005: direito à presença de acompanhante no parto — SUS', feedback: 'Correto! A Lei 11.108/2005 garante o direito ao acompanhante no parto em todos os serviços do SUS. Normas internas não podem contrariar lei federal. (PNH/MS)', effect: (s) => ({ prestige: s.prestige + 30 }) },
          { text: 'Não há lei específica — a decisão é do obstetra responsável pelo parto.', correct: false, feedback: 'Incorreto. A Lei 11.108/2005 é clara e de cumprimento obrigatório. O obstetra não pode negar esse direito.', effect: (s) => ({ prestige: s.prestige - 3 }) },
          { text: 'O acompanhante pode entrar apenas se a parturiente estiver em risco de vida.', correct: false, feedback: 'Incorreto. O direito é incondicional — não depende do estado clínico da parturiente.', effect: (s) => ({ prestige: s.prestige - 5 }) },
          { text: 'Depende do protocolo interno de cada hospital — cada instituição define suas regras.', correct: false, feedback: 'Incorreto. Protocolos internos não podem contrariar lei federal. A Lei 11.108/2005 prevalece sobre qualquer norma interna.', effect: (s) => ({ prestige: s.prestige - 2 }) },
        ],
      }],
      [{
        id: 'pool3_pedro',
        text: [
          'Uma mãe adolescente está com dificuldade para amamentar seu recém-nascido.',
          'O bebê está perdendo peso acima do permitido no 3º dia de vida.',
          'Qual é a conduta prioritária da enfermagem no Alojamento Conjunto?',
        ],
        choices: [
          { text: 'Avaliar a pega, posição e frequência das mamadas, orientar a mãe com técnica demonstrativa e acionar o suporte de lactação (BLH/IBCLC) se necessário.', correct: true, tooltip: 'OMS/MS: aleitamento materno — papel da enfermagem no suporte ativo no alojamento conjunto', feedback: 'Correto! A avaliação ativa da amamentação (pega, posição, frequência) e o suporte técnico são responsabilidade da equipe de enfermagem. Perda > 10% do peso neonatal exige ação imediata. (OMS/IMALAC)', effect: (s) => ({ prestige: s.prestige + 30 }) },
          { text: 'Oferecer complementação com fórmula para recuperar o peso rapidamente.', correct: false, feedback: 'Incorreto como primeira conduta. Suplementação sem avaliação adequada da amamentação pode comprometer o aleitamento materno exclusivo desnecessariamente.', effect: (s) => ({ prestige: s.prestige - 3 }) },
          { text: 'Orientar a mãe a oferecer o seio de hora em hora e não se preocupar com o peso.', correct: false, feedback: 'Insuficiente. Perda de > 10% do peso ao 3º dia é sinal de alerta que requer avaliação técnica — não apenas reasseguramento verbal.', effect: (s) => ({ prestige: s.prestige - 4 }) },
          { text: 'Comunicar ao pediatra e aguardar orientação médica antes de qualquer intervenção.', correct: false, feedback: 'Passivo demais. A avaliação da amamentação é competência da enfermagem — não requer aguardar médico para iniciar suporte.', effect: (s) => ({ prestige: s.prestige - 5 }) },
        ],
      }],
    ],
  },
  {
    id: 'paciente_uti_1',
    name: 'Sr. João',
    title: 'Paciente (UTI)',
    role: 'patient',
    spriteKey: 'npc_pat_old_m',
    startCol: 43, startRow: 21,
    bodyColor: 0xe0f2fe, coatColor: 0x95a5a6, hairColor: 0xd3d3d3, skinColor: 0xf5c5a3,
    patrolPoints: [{ col: 43, row: 21 }],  // Doesn't move, in bed (ICU row 17-26)
    schedule: [{ hour: 0, col: 43, row: 15 }],
    missionIds: [],
    dialogues: [{
      id: 'idle',
      text: ['(Bip... bip... bip...)', 'Agradeço pelo cuidado... estou me sentindo mais seguro.'],
      choices: [{ text: 'Pode descansar.'}]
    }]
  },
  {
    id: 'paciente_ps_1',
    name: 'Sr. Silva',
    title: 'Paciente (PS)',
    role: 'patient',
    spriteKey: 'npc_pat_old_m',
    startCol: 14, startRow: 3,
    bodyColor: 0xe0f2fe, coatColor: 0xe0f2fe, hairColor: 0x808080, skinColor: 0xf5c5a3,
    patrolPoints: [{ col: 14, row: 3 }],  // On the stretcher
    schedule: [{ hour: 0, col: 14, row: 3 }],
    missionIds: [],
    dialogues: [{
      id: 'idle',
      text: ['(Geme de dor...)', 'Enfermeiro, por favor, a dor não passa.'],
      choices: [{ text: 'Já enviei a prescrição de analgesia.'}]
    }]
  },
  {
    id: 'paciente_enf_1',
    name: 'Dona Maria',
    title: 'Paciente (Enfermaria)',
    role: 'patient',
    spriteKey: 'npc_pat_old_f',
    startCol: 30, startRow: 21,
    bodyColor: 0xe0f2fe, coatColor: 0x94a3b8, hairColor: 0x6e2c00, skinColor: 0xd4a574,
    patrolPoints: [{ col: 30, row: 21 }],  // Doesn't move
    schedule: [{ hour: 0, col: 30, row: 21 }],
    missionIds: [],
    dialogues: [{
      id: 'idle',
      text: ['Sabe se o médico vai passar hoje?', 'O almoço do hospital até que não está ruim.'],
      choices: [{ text: 'O médico já deve passar, Dona Maria.'}]
    }]
  },
  {
    id: 'visitante_1',
    name: 'Roberto',
    title: 'Visitante (Recepção)',
    role: 'other',
    spriteKey: 'npc_pat_boy',
    startCol: 6, startRow: 11,
    bodyColor: 0xffffff, coatColor: 0x2563eb, hairColor: 0x111111, skinColor: 0x8d5524,
    patrolPoints: [{ col: 6, row: 11 }, { col: 10, row: 11 }, { col: 8, row: 9 }],
    schedule: [{ hour: 9, col: 6, row: 11 }],
    missionIds: [],
    dialogues: [{
      id: 'idle',
      text: ['Bom dia, eu queria informações sobre a internação.', 'A senhora poderia me ajudar?'],
      choices: [{ text: 'Claro, por favor se dirija à recepção.'}]
    }]
  },
  {
    id: 'fisioterapeuta_marcos',
    name: 'Fisio. Marcos',
    title: 'Fisioterapeuta',
    role: 'doctor', // We can use doctor for white coat
    spriteKey: 'npc_doctor_m', // Using whatever exists
    startCol: 51, startRow: 35,
    bodyColor: 0xffffff, coatColor: 0x86efac, hairColor: 0x475569, skinColor: 0x8d5524,
    patrolPoints: [{ col: 51, row: 35 }, { col: 54, row: 38 }],
    schedule: [{ hour: 8, col: 51, row: 35 }],
    missionIds: [],
    dialogues: [{
      id: 'idle',
      text: ['A reabilitação é fundamental para a recuperação motora.', 'Um passo de cada vez.'],
      choices: [{ text: 'Exatamente.'}]
    }],
    dialoguePools: [
      [{
        id: 'pool_fisioterapeuta_marcos_1',
        text: [
          'Enfermeira, notei que a equipe de enfermagem da enfermaria não realizou a mudança de decúbito do paciente do leito 3, atrapalhando a fisioterapia respiratória.',
          'Como podemos resolver esse conflito de rotina e coordenar melhor as ações? (Marquis & Huston, Cap. 18 / Kurcgant, Cap. 10)',
        ],
        choices: [
          {
            text: 'Mapear dificuldades e criar cronograma compartilhado de decúbito com metas integradas.',
            correct: true,
            tooltip: 'Liderança colaborativa e trabalho em equipe integrado (Kurcgant Cap. 10)',
            feedback: 'Excelente! De acordo com Marquis & Huston e Kurcgant, a resolução de conflitos deve focar na colaboração (win-win), integrando as rotinas de forma interprofissional e consensual, em vez de posturas autocráticas.',
            effect: (s) => ({ prestige: s.prestige + 30 }),
          },
          {
            text: 'Dar advertência verbal imediata para a equipe de enfermagem daquele setor.',
            correct: false,
            tooltip: 'Gerência autocrática gera hostilidade intersetorial',
            feedback: 'Incorreto. Medidas punitivas unilaterais aumentam o conflito e deterioram o clima de equipe, violando as premissas de liderança integradora de Marquis & Huston.',
            effect: (s) => ({ prestige: s.prestige - 2, stress: s.stress + 10 }),
          },
          {
            text: 'Recomendar que a própria fisioterapia mude o paciente de decúbito para evitar ruídos.',
            correct: false,
            tooltip: 'Postura evasiva não soluciona a coordenação de cuidados',
            feedback: 'Incorreto. A evasão (Marquis & Huston Cap. 18) não soluciona o problema estrutural de coordenação e sobrecarrega a equipe de fisioterapia.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
          },
        ],
      }],
    ],
  },
  {
    id: 'dra_helena',
    name: 'Dra. Helena',
    title: 'Psiquiatra',
    role: 'doctor',
    spriteKey: 'npc_doctor_f',
    startCol: 67, startRow: 38,
    bodyColor: 0xffffff, coatColor: 0xffffff, hairColor: 0xd97706, skinColor: 0xc68642,
    patrolPoints: [{ col: 67, row: 38 }, { col: 70, row: 38 }],
    schedule: [{ hour: 9, col: 67, row: 38 }],
    missionIds: [],
    dialogues: [{
      id: 'idle',
      text: ['A saúde mental é tão importante quanto a física.', 'A escuta é nossa melhor ferramenta aqui.'],
      choices: [{ text: 'Com certeza.'}]
    }],
    dialoguePools: [
      [{
        id: 'pool_dra_helena_1',
        text: [
          'Enfermeira, percebo que nossa equipe de Saúde Mental está apresentando altos índices de absenteísmo e esgotamento emocional (Burnout).',
          'Sob a ótica da gerência, qual é a melhor estratégia de intervenção para o clima organizacional? (Kurcgant, Cap. 11 / Marquis & Huston, Cap. 23)',
        ],
        choices: [
          {
            text: 'Oferecer apoio matricial, redesenhar processos de trabalho e incentivar espaços de escuta.',
            correct: true,
            tooltip: 'Apoio à saúde do trabalhador e melhoria de processos (Kurcgant Cap. 11)',
            feedback: 'Muito bem! Conforme Kurcgant, o clima organizacional e a saúde do trabalhador de enfermagem são prioridades gerenciais. Tratar o Burnout exige intervenção na cultura institucional e apoio psicossocial.',
            effect: (s) => ({ prestige: s.prestige + 35, stress: s.stress - 5 }),
          },
          {
            text: 'Aplicar medidas disciplinares rigorosas para punir faltas e fechar a escala de plantões.',
            correct: false,
            tooltip: 'Postura autocrática ignora causas de adoecimento',
            feedback: 'Incorreto. Punir faltas decorrentes de esgotamento agrava a desmotivação e o absenteísmo, violando os princípios de bem-estar laboral de Kurcgant.',
            effect: (s) => ({ prestige: s.prestige - 5, stress: s.stress + 15 }),
          },
          {
            text: 'Instituir incentivo financeiro para quem não faltar, estimulando competição.',
            correct: false,
            tooltip: 'Estímulos puramente financeiros não tratam adoecimento sistêmico',
            feedback: 'Incorreto. A competição por gratificações ignora as causas sistêmicas do Burnout e prejudica o suporte mútuto na equipe de saúde mental.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
          },
        ],
      }],
    ],
  },
  {
    id: 'paciente_psic_1',
    name: 'Lucas',
    title: 'Paciente (Saúde Mental)',
    role: 'other',
    spriteKey: 'npc_pat_boy',
    startCol: 69, startRow: 36,
    bodyColor: 0x64748b, coatColor: 0x64748b, hairColor: 0x111111, skinColor: 0xf5c5a3,
    patrolPoints: [{ col: 69, row: 36 }, { col: 71, row: 36 }, {col: 69, row: 38}],
    schedule: [{ hour: 7, col: 69, row: 36 }],
    missionIds: [],
    dialogues: [{
      id: 'idle',
      text: ['O jardim me traz muita paz e tranquilidade...', 'Você já viu a fonte dágua lá fora?'],
      choices: [{ text: 'É muito bonito.'}]
    }]
  },
  {
    id: 'paciente_gestante',
    name: 'Amanda',
    title: 'Gestante',
    role: 'other',
    spriteKey: 'npc_pat_gest',
    startCol: 24, startRow: 39,
    bodyColor: 0xffb5a7, coatColor: 0xffb5a7, hairColor: 0x5c4033, skinColor: 0xc68642,
    patrolPoints: [],
    schedule: [{ hour: 6, col: 24, row: 39 }],
    missionIds: [],
    dialogues: [{
      id: 'idle',
      text: ['Nossa, estou sentindo umas contrações...', 'A enfermeira disse que ainda está cedo.'],
      choices: [{ text: 'Fique calma, estamos com você!'}]
    }]
  },
  {
    id: 'tec_enf_pediatria',
    name: 'Tec. Joana',
    title: 'Tec. Enfermagem (Maternidade)',
    role: 'technician',
    spriteKey: 'npc_nurse_f', // Using fallback string
    startCol: 27, startRow: 34,
    bodyColor: 0xffffff, coatColor: 0x86efac, hairColor: 0x3f2a14, skinColor: 0x8b5a2b,
    patrolPoints: [{ col: 27, row: 34 }, { col: 21, row: 34 }],
    schedule: [{ hour: 7, col: 27, row: 34 }],
    missionIds: [],
    dialogues: [{
      id: 'idle',
      text: ['Cuidar dos pequenos é gratificante!', 'Mas também requer muita atenção aos protocolos.'],
      choices: [{ text: 'Bom trabalho!'}]
    }],
    dialoguePools: [
      [{
        id: 'pool_tec_enf_pediatria_1',
        text: [
          'Enfermeira, a mãe do recém-nascido do leito 201 acabou perdendo a pulseira de identificação do bebê durante o banho.',
          'O que eu devo fazer antes de administrar o próximo medicamento ao bebê? (Marquis & Huston, Cap. 22 - Controle de Qualidade)',
        ],
        choices: [
          {
            text: 'Parar a medicação, conferir dados com a mãe e o prontuário, e colocar uma nova pulseira no leito.',
            correct: true,
            tooltip: 'A identificação segura exige verificação e confecção imediata da pulseira',
            feedback: 'Correto! A identificação ativa do paciente é a Meta 1 de Segurança do Paciente. Segundo Marquis & Huston, o controle de qualidade e a segurança exigem conformidade estrita aos protocolos: nunca medique sem identificação corporal.',
            effect: (s) => ({ prestige: s.prestige + 25 }),
          },
          {
            text: 'Proceder com a medicação perguntando o nome para a mãe, e recolocar a pulseira no fim do turno.',
            correct: false,
            tooltip: 'Identificação verbal não substitui a identificação corporal formal',
            feedback: 'Incorreto! Administrar medicamentos sem pulseira viola o protocolo de segurança internacional e aumenta o risco de troca de pacientes (Marquis & Huston Cap. 22).',
            effect: (s) => ({ prestige: s.prestige - 2, stress: s.stress + 5 }),
          },
          {
            text: 'Pedir para outra técnica confirmar se é mesmo o bebê do leito 201 antes de aplicar.',
            correct: false,
            tooltip: 'A confirmação informal não atende aos requisitos de controle de qualidade',
            feedback: 'Incorreto. A confirmação de terceiros não substitui a pulseira de identificação corporal e não previne erros de forma segura e documentada.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
          },
        ],
      }],
    ],
  },
  {
    id: 'paciente_ps_2',
    name: 'Cláudio',
    title: 'Paciente (Triagem)',
    role: 'other',
    spriteKey: 'npc_pat_old_m',
    startCol: 8, startRow: 8,
    bodyColor: 0xe0f2fe, coatColor: 0x64748b, hairColor: 0x737373, skinColor: 0xFFDFc4,
    patrolPoints: [{ col: 8, row: 8 }, { col: 10, row: 8 }],
    schedule: [{ hour: 6, col: 8, row: 8 }],
    missionIds: [],
    dialogues: [{
      id: 'idle',
      text: ['Minha senha nunca é chamada...', 'Sinto muita dor de cabeça.'],
      choices: [{ text: 'Aguarde um momento, vou avisar a enfermagem.'}]
    }]
  },
  {
    id: 'paciente_lab',
    name: 'Fernanda',
    title: 'Paciente (Exames)',
    role: 'other',
    spriteKey: 'npc_pat_girl',
    startCol: 46, startRow: 10,
    bodyColor: 0xf472b6, coatColor: 0xf472b6, hairColor: 0x1a1a1a, skinColor: 0xd4a574,
    patrolPoints: [{ col: 46, row: 10 }, { col: 48, row: 10 }],
    schedule: [{ hour: 7, col: 46, row: 10 }],
    missionIds: [],
    dialogues: [{
      id: 'idle',
      text: ['Tenho fobia de agulha...', 'A moça foi muito cuidadosa na coleta.'],
      choices: [{ text: 'Que bom que deu tudo certo.'}]
    }]
  },
  {
    id: 'medico_planto',
    name: 'Dr. Roberto',
    title: 'Plantonista Geral',
    role: 'doctor',
    spriteKey: 'npc_roberto',
    startCol: 36, startRow: 23,
    bodyColor: 0x1e3a8a, coatColor: 0xffffff, hairColor: 0xd97706, skinColor: 0xfce2c4,
    patrolPoints: [{ col: 36, row: 23 }, { col: 38, row: 23 }, { col: 38, row: 21 }],
    schedule: [{ hour: 8, col: 36, row: 23 }],
    missionIds: [],
    dialogues: [{
      id: 'idle',
      text: ['As prescrições da enfermaria já foram liberadas hoje.', 'Vou revisar os exames pendentes da Dona Maria.'],
      choices: [{ text: 'Perfeito, doutor.'}]
    }]
  },
  {
    id: 'visitante_2',
    name: 'Carlos',
    title: 'Visitante (UTI)',
    role: 'other',
    spriteKey: 'npc_pat_boy', // Reuse
    startCol: 48, startRow: 15,
    bodyColor: 0xf3f4f6, coatColor: 0xd97706, hairColor: 0x451a03, skinColor: 0xd2b48c,
    patrolPoints: [],
    schedule: [{ hour: 14, col: 48, row: 15 }],
    missionIds: [],
    dialogues: [{
      id: 'idle',
      text: ['É tão difícil ver meu pai assim na UTI...', 'A equipe está sendo incrível.'],
      choices: [{ text: 'Estamos torcendo pela recuperação dele.'}]
    }]
  },
  {
    id: 'tecnico_enfermagem_geral',
    name: 'Tec. Marcos',
    title: 'Técnico Plantonista',
    role: 'technician',
    spriteKey: 'npc_tech_m', // Since others are generic right now
    startCol: 60, startRow: 20,
    bodyColor: 0xffffff, coatColor: 0x86efac, hairColor: 0x1c1917, skinColor: 0xd2b48c,
    patrolPoints: [{ col: 60, row: 20 }, { col: 57, row: 22 }, { col: 63, row: 24 }],
    schedule: [{ hour: 6, col: 65, row: 24 }],
    missionIds: [],
    dialogues: [{
      id: 'idle',
      text: ['Já realizei a checagem do carrinho de emergência.', 'Tudo certo no posto central!'],
      choices: [{ text: 'Ótimo trabalho, Marcos.'}]
    }],
    dialoguePools: [
      [{
        id: 'pool_tecnico_enfermagem_geral_1',
        text: [
          'Enfermeira, a senhora precisa que eu realize a Sondagem Vesical de Demora no leito 5.',
          'Eu já vi como se faz e posso ir adiantando. Posso ir lá realizar? (Marquis & Huston, Cap. 20 - Delegação)',
        ],
        choices: [
          {
            text: 'Não, Marcos. Cateterismo vesical é privativo do enfermeiro devido à complexidade.',
            correct: true,
            tooltip: 'COFEN 567/2018 e delegação segura baseada na competência legal',
            feedback: 'Correto! De acordo com as diretrizes do COFEN e Marquis & Huston, a delegação exige avaliar a competência legal. Procedimentos invasivos de alta complexidade como cateterismo vesical são privativos do enfermeiro. Delegar isso constitui imperícia profissional.',
            effect: (s) => ({ prestige: s.prestige + 30 }),
          },
          {
            text: 'Sim, pode ir fazendo. Como o enfermeiro está no setor, você está respaldado.',
            correct: false,
            tooltip: 'Supervisão física não substitui a restrição legal de competência',
            feedback: 'Incorreto! A presença física do enfermeiro não altera a vedação legal. Cateterismo vesical é ato privativo do enfermeiro (Resolução COFEN 567/2018).',
            effect: (s) => ({ prestige: s.prestige - 5, stress: s.stress + 5 }),
          },
          {
            text: 'Sim, contanto que use técnica asséptica rigorosa e registre tudo em prontuário.',
            correct: false,
            tooltip: 'Procedimento invasivo privativo de nível superior',
            feedback: 'Incorreto! O registro técnico não exime a ilegalidade do exercício profissional de ato privativo por profissional de nível médio.',
            effect: (s) => ({ prestige: s.prestige - 8 }),
          },
        ],
      }],
    ],
  },
  {
    id: 'limpeza_1',
    name: 'Dona Rita',
    title: 'Auxiliar de Limpeza',
    role: 'other',
    spriteKey: 'npc_cleaner',
    startCol: 20, startRow: 14,
    bodyColor: 0x475569, coatColor: 0x475569, hairColor: 0x4b5563, skinColor: 0xf5c5a3,
    patrolPoints: [{ col: 10, row: 14 }, { col: 40, row: 14 }, { col: 60, row: 15 }, { col: 10, row: 15 }],
    schedule: [{ hour: 6, col: 20, row: 14 }],
    missionIds: [],
    dialogues: [{
      id: 'idle',
      text: ['Com licença, o piso está úmido.', 'Hospital limpo é hospital seguro.'],
      choices: [{ text: 'Obrigada pelo cuidado, Dona Rita.'}]
    }]
  },
  {
    id: 'estagiario_enf',
    name: 'Estudante Tiago',
    title: 'Estagiário de Enfermagem',
    role: 'other',
    spriteKey: 'npc_tiago',
    startCol: 36, startRow: 20,
    bodyColor: 0x0f172a, coatColor: 0x0284c7, hairColor: 0x3b2314, skinColor: 0xd4a574,
    patrolPoints: [{ col: 36, row: 20 }, { col: 40, row: 20 }],
    schedule: [{ hour: 8, col: 36, row: 20 }],
    missionIds: [],
    dialogues: [{
      id: 'idle',
      text: ['Estou adorando o estágio! Mas a sonda vesical ainda me deixa nervoso.', 'Vou revisar a anatomia.'],
      choices: [{ text: 'Se precisar de ajuda, pode chamar.'}]
    }],
    dialoguePools: [
      [{
        id: 'pool_estagiario_enf_1',
        text: [
          'Professora, cometi um erro na diluição e aplicação de um antibiótico sob sua supervisão direta.',
          'De quem é a responsabilidade legal e ética por este evento adverso? (Marquis & Huston, Cap. 16 - Aspectos Legais)',
        ],
        choices: [
          {
            text: 'A responsabilidade civil e ética é solidária entre o estagiário e o enfermeiro supervisor.',
            correct: true,
            tooltip: 'Enfermeiro supervisor responde por culpa in vigilando na supervisão direta',
            feedback: 'Exato! Segundo Marquis & Huston, o enfermeiro assume responsabilidade legal e ética solidária (responde por culpa in vigilando) pelos atos de quem supervisiona diretamente. O ensino exige supervisão rigorosa e constante.',
            effect: (s) => ({ prestige: s.prestige + 25 }),
          },
          {
            text: 'A responsabilidade é exclusiva do estagiário, que é maior de idade e assume seus atos.',
            correct: false,
            tooltip: 'Estudante em estágio supervisionado não responde isoladamente',
            feedback: 'Incorreto. Estudantes de graduação atuam sob delegação e supervisão direta. O enfermeiro supervisor responde legalmente pela segurança do procedimento.',
            effect: (s) => ({ prestige: s.prestige - 2, stress: s.stress + 5 }),
          },
          {
            text: 'A responsabilidade é exclusiva da instituição de ensino, isentando o enfermeiro do hospital.',
            correct: false,
            tooltip: 'Contrato institucional não anula a responsabilidade do profissional supervisor',
            feedback: 'Incorreto. Embora a faculdade responda administrativamente, o enfermeiro assistencial ou docente supervisor responde direta e eticamente perante o COREN.',
            effect: (s) => ({ prestige: s.prestige - 3 }),
          },
        ],
      }],
    ],
  },
  {
    id: 'paciente_ps_3',
    name: 'Sr. Moreira',
    title: 'Paciente (PS)',
    role: 'other',
    spriteKey: 'npc_pat_old_m',
    startCol: 15, startRow: 8,
    bodyColor: 0xe0f2fe, coatColor: 0xcbd5e1, hairColor: 0xd4d4d8, skinColor: 0xd4a574,
    patrolPoints: [{ col: 15, row: 8 }, { col: 16, row: 8 }],
    schedule: [{ hour: 9, col: 15, row: 8 }],
    missionIds: [],
    dialogues: [{
      id: 'idle',
      text: ['Minha pressão subiu muito hoje, não estou me sentindo bem...', 'Espero que chamem logo.'],
      choices: [{ text: 'Vou checar a sua vez na triagem.'}]
    }]
  },
  {
    id: 'seguranca_1',
    name: 'Seg. Paulo',
    title: 'Segurança Patrimonial',
    role: 'other',
    spriteKey: 'npc_guard',
    startCol: 4, startRow: 5,
    bodyColor: 0x1f2937, coatColor: 0x1f2937, hairColor: 0x000000, skinColor: 0x6a4e42,
    patrolPoints: [{ col: 4, row: 5 }, { col: 4, row: 8 }],
    schedule: [{ hour: 0, col: 4, row: 5 }],
    missionIds: [],
    dialogues: [{
      id: 'idle',
      text: ['Boa tarde. Tudo sob controle na portaria principal.', 'Apenas visitantes cadastrados estão entrando.'],
      choices: [{ text: 'Excelente serviço, Paulo.'}]
    }]
  },
  {
    id: 'paciente_onco',
    name: 'Márcia',
    title: 'Paciente (Oncologia)',
    role: 'other',
    spriteKey: 'npc_pat_girl',
    startCol: 36, startRow: 34,
    bodyColor: 0xfdf2f8, coatColor: 0xf472b6, hairColor: 0x111111, skinColor: 0xfce2c4,
    patrolPoints: [{ col: 36, row: 34 }, { col: 38, row: 34 }],
    schedule: [{ hour: 10, col: 36, row: 34 }],
    missionIds: [],
    dialogues: [{
      id: 'idle',
      text: ['A quimioterapia cansa, mas a equipe daqui me dá muita força.', 'Um dia de cada vez.'],
      choices: [{ text: 'Você é muito guerreira, Márcia.'}]
    }]
  },
  {
    id: 'visitante_maternidade',
    name: 'Pai do Ano (Lucas)',
    title: 'Acompanhante',
    role: 'other',
    spriteKey: 'npc_pat_boy',
    startCol: 21, startRow: 32,
    bodyColor: 0xffffff, coatColor: 0x1e3a8a, hairColor: 0x2c1d11, skinColor: 0xf5c5a3,
    patrolPoints: [{ col: 21, row: 32 }, { col: 23, row: 32 }],
    schedule: [{ hour: 7, col: 21, row: 32 }],
    missionIds: [],
    dialogues: [{
      id: 'idle',
      text: ['Estou tão nervoso! É nossa primeira filha.', 'Será que estou esquecendo alguma coisa na bolsa?'],
      choices: [{ text: 'Vai dar tudo certo, fique calmo!'}]
    }]
  },
  {
    id: 'enfermeiro_cc',
    name: 'Enf. Samuel',
    title: 'Enfermeiro Centro Cirúrgico',
    role: 'nurse',
    spriteKey: 'npc_nurse_m',
    startCol: 8, startRow: 23,
    bodyColor: 0xffffff, coatColor: 0x0ea5e9, hairColor: 0x000000, skinColor: 0x8d5524,
    patrolPoints: [{ col: 8, row: 23 }, { col: 12, row: 23 }],
    schedule: [{ hour: 6, col: 8, row: 23 }],
    missionIds: [],
    dialogues: [{
      id: 'idle',
      text: ['Estou buscando os materiais esterilizados para a próxima cirurgia.', 'O mapa cirúrgico está cheio hoje.'],
      choices: [{ text: 'Boa sorte no procedimento!'}]
    }],
    dialoguePools: [
      [{
        id: 'pool_enfermeiro_cc_1',
        text: [
          'Colega, estamos prestes a iniciar uma cirurgia eletiva de grande porte e o cirurgião disse que quer "pular" o checklist de Cirurgia Segura porque está com pressa.',
          'Qual deve ser o posicionamento gerencial da enfermagem? (Kurcgant, Cap. 7 - Recursos Materiais / Segurança OMS)',
        ],
        choices: [
          {
            text: 'Exigir a pausa cirúrgica ("Time Out") e realizar o checklist de segurança antes de iniciar.',
            correct: true,
            tooltip: 'A enfermagem tem dever ético e legal de garantir as barreiras de segurança do paciente',
            feedback: 'Excelente! O checklist de Cirurgia Segura (OMS) é barreira de segurança vital. De acordo com Kurcgant, a liderança em enfermagem atua com firmeza ética e autoridade técnica para garantir a segurança do paciente, mesmo sob pressão externa.',
            effect: (s) => ({ prestige: s.prestige + 30 }),
          },
          {
            text: 'Permitir o início imediato e preencher o checklist de forma retroativa após o término.',
            correct: false,
            tooltip: 'Preenchimento retroativo invalida o propósito preventivo do checklist',
            feedback: 'Incorreto! O checklist serve para prevenir erros catastróficos ANTES de ocorrerem. Preencher depois é uma infração ética e desvirtua o protocolo de segurança.',
            effect: (s) => ({ prestige: s.prestige - 5, stress: s.stress + 5 }),
          },
          {
            text: 'Deixar a decisão a critério exclusivo do médico, já que ele assume a cirurgia.',
            correct: false,
            tooltip: 'A enfermagem possui responsabilidade técnica e autonomia no cuidado',
            feedback: 'Incorreto. A segurança cirúrgica é corresponsabilidade da equipe de enfermagem. Silenciar diante de desvios viola a conduta ética profissional.',
            effect: (s) => ({ prestige: s.prestige - 8 }),
          },
        ],
      }],
    ],
  },
  {
    id: 'dr_ps',
    name: 'Dra. Aline',
    title: 'Emergencista',
    role: 'doctor',
    spriteKey: 'npc_doctor_f',
    startCol: 20, startRow: 8,
    bodyColor: 0xffffff, coatColor: 0xffffff, hairColor: 0x5c4033, skinColor: 0xf1c27d,
    patrolPoints: [{ col: 20, row: 8 }, { col: 20, row: 11 }],
    schedule: [{ hour: 18, col: 20, row: 8 }],
    missionIds: [],
    dialogues: [{
      id: 'idle',
      text: ['Estamos com dois politraumas vindo pelo resgate.', 'Preparem o box de emergência, por favor.'],
      choices: [{ text: 'Box preparado, doutora.'}]
    }],
    dialoguePools: [
      [{
        id: 'pool_dr_ps_1',
        text: [
          'Enfermeira, temos apenas uma vaga de UTI adulto hoje no HUAP e dois pacientes graves elegíveis:',
          'Um jovem pós-parada cardíaca reversível e um idoso em cuidados paliativos de fim de vida. Como alocamos este recurso escasso? (Marquis & Huston, Cap. 3 - Tomada de Decisão / Bioética)',
        ],
        choices: [
          {
            text: 'Decidir sob critérios éticos e prognóstico clínico: vaga UTI para o jovem e suporte humanizado de conforto para o idoso.',
            correct: true,
            tooltip: 'Justiça distributiva, beneficência e proporcionalidade terapêutica',
            feedback: 'Perfeito! A tomada de decisão (Marquis & Huston, Cap. 3) em alocação de recursos escassos exige análise ética estruturada, baseada em justiça distributiva e beneficência, garantindo que o paliativo receba conforto e o crítico suporte intensivo.',
            effect: (s) => ({ prestige: s.prestige + 35 }),
          },
          {
            text: 'Adotar ordem de chegada estrita, independente do potencial terapêutico ou prognóstico de cada um.',
            correct: false,
            tooltip: 'Ordem de chegada em recursos críticos pode violar a beneficência e utilidade médica',
            feedback: 'Incorreto. A pura ordem de chegada para recursos vitais escassos desconsidera a chance de sobrevivência de casos agudos reversíveis, gerando desfechos clínicos inaceitáveis.',
            effect: (s) => ({ prestige: s.prestige - 5 }),
          },
          {
            text: 'Priorizar o idoso na UTI para evitar processos da família por etarismo.',
            correct: false,
            tooltip: 'Decisões motivadas por medo jurídico em vez de critério clínico-ético',
            feedback: 'Incorreto. A tomada de decisão deve ser pautada em evidências de benefício clínico real e dignidade assistencial (paliativismo vs curativismo), não no receio de retaliação legal.',
            effect: (s) => ({ prestige: s.prestige - 2, stress: s.stress + 10 }),
          },
        ],
      }],
    ],
  },
  {
    id: 'tec_farmacia',
    name: 'Tec. Bianca',
    title: 'Técnica de Farmácia',
    role: 'technician',
    spriteKey: 'npc_tech_f',
    startCol: 34, startRow: 5,
    bodyColor: 0xffffff, coatColor: 0xfcd34d, hairColor: 0x3f2a14, skinColor: 0xf5c5a3,
    patrolPoints: [{ col: 34, row: 5 }, { col: 38, row: 5 }],
    schedule: [{ hour: 8, col: 34, row: 5 }],
    missionIds: [],
    dialogues: [{
      id: 'idle',
      text: ['Organizando os kits de medicação para os andares.', 'Segurança na dispensação é fundamental.'],
      choices: [{ text: 'Exatamente!'}]
    }],
    dialoguePools: [
      [{
        id: 'pool_tec_farmacia_1',
        text: [
          'Enfermeira, recebi uma prescrição urgente de Cloreto de Potássio 19,1% concentrado.',
          'Quais barreiras de armazenamento e dispensação devemos manter para evitar erros com este medicamento de alta vigilância? (Marquis & Huston, Cap. 22 / Protocolo ISMP)',
        ],
        choices: [
          {
            text: 'Armazenar de forma restrita, identificados com tarjas de alerta vermelhas, e dispensar sob dupla checagem.',
            correct: true,
            tooltip: 'Medicamentos potencialmente perigosos exigem barreiras físicas e dupla conferência',
            feedback: 'Correto! Eletrólitos concentrados são medicamentos de alta vigilância (High-Alert Medications). O ISMP e Marquis & Huston apontam que erros com essas substâncias costumam ser fatais; por isso, a restrição física e a dupla checagem são cruciais.',
            effect: (s) => ({ prestige: s.prestige + 25 }),
          },
          {
            text: 'Manter livre na bancada para facilitar e agilizar o acesso rápido pela enfermagem.',
            correct: false,
            tooltip: 'Livre acesso sem controle aumenta risco de trocas acidentais',
            feedback: 'Incorreto. O livre acesso a ampolas concentradas (como KCl e NaCl concentrados) é uma das maiores causas de óbito por troca de ampolas visualmente idênticas (ISMP).',
            effect: (s) => ({ prestige: s.prestige - 8, stress: s.stress + 5 }),
          },
          {
            text: 'Armazenar junto com a água destilada, pois facilitará a diluição rápida no posto.',
            correct: false,
            tooltip: 'Proximidade com ampolas de diluição é extremamente perigosa',
            feedback: 'Perigosíssimo! Armazenar eletrólitos concentrados junto a diluentes gera um erro latente gravíssimo por similaridade visual das embalagens.',
            effect: (s) => ({ prestige: s.prestige - 12 }),
          },
        ],
      }],
    ],
  },
  {
    id: 'paciente_amb_1',
    name: 'João Carlos',
    title: 'Paciente',
    role: 'other',
    spriteKey: 'npc_joao',
    startCol: 68, startRow: 8,
    bodyColor: 0x95a5a6, coatColor: 0x7f8c8d, hairColor: 0xbdc3c7, skinColor: 0xedcbb0,
    patrolPoints: [
      { col: 68, row: 8 }, { col: 65, row: 10 }, { col: 70, row: 6 }
    ],
    schedule: [],
    missionIds: [],
    dialogues: [{ id: 'idle', text: ['Ainda estou aguardando minha consulta.'], choices: [{text: 'Vou verificar a fila.'}] }]
  },
  {
    id: 'paciente_amb_2',
    name: 'Dona Maria',
    title: 'Paciente',
    role: 'other',
    spriteKey: 'npc_maria_amb',
    startCol: 65, startRow: 23,
    bodyColor: 0xe74c3c, coatColor: 0xc0392b, hairColor: 0x7f8c8d, skinColor: 0x8d5524,
    patrolPoints: [],
    schedule: [],
    missionIds: [],
    dialogues: [{ id: 'idle', text: ['Estou aguardando ser chamada. O doutor me pediu exames.'], choices: [{text: 'Logo você será atendida!'}] }]
  },
  {
    id: 'paciente_amb_3',
    name: 'Seu José',
    title: 'Paciente',
    role: 'other',
    spriteKey: 'npc_jose',
    startCol: 65, startRow: 24,
    bodyColor: 0x27ae60, coatColor: 0x2ecc71, hairColor: 0x95a5a6, skinColor: 0xc68642,
    patrolPoints: [],
    schedule: [],
    missionIds: [],
    dialogues: [{ id: 'idle', text: ['Minha pressão está alta hoje. O consultório ali parece estar livre.'], choices: [{text: 'Vou encaminhá-lo.'}] }]
  },
  {
    id: 'mae_maternidade',
    name: 'Laura',
    title: 'Mãe',
    role: 'other',
    spriteKey: 'npc_laura',
    startCol: 36, startRow: 8,
    bodyColor: 0x3498db, coatColor: 0x85c1e9, hairColor: 0x2c3e50, skinColor: 0xffceb4,
    patrolPoints: [
      { col: 36, row: 8 }, { col: 33, row: 11 }, { col: 28, row: 6 }
    ],
    schedule: [],
    missionIds: [],
    dialogues: [{ id: 'idle', text: ['O berçário ficou lindo! Minha bebê está bem cuidada.'], choices: [{text: 'Que bom!'}] }]
  },
  {
    id: 'pai_maternidade',
    name: 'Felipe',
    title: 'Visitante (Pai)',
    role: 'other',
    spriteKey: 'npc_felipe',
    startCol: 44, startRow: 8,
    bodyColor: 0x7f8c8d, coatColor: 0x95a5a6, hairColor: 0x34495e, skinColor: 0xe0ac69,
    patrolPoints: [
      { col: 44, row: 8 }, { col: 44, row: 12 }, { col: 48, row: 10 }
    ],
    schedule: [],
    missionIds: [],
    dialogues: [{ id: 'idle', text: ['Estou olhando pelos vidros da UTI Neonatal. Quanta tecnologia!', 'Mas o ambiente está mais humano.'], choices: [{text: 'Essa era a ideia.'}] }]
  },
  {
    id: 'paciente_enf_2',
    name: 'Seu Zé',
    title: 'Paciente (Enfermaria)',
    role: 'other',
    spriteKey: 'npc_pat_old_m',
    startCol: 40, startRow: 23,
    bodyColor: 0xf87171, coatColor: 0xf87171, hairColor: 0xd1d5db, skinColor: 0x8d5524,
    patrolPoints: [{ col: 40, row: 23 }, { col: 42, row: 23 }],
    schedule: [{ hour: 10, col: 40, row: 23 }],
    missionIds: [],
    dialogues: [{
      id: 'idle',
      text: ['Oh menina, será que o lanche já vai passar?', 'Eu já tô com fome.'],
      choices: [{ text: 'O almoço será servido logo, Seu Zé.'}]
    }]
  }
];

// ─── MISSION DEFINITIONS ──────────────────────────────────────────────────────
export const MISSIONS: MissionDef[] = [
  {
    id: 'escala_plantao',
    title: 'Escala de Plantão',
    description: 'Organizar a escala de enfermagem conforme a Resolução COFEN 543/2017.',
    category: 'Dimensionamento de Enfermagem',
    prestige: 120,
    steps: 2,
    prerequisiteIds: [],
    pedagogy: 'A elaboração de escalas considera: SCP, grau de dependência dos pacientes e quadro de pessoal. O dimensionamento é responsabilidade do enfermeiro gerente.',
    pedagogyRef: 'Kurcgant (2016) — Gerenciamento em Enfermagem, p. 82-95',
  },
  {
    id: 'triagem_ps',
    title: 'Sistema de Triagem Manchester',
    description: 'Implementar o Protocolo Manchester de Classificação de Risco no Pronto-Socorro.',
    category: 'Segurança do Paciente',
    prestige: 100,
    steps: 1,
    prerequisiteIds: [],
    pedagogy: 'O Protocolo Manchester estratifica pacientes em 5 categorias (vermelho/laranja/amarelo/verde/azul), garantindo atendimento por prioridade clínica.',
    pedagogyRef: 'Manchester Triage Group (2014) — Triagem no Serviço de Urgência',
  },
  {
    id: 'protocolo_sepse',
    title: 'Bundle de Sepse',
    description: 'Implementar a Bundle de 1h e 3h para diagnóstico e tratamento precoce da sepse.',
    category: 'Segurança do Paciente',
    prestige: 130,
    steps: 1,
    prerequisiteIds: [],
    pedagogy: 'A Bundle de Sepse (Surviving Sepsis Campaign, 2018) prevê: lactato sérico, hemoculturas, antibióticos, reposição volêmica nas primeiras horas.',
    pedagogyRef: 'Surviving Sepsis Campaign (2018) — Hour-1 Bundle',
  },
  {
    id: 'estoque_farmacia',
    title: 'Gestão de Estoque Farmacêutico',
    description: 'Garantir o resuprimento de medicamentos críticos com ponto de pedido definido.',
    category: 'Gestão de Recursos Materiais e Custos nos Serviços de Saúde e Enfermagem',
    prestige: 110,
    steps: 1,
    prerequisiteIds: [],
    pedagogy: 'A gestão de estoque pelo ponto de pedido e curva ABC evita desabastecimento de medicamentos críticos, garantindo a continuidade do cuidado.',
    pedagogyRef: 'Chiavenato (2014) — Administração: Teoria, Processo e Prática',
  },
  {
    id: 'ronda_enfermaria',
    title: 'Ronda de Enfermagem Estruturada',
    description: 'Implementar ronda sistematizada com protocolo SOAP em todos os leitos.',
    category: 'Gestão do Cuidado em Enfermagem',
    prestige: 90,
    steps: 1,
    prerequisiteIds: [],
    pedagogy: 'A ronda estruturada de enfermagem reduz em até 30% os eventos adversos e melhora a satisfação do paciente (JCAHO, 2011).',
    pedagogyRef: 'Marquis & Huston (2015) — Administração e Liderança em Enfermagem',
  },
  {
    id: 'cme_protocolo',
    title: 'Protocolo CME — RDC 15/2012',
    description: 'Adequar a Central de Material Esterilizado às exigências da ANVISA.',
    category: 'Gestão de Recursos Materiais e Custos nos Serviços de Saúde e Enfermagem',
    prestige: 115,
    steps: 1,
    prerequisiteIds: ['estoque_farmacia'],
    pedagogy: 'A RDC 15/2012 estabelece protocolos obrigatórios de limpeza, desinfecção e esterilização de artigos médico-hospitalares reutilizáveis.',
    pedagogyRef: 'ANVISA — RDC 15, de 15 de março de 2012',
  },
  {
    id: 'reconciliacao_medicamentosa',
    title: 'Reconciliação Medicamentosa',
    description: 'Implementar reconciliação medicamentosa na admissão, transferência e alta.',
    category: 'Segurança do Paciente',
    prestige: 125,
    steps: 1,
    prerequisiteIds: ['estoque_farmacia'],
    pedagogy: 'A Reconciliação Medicamentosa é um processo formal de obtenção da lista de todos os medicamentos do paciente, prevenindo discrepâncias e erros na transição do cuidado.',
    pedagogyRef: 'OMS — 5 Metas Internacionais de Segurança do Paciente',
  },
  {
    id: 'resultados_criticos',
    title: 'Protocolo de Valores Críticos',
    description: 'Criar fluxo de comunicação imediata de resultados laboratoriais críticos.',
    category: 'Segurança do Paciente',
    prestige: 105,
    steps: 1,
    prerequisiteIds: [],
    pedagogy: 'A comunicação efetiva de valores críticos é uma das Metas Internacionais de Segurança da JCI/ONA, exigindo resposta em menos de 30 minutos.',
    pedagogyRef: 'Joint Commission International (2021) — Accreditation Standards',
  },
  {
    id: 'capacitacao_sae',
    title: 'Capacitação em SAE',
    description: 'Treinar toda a equipe de enfermagem na Sistematização da Assistência de Enfermagem.',
    category: 'Educação Continuada e Permanente',
    prestige: 140,
    steps: 1,
    prerequisiteIds: ['escala_plantao'],
    pedagogy: 'A SAE é o método científico de trabalho da enfermagem, composto por: Coleta de dados, Diagnóstico, Planejamento, Implementação e Avaliação (COFEN 358/2009).',
    pedagogyRef: 'Resolução COFEN 358/2009 — SAE / Processo de Enfermagem',
  },
  {
    id: 'fluxo_recepcao',
    title: 'Fluxo de Acolhimento Integrado',
    description: 'Organizar o sistema de acolhimento e agendamento do ambulatório do HUAP.',
    category: 'Gestão do Cuidado em Enfermagem',
    prestige: 100,
    steps: 1,
    prerequisiteIds: ['triagem_ps'],
    pedagogy: 'O Acolhimento com Classificação de Risco integra a Política Nacional de Humanização (PNH) e reorganiza o fluxo de atendimento para reduzir esperas.',
    pedagogyRef: 'Ministério da Saúde — HumanizaSUS: Acolhimento e Classificação de Risco (2009)',
  },
  {
    id: 'superlotacao_ps',
    title: 'Plano de Contingência — Superlotação',
    description: 'Desenvolver protocolo de contingência para situações de overcrowding no PS.',
    category: 'Tomada de Decisão',
    prestige: 135,
    steps: 1,
    prerequisiteIds: ['triagem_ps'],
    pedagogy: 'O protocolo de overcrowding inclui: ativação de leitos extras, alta precoce de internados estáveis, redirecionamento de fluxo e comunicação com regulação.',
    pedagogyRef: 'Derlet & Richards (2000) — Overcrowding in Emergency Departments: ACEP',
  },
  {
    id: 'laudo_urgente',
    title: 'Priorização de Exames Urgentes',
    description: 'Criar sistema de priorização por criticidade para laudos radiológicos.',
    category: 'Tomada de Decisão',
    prestige: 95,
    steps: 1,
    prerequisiteIds: [],
    pedagogy: 'A priorização de exames por cor (vermelho/amarelo/verde) melhora o tempo de resposta diagnóstica e a segurança do paciente crítico.',
    pedagogyRef: 'ACR — American College of Radiology: Appropriateness Criteria',
  },
  {
    id: 'orcamento',
    title: 'Auditoria de Custos Hospitalares',
    description: 'Realizar análise ABC de custos operacionais e propor plano de eficiência.',
    category: 'Gestão de Recursos Materiais e Custos nos Serviços de Saúde e Enfermagem',
    prestige: 150,
    steps: 1,
    prerequisiteIds: ['estoque_farmacia', 'escala_plantao'],
    pedagogy: 'A análise ABC classifica itens por valor de gasto, focando esforços nos itens A (80% do gasto). Ferramentas como custeio por atividade (ABC Costing) permitem decisões baseadas em dados.',
    pedagogyRef: 'Kurcgant (2016) — Gerenciamento em Enfermagem, cap. 12',
  },
  {
    id: 'indicadores_qualidade',
    title: 'Dashboard de Indicadores de Qualidade',
    description: 'Implementar monitoramento contínuo de indicadores assistenciais na UTI.',
    category: 'Indicadores de Saúde: Ferramentas que Subsidiam a Tomada de Decisão',
    prestige: 160,
    steps: 1,
    prerequisiteIds: ['protocolo_sepse', 'ronda_enfermaria'],
    pedagogy: 'Indicadores de qualidade como TPI (Taxa de Parada Intra-hospitalar), IRAS (Infecções Relacionadas), e VMI são essenciais para avaliação da performance assistencial.',
    pedagogyRef: 'OPAS/OMS — Indicadores Hospitalares (2008); ONA (2018)',
  },
  {
    id: 'acreditacao_ona',
    title: 'Preparação para Acreditação ONA',
    description: 'Preparar o HUAP para visita de acreditação da Organização Nacional de Acreditação.',
    category: 'Acreditação Hospitalar',
    prestige: 220,
    steps: 1,
    prerequisiteIds: ['indicadores_qualidade', 'cme_protocolo'],
    pedagogy: 'A Acreditação ONA certifica hospitais em 3 níveis: acreditado, acreditado com excelência, acreditado com excelência plena. Envolve 20 seções e centenas de requisitos.',
    pedagogyRef: 'ONA — Manual de Acreditação Hospitalar (2018)',
  },
  {
    id: 'terapia_nutricional',
    title: 'Protocolo de Nutrição Enteral Precoce',
    description: 'Implementar protocolo ASPEN de nutrição enteral nas primeiras 48h para pacientes da UTI.',
    category: 'Gestão do Cuidado em Enfermagem',
    prestige: 110,
    steps: 1,
    prerequisiteIds: [],
    pedagogy: 'O início precoce da nutrição enteral (dentro de 24-48h da admissão na UTI) reduz complicações infecciosas, tempo de ventilação e mortalidade (ASPEN/ESPEN 2016).',
    pedagogyRef: 'ASPEN — Clinical Guidelines: Nutrition Support Therapy (2016)',
  },
  {
    id: 'quimioterapia_segura',
    title: 'Protocolo de Quimioterapia Segura',
    description: 'Implementar dupla checagem e protocolo de segurança em oncologia.',
    category: 'Segurança do Paciente',
    prestige: 145,
    steps: 1,
    prerequisiteIds: ['resultados_criticos'],
    pedagogy: 'O processo de dupla checagem independente antes da administração de quimioterápicos reduz erros em 80% e é mandatório pelo INCA e ANVISA.',
    pedagogyRef: 'INCA — Manual de Segurança em Quimioterapia (2019)',
  },
  {
    id: 'banco_leite',
    title: 'Reestruturação do Banco de Leite',
    description: 'Adequar o Banco de Leite Humano às normas da ANVISA (RDC 171/2006).',
    category: 'Gestão da Qualidade',
    prestige: 120,
    steps: 1,
    prerequisiteIds: [],
    pedagogy: 'Os Bancos de Leite Humano do Brasil são referência mundial. A RDC 171/2006 normatiza toda a cadeia: coleta, pasteurização, controle microbiológico e distribuição.',
    pedagogyRef: 'ANVISA — RDC 171/2006; MS — Rede BLH-BR',
  },
  {
    id: 'cuidados_paliativos',
    title: 'Equipe de Cuidados Paliativos',
    description: 'Estruturar equipe multiprofissional para cuidados paliativos no HUAP.',
    category: 'Gestão do Cuidado em Enfermagem',
    prestige: 165,
    steps: 1,
    prerequisiteIds: ['quimioterapia_segura'],
    pedagogy: 'Os Cuidados Paliativos visam aliviar sofrimento e melhorar qualidade de vida de pacientes com doenças que ameaçam a vida. Envolvem equipe multiprofissional e família.',
    pedagogyRef: 'OMS (2002) — Palliative Care Definition; CFM Resolução 1.805/2006',
  },
  {
    id: 'humanizacao_parto',
    title: 'Humanização do Parto',
    description: 'Implementar práticas de humanização no pré-parto e parto do HUAP.',
    category: 'Gestão do Cuidado em Enfermagem',
    prestige: 130,
    steps: 1,
    prerequisiteIds: ['banco_leite'],
    pedagogy: 'O Parto Humanizado (HumanizaSUS/PNH) inclui: direito ao acompanhante, posição de escolha, doula, música ambiente, respeito à fisiologia do parto e autonomia da mulher.',
    pedagogyRef: 'Ministério da Saúde — Humanização do Parto e do Nascimento (2014)',
  },
  {
    id: 'coleta_sistematizada',
    title: 'Padronização da Coleta Laboratorial',
    description: 'Treinar equipe de enfermagem em técnicas corretas de coleta e identificação de amostras.',
    category: 'Educação Continuada e Permanente',
    prestige: 95,
    steps: 1,
    prerequisiteIds: ['resultados_criticos'],
    pedagogy: 'A correta identificação do paciente na coleta e o manuseio adequado das amostras são etapas pré-analíticas críticas para confiabilidade dos resultados laboratoriais.',
    pedagogyRef: 'SBPC/ML — Manual de Coleta de Amostras Biológicas (2013)',
  },
  {
    id: 'passagem_plantao',
    title: 'Protocolo de Passagem de Plantão SBAR',
    description: 'Implementar o modelo SBAR (Situação-Background-Avaliação-Recomendação) na passagem de plantão.',
    category: 'Tomada de Decisão',
    prestige: 105,
    steps: 1,
    prerequisiteIds: [],
    pedagogy: 'O SBAR é uma ferramenta padronizada de comunicação estruturada que reduz erros na passagem de plantão, recomendada pela OMS e Joint Commission.',
    pedagogyRef: 'JCAHO (2006) — SBAR Technique for Communication; OMS',
  },
  {
    id: 'pesquisa_indicadores',
    title: 'Pesquisa em Indicadores de Enfermagem',
    description: 'Conduzir pesquisa sobre indicadores de qualidade para apresentação na Semana de Monitoria da UFF.',
    category: 'Indicadores de Saúde: Ferramentas que Subsidiam a Tomada de Decisão',
    prestige: 200,
    steps: 1,
    prerequisiteIds: ['indicadores_qualidade', 'capacitacao_sae'],
    pedagogy: 'A pesquisa em enfermagem fortalece a prática baseada em evidências. Os indicadores NDNQI (Nursing-Sensitive Quality Indicators) são referência internacional.',
    pedagogyRef: 'ANA — NDNQI: Nursing Sensitive Quality Indicators; UFF — Semana de Monitoria',
  },
];
