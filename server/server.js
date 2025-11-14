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
const rooms = {};
// rooms[room] = { players: [], lobbyOpen: true, countdown: null, gameStarted: false }

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("join room", ({ username, room }) => {
    socket.join(room);
    socket.data.username = username;
    socket.data.room = room;

    // Create room if needed
    if (!rooms[room]) {
      rooms[room] = {
        players: [],
        lobbyOpen: true,
        countdown: null,
        gameStarted: false,
      };
    }

    const r = rooms[room];

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

          io.to(room).emit("start game");
        }
      }, 1000);
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    const username = socket.data.username;
    const room = socket.data.room;
    console.log(username, "disconnected from", room);

    if (room && rooms[room]) {
      rooms[room].players = rooms[room].players.filter(p => p !== username);
      io.to(room).emit("player list", rooms[room].players);
    }
  });
});

server.listen(3000, () => {
  console.log('Server running → http://localhost:3000');
});
