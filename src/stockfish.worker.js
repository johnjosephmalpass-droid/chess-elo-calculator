// src/stockfish.worker.js

/*
  Stockfish Web Worker loader (Vite classic worker).
  Loads Stockfish 16 from jsDelivr/unpkg using the correct file names.
  IMPORTANT: the engine JS needs its matching .wasm, so we set Module.locateFile.
*/

postMessage("info string Worker booted");

const CANDIDATES = [
  {
    base: "https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/",
    js: "stockfish-nnue-16-single.js",
  },
  {
    base: "https://unpkg.com/stockfish@16.0.0/src/",
    js: "stockfish-nnue-16-single.js",
  },
  // Fallbacks (still valid, but single is usually simplest)
  {
    base: "https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/",
    js: "stockfish-nnue-16-no-Worker.js",
  },
  {
    base: "https://unpkg.com/stockfish@16.0.0/src/",
    js: "stockfish-nnue-16-no-Worker.js",
  },
];

let loaded = false;

for (const c of CANDIDATES) {
  try {
    postMessage(`info string Trying ${c.base}${c.js}`);

    // Make sure the WASM file is fetched from the same folder as the JS file.
    self.Module = {
      locateFile: (path) => c.base + path,
    };

    importScripts(c.base + c.js);

    loaded = true;
    postMessage(`info string Loaded ${c.base}${c.js}`);
    break;
  } catch (e) {
    postMessage(`info string Failed ${c.base}${c.js}`);
  }
}

if (!loaded) {
  postMessage("info string Failed to load Stockfish from all configured sources");
  onmessage = () => postMessage("bestmove (none)");
} else {
  // Some builds expose Stockfish() factory; others self-wire.
  if (typeof self.Stockfish === "function") {
    postMessage("info string Stockfish factory detected; bridging messages");

    const engine = self.Stockfish();

    engine.onmessage = (e) => {
      const data = typeof e === "string" ? e : e?.data;
      if (data != null) postMessage(data);
    };

    onmessage = (e) => {
      engine.postMessage(e.data);
    };
  } else {
    postMessage("info string Stockfish loaded (assumed self-wired)");
  }
}
