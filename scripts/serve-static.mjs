import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const [directoryArgument, portArgument] = process.argv.slice(2);

if (!directoryArgument || !portArgument) {
  throw new Error("Usage: node scripts/serve-static.mjs <directory> <port>");
}

const root = resolve(directoryArgument);
const port = Number.parseInt(portArgument, 10);
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff2", "font/woff2"],
]);

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
    const pathname = decodeURIComponent(url.pathname);
    let path = resolve(root, `.${pathname}`);

    if (path !== root && !path.startsWith(`${root}${sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    if ((await stat(path).catch(() => undefined))?.isDirectory()) {
      path = resolve(path, "index.html");
    }

    let body = await readFile(path).catch(() => undefined);
    if (!body && !extname(pathname)) {
      path = resolve(root, "index.html");
      body = await readFile(path).catch(() => undefined);
    }

    if (!body) {
      response.writeHead(404).end("Not found");
      return;
    }

    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type":
        contentTypes.get(extname(path)) ?? "application/octet-stream",
    });
    response.end(body);
  } catch (error) {
    response
      .writeHead(500)
      .end(error instanceof Error ? error.message : "Error");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Serving ${root} at http://127.0.0.1:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
