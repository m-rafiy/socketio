const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);



app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('chat message', (msg) => {
    console.log('message: ' + msg);

    // ✅ Send message back to all clients (including sender)
    io.emit('chat message', msg);
  });

  socket.on('join room', ({ username, room }) => {

    socket.data.username = username;   // store username on this socket
    socket.data.room = room;           // store chosen room
    // 
    io.to(room).emit('system message', `${username} joined ${room}`);

  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

server.listen(3000, () => {
  console.log('✅ server running at http://localhost:3000');
});
