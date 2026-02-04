import React from "react";

export default function AboutSection() {
  return (
    <section className="py-16" id="about">
      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">About</p>
          <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Built for curious players.</h2>
          <p className="mt-4 text-base text-slate-300">
            Chess Elo Calculator started as a quick way to measure improvement without waiting for tournament results.
            It is designed for players who want sharp feedback, a friendly opponent, and a fast sense of progress.
          </p>
          <p className="mt-4 text-base text-slate-300">
            Every game is tuned for learning: insights appear while you play, and the estimate updates based on the
            choices you make. It is a lightweight, welcoming alternative to complicated study tools.
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-8">
          <ul className="grid gap-4 text-sm text-slate-300">
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
              Friendly, fast feedback without signing in.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-sky-400" />
              Adjustable personalities so every match feels fresh.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-purple-400" />
              Elo estimates designed for motivation and trend tracking.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
