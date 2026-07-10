<!--
Title the PR like a commit: `fix: ...`, `feat: ...`, `docs: ...`.
Describe the user-visible symptom, not the mechanical change.
-->

## What this changes and why

<!-- The problem being solved, and why this is the right fix. -->

## Change type

- [ ] Bug fix
- [ ] New behavior or feature
- [ ] Docs / CI only — no published-code impact
- [ ] Contract change (aria-labels, output format, public API) — call it out explicitly

## Evidence

<!--
Make the validation easy to check, don't restate the diff:
- Behavior changes need a test that fails without the fix and passes with it.
- Visual changes need a before/after screenshot or the copied review output.
- `pnpm verify` must be green.
-->

## Release notes

<!-- One sentence for the changelog, written for users. "None" for docs/CI-only. -->

- [ ] I added a changeset (`pnpm changeset`) — or this PR has no published-code impact
- [ ] If any of this was AI-generated, I've marked it as such and reviewed every line myself
