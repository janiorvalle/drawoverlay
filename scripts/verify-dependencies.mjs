import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const packageRoot = join(root, "packages/drawover/package.json");
const allowedRuntimeDependencies = new Set(["html-to-image"]);
const runtimeSections = [
  "dependencies",
  "optionalDependencies",
  "peerDependencies",
  "bundledDependencies",
];

const publishedPackage = JSON.parse(await readFile(packageRoot, "utf8"));
const unexpectedRuntimeDependencies = runtimeSections.flatMap((section) => {
  const dependencies = publishedPackage[section] ?? {};
  const names = Array.isArray(dependencies)
    ? dependencies
    : Object.keys(dependencies);
  return names
    .filter((name) => !allowedRuntimeDependencies.has(name))
    .map((name) => `${section}:${name}`);
});

if (unexpectedRuntimeDependencies.length > 0) {
  throw new Error(
    `Unexpected published runtime dependencies: ${unexpectedRuntimeDependencies.join(", ")}`,
  );
}

const manifestPaths = [join(root, "package.json")];
for (const directory of ["apps", "packages"]) {
  for (const entry of await readdir(join(root, directory), {
    withFileTypes: true,
  })) {
    if (entry.isDirectory()) {
      manifestPaths.push(join(root, directory, entry.name, "package.json"));
    }
  }
}

const nonExactVersions = [];
for (const manifestPath of manifestPaths) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  for (const section of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    for (const [name, version] of Object.entries(manifest[section] ?? {})) {
      if (
        typeof version !== "string" ||
        (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version) &&
          !/^workspace:\*$/.test(version))
      ) {
        nonExactVersions.push(`${manifest.name}:${section}:${name}@${version}`);
      }
    }
  }
}

if (nonExactVersions.length > 0) {
  throw new Error(`Dependencies must be exact: ${nonExactVersions.join(", ")}`);
}

console.log(
  `Dependency policy verified (${Object.keys(publishedPackage.dependencies ?? {}).length} published runtime dependencies).`,
);
