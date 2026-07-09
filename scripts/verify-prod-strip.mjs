import { rm, readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { spawnSync } from "node:child_process";

const sentinel = "DRAWOVER_RUNTIME_SENTINEL_V1";
const outputs = ["apps/playground/dist", "apps/next-smoke/out"];
const searchable = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".map",
  ".rsc",
  ".txt",
]);

for (const output of outputs) {
  await rm(output, { force: true, recursive: true });
}

run("pnpm", ["--filter", "@drawover/playground", "build"], {
  VITE_DRAWOVER: "false",
});
run("pnpm", ["--filter", "@drawover/next-smoke", "build"], {
  NEXT_PUBLIC_DRAWOVER: "false",
  NODE_ENV: "production",
});

for (const output of outputs) {
  await assertAbsent(output);
}

console.log(`Production outputs contain no ${sentinel}.`);

function run(command, args, environment) {
  const result = spawnSync(command, args, {
    env: { ...process.env, ...environment },
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function assertAbsent(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await assertAbsent(path);
      continue;
    }

    if (!searchable.has(extname(entry.name))) {
      continue;
    }

    if ((await readFile(path, "utf8")).includes(sentinel)) {
      throw new Error(`Production bundle contains Drawover sentinel: ${path}`);
    }
  }
}
