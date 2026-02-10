import React, { useEffect, useMemo, useState } from "react";
import CoachFeedback from "./CoachFeedback";
import { evaluatePosition, getBestMoveStyled, initEngine, runSelfTest, setStrength } from "./stockfishEngine.js";
import {
  chooseBotElo,
  getConfidenceLabel,
  getInitialRatingState,
  mapMovetimeFromElo,
  updatePlayerElo,
} from "./ratingSystem.js";
import { Chess } from "chess.js";


/**
 * Chess Elo Calculator (polished + castling + flipped board)
 * - In-browser Stockfish bot via Web Worker
 * - Tracks per-move centipawn loss
 * - Estimates fun Elo + stores last 5 games
 * - Adds castling + rotates board so YOU are always at the bottom
 */

const FILES = "abcdefgh";
const RANKS = "12345678";

function sqToIdx(sq) {
  const f = FILES.indexOf(sq[0]);
  const r = RANKS.indexOf(sq[1]);
  return { f, r };
}
function idxToSq(f, r) {
  return `${FILES[f]}${RANKS[r]}`;
}
function inBounds(f, r) {
  return f >= 0 && f < 8 && r >= 0 && r < 8;
}
function opposite(c) {
  return c === "w" ? "b" : "w";
}
function colorToMoveName(c) {
  return c === "w" ? "White" : "Black";
}
function cloneBoard(b) {
  return b.map((row) => row.slice());
}

function makeStartBoard() {
  // 8x8, rank1 at r=0, rank8 at r=7
  const b = Array.from({ length: 8 }, () => Array(8).fill(null));
  const back = ["r", "n", "b", "q", "k", "b", "n", "r"];
  for (let f = 0; f < 8; f++) {
    b[1][f] = { c: "w", p: "p" };
    b[6][f] = { c: "b", p: "p" };
    b[0][f] = { c: "w", p: back[f] };
    b[7][f] = { c: "b", p: back[f] };
  }
  return b;
}

function pieceChar(piece) {
  if (!piece) return "";
  const { c, p } = piece;
  const mapB = { p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚" };
  const mapW = { p: "♙", r: "♖", n: "♘", b: "♗", q: "♕", k: "♔" };
  return c === "w" ? mapW[p] : mapB[p];
}

function kingPos(board, c) {
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const pc = board[r][f];
      if (pc && pc.c === c && pc.p === "k") return { f, r };
    }
  }
  return null;
}

