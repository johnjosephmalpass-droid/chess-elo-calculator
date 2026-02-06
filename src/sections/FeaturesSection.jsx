import React from "react";
import { motion } from "framer-motion";
import { Card } from "../components/ui/card";

const features = [
  {
    title: "Play vs bot",
    description: "Challenge a fast, adaptive opponent that keeps the game engaging from move one.",
  },
  {
    title: "Live analysis",
    description: "Instant feedback on mistakes, tactics, and accuracy as the game unfolds.",
  },
  {
    title: "Bot personality",
    description: "Pick calm, aggressive, or balanced styles and see how your Elo adjusts.",
  },
  {
    title: "Board themes",
    description: "Switch visual themes to match your mood without interrupting play.",
  },
  {
    title: "Elo estimate",
    description: "Get a quick estimate built from move quality, momentum, and results.",
  },
  {
    title: "Accuracy + streaks",
    description: "Track consistency with streak tracking and accuracy breakdowns.",
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-16" id="features">
      <div className="mx-auto w-full max-w-6xl">
        <motion.div
          className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-muted">Features</p>
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">Everything you need to learn fast.</h2>
          </div>
          <p className="max-w-md text-sm text-muted">
            The right tools to measure improvement without the noise. Built for quick sessions and smart insights.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              viewport={{ once: true, amount: 0.2 }}
            >
              <Card
                className="group h-full p-6 transition hover:-translate-y-1 hover:border-[hsl(var(--accent)/0.5)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-sm)] bg-[hsl(var(--surface-3))] text-xl">
                  ♟️
                </div>
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted">{feature.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
