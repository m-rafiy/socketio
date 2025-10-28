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
io.on('connection', (socket) => {
  console.log('a user connected');

  // When user joins a room
  socket.on('join room', ({ username, room }) => {
    socket.data.username = username;
    socket.data.room = room;
    socket.join(room);

    console.log(`${username} joined ${room}`);
    io.to(room).emit('system message', `${username} joined ${room}`);
  });

  // When user sends a chat message
  socket.on('chat message', (msg) => {
    const username = socket.data.username;
    const room = socket.data.room;

    // Safety check: only proceed if they're in a room
    if (room && username) {
      io.to(room).emit('chat message', { username, text: msg });
    } else {
      console.log('⚠️ message received before joining a room');
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});


server.listen(3000, () => {
  console.log('✅ server running at http://localhost:3000');
});
