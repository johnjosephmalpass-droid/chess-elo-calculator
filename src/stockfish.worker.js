// src/stockfish.worker.js

postMessage("info string Worker booted");

try {
  importScripts("https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish-nnue-16.js");
  postMessage("info string Stockfish loaded");
} catch (e) {
  postMessage("info string Failed to load Stockfish");
  onmessage = () => postMessage("bestmove (none)");
}

