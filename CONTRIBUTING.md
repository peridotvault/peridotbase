# Contributing to Peridotbase

Thanks for helping build a Solana-native database. This guide covers the workspace, the
commands, and the review expectations.

## Prerequisites

- Node.js 22.23.4+
- pnpm 12.18.0 (`corepack enable`)
- A Wallet Standard wallet extension if you are working on the Studio

## Setup

```bash
git clone <repository>
cd peridotbase
pnpm install
pnpm dev:studio
```

The Studio runs at `http://localhost:3001`; the website at `http://localhost:3000`.

## Workspace

| Path              | What it is                        |
| ----------------- | --------------------------------- |
| `apps/studio`     | The React dashboard               |
| `apps/web`        | Astro + Starlight site and docs   |
| `packages/sdk`    | TypeScript SDK and protocol types |
| `packages/ui`     | Shared UI primitives              |
| `packages/config` | Shared configuration              |

The on-chain program lives in `peridotbase-core`; this repository is client-side only.

## Before opening a pull request

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

All five must pass. If a change is website-only, still run the full set — it is fast.

## Architecture rules

The Studio follows the Arctis `pages → feat → shared` layering:

- A page may import features and shared code.
- A feature may import shared code and its own internals.
- A feature may not import another feature's internals; use its barrel.
- Shared code may not import features or pages.

ESLint enforces these boundaries. Do not restructure files just to satisfy a style preference;
match the existing layer and naming.

## Capabilities, not placeholders

Peridotbase never fakes a database. If the program has no instruction for an operation, the
Studio gates the control and explains that it is pending integration. Do not add mock clients,
fake REST servers, or optimistic success paths.

## Commit and branch

- Commit: `<type>(<scope>): <message>`
- Branch: `<type>/<issue-number>/<description>`

Keep pull requests focused. Include the verification commands you ran in the description.
