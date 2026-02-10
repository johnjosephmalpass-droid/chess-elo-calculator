/*
  Vite-friendly Stockfish worker:
  - Loads a browser build from CDN using importScripts (classic worker).
  - Supports both styles:
    (1) script sets up self.onmessage itself
    (2) script exposes global Stockfish() factory -> we bridge messages
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
  } catch (e) {
    // try next
  }
}

if (!loaded) {
  postMessage("info string Failed to load Stockfish script from all configured sources");
  onmessage = () => postMessage("bestmove (none)");
} else {
  // Some builds expose a Stockfish() factory; others self-wire as a worker.
  if (typeof self.Stockfish === "function") {
    const engine = self.Stockfish();

    engine.onmessage = (e) => {
      const data = typeof e === "string" ? e : e?.data;
      if (data != null) postMessage(data);
    };

    onmessage = (e) => {
      engine.postMessage(e.data);
    };

    postMessage("info string Stockfish factory bridged");
  } else {
    // If the imported script already installed onmessage handlers, we just announce success.
    postMessage("info string Stockfish worker loaded");
  }
}
