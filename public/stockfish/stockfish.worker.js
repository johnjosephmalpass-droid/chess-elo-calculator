self.Module = {
  locateFile: (path) => "/stockfish/" + path,
};

const emitLine = (line) => {
  if (typeof line === "string") {
    self.postMessage(line);
  }
};

const isFunction = (value) => typeof value === "function";
const asLine = (message) => (typeof message === "string" ? message : message?.data);

const wireFactoryEngine = (engine) => {
  if (!engine) return;

  const enginePost =
    isFunction(engine.postMessage) ? (cmd) => engine.postMessage(cmd) : null;

  if (isFunction(engine.addMessageListener)) {
    engine.addMessageListener(emitLine);
  } else {
    engine.onmessage = (message) => emitLine(asLine(message));
  }

  if (enginePost) {
    self.onmessage = (event) => {
      if (typeof event?.data !== "string") return;
      enginePost(event.data);
    };
  }
};

importScripts("/stockfish/stockfish-nnue-16-single.js");

const engineFactoryCandidates = [
  self.Stockfish,
  self.createStockfish,
  self.stockfish,
];

const engineFactory = engineFactoryCandidates.find(isFunction);

if (engineFactory) {
  const engineOrPromise = engineFactory();

  if (engineOrPromise && isFunction(engineOrPromise.then)) {
    engineOrPromise.then(wireFactoryEngine);
  } else {
    wireFactoryEngine(engineOrPromise);
  }
}

// If no factory is exposed, keep the worker handlers registered by the imported script.
