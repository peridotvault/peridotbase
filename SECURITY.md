# Security Policy

## Supported versions

Peridotbase is pre-1.0. Security fixes land on the default branch and the latest tagged release.

## Reporting a vulnerability

Do not open a public issue, discussion, or pull request for a security problem.

Report privately through
[GitHub Security Advisories](https://github.com/peridotbase/peridotbase/security/advisories/new).

Include:

- affected package and version or commit
- steps to reproduce, or a proof of concept
- the impact you expect: what an attacker can read, change, or sign

We aim to acknowledge a report within 72 hours.

## Scope

In scope:

- `apps/studio`: wallet connection, transaction construction, key handling, XSS in rendered data
- `packages/sdk`: instruction encoding, account decoding, error handling
- the build and release pipeline

Out of scope:

- the Solana cluster or RPC providers
- the wallet extension itself
- the `peridotbase-core` program (report it in that repository)

## Handling secrets

The Studio never asks for a seed phrase or private key. AI provider keys are accepted at runtime
and kept in memory only. If you find a path that persists a key, logs it, or sends it anywhere
other than the provider you selected, treat it as a vulnerability.
