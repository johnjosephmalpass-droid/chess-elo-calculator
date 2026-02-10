/*
  Stockfish loader worker.
  Tries multiple CDN-hosted browser builds and loads the first available one.
*/
const SOURCES = [
  "https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish-16.1-lite-single.js",
  "https://unpkg.com/stockfish@16.0.0/src/stockfish-16.1-lite-single.js",
  "https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish.js",
  "https://unpkg.com/stockfish@16.0.0/src/stockfish.js",
];

let loaded = false;
for (const src of SOURCES) {
  try {
    importScripts(src);
    loaded = true;
    break;
  } catch {
    // try next source
  }
}

if (!loaded) {
  self.postMessage("info string Failed to load Stockfish script from all configured sources");
  self.onmessage = () => {
    self.postMessage("bestmove (none)");
  };
}
