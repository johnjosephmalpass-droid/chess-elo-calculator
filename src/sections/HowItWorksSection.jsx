import React from "react";
import { motion } from "framer-motion";

const steps = [
  {
    icon: "♟️",
    title: "Play a few moves",
    description: "Start a quick game with the built-in bot and choose your opening.",
  },
  {
    icon: "⚡",
    title: "See live feedback",
    description: "Get instant coaching on tactics, threats, and best next ideas.",
  },
  {
    icon: "🏁",
    title: "Get an Elo estimate",
    description: "Finish the game and get a clear rating estimate.",
  },
];

export default function HowItWorksSection() {
  return (
    <section className="py-20" id="how-it-works">
      <div className="mx-auto w-full max-w-6xl">
        <motion.div
          className="surface-card p-10"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-muted">How it works</p>
          <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">Three fast steps to your estimate.</h2>
          <p className="mt-4 max-w-xl text-sm text-muted">
            Play, learn, and lock in your rating in minutes with clear guidance at every move.
          </p>
          <div className="mt-8 h-px w-full bg-gradient-to-r from-transparent via-[hsl(var(--accent)/0.3)] to-transparent" />

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                className="surface-panel flex h-full min-h-[220px] flex-col p-6"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                viewport={{ once: true, amount: 0.2 }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] bg-[hsl(var(--surface-3))] text-lg">
                    {step.icon}
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
                    Step {index + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted">{step.description}</p>
              </motion.div>
            ))}
          </div>
          <div className="mt-12 h-px w-full bg-gradient-to-r from-transparent via-[hsl(var(--accent)/0.2)] to-transparent" />
        </motion.div>
      </div>
    </section>
  );
}
