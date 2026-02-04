import React, { useEffect, useMemo, useState } from "react";
import LandingPage from "./pages/LandingPage";
import PlayPage from "./pages/PlayPage";
import { THEMES } from "./data/gameData";

export default function App() {
  const [themeId, setThemeId] = useState("nebula");
  const theme = useMemo(() => THEMES.find((t) => t.id === themeId) || THEMES[0], [themeId]);
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const handlePop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const navigate = (nextPath) => {
    if (nextPath === path) return;
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  };

  return (
    <div className="min-h-screen text-neutral-100">
      <div className="fixed inset-0 -z-10" style={{ backgroundColor: theme.base }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(ellipse_at_top,${theme.glowTop},transparent_55%),radial-gradient(ellipse_at_bottom,${theme.glowBottom},transparent_55%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `linear-gradient(to_right,${theme.grid}_1px,transparent_1px),linear-gradient(to_bottom,${theme.grid}_1px,transparent_1px)`,
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="p-5 sm:p-7">
        {path === "/play" ? (
          <PlayPage theme={theme} themeId={themeId} setThemeId={setThemeId} />
        ) : (
          <LandingPage theme={theme} onNavigate={navigate} />
        )}
      </div>
    </div>
  );
}