function isAttacked(board, targetF, targetR, byColor) {
  // pawns
  const dir = byColor === "w" ? 1 : -1;
  for (const df of [-1, 1]) {
    const f = targetF - df;
    const r = targetR - dir;
    if (inBounds(f, r)) {
      const pc = board[r][f];
      if (pc && pc.c === byColor && pc.p === "p") return true;
    }
  }

  // knights
  const knightSteps = [
    [1, 2],
    [2, 1],
    [-1, 2],
    [-2, 1],
    [1, -2],
    [2, -1],
    [-1, -2],
    [-2, -1],
  ];
  for (const [df, dr] of knightSteps) {
    const f = targetF + df;
    const r = targetR + dr;
    if (inBounds(f, r)) {
      const pc = board[r][f];
      if (pc && pc.c === byColor && pc.p === "n") return true;
    }
  }

  // sliders
  const dirsB = [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  const dirsR = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  // bishops/queens
  for (const [df, dr] of dirsB) {
    let f = targetF + df;
    let r = targetR + dr;
    while (inBounds(f, r)) {
      const pc = board[r][f];
      if (pc) {
        if (pc.c === byColor && (pc.p === "b" || pc.p === "q")) return true;
        break;
      }
      f += df;
      r += dr;
    }
  }

  // rooks/queens
  for (const [df, dr] of dirsR) {
    let f = targetF + df;
    let r = targetR + dr;
    while (inBounds(f, r)) {
      const pc = board[r][f];
      if (pc) {
        if (pc.c === byColor && (pc.p === "r" || pc.p === "q")) return true;
        break;
      }
      f += df;
      r += dr;
    }
  }

  // king adjacency
  for (let dr = -1; dr <= 1; dr++) {
    for (let df = -1; df <= 1; df++) {
      if (df === 0 && dr === 0) continue;
      const f = targetF + df;
      const r = targetR + dr;
      if (inBounds(f, r)) {
        const pc = board[r][f];
        if (pc && pc.c === byColor && pc.p === "k") return true;
      }
    }
  }

  return false;
}

function inCheck(board, side) {
  const kp = kingPos(board, side);
  if (!kp) return false;
  return isAttacked(board, kp.f, kp.r, opposite(side));
}

function canCastle(board, side, castle, kind) {
  // kind: "K" (king side) or "Q" (queen side)
  const homeRank = side === "w" ? 0 : 7;

  const rights =
    side === "w"
      ? kind === "K"
        ? castle.wK
        : castle.wQ
      : kind === "K"
      ? castle.bK
      : castle.bQ;

  if (!rights) return false;

  // king must be on e-file on home rank
  const king = board[homeRank][4];
  if (!king || king.c !== side || king.p !== "k") return false;

  // cannot castle out of check
  if (isAttacked(board, 4, homeRank, opposite(side))) return false;

  if (kind === "K") {
    // squares f and g empty; rook on h
    if (board[homeRank][5] || board[homeRank][6]) return false;
    const rook = board[homeRank][7];
    if (!rook || rook.c !== side || rook.p !== "r") return false;

    // squares king passes through must not be attacked
    if (isAttacked(board, 5, homeRank, opposite(side))) return false;
    if (isAttacked(board, 6, homeRank, opposite(side))) return false;
    return true;
  }

  // queen side: squares b c d empty; rook on a
  if (board[homeRank][1] || board[homeRank][2] || board[homeRank][3]) return false;
  const rook = board[homeRank][0];
  if (!rook || rook.c !== side || rook.p !== "r") return false;

  if (isAttacked(board, 3, homeRank, opposite(side))) return false; // d
  if (isAttacked(board, 2, homeRank, opposite(side))) return false; // c
  return true;
}

function applyMove(board, mv) {
  const b = cloneBoard(board);
  const { f: ff, r: fr } = sqToIdx(mv.from);
  const { f: tf, r: tr } = sqToIdx(mv.to);
  const pc = b[fr][ff];

  b[fr][ff] = null;
  b[tr][tf] = pc ? { ...pc } : null;

  // promotion
  if (pc && pc.p === "p" && mv.promo) b[tr][tf].p = mv.promo;

  // castling rook move (king moves 2 squares)
  if (pc && pc.p === "k" && fr === tr && Math.abs(tf - ff) === 2) {
    // king-side e->g, rook h->f
    if (tf === 6) {
      b[tr][5] = b[tr][7];
      b[tr][7] = null;
    }
    // queen-side e->c, rook a->d
    if (tf === 2) {
      b[tr][3] = b[tr][0];
      b[tr][0] = null;
    }
  }

  return b;
}

function updateCastleRights(castle, board, mv) {
  const next = { ...castle };
  const { f: ff, r: fr } = sqToIdx(mv.from);
  const { f: tf, r: tr } = sqToIdx(mv.to);
  const moving = board[fr][ff];
  const captured = board[tr][tf];

  if (!moving) return next;

  // king moved -> lose both
  if (moving.p === "k") {
    if (moving.c === "w") {
      next.wK = false;
      next.wQ = false;
    } else {
      next.bK = false;
      next.bQ = false;
    }
  }

  // rook moved from original squares
  if (moving.p === "r") {
    if (moving.c === "w") {
      if (mv.from === "h1") next.wK = false;
      if (mv.from === "a1") next.wQ = false;
    } else {
      if (mv.from === "h8") next.bK = false;
      if (mv.from === "a8") next.bQ = false;
    }
  }

  // rook captured on original squares
  if (captured && captured.p === "r") {
    if (captured.c === "w") {
      if (mv.to === "h1") next.wK = false;
      if (mv.to === "a1") next.wQ = false;
    } else {
      if (mv.to === "h8") next.bK = false;
      if (mv.to === "a8") next.bQ = false;
    }
  }

  return next;
}

function legalMoves(board, side, castle) {
  const moves = [];

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const pc = board[r][f];
      if (!pc || pc.c !== side) continue;

      const from = idxToSq(f, r);

      const add = (tf, tr, promo) => {
        if (!inBounds(tf, tr)) return;
        const target = board[tr][tf];
        if (target && target.c === side) return;

        const mv = { from, to: idxToSq(tf, tr), promo: promo || null };
        const nb = applyMove(board, mv);

        const kp = kingPos(nb, side);
        if (!kp) return;

        if (!isAttacked(nb, kp.f, kp.r, opposite(side))) moves.push(mv);
      };

      // Pawn
      if (pc.p === "p") {
        const dir = side === "w" ? 1 : -1;

        // forward
        const fr1 = r + dir;
        if (inBounds(f, fr1) && !board[fr1][f]) {
          if ((side === "w" && fr1 === 7) || (side === "b" && fr1 === 0)) add(f, fr1, "q");
          else add(f, fr1);

          // double
          const startRank = side === "w" ? 1 : 6;
          const fr2 = r + 2 * dir;
          if (r === startRank && inBounds(f, fr2) && !board[fr2][f]) add(f, fr2);
        }

        // captures
        for (const df of [-1, 1]) {
          const tf = f + df;
          const tr = r + dir;
          if (inBounds(tf, tr) && board[tr][tf] && board[tr][tf].c !== side) {
            if ((side === "w" && tr === 7) || (side === "b" && tr === 0)) add(tf, tr, "q");
            else add(tf, tr);
          }
        }
      }

      // Knight
      if (pc.p === "n") {
        const steps = [
          [1, 2],
          [2, 1],
          [-1, 2],
          [-2, 1],
          [1, -2],
          [2, -1],
          [-1, -2],
          [-2, -1],
        ];
        for (const [df, dr] of steps) add(f + df, r + dr);
      }

      // Bishop/Rook/Queen
      if (pc.p === "b" || pc.p === "r" || pc.p === "q") {
        const rayDirs = [];
        if (pc.p === "b" || pc.p === "q") rayDirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
        if (pc.p === "r" || pc.p === "q") rayDirs.push([1, 0], [-1, 0], [0, 1], [0, -1]);

        for (const [df, dr] of rayDirs) {
          let tf = f + df;
          let tr = r + dr;
          while (inBounds(tf, tr)) {
            if (board[tr][tf]) {
              if (board[tr][tf].c !== side) add(tf, tr);
              break;
            }
            add(tf, tr);
            tf += df;
            tr += dr;
          }
        }
      }

      // King + castling
      if (pc.p === "k") {
        for (let dr = -1; dr <= 1; dr++) {
          for (let df = -1; df <= 1; df++) {
            if (df === 0 && dr === 0) continue;
            add(f + df, r + dr);
          }
        }

        // castling moves: king e->g or e->c
        const homeRank = side === "w" ? 0 : 7;
        if (r === homeRank && f === 4) {
          if (canCastle(board, side, castle, "K")) add(6, homeRank);
          if (canCastle(board, side, castle, "Q")) add(2, homeRank);
        }
      }
    }
  }

  return moves;
}

function gameResult(board, sideToMove, castle) {
  const moves = legalMoves(board, sideToMove, castle);
  if (moves.length > 0) return null;
  if (inCheck(board, sideToMove)) return { type: "checkmate", winner: opposite(sideToMove) };
  return { type: "stalemate", winner: null };
}

// --- Tiny eval (used for move-loss stats) ---
const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

const PST = {
  p: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [5, 10, 10, -20, -20, 10, 10, 5],
    [5, -5, -10, 0, 0, -10, -5, 5],
    [0, 0, 0, 20, 20, 0, 0, 0],
    [5, 5, 10, 25, 25, 10, 5, 5],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  n: [
    [-50, -40, -30, -30, -30, -30, -40, -50],
    [-40, -20, 0, 5, 5, 0, -20, -40],
    [-30, 5, 10, 15, 15, 10, 5, -30],
    [-30, 0, 15, 20, 20, 15, 0, -30],
    [-30, 5, 15, 20, 20, 15, 5, -30],
    [-30, 0, 10, 15, 15, 10, 0, -30],
    [-40, -20, 0, 0, 0, 0, -20, -40],
    [-50, -40, -30, -30, -30, -30, -40, -50],
  ],
  b: [
    [-20, -10, -10, -10, -10, -10, -10, -20],
    [-10, 5, 0, 0, 0, 0, 5, -10],
    [-10, 10, 10, 10, 10, 10, 10, -10],
    [-10, 0, 10, 10, 10, 10, 0, -10],
    [-10, 5, 5, 10, 10, 5, 5, -10],
    [-10, 0, 5, 10, 10, 5, 0, -10],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-20, -10, -10, -10, -10, -10, -10, -20],
  ],
  r: [
    [0, 0, 5, 10, 10, 5, 0, 0],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [5, 10, 10, 10, 10, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  q: [
    [-20, -10, -10, -5, -5, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 5, 5, 5, 0, -10],
    [-5, 0, 5, 5, 5, 5, 0, -5],
    [0, 0, 5, 5, 5, 5, 0, -5],
    [-10, 5, 5, 5, 5, 5, 0, -10],
    [-10, 0, 5, 0, 0, 0, 0, -10],
    [-20, -10, -10, -5, -5, -10, -10, -20],
  ],
  k: [
    [20, 30, 10, 0, 0, 10, 30, 20],
    [20, 20, 0, 0, 0, 0, 20, 20],
    [-10, -20, -20, -20, -20, -20, -20, -10],
    [-20, -30, -30, -40, -40, -30, -30, -20],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
  ],
};

function evalBoard(board) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const pc = board[r][f];
      if (!pc) continue;
      const base = PIECE_VALUES[pc.p];
      const pst = PST[pc.p][pc.c === "w" ? r : 7 - r][f];
      const val = base + pst;
      score += pc.c === "w" ? val : -val;
    }
  }
  return score;
}

