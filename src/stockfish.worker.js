// src/stockfish.worker.js
// Uses a non-threaded Stockfish build (no SharedArrayBuffer requirement)

postMessage("info string Worker booted");

try {
  // This build runs without SharedArrayBuffer (single-thread)
  importScripts("https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish-nnue-16-single.js");
  postMessage("info string Stockfish loaded (single)");
} catch (e) {
  postMessage("info string Failed to load Stockfish single build");
  onmessage = () => postMessage("bestmove (none)");
}

