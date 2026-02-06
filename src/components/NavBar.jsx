import React from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "About", href: "#about" },
  { label: "FAQ", href: "#faq" },
];

export default function NavBar({ onNavigate }) {
  return (
    <header className="sticky top-4 z-30">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 surface-panel px-4 py-3 backdrop-blur">
        <a href="#top" className="flex items-center gap-3 text-sm font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-[hsl(var(--surface-3))]">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12.1 2.5c-2.9 0-5.3 2-5.3 4.7 0 1.4.7 2.8 1.9 3.6l-.7 1.4c-.3.6-.2 1.3.2 1.8l1.2 1.5-2.6 4.1h11.2l-2.6-4.1 1.2-1.5c.4-.5.5-1.2.2-1.8l-.7-1.4c1.2-.8 1.9-2.2 1.9-3.6 0-2.7-2.4-4.7-5.3-4.7h-.6z" />
            </svg>
          </span>
          <span className="tracking-wide">Chess Elo Calculator</span>
        </a>

        <nav className="hidden items-center gap-6 text-xs font-semibold uppercase tracking-[0.2em] text-subtle lg:flex">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-white">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button size="sm" onClick={() => onNavigate("/play")}>Start Playing</Button>
        </div>
      </div>

      <nav className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-subtle lg:hidden">
        {navLinks.map((link) => (
          <a key={link.href} href={link.href}>
            <Badge variant="outline">{link.label}</Badge>
          </a>
        ))}
      </nav>
    </header>
  );
}
