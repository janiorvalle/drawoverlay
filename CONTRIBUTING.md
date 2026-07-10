# Contributing

Thanks for pitching in. Here's what you need to get going.

## Setup

Install Node.js 22+ and pnpm 11, then:

```sh
pnpm install
pnpm verify
```

`pnpm verify` runs the same gates as CI — build, typecheck, lint, unit tests,
Playwright e2e, production-strip check, size budget, and the package
snapshot. If it's green locally, it should be green in CI. Run it before
opening a PR.

There's a playground app for trying changes by hand:

```sh
pnpm --filter playground dev
```

## What we expect in a PR

- Tests for any behavior change. If you fixed a bug, add the test that would
  have caught it.
- A clean `pnpm verify` run.
- No network calls or runtime dependencies in the published package — this is
  a hard rule, and CI enforces it. The existing exceptions (the lazy
  screenshot library, and capture re-fetching page assets inside
  `output/png.ts`) are already accounted for; don't add new ones.
- No secrets, environment files, private URLs, or personal filesystem paths
  anywhere, including tests and fixtures. Use `example.com` style
  placeholders.

If drawover produced bad output on your app (a brittle selector, a useless
spatial description, a broken screenshot), the copied Markdown itself is a
great bug report — paste it into the issue.

A couple of PR types we'll close without much ceremony: refactor-only PRs
(moving code around without changing behavior) and drive-by style changes.
If you think a refactor is genuinely needed, open an issue first.

## AI-assisted contributions

AI-written code is welcome here — just be upfront about it. Mark the PR as
AI-assisted, make sure you've read and understood every line yourself, and
ground the description in what you actually verified, not what the tool
claims. If a review bot or a maintainer asks a question, you're the one who
answers it — "the AI said so" isn't an answer. The same applies to issues:
if you (or your tool) can't back a claim with evidence from your own
reproduction, say so instead of guessing.

## Licensing

Contributions are licensed under the MIT License and the project's
contributor license agreement. The CLA check runs automatically on your
first PR.
