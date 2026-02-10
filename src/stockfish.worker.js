// src/stockfish.worker.js

postMessage("info string Worker booted");

const BASE = "https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/";

try {
  // Ensure WASM is fetched from the same CDN folder as the JS.
  self.Module = {
    locateFile: (path) => BASE + path,
  };

  importScripts(BASE + "stockfish-nnue-16.js");
  postMessage("info string Stockfish loaded");
} catch (e) {
  postMessage("info string Failed to load Stockfish");
  onmessage = () => postMessage("bestmove (none)");
}
