// src/stockfish.worker.js

postMessage("info string Worker booted");

try {
  importScripts(
    "https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish-16.1-lite-single.js"
  );
  postMessage("info string Stockfish loaded");
} catch (e) {
  postMessage("info string Failed to load Stockfish");
  onmessage = () => postMessage("bestmove (none)");
}
