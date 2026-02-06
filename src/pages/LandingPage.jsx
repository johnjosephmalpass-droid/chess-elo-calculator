import React from "react";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import HeroSection from "../sections/HeroSection";
import PreviewSection from "../sections/PreviewSection";
import FeaturesSection from "../sections/FeaturesSection";
import HowItWorksSection from "../sections/HowItWorksSection";
import AboutSection from "../sections/AboutSection";
import FaqSection from "../sections/FaqSection";

export default function LandingPage({ onNavigate }) {
  return (
    <div className="scroll-smooth bg-[hsl(var(--surface-2))]">
      <NavBar onNavigate={onNavigate} />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 pb-20 pt-12 sm:px-6">
        <HeroSection onNavigate={onNavigate} />
        <PreviewSection />
        <FeaturesSection />
        <HowItWorksSection />
        <AboutSection />
        <FaqSection />
      </main>
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
