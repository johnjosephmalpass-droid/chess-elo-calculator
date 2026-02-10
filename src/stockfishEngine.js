const DEFAULT_MOVE_TIME_MS = 250;
const HARD_SEARCH_TIMEOUT_MS = 2000;
const MATE_CP_BASE = 10000;

let worker = null;
let initPromise = null;
let ready = false;
let pendingLines = [];
let lineWaiters = [];
let queue = Promise.resolve();

let messageHandler = null;
let errorHandler = null;

function resetLineState() {
  pendingLines = [];
  while (lineWaiters.length) {
    const waiter = lineWaiters.shift();
    waiter.reject(new Error("Stockfish worker reset"));
  }
}

function enqueueLine(line) {
  if (!line) return;
  if (lineWaiters.length) {
    lineWaiters.shift().resolve(line);
    return;
  }
  pendingLines.push(line);
}

function waitForLine(predicate, timeoutMs, timeoutLabel) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(timeoutLabel));
    }, timeoutMs);

    const consume = (line) => {
      try {
        if (!predicate(line)) {
          lineWaiters.unshift({ resolve: consume, reject });
          return;
        }
        clearTimeout(timeout);
        resolve(line);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    };

    while (pendingLines.length) {
      const line = pendingLines.shift();
      if (predicate(line)) {
        clearTimeout(timeout);
        resolve(line);
        return;
      }
    }

    lineWaiters.push({ resolve: consume, reject });
  });
}

function waitForNextLine(timeoutMs, timeoutLabel) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(timeoutLabel));
    }, timeoutMs);

    if (pendingLines.length) {
      const line = pendingLines.shift();
      clearTimeout(timeout);
      resolve(line);
      return;
    }

    lineWaiters.push({
      resolve: (line) => {
        clearTimeout(timeout);
        resolve(line);
      },
      reject: (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    });
  });
}

function post(cmd) {
  if (!worker) throw new Error("Stockfish worker is not initialized");
  worker.postMessage(cmd);
}

