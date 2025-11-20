const socket = io();
const params = new URLSearchParams(window.location.search);
const username = params.get("username");
const room = params.get("room");

socket.emit("join room", { username, room });

socket.on("name-taken", () => {
  alert("That username is already racing in this lobby. Pick a different name.");
  window.location = "/";
});

// Countdown events from server
socket.on("lobby countdown", (num) => {
  document.getElementById("timer").textContent = `🏁 Lobby closes in ${num}s`;
});

socket.on("lobby-locked", () => {
  alert("Lobby is closed. Race already started.");
  window.location = "/";
});

// The race begins
socket.on("start game", ({ passage } = {}) => {
  startRace(passage);
});

// ---- Typing game logic ----
const playerList = document.getElementById("player-list");
const textElement = document.getElementById("text");
const input = document.getElementById("input");
const scoreboardEmpty = document.getElementById("scoreboard-empty");
const scoreboardList = document.getElementById("scoreboard-list");
const trackRows = document.getElementById("track-rows");
const raceStatus = document.getElementById("race-status");
const typingMessage = document.getElementById("typing-message");
const homeButton = document.getElementById("home-button");
let currentWordIndex = 0;
let correctWords = 0;
const totalTime = 30;
let timeLeft = totalTime;
let timer = null;
let started = false;
let reportedResult = false;
const playerProgress = {};
const trackMap = new Map();

homeButton.addEventListener("click", () => {
  window.location = "/";
});

const passages = [
  "in a small town surrounded by rolling hills the night shift radio host keeps a sleepy audience awake with stories about lost astronauts curious inventors and brave gardeners who race to save their crops before a storm rolls in",
  "the research vessel drifted across the glowing bay while marine biologists entered data swapped jokes about their favorite coffee and tried to predict which coral reef would reveal the next surprising symbiotic partnership",
  "at sunrise the cycling team rolled onto the highway matching cadence with the metronome ticking in their headsets as the coach shouted split times wind gust warnings and reminders to breathe through every brutal climb"
];
let activePassage = passages[0];
let words = activePassage.split(" ");

function renderText() {
  textElement.innerHTML = words
    .map((w, i) => {
      let cls = "word";
      if (i === currentWordIndex) cls += " current";
      else if (i < currentWordIndex) cls += " correct";
      return `<span class="${cls}">${w}</span>`;
    })
    .join(" ");
}
renderText();

function showTypingMessage(message) {
  typingMessage.textContent = message;
  typingMessage.classList.remove("hidden");
  textElement.classList.add("hidden");
  input.classList.add("hidden");
  homeButton.classList.remove("hidden");
}

function hideTypingMessage() {
  typingMessage.textContent = "";
  typingMessage.classList.add("hidden");
  textElement.classList.remove("hidden");
  input.classList.remove("hidden");
  homeButton.classList.add("hidden");
}

function setPassage(passageText) {
  activePassage = passageText || passages[0];
  words = activePassage.split(" ");
  renderText();
}

function resetTextState(passageText) {
  currentWordIndex = 0;
  correctWords = 0;
  timeLeft = totalTime;
  input.value = "";
  if (passageText) setPassage(passageText);
  else setPassage(activePassage);
}

function startRace(passageText) {
  document.getElementById("timer").textContent = "⏱️ Race started!";
  scoreboardList.innerHTML = "";
  scoreboardEmpty.style.display = "block";
  scoreboardEmpty.textContent = "No finishers yet";
  raceStatus.style.display = "none";
  raceStatus.textContent = "";
  hideTypingMessage();
  resetTextState(passageText);
  input.disabled = false;
  input.focus();
  started = true;
  reportedResult = false;
  sendProgressUpdate(0);
  startTimer();
}

function startTimer() {
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    timeLeft--;
    document.getElementById("timer").textContent = `⏱️ Time: ${timeLeft}s`;

    if (timeLeft <= 0) {
      timeLeft = 0;
      finalizeUI();
      showTypingMessage("⏰ Time is up!");
      reportResult("timed out");
    }
  }, 1000);
}

function finalizeUI() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  started = false;
  input.disabled = true;
}

function reportResult(status) {
  if (reportedResult) return;
  reportedResult = true;
  const elapsed = totalTime - timeLeft;
  const duration = elapsed > 0 ? elapsed : totalTime;
  const wpm = duration > 0 ? Math.round((correctWords / duration) * 60) : 0;

  if (status === "finished") sendProgressUpdate(1, true);
  else sendProgressUpdate();

  socket.emit("player finished", {
    correctWords,
    wpm,
    status,
  });
}

