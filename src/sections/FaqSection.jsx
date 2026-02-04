import React from "react";

const faqs = [
  {
    question: "Is it free?",
    answer: "Yes. The experience is free to use and does not require an account.",
  },
  {
    question: "How accurate is the Elo estimate?",
    answer: "It is designed for quick feedback, not official ratings. Use it to track trends and improvement.",
  },
  {
    question: "Is it Stockfish?",
    answer: "The bot is custom-tuned for now, with stronger analysis improvements coming soon.",
  },
  {
    question: "Does it work on mobile?",
    answer: "Absolutely. The layout is responsive so you can play and review on any device.",
  },
  {
    question: "Does it store my games?",
    answer: "Games stay in your session so you can focus on learning without storing personal data.",
  },
  {
    question: "Can I change the board style?",
    answer: "Yes. Pick from multiple visual themes to keep your focus on the position.",
  },
];

export default function FaqSection() {
  return (
    <section className="py-16" id="faq">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">FAQ</p>
            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Questions, answered.</h2>
          </div>
          <p className="max-w-md text-sm text-slate-300">
            Everything you need to know before you start a game. If you need more help, reach out anytime.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {faqs.map((faq) => (
            <div key={faq.question} className="rounded-3xl border border-white/10 bg-slate-950/50 p-6">
              <h3 className="text-base font-semibold text-white">{faq.question}</h3>
              <p className="mt-2 text-sm text-slate-300">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
