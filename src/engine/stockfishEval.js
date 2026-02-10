import { Chess } from "chess.js";
import { analyzeFenRaw } from "../stockfishEngine.js";

const MATE_CP_BASE = 10000;

function sideToMoveFromFen(fen) {
  return fen.split(" ")[1] || "w";
}

function mateToCp(mateIn) {
  const sign = Math.sign(mateIn || 1);
  const distance = Math.min(99, Math.abs(mateIn));
  return sign > 0 ? MATE_CP_BASE - 100 * distance : -MATE_CP_BASE + 100 * distance;
}

function scoreToCp(score) {
  if (score?.type === "mate" && Number.isFinite(score?.value)) {
    return mateToCp(score.value);
  }
  return Number.isFinite(score?.cp) ? score.cp : 0;
}

function cpToUserPerspective(cpFromSideToMove, fen, userColor = "w") {
  const sideToMove = sideToMoveFromFen(fen);
  return sideToMove === userColor ? cpFromSideToMove : -cpFromSideToMove;
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

function normalizeResult(rawResult, fen, userColor) {
  const rawCp = scoreToCp(rawResult?.score);
  const userScoreCp = cpToUserPerspective(rawCp, fen, userColor);

  return {
    userScoreCp,
    raw: rawResult?.score || { type: "cp", value: 0, cp: 0, depth: 0 },
    fenUsed: rawResult?.fenUsed || fen,
    depthSeen: Number.isFinite(rawResult?.score?.depth) ? rawResult.score.depth : 0,
  };
}

export async function evaluateFen(fen, { movetimeMs = 100, userColor = "w" } = {}) {
  const rawResult = await analyzeFenRaw(fen, { movetimeMs });
  return normalizeResult(rawResult, fen, userColor);
}

export async function bestEvalAtFen(fen, { movetimeMs = 100, userColor = "w" } = {}) {
  const rawResult = await analyzeFenRaw(fen, { movetimeMs });
  return normalizeResult(rawResult, fen, userColor);
}

export async function computeMoveLoss({
  fenBefore,
  userMoveUciOrSan,
  userColor = "w",
  movetimeMsEval = 100,
}) {
  const bestEvalBeforeUser = await bestEvalAtFen(fenBefore, { movetimeMs: movetimeMsEval, userColor });

  const chess = new Chess(fenBefore);
  let parsedMove = null;

  if (typeof userMoveUciOrSan === "string") {
    if (/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(userMoveUciOrSan)) {
      parsedMove = chess.move({
        from: userMoveUciOrSan.slice(0, 2),
        to: userMoveUciOrSan.slice(2, 4),
        promotion: userMoveUciOrSan.length > 4 ? userMoveUciOrSan[4].toLowerCase() : undefined,
      });
    }
    if (!parsedMove) {
      parsedMove = chess.move(userMoveUciOrSan);
    }
  } else if (userMoveUciOrSan && typeof userMoveUciOrSan === "object") {
    parsedMove = chess.move({
      from: userMoveUciOrSan.from,
      to: userMoveUciOrSan.to,
      promotion: userMoveUciOrSan.promo || userMoveUciOrSan.promotion || undefined,
    });
  }

  if (!parsedMove) {
    throw new Error(`Could not apply user move at fen: ${fenBefore}`);
  }

  const fenAfter = chess.fen();
  const evalAfterUser = await evaluateFen(fenAfter, { movetimeMs: movetimeMsEval, userColor });

  const moveLossCp = Math.max(0, Math.round(bestEvalBeforeUser.userScoreCp - evalAfterUser.userScoreCp));
  const mateAgainstUser = evalAfterUser.userScoreCp <= -9600;
  const gradeLabel = mateAgainstUser ? "HORRENDOUS" : gradeFromMoveLoss(moveLossCp);

  return {
    moveLossCp,
    bestEvalBeforeUser,
    evalAfterUser,
    gradeLabel,
  };
}
