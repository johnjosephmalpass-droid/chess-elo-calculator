self.Module = {
  locateFile: (path) => "/stockfish/" + path,
};

importScripts("/stockfish/stockfish-nnue-16-single.js");

const engineFactory = self.Stockfish;
if (typeof engineFactory !== "function") {
  throw new Error("Stockfish engine factory was not found in /stockfish/stockfish-nnue-16-single.js");
}

const engine = engineFactory();
const enginePost = (cmd) => engine.postMessage(cmd);

const emitLine = (line) => {
  if (typeof line === "string") {
    self.postMessage(line);
  }
};

if (typeof engine.addMessageListener === "function") {
  engine.addMessageListener(emitLine);
} else {
  engine.onmessage = (line) => emitLine(typeof line === "string" ? line : line?.data);
}

self.onmessage = (e) => {
  if (typeof e.data !== "string") return;
  enginePost(e.data);
};
