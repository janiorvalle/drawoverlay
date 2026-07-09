import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const packageDirectory = "packages/drawover";
const expected = JSON.parse(
  await readFile(
    new URL("./pack-files.snapshot.json", import.meta.url),
    "utf8",
  ),
);
const result = spawnSync("npm", ["pack", "--dry-run", "--json"], {
  cwd: packageDirectory,
  encoding: "utf8",
});

if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

const report = JSON.parse(result.stdout);
const actual = report[0].files.map(({ path }) => path).sort();

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  console.error("Package contents changed.");
  console.error("Expected:", expected);
  console.error("Actual:", actual);
  process.exit(1);
}

console.log(`Package file snapshot matches (${actual.length} files).`);
