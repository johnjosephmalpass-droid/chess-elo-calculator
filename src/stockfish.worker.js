// src/stockfish.worker.js
postMessage("info string Worker booted");

const BASES = [
  "https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/",
  "https://unpkg.com/stockfish@16.0.0/src/",
];

let loaded = false;

for (const BASE of BASES) {
  try {
    // Force WASM to load from the same CDN folder (prevents /assets/ 404)
    self.Module = {
      locateFile: (path) => BASE + path,
    };

    importScripts(BASE + "stockfish-nnue-16-single.js");
    postMessage(`info string Stockfish loaded (single) from ${BASE}`);
    loaded = true;
    break;
  } catch (e) {
    // try next
  }
}

if (!loaded) {
  postMessage("info string Failed to load Stockfish single build from all sources");
  onmessage = () => postMessage("bestmove (none)");
}
