import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
app.use(express.json());

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
  lastSeen: number;
}

// In-memory store for rooms and players
const rooms: Record<string, Record<string, PlayerData>> = {
  GLOBAL: {}
};

// Registered SSE clients for each room
const sseClients: Record<string, any[]> = {
  GLOBAL: []
};

// Clean up inactive players (offline after 12s) and broadcast updates
function cleanInactivePlayers(roomCode: string) {
  const now = Date.now();
  let updated = false;
  const roomPlayers = rooms[roomCode] || {};
  
  for (const [playerId, player] of Object.entries(roomPlayers)) {
    if (player.online && now - player.lastSeen > 12000) {
      player.online = false;
      updated = true;
    }
  }
  
  if (updated) {
    broadcastRoomUpdate(roomCode);
  }
}

// Check for inactive players every 4 seconds
setInterval(() => {
  for (const roomCode of Object.keys(rooms)) {
    cleanInactivePlayers(roomCode);
  }
}, 4000);

// Helper to broadcast to all SSE clients in a room
function broadcastRoomUpdate(roomCode: string) {
  const roomPlayers = rooms[roomCode] || {};
  const now = Date.now();
  const playersList = Object.values(roomPlayers).map(p => ({
    ...p,
    online: now - p.lastSeen <= 12000
  }));
  
  const payload = JSON.stringify({ players: playersList });
  const clients = sseClients[roomCode] || [];
  
  clients.forEach(res => {
    try {
      res.write(`data: ${payload}\n\n`);
    } catch (e) {
      // client disconnected or closed
    }
  });
}

// API Routes
app.post("/api/rooms/:roomCode/join", (req, res) => {
  const { roomCode } = req.params;
  const { playerName, playerId: reqPlayerId } = req.body;
  
  if (!rooms[roomCode]) {
    rooms[roomCode] = {};
  }
  if (!sseClients[roomCode]) {
    sseClients[roomCode] = [];
  }
  
  const playerId = reqPlayerId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  rooms[roomCode][playerId] = {
    playerId,
    playerName: playerName || `Estudante`,
    online: true,
    currentRoom: "Corredor",
    prestige: 100,
    energy: 100,
    stress: 0,
    level: "Estudante",
    completedMissions: 0,
    lastActivity: "Iniciou o turno",
    shiftTime: 0,
    lastSeen: Date.now()
  };
  
  broadcastRoomUpdate(roomCode);
  res.json({ playerId });
});

app.post("/api/rooms/:roomCode/heartbeat", (req, res) => {
  const { roomCode } = req.params;
  const {
    playerId,
    currentRoom,
    prestige,
    energy,
    stress,
    level,
    completedMissions,
    lastActivity,
    shiftTime
  } = req.body;
  
  if (!playerId) {
    return res.status(400).json({ error: "Missing playerId" });
  }
  
  if (!rooms[roomCode]) {
    rooms[roomCode] = {};
  }
  if (!sseClients[roomCode]) {
    sseClients[roomCode] = [];
  }
  
  const existingPlayer = rooms[roomCode][playerId];
  const playerName = existingPlayer ? existingPlayer.playerName : `Estudante`;
  
  rooms[roomCode][playerId] = {
    playerId,
    playerName,
    online: true,
    currentRoom: currentRoom || "Corredor",
    prestige: prestige !== undefined ? prestige : 100,
    energy: energy !== undefined ? energy : 100,
    stress: stress !== undefined ? stress : 0,
    level: level || "Estudante",
    completedMissions: completedMissions !== undefined ? completedMissions : 0,
    lastActivity: lastActivity || "Ativo",
    shiftTime: shiftTime !== undefined ? shiftTime : 0,
    lastSeen: Date.now()
  };
  
  broadcastRoomUpdate(roomCode);
  res.json({ status: "ok" });
});

app.get("/api/rooms/:roomCode/players", (req, res) => {
  const { roomCode } = req.params;
  const roomPlayers = rooms[roomCode] || {};
  const now = Date.now();
  
  const playersList = Object.values(roomPlayers).map(p => ({
    ...p,
    online: now - p.lastSeen <= 12000
  }));
  
  res.json({ players: playersList });
});

app.get("/api/rooms/:roomCode/stream", (req, res) => {
  const { roomCode } = req.params;
  
  if (!rooms[roomCode]) {
    rooms[roomCode] = {};
  }
  if (!sseClients[roomCode]) {
    sseClients[roomCode] = [];
  }
  
  // Set headers for Server-Sent Events
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  });
  
  // Send initial players list
  const roomPlayers = rooms[roomCode] || {};
  const playersList = Object.values(roomPlayers).map(p => ({
    ...p,
    online: Date.now() - p.lastSeen <= 12000
  }));
  res.write(`data: ${JSON.stringify({ players: playersList })}\n\n`);
  
  // Register SSE client
  sseClients[roomCode].push(res);
  
  // Remove client on close
  req.on("close", () => {
    sseClients[roomCode] = sseClients[roomCode].filter(client => client !== res);
  });
});

async function startServer() {
  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
