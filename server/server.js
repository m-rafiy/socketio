const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

app.get('/race', (req, res) => {
  res.sendFile(join(__dirname, 'public/race.html'));
});

// --------- ROOM STATE ---------
const GAME_DURATION_MS = 30000;
const passages = [
  "in a small town surrounded by rolling hills the night shift radio host keeps a sleepy audience awake with stories about lost astronauts curious inventors and brave gardeners who race to save their crops before a storm rolls in",
  "the research vessel drifted across the glowing bay while marine biologists entered data swapped jokes about their favorite coffee and tried to predict which coral reef would reveal the next surprising symbiotic partnership",
  "at sunrise the cycling team rolled onto the highway matching cadence with the metronome ticking in their headsets as the coach shouted split times wind gust warnings and reminders to breathe through every brutal climb"
];
const rooms = {};
// rooms[room] = {
//   players: [],
//   lobbyOpen: true,
//   countdown: null,
//   gameStarted: false,
//   racers: [],
//   finishTimeout: null,
//   results: {},
//   progress: {},
//   currentPassage: null,
//   wordCount: 0,
// }

function ensureRoom(room) {
  if (!rooms[room]) {
    rooms[room] = {
      players: [],
      lobbyOpen: true,
      countdown: null,
      gameStarted: false,
      racers: [],
      finishTimeout: null,
      results: {},
      progress: {},
      currentPassage: null,
      wordCount: 0,
    };
  }
  return rooms[room];
}

function concludeRace(room, reason = "complete") {
  const r = rooms[room];
  if (!r || !r.gameStarted) return;

  r.gameStarted = false;

  if (r.finishTimeout) {
    clearTimeout(r.finishTimeout);
    r.finishTimeout = null;
  }

  r.racers.forEach((username) => {
    if (!r.results[username]) {
      const fallbackStatus = reason === "timer" ? "timed out" : "disconnected";
      let correctWords = 0;
      let wpm = 0;

      if (reason === "timer") {
        const progress = r.progress[username] ?? 0;
        const totalWords = r.wordCount || (r.currentPassage ? r.currentPassage.split(/\s+/).length : 0);
        correctWords = Math.round(progress * totalWords);
        const seconds = GAME_DURATION_MS / 1000;
        wpm = seconds > 0 ? Math.round((correctWords / seconds) * 60) : 0;
      }

      r.results[username] = {
        username,
        correctWords,
        wpm,
        status: fallbackStatus,
      };
    }
  });

  const isAllFinished = reason === "complete";
  broadcastScoreboard(room, isAllFinished);

  // Reset state for next lobby round
  r.lobbyOpen = true;
  r.countdown = null;
  r.racers = [];
  r.results = {};
  r.progress = {};
  r.currentPassage = null;
  r.wordCount = 0;
}

function checkRaceCompletion(room, reason) {
  const r = rooms[room];
  if (!r || !r.gameStarted) return;
  if (r.racers.length === 0) return;

  if (Object.keys(r.results).length >= r.racers.length) {
    concludeRace(room, reason);
  }
}

function broadcastScoreboard(room, final = false) {
  const r = rooms[room];
  if (!r) return;

  const statusOrder = {
    finished: 0,
    "timed out": 1,
    disconnected: 2,
    racing: 3,
  };

  const scoreboard = r.racers.map((username) => {
    if (r.results[username]) return r.results[username];
    return {
      username,
      correctWords: 0,
      wpm: 0,
      status: "racing",
    };
  }).sort((a, b) => {
    const orderDiff = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
    if (orderDiff !== 0) return orderDiff;
    if (b.wpm !== a.wpm) return b.wpm - a.wpm;
    if (b.correctWords !== a.correctWords) return b.correctWords - a.correctWords;
    return a.username.localeCompare(b.username);
  });

  io.to(room).emit("race results", { scoreboard, final });
}

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("join room", ({ username, room }) => {
    const r = ensureRoom(room);

    if (r.players.includes(username)) {
      socket.emit("name-taken");
      return;
    }

    socket.join(room);
    socket.data.username = username;
    socket.data.room = room;

    // Reject late joiners
    if (!r.lobbyOpen) {
      socket.emit("lobby-locked");
      return;
    }

    // Add player
    r.players.push(username);

    io.to(room).emit("system message", `${username} joined the room`);
    io.to(room).emit("player list", r.players);

    // Start 10 sec countdown if 2 or more players
    if (r.players.length >= 2 && !r.countdown && !r.gameStarted) {
      let counter = 10;

      r.countdown = setInterval(() => {
        io.to(room).emit("lobby countdown", counter);
        counter--;

        if (counter < 0) {
          clearInterval(r.countdown);
          r.countdown = null;
          r.lobbyOpen = false;
          r.gameStarted = true;
          r.racers = [...r.players];
          r.results = {};
          r.progress = {};
          const passage = passages[Math.floor(Math.random() * passages.length)];
          r.currentPassage = passage;
          r.wordCount = passage.trim().split(/\s+/).length;

          io.to(room).emit("start game", { passage });
          io.to(room).emit("progress reset");

          r.finishTimeout = setTimeout(() => {
            concludeRace(room, "timer");
          }, GAME_DURATION_MS);
        }
      }, 1000);
    }
  });

  socket.on("progress update", ({ progress = 0 }) => {
    const { username, room } = socket.data;
    if (!room || !rooms[room] || typeof progress !== "number") return;
    const r = rooms[room];
    if (!r.gameStarted) return;
    const clamped = Math.max(0, Math.min(1, progress));
    r.progress[username] = clamped;
    io.to(room).emit("progress update", { username, progress: clamped });
  });

  socket.on("player finished", ({ correctWords = 0, wpm = 0, status = "finished" }) => {
    const { username, room } = socket.data;
    if (!room || !rooms[room]) return;
    const r = rooms[room];
    if (!r.gameStarted || !r.racers.includes(username)) return;

    if (!r.results[username]) {
      r.results[username] = {
        username,
        correctWords,
        wpm,
        status,
      };
    }

    r.progress[username] = 1;
    io.to(room).emit("progress update", { username, progress: 1 });

    broadcastScoreboard(room);
    checkRaceCompletion(room, "complete");
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    const username = socket.data.username;
    const room = socket.data.room;
    console.log(username, "disconnected from", room);

    if (room && rooms[room]) {
      const r = rooms[room];

      r.players = r.players.filter(p => p !== username);
      io.to(room).emit("player list", r.players);

      if (r.gameStarted && r.racers.includes(username) && !r.results[username]) {
        r.results[username] = {
          username,
          correctWords: 0,
          wpm: 0,
          status: "disconnected",
        };
        broadcastScoreboard(room);
        checkRaceCompletion(room, "disconnect");
      }
    }
  });
});

server.listen(3000, () => {
  console.log('Server running → http://localhost:3000');
});
