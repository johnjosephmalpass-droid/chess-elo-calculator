import React from "react";
import { motion } from "framer-motion";
import { Card } from "../components/ui/card";

const features = [
  {
    icon: "🤖",
    title: "Play vs bot",
    description: "Fast, adaptive opposition that keeps pressure on from the first move.",
  },
  {
    icon: "📈",
    title: "Live analysis",
    description: "Instant feedback on mistakes, tactics, and accuracy while you play.",
  },
  {
    icon: "🎭",
    title: "Bot personality",
    description: "Choose calm, aggressive, or balanced styles and watch your Elo shift.",
  },
  {
    icon: "🎨",
    title: "Board themes",
    description: "Swap visual themes instantly to match your mood.",
  },
  {
    icon: "🧠",
    title: "Elo estimate",
    description: "A quick estimate built from move quality, momentum, and results.",
  },
  {
    icon: "🔥",
    title: "Accuracy + streaks",
    description: "Track consistency with streaks and precision breakdowns.",
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-20" id="features">
      <div className="mx-auto w-full max-w-6xl">
        <motion.div
          className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-muted">Features</p>
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">Everything you need to improve fast.</h2>
          </div>
          <p className="max-w-sm text-sm text-muted">
            Clean, focused tools for fast sessions and clear progress without the noise.
          </p>
        </motion.div>
        <div className="mt-8 h-px w-full bg-gradient-to-r from-transparent via-[hsl(var(--accent)/0.35)] to-transparent" />

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
                className="group flex h-full min-h-[220px] flex-col p-6 transition hover:-translate-y-1 hover:border-[hsl(var(--accent)/0.5)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-sm)] bg-[hsl(var(--surface-3))] text-xl">
                  {feature.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted">{feature.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
        <div className="mt-12 h-px w-full bg-gradient-to-r from-transparent via-[hsl(var(--accent)/0.2)] to-transparent" />
      </div>
    </section>
  );
}
