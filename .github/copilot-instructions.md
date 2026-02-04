# Copilot Instructions for chess-elo-calculator

## Project Overview
- **Type:** React SPA using Vite
- **Purpose:** Interactive Chess Elo calculator with percentile feedback and coach reactions
- **Key Libraries:**
  - `chess.js` for chess rules and move validation
  - `react-chessboard` for board UI
  - `tailwindcss` for styling

## Architecture & Data Flow
- Main UI logic is in [src/App.jsx](src/App.jsx)
  - Handles chessboard rendering, game state, Elo calculation, and percentile mapping
  - Uses hardcoded percentile data for Chess.com rapid ratings
- App entry point is [src/main.jsx](src/main.jsx)
  - Renders `App` inside React's `StrictMode`
- Static assets (e.g., SVGs) are in [public/](public/) and [src/assets/](src/assets/)
- Styles are managed via [src/tailwind.css](src/tailwind.css), [src/App.css](src/App.css), and [src/index.css](src/index.css)

## Developer Workflows
- **Start dev server:** `npm run dev` (hot reload via Vite)
- **Build for production:** `npm run build`
- **Preview build:** `npm run preview`
- **Lint:** `npm run lint` (uses ESLint with custom config)
- **No test suite is present** (as of Feb 2026)

## Conventions & Patterns
- React function components only; hooks are used for state and effects
- Chess logic is encapsulated in `Chess` from `chess.js` (see [src/App.jsx](src/App.jsx))
- Percentile/rating data is hardcoded as arrays in [src/App.jsx](src/App.jsx)
- No Redux, Context API, or external state management
- No routing; single-page only
- ESLint ignores `dist/` and enforces unused var rules except for ALL_CAPS vars
- Tailwind is used for utility-first styling; see [src/tailwind.css](src/tailwind.css)

## Integration Points
- External dependencies are managed via npm and listed in [package.json](package.json)
- Vite config is in [vite.config.js](vite.config.js); only `@vitejs/plugin-react` is used
- No backend/API integration; all logic is client-side

## Examples
- See [src/App.jsx](src/App.jsx) for:
  - How chess moves are validated and updated
  - How Elo and percentiles are calculated and displayed
  - UI composition using `react-chessboard` and Tailwind classes

---
**For AI agents:**
- Focus on [src/App.jsx](src/App.jsx) for core logic and UI patterns
- Use Vite and npm scripts for all builds/linting
- Follow React+Tailwind conventions; avoid introducing routing or global state
- Reference hardcoded data structures for percentiles and ratings
- No need to implement tests unless a test suite is added
