import { Chess } from "chess.js";
import { analyzeFenRaw } from "../stockfishEngine.js";

const MATE_CP_BASE = 10000;
const fenEvalCache = new Map();

function clampMateDistance(distance) {
  return Math.min(99, Math.abs(distance));
}

function sideToMoveFromFen(fen) {
  return String(fen || "").split(" ")[1] === "b" ? "b" : "w";
}

export function parseStockfishScore(line) {
  if (typeof line !== "string") return { type: "cp", value: 0 };

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

export function scoreToCp(score, { sideToMove }) {
  const normalized = score?.type === "mate" ? score : { type: "cp", value: score?.value ?? 0 };

  let sideToMoveCp = 0;
  if (normalized.type === "mate") {
    const mateIn = Number.isFinite(normalized.value) ? normalized.value : 0;
    const sign = Math.sign(mateIn || 1);
    const distance = clampMateDistance(mateIn);
    sideToMoveCp = sign > 0 ? MATE_CP_BASE - 100 * distance : -MATE_CP_BASE + 100 * distance;
  } else {
    sideToMoveCp = Number.isFinite(normalized.value) ? normalized.value : 0;
  }

  return sideToMove === "w" ? sideToMoveCp : -sideToMoveCp;
}

export function whiteCpToPlayerCp(whiteCp, playerColor) {
  const safeWhiteCp = Number.isFinite(whiteCp) ? whiteCp : 0;
  return playerColor === "b" ? -safeWhiteCp : safeWhiteCp;
}

function gradeFromMoveLoss(moveLossCp) {
  if (moveLossCp <= 10) return "AMAZING";
  if (moveLossCp <= 25) return "BRILLIANT";
  if (moveLossCp <= 60) return "GOOD";
  if (moveLossCp <= 120) return "MEH";
  if (moveLossCp <= 200) return "BAD";
  if (moveLossCp <= 350) return "AWFUL";
  return "HORRENDOUS";
}

export async function evaluateFenForPlayer(fen, playerColor = "w", movetimeMs = 100) {
  const fenUsed = String(fen);
  const cacheKey = `${fenUsed}::${playerColor}`;

  if (fenEvalCache.has(cacheKey)) {
    return fenEvalCache.get(cacheKey);
  }

  const raw = await analyzeFenRaw(fenUsed, { movetimeMs });
  const sideToMove = sideToMoveFromFen(fenUsed);
  const parsedScore = parseStockfishScore(raw?.score?.line || "");
  const fallbackScore = raw?.score?.type === "mate"
    ? { type: "mate", value: raw.score.value }
    : { type: "cp", value: raw?.score?.value ?? raw?.score?.cp ?? 0 };
  const score = parsedScore.type === "cp" && parsedScore.value === 0 && !raw?.score?.line ? fallbackScore : parsedScore;

  const whiteCp = scoreToCp(score, { sideToMove });
  const playerCp = whiteCpToPlayerCp(whiteCp, playerColor);

  const result = {
    playerCp,
    raw: score,
    fenUsed,
  };

  fenEvalCache.set(cacheKey, result);
  return result;
}

function parseMoveForChess(chess, move) {
  if (typeof move === "string") {
    if (/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(move)) {
      return chess.move({
        from: move.slice(0, 2),
        to: move.slice(2, 4),
        promotion: move.length > 4 ? move[4].toLowerCase() : undefined,
      });
    }
    return chess.move(move);
  }

  if (move && typeof move === "object") {
    return chess.move({
      from: move.from,
      to: move.to,
      promotion: move.promo || move.promotion || undefined,
    });
  }

  return null;
}

export async function computeMoveLossVsBest(fenBefore, move, playerColor, movetimeMs = 100) {
  const bestBefore = await evaluateFenForPlayer(fenBefore, playerColor, movetimeMs);

  const chess = new Chess(fenBefore);
  const parsedMove = parseMoveForChess(chess, move);
  if (!parsedMove) {
    throw new Error(`Could not apply user move at fen: ${fenBefore}`);
  }

  const fenAfter = chess.fen();
  const after = await evaluateFenForPlayer(fenAfter, playerColor, movetimeMs);

  const moveLossCp = Math.max(0, Math.round(bestBefore.playerCp - after.playerCp));

  return {
    moveLossCp,
    bestBeforeCp: bestBefore.playerCp,
    afterCp: after.playerCp,
    grade: gradeFromMoveLoss(moveLossCp),
  };
}

export function clearEvalCache() {
  fenEvalCache.clear();
}
