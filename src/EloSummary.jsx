import React from "react";

export default function EloSummary({ lastElo, avg5, history }) {
  if (!lastElo) return <div className="text-subtle text-sm">Finish a game to get an estimate.</div>;
  return (
    <div className="space-y-2">
      <div className="text-4xl font-semibold tracking-tight">{lastElo.elo}</div>
      <div className="text-sm text-muted">
        Confidence: <span className="font-medium text-white">{lastElo.conf}%</span>
      </div>
      <div className="text-sm text-subtle">
        Avg loss: {lastElo.avgLoss}cp · Blunders: {lastElo.blunders} · Your moves: {lastElo.movesPlayed} · Bot strength: {lastElo.vs}
      </div>
      <div className="text-xs text-subtle">
        Uses a quick 1-ply benchmark (not Stockfish). Fun estimate, not official.
      </div>
      <h3 className="font-semibold mt-5">Last 5 games</h3>
      {history.length === 0 ? (
        <div className="text-subtle text-sm mt-2">No games saved yet.</div>
      ) : (
        <div className="mt-2 space-y-2">
          {avg5 && (
            <div className="text-sm text-muted">
              Average: <span className="font-semibold">{avg5.mean}</span>{" "}
              <span className="text-subtle">(avg conf {avg5.conf}%, n={avg5.n})</span>
            </div>
          )}
          <ul className="text-sm text-muted space-y-1">
            {history.map((h) => (
              <li key={h.ts} className="flex items-center justify-between">
                <span>
                  {new Date(h.ts).toLocaleString()} · {h.result.toUpperCase()} vs {h.botStrength}
                </span>
                <span className="font-semibold text-white">{h.elo}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
