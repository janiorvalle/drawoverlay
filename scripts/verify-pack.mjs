import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const packageDirectory = "packages/drawover";
const expected = JSON.parse(
  await readFile(
    new URL("./pack-files.snapshot.json", import.meta.url),
    "utf8",
  ),
);
const packageJson = JSON.parse(
  await readFile(
    new URL("../packages/drawover/package.json", import.meta.url),
    "utf8",
  ),
);

if (
  JSON.stringify(expected) !== JSON.stringify([...new Set(expected)].sort())
) {
  throw new Error("Pack snapshot must be sorted and contain no duplicates.");
}

const result = spawnSync(
  "npm",
  ["pack", "--dry-run", "--json", "--ignore-scripts"],
  {
    cwd: packageDirectory,
    encoding: "utf8",
  },
);

if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

const report = JSON.parse(result.stdout);
const packageReport = report[0];

if (
  report.length !== 1 ||
  packageReport.name !== packageJson.name ||
  packageReport.version !== packageJson.version
) {
  throw new Error("npm pack metadata does not match the published manifest.");
}

const actual = packageReport.files.map(({ path }) => path).sort();

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  console.error("Package contents changed.");
  console.error("Expected:", expected);
  console.error("Actual:", actual);
  process.exit(1);
}

console.log(`Package file snapshot matches (${actual.length} files).`);
