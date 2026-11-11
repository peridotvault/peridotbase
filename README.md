# Peridotbase

<p align="center">
  <img src="apps/web/src/assets/logo.svg" alt="Peridotbase" width="88" height="88">
</p>

<p align="center">
  <strong>A Solana-native, fully on-chain relational database.</strong><br>
  Tables, rows, and indexes live as program accounts. The Studio browses them through your wallet.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="License: Apache 2.0"></a>
</p>

## What is this?

Peridotbase is a relational database implemented as a Solana program. This monorepo holds
everything around that program:

| Path              | Package               | Role                                                                |
| ----------------- | --------------------- | ------------------------------------------------------------------- |
| `apps/studio`     | `@peridotbase/studio` | React 19 dashboard: tables, schema, SQL runner, indexes, visualizer |
| `apps/web`        | `@peridotbase/web`    | Marketing site and documentation (Astro + Starlight)                |
| `packages/sdk`    | `@peridotbase/sdk`    | TypeScript client, protocol types, wallet and RPC ports             |
| `packages/ui`     | `@peridotbase/ui`     | Shared shadcn/ui primitives and the data grid                       |
| `packages/config` | `@peridotbase/config` | Shared TypeScript, ESLint, Prettier, and Tailwind configuration     |

The on-chain Rust program lives in `peridotbase-core`, a separate repository. Nothing in this
monorepo owns canonical data: the Studio is a pure client over Solana RPC and Wallet Standard.

## Status

The Studio shell, wallet connection, RPC health checks, and the complete table/query interface
are in place. On-chain reads, writes, DDL, queries, indexes, and live refresh are gated behind
capability flags and turn on as `peridotbase-core` publishes each instruction. Until then, a
gated control reports **pending integration** rather than failing silently.

To walk through every Studio section before the program ships, run the labeled demo:

```bash
pnpm dev:studio:demo   # http://localhost:3001
```

Demo mode serves sample tables, rows, schema, indexes, and query results from the browser. Every
screen carries a **Demo preview** banner; the demo never signs a transaction, never contacts an
RPC endpoint, and never changes the real client's capability flags. It is enabled only by
`VITE_STUDIO_DEMO=true` (see `apps/studio/.env.demo`).

## Requirements

- Node.js **22.23.4+**
- pnpm **12.18.0** (`corepack enable` picks up the pinned `packageManager`)

## Quick start

```bash
pnpm install
pnpm dev:studio   # http://localhost:3001
pnpm dev:web      # http://localhost:3000
```

The Studio needs a Wallet Standard wallet extension and an RPC endpoint. See
[apps/web/src/content/docs/getting-started.mdx](apps/web/src/content/docs/getting-started.mdx).

To open the Studio without a wallet or a deployed program, use the demo:

```bash
pnpm dev:studio:demo   # sample data, labeled Demo
```

## Commands

```bash
pnpm dev              # every app through Turbo
pnpm dev:studio       # Studio only
pnpm dev:studio:demo  # Studio with labeled sample data
pnpm dev:web          # website only
pnpm build        # build every package and app
pnpm lint         # ESLint across the workspace
pnpm typecheck    # tsc --noEmit and astro check
pnpm test         # Vitest (Studio)
pnpm format       # Prettier write
pnpm format:check # Prettier check
pnpm knip         # unused files, exports, and dependencies
```

## Architecture

- **pnpm workspaces + Turborepo.** Tasks run per package with dependency-aware caching.
- **No backend.** There is no API server, no database driver, and no hosted relay. The Studio
  talks to Solana RPC, the wallet, and (for the optional AI assistant) the provider you choose.
- **Arctis frontend architecture.** `apps/studio/src` is split into `pages`, `feat`, and
  `shared`, with hierarchical route registration in `pages/**/route.tsx`. Features may import
  `shared` and their own internals, never a sibling feature's internals.
- **Capability gating.** `Capabilities` from the SDK decides whether a section or control is
  available. Read [packages/sdk/src/types/capabilities.ts](packages/sdk/src/types/capabilities.ts).
- **Bring-your-own-key AI.** Provider requests go directly from the browser to Gemini, OpenAI,
  or Anthropic. Keys stay in memory for the session.

## Testing

Tests are deliberately few and behaviour-focused. Prefer an end-to-end run against a real
environment over a mock-heavy unit suite. Add a unit test only for a specific regression or for
logic that cannot be reached another way.

## License and attribution

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

Peridotbase is a fork of [db-studio](https://github.com/husamql3/db-studio). The original
authors are credited in [AUTHORS](AUTHORS), and Git history is preserved.
