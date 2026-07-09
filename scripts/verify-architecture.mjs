import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = new URL("../packages/drawover/src/", import.meta.url);
const allowedCoordinateFile = "coordinates.ts";
const forbidden = /\b(?:scrollX|scrollY|pageXOffset|pageYOffset)\b/;
const violations = [];

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(path);
      continue;
    }

    if (extname(entry.name) !== ".ts" || entry.name === allowedCoordinateFile) {
      continue;
    }

    if (forbidden.test(await readFile(path, "utf8"))) {
      violations.push(relative(root.pathname, path));
    }
  }
}

await visit(root.pathname);

if (violations.length > 0) {
  throw new Error(
    `Viewport/document conversion escaped coordinates.ts: ${violations.join(", ")}`,
  );
}

console.log("Architecture seams verified.");
