// src/stockfish.worker.js

postMessage("info string Worker booted");

try {
  importScripts("https://cdn.jsdelivr.net/npm/stockfish.js@0.10.0/stockfish.js");
  postMessage("info string Stockfish loaded");
} catch (e) {
  postMessage("info string Failed to load Stockfish");
  onmessage = () => postMessage("bestmove (none)");
}
