let worker = null;
let initPromise = null;
let ready = false;
let activeSearch = null;
const pendingLines = [];
const lineWaiters = [];

function failAll(error) {
  if (activeSearch) {
    activeSearch.reject(error);
    activeSearch = null;
  }
  while (lineWaiters.length) {
    lineWaiters.shift().reject(error);
  }
}

function enqueueLine(line) {
  if (!line) return;
  if (lineWaiters.length) {
    const waiter = lineWaiters.shift();
    waiter.resolve(line);
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

function post(cmd) {
  if (!worker) throw new Error("Stockfish worker is not initialized");
  worker.postMessage(cmd);
}

function skillToLevel(skillLevel) {
  return Math.max(0, Math.min(20, Math.round(skillLevel ?? 12)));
}

export async function initEngine() {
  if (ready) return;
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    try {
      worker = new Worker(new URL("./stockfish.worker.js", import.meta.url), { type: "module" });
    } catch (error) {
      reject(new Error(`Failed to create Stockfish worker: ${error?.message || error}`));
      return;
    }

    worker.onmessage = (event) => {
      const line = typeof event.data === "string" ? event.data.trim() : "";
      if (!line) return;
      enqueueLine(line);
      if (activeSearch && line.startsWith("bestmove ")) {
        const bestmove = line.split(/\s+/)[1];
        const current = activeSearch;
        activeSearch = null;
        if (!bestmove || bestmove === "(none)") {
          current.reject(new Error("Stockfish returned no legal bestmove"));
          return;
        }
        current.resolve(bestmove);
      }
    };

    worker.onerror = (error) => {
      const err = new Error(`Stockfish worker error: ${error?.message || "Unknown error"}`);
      failAll(err);
      reject(err);
    };

    (async () => {
      try {
        post("uci");
        await waitForLine((line) => line === "uciok", 10000, "Timed out waiting for uciok");
        post("isready");
        await waitForLine((line) => line === "readyok", 10000, "Timed out waiting for readyok");
        ready = true;
        resolve();
      } catch (error) {
        reject(error);
      }
    })();
  });

  return initPromise;
}

export async function setStrength(options = {}) {
  await initEngine();

  if (Number.isFinite(options.elo)) {
    const elo = Math.max(1350, Math.min(2850, Math.round(options.elo)));
    post("setoption name UCI_LimitStrength value true");
    post(`setoption name UCI_Elo value ${elo}`);
  } else {
    post("setoption name UCI_LimitStrength value false");
    post(`setoption name Skill Level value ${skillToLevel(options.skillLevel)}`);
  }

  post("isready");
  await waitForLine((line) => line === "readyok", 5000, "Timed out while applying Stockfish strength options");
}

export async function getBestMove(fen, thinkMs = 350) {
  await initEngine();

  if (!fen || typeof fen !== "string") {
    throw new Error("A FEN string is required for getBestMove");
  }
  if (activeSearch) {
    throw new Error("Stockfish search already in progress");
  }

  return new Promise((resolve, reject) => {
    activeSearch = { resolve, reject };
    post("ucinewgame");
    post("isready");
    waitForLine((line) => line === "readyok", 5000, "Stockfish did not become ready before search")
      .then(() => {
        post(`position fen ${fen}`);
        post(`go movetime ${Math.max(50, Math.round(thinkMs))}`);
      })
      .catch((error) => {
        if (activeSearch) {
          activeSearch.reject(error);
          activeSearch = null;
        }
      });

    setTimeout(() => {
      if (!activeSearch) return;
      post("stop");
      const timeoutErr = new Error("Stockfish search timed out before bestmove");
      activeSearch.reject(timeoutErr);
      activeSearch = null;
    }, Math.max(thinkMs + 4000, 5000));
  });
}

export async function runSelfTest() {
  await initEngine();

  if (activeSearch) {
    throw new Error("Stockfish is busy running another search");
  }

  return new Promise((resolve, reject) => {
    activeSearch = { resolve, reject };

    post("ucinewgame");
    post("position startpos");
    post("go depth 8");

    setTimeout(() => {
      if (!activeSearch) return;
      post("stop");
      const timeoutErr = new Error("Stockfish self-test timed out waiting for bestmove");
      activeSearch.reject(timeoutErr);
      activeSearch = null;
    }, 12000);
  });
}
