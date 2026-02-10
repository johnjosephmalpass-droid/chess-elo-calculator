// src/stockfishEngine.js

let worker = null;
let initPromise = null;
let ready = false;
let pendingRequest = null;
const requestQueue = [];

const DEFAULT_THINK_MS = 350;
const DEFAULT_STRENGTH = { skillLevel: 12 };

function post(cmd) {
  if (!worker) throw new Error("Stockfish engine is not initialized");
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

  console.log("[SF] initEngine() called");

  initPromise = new Promise((resolve, reject) => {
    try {
      worker = new Worker(new URL("./stockfish.worker.js", import.meta.url), {
        type: "classic", // required for importScripts
      });
      console.log("[SF] Worker created");
    } catch (error) {
      console.error("[SF] Worker failed to create", error);
      reject(error);
      return;
    }

    // Prevent "thinking forever" if engine never becomes ready
    const timeout = setTimeout(() => {
      console.error("[SF] init timeout – no readyok");
      reject(new Error("Stockfish init timed out (no readyok)."));
    }, 6000);

    worker.onmessage = (event) => {
      // Some builds send { data: "..." } inside event.data; we accept both.
      const line =
        typeof event.data === "string"
          ? event.data
          : typeof event.data?.data === "string"
          ? event.data.data
          : "";

      if (!line) return;

      console.log("SF>", line);

      if (line === "uciok") {
        post("isready");
        return;
      }

      if (line === "readyok") {
        clearTimeout(timeout);
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
      console.error("[SF] Worker error", error);
      clearTimeout(timeout);

      if (!ready) reject(error);

      if (pendingRequest) {
        pendingRequest.reject(error);
        pendingRequest = null;
      }

      while (requestQueue.length) requestQueue.shift().reject(error);
    };

    // Kick off UCI handshake
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
