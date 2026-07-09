# Implementation conventions

- Keep the published package framework-agnostic and dependency-free at runtime.
- Render Drawover UI inside its open Shadow DOM host.
- Keep document and viewport coordinate conversion in `coordinates.ts` only.
- Route pointer-event mode changes through the shell-owned mode state.
- Add tests for contract or behavior changes and run `pnpm verify` before review.
- Never add network calls, telemetry, secrets, environment files, or private URLs.
