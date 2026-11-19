# DevQuest

A gamified mobile app for learning JavaScript, TypeScript, React and Next.js through
quizzes, games, coding exercises, debugging challenges and small builds.

Built with Expo (SDK 58), Expo Router, TypeScript (strict) and Zustand.

## Run it

```bash
npm install
npm run web        # in the browser
npm start          # then scan the QR code with Expo Go, or press a / i
```

## Checks

```bash
npm run typecheck    # app + scripts
npx expo lint
npm run verify:seed  # runs every seed question, exercise and project against its answer
```

`verify:seed` executes the code in each "what's the output?" question and checks
the marked answer, runs every reference solution against its tests, confirms
that starter and buggy code fail those tests, and type-checks TypeScript solutions
under `strict`. The same checks will gate AI-generated questions later.

## Layout

| Path | What lives there |
| --- | --- |
| `src/app/` | Routes (Expo Router): tabs, onboarding, track → unit → lesson, settings |
| `src/components/` | Shared UI: `Screen`, `Card`, `Button`, `CodeBlock`, `RichText`… |
| `src/content/` | Seed content, one file per track, plus lookup helpers in `index.ts` |
| `src/types/` | Content model (`content.ts`) and learner progress (`progress.ts`) |
| `src/store/` | Persisted Zustand stores: settings and progress |
| `src/lib/runner/` | Test harness shared by the verifier and (Phase 3) the in-app sandbox |
| `scripts/verify-seed.ts` | Seed content verifier |

## Seed content

Each track has 4 units (beginner → advanced), 4 lessons, 20 questions across
8 question types, 3 coding exercises, 3 debug challenges and a 3-checkpoint project.

## Roadmap

1. ✅ Setup, navigation, theming, data model, seed content
2. Quiz mode, progress tracking, XP and streaks
3. Code editor, sandboxed execution, coding exercises, debug challenges
4. Mini-games (Bug Hunter, Output Rush first)
5. Backend, auth and sync
6. AI question generation, validation and review queue
7. AI Tutor, AI Hint, AI Code Review
8. Build projects with live preview and a simulated Next.js router
9. Spaced repetition, leaderboard, achievements, polish and tests
