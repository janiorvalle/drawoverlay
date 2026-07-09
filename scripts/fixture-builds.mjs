import { cp, mkdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const fixtureRoot = join(root, ".fixture-builds");
const nextBuildOutput = join(root, "apps/next-smoke/out");

export const previewOutputs = {
  vite: join(fixtureRoot, "vite"),
  next: join(fixtureRoot, "next"),
};

export const disabledOutputs = {
  vite: join(fixtureRoot, "disabled-vite"),
  next: join(fixtureRoot, "disabled-next"),
};

export async function buildPreviewFixtures() {
  await mkdir(fixtureRoot, { recursive: true });
  await buildVite(previewOutputs.vite, "staging", "true");
  await buildNext(previewOutputs.next, "true");
}

export async function buildDisabledFixtures() {
  await mkdir(fixtureRoot, { recursive: true });
  await buildVite(disabledOutputs.vite, "production", "false");
  await buildNext(disabledOutputs.next, "false");
}

async function buildVite(output, mode, enabled) {
  await rm(output, { force: true, recursive: true });
  run(
    "pnpm",
    [
      "--filter",
      "@drawover/playground",
      "exec",
      "vite",
      "build",
      "--mode",
      mode,
      "--outDir",
      output,
      "--emptyOutDir",
    ],
    { VITE_DRAWOVER: enabled },
  );
}

async function buildNext(output, enabled) {
  await rm(join(root, "apps/next-smoke/.next"), {
    force: true,
    recursive: true,
  });
  await rm(nextBuildOutput, { force: true, recursive: true });
  await rm(output, { force: true, recursive: true });
  run("pnpm", ["--filter", "@drawover/next-smoke", "build"], {
    NEXT_PUBLIC_DRAWOVER: enabled,
    NODE_ENV: "production",
  });
  await cp(nextBuildOutput, output, { recursive: true });
}

function run(command, args, environment) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...environment },
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed.`);
  }
}
