# Contributing

Thanks for considering a contribution. This is a small project; expectations are low and bar is "does it work, is it clean, does it match the rest of the codebase."

## Dev setup

Requires Node 20+.

```bash
git clone https://github.com/strutter-ai/agent-team-manager.git
cd agent-team-manager
npm install
npm run dev
```

Vite runs at http://localhost:5173 with HMR. The Express backend runs at http://localhost:3001 (proxied through Vite for `/api/*` calls).

## Before you push

```bash
npm run build   # also runs `tsc -b` for typecheck
npm run lint
```

Both must pass.

## Style

- **TypeScript strict**. No `any`. Prefer `type` over `interface` for prop shapes.
- **No unused imports or vars** (the build catches this).
- **Tailwind for styling**. Don't add CSS modules or styled-components.
- **No new dependencies without discussion** — open an issue first if you want to add one.
- **Brand visuals stay**: turkey logo and Strutter green palette. If you fork for a different brand, swap them in your fork.

## Filing issues

Use the templates under "Issues" → "New issue". Bug reports must include: what you tried, what happened, what you expected, your OS and Node version.

## PR flow

1. Fork → branch → commit → PR
2. Keep PRs small and focused. One feature or fix per PR.
3. Update the README if you change behavior a user can see.
4. CI must be green before merge.

## What we'll say no to (probably)

- Adding a database, auth, multi-user mode — this is a single-user local tool by design.
- Cloud sync. Same reason.
- Heavy rewrites in a different framework.

We're open on: better layouts, keyboard shortcuts, import/export to other formats (Mermaid, Excalidraw), polish, accessibility, tests.
