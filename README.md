# Peridotbase

<p align="center">
  <img src="apps/web/public/logo.svg" alt="Peridotbase" width="88" height="88">
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

| Path              | Package                            | Role                                                                     |
| ----------------- | ---------------------------------- | ------------------------------------------------------------------------ |
| `apps/web`        | `@peridotvault/peridotbase-web`    | TanStack Start app: prerendered marketing pages + Studio under `/studio` |
| `apps/docs`       | `@peridotvault/peridotbase-docs`   | Mintlify documentation site on `docs.peridotbase.com`                    |
| `packages/sdk`    | `@peridotvault/peridotbase-sdk`    | TypeScript client, protocol types, wallet and RPC ports                  |
| `packages/ui`     | `@peridotvault/peridotbase-ui`     | Shared shadcn/ui primitives and the data grid                            |
| `packages/config` | `@peridotvault/peridotbase-config` | Shared TypeScript, ESLint, Prettier, and Tailwind configuration          |

One web app, two halves: `/`, `/changelog` and `/roadmap` are server-rendered and prerendered for
crawlers, while the Studio lives under `/studio` and runs entirely in the browser. Documentation is
a separate Mintlify site.

The on-chain Rust program lives in `peridotbase-core`, a separate repository. Nothing in this
monorepo owns canonical data: the Studio is a pure client over Solana RPC and Wallet Standard.

## Status

The Studio shell, wallet connection, RPC health checks, and the complete table/query interface
are in place, and the program is deployed on devnet
(`A1f5kLvsBbJr3z1CHSWHFJwWZXNXgknBotPNMosbb3mJ`). Reads, writes, DDL, queries, indexes, and live
refresh run against the program through `@peridotvault/peridotbase-core-sdk`. Operations the
program has no instruction for (table/column rename, column-type change, column drop, index drop)
report **pending integration** rather than failing silently.

To walk through every Studio section without a wallet or RPC endpoint, use the labeled demo:

```bash
pnpm dev:web:demo   # http://localhost:3001/studio, labeled sample data
```

Demo mode serves sample tables, rows, schema, indexes, and query results from the browser. Every
screen carries a **Demo preview** banner; the demo never signs a transaction, never contacts an
RPC endpoint, and never changes the real client's capability flags. It is enabled only by
`VITE_STUDIO_DEMO=true` (see `apps/web/.env.demo`), and a production build never loads it.

To open the real client's connection screen instead, run `pnpm dev:web`. That mode shows the
workspace status until the program ships; it keeps the same capability gates.

## Requirements

- Node.js **22.23.4+**
- pnpm **12.18.0** (`corepack enable` picks up the pinned `packageManager`)

## Quick start

```bash
pnpm install
pnpm dev:web         # http://localhost:3001, marketing + Studio
pnpm dev:web:demo    # http://localhost:3001/studio, labeled demo data
pnpm dev:docs        # http://localhost:3002, documentation
```

Demo mode opens the full Studio interface on sample data, with a **Demo preview** banner. A wallet
is optional in every mode. See [https://docs.peridotbase.com](https://docs.peridotbase.com) or the
sources in [apps/docs](apps/docs).

## Commands

```bash
pnpm dev                 # every app through Turbo
pnpm dev:web             # web app: marketing + Studio on :3001
pnpm dev:web:demo        # web app with labeled sample data
pnpm dev:docs            # Mintlify docs on :3002
pnpm build        # build every package and app
pnpm lint         # ESLint across the workspace
pnpm typecheck    # tsc --noEmit
pnpm test         # Vitest (web)
pnpm format       # Prettier write
pnpm format:check # Prettier check
pnpm knip         # unused files, exports, and dependencies
```

## Architecture

- **pnpm workspaces + Turborepo.** Tasks run per package with dependency-aware caching.
- **No backend.** There is no API server, no database driver, and no hosted relay. The Studio
  talks to Solana RPC, the wallet, and (for the optional AI assistant) the provider you choose.
- **Arctis frontend architecture.** `apps/web/src` is split into `pages`, `feat`, and
  `shared`, with hierarchical route registration in `pages/**/route.tsx`. Features may import
  `shared` and their own internals, never a sibling feature's internals.
- **TanStack Start.** The router owns the file tree; marketing routes prerender, the Studio route
  sets `ssr: false` and hydrates on the client.
- **Capability gating.** `Capabilities` from the SDK decides whether a section or control is
  available. Read [packages/sdk/src/types/capabilities.ts](packages/sdk/src/types/capabilities.ts).
- **Bring-your-own-key AI.** Provider requests go directly from the browser to Gemini, OpenAI,
  or Anthropic. Keys stay in memory for the session.

## Deployment

`pnpm build:web` writes `dist/client` (static assets, prerendered HTML, `sitemap.xml`,
`robots.txt`) and `dist/server` (used by the prerender step only). Serve `dist/client` from any
static host and fall back to `index.html` for `/studio/*` so client-side navigation resolves.

## Testing

Tests are deliberately few and behaviour-focused. Prefer an end-to-end run against a real
environment over a mock-heavy unit suite. Add a unit test only for a specific regression or for
logic that cannot be reached another way.

## License and attribution

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

Peridotbase is a fork of [db-studio](https://github.com/husamql3/db-studio). The original
authors are credited in [AUTHORS](AUTHORS), and Git history is preserved.
