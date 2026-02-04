import React from "react";

export default function LandingPage({ theme, onNavigate }) {
  return (
    <div className="max-w-5xl mx-auto py-10 sm:py-16">
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 sm:p-12 shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Chess Elo Calculator</p>
          <h1 className="mt-3 text-4xl sm:text-6xl font-semibold tracking-tight">Chess Elo Calculator</h1>
          <p className="mt-4 text-lg text-neutral-300">
            Play a fast game against a built-in chess bot and get a fun Elo estimate based on move quality, accuracy,
            and results. Pick a personality, tweak the theme, and use the live analysis panel to improve every move.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-neutral-300">
            {[
              "Play vs bot",
              "Live analysis",
              "Elo estimate",
              "Personality-driven style",
              "Theme selector",
            ].map((item) => (
              <span key={item} className="px-3 py-1 rounded-full border border-white/10 bg-white/5">
                {item}
              </span>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate("/play")}
              className="inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold text-neutral-950 shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
              style={{ backgroundColor: theme.accent }}
            >
              Start Playing
            </button>
            <div className="text-xs text-neutral-400">
              Tip: keep the bot strength consistent for steadier Elo estimates.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
