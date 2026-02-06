import React from "react";
import { motion } from "framer-motion";

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
        <motion.div
          className="surface-card p-10"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-muted">How it works</p>
          <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">Three steps to your estimate.</h2>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                className="surface-panel p-6"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                viewport={{ once: true, amount: 0.2 }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-[hsl(var(--surface-3))] text-sm font-semibold">
                  {index + 1}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
