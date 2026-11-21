# AGENTS.md

Guidance for coding agents working in this repository.

## What this repo is

Peridotbase is a Solana-native, fully on-chain relational database. This monorepo is the client
side:

| Path              | Package                            | Role                                                                     |
| ----------------- | ---------------------------------- | ------------------------------------------------------------------------ |
| `apps/web`        | `@peridotvault/peridotbase-web`    | TanStack Start app: prerendered marketing pages + Studio under `/studio` |
| `apps/docs`       | `@peridotvault/peridotbase-docs`   | Mintlify documentation site (`docs.peridotbase.com`, MDX)                |
| `packages/sdk`    | `@peridotvault/peridotbase-sdk`    | TypeScript client, protocol types, wallet/RPC ports                      |
| `packages/ui`     | `@peridotvault/peridotbase-ui`     | shadcn/ui primitives and the data grid                                   |
| `packages/config` | `@peridotvault/peridotbase-config` | Shared TS, ESLint, Prettier, Tailwind config                             |

The Rust program lives in `peridotbase-core`, a separate repository. Do not expect contract code
here. There is no backend: no API server, no database drivers, no hosted AI relay.

## Commands

```bash
pnpm install
pnpm dev                 # all apps
pnpm dev:web             # web app on :3001 (marketing + Studio, real connection screen)
pnpm dev:web:demo        # web app on :3001 with labeled sample data
pnpm dev:docs            # Mintlify docs on :3002
pnpm build
pnpm lint
pnpm typecheck      # tsc --noEmit (web + packages)
pnpm test
pnpm format
pnpm format:check
pnpm knip
```

Run the relevant commands before declaring work done, and report exactly what ran.

## Toolchain

- package manager: **pnpm 12.18.0** (`packageManager` field; use the pinned version).
- task runner: **Turborepo**.
- TypeScript **^7.0.2** in apps and packages. `packages/config` pins `typescript@6.0.3` for
  tooling that does not support TS 7 yet (typescript-eslint). Do not "fix" that pin.
- lint: ESLint flat config from `@peridotvault/peridotbase-config/eslint/preset`.
- format: Prettier (tabs, width 95).
- tests: Vitest in `apps/web`.

## Arctis frontend architecture (mandatory)

`apps/web/src` is split into three layers:

