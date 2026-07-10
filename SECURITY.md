# Security

Found a security issue? Report it through GitHub's private vulnerability
reporting on this repo. Please don't open a public issue with exploit
details, credentials, or private data — private reporting reaches us just as
fast and keeps users safe while we fix it.

Security fixes land on the latest minor version.

Worth knowing when assessing impact: drawover is a dev-only tool. It sends
nothing anywhere and has no server component; its only network behavior is
that screenshot capture may re-fetch assets the host page already references
(cache-first, time-bounded, GET-only) to inline them into the PNG. It should
never exist in a production bundle (the install docs show the environment
guard that keeps it out, and our CI verifies production builds contain zero
drawover bytes).
