import fs from "node:fs";
import path from "node:path";

const required = [
  "dist/stockfish/stockfish-nnue-16-single.js",
  "dist/stockfish/stockfish-nnue-16-single.wasm",
];

const missing = required.filter((asset) => !fs.existsSync(path.resolve(asset)));

if (missing.length) {
  console.error("Missing required Stockfish build assets:");
  for (const asset of missing) {
    console.error(`- ${asset}`);
  }
  process.exit(1);
}

console.log("Stockfish build assets verified.");
