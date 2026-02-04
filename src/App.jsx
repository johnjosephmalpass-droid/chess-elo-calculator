import React, { useEffect, useMemo, useState } from "react";

/**
 * Chess Elo Calculator (polished + castling + flipped board)
 * - Tiny in-browser bot (1-ply eval)
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

// --- Tiny eval + bot ---
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

function pickBotMove(board, side, strength, castle) {
  const moves = legalMoves(board, side, castle);
  if (moves.length === 0) return null;

  const scored = moves.map((mv) => {
    const nb = applyMove(board, mv);
    const s = evalBoard(nb);
    return { mv, s: side === "w" ? s : -s };
  });

  scored.sort((a, b) => b.s - a.s);

  const K = Math.max(1, Math.min(scored.length, Math.round(1 + (100 - strength) / 8)));
  const pickFrom = scored.slice(0, K);

  const weights = pickFrom.map((_, i) => Math.exp((K - i) / 2));
  const sum = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * sum;
  for (let i = 0; i < pickFrom.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pickFrom[i].mv;
  }
  return pickFrom[0].mv;
}

// --- Elo estimator ---
function estimateEloFromGame(movesPlayed, avgLoss, blunders, result, botStrength) {
  const base =
    botStrength <= 20
      ? 600
      : botStrength <= 40
      ? 900
      : botStrength <= 60
      ? 1200
      : botStrength <= 80
      ? 1500
      : botStrength <= 95
      ? 1750
      : 1900;

  let elo = base;

  if (avgLoss < 40) elo += 180;
  else if (avgLoss < 70) elo += 120;
  else if (avgLoss < 110) elo += 60;
  else if (avgLoss < 160) elo += 0;
  else if (avgLoss < 220) elo -= 80;
  else elo -= 160;

  elo -= blunders * 70;

  if (result === "win") elo += 120;
  else if (result === "draw") elo += 20;
  else elo -= 80;

  if (movesPlayed < 20) elo -= 40;

  elo = Math.max(200, Math.min(2400, Math.round(elo)));

  const conf =
    Math.max(0.25, Math.min(0.9, movesPlayed / 40)) * (1 - Math.min(0.5, blunders / 6));

  return { elo, conf: Math.round(conf * 100) };
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

const STORAGE_KEY = "chess-elo-calculator:last5";

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
  const [board, setBoard] = useState(makeStartBoard);
  const [turn, setTurn] = useState("w");
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("Your move (White)");
  const [botPlays, setBotPlays] = useState("b");
  const [botStrength, setBotStrength] = useState(60);
  const [moves, setMoves] = useState([]); // {from,to,promo,side,loss}
  const [result, setResult] = useState(null);
  const [lastElo, setLastElo] = useState(null);

  // castling rights
  const [castle, setCastle] = useState({ wK: true, wQ: true, bK: true, bQ: true });

  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const youColor = botPlays === "w" ? "b" : "w";

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

  const avg5 = useMemo(() => {
    if (!history.length) return null;
    const mean = Math.round(history.reduce((a, h) => a + h.elo, 0) / history.length);
    const conf = Math.round(history.reduce((a, h) => a + h.conf, 0) / history.length);
    return { mean, conf, n: history.length };
  }, [history]);

  useEffect(() => {
    if (result) return;
    if (turn === botPlays) {
      setStatus(`Bot thinking… (strength ${botStrength})`);
      const t = setTimeout(() => {
        const mv = pickBotMove(board, turn, botStrength, castle);
        if (!mv) return;

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

        if (gr) finishGame(gr, nb, nextTurn, nextCastle);
        else setStatus(`Your move (${colorToMoveName(youColor)})`);
      }, 180);

      return () => clearTimeout(t);
    }
  }, [turn, botPlays, botStrength, board, result, castle, youColor]);

  function finishGame(gr, finalBoard, nextTurn, nextCastle) {
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

    const yourMoves = moves.filter((m) => m.side === youColor);
    const movesPlayed = yourMoves.length;
    const avgLoss = movesPlayed
      ? Math.round(yourMoves.reduce((a, m) => a + m.loss, 0) / movesPlayed)
      : 0;
    const blunders = yourMoves.filter((m) => m.loss > 300).length;

    const est = estimateEloFromGame(movesPlayed, avgLoss, blunders, res, botStrength);
    setLastElo({ ...est, avgLoss, blunders, movesPlayed, vs: botStrength });

    const entry = {
      ts: Date.now(),
      elo: est.elo,
      conf: est.conf,
      avgLoss,
      blunders,
      movesPlayed,
      result: res,
      botStrength,
    };

    const newHist = [entry, ...history].slice(0, 5);
    setHistory(newHist);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHist));
  }

  function reset() {
    setBoard(makeStartBoard());
    setTurn("w");
    setSelected(null);
    setMoves([]);
    setResult(null);
    setLastElo(null);
    setCastle({ wK: true, wQ: true, bK: true, bQ: true });
    setStatus(`Your move (${colorToMoveName(youColor)})`);
  }

  function clearHistory() {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
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

    if (gr) finishGame(gr, nb, nextTurn, nextCastle);
  }

  const turnTone = result ? "neutral" : turn === youColor ? "good" : "warn";

  const resultTone = result?.yours === "win" ? "good" : result?.yours === "loss" ? "bad" : "neutral";

  return (
    <div className="min-h-screen text-neutral-100">
      {/* Background */}
      <div className="fixed inset-0 -z-10 bg-neutral-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.16),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(167,139,250,0.14),transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(to_right,rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      <div className="p-5 sm:p-7">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Chess Elo Calculator</h1>
                <p className="text-neutral-300 mt-2 max-w-2xl">
                  Play vs the bot. We estimate your Elo (fun, not official) based on move quality. Now with castling + a
                  way nicer UI.
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Pill tone="neutral">
                    You: <b>{colorToMoveName(youColor)}</b>
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

              <div className="flex gap-2">
                <button
                  onClick={reset}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition"
                >
                  New game
                </button>
                <button
                  onClick={clearHistory}
                  className="px-4 py-2 rounded-xl bg-neutral-900/40 hover:bg-neutral-900/60 border border-white/10 transition"
                >
                  Clear last 5
                </button>
              </div>
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

              <div className="p-4 sm:p-6">
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
                    {/* rank labels left */}
                    <div className="grid grid-rows-8 text-[10px] text-neutral-400">
                      {(youColor === "w" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8]).map((n) => (
                        <div key={n} className="h-[clamp(46px,7vw,72px)] flex items-center justify-center">
                          {n}
                        </div>
                      ))}
                    </div>

                    {/* board */}
                    <div className="grid grid-cols-8">
                      {squares.map((sq) => {
                        const { f, r } = sqToIdx(sq);
                        const pc = board[r][f];

                        // IMPORTANT: board colors should be based on true file/rank, not rotated indices
                        const dark = (f + r) % 2 === 1;

                        const isSel = selected === sq;
                        const isMove = legalForSelected.includes(sq);

                        return (
                          <button
                            key={sq}
                            onClick={() => handleSquareClick(sq)}
                            className={[
                              "relative",
                              "h-[clamp(46px,7vw,72px)] w-[clamp(46px,7vw,72px)]",
                              "grid place-items-center select-none transition",
                              "focus:outline-none",
                              dark ? "bg-[#1f2a3a]" : "bg-[#27364a]",
                              "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
                              "hover:brightness-110",
                              isSel ? "ring-2 ring-sky-300 z-10" : "",
                              isMove ? "ring-2 ring-emerald-300/60 z-[5]" : "",
                            ].join(" ")}
                            title={sq}
                          >
                            {/* move dot */}
                            {isMove && !pc && <span className="absolute w-3 h-3 rounded-full bg-emerald-300/70" />}

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

                    {/* rank labels right */}
                    <div className="grid grid-rows-8 text-[10px] text-neutral-400">
                      {(youColor === "w" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8]).map((n) => (
                        <div key={n} className="h-[clamp(46px,7vw,72px)] flex items-center justify-center">
                          {n}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* file labels bottom */}
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
              </div>
            </div>

            {/* Controls */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="text-sm text-neutral-200">
                  <div className="font-medium">Bot settings</div>
                  <div className="text-neutral-400 mt-1">Tip: keep strength fixed for steadier estimates.</div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-sm text-neutral-300">Bot plays</label>
                  <select
                    value={botPlays}
                    onChange={(e) => {
                      setBotPlays(e.target.value);
                      reset();
                    }}
                    className="bg-neutral-950/60 border border-white/10 rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="b">Black</option>
                    <option value="w">White</option>
                  </select>

                  <label className="text-sm text-neutral-300">Strength</label>
                  <input
                    type="range"
                    min={10}
                    max={95}
                    step={5}
                    value={botStrength}
                    onChange={(e) => setBotStrength(parseInt(e.target.value, 10))}
                    className="accent-sky-400"
                  />
                  <span className="text-sm text-neutral-200 w-10 text-right font-semibold">{botStrength}</span>
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

              {/* Elo */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <h2 className="font-semibold text-lg">Elo estimate</h2>

                <div className="mt-3">
                  {!lastElo ? (
                    <div className="text-neutral-400 text-sm">Finish a game to get an estimate.</div>
                  ) : (
                    (() => {
                      const betterThan = approxPercentileBetterThan(lastElo.elo);
                      const topPct = Math.max(0.1, 100 - betterThan);
                      const lvl = chessLevel(lastElo.elo);
                      const badges = buildBadges({
                        avgLoss: lastElo.avgLoss,
                        blunders: lastElo.blunders,
                        movesPlayed: lastElo.movesPlayed,
                        result: result?.yours,
                        vs: lastElo.vs,
                      });

                      return (
                        <div className="space-y-4">
                          {/* Big number + level */}
                          <div className="flex items-end justify-between gap-3">
                            <div>
                              <div className="text-xs uppercase tracking-wide text-neutral-400">Estimated Elo</div>
                              <div className="text-5xl font-semibold tracking-tight leading-none">{lastElo.elo}</div>
                            </div>

                            <Pill tone={lvl.tone}>
                              <span className="text-base">{lvl.emoji}</span>
                              <span>
                                Level: <b>{lvl.name}</b>
                              </span>
                            </Pill>
                          </div>

                          {/* Percentile card */}
                          <div className="rounded-2xl border border-white/10 bg-neutral-950/40 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm text-neutral-200 font-medium">
                                You’re better than{" "}
                                <span className="font-semibold text-white">{betterThan.toFixed(1)}%</span> of players
                              </div>
                              <div className="text-sm text-neutral-300">
                                Top <span className="font-semibold text-white">{topPct.toFixed(1)}%</span>
                              </div>
                            </div>

                            <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                              <div className="h-full bg-white/60" style={{ width: `${clamp(betterThan, 1, 99.7)}%` }} />
                            </div>

                            <div className="mt-2 text-xs text-neutral-400">
                              Percentile is a rough approximation for fun (not official).
                            </div>
                          </div>

                          {/* Ego line */}
                          <div className="text-sm text-neutral-200">
                            <span className="text-neutral-400">Coach:</span>{" "}
                            <span className="font-medium">
                              {egoLine({ avgLoss: lastElo.avgLoss, blunders: lastElo.blunders, result: result?.yours })}
                            </span>
                          </div>

                          {/* Stats grid */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-white/10 bg-neutral-950/30 p-3">
                              <div className="text-xs text-neutral-400">Confidence</div>
                              <div className="text-lg font-semibold text-white">{lastElo.conf}%</div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-neutral-950/30 p-3">
                              <div className="text-xs text-neutral-400">Avg centipawn loss</div>
                              <div className="text-lg font-semibold text-white">{lastElo.avgLoss}cp</div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-neutral-950/30 p-3">
                              <div className="text-xs text-neutral-400">Blunders</div>
                              <div className="text-lg font-semibold text-white">{lastElo.blunders}</div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-neutral-950/30 p-3">
                              <div className="text-xs text-neutral-400">Vs bot strength</div>
                              <div className="text-lg font-semibold text-white">{lastElo.vs}</div>
                            </div>
                          </div>

                          {/* Badges */}
                          {badges.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {badges.map((b, i) => (
                                <Pill key={i} tone={b.tone}>
                                  <span>{b.emoji}</span> {b.label}
                                </Pill>
                              ))}
                            </div>
                          )}

                          <div className="text-xs text-neutral-500">
                            Uses a quick 1-ply benchmark (not Stockfish). Fun estimate, not official.
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>

                <h3 className="font-semibold mt-6">Last 5 games</h3>
                {history.length === 0 ? (
                  <div className="text-neutral-400 text-sm mt-2">No games saved yet.</div>
                ) : (
                  <div className="mt-2 space-y-2">
                    {avg5 && (
                      <div className="text-sm text-neutral-200">
                        Average: <span className="font-semibold">{avg5.mean}</span>{" "}
                        <span className="text-neutral-400">(avg conf {avg5.conf}%, n={avg5.n})</span>
                      </div>
                    )}
                    <ul className="text-sm text-neutral-300 space-y-1">
                      {history.map((h) => (
                        <li key={h.ts} className="flex items-center justify-between">
                          <span className="text-neutral-400">
                            {new Date(h.ts).toLocaleString()} · {h.result.toUpperCase()} vs {h.botStrength}
                          </span>
                          <span className="font-semibold text-neutral-100">{h.elo}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sticky top-6 space-y-4">
              <h2 className="font-semibold text-lg">How it works</h2>
              <ol className="text-sm text-neutral-300 space-y-2 list-decimal list-inside">
                <li>Play vs the bot (quick evaluator).</li>
                <li>After the game, we measure your move quality (centipawn loss vs best 1-ply).</li>
                <li>We map that + result into a rough Elo estimate and average your last 5 games.</li>
              </ol>

              <div className="p-4 rounded-2xl bg-neutral-950/40 border border-white/10">
                <div className="text-sm text-neutral-200 font-medium">Next upgrade (big)</div>
                <div className="text-xs text-neutral-400 mt-1">
                  Swap the evaluator for real Stockfish (WASM) and your ratings become way more meaningful.
                </div>
              </div>

              <div>
                <h3 className="font-semibold">Quick tips</h3>
                <ul className="mt-2 text-sm text-neutral-300 space-y-1 list-disc list-inside">
                  <li>Play 5 games at the same strength.</li>
                  <li>Castling is supported now — king must not pass through check.</li>
                  <li>If you blunder a queen, the estimate drops hard (as it should).</li>
                </ul>
              </div>

              <div className="text-xs text-neutral-500">
                Disclaimer: entertainment estimate. Real Elo requires rated opponents + many games.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