function lossForMove(boardBefore, mv, side, castle) {
  const moves = legalMoves(boardBefore, side, castle);
  if (moves.length === 0) return 0;

  const scored = moves.map((m) => {
    const nb = applyMove(boardBefore, m);
    const s = evalBoard(nb);
    return { m, v: side === "w" ? s : -s };
  });
  scored.sort((a, b) => b.v - a.v);
  const best = scored[0].v;

  const playedNb = applyMove(boardBefore, mv);
  const played = side === "w" ? evalBoard(playedNb) : -evalBoard(playedNb);

  return Math.max(0, best - played);
}

function formatMove(mv) {
  const isCastle =
    (mv.from === "e1" && (mv.to === "g1" || mv.to === "c1")) ||
    (mv.from === "e8" && (mv.to === "g8" || mv.to === "c8"));
  if (isCastle) return mv.to[0] === "g" ? "O-O" : "O-O-O";
  return `${mv.from}-${mv.to}${mv.promo ? `=${mv.promo.toUpperCase()}` : ""}`;
}

function boardToFen(board, sideToMove, castle, plyCount = 0) {
  const rows = [];
  for (let r = 7; r >= 0; r--) {
    let row = "";
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      const pc = board[r][f];
      if (!pc) {
        empty += 1;
      } else {
        if (empty) {
          row += empty;
          empty = 0;
        }
        const letter = pc.c === "w" ? pc.p.toUpperCase() : pc.p;
        row += letter;
      }
    }
    if (empty) row += empty;
    rows.push(row);
  }

  const castling = `${castle.wK ? "K" : ""}${castle.wQ ? "Q" : ""}${castle.bK ? "k" : ""}${castle.bQ ? "q" : ""}`;
  const fullMove = Math.max(1, Math.floor(plyCount / 2) + 1);
  return `${rows.join("/")} ${sideToMove} ${castling || "-"} - 0 ${fullMove}`;
}

function parseUciMove(uci) {
  if (!uci || uci.length < 4) return null;
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promo: uci.length > 4 ? uci[4].toLowerCase() : null,
  };
}

function getCheckedKingSquare(board, sideToMove) {
  if (!inCheck(board, sideToMove)) return null;
  const kp = kingPos(board, sideToMove);
  return kp ? idxToSq(kp.f, kp.r) : null;
}

function moveToUci(move) {
  return `${move.from}${move.to}${move.promo || ""}`;
}

function classifyLoss(cpLoss) {
  if (cpLoss >= 300) return "blunder";
  if (cpLoss >= 150) return "mistake";
  if (cpLoss >= 50) return "inaccuracy";
  return "ok";
}

function sideToMoveFromFen(fen) {
  return fen.split(" ")[1] || "w";
}

function scoreFromUserPerspective(scoreObj, fen, youColor) {
  const cp = scoreObj?.cp ?? 0;
  const sideToMove = sideToMoveFromFen(fen);
  return sideToMove === youColor ? cp : -cp;
}

async function analyzeGameWithStockfish({ moves, youColor, movetimeMs = 100 }) {
  const chess = new Chess();
  const maxPlies = 40;
  const selectedMoves = moves.slice(0, maxPlies);

  const userMoveSnapshots = [];

  for (const move of selectedMoves) {
    const fenBefore = chess.fen();
    const parsed = chess.move({ from: move.from, to: move.to, promotion: move.promo || undefined });
    if (!parsed) continue;
    const fenAfter = chess.fen();
    if (move.side === youColor) {
      userMoveSnapshots.push({ move, fenBefore, fenAfter });
    }
  }

  if (!userMoveSnapshots.length) {
    return {
      movesAnalyzed: 0,
      acpl: 0,
      blunders: 0,
      mistakes: 0,
      inaccuracies: 0,
      accuracy: 100,
      moveBreakdown: [],
      mateSeen: false,
      endedQuickly: true,
    };
  }

  const moveBreakdown = [];
  let totalLoss = 0;
  let blunders = 0;
  let mistakes = 0;
  let inaccuracies = 0;
  let mateSeen = false;

  for (const snapshot of userMoveSnapshots) {
    const before = await evaluatePosition(snapshot.fenBefore, movetimeMs);
    const after = await evaluatePosition(snapshot.fenAfter, movetimeMs);

    if (before.type === "mate" || after.type === "mate") mateSeen = true;

    const scoreBefore = scoreFromUserPerspective(before, snapshot.fenBefore, youColor);
    const scoreAfter = scoreFromUserPerspective(after, snapshot.fenAfter, youColor);
    const cpLoss = Math.max(0, Math.round(scoreBefore - scoreAfter));
    const classification = classifyLoss(cpLoss);

    if (classification === "blunder") blunders += 1;
    else if (classification === "mistake") mistakes += 1;
    else if (classification === "inaccuracy") inaccuracies += 1;

    totalLoss += cpLoss;
    moveBreakdown.push({
      move: moveToUci(snapshot.move),
      cpLoss,
      scoreBefore,
      scoreAfter,
      classification,
    });
  }

  const movesAnalyzed = moveBreakdown.length;
  const acpl = movesAnalyzed ? Math.round(totalLoss / movesAnalyzed) : 0;
  const accuracy = clamp(Math.round(100 - acpl * 0.45 - blunders * 5 - mistakes * 2), 20, 99);

  return {
    movesAnalyzed,
    acpl,
    blunders,
    mistakes,
    inaccuracies,
    accuracy,
    moveBreakdown,
    mateSeen,
    endedQuickly: selectedMoves.length < 20,
  };
}

const RATING_STORAGE_KEY = "chess-elo-calculator:rating-state";
const PERSONALITY_STORAGE_KEY = "chess-elo-calculator:bot-personality";

