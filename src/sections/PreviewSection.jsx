import React from "react";
import { motion } from "framer-motion";

export default function PreviewSection() {
  return (
    <section className="py-16" id="preview">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 lg:flex-row lg:items-center">
        <motion.div
          className="lg:w-1/2"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.4 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-muted">Product preview</p>
          <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
            A premium command center for every move you make.
          </h2>
          <p className="mt-4 text-base text-muted">
            Your board, analysis, and Elo estimate live in a single focused workspace. The layout stays calm so you can
            stay sharp.
          </p>
          <p className="mt-4 text-sm font-semibold text-subtle">Analyze, adjust, and play again instantly.</p>
        </motion.div>

        <motion.div
          className="relative lg:w-1/2"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <div className="absolute -top-10 left-16 h-40 w-40 rounded-full bg-[hsl(var(--accent)/0.16)] blur-3xl" />
          <div className="absolute -bottom-10 right-6 h-40 w-40 rounded-full bg-[hsl(var(--success)/0.14)] blur-3xl" />
          <div className="surface-card relative p-6 shadow-[var(--shadow-elevated)]">
            <motion.div
              className="rounded-[var(--radius-lg)] border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] p-6"
              style={{ transform: "rotate(-3deg)" }}
              whileHover={{ rotate: -1.5 }}
              transition={{ type: "spring", stiffness: 120, damping: 16 }}
            >
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-subtle">
                <span>Live play</span>
                <span>Preview</span>
              </div>
              <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="grid grid-cols-8 gap-1 rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-3">
                  {Array.from({ length: 64 }).map((_, index) => {
                    const isDark = (Math.floor(index / 8) + (index % 8)) % 2 === 1;
                    return (
                      <div
                        key={index}
                        className={`h-5 rounded-sm ${isDark ? "bg-[hsl(var(--surface-3))]" : "bg-[hsl(var(--text)/0.8)]"}`}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-col gap-3">
                  {[
                    { label: "Move quality", value: "92%" },
                    { label: "Bot style", value: "Adaptive" },
                    { label: "Elo estimate", value: "1420" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--surface-3))] px-4 py-3 text-sm text-muted"
                    >
                      <span>{item.label}</span>
                      <span className="text-white">{item.value}</span>
                    </div>
                  ))}
                  <div className="rounded-[var(--radius-md)] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--surface-3))] px-4 py-4 text-xs text-subtle">
                    "Blunder avoided — look for a capture on the queenside."
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