function sendProgressUpdate(value, force = false) {
  if (!force && !started) return;
  const progress = value != null ? value : (words.length ? currentWordIndex / words.length : 0);
  socket.emit("progress update", { progress });
}

input.addEventListener("keydown", (e) => {
  if (!started) return;

  if (e.key === " ") {
    e.preventDefault();
    const typed = input.value.trim();
    const word = words[currentWordIndex];
    const span = textElement.children[currentWordIndex];

    if (typed === word) {
      correctWords++;
      span.classList.remove("current", "incorrect");
      span.classList.add("correct");
      currentWordIndex++;

      if (currentWordIndex < words.length) {
        textElement.children[currentWordIndex].classList.add("current");
      } else {
        finalizeUI();
        reportResult("finished");
      }
      sendProgressUpdate();
      input.value = "";
    } else {
      span.classList.add("incorrect");
    }
  }
});

input.addEventListener("input", () => {
  if (!started) return;
  const typed = input.value.trim();
  const word = words[currentWordIndex];
  const span = textElement.children[currentWordIndex];

  if (word && word.startsWith(typed)) span.classList.remove("incorrect");
  else span.classList.add("incorrect");
});

socket.on("race results", ({ scoreboard = [], final = false, reason = "progress" } = {}) => {
  if (!scoreboard.length) {
    scoreboardEmpty.style.display = "block";
    scoreboardEmpty.textContent = "No finishers yet";
    scoreboardList.innerHTML = "";
    if (reason === "timer") {
      raceStatus.style.display = "block";
      raceStatus.textContent = "Time is up!";
      showTypingMessage("⏰ Time is up!");
    } else if (final) {
      raceStatus.style.display = "block";
      raceStatus.textContent = "Race finished!";
      showTypingMessage("🏁 Game complete!");
    }
    return;
  }

  scoreboardEmpty.style.display = "none";
  scoreboardList.innerHTML = scoreboard
    .map((player, idx) => {
      const placement = `${idx + 1}. ${player.username}`;
      const details = `${player.wpm} WPM • ${player.correctWords} words (${player.status})`;
      return `<li><span>${placement}</span><span>${details}</span></li>`;
    })
    .join("");

  if (reason === "timer") {
    raceStatus.style.display = "block";
    raceStatus.textContent = "Time is up!";
    showTypingMessage("⏰ Time is up!");
  } else if (final || reason === "disconnect") {
    raceStatus.style.display = "block";
    raceStatus.textContent = "You finished! Final results on the right.";
    showTypingMessage("🏁 Game complete!");
  }
});

function renderTrack(players) {
  trackRows.innerHTML = "";
  trackMap.clear();
  if (!players.length) {
    trackRows.innerHTML = '<p class="track-empty">Waiting for racers…</p>';
    return;
  }

  players.forEach((player) => {
    if (playerProgress[player] == null) playerProgress[player] = 0;

    const row = document.createElement("div");
    row.className = "track-row";
    row.dataset.player = player;

    const name = document.createElement("span");
    name.className = "driver-name";
    name.textContent = player;

    const bar = document.createElement("div");
    bar.className = "track-bar";

    const progressEl = document.createElement("div");
    progressEl.className = "track-progress";

    const carEl = document.createElement("div");
    carEl.className = "track-car";
    carEl.textContent = "🚗";

    bar.appendChild(progressEl);
    bar.appendChild(carEl);
    row.appendChild(name);
    row.appendChild(bar);
    trackRows.appendChild(row);

    trackMap.set(player, { progressEl, carEl });
    updateCarPosition(player, playerProgress[player]);
  });
}

function updateCarPosition(player, progress) {
  const entry = trackMap.get(player);
  if (!entry) return;
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  entry.progressEl.style.width = `${pct}%`;
  entry.carEl.style.left = `${pct}%`;
}

socket.on("progress update", ({ username: racer, progress }) => {
  playerProgress[racer] = progress;
  updateCarPosition(racer, progress);
});

socket.on("progress reset", () => {
  Object.keys(playerProgress).forEach((key) => (playerProgress[key] = 0));
  trackMap.forEach((_, player) => updateCarPosition(player, 0));
});

socket.on("player list", (players) => {
  if (!players.length) {
    playerList.innerHTML = "<li>Waiting for players…</li>";
  } else {
    playerList.innerHTML = players
      .map((p, i) => `<li>${i + 1}. ${p}</li>`)
      .join("");
  }

  renderTrack(players);
});
