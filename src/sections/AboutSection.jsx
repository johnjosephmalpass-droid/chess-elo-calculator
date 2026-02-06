import React from "react";
import { motion } from "framer-motion";

export default function AboutSection() {
  return (
    <section className="py-16" id="about">
      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-muted">About</p>
          <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">Built for curious players.</h2>
          <p className="mt-4 text-base text-muted">
            Chess Elo Calculator started as a quick way to measure improvement without waiting for tournament results.
            It is designed for players who want sharp feedback, a friendly opponent, and a fast sense of progress.
          </p>
          <p className="mt-4 text-base text-muted">
            Every game is tuned for learning: insights appear while you play, and the estimate updates based on the
            choices you make. It is a lightweight, welcoming alternative to complicated study tools.
          </p>
        </motion.div>
        <motion.div
          className="surface-panel p-8"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <ul className="grid gap-4 text-sm text-muted">
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-[hsl(var(--success))]" />
              Friendly, fast feedback without signing in.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-[hsl(var(--accent))]" />
              Adjustable personalities so every match feels fresh.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-[hsl(var(--warning))]" />
              Elo estimates designed for motivation and trend tracking.
            </li>
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
