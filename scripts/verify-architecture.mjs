import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = new URL("../packages/drawover/src/", import.meta.url);
const allowedCoordinateFile = "coordinates.ts";
const allowedColorFile = join("theme", "tokens.ts");
const forbidden = /\b(?:scrollX|scrollY|pageXOffset|pageYOffset)\b/;
const forbiddenNetwork =
  /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/;
// PLAN.md Phase 2.5: raw design colors live only in theme/tokens.ts.
const forbiddenColor = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;
const violations = [];
const networkViolations = [];
const colorViolations = [];

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(path);
      continue;
    }

    if (
      extname(entry.name) !== ".ts" ||
      entry.name.endsWith(".test.ts") ||
      entry.name.endsWith(".spec.ts") ||
      entry.name.endsWith(".fixture.ts")
    ) {
      continue;
    }

    const source = await readFile(path, "utf8");
    const relativePath = relative(root.pathname, path);
    if (entry.name !== allowedCoordinateFile && forbidden.test(source)) {
      violations.push(relativePath);
    }
    if (forbiddenNetwork.test(source)) {
      networkViolations.push(relativePath);
    }
    if (relativePath !== allowedColorFile && forbiddenColor.test(source)) {
      colorViolations.push(relativePath);
    }
  }
}

await visit(root.pathname);

if (violations.length > 0) {
  throw new Error(
    `Viewport/document conversion escaped coordinates.ts: ${violations.join(", ")}`,
  );
}

if (networkViolations.length > 0) {
  throw new Error(
    `Runtime network primitive found: ${networkViolations.join(", ")}`,
  );
}

if (colorViolations.length > 0) {
  throw new Error(
    `Raw color value escaped theme/tokens.ts: ${colorViolations.join(", ")}`,
  );
}

const packageJson = JSON.parse(
  await readFile(
    new URL("../packages/drawover/package.json", import.meta.url),
    "utf8",
  ),
);
const allowedRuntimeDependencies = new Set(["html-to-image"]);
const unexpectedDependencies = Object.keys(
  packageJson.dependencies ?? {},
).filter((name) => !allowedRuntimeDependencies.has(name));

if (unexpectedDependencies.length > 0) {
  throw new Error(
    `Unexpected runtime dependencies: ${unexpectedDependencies.join(", ")}`,
  );
}

console.log("Architecture seams verified.");
