# 🏁 Real-Time Typing Race

A multiplayer typing race that showcases real-time collaboration with **Socket.IO**. Players pick a lobby, see a live racetrack with animated cars, and compete on synchronized passages. The layout includes a fixed scoreboard, lobby roster, countdowns, and per-player progress updates so everyone can watch the action unfold.

https://github.com/mobeen4ked/rt-chat

## ✨ Highlights
- Multi-lobby support with automatic countdowns and lobby locking
- Live racetrack UI (cars + progress bars), lobby roster, and scoreboard sidebar
- Randomized story passages (same for every racer) with WPM + word accuracy tracking
- Handles timeouts, disconnects, duplicate names, and late joins gracefully
- Production-friendly structure: server static hosting plus modular client script

## 🧱 Tech Stack
- **Node.js + Express** – HTTP server and static file hosting
- **Socket.IO** – real-time race coordination
- **Vanilla HTML/CSS/JS** – responsive UI, animation, and state handling
- **PM2 / Render / Railway (optional)** – easy deployment targets

## 🚀 Getting Started
```bash
git clone https://github.com/mobeen4ked/rt-chat.git
cd rt-chat/server
npm install
npm start        # runs on http://localhost:3000
```

- Visit `http://localhost:3000`, enter a name, pick `Lobby 1/2/3`, and open multiple tabs to simulate racers.
- Lobby countdown starts when 2+ players join. Race auto-locks and everybody types the same passage.
- When time expires or all racers finish, the typing box is replaced by a status card + “Back to lobby” button.

## 📦 Deploying (Render/Railway/etc.)
1. Point the service root to the `server` directory (Render → Settings → Build & Deploy → Root Directory → `./server`).
2. Build command: `npm install` (default).  
   Start command: `node server.js` or add `"start": "node server.js"` to `package.json`.
3. Optionally set `PORT` env var; Express already respects `process.env.PORT || 3000`.
4. Serve behind HTTPS with the platform’s built-in TLS and you’re live.

## 🧭 Roadmap Ideas
- Persist race history + leaderboards
- Add authentication and avatar support
- Switch to a UI framework (React/Vite) for larger feature sets
- Integrate ESLint/Prettier + tests for server logic

This project complements my MERN/Auth0 flashcards app by highlighting real-time systems, UI polish, and multiplayer state management. Feel free to clone, race, and extend! 🎉
