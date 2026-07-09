import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildDisabledFixtures,
  buildPreviewFixtures,
  disabledOutputs,
  previewOutputs,
} from "./fixture-builds.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const runtimeMarkers = [
  "DRAWOVER_RUNTIME_SENTINEL_V1",
  "drawover-root",
  "Toggle Drawover",
  "--dv-bg",
];

await buildPreviewFixtures();
for (const [name, output] of Object.entries(previewOutputs)) {
  await assertMarkersPresent(name, output);
}

await buildDisabledFixtures();
for (const [name, output] of Object.entries(disabledOutputs)) {
  const byteCount = await assertRuntimeAbsent(name, output);
  console.log(
    `${name} disabled production output: ${byteCount} total bytes, 0 Drawover runtime marker bytes.`,
  );
}

async function assertMarkersPresent(name, directory) {
  const files = await collectFiles(directory);
  const contents = await Promise.all(files.map((path) => readFile(path)));
  const missing = runtimeMarkers.filter(
    (marker) => !contents.some((content) => content.includes(marker)),
  );

  if (missing.length > 0) {
    throw new Error(
      `${name} preview opt-in output is missing Drawover markers: ${missing.join(", ")}`,
    );
  }

  console.log(`${name} preview opt-in output contains Drawover runtime bytes.`);
}

async function assertRuntimeAbsent(name, directory) {
  const files = await collectFiles(directory);
  let byteCount = 0;

  for (const path of files) {
    const content = await readFile(path);
    byteCount += content.byteLength;
    for (const marker of runtimeMarkers) {
      if (content.includes(marker)) {
        throw new Error(
          `${name} disabled production output contains ${marker}: ${relative(root, path)}`,
        );
      }
    }
  }

  return byteCount;
}

async function collectFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path)));
    } else if (entry.isFile() && (await stat(path)).size > 0) {
      files.push(path);
    }
  }
  return files;
}
