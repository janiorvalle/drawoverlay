const allowedUrlHosts = new Set([
  "127.0.0.1",
  "::1",
  "drawover.dev",
  "example.com",
  "github.com",
  "localhost",
  "nextjs.org",
  "npmjs.com",
  "npmjs.org",
  "opensource.org",
  "pnpm.io",
  "registry.npmjs.org",
  "typescriptlang.org",
  "vitest.dev",
  "www.w3.org",
]);

export function isForbiddenPublicPath(path) {
  const segments = path.split("/");
  const name = segments.at(-1) ?? "";
  return (
    name === "PLAN.md" ||
    name.endsWith(".local.md") ||
    name === ".env" ||
    name.startsWith(".env.") ||
    segments.includes("notes") ||
    segments.includes("reviews")
  );
}

export function isBinaryContent(content) {
  return content.subarray(0, 8_192).includes(0);
}

export function findUnapprovedUrlHosts(source) {
  const hosts = new Set();
  const patterns = [
    /(?:https?|ssh|git):\/\/(\[[^\]]+\]|[A-Za-z0-9.-]+)/gi,
    /(?:^|[\s("'])\/\/(\[[^\]]+\]|[A-Za-z0-9.-]+)(?=[:/?#\s"']|$)/gim,
    /\bgit@([A-Za-z0-9.-]+):[A-Za-z0-9_./-]+/gi,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const host = match[1]?.toLowerCase().replace(/^\[|\]$/g, "");
      if (host && !isAllowedUrlHost(host)) hosts.add(host);
    }
  }

  return [...hosts].sort();
}

function isAllowedUrlHost(host) {
  return allowedUrlHosts.has(host) || host.endsWith(".example.com");
}
