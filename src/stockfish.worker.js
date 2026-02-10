// src/stockfish.worker.js
// Loads Stockfish from the stockfish.wasm package (stable file names)
// and forces the wasm file to be fetched from the same CDN folder.

postMessage("info string Worker booted");

const CANDIDATES = [
  "https://cdn.jsdelivr.net/npm/stockfish.wasm@0.10.0/",
  "https://unpkg.com/stockfish.wasm@0.10.0/",
];

let loadedBase = null;

for (const base of CANDIDATES) {
  try {
    // Force wasm to load from the same base folder (prevents /assets/ 404)
    self.Module = {
      locateFile: (path) => base + path,
    };

    importScripts(base + "stockfish.js");
    loadedBase = base;
    postMessage(`info string Stockfish loaded from ${base}`);
    break;
  } catch (e) {
    postMessage(`info string Failed to load from ${base}`);
  }
}

if (!loadedBase) {
  postMessage("info string Failed to load Stockfish from all sources");
  onmessage = () => postMessage("bestmove (none)");
} else {
  // Some builds expose Stockfish() factory; others self-wire.
  if (typeof self.Stockfish === "function") {
    postMessage("info string Stockfish factory detected; bridging");

    const engine = self.Stockfish();

    engine.onmessage = (e) => {
      const msg = typeof e === "string" ? e : e?.data;
      if (msg != null) postMessage(msg);
    };

    onmessage = (e) => {
      engine.postMessage(e.data);
    };
  } else {
    postMessage("info string Stockfish loaded (assumed self-wired)");
  }
}
