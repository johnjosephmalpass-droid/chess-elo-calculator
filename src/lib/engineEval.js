import { Chess } from "chess.js";
import { analyzeFenRaw, initEngine } from "../stockfishEngine.js";

export const MATE_CP = 10000;
const DEFAULT_THINK_TIME_MS = 300;

const evalCache = new Map();
const inFlight = new Map();
let evalQueue = Promise.resolve();

function enqueue(task) {
  const run = evalQueue.then(task, task);
  evalQueue = run.catch(() => undefined);
  return run;
}

export function normalizeMateToCp(mateValue) {
  const sign = Math.sign(mateValue || 1);
  const distance = Math.min(99, Math.abs(Number.isFinite(mateValue) ? mateValue : 0));
  const cp = MATE_CP - 100 * distance;
  return sign >= 0 ? cp : -cp;
}

export function toWhitePerspectiveCp(sideToMoveCp, sideToMove) {
  const safeCp = Number.isFinite(sideToMoveCp) ? sideToMoveCp : 0;
  return sideToMove === "b" ? -safeCp : safeCp;
}

export function toPlayerPerspectiveCp(whiteCp, playerColor) {
  const safeCp = Number.isFinite(whiteCp) ? whiteCp : 0;
  return playerColor === "b" ? -safeCp : safeCp;
}

export function parseUciScore(line = "") {
  const mateMatch = line.match(/\bscore mate\s+(-?\d+)/i);
  if (mateMatch) {
    return { type: "mate", value: Number.parseInt(mateMatch[1], 10) || 0 };
  }

  const cpMatch = line.match(/\bscore cp\s+(-?\d+)/i);
  if (cpMatch) {
    return { type: "cp", value: Number.parseInt(cpMatch[1], 10) || 0 };
  }

  return { type: "cp", value: 0 };
}

function scoreToSideToMoveCp(score) {
  if (score?.type === "mate") {
    return normalizeMateToCp(score.value);
  }
  return Number.isFinite(score?.value) ? score.value : 0;
}

function sideToMoveFromFen(fen) {
  return String(fen || "").split(" ")[1] === "b" ? "b" : "w";
}

function parseMove(chess, move) {
  if (typeof move === "string") {
    if (/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(move)) {
      return chess.move({
        from: move.slice(0, 2),
        to: move.slice(2, 4),
        promotion: move.slice(4, 5) || undefined,
      });
    }
    return chess.move(move);
  }

  if (move && typeof move === "object") {
    return chess.move({ from: move.from, to: move.to, promotion: move.promotion || move.promo || undefined });
  }

  return null;
}

export async function evaluateFenBest(fen, { playerColor = "w", thinkTimeMs = DEFAULT_THINK_TIME_MS } = {}) {
  const fenKey = String(fen);
  const think = Math.max(80, Math.round(thinkTimeMs));
  const cacheKey = `${fenKey}|${playerColor}|${think}`;

  if (evalCache.has(cacheKey)) return evalCache.get(cacheKey);
  if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);

  const pending = enqueue(async () => {
    await initEngine();
    const raw = await analyzeFenRaw(fenKey, { movetimeMs: think });
    const parsed = parseUciScore(raw?.score?.line || "");
    const fallback = raw?.score?.type === "mate"
      ? { type: "mate", value: raw?.score?.value ?? 0 }
      : { type: "cp", value: raw?.score?.value ?? raw?.score?.cp ?? 0 };
    const score = parsed.type === "cp" && parsed.value === 0 && !raw?.score?.line ? fallback : parsed;

    const sideToMove = sideToMoveFromFen(fenKey);
    const sideToMoveCp = scoreToSideToMoveCp(score);
    const whiteCp = toWhitePerspectiveCp(sideToMoveCp, sideToMove);
    const playerCp = toPlayerPerspectiveCp(whiteCp, playerColor);

    const evaluation = { playerCp, whiteCp, sideToMoveCp, fen: fenKey, sideToMove, score };
    evalCache.set(cacheKey, evaluation);
    return evaluation;
  });

  inFlight.set(cacheKey, pending);
  try {
    return await pending;
  } finally {
    inFlight.delete(cacheKey);
  }
}

export function computeMoveLossCp(bestBeforePlayerCp, afterUserPlayerCp) {
  const before = Number.isFinite(bestBeforePlayerCp) ? bestBeforePlayerCp : 0;
  const after = Number.isFinite(afterUserPlayerCp) ? afterUserPlayerCp : 0;
  return Math.max(0, Math.round(before - after));
}

export async function computeUserMoveLoss(fenBefore, move, { playerColor = "w", thinkTimeMs = DEFAULT_THINK_TIME_MS } = {}) {
  const bestBefore = await evaluateFenBest(fenBefore, { playerColor, thinkTimeMs });

  const chess = new Chess(fenBefore);
  const parsedMove = parseMove(chess, move);
  if (!parsedMove) {
    throw new Error(`Could not apply user move at fen: ${fenBefore}`);
  }

  const fenAfter = chess.fen();
  const afterUser = await evaluateFenBest(fenAfter, { playerColor, thinkTimeMs });
  const moveLossCp = computeMoveLossCp(bestBefore.playerCp, afterUser.playerCp);

  return {
    moveLossCp,
    fenBefore,
    fenAfter,
    bestBeforePlayerCp: bestBefore.playerCp,
    afterUserPlayerCp: afterUser.playerCp,
  };
}

export function clearEngineEvalCache() {
  evalCache.clear();
  inFlight.clear();
}
