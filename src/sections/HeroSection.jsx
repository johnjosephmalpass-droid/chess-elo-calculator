import React from "react";
import { motion } from "framer-motion";
import { Button, buttonVariants } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

export default function HeroSection({ onNavigate }) {
  return (
    <section
      className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-6 py-16 shadow-[var(--shadow-elevated)] sm:px-12"
      id="top"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(circle at top, rgba(124, 92, 255, 0.28), transparent 55%), radial-gradient(circle at bottom, rgba(14, 165, 233, 0.22), transparent 50%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,0.2) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-muted">Next-gen chess training</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
            Track your chess Elo in <span className="text-white">minutes</span>, not months.
          </h1>
          <p className="mt-4 text-lg text-muted sm:text-xl">
            A polished practice suite that blends a fast bot, real-time coaching, and instant Elo estimates so you know
            exactly where you stand after every game.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button size="lg" onClick={() => onNavigate("/play")}>Start a free game</Button>
            <a href="#preview" className={buttonVariants({ variant: "outline", size: "lg" })}>
              View live preview
            </a>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Badge>Free forever</Badge>
            <Badge>No sign-up</Badge>
            <Badge>Live coaching</Badge>
          </div>
        </motion.div>

        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
        >
          <div className="absolute -top-10 left-10 h-40 w-40 rounded-full bg-[hsl(var(--accent)/0.18)] blur-3xl" />
          <div className="absolute -bottom-12 right-6 h-40 w-40 rounded-full bg-[hsl(var(--success)/0.16)] blur-3xl" />
          <div className="surface-panel p-6">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-subtle">
              <span>Session insight</span>
              <span>Live</span>
            </div>
            <div className="mt-6 rounded-[var(--radius-md)] bg-[hsl(var(--surface-3))] p-5">
              <svg
                viewBox="0 0 200 220"
                className="mx-auto h-48 w-48"
                role="img"
                aria-label="Floating chess knight illustration"
                fill="currentColor"
              >
                <path d="M108 16c-18.4 0-33.2 14.8-33.2 33.2 0 9.9 4.6 19.2 12.3 25.2l-7.2 14.2 19.2 22.8-30.6 54.6h76.6l-20.8-34.8 12.1-12.2-7.3-14.6c7.7-6 12.3-15.3 12.3-25.2C141.4 30.8 126.5 16 108 16z" />
                <path d="M76 178h92v18H76z" />
              </svg>
            </div>
            <div className="mt-6 grid gap-3 text-sm text-muted">
              <div className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[hsl(var(--border))] bg-[hsl(var(--surface-3))] px-4 py-3">
                <span>Projected Elo</span>
                <span className="text-white">1420</span>
              </div>
              <div className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[hsl(var(--border))] bg-[hsl(var(--surface-3))] px-4 py-3">
                <span>Accuracy streak</span>
                <span className="text-white">+6 moves</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
