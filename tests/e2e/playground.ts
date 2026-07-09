import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { Page } from "@playwright/test";

interface PlaygroundOptions {
  hostile?: boolean;
}

export async function openPlayground(
  page: Page,
  options: PlaygroundOptions = {},
): Promise<void> {
  if (process.env.PLAYWRIGHT_OFFLINE !== "1") {
    await page.goto(options.hostile ? "/?hostile" : "/");
    return;
  }

  const dist = resolve(process.cwd(), "apps/playground/dist");
  const assets = resolve(dist, "assets");
  const sourceHtml = readFileSync(resolve(dist, "index.html"), "utf8");
  const scriptName = /src="\/assets\/([^"]+\.js)"/u.exec(sourceHtml)?.[1];
  const styleName = readdirSync(assets).find((name) => name.endsWith(".css"));
  if (!scriptName || !styleName) {
    throw new Error(
      "Build the playground before running offline browser tests.",
    );
  }

  let script = readFileSync(resolve(assets, scriptName), "utf8");
  for (const dependency of readdirSync(assets).filter(
    (name) => name.endsWith(".js") && name !== scriptName,
  )) {
    const encoded = readFileSync(resolve(assets, dependency)).toString(
      "base64",
    );
    script = script.replace(
      `./${dependency}`,
      `data:text/javascript;base64,${encoded}`,
    );
  }
  const styles = readFileSync(resolve(assets, styleName), "utf8");
  const hostileStyles = options.hostile
    ? "body *:not(#drawover-root){all:unset!important;box-sizing:border-box!important}"
    : "";
  const html = sourceHtml
    .replace(
      /<script[^>]+src="[^"]+"[^>]*><\/script>/u,
      `<script type="module" src="data:text/javascript;base64,${Buffer.from(script).toString("base64")}"></script>`,
    )
    .replace(
      /<link[^>]+href="[^"]+\.css"[^>]*>/u,
      `<style>${styles}${hostileStyles}</style>`,
    );
  await page.goto(
    `data:text/html;base64,${Buffer.from(html).toString("base64")}`,
  );
}
