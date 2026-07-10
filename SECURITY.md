# Security

Found a security issue? Report it through GitHub's private vulnerability
reporting on this repo. Please don't open a public issue with exploit
details, credentials, or private data — private reporting reaches us just as
fast and keeps users safe while we fix it.

You'll hear back within three business days. Security fixes land on the
latest minor version.

Worth knowing when assessing impact: drawoverlay is a dev-only tool. It sends
nothing anywhere and has no server component; its only network behavior is
that screenshot capture may re-fetch assets the host page already references
(cache-first, time-bounded, GET-only) to inline them into the PNG. It should
never exist in a production bundle (the install docs show the environment
guard that keeps it out, and our CI verifies production builds contain zero
drawoverlay bytes).

## What usually is not a security bug

A few things come up that look like reports but aren't, given the trust
model above:

- drawoverlay appearing in a production bundle because the environment guard
  from the install docs was skipped. That's a setup issue in the host app —
  the guard is the mechanism.
- Anything a developer can do to their own page with their own devtools
  open. drawoverlay runs with the page's privileges and adds none.
- Raw scanner or AI-audit output without a concrete exploit path. Check the
  trust model first; if you can't name what an attacker gains, it's likely
  not a report yet.

When in doubt, send it privately anyway — a false alarm costs us minutes,
and we'd rather look at ten of those than miss one real issue.
