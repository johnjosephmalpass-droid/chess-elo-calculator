import React from "react";
import { buttonVariants } from "./ui/button";

export default function Footer({ onNavigate }) {
  return (
    <footer className="border-t border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-6 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-[hsl(var(--surface-3))]">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12.1 2.5c-2.9 0-5.3 2-5.3 4.7 0 1.4.7 2.8 1.9 3.6l-.7 1.4c-.3.6-.2 1.3.2 1.8l1.2 1.5-2.6 4.1h11.2l-2.6-4.1 1.2-1.5c.4-.5.5-1.2.2-1.8l-.7-1.4c1.2-.8 1.9-2.2 1.9-3.6 0-2.7-2.4-4.7-5.3-4.7h-.6z" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold">Chess Elo Calculator</p>
            <p className="text-xs text-subtle">Play, learn, and get your estimate in minutes.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-subtle">
          <button
            type="button"
            onClick={() => onNavigate("/play")}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Play
          </button>
          <a href="#" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            GitHub
          </a>
          <a href="#" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Contact
          </a>
        </div>
      </div>
      <div className="mx-auto mt-8 w-full max-w-6xl text-xs text-subtle">
        © {new Date().getFullYear()} Chess Elo Calculator. All rights reserved.
      </div>
    </footer>
  );
}
