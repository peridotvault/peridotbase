# AGENTS.md

Guidance for coding agents working in this repository.

## What this repo is

Peridotbase is a Solana-native, fully on-chain relational database. This monorepo is the client
side:

| Path              | Package               | Role                                                           |
| ----------------- | --------------------- | -------------------------------------------------------------- |
| `apps/studio`     | `@peridotbase/studio` | React 19 dashboard (Vite, TanStack Router/Query/Table, Monaco) |
| `apps/web`        | `@peridotbase/web`    | Marketing site and docs (Astro + Starlight)                    |
| `packages/sdk`    | `@peridotbase/sdk`    | TypeScript client, protocol types, wallet/RPC ports            |
| `packages/ui`     | `@peridotbase/ui`     | shadcn/ui primitives and the data grid                         |
| `packages/config` | `@peridotbase/config` | Shared TS, ESLint, Prettier, Tailwind config                   |

The Rust program lives in `peridotbase-core`, a separate repository. Do not expect contract code
here. There is no backend: no API server, no database drivers, no hosted AI relay.

## Commands

```bash
pnpm install
pnpm dev            # all apps
pnpm dev:studio     # Studio on :3001
pnpm dev:web        # website on :3000
pnpm build
pnpm lint
pnpm typecheck      # tsc --noEmit + astro check
pnpm test
pnpm format
pnpm format:check
pnpm knip
```

Run the relevant commands before declaring work done, and report exactly what ran.

## Toolchain

- package manager: **pnpm 12.18.0** (`packageManager` field; use the pinned version).
- task runner: **Turborepo**.
- TypeScript **^7.0.2** in apps and packages. `packages/config` and `apps/web` pin
  `typescript@6.0.3` for tooling that does not support TS 7 yet (typescript-eslint, astro check).
  Do not "fix" those pins.
- lint: ESLint flat config from `@peridotbase/config/eslint/preset`.
- format: Prettier (tabs, width 95).
- tests: Vitest in `apps/studio`.

## Arctis frontend architecture (mandatory)

`apps/studio/src` is split into three layers:

```
src/
  pages/    route files; hierarchical registration in pages/**/route.tsx
  feat/     feature modules (components, hooks, screens, stores, index.ts barrel)
  shared/   cross-feature code: api/sdk transport, hooks, lib, stores, ui helpers
```

Rules:

1. `pages` may import `feat` and `shared`.
2. `feat/x` may import `shared` and its own internals. It may **not** import another feature's
   internals; use that feature's `index.ts` barrel.
3. `shared` may import `shared` and packages, never `feat` or `pages`.
4. Keep new code in the layer that matches its scope. Do not create flat `hooks/` or
   `components/` folders outside `shared`.
5. The ESLint `boundaries/dependencies` rule enforces this at lint time.

The Arctis skills (`frontend`, `backend`, `monorepo`) are installed globally. Load the matching
skill before writing or reviewing the relevant code. The repository's own conventions take
precedence over the skill when they conflict; state the conflict instead of restructuring.

## SDK and capability gating

- All program access goes through `getPeridotbaseClient()` in
  `apps/studio/src/shared/peridotbase/client.ts`.
- `packages/sdk` defines the client contract, protocol types, and ports. Only `wallet` is a real
  capability today; the rest are `false` in `PROGRAM_NOT_WIRED`.
- Use `useStudioCapabilities()` (Studio) or `isIntegrationUnavailable()` / `isSdkFailure()`
  (errors) instead of matching message strings.
- Never add a fake REST client, mock server, or placeholder database. Unimplemented operations
  throw `IntegrationUnavailableError("PROGRAM_NOT_WIRED")`; the UI explains that state.
- When an operation has no on-chain instruction, do not stub a success. Gate the control.

## Studio conventions

- Data fetching: TanStack Query; keys live in `shared/query/keys.ts`.
- Client state: Zustand stores. A store that holds per-connection state registers a reset with
  `onConnectionReset`.
- Mutation feedback: `toast.promise`, with `sdkErrorMessage` as the error fallback.
- Overlays: use the typed overlay registry in `shared/stores/overlay.store.ts`; do not add ad-hoc
  `isOpen` booleans.
- File naming follows the existing convention: `use-*.ts`, `*-*.tsx`, `*.store.ts`,
  `*.type.ts`.
- Use `cn()` for class composition.
- One relational model only: PostgreSQL-style types, fixed `pgsql` editor. Do not reintroduce
  per-engine branches, MongoDB documents, or dialect pickers.
- Exports (CSV/JSON) and schema DDL text are generated in the browser from SDK reads.

## AI assistant

- Browser-direct provider adapters live in
  `apps/studio/src/feat/ai-assistant/lib/direct-chat.ts`.
- Supported providers: Gemini, OpenAI, Anthropic. Keys are memory-only by design; never persist
  them and never add a hosted proxy or rate-limit service.

## Website

- `apps/web` is Astro + Starlight.
- Docs live in `apps/web/src/content/docs/*.mdx`; import Starlight components explicitly
  (`import { Aside, Card, CardGrid } from "@astrojs/starlight/components";`).
- Changelog and roadmap data live in `apps/web/src/content-data/`.
- Write for users: describe what changed and why it matters, without implementation detail.

## Testing philosophy

This repo keeps a small, behaviour-focused suite. Do not grow a mock-heavy unit suite.

- Verify complex features end to end against a real environment.
- Add a unit test only for a specific regression (it must fail before the fix and pass after) or
  for logic that E2E cannot reach (parsers, builders, formatters, redaction).
- Do not write mock theater, pass-through route tests, store setter/getter tests, or snapshot
  tests.

## Git and release conventions

- Commit: `<type>(<scope>): <message>` (e.g. `feat(studio): add wallet reconnect`).
- Branch: `<type>/<issue-number>/<description>`.
- Preserve Apache-2.0 notices and fork attribution (`NOTICE`, `AUTHORS`, `LICENSE`).
- Use `git mv` for moves so history stays attached.
