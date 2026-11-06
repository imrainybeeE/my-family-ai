# My Family AI

A student-built family discovery app for Axcel International School. Everyone in the household answers playful questions on their own phone, finds their flower (one of the six Axcel styles), and the family garden grows. An AI helper uses only the family's saved answers to suggest table questions, plan meals, days out and trips, and answer questions about the family.

## What's inside

- **Garden**: the family as a pop-up paper garden, your next step, tonight's table question (AI), plan shortcuts and the family code seed packet.
- **Foundation discovery**: 18 questions in six sections, scored internally across all six styles. Only the top and second style are shown, with a note that it's a fun discovery profile, not a psychological assessment. The AI then writes a personal note about the result.
- **Advanced discovery**: the 12 teacher-provided questions, answered in your own words or with quick picks. The AI reflects back and asks at most one follow-up, only when it helps. Completion shows as "Advanced complete", never as a score.
- **Together**: AI-written family profile (what you share, where you differ, ideas to try) grounded in everyone's answers, with a simpler offline version if the AI is unavailable.
- **Plan**: what should we eat, do, watch or where should we travel. The AI says what it already knows, asks at most three practical questions, then gives three ideas with why they fit and their trade-offs. Ideas are labelled as AI ideas to check. Includes a coin flip for two-way ties.
- **Ask**: a streaming chat grounded in the family's answers, with the six guided questions plus AI-suggested ones. When the answers don't say, it says so and suggests a question to ask each other.
- **Demo family**: "Look around a demo family" (or `/?demo=1`) loads sample data that is never saved, for teachers, screenshots and assessment evidence.
- Light, dark and automatic themes; phone-first layout with safe areas and 44pt touch targets.

## Run locally

Prerequisites: Node.js 22 or later.

1. `npm install`
2. Create `.env.local` with `ANTHROPIC_API_KEY` (and `ANTHROPIC_WORKSPACE_ID` if your key is organisation-level). See `.env.example`.
3. `npm run dev` and open http://localhost:3000

Without a key the app still works; AI features show a clear message and fall back to simpler built-in summaries.

## AI

All AI runs on the server (`server/ai.ts`) with Claude Haiku 5.5 at medium effort. The browser sends a "family brief" built from saved answers (`src/services/brief.ts`); the server validates it, wraps it as data, and applies the project's AI rules: use only saved answers, separate facts from ideas, say when the answers don't cover something, never diagnose, rank or criticise, and treat answers as shared family discovery. Requests are rate-limited per IP.

## Checks

- `npm run lint` (TypeScript)
- `npm test` (scoring, family code, profile analysis and brief validation)
- `npm run screenshots -- http://localhost:3000 screenshots` (demo family, light and dark)

## Data

Firestore stores households, members, each member's answers (Foundation, tastes, Advanced, AI bloom note) and device sessions. See `firestore.rules` and `security_spec.md`. No emails, passwords or addresses are collected.
