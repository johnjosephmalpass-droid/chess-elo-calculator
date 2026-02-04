import React from "react";

export default function HeroSection({ onNavigate }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 px-6 py-16 shadow-[0_40px_120px_rgba(0,0,0,0.45)] sm:px-12" id="top">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(circle at top, rgba(129, 173, 255, 0.25), transparent 55%), radial-gradient(circle at bottom, rgba(147, 94, 255, 0.2), transparent 50%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,0.2) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-300">Chess Elo Calculator</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            Chess Elo Calculator
          </h1>
          <p className="mt-4 text-lg text-slate-300 sm:text-xl">
            Play a fast game against a smart bot, get live analysis as you move, and receive an instant Elo estimate
            built from accuracy, tactics, and streaks.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate("/play")}
              className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Start Playing
            </button>
            <a
              href="#features"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-white/50 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              See Features
            </a>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Free</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">No sign-up</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Instant Elo estimate</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -top-10 left-10 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="absolute -bottom-12 right-6 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl" />
          <div className="relative rounded-3xl border border-white/10 bg-slate-900/70 p-6">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
              <span>Live analysis</span>
              <span>v1.0</span>
            </div>
            <div className="mt-6 rounded-2xl bg-slate-950/60 p-5">
              <svg
                viewBox="0 0 200 220"
                className="mx-auto h-48 w-48 text-white"
                role="img"
                aria-label="Floating chess knight illustration"
                fill="currentColor"
              >
                <path d="M108 16c-18.4 0-33.2 14.8-33.2 33.2 0 9.9 4.6 19.2 12.3 25.2l-7.2 14.2 19.2 22.8-30.6 54.6h76.6l-20.8-34.8 12.1-12.2-7.3-14.6c7.7-6 12.3-15.3 12.3-25.2C141.4 30.8 126.5 16 108 16z" />
                <path d="M76 178h92v18H76z" />
              </svg>
            </div>
            <div className="mt-6 grid gap-3 text-sm text-slate-300">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <span>Current estimate</span>
                <span className="text-white">1420 Elo</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <span>Accuracy streak</span>
                <span className="text-white">+6 moves</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