const THEMES = [
  {
    id: "nebula",
    name: "Nebula",
    description: "Cool blues + lavender glow.",
    base: "#050507",
    glowTop: "rgba(56,189,248,0.18)",
    glowBottom: "rgba(167,139,250,0.16)",
    grid: "rgba(255,255,255,0.12)",
    boardDark: "#1f2a3a",
    boardLight: "#27364a",
    accent: "#7dd3fc",
    accentSoft: "rgba(125,211,252,0.3)",
  },
  {
    id: "ember",
    name: "Ember",
    description: "Warm reds + molten board.",
    base: "#0b0605",
    glowTop: "rgba(248,113,113,0.2)",
    glowBottom: "rgba(251,146,60,0.16)",
    grid: "rgba(255,255,255,0.1)",
    boardDark: "#2a1715",
    boardLight: "#3b2220",
    accent: "#fb7185",
    accentSoft: "rgba(251,113,133,0.3)",
  },
  {
    id: "forest",
    name: "Deep Forest",
    description: "Emerald calm with mossy tones.",
    base: "#050a07",
    glowTop: "rgba(34,197,94,0.18)",
    glowBottom: "rgba(20,184,166,0.14)",
    grid: "rgba(255,255,255,0.08)",
    boardDark: "#1a2b25",
    boardLight: "#21362f",
    accent: "#34d399",
    accentSoft: "rgba(52,211,153,0.3)",
  },
  {
    id: "arcade",
    name: "Neon Arcade",
    description: "Electric teal + purple pop.",
    base: "#060512",
    glowTop: "rgba(45,212,191,0.2)",
    glowBottom: "rgba(139,92,246,0.18)",
    grid: "rgba(255,255,255,0.12)",
    boardDark: "#1a2238",
    boardLight: "#233051",
    accent: "#22d3ee",
    accentSoft: "rgba(34,211,238,0.3)",
  },
];

const BOT_PERSONALITIES = [
  {
    id: "strategist",
    name: "The Strategist",
    emoji: "🧭",
    tagline: "Clean, steady, and positional play.",
    quips: ["Small edges add up.", "Patience wins.", "Control the center."],
  },
  {
    id: "tactician",
    name: "The Tactician",
    emoji: "🔥",
    tagline: "Aggressive lines and tactical pressure.",
    quips: ["Let’s complicate.", "Tactics decide."],
  },
  {
    id: "trickster",
    name: "The Trickster",
    emoji: "🎭",
    tagline: "Offbeat but still dangerous moves.",
    quips: ["Unexpected.", "Offbeat is best."],
  },
  {
    id: "endgame-grinder",
    name: "The Endgame Grinder",
    emoji: "🧊",
    tagline: "Simplifies and squeezes advantages.",
    quips: ["Endgames are won slowly."],
  },
];

// ---- Fun percentile + level (VERY approximate) ----
// Vibes-based percentiles for UI fun (not official).
const PERCENTILE_POINTS = [
  [200, 5],
  [400, 12],
  [600, 25],
  [800, 45],
  [1000, 62],
  [1200, 75],
  [1400, 86],
  [1600, 92],
  [1800, 96],
  [2000, 98.3],
  [2200, 99.2],
  [2400, 99.7],
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}
function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

// returns "betterThan" percent (e.g. 86 => better than 86% of players)
function approxPercentileBetterThan(elo) {
  const e = clamp(elo, 200, 2400);
  for (let i = 0; i < PERCENTILE_POINTS.length - 1; i++) {
    const [e1, p1] = PERCENTILE_POINTS[i];
    const [e2, p2] = PERCENTILE_POINTS[i + 1];
    if (e >= e1 && e <= e2) {
      const t = (e - e1) / (e2 - e1);
      return lerp(p1, p2, t);
    }
  }
  return 99.7;
}

function chessLevel(elo) {
  if (elo >= 2100) return { name: "Certified Menace", tone: "good", emoji: "🧨" };
  if (elo >= 1800) return { name: "Cracked", tone: "good", emoji: "🔥" };
  if (elo >= 1550) return { name: "Very Strong", tone: "good", emoji: "💎" };
  if (elo >= 1350) return { name: "Really Solid", tone: "neutral", emoji: "🧠" };
  if (elo >= 1150) return { name: "Dangerous", tone: "neutral", emoji: "⚠️" };
  if (elo >= 950) return { name: "Improving Fast", tone: "neutral", emoji: "📈" };
  if (elo >= 750) return { name: "Beginner With Bite", tone: "warn", emoji: "🦷" };
  return { name: "Chaos Enjoyer", tone: "warn", emoji: "🌀" };
}

function egoLine({ avgLoss, blunders, result }) {
  if (result === "win" && blunders === 0) return "You just played clean chess. No blunders. That’s illegal.";
  if (result === "win") return "W secured. The bot is going to need therapy.";
  if (avgLoss < 80) return "Your moves are spicy. You’re seeing tactics other people don’t.";
  if (blunders === 0) return "No blunders… you’re officially harder to beat than your friends.";
  return "The vibe is there. The execution is loading… but when it hits, it’ll be nasty.";
}

function buildBadges({ avgLoss, blunders, movesPlayed, result, vs }) {
  const badges = [];
  if (blunders === 0 && movesPlayed >= 10) badges.push({ label: "No blunders", emoji: "🧼", tone: "good" });
  if (avgLoss <= 70 && movesPlayed >= 10) badges.push({ label: "High accuracy", emoji: "🎯", tone: "good" });
  if (result === "win") badges.push({ label: "W merchant", emoji: "🏆", tone: "good" });
  if (movesPlayed >= 25) badges.push({ label: "Endgame grinder", emoji: "🧱", tone: "neutral" });
  if (vs >= 80) badges.push({ label: "Fearless vs strong bot", emoji: "🦾", tone: "neutral" });
  if (avgLoss >= 180) badges.push({ label: "Tactical gambler", emoji: "🎲", tone: "warn" });
  if (blunders >= 2) badges.push({ label: "Blunder enthusiast", emoji: "🫠", tone: "bad" });
  return badges.slice(0, 6);
}

