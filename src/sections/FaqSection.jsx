import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card } from "../components/ui/card";

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
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="py-16" id="faq">
      <div className="mx-auto w-full max-w-6xl">
        <motion.div
          className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-muted">FAQ</p>
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">Questions, answered.</h2>
          </div>
          <p className="max-w-md text-sm text-muted">
            Everything you need to know before you start a game. If you need more help, reach out anytime.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <Card key={faq.question} className="p-0">
                <button
                  type="button"
                  className="app-button app-button--secondary flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-semibold">{faq.question}</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[hsl(var(--border))] text-lg text-muted">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="overflow-hidden px-6 pb-5"
                    >
                      <p className="text-sm text-muted">{faq.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
