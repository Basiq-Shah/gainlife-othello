# Gain Life AI Developer Interview Challenge — Othello (React + TS + Vite)

Client-side SPA that implements Othello with:
- **React + TypeScript + Vite**
- **LLM-based opponent** (OpenAI / Anthropic / Gemini), with move validation
- Zero back-end. Runs with `npm install && npm start` (aka `npm run dev`) on Unix or macOS or WSL.

> **Security note:** For the purposes of this take-home, the app allows pasting an API key directly into the local file `public/keys.json`. This is explicitly *not* a production pattern. It meets the constraint of *no backend* while demonstrating prompt engineering and LLM integration. By default, I have put a Google Gemini API key in the file directly linked to my own account, a practice we would not practice during actual production. Reviewers can also run without any key by choosing PvP mode.

---

## Quick Start

```bash
npm install
npm start (or npm run dev)
# open http://localhost:5173
```

- Use **New Game: vs LLM** to play against the AI (LLM plays White by default).
- Hints (legal moves) appear as green squares.

## Why these tools?

- **Vite** for fast local DX and a tiny config surface.
- **Redux Toolkit** to keep the game state predictable, testable, and extensible.
- **TypeScript** for safety across game logic and LLM adapters.
- **No backend** to respect the challenge constraints and keep the surface focused.

## Architecture

```
public/
  keys.json          # Where we put our API keys. Only one key is needed to play against the AI.
src/
  ai/
    llm.ts           # Generates user and system prompts and communicates with LLM Provider (OpenAI/Anthropic/Gemini)
  components/
    Board.tsx        # Generates the actual board from the logic of Cell.tsx
    Cell.tsx         # Logic for a single cell, where 
  logic/
    othello.ts       # pure game engine: legal moves, flips, scoring, etc.
  store/
    gameSlice.ts     # Redux slice
    store.ts
  App.tsx            # UI shell and AI wiring
  keys.ts            # Logic for loading keys.json on start
  main.tsx
```

- **Pure logic (`logic/othello.ts`)** is framework-agnostic so it can be reused in future UIs (mobile, server sims, etc.).
- **AI adapter (`ai/llm.ts`)** converts the board to an ASCII text representation and asks the model for a *single legal* move, validating on the client.

## Prompt Engineering (saved in `/prompts`)

- **System:** “You are a world-class Othello player. Return only one legal move in algebraic notation like `D3`.”
- **User:** Provides an ASCII board (8×8) with `.` for empty; asks for a legal move for the current player.

The code:
- Enforces **temperature 0** to reduce randomness.
- **Validates** and **sanitizes** model output (extracts something like `D3` from free-form text).
- **Retries once** with a stronger instruction if the first answer is invalid (Tells AI to pick from the list of valid moves, meaning essentially cheap and fast LLM's like gemini-2.5-flash-lite can function)
- If the model still fails, it picks a random valid move. Because of how strong the second try prompt is, this almost never happens.

## Decisions & Trade-offs

- **Client-only LLM calls:** CORS and rate limits vary by provider. For evaluation, using a local key in the browser works. In production we would add a minimal proxy and key management, but the challenge forbids building a backend.
- **Move Validation:** The model can be wrong; the UI prevents illegal moves and re-prompts if necessary.

## Extensibility for "Business" Requirements

- **Variants:** 6×6 / 10×10 boards, handicaps (pre-placed discs), or alternate starting patterns.
    - As the code follows proper compartmentalization, these can be easily implemented by altering the logic in othello.ts or App.tsx
- **Engagement:** Ranked “puzzle of the day,” “best-of-3,” chess-clock timers, and streaks.
- **Analytics:** Event stream for moves, resigns, hint usage; fairness checks of LLM vs simple heuristic bot.

## Discussion Topics for the Follow-up

- How to productionize: server proxy, API usage metering, observability (prompt logs, win/loss vs depth).
- Using **Nx** if a monorepo grows (ui + bots + shared engine).
- Why SSR/SSG is disabled (requirement) and what CSR means for SEO/perf here (acceptable for a game).
