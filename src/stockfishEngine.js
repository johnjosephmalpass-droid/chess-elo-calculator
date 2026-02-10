let worker = null;
let initPromise = null;
let ready = false;
let pendingRequest = null;
const requestQueue = [];

const DEFAULT_THINK_MS = 350;
const DEFAULT_STRENGTH = { skillLevel: 12 };

function post(cmd) {
  if (!worker) {
    throw new Error("Stockfish engine is not initialized");
  }
  worker.postMessage(cmd);
}

function applyStrength(options = {}) {
  if (!worker || !ready) return;

  const hasElo = Number.isFinite(options.elo);
  if (hasElo) {
    const elo = Math.max(1350, Math.min(2850, Math.round(options.elo)));
    post("setoption name UCI_LimitStrength value true");
    post(`setoption name UCI_Elo value ${elo}`);
    return;
  }

  const skillLevel = Math.max(0, Math.min(20, Math.round(options.skillLevel ?? DEFAULT_STRENGTH.skillLevel)));
  post("setoption name UCI_LimitStrength value false");
  post(`setoption name Skill Level value ${skillLevel}`);
}

function flushQueue() {
  if (!ready || pendingRequest || requestQueue.length === 0) return;

  pendingRequest = requestQueue.shift();
  post("ucinewgame");
  post(`position fen ${pendingRequest.fen}`);
  post(`go movetime ${pendingRequest.thinkMs}`);
}

export function initEngine() {
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    try {
      worker = new Worker("/stockfish/stockfish.js");
    } catch (error) {
      reject(error);
      return;
    }

    worker.onmessage = (event) => {
      const line = typeof event.data === "string" ? event.data : "";
      if (!line) return;

      if (line === "uciok") {
        post("isready");
        return;
      }

      if (line === "readyok") {
        ready = true;
        applyStrength(DEFAULT_STRENGTH);
        resolve();
        flushQueue();
        return;
      }

      if (line.startsWith("bestmove ") && pendingRequest) {
        const bestmove = line.split(" ")[1];
        const request = pendingRequest;
        pendingRequest = null;

        if (!bestmove || bestmove === "(none)") {
          request.reject(new Error("Stockfish did not return a legal move"));
        } else {
          request.resolve(bestmove);
        }
        flushQueue();
      }
    };

    worker.onerror = (error) => {
      if (!ready) {
        reject(error);
      }
      if (pendingRequest) {
        pendingRequest.reject(error);
        pendingRequest = null;
      }
      while (requestQueue.length) {
        requestQueue.shift().reject(error);
      }
    };

    post("uci");
  });

  return initPromise;
}

export function getBestMove(fen, thinkMs = DEFAULT_THINK_MS) {
  return initEngine().then(
    () =>
      new Promise((resolve, reject) => {
        requestQueue.push({
          fen,
          thinkMs: Math.max(50, Math.round(thinkMs)),
          resolve,
          reject,
        });
        flushQueue();
      }),
  );
}

export function setStrength(options = {}) {
  initEngine().then(() => applyStrength(options));
}
