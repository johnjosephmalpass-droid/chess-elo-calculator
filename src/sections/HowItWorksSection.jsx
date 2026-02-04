import React from "react";

const steps = [
  {
    title: "Play a few moves",
    description: "Jump into a fast game with the built-in bot and make your opening choices.",
  },
  {
    title: "See live feedback",
    description: "Get instant coaching on tactics, threats, and the best next ideas.",
  },
  {
    title: "Get an Elo estimate",
    description: "Finish the game and receive a clear rating estimate based on performance.",
  },
];

export default function HowItWorksSection() {
  return (
    <section className="py-16" id="how-it-works">
      <div className="mx-auto w-full max-w-6xl">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">How it works</p>
          <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Three steps to your estimate.</h2>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="rounded-2xl border border-white/10 bg-slate-950/60 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
