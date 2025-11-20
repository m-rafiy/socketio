# 🏁 Real-Time Typing Race

Fun multiplayer typing race built with **Node.js**, **Express**, and **Socket.IO**. Players hop into one of three lobbies, wait for the countdown, and type through a shared passage while watching a live scoreboard and racetrack update in real time.

Repo: https://github.com/m-rafiy/socketio

## Features
- Multi-lobby flow with automatic countdowns and lobby locking once the race starts
- Live racetrack with car icons, progress bars, and a lobby roster so you can see everyone’s progress
- Randomly chosen, lowercase passages (the same for every racer) plus WPM + word counts
- Handles timeouts, disconnects, and duplicate names without crashing the room
- End-of-game UI replaces the typing box with a “Back to lobby” button

## Tech Stack
- **Node.js + Express** serve the static files and host the Socket.IO server
- **Socket.IO** powers all real-time messages
- **Plain HTML/CSS/JS** (client logic now lives in `public/js/race.js`)

## Getting Started
```bash
git clone https://github.com/m-rafiy/socketio.git
cd socketio/server
npm install
npm start
```
Visit http://localhost:3000, enter a username, pick a lobby, and open an extra browser tab to race yourself.

## Deploy Notes
1. In Render/Railway, set the root directory to `./server`
2. Build command: `npm install`
3. Start command: `node server.js` (or add `"start": "node server.js"` to `package.json`)
4. The platform’s `PORT` env var is already respected

## Future Ideas
- Basic auth or simple profiles
- Race history + leaderboards
- ESLint/tests for the server logic
- Move the UI to a small bundler (Vite/React) for easier component work
