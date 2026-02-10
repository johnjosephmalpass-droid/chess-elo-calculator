// src/stockfish.worker.js

postMessage("info string Worker booted (local stockfish)");

self.Module = {
  locateFile: (path) => "/stockfish/" + path,
};

importScripts("/stockfish/stockfish-nnue-16-single.js");

postMessage("info string Stockfish loaded (local)");
