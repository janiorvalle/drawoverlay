// Mirrors the README's primary Next.js example (15.3+ file convention,
// validated here against Next 16): runs once on the client before
// hydration; production builds strip the import entirely.
if (
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_DRAWOVER === "true"
) {
  void import("drawover").then(({ init }) => init());
}

export {};