function withQueue(task) {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

function cleanupWorker() {
  if (!worker) return;
  if (messageHandler) worker.removeEventListener("message", messageHandler);
  if (errorHandler) worker.removeEventListener("error", errorHandler);
  worker.terminate();
  worker = null;
  messageHandler = null;
  errorHandler = null;
}

async function restartEngine(reason) {
  console.warn(`[stockfish] timeout restart: ${reason}`);
  cleanupWorker();
  ready = false;
  initPromise = null;
  resetLineState();
  await initEngine();
}

async function syncReady() {
  console.log("[stockfish] search stop/isready sync start");
  post("stop");
  post("isready");
  await waitForLine((line) => line === "readyok", 5000, "Timed out waiting for readyok before search");
  console.log("[stockfish] search stop/isready sync ready");
}

function skillToLevel(skillLevel) {
  return Math.max(0, Math.min(20, Math.round(skillLevel ?? 12)));
}

function parseInfoScore(line) {
  if (!line.startsWith("info ")) return null;

  const mateMatch = line.match(/\bscore mate\s+(-?\d+)/);
  if (mateMatch) {
    const mateDistance = Number.parseInt(mateMatch[1], 10);
    const sign = Math.sign(mateDistance || 1);
    const cp = sign * (MATE_CP_BASE - Math.min(99, Math.abs(mateDistance)) * 100);
    return { type: "mate", value: mateDistance, cp };
  }

  const cpMatch = line.match(/\bscore cp\s+(-?\d+)/);
  if (!cpMatch) return null;
  const cp = Number.parseInt(cpMatch[1], 10);
  return { type: "cp", value: cp, cp };
}

export async function initEngine() {
  if (ready) return;
  if (initPromise) return initPromise;

  console.log("[stockfish] init start");

  initPromise = new Promise((resolve, reject) => {
    try {
      worker = new Worker("/stockfish/stockfish.worker.js");
    } catch (error) {
      reject(new Error(`Failed to create Stockfish worker: ${error?.message || error}`));
      return;
    }

    messageHandler = (event) => {
      const line = typeof event.data === "string" ? event.data.trim() : "";
      if (!line) return;
      enqueueLine(line);
    };

    errorHandler = (error) => {
      const err = new Error(`Stockfish worker error: ${error?.message || "Unknown error"}`);
      resetLineState();
      reject(err);
    };

    worker.addEventListener("message", messageHandler);
    worker.addEventListener("error", errorHandler);

    (async () => {
      try {
        post("uci");
        await waitForLine((line) => line === "uciok", 10000, "Timed out waiting for uciok");
        post("isready");
        await waitForLine((line) => line === "readyok", 10000, "Timed out waiting for readyok");
        ready = true;
        console.log("[stockfish] init ready");
        resolve();
      } catch (error) {
        cleanupWorker();
        ready = false;
        initPromise = null;
        resetLineState();
        reject(error);
      }
    })();
  });

  return initPromise;
}

export async function setStrength(options = {}) {
  return withQueue(async () => {
    await initEngine();

    if (Number.isFinite(options.elo)) {
      const elo = Math.max(600, Math.min(2600, Math.round(options.elo)));
      post("setoption name UCI_LimitStrength value true");
      post(`setoption name UCI_Elo value ${elo}`);
    } else {
      post("setoption name UCI_LimitStrength value false");
      post(`setoption name Skill Level value ${skillToLevel(options.skillLevel)}`);
    }

    post("isready");
    await waitForLine((line) => line === "readyok", 5000, "Timed out while applying Stockfish strength options");
  });
}

async function searchBestMoveOnce(fen, thinkMs) {
  await initEngine();
  await syncReady();

  const moveTime = Math.max(50, Math.round(thinkMs ?? DEFAULT_MOVE_TIME_MS));
  console.log(`[stockfish] search start movetime=${moveTime}`);

  post(`position fen ${fen}`);
  post(`go movetime ${moveTime}`);

  const bestmoveLine = await waitForLine(
    (line) => line.startsWith("bestmove "),
    HARD_SEARCH_TIMEOUT_MS,
    `Stockfish bestmove timeout after ${HARD_SEARCH_TIMEOUT_MS}ms`,
  );

  const bestmove = bestmoveLine.split(/\s+/)[1];
  if (!bestmove || bestmove === "(none)") {
    throw new Error("Stockfish returned no legal bestmove");
  }

  console.log(`[stockfish] bestmove received ${bestmove}`);
  return bestmove;
}

async function searchEvaluationOnce(fen, thinkMs) {
  await initEngine();
  await syncReady();

  const moveTime = Math.max(50, Math.round(thinkMs ?? DEFAULT_MOVE_TIME_MS));
  post(`position fen ${fen}`);
  post(`go movetime ${moveTime}`);

  let latestScore = null;

  while (true) {
    const line = await waitForNextLine(
      HARD_SEARCH_TIMEOUT_MS,
      `Stockfish evaluation timeout after ${HARD_SEARCH_TIMEOUT_MS}ms`,
    );

    const parsed = parseInfoScore(line);
    if (parsed) {
      latestScore = parsed;
    }

    if (line.startsWith("bestmove ")) {
      break;
    }
  }

  if (!latestScore) {
    return { type: "cp", value: 0, cp: 0 };
  }

  return latestScore;
}

export async function getBestMove(fen, thinkMs = DEFAULT_MOVE_TIME_MS) {
  if (!fen || typeof fen !== "string") {
    throw new Error("A FEN string is required for getBestMove");
  }

  return withQueue(async () => {
    try {
      return await searchBestMoveOnce(fen, thinkMs);
    } catch (error) {
      const isTimeout = /timeout/i.test(error?.message || "");
      if (!isTimeout) throw error;

      await restartEngine(error.message);
      return searchBestMoveOnce(fen, thinkMs);
    }
  });
}

export async function evaluatePosition(fen, thinkMs = 100) {
  if (!fen || typeof fen !== "string") {
    throw new Error("A FEN string is required for evaluatePosition");
  }

  return withQueue(async () => {
    try {
      return await searchEvaluationOnce(fen, thinkMs);
    } catch (error) {
      const isTimeout = /timeout/i.test(error?.message || "");
      if (!isTimeout) throw error;

      await restartEngine(error.message);
      return searchEvaluationOnce(fen, thinkMs);
    }
  });
}

export async function runSelfTest() {
  const startFen = "rn1qkbnr/pppb1ppp/3pp3/8/3PP3/2N2N2/PPP2PPP/R1BQKB1R w KQkq - 0 5";
  return getBestMove(startFen, DEFAULT_MOVE_TIME_MS);
}
