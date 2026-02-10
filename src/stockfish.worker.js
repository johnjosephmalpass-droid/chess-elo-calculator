// src/stockfish.worker.js

/*
  Vite-friendly Stockfish worker:
  - Runs as a classic Worker so we can use importScripts().
  - Tries multiple CDN-hosted browser builds and loads the first available.
  - Supports both styles:
    (1) script self-wires as a worker (sets onmessage itself)
    (2) script exposes global Stockfish() factory -> we bridge messages
*/

postMessage("info string Worker booted");

const SOURCES = [
  "https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish-16.1-lite-single.js",
  "https://unpkg.com/stockfish@16.0.0/src/stockfish-16.1-lite-single.js",
  "https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish.js",
  "https://unpkg.com/stockfish@16.0.0/src/stockfish.js",
];

let loaded = false;

for (const src of SOURCES) {
  try {
    postMessage(`info string Trying ${src}`);
    importScripts(src);
    loaded = true;
    postMessage(`info string Loaded ${src}`);
    break;
  } catch (e) {
    postMessage(`info string Failed ${src}`);
  }
}

if (!loaded) {
  postMessage("info string Failed to load Stockfish script from all configured sources");
  onmessage = () => postMessage("bestmove (none)");
} else {
  // If the imported script exposes Stockfish() factory, bridge it.
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
    // Otherwise assume the script self-wired as a worker already.
    postMessage("info string Stockfish worker script loaded (self-wired)");
  }
}

