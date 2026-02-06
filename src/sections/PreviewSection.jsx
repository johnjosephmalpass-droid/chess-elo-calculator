import React from "react";

export default function PreviewSection() {
  return (
    <section className="py-16" id="preview">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 lg:flex-row lg:items-center">
        <div className="lg:w-1/2">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-muted">Product preview</p>
          <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
            A clean board, real-time insight, and your Elo in one view.
          </h2>
          <p className="mt-4 text-base text-muted">
            The play experience keeps everything focused: game flow on the left, live coaching and analysis on the
            right. No clutter, just clarity.
          </p>
          <p className="mt-4 text-sm font-semibold text-subtle">Play, get feedback, see your estimate.</p>
        </div>

        <div className="lg:w-1/2">
          <div className="surface-card p-6">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-subtle">
              <span>Play mode</span>
              <span>Live</span>
            </div>
            <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="grid grid-cols-8 gap-1 rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] p-3">
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
          </div>
        </div>
      </div>
    </section>
  );
}
