import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstat, readFile, readlink } from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import {
  findUnapprovedUrlHosts,
  isBinaryContent,
  isForbiddenPublicPath,
} from "./infra-policy.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const ciPath = join(root, ".github/workflows/ci.yml");
const claPath = join(root, ".github/workflows/cla.yml");
const releasePath = join(root, ".github/workflows/release.yml");
const expectedClaHash =
  "93071c0eb13c1622e09129bbef77849bad1c8e52764571793b77dcaf2a01ab87";
const expectedGateCommands = {
  build: "pnpm build",
  typecheck: "pnpm typecheck",
  lint: "pnpm lint",
  unit: "pnpm test",
  e2e: "pnpm test:e2e",
  "prod-strip": "pnpm test:prod-strip",
  size: "pnpm size",
  "package-audit": "pnpm test:pack",
};
const expectedVerify = Object.values(expectedGateCommands).join(" && ");
const violations = [];

const [ciSource, claSource, releaseSource] = await Promise.all([
  readFile(ciPath, "utf8"),
  readFile(claPath, "utf8"),
  readFile(releasePath, "utf8"),
]);
const ci = parse(ciSource);
const cla = parse(claSource);
const release = parse(releaseSource);

if (
  !Object.hasOwn(ci.on ?? {}, "pull_request") ||
  Object.keys(ci.on ?? {}).length !== 1
) {
  violations.push("CI must run on pull_request only");
}
if (
  typeof ci.permissions !== "object" ||
  ci.permissions === null ||
  Object.keys(ci.permissions).length !== 0
) {
  violations.push("CI top-level permissions must be empty (least privilege)");
}
for (const [jobName, job] of Object.entries(ci.jobs ?? {})) {
  if (typeof job?.permissions !== "object" || job.permissions === null) {
    violations.push(`CI job ${jobName} must declare explicit permissions`);
  } else if (
    Object.values(job.permissions).some((grant) => grant === "write")
  ) {
    violations.push(`CI job ${jobName} must not request write access`);
  }
}

for (const [jobName, expectedCommand] of Object.entries(expectedGateCommands)) {
  const commands = (ci.jobs?.[jobName]?.steps ?? [])
    .map((step) => step.run)
    .filter(Boolean);
  if (!commands.includes(expectedCommand)) {
    violations.push(
      `${jobName} does not run exact gate command ${expectedCommand}`,
    );
  }
}

const rootPackage = JSON.parse(
  await readFile(join(root, "package.json"), "utf8"),
);
if (rootPackage.scripts?.verify !== expectedVerify) {
  violations.push("pnpm verify does not exactly mirror CI gates 1-7 and 11");
}
if (rootPackage["size-limit"]?.[0]?.gzip !== true) {
  violations.push("size-limit must enforce the 75 kB gzip budget");
}

const dependencyReview = ci.jobs?.["dependency-review"];
const dependencyReviewStep = dependencyReview?.steps?.find((step) =>
  String(step.uses ?? "").startsWith("actions/dependency-review-action@"),
);
if (!dependencyReviewStep) {
  violations.push("dependency review action is missing");
} else {
  if (dependencyReviewStep.with?.["warn-only"] !== false) {
    violations.push("dependency review must be blocking");
  }
  if (
    !String(dependencyReviewStep.with?.["fail-on-scopes"] ?? "")
      .split(",")
      .map((scope) => scope.trim())
      .includes("runtime")
  ) {
    violations.push(
      "dependency review must inspect runtime dependency changes",
    );
  }
  if (dependencyReview.permissions?.["pull-requests"] === "write") {
    violations.push(
      "dependency review must not request fork-incompatible write access",
    );
  }
}

const claHash = createHash("sha256").update(claSource).digest("hex");
if (claHash !== expectedClaHash) {
  violations.push(
    "owner-approved archived contributor-assistant workflow changed",
  );
}
if (
  !Object.hasOwn(cla.on ?? {}, "pull_request_target") ||
  !Object.hasOwn(cla.on ?? {}, "issue_comment")
) {
  violations.push("CLA workflow triggers are incomplete");
}
if (claSource.includes("actions/checkout")) {
  violations.push(
    "CLA pull_request_target workflow must never checkout PR code",
  );
}