function Pill({ children, tone = "neutral" }) {
  const toneCls =
    tone === "good"
      ? "bg-emerald-500/10 text-emerald-200 border-emerald-500/20"
      : tone === "warn"
      ? "bg-amber-500/10 text-amber-200 border-amber-500/20"
      : tone === "bad"
      ? "bg-rose-500/10 text-rose-200 border-rose-500/20"
      : "bg-neutral-500/10 text-neutral-200 border-neutral-500/20";
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs ${toneCls}`}>
      {children}
    </span>
  );
}

export default function App() {
  const initialRatingState = useMemo(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(RATING_STORAGE_KEY) || "null");
      return parsed && typeof parsed.playerElo === "number" && Number.isFinite(parsed.gamesRated)
        ? {
            ...getInitialRatingState(),
            ...parsed,
            confidence: getConfidenceLabel(parsed.gamesRated || 0),
          }
        : getInitialRatingState();
    } catch {
      return getInitialRatingState();
    }
  }, []);

  const [board, setBoard] = useState(makeStartBoard);
  const [turn, setTurn] = useState("w");
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("Play");
  const [botEloUsedThisGame, setBotEloUsedThisGame] = useState(1200);
  const [currentMoveTimeMs, setCurrentMoveTimeMs] = useState(200);
  const [selfTestResult, setSelfTestResult] = useState("");
  const [selfTestError, setSelfTestError] = useState("");
  const [selfTestBusy, setSelfTestBusy] = useState(false);
  const [themeId, setThemeId] = useState("nebula");
  const [moves, setMoves] = useState([]); // {from,to,promo,side,loss}
  const [result, setResult] = useState(null);
  const [lastRatedSummary, setLastRatedSummary] = useState(null);
  const [lastGameSummaryForBot, setLastGameSummaryForBot] = useState(initialRatingState.lastGameSummary || null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [ratingState, setRatingState] = useState(initialRatingState);
  const [personalityId, setPersonalityId] = useState(() => {
    const saved = localStorage.getItem(PERSONALITY_STORAGE_KEY);
    return BOT_PERSONALITIES.some((p) => p.id === saved) ? saved : "strategist";
  });
  const [botStatusLine, setBotStatusLine] = useState("Small edges add up.");
  const [lastMove, setLastMove] = useState(null);
  const [botGlowSquare, setBotGlowSquare] = useState(null);
  const [checkedKingSquare, setCheckedKingSquare] = useState(null);

  // castling rights
  const [castle, setCastle] = useState({ wK: true, wQ: true, bK: true, bQ: true });

  const botPlays = "b";
  const youColor = "w";
  const theme = useMemo(() => THEMES.find((t) => t.id === themeId) || THEMES[0], [themeId]);
  const personality = useMemo(
    () => BOT_PERSONALITIES.find((item) => item.id === personalityId) || BOT_PERSONALITIES[0],
    [personalityId],
  );
  const isDebug = useMemo(() => new URLSearchParams(window.location.search).get("debug") === "1", []);

  // rotate board so YOU are always at the bottom (like chess.com)
  const squares = useMemo(() => {
    const out = [];
    const ranks = youColor === "w" ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
    const files = youColor === "w" ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
    for (const r of ranks) for (const f of files) out.push(idxToSq(f, r));
    return out;
  }, [youColor]);

  const legalForSelected = useMemo(() => {
    if (!selected) return [];
    return legalMoves(board, turn, castle)
      .filter((m) => m.from === selected)
      .map((m) => m.to);
  }, [board, turn, selected, castle]);

  const yourSummary = useMemo(() => {
    const yourMoves = moves.filter((m) => m.side === youColor);
    const movesPlayed = yourMoves.length;
    const avgLoss = movesPlayed
      ? Math.round(yourMoves.reduce((a, m) => a + m.loss, 0) / movesPlayed)
      : 0;
    const blunders = yourMoves.filter((m) => m.loss > 300).length;
    return { movesPlayed, avgLoss, blunders };
  }, [moves, youColor]);

  const analysis = useMemo(() => {
    const yourMoves = moves.filter((m) => m.side === youColor);
    const recent = yourMoves.slice(-5);
    const recentAvg = recent.length
      ? Math.round(recent.reduce((a, m) => a + m.loss, 0) / recent.length)
      : null;
    let streak = 0;
    for (let i = yourMoves.length - 1; i >= 0; i--) {
      if (yourMoves[i].loss < 70) streak += 1;
      else break;
    }
    const accuracy = clamp(Math.round(100 - (yourSummary.avgLoss || 0) / 2), 35, 99);
    return { recentAvg, streak, accuracy };
  }, [moves, youColor, yourSummary.avgLoss]);

  useEffect(() => {
    initEngine().catch((error) => {
      console.error("Failed to initialize Stockfish", error);
    });
  }, []);

  useEffect(() => {
    const nextBotElo = chooseBotElo(ratingState, lastGameSummaryForBot);
    const nextMoveTime = mapMovetimeFromElo(nextBotElo);
    setBotEloUsedThisGame(nextBotElo);
    setCurrentMoveTimeMs(nextMoveTime);
    setStrength({ elo: nextBotElo, movetimeMs: nextMoveTime }).catch((error) => {
      console.error("Failed to set bot strength", error);
    });
  }, [ratingState, lastGameSummaryForBot]);

  useEffect(() => {
    localStorage.setItem(RATING_STORAGE_KEY, JSON.stringify(ratingState));
  }, [ratingState]);

  useEffect(() => {
    localStorage.setItem(PERSONALITY_STORAGE_KEY, personalityId);
    setBotStatusLine(personality.quips[0]);
  }, [personalityId, personality]);

  useEffect(() => {
    if (!botGlowSquare) return undefined;
    const timer = setTimeout(() => setBotGlowSquare(null), 300);
    return () => clearTimeout(timer);
  }, [botGlowSquare]);

  async function handleSelfTest() {
    setSelfTestBusy(true);
    setSelfTestResult("");
    setSelfTestError("");
    try {
      const bestmove = await runSelfTest();
      if (!bestmove || !/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(bestmove)) {
        throw new Error(`Stockfish self-test returned invalid bestmove: ${bestmove || "(empty)"}`);
      }
      setSelfTestResult(`bestmove ${bestmove}`);
    } catch (error) {
      setSelfTestError(error?.message || "Stockfish self-test failed to produce a bestmove.");
    } finally {
      setSelfTestBusy(false);
    }
  }

  useEffect(() => {
    if (result) return;
    if (turn !== botPlays) return;

    let cancelled = false;

    const playBotMove = async () => {
      setStatus(ratingState.gamesRated < 5 ? "Calibrating…" : "Refining…");

      const legal = legalMoves(board, turn, castle);
      if (!legal.length) return;

      try {
        const fen = boardToFen(board, turn, castle, moves.length);
        const uci = await getBestMoveStyled(fen, personality.id, currentMoveTimeMs);
        if (cancelled) return;

        const parsed = parseUciMove(uci);
        if (!parsed) return;

        const mv = legal.find(
          (m) =>
            m.from === parsed.from &&
            m.to === parsed.to &&
            (m.promo || null) === (parsed.promo || null),
        );

        if (!mv) {
          console.warn("Stockfish suggested illegal move", uci, fen);
          return;
        }

        const loss = lossForMove(board, mv, turn, castle);
        const nextCastle = updateCastleRights(castle, board, mv);

        const nb = applyMove(board, mv);
        const nextTurn = opposite(turn);
        const gr = gameResult(nb, nextTurn, nextCastle);

        setBoard(nb);
        setCastle(nextCastle);
        setMoves((prev) => [...prev, { ...mv, side: turn, loss }]);
        setTurn(nextTurn);
        setSelected(null);
        setLastMove({ from: mv.from, to: mv.to });
        setBotGlowSquare(mv.to);
        setCheckedKingSquare(getCheckedKingSquare(nb, nextTurn));
        setBotStatusLine(personality.quips[Math.floor(Math.random() * personality.quips.length)]);

        if (gr) {
          const nextMoves = [...moves, { ...mv, side: turn, loss }];
          finishGame(gr, nextMoves);
        }
        else setStatus(`Your move (${colorToMoveName(youColor)})`);
      } catch (error) {
        console.error("Bot move failed", error);
        setStatus(`Bot engine error: ${error?.message || "Unable to compute move."}`);
      }
    };

    playBotMove();

    return () => {
      cancelled = true;
    };
  }, [turn, botPlays, board, result, castle, youColor, personality, moves.length, currentMoveTimeMs, ratingState.gamesRated]);

  async function finishGame(gr, movesForGame) {
    let resText = "Draw";
    let res = "draw";
    if (gr.type === "checkmate") {
      resText = `${gr.winner === "w" ? "White" : "Black"} wins by checkmate`;
      res = gr.winner === youColor ? "win" : "loss";
    } else {
      resText = "Draw (stalemate)";
      res = "draw";
    }

    setResult({ ...gr, text: resText, yours: res });
    setStatus(resText);

    const analysisSummary = await analyzeGameWithStockfish({
      moves: movesForGame,
      youColor,
      movetimeMs: 100,
    }).catch((error) => {
      console.error("Post-game analysis failed", error);
      return {
        movesAnalyzed: 0,
        acpl: 0,
        blunders: 0,
        mistakes: 0,
        inaccuracies: 0,
        accuracy: 50,
        moveBreakdown: [],
        mateSeen: false,
        endedQuickly: true,
      };
    });

    const ratingUpdate = updatePlayerElo(ratingState, botEloUsedThisGame, res, analysisSummary);
    setRatingState(ratingUpdate.nextState);
    setLastRatedSummary({
      playerElo: ratingUpdate.nextState.playerElo,
      uncertainty: ratingUpdate.summary.uncertainty,
      confidence: ratingUpdate.summary.confidence,
      rangeLow: ratingUpdate.nextState.rangeLow,
      rangeHigh: ratingUpdate.nextState.rangeHigh,
      performanceElo: ratingUpdate.summary.performanceElo,
    });
    setLastGameSummaryForBot(ratingUpdate.nextState.lastGameSummary);
    setDebugInfo({
      botEloUsedThisGame,
      expectedScore: ratingUpdate.summary.expectedScore,
      kFactor: ratingUpdate.summary.kFactor,
      performanceElo: ratingUpdate.summary.performanceElo,
      alpha: ratingUpdate.summary.alpha,
      clampLow: ratingUpdate.summary.clampedLow,
      clampHigh: ratingUpdate.summary.clampedHigh,
    });
  }

  function reset() {
    setBoard(makeStartBoard());
    setTurn("w");
    setSelected(null);
    setMoves([]);
    setResult(null);
    setCastle({ wK: true, wQ: true, bK: true, bQ: true });
    setStatus(`Your move (${colorToMoveName(youColor)})`);
    setLastMove(null);
    setCheckedKingSquare(null);
    setBotGlowSquare(null);
    setBotStatusLine(personality.quips[0]);
  }


  function handleSquareClick(sq) {
    if (result) return;
    if (turn !== youColor) return;

    const { f, r } = sqToIdx(sq);
    const pc = board[r][f];

    if (!selected) {
      if (pc && pc.c === youColor) setSelected(sq);
      return;
    }

    if (pc && pc.c === youColor) {
      setSelected(sq);
      return;
    }

    const candidate = legalMoves(board, turn, castle).find((m) => m.from === selected && m.to === sq);
    if (!candidate) return;

    // auto-promo to queen
    const fromIdx = sqToIdx(candidate.from);
    const moving = board[fromIdx.r][fromIdx.f];
    if (moving?.p === "p") {
      const toIdx = sqToIdx(candidate.to);
      if ((youColor === "w" && toIdx.r === 7) || (youColor === "b" && toIdx.r === 0)) {
        candidate.promo = "q";
      }
    }

    const loss = lossForMove(board, candidate, turn, castle);
    const nextCastle = updateCastleRights(castle, board, candidate);

    const nb = applyMove(board, candidate);
    const nextTurn = opposite(turn);
    const gr = gameResult(nb, nextTurn, nextCastle);

    setBoard(nb);
    setCastle(nextCastle);
    setMoves((prev) => [...prev, { ...candidate, side: turn, loss }]);
    setTurn(nextTurn);
    setSelected(null);
    setLastMove({ from: candidate.from, to: candidate.to });
    setCheckedKingSquare(getCheckedKingSquare(nb, nextTurn));

    if (gr) {
      const nextMoves = [...moves, { ...candidate, side: turn, loss }];
      finishGame(gr, nextMoves);
    }
  }

  const turnTone = result ? "neutral" : turn === youColor ? "good" : "warn";

  const resultTone = result?.yours === "win" ? "good" : result?.yours === "loss" ? "bad" : "neutral";
  const hasRatedGames = ratingState.gamesRated > 0;
  const currentGameNumber = ratingState.gamesRated + 1;

  function resetAllProgress() {
    const freshRatingState = getInitialRatingState();
    reset();
    setRatingState(freshRatingState);
    setLastRatedSummary(null);
    setLastGameSummaryForBot(null);
    setDebugInfo(null);
    localStorage.removeItem(RATING_STORAGE_KEY);
  }

  return (
    <div className="min-h-screen text-neutral-100">
      {/* Background */}
      <div className="fixed inset-0 -z-10" style={{ backgroundColor: theme.base }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(ellipse_at_top,${theme.glowTop},transparent_55%),radial-gradient(ellipse_at_bottom,${theme.glowBottom},transparent_55%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `linear-gradient(to_right,${theme.grid}_1px,transparent_1px),linear-gradient(to_bottom,${theme.grid}_1px,transparent_1px)`,
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="p-5 sm:p-7">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-5">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Play</h1>
                <p className="text-neutral-300 mt-2 max-w-2xl">
                  Rated mode is always on. Your Elo estimate updates after every game.
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Pill tone="neutral">
                    Game: <b>{currentGameNumber}</b>
                  </Pill>
                  <Pill tone="neutral">
                    You: <b>{colorToMoveName(youColor)}</b>
                  </Pill>
                  <Pill tone="neutral">
Mode: <b>Rated</b>
                  </Pill>
                  <Pill tone={turnTone}>{result ? "Game finished" : turn === youColor ? "Your move" : "Bot move"}</Pill>
                  {result && <Pill tone={resultTone}>{result.text}</Pill>}
                  {!result && (
                    <Pill tone="neutral">
                      Castling:{" "}
                      {(youColor === "w" ? castle.wK || castle.wQ : castle.bK || castle.bQ)
                        ? "available (if legal)"
                        : "gone"}
                    </Pill>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-sky-300/25 bg-sky-500/10 p-4 min-w-[260px] text-right">
                <div className="text-xs uppercase tracking-wide text-sky-200/80">Estimated Elo</div>
                <div className="text-2xl font-bold text-sky-100">
                  {hasRatedGames ? (
                    <>
                      {ratingState.playerElo} <span className="text-sm font-medium">({ratingState.rangeLow}–{ratingState.rangeHigh})</span>
                    </>
                  ) : (
                    <span className="text-xl">Unknown (play game 1)</span>
                  )}
                </div>
                <div className="text-xs text-sky-200/90 mt-1">Confidence: {ratingState.confidence}</div>
                {!result ? <div className="text-xs text-sky-300/90 mt-1">Adjusting…</div> : null}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={reset}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition"
                >
                  New game
                </button>
                <button
                  onClick={resetAllProgress}
                  className="px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 transition"
                >
                  Reset history
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-sky-300/20 bg-sky-500/10 p-4">
              <div className="text-sm sm:text-base font-medium text-sky-100">
                Range: {hasRatedGames ? `${ratingState.rangeLow}–${ratingState.rangeHigh}` : "Unknown"}
              </div>
              <div className="text-xs text-sky-200/90 mt-1">Confidence: {ratingState.confidence}</div>
              {lastRatedSummary ? (
                <div className="text-xs text-sky-100 mt-2">
                  Updated estimate: {lastRatedSummary.playerElo} ({lastRatedSummary.rangeLow}–{lastRatedSummary.rangeHigh})
                </div>
              ) : null}
              {ratingState.lastGameSummary ? (
                <details className="mt-2 text-xs text-sky-100/95">
                  <summary className="cursor-pointer">Last game</summary>
                  <div className="mt-1">
                    vs unknown • Result: {ratingState.lastGameSummary.result} • ACPL: {ratingState.lastGameSummary.acpl} • Blunders: {ratingState.lastGameSummary.blunders} • Performance: {ratingState.lastGameSummary.performanceElo} (±{ratingState.lastGameSummary.performanceRange?.halfWidth || 200})
                  </div>
                </details>
              ) : null}
              {isDebug && debugInfo ? (
                <div className="text-xs text-sky-200 mt-2">
                  debug — botEloUsedThisGame: {debugInfo.botEloUsedThisGame} · performanceElo: {debugInfo.performanceElo} · expectedScore: {debugInfo.expectedScore.toFixed(3)} · K: {debugInfo.kFactor} · alpha: {debugInfo.alpha.toFixed(2)} · clamp: {debugInfo.clampLow}..{debugInfo.clampHigh}
                </div>
              ) : null}
            </div>

            {/* Board card */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.04)] overflow-hidden">
              <div className="p-4 sm:p-5 flex items-center justify-between gap-3 border-b border-white/10">
                <div className="text-sm text-neutral-200">
                  <span className="font-medium">Status:</span> {status}
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <span className="text-neutral-300">Avg loss</span>
                  <span className="font-semibold">{yourSummary.avgLoss}cp</span>
                  <span className="text-neutral-500">·</span>
                  <span className="text-neutral-300">Blunders</span>
                  <span className="font-semibold">{yourSummary.blunders}</span>
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 xl:grid-cols-[auto_280px] gap-4 items-start">
                  {/* Board frame */}
                  <div className="w-fit mx-auto rounded-3xl p-3 bg-neutral-950/40 border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
                    {/* file labels top */}
                    <div className="grid grid-cols-[18px_1fr_18px] items-center mb-2">
                      <div />
                      <div className="grid grid-cols-8 text-[10px] text-neutral-400 px-1">
                        {(youColor === "w" ? FILES : FILES.split("").reverse().join("")).split("").map((ch) => (
                          <div key={ch} className="text-center">
                            {ch}
                          </div>
                        ))}
                      </div>
                      <div />
                    </div>

                    <div className="grid grid-cols-[18px_auto_18px] items-center gap-2">
                      <div className="grid grid-rows-8 text-[10px] text-neutral-400">
                        {(youColor === "w" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8]).map((n) => (
                          <div key={n} className="h-[clamp(46px,7vw,72px)] flex items-center justify-center">
                            {n}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-8">
                        {squares.map((sq) => {
                          const { f, r } = sqToIdx(sq);
                          const pc = board[r][f];
                          const dark = (f + r) % 2 === 1;
                          const isSel = selected === sq;
                          const isMove = legalForSelected.includes(sq);
                          const isLastFrom = lastMove?.from === sq;
                          const isLastTo = lastMove?.to === sq;
                          const isCheckSquare = checkedKingSquare === sq;
                          const isBotGlow = botGlowSquare === sq;

                          return (
                            <button
                              key={sq}
                              onClick={() => handleSquareClick(sq)}
                              className={[
                                "relative",
                                "h-[clamp(46px,7vw,72px)] w-[clamp(46px,7vw,72px)]",
                                "grid place-items-center select-none transition",
                                "focus:outline-none",
                                "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
                                "hover:brightness-110",
                                isSel ? "z-10" : "",
                                isMove ? "z-[5]" : "",
                              ].join(" ")}
                              style={{
                                backgroundColor: dark ? theme.boardDark : theme.boardLight,
                                boxShadow: isSel
                                  ? `0 0 0 2px ${theme.accent}`
                                  : isMove
                                  ? `0 0 0 2px ${theme.accentSoft}`
                                  : undefined,
                              }}
                              title={sq}
                            >
                              {(isLastFrom || isLastTo) && (
                                <span className="absolute inset-0 pointer-events-none" style={{ backgroundColor: "rgba(248,113,113,0.24)" }} />
                              )}
                              {isCheckSquare && (
                                <span className="absolute inset-0 pointer-events-none" style={{ backgroundColor: "rgba(251,191,36,0.35)" }} />
                              )}
                              {isBotGlow && (
                                <span className="absolute inset-0 pointer-events-none animate-pulse" style={{ boxShadow: "inset 0 0 0 2px rgba(34,211,238,0.85), 0 0 24px rgba(34,211,238,0.65)", animationDuration: "300ms" }} />
                              )}

                              {isMove && !pc && (
                                <span className="absolute w-3 h-3 rounded-full" style={{ backgroundColor: theme.accent }} />
                              )}

                              <span
                                className={[
                                  "leading-none",
                                  "text-[clamp(30px,4.6vw,54px)]",
                                  "font-black",
                                  "transition-transform duration-75",
                                  isSel ? "scale-[1.06]" : "",
                                  pc?.c === "w"
                                    ? "text-white [text-shadow:0_2px_0_rgba(0,0,0,0.95),0_0_0_2px_rgba(0,0,0,0.95),0_0_18px_rgba(255,255,255,0.18)]"
                                    : "text-neutral-950 [text-shadow:0_2px_0_rgba(255,255,255,0.95),0_0_0_2px_rgba(255,255,255,0.95),0_0_14px_rgba(0,0,0,0.35)]",
                                ].join(" ")}
                              >
                                {pieceChar(pc)}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="grid grid-rows-8 text-[10px] text-neutral-400">
                        {(youColor === "w" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8]).map((n) => (
                          <div key={n} className="h-[clamp(46px,7vw,72px)] flex items-center justify-center">
                            {n}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-[18px_1fr_18px] items-center mt-2">
                      <div />
                      <div className="grid grid-cols-8 text-[10px] text-neutral-400 px-1">
                        {(youColor === "w" ? FILES : FILES.split("").reverse().join("")).split("").map((ch) => (
                          <div key={ch} className="text-center">
                            {ch}
                          </div>
                        ))}
                      </div>
                      <div />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-neutral-950/45 p-4 shadow-lg">
                    <div className="text-sm uppercase tracking-wide text-neutral-300 mb-2">Coach</div>
                    <CoachFeedback moves={moves} youColor={youColor} result={result} />
                  </div>
                </div>

                <div className="text-sm italic text-neutral-300 text-center xl:text-left">
                  {personality.name}: {botStatusLine}
                </div>

                <details className="rounded-2xl border border-white/10 bg-neutral-950/40 p-4">
                  <summary className="cursor-pointer text-sm font-medium text-neutral-100">Bot Personality</summary>
                  <div className="mt-3 grid gap-2">
                    {BOT_PERSONALITIES.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setPersonalityId(option.id)}
                        className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition ${
                          personalityId === option.id ? "border-white/40 bg-white/10" : "border-white/10 hover:bg-white/5"
                        }`}
                      >
                        <span className="font-medium">{option.emoji} {option.name}</span>
                        <span className="text-xs text-neutral-400">{option.tagline}</span>
                      </button>
                    ))}
                  </div>
                </details>
              </div>
            </div>

            {/* Controls */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="text-sm text-neutral-200">
                  <div className="font-medium">Engine status</div>
                  <div className="text-neutral-400 mt-1">Bot strength auto-adjusts in rated mode.</div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-300">
                  <span>Bot opponent</span>
                  <span className="font-semibold text-neutral-100">Adjusting…</span>
                  <span>Move speed</span>
                  <span className="font-semibold text-neutral-100">{currentMoveTimeMs}ms</span>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-neutral-950/40 p-4">
                  <div className="text-xs uppercase tracking-wide text-neutral-400">Theme</div>
                  <div className="mt-2 grid gap-2">
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setThemeId(t.id)}
                        className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition ${
                          themeId === t.id ? "border-white/40 bg-white/10" : "border-white/10 hover:bg-white/5"
                        }`}
                      >
                        <span className="font-medium">{t.name}</span>
                        <span className="text-xs text-neutral-400">{t.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-neutral-950/40 p-4 md:col-span-2">
                  <div className="text-xs uppercase tracking-wide text-neutral-400">Stockfish self-test</div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleSelfTest}
                      disabled={selfTestBusy}
                      className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium transition hover:bg-white/10 disabled:opacity-60"
                    >
                      {selfTestBusy ? "Running self-test…" : "Run Stockfish self-test"}
                    </button>
                    {selfTestResult ? <span className="text-sm text-emerald-300">{selfTestResult}</span> : null}
                  </div>
                  {selfTestError ? <div className="mt-2 text-sm font-medium text-rose-300">{selfTestError}</div> : null}
                  <div className="mt-2 text-xs text-neutral-400">Runs: position startpos → go depth 8.</div>
                </div>
              </div>
            </div>

            {/* Lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Moves */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <h2 className="font-semibold text-lg">Move list</h2>
                <div className="mt-3 max-h-64 overflow-auto text-sm pr-1">
                  {moves.length === 0 ? (
                    <div className="text-neutral-400">No moves yet.</div>
                  ) : (
                    <ol className="space-y-1.5">
                      {moves.map((m, idx) => {
                        const tone =
                          m.loss > 300 ? "text-rose-300" : m.loss > 120 ? "text-amber-300" : "text-emerald-300";
                        return (
                          <li key={idx} className="flex items-center justify-between gap-2">
                            <span className="text-neutral-300">
                              {idx + 1}. {m.side === "w" ? "W" : "B"}{" "}
                              <span className="font-medium text-neutral-100">{formatMove(m)}</span>
                            </span>
                            <span className={`text-xs ${tone}`}>loss {Math.round(m.loss)}cp</span>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sticky top-6 space-y-4">
              <h2 className="font-semibold text-lg">Live analysis</h2>

              <div className="grid gap-3">
                <div className="rounded-2xl border border-white/10 bg-neutral-950/40 p-3">
                  <div className="text-xs text-neutral-400">Accuracy pulse</div>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="text-lg font-semibold text-white">{analysis.accuracy}%</div>
                    <div className="text-xs text-neutral-400">based on avg loss</div>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full" style={{ width: `${analysis.accuracy}%`, background: theme.accent }} />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-neutral-950/40 p-3">
                  <div className="text-xs text-neutral-400">Momentum (last 5)</div>
                  <div className="mt-1 text-lg font-semibold text-white">
                    {analysis.recentAvg === null ? "--" : `${analysis.recentAvg}cp`}
                  </div>
                  <div className="text-xs text-neutral-400 mt-1">
                    {analysis.recentAvg === null
                      ? "Play a few moves to unlock trends."
                      : analysis.recentAvg < yourSummary.avgLoss
                      ? "Trending up. Keep the pressure!"
                      : "Steady. Look for one tactical upgrade."}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-neutral-950/40 p-3">
                  <div className="text-xs text-neutral-400">Good-move streak</div>
                  <div className="mt-1 text-lg font-semibold text-white">{analysis.streak}</div>
                  <div className="text-xs text-neutral-400 mt-1">
                    {analysis.streak >= 4
                      ? "You’re in the zone. Stay calm."
                      : "String 4 clean moves for a streak bonus."}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-950/40 border border-white/10">
                <div className="text-sm text-neutral-200 font-medium">Elo encouragement</div>
                <div className="text-xs text-neutral-400 mt-1">
                  {yourSummary.blunders === 0 && yourSummary.movesPlayed >= 8
                    ? "No blunders so far. You’re piloting a clean game."
                    : yourSummary.avgLoss < 70
                    ? "Strong accuracy. Your next jump is in endgame technique."
                    : "Focus on one move quality: avoid hanging pieces and you’ll climb fast."}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-950/40 border border-white/10">
                <div className="text-sm text-neutral-200 font-medium">How it works</div>
                <ol className="text-xs text-neutral-400 mt-2 space-y-1 list-decimal list-inside">
                  <li>Play rated games against an adaptive hidden-strength bot.</li>
                  <li>Each result updates your Elo estimate and uncertainty.</li>
                  <li>Keep playing to refine confidence over time.</li>
                </ol>
              </div>

              <div className="text-xs text-neutral-500">
                Estimate is local to this browser and improves with more rated games.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