```
src/
  pages/    route components + route.tsx; every group directory has route.tsx
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

### Routing and the TanStack conflict

TanStack's file router owns the runtime tree, so its filenames apply inside `pages/`:

- `pages/__root.tsx` is the TanStack root route and cannot be renamed.
- `pages/_marketing/` is the public shell: prerendered landing, changelog and roadmap.
- `pages/studio/` is the app shell (`ssr: false`): auth, connect, and `org/$organization/$project`.
  Each group has a `route.tsx` layout that renders `<Outlet />`; `index.tsx` and `$param` pages
  are its children.
- `pages/route.tsx` is the Arctis root aggregator. TanStack ignores files that export no `Route`,
  and knip ignores this file, so it stays registration-only: it re-exports `__root`, the marketing
  shell, and the top of the Studio hierarchy. Do not move shell composition into it.
- Marketing chrome (`shared/components/site-chrome.tsx`) lives in `pages/_marketing/route.tsx`.
  Studio chrome (topbar, announcement bar, command palette, overlays, toaster) lives in
  `pages/studio/route.tsx`; the document shell is `pages/__root.tsx`.

Run the Arctis validator before declaring frontend work done:

```bash
node ~/.agents/skills/frontend/scripts/validate-architecture.mjs apps/web
```

The Arctis skills (`frontend`, `backend`, `monorepo`) are installed globally. Load the matching
skill before writing or reviewing the relevant code. The repository's own conventions take
precedence over the skill when they conflict; state the conflict instead of restructuring.

## SDK and capability gating

- All program access goes through `getPeridotbaseClient()` in
  `apps/web/src/shared/peridotbase/client.ts`.
- `packages/sdk` defines the client contract, protocol types, and ports. `ProgramClient` wires every
  implemented operation to `peridotbase_core` on devnet; `PROGRAM_NOT_WIRED` (and `ProgramNotWiredClient`)
  only stays for clients built without a program ID. `PROGRAM_WIRED` marks the operations the program
  serves today.
- Use `useStudioCapabilities()` (Studio) or `isIntegrationUnavailable()` / `isSdkFailure()`
  (errors) instead of matching message strings.
- Login is the wallet session: every scoped page (`/studio/org/**`) redirects to `/studio/auth`
  without one; demo mode is the only no-wallet path. `/studio/connect` stays reachable from the
  workspace menu. The marketing pages at `/` never require a wallet.
  Wallet discovery is Wallet Standard first, with the injected Phantom/Solflare/Backpack provider
  as a fallback, so a missed announcement does not hide it. Signing runs through
  `signTransactions` on the WalletPort, bridged into an Anchor wallet by the program client.
- The Studio never shows dummy data in real mode: organizations, projects and databases come
  from `useScopeSync`/`useProjectDatabases` reads against the program; demo samples come only
  from the env-gated `DemoPeridotbaseClient` (`VITE_STUDIO_DEMO=true`).
- Never add a fake REST client, mock server, or placeholder database. Operations the program lacks
  (`alterColumn` type/nullability, `dropColumn`, `renameColumn`, `dropIndex`) throw
  `IntegrationUnavailableError`; the UI explains that state. `renameTable` and the column default
  path of `alterColumn` are wired to `rename_table` / `alter_column_default`.
- When an operation has no on-chain instruction, do not stub a success. Gate the control.

### Program integration

- Deployed devnet program: `A1f5kLvsBbJr3z1CHSWHFJwWZXNXgknBotPNMosbb3mJ` (Anchor workspace in
  `peridotbase-core/contracts/solana`). `DEFAULT_PROGRAM_ID` in
  `apps/web/src/shared/stores/workspace.store.ts` points the Studio at it.
- `@peridotvault/peridotbase-core-sdk` is the on-chain client, linked from
  `../peridotbase-core/sdk/typescript`. `ProgramClient` in `packages/sdk/src/program-client.ts`
  adapts it to the Studio contract. Rebuild it (`npm run build --prefix sdk/typescript`) after
  changing the program or the IDL.
- Chain scope is the route's organization/project slugs, hashed to u64 (FNV-1a) and mapped to the
  organization/project catalogs, which are created on first use by the connected wallet. A
  different creator's organization is not discovered.
- `readRows` scans the table and filters/sorts/pages in the browser; the program has no SQL
  pagination. Keep limits small.
- Missing program instructions stay gated: table/column rename, column-type alteration, column
  drops, and index drops throw `IntegrationUnavailableError`.

### Demo walkthrough exception

The one allowed exception is the env-gated Studio demo, for looking around without a wallet or an
RPC endpoint:

- `pnpm dev:web:demo` loads `apps/web/.env.demo` (`VITE_STUDIO_DEMO=true`).
  `pnpm dev:web` loads no demo env.
- `shared/peridotbase/client.ts` then builds `DemoPeridotbaseClient` from
  `shared/peridotbase/demo/`; every other path keeps `ProgramNotWiredClient` and
  `PROGRAM_NOT_WIRED` unchanged.
- Demo data must stay labeled by `DemoBanner` and the workspace copy. The demo never signs, never
  calls an RPC endpoint, and must not be enabled in production builds.
- Do not use the demo client as a test double or as a fallback in real mode.

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
  `apps/web/src/feat/ai-assistant/lib/direct-chat.ts`.
- Supported providers: Gemini, OpenAI, Anthropic. Keys are memory-only by design; never persist
  them and never add a hosted proxy or rate-limit service.

## Web app and docs

- `apps/web` is TanStack Start on Vite (React 19, Tailwind). One app, two halves:
  - Marketing routes (`pages/_marketing/**`) are server-rendered and prerendered to static HTML for
    crawlers: `/`, `/changelog`, `/roadmap`.
  - The Studio (`pages/studio/**`) is client-only (`ssr: false`) and served from the SPA fallback.
- Production output is `dist/client` served by any static host, with `/studio/*` falling back to
  `dist/client/index.html`. `dist/server` exists for the prerender step only.
- Changelog and roadmap data live in `apps/web/src/shared/content/`.
- `apps/docs` is Mintlify: `docs.json` plus MDX files, published on `docs.peridotbase.com`. Use
  Mintlify components (`<Note>`, `<Warning>`, `<CardGroup>`); the marketing site links to it with
  `DOCS_URL` from `apps/web/src/shared/lib/site.ts`.
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