if (!release.on?.push?.tags?.includes("v*")) {
  violations.push("release workflow must be restricted to v* tags");
}
if (
  release.permissions?.contents !== "read" ||
  release.permissions?.["id-token"] !== "write"
) {
  violations.push("release workflow must use read-only contents plus OIDC");
}
const publishJob = release.jobs?.publish;
if (publishJob?.environment !== "release") {
  violations.push("publish job must use the protected release environment");
}
const publishCommand = publishJob?.steps?.find((step) =>
  String(step.run ?? "").startsWith("npm publish"),
)?.run;
if (publishCommand !== "npm publish --access public --provenance") {
  violations.push("release must publish publicly with provenance");
}
if (/secrets\.(?:NPM_TOKEN|NODE_AUTH_TOKEN)/.test(releaseSource)) {
  violations.push("release workflow must not consume long-lived npm tokens");
}

const publicFileCandidates = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  {
    cwd: root,
    encoding: "utf8",
  },
)
  .split("\0")
  .filter(Boolean);
const publicFiles = [];
for (const path of publicFileCandidates) {
  const metadata = await lstat(join(root, path)).catch(() => undefined);
  if (metadata?.isFile() || metadata?.isSymbolicLink()) publicFiles.push(path);
}
const actionFiles = publicFiles
  .filter((path) => {
    const isWorkflow =
      path.startsWith(".github/workflows/") &&
      [".yaml", ".yml"].includes(extname(path));
    return isWorkflow || ["action.yaml", "action.yml"].includes(basename(path));
  })
  .map((path) => join(root, path))
  .sort();
for (const actionFile of actionFiles) {
  const document = parse(
    (await readPublicContent(actionFile)).toString("utf8"),
  );
  for (const uses of findUses(document)) {
    if (uses.startsWith("./")) continue;
    if (!/^[^/\s]+\/[^@\s]+@[a-f0-9]{40}$/.test(uses)) {
      violations.push(
        `${relative(root, actionFile)} has an action that is not SHA-pinned: ${uses}`,
      );
    }
  }
}

const allowedMarkdown = new Set([
  ".changeset/README.md",
  ".github/pull_request_template.md",
  "AGENTS.md",
  "CLAUDE.md",
  "CONTRIBUTING.md",
  "README.md",
  "SECURITY.md",
  "packages/drawover/CHANGELOG.md",
  "packages/drawover/README.md",
]);

const isChangesetEntry = (path) =>
  /^\.changeset\/[A-Za-z0-9-]+\.md$/.test(path);

for (const path of publicFiles) {
  if (
    extname(path).toLowerCase() === ".md" &&
    !allowedMarkdown.has(path) &&
    !isChangesetEntry(path)
  ) {
    violations.push(`D10 disallows committed markdown: ${path}`);
  }
  if (isForbiddenPublicPath(path)) {
    violations.push(`D9-D11 disallow tracked local or secret file: ${path}`);
  }
}

const ignoredRequirements = [
  "PLAN.md",
  "*.local.md",
  "notes/",
  "reviews/",
  ".env",
  ".env.*",
];
const gitignore = await readFile(join(root, ".gitignore"), "utf8");
for (const requirement of ignoredRequirements) {
  if (!gitignore.split("\n").includes(requirement)) {
    violations.push(`.gitignore is missing ${requirement}`);
  }
}

for (const path of publicFiles) {
  const content = await readPublicContent(join(root, path));
  if (isBinaryContent(content)) continue;
  const source = content.toString("utf8");
  if (/\/(?:Users|home)\/[A-Za-z0-9._-]+\//.test(source)) {
    violations.push(`D11 disallows personal filesystem paths: ${path}`);
  }
  if (
    /[A-Za-z0-9._%+-]+@(?!example\.com\b)[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(
      source,
    )
  ) {
    violations.push(`D11 disallows real email addresses: ${path}`);
  }
  for (const host of findUnapprovedUrlHosts(source)) {
    violations.push(`D11 disallows unapproved URL host ${host}: ${path}`);
  }
}

if (violations.length > 0) {
  throw new Error(`Infra policy violations:\n- ${violations.join("\n- ")}`);
}

console.log(
  `Infra policy verified (${actionFiles.length} action files, ${publicFiles.length} public files).`,
);

function findUses(value) {
  if (Array.isArray(value)) return value.flatMap(findUses);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) =>
    key === "uses" && typeof child === "string" ? [child] : findUses(child),
  );
}

async function readPublicContent(path) {
  const metadata = await lstat(path);
  return metadata.isSymbolicLink()
    ? Buffer.from(await readlink(path))
    : readFile(path);
}
