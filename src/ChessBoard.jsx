import React from "react";

const FILES = "abcdefgh";

function sqToIdx(sq) {
  const f = FILES.indexOf(sq[0]);
  const r = parseInt(sq[1], 10) - 1;
  return { f, r };
}

function pieceChar(piece) {
  if (!piece) return "";
  const { c, p } = piece;
  const mapB = { p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚" };
  const mapW = { p: "♙", r: "♖", n: "♘", b: "♗", q: "♕", k: "♔" };
  return c === "w" ? mapW[p] : mapB[p];
}

export default function ChessBoard({ board, squares, selected, legalForSelected, handleSquareClick, youColor }) {
  return (
    <div className="grid grid-cols-8">
      {squares.map((sq) => {
        const { f, r } = sqToIdx(sq);
        const pc = board[r][f];
        const dark = (f + r) % 2 === 1;
        const isSel = selected === sq;
        const isMove = legalForSelected.includes(sq);
        const isWhitePiece = pc?.c === "w";
        return (
          <button
            key={sq}
            onClick={() => handleSquareClick(sq)}
            className={[
              "relative",
              "h-[clamp(46px,7vw,72px)] w-[clamp(46px,7vw,72px)]",
              "grid place-items-center select-none transition",
              "focus:outline-none",
              dark ? "bg-[hsl(var(--surface-2))]" : "bg-[hsl(var(--text)/0.9)]",
              "hover:brightness-110",
              isSel ? "ring-2 ring-[hsl(var(--accent))] z-10" : "",
              isMove ? "outline outline-2 outline-[hsl(var(--success))]" : "",
            ].join(" ")}
            title={sq}
          >
            {isMove && !pc && (
              <span className="absolute w-3 h-3 rounded-full bg-[hsl(var(--success))]" />
            )}
            <span
              className={[
                "leading-none",
                "text-[clamp(30px,4.6vw,54px)]",
                "drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]",
                isWhitePiece
                  ? "text-white [text-shadow:0_2px_0_rgba(0,0,0,0.7),0_0_10px_rgba(255,255,255,0.18)]"
                  : "text-[hsl(var(--background))] [text-shadow:0_2px_0_rgba(0,0,0,0.85),0_0_10px_rgba(0,0,0,0.35)]",
              ].join(" ")}
            >
              {pieceChar(pc)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
